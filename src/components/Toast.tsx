import React from 'react';
import { toastStore } from '../state/toastStore';

export const Toast: React.FC = () => {
  const [message, setMessage] = React.useState<string | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return toastStore.subscribe((msg) => {
      setMessage(msg);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setMessage(null);
      }, 4000);
    });
  }, []);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!message) return null;

  return (
    <div className="toast-banner" role="status" aria-live="polite">
      {message}
    </div>
  );
};
