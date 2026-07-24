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

// ── App categories ──────────────────────────────────────────────────────────
const APP_CATEGORIES = [
  {
    label: 'Social Media',
    apps: ['Instagram', 'TikTok', 'Twitter/X', 'Facebook', 'Snapchat', 'Reddit', 'LinkedIn'],
  },
  {
    label: 'Video & Music',
    apps: ['YouTube', 'Netflix', 'Spotify', 'Twitch'],
  },
  {
    label: 'Messaging',
    apps: ['WhatsApp', 'Telegram', 'iMessage', 'Discord'],
  },
  {
    label: 'Browser & Games',
    apps: ['Safari/Chrome', 'Games'],
  },
] as const;

// Flat list for backward compat
const COMMON_APPS = APP_CATEGORIES.flatMap((c) => c.apps);

// Apps with "high usage" data tag
const HIGH_USAGE_APPS = new Set(['Instagram', 'TikTok', 'YouTube', 'Twitter/X', 'Facebook']);
// Top 4 high-data apps
const TOP_HIGH_DATA = ['Instagram', 'TikTok', 'YouTube', 'Twitter/X'];

// Duration quick-pick pills
const DURATION_PILLS = [15, 30, 45, 60, 90, 120] as const;

type QuickStep = 'duration' | 'message' | 'confirm';

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

  // 3-step quick flow state
  const [quickStep, setQuickStep] = React.useState<QuickStep>('duration');
  const [quickDuration, setQuickDuration] = React.useState(30);
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

  const selectCategoryApps = (apps: readonly string[]) => {
    setQuickSelectedApps((prev) => {
      const appSet = new Set(apps);
      const allSelected = apps.every((a) => prev.includes(a));
      if (allSelected) {
        return prev.filter((a) => !appSet.has(a));
      }
      return [...new Set([...prev, ...apps])];
    });
  };

  const quickAllAppsSelected = quickSelectedApps.length === COMMON_APPS.length;

  const quickAppsBadge = quickAllAppsSelected
    ? 'All apps'
    : `${quickSelectedApps.length} app${quickSelectedApps.length === 1 ? '' : 's'}`;

  // Preview text: first 3 selected app names (when not all selected)
  const quickAppsPreviewText = React.useMemo(() => {
    if (quickAllAppsSelected || quickSelectedApps.length === 0) return null;
    const preview = quickSelectedApps.slice(0, 3).join(', ');
    const remainder = quickSelectedApps.length - 3;
    return remainder > 0 ? `${preview} +${remainder} more` : preview;
  }, [quickSelectedApps, quickAllAppsSelected]);

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
    settingsStore.set({ durationMinutes: quickDuration });
    if (quickMessageId === 'custom') {
      settingsStore.set({ selectedMessageId: 'custom', customMessage: quickCustomMessage });
    } else if (quickMessageId) {
      settingsStore.set({ selectedMessageId: quickMessageId, customMessage: '' });
    } else {
      settingsStore.set({ selectedMessageId: null, customMessage: '' });
    }
    // Reset step for next time
    setQuickStep('duration');
    start();
    toastStore.show('✓ Offline block started. Charito will check in with you.');
  };

  const settings = settingsStore.get();
  const totalSeconds = settings.durationMinutes * 60;
  const progress =
    totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;

  const preset = culturalPresets.find((p) => p.cultureCode === settings.cultureCode);

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

  // ── Idle state: 3-step flow ─────────────────────────────────────────────
  if (status === 'idle') {
    return (
      <div className="quick-session-card">
        {/* ── Step 1: Duration ──────────────────────────────────────────── */}
        {quickStep === 'duration' && (
          <>
            <p className="quick-section-label">Quick offline block</p>
            <p className="quick-section-title">How long?</p>
            <p className="quick-duration-big" style={{ fontFamily: 'var(--font-heading)', fontSize: '3rem', margin: '0.5rem 0' }}>
              {formatDuration(quickDuration)}
            </p>
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
              style={{ margin: '0.5rem 0 0.75rem' }}
            />
            {/* Duration pills */}
            <div className="quick-duration-pills">
              {DURATION_PILLS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`quick-duration-pill${quickDuration === d ? ' quick-duration-pill--active' : ''}`}
                  onClick={() => setQuickDuration(d)}
                >
                  {formatDuration(d)}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="button button-primary quick-start-btn"
              onClick={() => setQuickStep('message')}
              style={{ marginTop: '1rem' }}
            >
              Next →
            </button>
          </>
        )}

        {/* ── Step 2: Message ───────────────────────────────────────────── */}
        {quickStep === 'message' && (
          <>
            <button
              type="button"
              className="quick-back-btn"
              onClick={() => setQuickStep('duration')}
            >
              ← Back
            </button>
            <p className="quick-section-title">Your reminder</p>
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

                  {/* Mic recording */}
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

        {/* ── Step 3: Summary / Ready to start ─────────────────────────── */}
        {quickStep === 'confirm' && (
          <>
            <p className="quick-section-title">Ready to start</p>

            {/* Duration — large EB Garamond */}
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', fontWeight: 400, color: 'var(--text-h)', margin: '0.25rem 0 0.125rem', lineHeight: 1.1 }}>
              {formatDuration(quickDuration)}
            </p>

            {/* Message preview */}
            {quickMessagePreview !== 'Random' && (
              <p style={{ fontStyle: 'italic', color: 'var(--text-m)', fontSize: '0.9rem', margin: '0 0 0.75rem' }}>
                "{quickMessagePreview}"
              </p>
            )}

            {/* Apps section */}
            <div className="quick-confirm-summary">
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

              {/* Collapsed preview of selected apps */}
              {!quickAppsExpanded && quickAppsPreviewText && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-m)', margin: '0.15rem 0 0.25rem', paddingLeft: '0.25rem' }}>
                  {quickAppsPreviewText}
                </p>
              )}

              {/* Expanded app list grouped by category */}
              {quickAppsExpanded && (
                <div className="apps-list" style={{ margin: '0.25rem 0 0.5rem' }}>
                  {/* Recommended shortcuts */}
                  <div className="apps-recommended-row">
                    <button
                      type="button"
                      className="apps-recommended-btn"
                      onClick={() => setQuickSelectedApps([...APP_CATEGORIES[0].apps])}
                    >
                      ＋ Add social media block
                    </button>
                    <button
                      type="button"
                      className="apps-recommended-btn"
                      onClick={() => setQuickSelectedApps([...TOP_HIGH_DATA])}
                    >
                      ＋ Add high-usage block
                    </button>
                  </div>

                  {/* Select all */}
                  {!quickAllAppsSelected && (
                    <button
                      type="button"
                      className="apps-select-all-btn"
                      onClick={() => setQuickSelectedApps([...COMMON_APPS])}
                    >
                      Select all
                    </button>
                  )}

                  {/* Categorized list */}
                  {APP_CATEGORIES.map((cat) => (
                    <div key={cat.label} className="apps-category-group">
                      <div className="apps-category-header">
                        <span className="apps-category-label">{cat.label.toUpperCase()}</span>
                        <button
                          type="button"
                          className="apps-category-all-btn"
                          onClick={() => selectCategoryApps(cat.apps)}
                        >
                          All
                        </button>
                      </div>
                      {cat.apps.map((app) => (
                        <label key={app} className="apps-list-row">
                          <input
                            type="checkbox"
                            checked={quickSelectedApps.includes(app)}
                            onChange={() => toggleQuickApp(app)}
                            className="apps-checkbox"
                          />
                          <span className="apps-list-name">{app}</span>
                          {HIGH_USAGE_APPS.has(app) && (
                            <span className="apps-high-usage-tag">📱 High usage</span>
                          )}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Start now — full width sage green */}
            <button
              type="button"
              className="button button-primary quick-start-btn"
              onClick={handleStartNow}
              style={{ minHeight: 56, fontSize: '1.0625rem', fontWeight: 600, marginTop: '0.75rem' }}
            >
              Start now
            </button>

            {/* Back link */}
            <button
              type="button"
              className="quick-back-btn"
              onClick={() => setQuickStep('message')}
              style={{ marginTop: '0.5rem', alignSelf: 'center' }}
            >
              ← Back
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
