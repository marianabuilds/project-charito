import React from 'react';
import { useDetoxSession } from '../hooks/useDetoxSession';
import { settingsStore } from '../state/settingsStore';
import { StrictOverlay } from './StrictOverlay';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export const SessionView: React.FC = () => {
  const {
    status,
    remainingSeconds,
    isStrict,
    currentMessageText,
    start,
    pause,
    resume,
    reset,
  } = useDetoxSession();

  const [overlayVisible, setOverlayVisible] = React.useState(false);

  React.useEffect(() => {
    if (status === 'completed' && isStrict) {
      setOverlayVisible(true);
    }
  }, [status, isStrict]);

  const handleDismissOverlay = () => {
    setOverlayVisible(false);
    reset();
  };

  const settings = settingsStore.get();
  const totalSeconds = settings.durationMinutes * 60;
  const progress = totalSeconds > 0
    ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100
    : 0;

  return (
    <div className="session-view">
      <h2 className="session-heading">Session</h2>
      <p className="session-mode">
        Mode: <strong>{settings.mode === 'strict' ? 'Strict' : 'Gentle'}</strong>
      </p>

      <p className="session-timer" aria-live="polite" aria-label="Time remaining">
        {formatTime(remainingSeconds)}
      </p>

      <div
        className="session-progress"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="session-progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="session-controls">
        {status === 'idle' && (
          <button type="button" className="button button-primary" onClick={start}>
            Start session
          </button>
        )}
        {status === 'running' && (
          <button type="button" className="button button-secondary" onClick={pause}>
            Pause
          </button>
        )}
        {status === 'paused' && (
          <button type="button" className="button button-primary" onClick={resume}>
            Resume
          </button>
        )}
        {status === 'completed' && !isStrict && (
          <button type="button" className="button button-primary" onClick={reset}>
            Start again
          </button>
        )}
        {status !== 'idle' && (
          <button type="button" className="button button-ghost" onClick={reset}>
            Reset
          </button>
        )}
      </div>

      {currentMessageText && (
        <p className="session-last-reminder" aria-live="polite">
          Last reminder: <em>{currentMessageText}</em>
        </p>
      )}

      <StrictOverlay
        visible={overlayVisible}
        message={currentMessageText}
        onDismiss={handleDismissOverlay}
      />
    </div>
  );
};
