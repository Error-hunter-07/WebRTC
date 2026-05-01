import React from 'react';
import styles from '../App.module.css';
import { IconCamera, IconCameraOff, IconCrown, IconMic, IconMicOff, IconX } from './Icons';

const avatarGradient = (name = '') => {
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const h1 = hash % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1} 70% 50%), hsl(${h2} 70% 40%))`;
};

export default function PeoplePanel({ members, mySocketId, mediaStates = {}, open, onClose }) {
  return (
    <div className={`${styles.sidePanel} ${open ? styles.open : ''}`}>
      <div className={styles.panelHeader}>
        <div>People ({members.length})</div>
        <button className={styles.panelCloseBtn} onClick={onClose}><IconX size={16} /></button>
      </div>
      <ul className={styles.membersList}>
        {members.map(m => {
          const media = mediaStates[m.socketId] || {};
          const camOn = media.camOn !== false;
          const micMuted = media.micMuted === true;
          const isYou = m.socketId === mySocketId;
          return (
            <li key={m.socketId} className={styles.memberRow}>
              <div className={styles.memberAvatar} style={{ backgroundImage: avatarGradient(m.username) }}>
                {(m.username || 'G').charAt(0).toUpperCase()}
              </div>
              <div className={styles.memberName}>{m.username || 'Guest'}</div>
              <div className={styles.memberBadges}>
                {m.isHost && (
                  <span className={`${styles.roleBadge} ${styles.host}`}>
                    <IconCrown size={10} />
                    Host
                  </span>
                )}
                {isYou && <span className={`${styles.roleBadge} ${styles.you}`}>You</span>}
                <span className={`${styles.mediaIcon} ${!camOn ? styles.off : ''}`}>
                  {camOn ? <IconCamera size={14} /> : <IconCameraOff size={14} />}
                </span>
                <span className={`${styles.mediaIcon} ${micMuted ? styles.off : ''}`}>
                  {micMuted ? <IconMicOff size={14} /> : <IconMic size={14} />}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
