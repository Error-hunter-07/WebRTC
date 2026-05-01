import styles from '../App.module.css';
import ControlBar from './ControlBar';

export default function VideoPlayer({ videoRef, isHost, videoSrc, streamConnected, hostLoaded, manualFallback, onFileSelect, syncText, onQualityChange }) {
  return (
    <div className={styles.videoPanel}>
      {(isHost || manualFallback) && (
        <div className={styles.fileInput}>
          <input type="file" accept="video/*" onChange={e => onFileSelect?.(e.target.files?.[0])} />
        </div>
      )}
      <div className={styles.videoWrapper}>
        <video ref={videoRef} src={(isHost || manualFallback) && videoSrc ? videoSrc : undefined} controls={false} autoPlay playsInline className={styles.video} />
        <div className={styles.controlBarWrap}>
          <ControlBar videoRef={videoRef} isHost={isHost} onQualityChange={onQualityChange} />
        </div>
      </div>
      {!videoSrc && (isHost ? <p className={styles.hint}>Load your local file here.</p> : manualFallback ? <p className={styles.hint}>Direct streaming not supported. Please load the video file manually.</p> : <p className={styles.hint}>{streamConnected ? 'Stream connected ✓' : hostLoaded ? 'Connecting to host stream...' : 'Waiting for host to load video...'}</p>)}
    </div>
  );
}

import React from 'react';
