import React, { useEffect, useRef, useState } from 'react';
import styles from '../App.module.css';
import {
  IconMaximize,
  IconPause,
  IconPlay,
  IconSkipBack10,
  IconSkipForward10,
  IconVolume2,
  IconVolumeX
} from './Icons';

const formatTime = (secs) => {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = Math.floor(secs % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

export default function ControlBar({ videoRef, isHost, onQualityChange }) {
  const [currentTime, setCurrentTime] = useState(0), [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [qualityValue, setQualityValue] = useState('1080p-60');
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    return () => { v.removeEventListener('play', onPlay); v.removeEventListener('pause', onPause); };
  }, [videoRef]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tick = () => {
      setCurrentTime(v.currentTime || 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    const onLoaded = () => setDuration(v.duration || 0);
    v.addEventListener('loadedmetadata', onLoaded);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      v.removeEventListener('loadedmetadata', onLoaded);
    };
  }, [videoRef]);

  const skip = (dir) => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + dir * 10)); };
  const togglePlay = () => { if (videoRef.current) videoRef.current[playing ? 'pause' : 'play'](); };
  const changeVol = (v) => { setVolume(v); if (videoRef.current) videoRef.current.volume = v; };
  const seekTo = (t) => { if (videoRef.current) videoRef.current.currentTime = t; };
  const fullscreen = () => { videoRef.current?.requestFullscreen?.(); };
  const qualChange = (value) => {
    setQualityValue(value);
    const [q, f] = value.split('-');
    onQualityChange?.(q, parseInt(f, 10));
  };

  const hostDisabled = !isHost;
  const barBtn = (label, onClick, icon, disabled = false, className = '') => (
    <button onClick={onClick} title={label} disabled={disabled} className={`${styles.ctrlBtn} ${className}`}>{icon}</button>
  );

  return (
    <div className={styles.controlBar}>
      <div className={styles.seekRow}>
        <input
          type="range"
          min="0"
          max={duration}
          value={currentTime}
          onChange={e => seekTo(parseFloat(e.target.value))}
          className={styles.seekSlider}
          disabled={hostDisabled}
        />
      </div>
      <div className={styles.ctrlRow}>
        <div className={styles.ctrlLeft}>
          {barBtn('Back 10s', () => skip(-1), <IconSkipBack10 size={18} />, hostDisabled)}
          {barBtn(playing ? 'Pause' : 'Play', togglePlay, playing ? <IconPause size={18} /> : <IconPlay size={18} />, hostDisabled, styles.ctrlBtnLg)}
          {barBtn('Forward 10s', () => skip(1), <IconSkipForward10 size={18} />, hostDisabled)}
          <span className={styles.timeDisplay}>{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
        <div className={styles.ctrlCenter} />
        <div className={styles.ctrlRight}>
          <input type="range" min="0" max="1" step="0.1" value={volume} onChange={e => changeVol(parseFloat(e.target.value))} className={styles.volumeSlider} />
          {barBtn(volume > 0 ? 'Mute' : 'Unmute', () => changeVol(volume > 0 ? 0 : 1), volume > 0 ? <IconVolume2 size={16} /> : <IconVolumeX size={16} />)}
          <select value={qualityValue} onChange={e => qualChange(e.target.value)} className={styles.dropdown} disabled={!isHost}>
            <option value="1080p-60">1080p·60fps</option>
            <option value="720p-30">720p·30fps</option>
            <option value="480p-30">480p·30fps</option>
            <option value="360p-24">360p·24fps</option>
          </select>
          {barBtn('Fullscreen', fullscreen, <IconMaximize size={16} />)}
        </div>
      </div>
    </div>
  );
}
