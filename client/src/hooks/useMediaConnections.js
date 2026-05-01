import { useState, useEffect, useRef } from 'react';

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];
const turnUrl = import.meta.env.VITE_TURN_URL;
const iceConfig = { iceServers: turnUrl ? [...iceServers, { urls: turnUrl, username: import.meta.env.VITE_TURN_USER, credential: import.meta.env.VITE_TURN_CREDENTIAL }] : iceServers };

export function useMediaConnections(socket, roomId, members, localStream, mySocketId) {
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const peersRef = useRef(new Map());
  const offeredPeers = useRef(new Set());

  const attachTracks = (pc, stream) => {
    if (!stream) return;
    const senders = pc.getSenders();
    stream.getTracks().forEach(track => {
      const sender = senders.find(s => s.track && s.track.kind === track.kind);
      if (sender?.replaceTrack) sender.replaceTrack(track);
      else pc.addTrack(track, stream);
    });
  };

  const ensurePeer = (targetSocketId) => {
    if (peersRef.current.has(targetSocketId)) return peersRef.current.get(targetSocketId).pc;
    const pc = new RTCPeerConnection(iceConfig);
    pc.ontrack = e => setRemoteStreams(m => new Map(m).set(targetSocketId, e.streams[0]));
    pc.onicecandidate = e => { if (e.candidate) socket.emit('media-ice', { candidate: e.candidate, targetSocketId, roomId }); };
    peersRef.current.set(targetSocketId, { pc });
    return pc;
  };

  useEffect(() => {
    if (!socket || !roomId) return;

    const onMediaOffer = async (data) => {
      const pc = ensurePeer(data.fromSocketId);
      attachTracks(pc, localStream);
      await pc.setRemoteDescription(data.offer);
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      socket.emit('media-answer', { answer: ans, targetSocketId: data.fromSocketId, roomId });
    };

    const onMediaAnswer = async (data) => {
      const peer = peersRef.current.get(data.fromSocketId);
      if (peer) await peer.pc.setRemoteDescription(data.answer);
    };

    const onMediaIce = async (data) => {
      const peer = peersRef.current.get(data.fromSocketId);
      if (peer && data.candidate) try { await peer.pc.addIceCandidate(data.candidate); } catch {}
    };

    socket.on('media-offer', onMediaOffer);
    socket.on('media-answer', onMediaAnswer);
    socket.on('media-ice', onMediaIce);

    return () => { socket.off('media-offer', onMediaOffer); socket.off('media-answer', onMediaAnswer); socket.off('media-ice', onMediaIce); };
  }, [socket, roomId, localStream]);

  useEffect(() => {
    if (!socket || !roomId || !localStream || !members?.length) return;
    const myId = mySocketId || socket.id;
    members.forEach(m => {
      if (!m.socketId || m.socketId === myId) return;
      if (offeredPeers.current.has(m.socketId)) return;
      const pc = ensurePeer(m.socketId);
      attachTracks(pc, localStream);
      const shouldOffer = myId < m.socketId;
      if (!shouldOffer || pc.signalingState !== 'stable') return;
      offeredPeers.current.add(m.socketId);
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer).then(() => {
          socket.emit('media-offer', { offer, targetSocketId: m.socketId, roomId });
        }))
        .catch(() => {});
    });
  }, [socket, roomId, members, localStream, mySocketId]);

  useEffect(() => {
    return () => { peersRef.current.forEach(({ pc }) => pc.close()); peersRef.current.clear(); offeredPeers.current.clear(); };
  }, []);

  return { remoteStreams };
}
