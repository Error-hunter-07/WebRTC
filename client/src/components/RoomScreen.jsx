import React, { useEffect, useState } from 'react';
import styles from '../App.module.css';
import VideoPlayer from './VideoPlayer';
import WebcamGrid from './WebcamGrid';
import ChatPanel from './ChatPanel';
import PeoplePanel from './PeoplePanel';
import {
  IconCamera,
  IconCameraOff,
  IconCheck,
  IconCopy,
  IconMessageCircle,
  IconMic,
  IconMicOff,
  IconPause,
  IconPhoneOff,
  IconPlay,
  IconUsers
} from './Icons';

const ToolbarButton = ({ icon, onClick, title, className, children }) => (
  <button onClick={onClick} className={`${styles.toolbarBtn} ${className || ''}`} title={title}>
    {icon}
    {children}
  </button>
);

export default function RoomScreen({ 
  roomId, isHost, joined, members, videoRef, videoSrc, streamConnected, hostLoaded, manualFallback, syncText, 
  messages, username, copied, error, hostLeft, viewerCount, debugOpen, debugPeers,
  onFileSelect, onSendMessage, onCopyRoom, onLeaveRoom, onQualityChange,
  onToggleMic, onToggleCam, camOn, micMuted, localStream, speakingVolume, participants, mySocketId, mediaStates
}) {
  const [chatOpen, setChatOpen] = useState(false), [peopleOpen, setPeopleOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const [playing, setPlaying] = useState(false);
  const streamText = isHost
    ? `Streaming to ${viewerCount} viewer${viewerCount !== 1 ? 's' : ''}`
    : streamConnected
      ? 'Stream connected ✓'
      : hostLoaded
        ? 'Connecting to host stream...'
        : 'Waiting for host to load video...';

  React.useEffect(() => {
    if (chatOpen) {
      setUnreadChat(0);
    } else if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last?.socketId !== mySocketId) {
        setUnreadChat(prev => Math.max(1, prev + 1));
      }
    }
  }, [messages, chatOpen, mySocketId]);

  useEffect(() => {
    const v = videoRef?.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    return () => { v.removeEventListener('play', onPlay); v.removeEventListener('pause', onPause); };
  }, [videoRef]);

  const syncClass = syncText !== 'In sync' ? styles.syncing : '';
  const dotClass = syncText === 'In sync' ? '' : styles.syncing;

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.topInfo}>
          <div className={styles.roomChip} onClick={onCopyRoom}>
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            {roomId}
          </div>
          <span className={styles.syncDot + ' ' + dotClass} />
          <span className={styles.syncText}>{streamText}</span>
        </div>
        <div className={styles.topRight}>
          <span className={`${styles.syncText} ${syncClass}`}>{syncText || 'In sync'}</span>
          <div className={styles.smallBtn}>{members.length} members</div>
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
        <div className={styles.toolbarGroup}>
          <ToolbarButton
            icon={micMuted ? <IconMicOff size={18} /> : <IconMic size={18} />}
            className={micMuted ? styles.danger : ''}
            title={micMuted ? 'Unmute' : 'Mute'}
            onClick={onToggleMic}
          />
          <ToolbarButton
            icon={camOn ? <IconCamera size={18} /> : <IconCameraOff size={18} />}
            className={!camOn ? styles.danger : ''}
            title={camOn ? 'Camera off' : 'Camera on'}
            onClick={onToggleCam}
          />
        </div>
        <div className={styles.toolbarDivider} />
        <div className={styles.toolbarGroup}>
          {isHost && (
            <ToolbarButton
              icon={playing ? <IconPause size={20} /> : <IconPlay size={20} />}
              className={styles.hostAction}
              title={playing ? 'Pause' : 'Play'}
              onClick={() => videoRef.current?.[playing ? 'pause' : 'play']()}
            />
          )}
        </div>
        <div className={styles.toolbarDivider} />
        <div className={styles.toolbarGroup}>
          <ToolbarButton
            icon={<IconMessageCircle size={18} />}
            title="Chat"
            onClick={() => {
              const nextOpen = !chatOpen;
              setChatOpen(nextOpen);
              if (nextOpen) setUnreadChat(0);
            }}
          >
            {unreadChat > 0 && <span className={styles.badgeDot} />}
          </ToolbarButton>
          <ToolbarButton
            icon={<IconUsers size={18} />}
            title="People"
            onClick={() => setPeopleOpen(!peopleOpen)}
          />
          <ToolbarButton
            icon={<IconPhoneOff size={18} />}
            className={styles.danger}
            title="Leave room"
            onClick={onLeaveRoom}
          />
        </div>
      </div>
      <ChatPanel
        messages={messages}
        onSend={onSendMessage}
        username={username}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        mySocketId={mySocketId}
        memberCount={members.length}
      />
      <PeoplePanel members={members} mySocketId={mySocketId} mediaStates={mediaStates} open={peopleOpen} onClose={() => setPeopleOpen(false)} />
      {debugOpen && <div className={styles.debugPanel}><h3>Debug</h3><div>Peers: {debugPeers.length}</div></div>}
    </div>
  );
}
