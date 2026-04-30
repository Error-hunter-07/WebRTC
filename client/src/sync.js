export class SyncEngine {
  constructor(socket, videoElement, isHost, onStatus) {
    this.socket = socket;
    this.video = videoElement;
    this.isHost = isHost;
    this.onStatus = onStatus;
    this.roomId = null;
    this.isSyncing = false;
    this.heartbeatTimer = null;
    this.bound = {};
  }

  attach(roomId) {
    this.roomId = roomId;
    const v = this.video;
    if (!v) return;
    this.bound.play = () => !this.isSyncing && this.isHost && this.emitEvent('PLAY', v.currentTime);
    this.bound.pause = () => !this.isSyncing && this.isHost && this.emitEvent('PAUSE', v.currentTime);
    this.bound.seeked = () => !this.isSyncing && this.isHost && this.emitEvent('SEEK', v.currentTime);
    this.bound.loaded = () => this.isHost && this.socket.emit('host-loaded-video', { roomId: this.roomId });
    v.addEventListener('play', this.bound.play);
    v.addEventListener('pause', this.bound.pause);
    v.addEventListener('seeked', this.bound.seeked);
    v.addEventListener('loadedmetadata', this.bound.loaded);
    this.socket.on('sync-event', this.onSyncEvent);
    this.socket.on('heartbeat', this.onHeartbeat);
    if (this.isHost) {
      this.heartbeatTimer = setInterval(() => {
        this.socket.emit('heartbeat', { roomId: this.roomId, time: v.currentTime });
      }, 3000);
    }
  }

  setHost(isHost) {
    if (this.isHost === isHost) return;
    this.cleanup();
    this.isHost = isHost;
    if (this.roomId) this.attach(this.roomId);
  }

  emitEvent(type, time) {
    this.socket.emit('sync-event', { roomId: this.roomId, type, time });
  }

  onSyncEvent = data => {
    if (!this.video || this.isHost || data?.roomId !== this.roomId) return;
    this.applyRemote(() => {
      if (typeof data.time === 'number') this.video.currentTime = data.time;
      if (data.type === 'PLAY') return this.video.play().catch(() => {});
      if (data.type === 'PAUSE') return this.video.pause();
      if (data.type === 'SEEK') this.video.currentTime = data.time;
    });
  };

  onHeartbeat = data => {
    if (!this.video || this.isHost || data?.roomId !== this.roomId) return;
    const drift = Math.abs(this.video.currentTime - data.time);
    this.onStatus?.(drift > 0.5 ? 'Syncing...' : 'In sync');
    if (drift > 0.5) this.applyRemote(() => { this.video.currentTime = data.time; });
  };

  applyRemote(fn) {
    this.isSyncing = true;
    try { fn(); } finally { setTimeout(() => { this.isSyncing = false; }, 150); }
  }

  cleanup() {
    const v = this.video;
    if (v && this.bound.play) {
      v.removeEventListener('play', this.bound.play);
      v.removeEventListener('pause', this.bound.pause);
      v.removeEventListener('seeked', this.bound.seeked);
      v.removeEventListener('loadedmetadata', this.bound.loaded);
    }
    this.socket.off('sync-event', this.onSyncEvent);
    this.socket.off('heartbeat', this.onHeartbeat);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  destroy() { this.cleanup(); }
}
