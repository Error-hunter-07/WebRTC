import styles from '../App.module.css';

export default function LobbyScreen({ onCreateRoom, onJoinRoom, error }) {
  const [username, setUsername] = React.useState('');
  const [joinRoomId, setJoinRoomId] = React.useState('');

  return (
    <div className={styles.lobby}>
      <div className={styles.lobbyCard}>
        <h1>Watch Together</h1>
        <p>Real-time synchronized video watching with WebRTC.</p>
        <input placeholder="Your name" value={username} onChange={e => setUsername(e.target.value)} />
        <button onClick={() => onCreateRoom(username)} className={styles.primaryBtn}>Create Room</button>
        <div className={styles.divider}>or</div>
        <input placeholder="Room ID" value={joinRoomId} onChange={e => setJoinRoomId(e.target.value)} />
        <button onClick={() => onJoinRoom(username, joinRoomId)}>Join Room</button>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

import React from 'react';
