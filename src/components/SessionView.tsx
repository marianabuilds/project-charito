import React from 'react';
import { useSession } from '../state/SessionContext';
import { settingsStore } from '../state/settingsStore';
import { culturalPresets } from '../data/culturalPresets';
import { StrictOverlay } from './StrictOverlay';
import { AudioMessageRow } from './AudioMessageRow';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { journalStore } from '../state/journalStore';
import { speak } from '../services/audioEngine';
import { toastStore } from '../state/toastStore';

const JOURNAL_TRIGGERS = ['Boredom', 'Stress', 'Habit', 'Notification'] as const;

const AMBIENT_SOUNDS = [
  { id: 'off', label: 'Off', url: '' },
  { id: 'rain', label: 'Rain', url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_270f7d3f76.mp3' },
  { id: 'forest', label: 'Forest', url: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_dc39bde8e6.mp3' },
  { id: 'lofi', label: 'Lo-fi', url: 'https://cdn.pixabay.com/download/audio/2023/01/27/audio_8b378b3728.mp3' },
] as const;

type QuickBlockingMethod = 'duration' | 'set-hours' | 'usage-limit' | 'launch-count';
type QuickStep = 'method' | 'config' | 'message' | 'confirm';

const COMMON_APPS = [
  'Instagram', 'TikTok', 'YouTube', 'Twitter/X', 'Facebook',
  'Snapchat', 'Reddit', 'WhatsApp', 'LinkedIn', 'Safari/Chrome', 'Games',
];

const QUICK_METHODS: {
  id: QuickBlockingMethod;
  title: string;
  description: string;
  example: string;
}[] = [
  { id: 'duration', title: 'Duration', description: 'Full offline block', example: 'e.g. 30 min screen-free after lunch' },
  { id: 'set-hours', title: 'Set hours', description: 'Gentle nudges', example: 'e.g. No phone 9 PM – 7 AM' },
  { id: 'usage-limit', title: 'Usage limit', description: 'Cap screen time', example: 'e.g. Max 60 min of social media/day' },
  { id: 'launch-count', title: 'Launch count', description: 'Fewer opens', example: 'e.g. Open Instagram max 5 times today' },
];

function formatDuration(minutes: number): string {
  if (minutes <= 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export const SessionView: React.FC = () => {
  const {
    status,
    elapsedSeconds,
    remainingSeconds,
    isStrict,
    currentMessageText,
    start,
    pause,
    resume,
    reset,
  } = useSession();

  const [overlayVisible, setOverlayVisible] = React.useState(false);
  const [journalLogged, setJournalLogged] = React.useState(false);
  const [ambientSound, setAmbientSound] = React.useState<'off' | 'rain' | 'forest' | 'lofi'>('off');
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // 4-step quick flow state
  const [quickStep, setQuickStep] = React.useState<QuickStep>('method');
  const [quickMethod, setQuickMethod] = React.useState<QuickBlockingMethod>('duration');
  const [quickDuration, setQuickDuration] = React.useState(30);
  const [quickFromTime, setQuickFromTime] = React.useState('09:00');
  const [quickUntilTime, setQuickUntilTime] = React.useState('17:00');
  const [quickUsageLimit, setQuickUsageLimit] = React.useState(60);
  const [quickLaunchCount, setQuickLaunchCount] = React.useState(10);
  const [quickMessageId, setQuickMessageId] = React.useState('');
  const [quickCustomMessage, setQuickCustomMessage] = React.useState('');
  const [quickCustomAudio, setQuickCustomAudio] = React.useState(() => settingsStore.get().customMessageAudio);
  const [previewingId, setPreviewingId] = React.useState<string | null>(null);
  const [quickSelectedApps, setQuickSelectedApps] = React.useState<string[]>([...COMMON_APPS]);
  const [quickAppsExpanded, setQuickAppsExpanded] = React.useState(false);

  const toggleQuickApp = (app: string) => {
    setQuickSelectedApps((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app],
    );
  };
  const quickAllAppsSelected = quickSelectedApps.length === COMMON_APPS.length;
  const quickAppsBadge = quickAllAppsSelected
    ? 'All apps'
    : `${quickSelectedApps.length} app${quickSelectedApps.length === 1 ? '' : 's'}`;

  const {
    isRecording: isRecordingMsg,
    isSupported: hasMic,
    startRecording,
    stopRecording,
    discardRecording,
  } = useAudioRecorder((dataUrl) => {
    setQuickCustomAudio(dataUrl);
    settingsStore.set({ customMessageAudio: dataUrl });
  });

  React.useEffect(() => {
    if (status === 'completed' && isStrict) {
      setOverlayVisible(true);
    }
  }, [status, isStrict]);

  // Reset journal log flag when session resets to idle
  React.useEffect(() => {
    if (status === 'idle') {
      setJournalLogged(false);
      setAmbientSound('off');
    }
  }, [status]);

  // Manage ambient audio element
  React.useEffect(() => {
    const sound = AMBIENT_SOUNDS.find((s) => s.id === ambientSound);
    if (!sound || sound.url === '') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(sound.url);
    audio.loop = true;
    audioRef.current = audio;
    void audio.play().catch(() => { /* autoplay blocked — ignore */ });
    return () => {
      audio.pause();
    };
  }, [ambientSound]);

  // Clean up audio on unmount
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleDismissOverlay = () => {
    setOverlayVisible(false);
    reset();
  };

  const handleJournalEntry = (trigger: string) => {
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    journalStore.add({
      date: new Date().toISOString().slice(0, 10),
      trigger,
      minutesReclaimed: elapsedMinutes,
    });
    setJournalLogged(true);
    reset();
  };

  const handlePreviewMessage = (id: string, text: string) => {
    if (previewingId === id) {
      window.speechSynthesis.cancel();
      setPreviewingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const settings = settingsStore.get();
    setPreviewingId(id);
    void speak(text, settings.languageCode).then(() => setPreviewingId(null));
  };

  const handleStartNow = () => {
    // Apply duration if method is duration-based
    if (quickMethod === 'duration') {
      settingsStore.set({ durationMinutes: quickDuration });
    }
    // Apply chosen message
    if (quickMessageId === 'custom') {
      settingsStore.set({ selectedMessageId: 'custom', customMessage: quickCustomMessage });
    } else if (quickMessageId) {
      settingsStore.set({ selectedMessageId: quickMessageId, customMessage: '' });
    } else {
      settingsStore.set({ selectedMessageId: null, customMessage: '' });
    }
    // Reset step for next time
    setQuickStep('method');
    start();
    toastStore.show('✓ Offline block started. Charito will check in with you.');
  };

  const settings = settingsStore.get();
  const totalSeconds = settings.durationMinutes * 60;
  const progress =
    totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;

  const preset = culturalPresets.find((p) => p.cultureCode === settings.cultureCode);
  const selectedMethodMeta = QUICK_METHODS.find((m) => m.id === quickMethod)!;

  // Build message preview for confirm step
  let quickMessagePreview = 'Random';
  if (quickMessageId === 'custom') {
    quickMessagePreview = quickCustomMessage.trim() || 'Custom…';
  } else if (quickMessageId) {
    const msg = preset?.messages.find((m) => m.id === quickMessageId);
    if (msg) {
      quickMessagePreview = msg.text.length > 45 ? msg.text.slice(0, 42) + '…' : msg.text;
    }
  }

  // ── Idle state: 4-step flow ─────────────────────────────────────────────
  if (status === 'idle') {
    return (
      <div className="quick-session-card">
        {/* ── Step 1: Choose blocking method ──────────────────────────── */}
        {quickStep === 'method' && (
          <>
            <p className="quick-section-label">Quick offline block</p>
            <p className="quick-section-title">How do you want to block?</p>
            <div className="quick-method-list">
              {QUICK_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="quick-method-row"
                  onClick={() => {
                    setQuickMethod(m.id);
                    setQuickStep('config');
                  }}
                >
                  <span className="quick-method-name">{m.title}</span>
                  <span className="quick-method-desc">{m.description}</span>
                  <span className="method-example">{m.example}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 2: Method-specific config ──────────────────────────── */}
        {quickStep === 'config' && (
          <>
            <button
              type="button"
              className="quick-back-btn"
              onClick={() => setQuickStep('method')}
            >
              ← Back
            </button>
            <p className="quick-section-title">{selectedMethodMeta.title}</p>

            {quickMethod === 'duration' && (
              <div className="quick-config-block">
                <p className="quick-duration-big">{formatDuration(quickDuration)}</p>
                <input
                  type="range"
                  className="quick-range"
                  min={5}
                  max={120}
                  step={5}
                  value={quickDuration}
                  onChange={(e) => setQuickDuration(Number(e.target.value))}
                  aria-label="Session duration"
                  aria-valuetext={formatDuration(quickDuration)}
                />
              </div>
            )}

            {quickMethod === 'set-hours' && (
              <div className="quick-config-block">
                <div className="quick-time-row">
                  <div className="quick-time-field">
                    <label className="quick-time-label" htmlFor="qf-from">From</label>
                    <input
                      id="qf-from"
                      type="time"
                      className="quick-time-input"
                      value={quickFromTime}
                      onChange={(e) => setQuickFromTime(e.target.value)}
                    />
                  </div>
                  <div className="quick-time-field">
                    <label className="quick-time-label" htmlFor="qf-until">Until</label>
                    <input
                      id="qf-until"
                      type="time"
                      className="quick-time-input"
                      value={quickUntilTime}
                      onChange={(e) => setQuickUntilTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {quickMethod === 'usage-limit' && (
              <div className="quick-config-block">
                <p className="quick-duration-big">{quickUsageLimit} min</p>
                <p className="quick-config-hint">Max minutes per day</p>
                <input
                  type="range"
                  className="quick-range"
                  min={15}
                  max={240}
                  step={15}
                  value={quickUsageLimit}
                  onChange={(e) => setQuickUsageLimit(Number(e.target.value))}
                  aria-label="Max minutes per day"
                />
              </div>
            )}

            {quickMethod === 'launch-count' && (
              <div className="quick-config-block">
                <p className="quick-config-hint">Max opens per day</p>
                <div className="quick-stepper">
                  <button
                    type="button"
                    className="quick-stepper-btn"
                    onClick={() => setQuickLaunchCount((n) => Math.max(1, n - 1))}
                    aria-label="Decrease"
                  >
                    −
                  </button>
                  <span className="quick-duration-big">{quickLaunchCount}</span>
                  <button
                    type="button"
                    className="quick-stepper-btn"
                    onClick={() => setQuickLaunchCount((n) => Math.min(50, n + 1))}
                    aria-label="Increase"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              className="button button-primary quick-start-btn"
              onClick={() => setQuickStep('message')}
            >
              Next →
            </button>
          </>
        )}

        {/* ── Step 3: Pick a message (shown for ALL methods) ───────────────────────────────────── */}
        {quickStep === 'message' && (
          <>
            <button
              type="button"
              className="quick-back-btn"
              onClick={() => setQuickStep('config')}
            >
              ← Back
            </button>
            <p className="quick-section-title">Choose a message</p>
            <div className="quick-message-list">
              {/* Random (default) */}
              <label className="quick-message-row">
                <input
                  type="radio"
                  name="quick-message"
                  value=""
                  checked={quickMessageId === ''}
                  onChange={() => setQuickMessageId('')}
                  className="quick-message-radio"
                />
                <span className="quick-message-text">Random</span>
              </label>
              {/* Cultural messages with voice preview */}
              {preset?.messages.map((m) => (
                <div key={m.id} className="quick-message-row" style={{ alignItems: 'center' }}>
                  <AudioMessageRow
                    text={m.text}
                    name="quick-message"
                    value={m.id}
                    checked={quickMessageId === m.id}
                    onChange={() => setQuickMessageId(m.id)}
                    className=""
                    textClassName="quick-message-text"
                  />
                  <button
                    type="button"
                    onClick={() => handlePreviewMessage(m.id, m.text)}
                    aria-label={previewingId === m.id ? 'Stop preview' : 'Preview message'}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      color: 'var(--text-m, #888)',
                      flexShrink: 0,
                      marginLeft: 'auto',
                      padding: '0 0.25rem',
                    }}
                  >
                    {previewingId === m.id ? '■' : '▶'}
                  </button>
                </div>
              ))}
              {/* Custom */}
              <label className="quick-message-row">
                <input
                  type="radio"
                  name="quick-message"
                  value="custom"
                  checked={quickMessageId === 'custom'}
                  onChange={() => setQuickMessageId('custom')}
                  className="quick-message-radio"
                />
                <span className="quick-message-text">Custom…</span>
              </label>
              {quickMessageId === 'custom' && (
                <div style={{ marginTop: '0.25rem' }}>
                  <input
                    type="text"
                    className="block-text-input quick-custom-msg-input"
                    placeholder="Type your reminder…"
                    value={quickCustomMessage}
                    onChange={(e) => setQuickCustomMessage(e.target.value)}
                  />

                  {/* Mic recording — hidden when MediaRecorder not available */}
                  {hasMic && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginTop: '0.5rem',
                      }}
                    >
                      <button
                        type="button"
                        onClick={isRecordingMsg ? stopRecording : () => void startRecording()}
                        aria-label={isRecordingMsg ? 'Stop recording' : 'Record audio message'}
                        style={{
                          background: isRecordingMsg ? '#e53e3e' : 'none',
                          color: isRecordingMsg ? '#fff' : 'inherit',
                          border: '1px solid currentColor',
                          borderRadius: '50%',
                          width: 28,
                          height: 28,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          flexShrink: 0,
                        }}
                      >
                        🎤
                      </button>
                      {isRecordingMsg && (
                        <span style={{ fontSize: '0.75rem', color: '#e53e3e' }}>Recording…</span>
                      )}
                    </div>
                  )}

                  {/* Recorded audio playback + discard */}
                  {quickCustomAudio && !isRecordingMsg && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginTop: '0.5rem',
                      }}
                    >
                      <audio
                        src={quickCustomAudio}
                        controls
                        style={{ height: 28, flex: 1, minWidth: 0 }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          discardRecording();
                          setQuickCustomAudio('');
                          settingsStore.set({ customMessageAudio: '' });
                        }}
                        aria-label="Discard recording"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          flexShrink: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              className="button button-primary quick-start-btn"
              onClick={() => setQuickStep('confirm')}
            >
              Next →
            </button>
          </>
        )}

        {/* ── Step 4: Confirm ─────────────────────────────────────────── */}
        {quickStep === 'confirm' && (
          <>
            <button
              type="button"
              className="quick-back-btn"
              onClick={() => setQuickStep('method')}
            >
              ← Back
            </button>
            <p className="quick-section-title">Ready to start?</p>
            <div className="quick-confirm-summary">
              <div className="quick-confirm-row">
                <span className="quick-confirm-label">Method</span>
                <span className="quick-confirm-value">{selectedMethodMeta.title}</span>
              </div>
              {quickMethod === 'duration' && (
                <div className="quick-confirm-row">
                  <span className="quick-confirm-label">Duration</span>
                  <span className="quick-confirm-value">{formatDuration(quickDuration)}</span>
                </div>
              )}
              {quickMethod === 'set-hours' && (
                <div className="quick-confirm-row">
                  <span className="quick-confirm-label">Window</span>
                  <span className="quick-confirm-value">{quickFromTime} – {quickUntilTime}</span>
                </div>
              )}
              {quickMethod === 'usage-limit' && (
                <div className="quick-confirm-row">
                  <span className="quick-confirm-label">Limit</span>
                  <span className="quick-confirm-value">{quickUsageLimit} min/day</span>
                </div>
              )}
              {quickMethod === 'launch-count' && (
                <div className="quick-confirm-row">
                  <span className="quick-confirm-label">Opens</span>
                  <span className="quick-confirm-value">{quickLaunchCount}/day</span>
                </div>
              )}
              <div className="quick-confirm-row">
                <span className="quick-confirm-label">Message</span>
                <span className="quick-confirm-value">{quickMessagePreview}</span>
              </div>
              <div className="quick-confirm-row">
                <span className="quick-confirm-label">Apps</span>
                <span className="quick-confirm-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`apps-badge${quickAllAppsSelected ? ' apps-badge--all' : ' apps-badge--custom'}`}>
                    {quickAppsBadge}
                  </span>
                  <button
                    type="button"
                    className="apps-expand-btn"
                    onClick={() => setQuickAppsExpanded((v) => !v)}
                    aria-expanded={quickAppsExpanded}
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    {quickAppsExpanded ? '▲' : '＋'}
                  </button>
                </span>
              </div>
              {quickAppsExpanded && (
                <div className="apps-list" style={{ margin: '0.25rem 0 0.5rem' }}>
                  {!quickAllAppsSelected && (
                    <button
                      type="button"
                      className="apps-select-all-btn"
                      onClick={() => setQuickSelectedApps([...COMMON_APPS])}
                    >
                      Select all
                    </button>
                  )}
                  {COMMON_APPS.map((app) => (
                    <label key={app} className="apps-list-row">
                      <input
                        type="checkbox"
                        checked={quickSelectedApps.includes(app)}
                        onChange={() => toggleQuickApp(app)}
                        className="apps-checkbox"
                      />
                      <span className="apps-list-name">{app}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              className="button button-primary quick-start-btn"
              onClick={handleStartNow}
            >
              Start now
            </button>
          </>
        )}
      </div>
    );
  }

  // ── Completed state ─────────────────────────────────────────────────────
  if (status === 'completed' && !overlayVisible) {
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    return (
      <div className="session-complete-card card">
        <div className="session-complete-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" fill="rgba(196,154,60,0.12)" stroke="#C49A3C" strokeWidth="1.5" />
            <path d="M13 20l5 5 9-10" stroke="#C49A3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="session-complete-title">Well done.</p>
        <p className="session-complete-body">
          You reclaimed {elapsedMinutes} {elapsedMinutes === 1 ? 'minute' : 'minutes'}.
        </p>
        {currentMessageText && (
          <p className="session-complete-quote">
            <em>"{currentMessageText}"</em>
          </p>
        )}

        {/* Journal prompt */}
        {!journalLogged && (
          <div className="journal-prompt">
            <p className="journal-prompt-label">What made you reach for your phone?</p>
            <div className="journal-trigger-grid">
              {JOURNAL_TRIGGERS.map((trigger) => (
                <button
                  key={trigger}
                  type="button"
                  className="journal-trigger-btn"
                  onClick={() => handleJournalEntry(trigger)}
                >
                  {trigger}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="journal-skip-link"
              onClick={reset}
            >
              Skip
            </button>
          </div>
        )}

        {journalLogged && (
          <button type="button" className="button button-primary" onClick={reset}>
            Start another
          </button>
        )}
      </div>
    );
  }

  // ── Running / paused state ──────────────────────────────────────────────
  const modeLabel = isStrict ? 'Focused block' : 'Soft reminders';

  return (
    <div className="session-view card">
      <div className="session-view-top">
        <p className="session-mode">{modeLabel}</p>
        <p
          className="session-timer"
          aria-live="polite"
          aria-label="Time remaining"
        >
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
      </div>

      <div className="session-controls">
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
        <button type="button" className="button button-ghost" onClick={reset}>
          Reset
        </button>
      </div>

      {/* Ambient sound row — shown when running */}
      {status === 'running' && (
        <div className="ambient-sound-row">
          <p className="ambient-sound-label">Ambient sound</p>
          <div className="ambient-sound-pills">
            {AMBIENT_SOUNDS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`ambient-pill${ambientSound === s.id ? ' ambient-pill--active' : ''}`}
                onClick={() => setAmbientSound(s.id as typeof ambientSound)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {currentMessageText && (
        <p className="session-last-reminder" aria-live="polite">
          <em>{currentMessageText}</em>
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
