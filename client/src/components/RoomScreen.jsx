import React, { useState } from 'react';
import styles from '../App.module.css';
import VideoPlayer from './VideoPlayer';
import WebcamGrid from './WebcamGrid';
import ChatPanel from './ChatPanel';
import PeoplePanel from './PeoplePanel';

const ToolbarIcon = ({ icon, onClick, disabled, tooltips, badge, danger }) => (
  <button onClick={onClick} disabled={disabled} className={`${styles.toolbarBtn} ${danger ? styles.danger : ''}`} title={tooltips}>{icon} {badge && <span className={styles.badge}>{badge}</span>}</button>
);

export default function RoomScreen({ 
  roomId, isHost, joined, members, videoRef, videoSrc, streamConnected, hostLoaded, manualFallback, syncText, 
  messages, username, copied, error, hostLeft, viewerCount, debugOpen, debugPeers,
  onFileSelect, onSendMessage, onCopyRoom, onLeaveRoom, onQualityChange,
  onToggleMic, onToggleCam, camOn, micMuted, localStream, speakingVolume, participants, mySocketId, mediaStates
}) {
  const [chatOpen, setChatOpen] = useState(false), [peopleOpen, setPeopleOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const streamText = isHost
    ? `Streaming to ${viewerCount} viewer${viewerCount !== 1 ? 's' : ''}`
    : streamConnected
      ? 'Stream connected ✓'
      : hostLoaded
        ? 'Connecting to host stream...'
        : 'Waiting for host to load video...';

  React.useEffect(() => {
    if (!chatOpen && messages.length > 0) setUnreadChat(c => c + 1);
  }, [messages, chatOpen]);

  React.useEffect(() => {
    if (chatOpen) setUnreadChat(0);
  }, [chatOpen]);

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.topInfo}>
          <span className={styles.roomId}>Room {roomId}</span>
          <span>{streamText}</span>
        </div>
        <div className={styles.topRight}>
          <span className={`${styles.syncIndicator} ${syncText !== 'In sync' ? styles.syncing : ''}`}>{syncText || 'In sync'}</span>
          <button onClick={onCopyRoom} className={styles.smallBtn}>{copied ? '✓ Copied' : 'Copy'}</button>
        </div>
      </header>
      {hostLeft && <div className={styles.banner}>Host left. Waiting for reassignment...</div>}
      {error && <div className={styles.banner}>{error}</div>}
      <main className={styles.mainArea}>
        <div className={styles.videoSection}>
          <VideoPlayer videoRef={videoRef} isHost={isHost} videoSrc={videoSrc} streamConnected={streamConnected} hostLoaded={hostLoaded} manualFallback={manualFallback} onFileSelect={onFileSelect} syncText={syncText} onQualityChange={onQualityChange} />
          <WebcamGrid participants={participants} speakingVolume={speakingVolume} />
        </div>
      </main>
      <div className={styles.bottomToolbar}>
        <ToolbarIcon icon="🎤" onClick={onToggleMic} danger={micMuted} tooltips={micMuted ? 'Unmute' : 'Mute'} />
        <ToolbarIcon icon="📹" onClick={onToggleCam} danger={!camOn} tooltips={camOn ? 'Camera off' : 'Camera on'} />
        {isHost && <ToolbarIcon icon="▶" onClick={() => videoRef.current?.[videoRef.current?.paused ? 'play' : 'pause']()} tooltips="Play/Pause" />}
        <ToolbarIcon icon="💬" onClick={() => setChatOpen(!chatOpen)} badge={unreadChat > 0 ? unreadChat : null} tooltips="Chat" />
        <ToolbarIcon icon="👥" onClick={() => setPeopleOpen(!peopleOpen)} badge={members.length} tooltips="People" />
        <ToolbarIcon icon="📴" onClick={onLeaveRoom} danger tooltips="Leave" />
      </div>
      <ChatPanel messages={messages} onSend={onSendMessage} username={username} open={chatOpen} onClose={() => setChatOpen(false)} />
      <PeoplePanel members={members} mySocketId={mySocketId} mediaStates={mediaStates} open={peopleOpen} onClose={() => setPeopleOpen(false)} />
      {debugOpen && <div className={styles.debugPanel}><h3>Debug</h3><div>Peers: {debugPeers.length}</div></div>}
    </div>
  );
}
