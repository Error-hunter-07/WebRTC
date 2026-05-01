import { useState, useRef, useEffect } from 'react';
import socket from './socket';
import { SyncEngine } from './sync';
import { WebRTCManager } from './webrtc';
import { useMediaDevices } from './hooks/useMediaDevices';
import { useMediaConnections } from './hooks/useMediaConnections';
import LobbyScreen from './components/LobbyScreen';
import RoomScreen from './components/RoomScreen';
import styles from './App.module.css';

export default function App() {
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [members, setMembers] = useState([]);
  const [videoSrc, setVideoSrc] = useState('');
  const [streamConnected, setStreamConnected] = useState(false);
  const [hostLoaded, setHostLoaded] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [manualFallback, setManualFallback] = useState(false);
  const [syncText, setSyncText] = useState('');
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [hostLeft, setHostLeft] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugPeers, setDebugPeers] = useState([]);
  const [mediaStates, setMediaStates] = useState({});
  const [mySocketId, setMySocketId] = useState('');

  const videoRef = useRef(null);
  const syncEngineRef = useRef(null);
  const webrtcRef = useRef(null);
  const mySocketIdRef = useRef('');
  const viewerInitRef = useRef(false);

  const { camOn, micMuted, localStream, toggleCam, toggleMic, speakingVolume } = useMediaDevices();
  const { remoteStreams } = useMediaConnections(socket, roomId, members, localStream, mySocketId);

  const setMediaState = (socketId, next) => {
    if (!socketId) return;
    setMediaStates(prev => ({
      ...prev,
      [socketId]: { ...prev[socketId], ...next }
    }));
  };

  const generateParticipants = () => {
    return members.map(m => {
      const stream = remoteStreams.get(m.socketId);
      const state = mediaStates[m.socketId] || {};
      const remoteCamOn = stream ? stream.getVideoTracks().length > 0 : false;
      return {
        socketId: m.socketId,
        username: m.username,
        isHost: m.isHost,
        isSelf: m.socketId === mySocketIdRef.current,
        stream,
        camOn: m.socketId === mySocketIdRef.current ? camOn : (state.camOn ?? remoteCamOn),
        micMuted: m.socketId === mySocketIdRef.current ? micMuted : (state.micMuted ?? false),
        speakingVolume: m.socketId === mySocketIdRef.current ? speakingVolume : 0
      };
    });
  };

  const onCreateRoom = async (uname) => {
    setUsername(uname);
    setError('');
    try {
      const result = await new Promise((res, rej) => {
        socket.emit('create-room', { username: uname }, r => r?.ok ? res(r) : rej(new Error(r?.error || 'Failed')));
      });
      mySocketIdRef.current = socket.id;
      setMySocketId(socket.id);
      setRoomId(result.roomId);
      setMembers(result.members);
      setIsHost(true);
      setJoined(true);
      setStreamReady(false);
      setStreamConnected(false);
      viewerInitRef.current = false;
    } catch (e) {
      setError(e.message);
    }
  };

  const onJoinRoom = async (uname, rid) => {
    setUsername(uname);
    setError('');
    try {
      const result = await new Promise((res, rej) => {
        socket.emit('join-room', { username: uname, roomId: rid }, r => r?.ok ? res(r) : rej(new Error(r?.error || 'Failed')));
      });
      mySocketIdRef.current = socket.id;
      setMySocketId(socket.id);
      setRoomId(result.roomId);
      setMembers(result.members);
      setIsHost(result.hostId === socket.id);
      setJoined(true);
      setStreamReady(!!result.streamReady);
      setStreamConnected(false);
      viewerInitRef.current = false;
    } catch (e) {
      setError(e.message);
    }
  };

  const onLeaveRoom = () => {
    socket.emit('disconnect');
    setJoined(false);
    setRoomId('');
    setMembers([]);
    setMessages([]);
    setHostLeft(false);
    setStreamConnected(false);
    setStreamReady(false);
    viewerInitRef.current = false;
  };

  const onFileSelect = (file) => {
    if (!videoRef.current || !file) return;
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setManualFallback(false);
    setHostLoaded(false);
    setStreamConnected(false);
    setStreamReady(false);
    videoRef.current.srcObject = null;
    videoRef.current.src = url;
    videoRef.current.onloadedmetadata = () => {
      const ok = webrtcRef.current?.initHost(videoRef.current, roomId);
      if (!ok) setManualFallback(true);
      videoRef.current?.play?.().catch(() => {});
    };
  };

  const onSendMessage = (text) => {
    if (!text.trim() || !joined) return;
    socket.emit('chat', { text: text.trim(), roomId });
  };

  const onCopyRoom = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onQualityChange = async (quality, fps) => {
    if (webrtcRef.current) {
      await webrtcRef.current.setQuality(quality, fps);
    }
  };

  const onToggleMic = () => {
    toggleMic();
    const nextMuted = !micMuted;
    setMediaState(mySocketIdRef.current, { micMuted: nextMuted });
    socket.emit('mic-state', { muted: nextMuted, roomId });
  };

  const onToggleCam = () => {
    toggleCam();
    const nextOn = !camOn;
    setMediaState(mySocketIdRef.current, { camOn: nextOn });
    socket.emit('cam-state', { on: nextOn, roomId });
  };

  useEffect(() => {
    const onRoomJoined = (data) => {
      mySocketIdRef.current = socket.id;
      setMySocketId(socket.id);
      setMembers(data.members);
      setIsHost(data.hostId === socket.id);
    };

    const onUserJoined = (data) => {
      setMembers(data.members);
    };

    const onUserLeft = (data) => {
      setMembers(m => m.filter(x => x.socketId !== data.socketId));
    };

    const onHostChanged = (data) => {
      setIsHost(data.hostId === socket.id);
      setMembers(data.members);
      setHostLeft(true);
      setStreamConnected(false);
      setStreamReady(false);
      viewerInitRef.current = false;
    };

    const onHostLeft = () => {
      setHostLeft(true);
      setStreamConnected(false);
      setStreamReady(false);
      viewerInitRef.current = false;
    };

    const onChat = (data) => {
      setMessages(m => [...m, { socketId: data.socketId, username: data.socketId === socket.id ? username : (members.find(x => x.socketId === data.socketId)?.username || 'Guest'), text: data.text, ts: data.ts }]);
    };

    const onHostLoadedVideo = () => {
      setHostLoaded(true);
    };

    const onHostStreamReady = () => {
      setStreamReady(true);
    };

    const onCamState = (data) => {
      setMediaState(data.socketId, { camOn: !!data.on });
    };

    const onMicState = (data) => {
      setMediaState(data.socketId, { micMuted: !!data.muted });
    };

    socket.on('room-joined', onRoomJoined);
    socket.on('user-joined', onUserJoined);
    socket.on('user-left', onUserLeft);
    socket.on('host-changed', onHostChanged);
    socket.on('host-left', onHostLeft);
    socket.on('chat', onChat);
    socket.on('host-loaded-video', onHostLoadedVideo);
    socket.on('host-stream-ready', onHostStreamReady);
    socket.on('cam-state', onCamState);
    socket.on('mic-state', onMicState);

    return () => {
      socket.off('room-joined', onRoomJoined);
      socket.off('user-joined', onUserJoined);
      socket.off('user-left', onUserLeft);
      socket.off('host-changed', onHostChanged);
      socket.off('host-left', onHostLeft);
      socket.off('chat', onChat);
      socket.off('host-loaded-video', onHostLoadedVideo);
      socket.off('host-stream-ready', onHostStreamReady);
      socket.off('cam-state', onCamState);
      socket.off('mic-state', onMicState);
    };
  }, [joined, username, members]);

  useEffect(() => {
    if (!joined || !roomId || !videoRef.current) return;
    syncEngineRef.current?.destroy();
    syncEngineRef.current = new SyncEngine(socket, videoRef.current, isHost, setSyncText);
    syncEngineRef.current.attach(roomId);
    return () => syncEngineRef.current?.destroy();
  }, [joined, roomId, isHost]);

  useEffect(() => {
    if (!joined) return;

    webrtcRef.current?.closeAll();
    webrtcRef.current = new WebRTCManager(socket, isHost, {
      onPeerCountChange: setViewerCount,
      onStreamReceived: () => setStreamConnected(true),
      onConnectionFailed: (msg) => setError(msg)
    });
    webrtcRef.current.setRoomId(roomId);


    const debugInterval = setInterval(async () => {
      if (webrtcRef.current && debugOpen) {
        const peers = await webrtcRef.current.collectStats();
        setDebugPeers(peers);
      }
    }, 1000);

    const keydownListener = (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault();
        setDebugOpen(d => !d);
      }
    };

    window.addEventListener('keydown', keydownListener);

    return () => {
      clearInterval(debugInterval);
      window.removeEventListener('keydown', keydownListener);
      webrtcRef.current?.closeAll();
    };
  }, [joined, roomId, isHost]);

  useEffect(() => {
    if (isHost || !streamReady || !webrtcRef.current || !videoRef.current) return;
    if (viewerInitRef.current) return;
    viewerInitRef.current = true;
    webrtcRef.current.initViewer(videoRef.current, roomId);
  }, [isHost, streamReady, roomId]);

  useEffect(() => {
    if (isHost && videoRef.current && !manualFallback && videoSrc) {
      videoRef.current.play?.().catch(() => {});
    }
  }, [isHost, videoSrc, manualFallback]);

  useEffect(() => {
    if (!streamReady) viewerInitRef.current = false;
  }, [streamReady]);

  if (!joined) {
    return (
      <div className={styles.shell}>
        <LobbyScreen
          onCreateRoom={onCreateRoom}
          onJoinRoom={onJoinRoom}
          error={error}
        />
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      <RoomScreen
        roomId={roomId}
        isHost={isHost}
        members={members}
        videoRef={videoRef}
        videoSrc={videoSrc}
        streamConnected={streamConnected}
        hostLoaded={hostLoaded}
        manualFallback={manualFallback}
        syncText={syncText}
        messages={messages}
        username={username}
        copied={copied}
        error={error}
        hostLeft={hostLeft}
        viewerCount={viewerCount}
        debugOpen={debugOpen}
        debugPeers={debugPeers}
        participants={generateParticipants()}
        camOn={camOn}
        micMuted={micMuted}
        speakingVolume={speakingVolume}
        mySocketId={mySocketId}
        mediaStates={mediaStates}
        onFileSelect={onFileSelect}
        onSendMessage={onSendMessage}
        onCopyRoom={onCopyRoom}
        onLeaveRoom={onLeaveRoom}
        onQualityChange={onQualityChange}
        onToggleMic={onToggleMic}
        onToggleCam={onToggleCam}
      />
    </div>
  );
}
