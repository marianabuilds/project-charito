import React from 'react';
import { LeafIcon } from './LeafIcon';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface ActiveBlockOverlayProps {
  remainingSeconds: number;
  totalSeconds: number;
  message: string | null;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onEndBlock: () => void;
  /** Dismiss overlay and return to Home — block stays active in the background. */
  onBackToHome: () => void;
}

/**
 * Optional session detail sheet — not the blocked-app experience.
 * Shown only when the user taps View on the Home banner; detox starts as a compact banner
 * so Charito Home stays usable. The true full-screen block lives in native BlockedOverlayActivity
 * (third-party apps) and Settings preview.
 */
export const ActiveBlockOverlay: React.FC<ActiveBlockOverlayProps> = ({
  remainingSeconds,
  totalSeconds,
  message,
  isPaused,
  onPause,
  onResume,
  onEndBlock,
  onBackToHome,
}) => {
  const progress =
    totalSeconds > 0
      ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100
      : 0;

  return (
    <div
      className="active-block-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Detox block active"
    >
      <div className="active-block-overlay-inner">
        <div className="active-block-leaf" aria-hidden="true">
          <LeafIcon size={48} />
        </div>

        <p className="active-block-eyebrow">Taking a breath</p>
        <h1 className="active-block-title">Detox block is active</h1>
        <p className="active-block-sub">
          Selected apps stay paused until the timer ends — or you break the block for $1.
        </p>

        <p className="active-block-timer" aria-live="polite" aria-label="Time remaining">
          {formatTime(remainingSeconds)}
        </p>

        <div
          className="active-block-progress"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="active-block-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {message && (
          <p className="active-block-message">
            <em>&ldquo;{message}&rdquo;</em>
          </p>
        )}

        <div className="active-block-actions">
          {isPaused ? (
            <button type="button" className="button button-primary" onClick={onResume}>
              Resume
            </button>
          ) : (
            <button type="button" className="button button-secondary" onClick={onPause}>
              Pause timer
            </button>
          )}
          <button type="button" className="button button-ghost" onClick={onEndBlock}>
            End block
          </button>
        </div>

        <button
          type="button"
          className="active-block-home-link"
          onClick={onBackToHome}
        >
          Back to Home — schedule other blocks
        </button>
        <p className="active-block-home-hint">
          Leaving this screen won&apos;t stop the block. Apps stay paused until the timer ends.
        </p>
      </div>
    </div>
  );
};

interface ActiveBlockBannerProps {
  remainingSeconds: number;
  onOpen: () => void;
  onEndBlock: () => void;
}

/** Compact Home chip while a detox runs — default in-app UI (not a full-screen trap). */
export const ActiveBlockBanner: React.FC<ActiveBlockBannerProps> = ({
  remainingSeconds,
  onOpen,
  onEndBlock,
}) => (
  <div className="active-block-banner" role="status">
    <button type="button" className="active-block-banner-main" onClick={onOpen}>
      <span className="active-block-banner-dot" aria-hidden="true" />
      <span className="active-block-banner-text">
        Block active · {formatTime(remainingSeconds)} left
      </span>
      <span className="active-block-banner-cta">View</span>
    </button>
    <button
      type="button"
      className="active-block-banner-end"
      onClick={onEndBlock}
      aria-label="End block"
    >
      End
    </button>
  </div>
);
