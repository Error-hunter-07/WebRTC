import React, { useEffect, useRef, useState } from 'react';
import styles from '../App.module.css';
import ControlBar from './ControlBar';
import { IconFilm, IconUpload } from './Icons';

function FileDropZone({ onFile }) {
  const [dragOver, setDragOver] = useState(false);
  const [loaded, setLoaded] = useState(null);
  const inputRef = useRef(null);

  const handle = (file) => {
    if (!file) return;
    setLoaded(file.name);
    onFile(file);
  };

  if (loaded) {
    return (
      <div className={styles.fileLoaded}>
        <IconFilm size={14} />
        {loaded}
        <button
          onClick={() => { setLoaded(null); inputRef.current?.click(); }}
          className={styles.fileChangeBtn}
        >
          Change
        </button>
        <input ref={inputRef} type="file" accept="video/*" className={styles.hidden} onChange={e => handle(e.target.files?.[0])} />
      </div>
    );
  }

  return (
    <div
      className={`${styles.fileDropZone} ${dragOver ? styles.dragOver : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); handle(e.dataTransfer.files[0]); }}
    >
      <input ref={inputRef} type="file" accept="video/*" className={styles.hidden}
        onChange={e => handle(e.target.files?.[0])} />
      <IconUpload size={22} color="var(--text-muted)" />
      <span className={styles.fileDropText}>Drop a video file here</span>
      <span className={styles.fileDropHint}>or tap to browse · MP4, MKV, WebM</span>
    </div>
  );
}

export default function VideoPlayer({ videoRef, isHost, videoSrc, streamConnected, hostLoaded, manualFallback, onFileSelect, syncText, onQualityChange }) {
  const [alwaysVisible, setAlwaysVisible] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setAlwaysVisible(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  return (
    <div className={styles.videoPanel}>
      <div className={styles.videoWrapper}>
        <video ref={videoRef} src={(isHost || manualFallback) && videoSrc ? videoSrc : undefined} controls={false} autoPlay playsInline className={styles.video} />
        {!videoSrc && !streamConnected && isHost && <div className={styles.videoStatus}><FileDropZone onFile={onFileSelect} /></div>}
        {!videoSrc && !streamConnected && !isHost && (
          <div className={styles.videoStatus}>
            <div className={styles.spinner} />
            <div className={styles.videoStatusText}>{hostLoaded ? 'Connecting to stream...' : 'Waiting for host to load a video...'}</div>
          </div>
        )}
        <div className={`${styles.controlBarWrap} ${alwaysVisible ? styles.alwaysVisible : ''}`}>
          <ControlBar videoRef={videoRef} isHost={isHost} onQualityChange={onQualityChange} />
        </div>
      </div>
      {manualFallback && !videoSrc && <p className={styles.hint}>Direct streaming not supported. Please load the video file manually.</p>}
    </div>
  );
}
