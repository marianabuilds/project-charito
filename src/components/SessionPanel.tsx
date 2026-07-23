import type { ModeId } from '../data/presets'
import type { SessionStatus } from '../hooks/useDetoxSession'
import { formatSeconds } from '../utils/time'

interface SessionPanelProps {
  status: SessionStatus
  remainingSeconds: number
  totalSeconds: number
  mode: ModeId
  phraseText: string
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onReset: () => void
}

export function SessionPanel({
  status,
  remainingSeconds,
  totalSeconds,
  mode,
  phraseText,
  onStart,
  onPause,
  onResume,
  onReset,
}: SessionPanelProps) {
  const isRunning = status === 'running'
  const isCompleted = status === 'completed'

  const progress =
    totalSeconds > 0
      ? 1 - Math.max(0, remainingSeconds) / totalSeconds
      : 0

  const modeDescription =
    mode === 'gentle'
      ? 'You will hear a gentle reminder partway through, and again when the session ends.'
      : 'You will hear a firmer reminder when the session ends, plus a full-screen overlay in this app.'

  return (
    <section className="card session-card" aria-labelledby="session-heading">
      <div className="card-header">
        <h2 id="session-heading">Detox session</h2>
        <p className="card-subtitle">
          Start a session once you are actively on your phone. Audio only plays
          after you tap start, to respect browser autoplay rules.
        </p>
      </div>

      <div className="timer-block" aria-live="polite">
        <p className="timer-label">Time remaining</p>
        <p className="timer-value">{formatSeconds(remainingSeconds)}</p>
        <div className="timer-bar" aria-hidden="true">
          <div
            className="timer-bar-fill"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
        <p className="timer-mode">{modeDescription}</p>
      </div>

      <div className="phrase-preview">
        <p className="phrase-preview-label">Charito will say</p>
        <p className="phrase-preview-text">“{phraseText}”</p>
      </div>

      <div className="controls-row" aria-label="Session controls">
        <button
          type="button"
          className="button button-primary"
          onClick={onStart}
          disabled={isRunning}
        >
          {status === 'idle' || isCompleted ? 'Start session' : 'Restart'}
        </button>
        <button
          type="button"
          className="button"
          onClick={isRunning ? onPause : onResume}
          disabled={status === 'idle' || isCompleted}
        >
          {isRunning ? 'Pause' : 'Resume'}
        </button>
        <button
          type="button"
          className="button button-ghost"
          onClick={onReset}
          disabled={status === 'idle'}
        >
          Reset
        </button>
      </div>
    </section>
  )
}

