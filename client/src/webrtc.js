const baseIceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

const turnUrl = import.meta.env.VITE_TURN_URL;
const iceConfig = { iceServers: turnUrl ? [...baseIceServers, { urls: turnUrl, username: import.meta.env.VITE_TURN_USER, credential: import.meta.env.VITE_TURN_CREDENTIAL }] : baseIceServers };

export class WebRTCManager {
  constructor(socket, isHost, callbacks = {}) {
    this.socket = socket;
    this.isHost = isHost;
    this.callbacks = callbacks;
    this.roomId = '';
    this.video = null;
    this.localStream = null;
    this.peers = new Map();
    this.pending = new Set();
    this.viewerPeerId = '';
    this.handlers = {
      viewerWantsStream: data => this.onViewerWantsStream(data),
      offer: data => this.onOffer(data),
      answer: data => this.onAnswer(data),
      ice: data => this.onIce(data),
      disconnect: () => this.closeAll()
    };
  }

  setCallbacks(callbacks) { this.callbacks = { ...this.callbacks, ...callbacks }; }
  setRoomId(roomId) { this.roomId = roomId; }
  canCapture(video) { return !!video && (typeof video.captureStream === 'function' || typeof video.mozCaptureStream === 'function'); }
  _capture(video) { return (video.captureStream || video.mozCaptureStream).call(video); }
  _emitCount() { this.callbacks.onPeerCountChange?.(this.peers.size); }
  _setState(id, state) { this.callbacks.onPeerStateChange?.(id, state); }
  _createIceConfig() { return iceConfig; }

  initHost(videoElement, roomId = this.roomId) {
    this.isHost = true; this.video = videoElement; this.roomId = roomId;
    if (!this.canCapture(videoElement)) { this.callbacks.onUnsupported?.('Streaming from iOS is not supported. You can still join as a viewer.'); return false; }
    try { this.localStream = this._capture(videoElement); } catch { this.callbacks.onUnsupported?.('Direct streaming not supported on this browser. Please load the video file manually.'); return false; }
    this._bind();
    this.socket.emit('host-stream-ready', { roomId: this.roomId });
    this.pending.forEach(id => this._createHostPeer(id));
    this.pending.clear();
    return true;
  }

  initViewer(videoElement, roomId = this.roomId) {
    this.isHost = false; this.video = videoElement; this.roomId = roomId;
    this._bind();
    this.socket.emit('request-stream', { roomId: this.roomId });
    return true;
  }

  addTrack(track, stream = this.localStream) {
    for (const { pc, senders } of this.peers.values()) {
      const sender = senders.find(item => item.track && item.track.kind === track.kind);
      if (sender?.replaceTrack) sender.replaceTrack(track); else if (stream) senders.push(pc.addTrack(track, stream));
    }
  }

  async collectStats() {
    const peers = [];
    for (const [id, entry] of this.peers.entries()) {
      const stats = { id, state: entry.pc.connectionState, bytesSent: 0, bytesReceived: 0 };
      try {
        const report = await entry.pc.getStats();
        report.forEach(v => {
          if (v.type === 'outbound-rtp' && v.bytesSent) stats.bytesSent += v.bytesSent;
          if (v.type === 'inbound-rtp' && v.bytesReceived) stats.bytesReceived += v.bytesReceived;
        });
      } catch {}
      peers.push(stats);
    }
    return peers;
  }

  getDebugState() { return [...this.peers.entries()].map(([id, entry]) => ({ id, state: entry.pc.connectionState })); }

  closeAll() {
    this.unbind();
    for (const entry of this.peers.values()) entry.pc.close();
    this.peers.clear();
    if (this.viewerPeerId) this.viewerPeerId = '';
    if (this.localStream) this.localStream.getTracks().forEach(track => track.stop());
    this.localStream = null;
    this.pending.clear();
    this._emitCount();
  }

  _bind() {
    this.unbind();
    this.socket.on('viewer-wants-stream', this.handlers.viewerWantsStream);
    this.socket.on('webrtc-offer', this.handlers.offer);
    this.socket.on('webrtc-answer', this.handlers.answer);
    this.socket.on('webrtc-ice', this.handlers.ice);
    this.socket.on('disconnect', this.handlers.disconnect);
  }

  unbind() {
    this.socket.off('viewer-wants-stream', this.handlers.viewerWantsStream);
    this.socket.off('webrtc-offer', this.handlers.offer);
    this.socket.off('webrtc-answer', this.handlers.answer);
    this.socket.off('webrtc-ice', this.handlers.ice);
    this.socket.off('disconnect', this.handlers.disconnect);
  }

  onViewerWantsStream({ roomId, viewerSocketId }) {
    if (!this.isHost || roomId !== this.roomId) return;
    if (!this.localStream) { this.pending.add(viewerSocketId); return; }
    this._createHostPeer(viewerSocketId);
  }

  async _createHostPeer(viewerSocketId) {
    if (this.peers.has(viewerSocketId) || !this.localStream) return;
    const pc = new RTCPeerConnection(this._createIceConfig());
    const senders = [];
    this.localStream.getTracks().forEach(track => senders.push(pc.addTrack(track, this.localStream)));
    pc.onicecandidate = e => e.candidate && this.socket.emit('webrtc-ice', { candidate: e.candidate, targetSocketId: viewerSocketId, roomId: this.roomId });
    pc.onconnectionstatechange = () => { this._setState(viewerSocketId, pc.connectionState); if (pc.connectionState === 'failed') this.callbacks.onConnectionFailed?.('Connection failed. Check if TURN server is configured.'); if (['closed', 'failed', 'disconnected'].includes(pc.connectionState)) { this.peers.delete(viewerSocketId); this._emitCount(); } };
    this.peers.set(viewerSocketId, { pc, senders });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.socket.emit('webrtc-offer', { offer, targetSocketId: viewerSocketId, roomId: this.roomId });
    this._emitCount();
  }

  async onOffer(data) {
    if (this.isHost || data?.roomId !== this.roomId) return;
    this.viewerPeerId = data.fromSocketId;
    const pc = new RTCPeerConnection(this._createIceConfig());
    this.peers.set(this.viewerPeerId, { pc, senders: [] });
    pc.ontrack = e => { const stream = e.streams?.[0]; if (!stream || !this.video) return; this.video.autoplay = true; this.video.playsInline = true; this.video.muted = false; this.video.srcObject = stream; this.video.play?.().catch(() => {}); this.callbacks.onStreamReceived?.(stream); };
    pc.onicecandidate = e => e.candidate && this.socket.emit('webrtc-ice', { candidate: e.candidate, targetSocketId: this.viewerPeerId, roomId: this.roomId });
    pc.onconnectionstatechange = () => { this._setState(this.viewerPeerId, pc.connectionState); if (pc.connectionState === 'failed') this.callbacks.onConnectionFailed?.('Connection failed. Check if TURN server is configured.'); };
    await pc.setRemoteDescription(data.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.socket.emit('webrtc-answer', { answer, targetSocketId: this.viewerPeerId, roomId: this.roomId });
    this._emitCount();
  }

  async onAnswer(data) {
    const peer = this.peers.get(data.fromSocketId);
    if (!peer) return;
    await peer.pc.setRemoteDescription(data.answer);
  }

  async onIce(data) {
    const peer = this.peers.get(data.fromSocketId);
    if (!peer) return;
    try { await peer.pc.addIceCandidate(data.candidate); } catch {}
  }
}
