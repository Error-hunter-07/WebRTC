import styles from '../App.module.css';

export default function ChatPanel({ messages, onSend, username, open, onClose }) {
  const [text, setText] = React.useState('');
  const chatRef = React.useRef(null);

  React.useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

  const send = () => { if (text.trim()) { onSend(text); setText(''); } };

  return (
    <div className={`${styles.sidePanel} ${open ? styles.open : ''}`}>
      <div className={styles.panelHeader}><h2>Chat</h2><button onClick={onClose}>✕</button></div>
      <div ref={chatRef} className={styles.chatMessages}>
        {messages.map((m, i) => <div key={i}><strong>{m.username}:</strong> {m.message}</div>)}
      </div>
      <div className={styles.chatInput}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Message..." />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}

import React from 'react';
