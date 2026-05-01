import React, { useCallback, useEffect, useState } from 'react';
import styles from '../App.module.css';

let addToastFn = null;
export const toast = {
  success: (msg) => addToastFn?.({ type: 'success', msg }),
  error: (msg) => addToastFn?.({ type: 'error', msg }),
  info: (msg) => addToastFn?.({ type: 'info', msg }),
  warning: (msg) => addToastFn?.({ type: 'warning', msg })
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((t) => {
    const id = Date.now();
    setToasts(prev => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4200);
  }, []);

  useEffect(() => {
    addToastFn = add;
    return () => { addToastFn = null; };
  }, [add]);

  return (
    <div className={styles.toastContainer}>
      {toasts.map(t => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type] || ''}`}>
          {t.msg}
          <div className={styles.toastProgress} />
        </div>
      ))}
    </div>
  );
}
