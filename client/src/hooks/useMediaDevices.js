import { useState, useEffect, useRef } from 'react';
import { toast } from '../components/Toast';

export function useMediaDevices() {
  const [camOn, setCamOn] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [speakingVolume, setSpeakingVolume] = useState(0);
  const audioCtxRef = useRef(null), analyserRef = useRef(null), micStreamRef = useRef(null);
  const initRef = useRef(false);

  const updateStream = (tracks) => {
    const stream = tracks.length ? new MediaStream(tracks) : null;
    setLocalStream(stream);
    const audioTrack = stream?.getAudioTracks?.()[0];
    micStreamRef.current = audioTrack ? new MediaStream([audioTrack]) : null;
    return stream;
  };

  const toggleCam = async () => {
    const currentTracks = localStream?.getTracks?.() || [];
    if (camOn) {
      currentTracks.filter(t => t.kind === 'video').forEach(t => t.stop());
      const nextTracks = currentTracks.filter(t => t.kind !== 'video');
      updateStream(nextTracks);
      setCamOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const nextTracks = [...currentTracks.filter(t => t.kind !== 'video'), ...stream.getVideoTracks()];
      updateStream(nextTracks);
      setCamOn(true);
    } catch {
      toast.error('Camera permission denied');
    }
  };

  const toggleMic = async () => {
    const currentTracks = localStream?.getTracks?.() || [];
    const audioTrack = currentTracks.find(t => t.kind === 'audio');
    if (!audioTrack) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const nextTracks = [...currentTracks.filter(t => t.kind !== 'audio'), ...stream.getAudioTracks()];
        updateStream(nextTracks);
        setMicMuted(false);
      } catch {
        toast.error('Microphone permission denied');
      }
      return;
    }
    audioTrack.enabled = !audioTrack.enabled;
    setMicMuted(!audioTrack.enabled);
  };

  // Auto-enable camera on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        const tracks = [];
        if (videoTrack) tracks.push(videoTrack);
        if (audioTrack) tracks.push(audioTrack);
        updateStream(tracks);
        setCamOn(!!videoTrack);
        setMicMuted(!audioTrack?.enabled);
      } catch (err) {
        // Silently fail - user can enable later
      }
    };

    initCamera();
  }, []);

  useEffect(() => {
    if (!localStream || !micStreamRef.current) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContextClass();

    let cancelled = false;
    const ensureAnalyser = async () => {
      if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
      if (cancelled) return;
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtxRef.current.createMediaStreamSource(micStreamRef.current);
      source.connect(analyser);
      analyserRef.current = analyser;
    };

    ensureAnalyser();

    const interval = setInterval(() => {
      if (analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        setSpeakingVolume(Math.round(data.reduce((a, b) => a + b) / data.length));
      }
    }, 100);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [localStream, micMuted]);

  useEffect(() => {
    return () => {
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  return { camOn, micMuted, localStream, toggleCam, toggleMic, speakingVolume };
}
