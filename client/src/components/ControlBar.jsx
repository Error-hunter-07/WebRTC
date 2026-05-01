import styles from '../App.module.css';

const InlineIcons = {
  play: <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><polygon points="5 2 18 11 5 20" /></svg>,
  pause: <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><rect x="4" y="2" width="3" height="16" /><rect x="13" y="2" width="3" height="16" /></svg>,
  volume: <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><path d="M3 7v4h3l4-3.5v10l-4-3.5H3V7M15 10c0-1.5-.8-2.8-2-3.5v7c1.2-.7 2-2 2-3.5z"/></svg>,
  volumeMute: <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><path d="M3 7v4h3l4-3.5v10l-4-3.5H3V7M17 3l-3 3M14 3l3 3"/></svg>,
  fullscreen: <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><rect x="3" y="3" width="5" height="2" /><rect x="3" y="3" width="2" height="5" /><rect x="10" y="3" width="5" height="2" /><rect x="13" y="3" width="2" height="5" /><rect x="3" y="13" width="5" height="2" /><rect x="3" y="10" width="2" height="5" /><rect x="10" y="13" width="5" height="2" /><rect x="13" y="10" width="2" height="5" /></svg>,
};

const formatTime = (secs) => {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = Math.floor(secs % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

export default function ControlBar({ videoRef, isHost, onQualityChange }) {
  const [currentTime, setCurrentTime] = React.useState(0), [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(1), [quality, setQuality] = React.useState('720p');
  const [fps, setFps] = React.useState(30);

  React.useEffect(() => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const update = () => setCurrentTime(v.currentTime ?? 0);
    const loaded = () => { setDuration(v.duration ?? 0); update(); };
    const rafId = setInterval(update, 100);
    v.addEventListener('loadedmetadata', loaded); v.addEventListener('timeupdate', update);
    return () => { clearInterval(rafId); v.removeEventListener('loadedmetadata', loaded); v.removeEventListener('timeupdate', update); };
  }, [videoRef]);

  const skip = (dir) => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + dir * 10)); };
  const togglePlay = () => { if (videoRef.current) videoRef.current[videoRef.current.paused ? 'play' : 'pause'](); };
  const changeVol = (v) => { setVolume(v); if (videoRef.current) videoRef.current.volume = v; };
  const seekTo = (t) => { if (videoRef.current) videoRef.current.currentTime = t; };
  const fullscreen = () => { videoRef.current?.requestFullscreen?.(); };
  const qualChange = (q, f) => { setQuality(q); setFps(f); onQualityChange?.(q, f); };

  const disabledStyle = !isHost ? { pointerEvents: 'none', opacity: 0.5 } : {};
  const barBtns = (label, onClick, icon) => <button onClick={onClick} title={label} className={styles.ctrlBtn}>{icon}</button>;

  return (
    <div className={styles.controlBar} style={disabledStyle}>
      <div className={styles.ctrlLeft}>
        {barBtns('Back 10s', () => skip(-1), '⏪')}
        {barBtns(videoRef.current?.paused ? 'Play' : 'Pause', togglePlay, videoRef.current?.paused ? InlineIcons.play : InlineIcons.pause)}
        {barBtns('Forward 10s', () => skip(1), '⏩')}
        <span className={styles.timeDisplay}>{formatTime(currentTime)} / {formatTime(duration)}</span>
      </div>
      <div className={styles.ctrlCenter}>
        <input type="range" min="0" max={duration} value={currentTime} onChange={e => seekTo(parseFloat(e.target.value))} className={styles.seekSlider} />
      </div>
      <div className={styles.ctrlRight}>
        <input type="range" min="0" max="1" step="0.1" value={volume} onChange={e => changeVol(parseFloat(e.target.value))} className={styles.volumeSlider} />
        {barBtns(volume > 0 ? 'Mute' : 'Unmute', () => changeVol(volume > 0 ? 0 : 1), volume > 0 ? InlineIcons.volume : InlineIcons.volumeMute)}
        <select value={quality} onChange={e => { const [q, f] = e.target.value.split('-'); qualChange(q, parseInt(f)); }} className={styles.dropdown} disabled={!isHost}>
          <option value="1080p-60">1080p 60fps</option>
          <option value="720p-30">720p 30fps</option>
          <option value="480p-30">480p 30fps</option>
          <option value="360p-24">360p 24fps</option>
        </select>
        {barBtns('Fullscreen', fullscreen, InlineIcons.fullscreen)}
      </div>
    </div>
  );
}

import React from 'react';
