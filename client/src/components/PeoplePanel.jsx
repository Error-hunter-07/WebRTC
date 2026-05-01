import styles from '../App.module.css';

export default function PeoplePanel({ members, mySocketId, mediaStates = {}, open, onClose }) {
  return (
    <div className={`${styles.sidePanel} ${open ? styles.open : ''}`}>
      <div className={styles.panelHeader}><h2>People ({members.length})</h2><button onClick={onClose}>✕</button></div>
      <ul className={styles.membersList}>
        {members.map(m => (
          <li key={m.socketId}>
            {m.username}
            {m.socketId === mySocketId ? ' (you)' : ''}
            {m.isHost ? ' · host' : ''}
            {mediaStates[m.socketId]?.camOn === false && ' [cam off]'}
            {mediaStates[m.socketId]?.micMuted === true && ' [muted]'}
          </li>
        ))}
      </ul>
    </div>
  );
}

import React from 'react';
