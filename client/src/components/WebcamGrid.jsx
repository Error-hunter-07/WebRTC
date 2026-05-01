import { useEffect, useRef } from 'react';
import styles from '../App.module.css';

function ParticipantTile({ participant }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = participant.stream || null;
    if (audioRef.current && !participant.isSelf) {
      audioRef.current.srcObject = participant.stream || null;
      audioRef.current.play?.().catch(() => {});
    }
  }, [participant.stream, participant.isSelf]);

  return (
    <div className={`${styles.tile} ${participant.isSelf ? styles.self : ''} ${participant.speakingVolume > 30 ? styles.speaking : ''}`}>
      {participant.camOn && participant.stream ? (
        <video ref={videoRef} autoPlay playsInline muted={participant.isSelf} className={styles.tileVideo} />
      ) : (
        <div className={styles.placeholder}>{participant.username.charAt(0).toUpperCase()}</div>
      )}
      {!participant.isSelf && participant.stream && <audio ref={audioRef} autoPlay playsInline className={styles.hidden} />}
      {participant.micMuted && <div className={styles.micOff}>🔇</div>}
      {participant.isSelf && <div className={styles.badge}>You</div>}
      <div className={styles.label}>{participant.username}</div>
    </div>
  );
}

export default function WebcamGrid({ participants }) {
  return (
    <div className={styles.webcamStrip}>
      {participants.map(participant => <ParticipantTile key={participant.socketId} participant={participant} />)}
    </div>
  );
}
