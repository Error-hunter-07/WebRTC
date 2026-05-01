import React, { useEffect, useRef, useState } from 'react';
import styles from '../App.module.css';
import { IconMessageCircle, IconSend, IconX } from './Icons';

export default function ChatPanel({ messages, onSend, username, open, onClose, mySocketId, memberCount }) {
  const [text, setText] = useState('');
  const chatRef = useRef(null);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

  const send = () => { if (text.trim()) { onSend(text); setText(''); } };
  const timeFor = (ts) => new Date(ts || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`${styles.sidePanel} ${open ? styles.open : ''}`}>
      <div className={styles.panelHeader}>
        <div>Chat{typeof memberCount === 'number' ? ` (${memberCount})` : ''}</div>
        <button className={styles.panelCloseBtn} onClick={onClose}><IconX size={16} /></button>
      </div>
      {messages.length === 0 ? (
        <div className={styles.chatEmpty}>
          <IconMessageCircle size={20} />
          <div>No messages yet</div>
        </div>
      ) : (
        <div ref={chatRef} className={styles.chatMessages}>
          {messages.map((m, i) => {
            const isSelf = m.socketId && mySocketId ? m.socketId === mySocketId : m.username === username;
            return (
              <div key={i} className={`${styles.msgRow} ${isSelf ? styles.self : ''}`}>
                <div className={styles.msgMeta}>
                  <span className={styles.msgName}>{m.username || 'Guest'}</span>
                  <span>{timeFor(m.ts)}</span>
                </div>
                <div className={styles.msgBubble}>{m.text}</div>
              </div>
            );
          })}
        </div>
      )}
      <div className={styles.chatInputRow}>
        <input className={styles.chatInput} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Message..." />
        <button className={styles.chatSendBtn} onClick={send} title="Send">
          <IconSend size={16} />
        </button>
      </div>
    </div>
  );
}
