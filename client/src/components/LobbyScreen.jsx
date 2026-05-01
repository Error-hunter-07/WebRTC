import React, { useState } from 'react';
import { IconFilm } from './Icons';
import styles from '../App.module.css';

export default function LobbyScreen({ onCreateRoom, onJoinRoom, error }) {
  const [username, setUsername] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try { await onCreateRoom(username.trim() || 'Guest'); }
    finally { setCreating(false); }
  };

  const handleJoin = async () => {
    if (joining) return;
    setJoining(true);
    try { await onJoinRoom(username.trim() || 'Guest', joinRoomId.trim().toUpperCase()); }
    finally { setJoining(false); }
  };

  return (
    <div className={styles.lobby}>
      <div className={styles.lobbyCard}>
        <div className={styles.lobbyBrand}>
          <div className={styles.lobbyLogo}><IconFilm size={18} /></div>
          <div>
            <div className={styles.lobbyTitle}>CineSync</div>
            <p className={styles.lobbySubtitle}>Watch together, perfectly in sync.</p>
          </div>
        </div>

        <input
          className={styles.lobbyInput}
          placeholder="Your name"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />

        <button className={styles.primaryBtn} onClick={handleCreate} disabled={creating}>
          <IconFilm size={16} />
          {creating ? 'Creating...' : 'Host a Session'}
        </button>

        <div className={styles.divider}>or join existing</div>

        <input
          className={`${styles.lobbyInput} ${styles.mono}`}
          placeholder="ROOM CODE"
          value={joinRoomId}
          onChange={e => setJoinRoomId(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
        />

        <button className={styles.secondaryBtn} onClick={handleJoin} disabled={joining}>
          {joining ? 'Joining...' : 'Join Session'}
        </button>

        {error && <div className={styles.errorText}>{error}</div>}
        <div className={styles.lobbyFooter}>No account needed · Streams peer-to-peer</div>
      </div>
    </div>
  );
}
