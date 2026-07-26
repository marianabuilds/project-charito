import React from 'react';
import { useSession } from '../state/SessionContext';
import { settingsStore } from '../state/settingsStore';
import { culturalPresets } from '../data/culturalPresets';
import { StrictOverlay } from './StrictOverlay';
import { journalStore } from '../state/journalStore';
import { speak } from '../services/audioEngine';
import { toastStore } from '../state/toastStore';
import { rewardsStore } from '../state/rewardsStore';
import { streakStore } from '../state/streakStore';
import { useInstalledApps, FALLBACK_APP_CATEGORIES } from '../hooks/useInstalledApps';
const JOURNAL_TRIGGERS = ['Boredom', 'Stress', 'Habit', 'Notification'] as const;

const AMBIENT_SOUNDS = [
  { id: 'off', label: 'Off', url: '' },
  { id: 'rain', label: 'Rain', url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_270f7d3f76.mp3' },
  { id: 'forest', label: 'Forest', url: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_dc39bde8e6.mp3' },
  { id: 'lofi', label: 'Lo-fi', url: 'https://cdn.pixabay.com/download/audio/2023/01/27/audio_8b378b3728.mp3' },
] as const;

// ── App categories (web fallback) ───────────────────────────────────────────
const APP_CATEGORIES = FALLBACK_APP_CATEGORIES;
const COMMON_APPS = APP_CATEGORIES.flatMap((c) => [...c.apps]);
const HIGH_USAGE_APPS = new Set(['Instagram', 'TikTok', 'YouTube', 'Twitter/X', 'Facebook']);
const TOP_HIGH_DATA = ['Instagram', 'TikTok', 'YouTube', 'Twitter/X'];
const POPULAR_PACKAGE_HINTS = [
  'com.instagram.android',
  'com.zhiliaoapp.musically',
  'com.google.android.youtube',
  'com.twitter.android',
  'com.facebook.katana',
];

// Duration quick-pick pills
const DURATION_PILLS = [15, 30, 45, 60, 90, 120] as const;

// ── Quick block method types ─────────────────────────────────────────────────
type QuickMethod = 'duration' | 'set-hours' | 'usage-limit' | 'launch-count' | null;

const QUICK_METHODS: {
  id: QuickMethod;
  title: string;
  description: string;
  example: string;
}[] = [
  { id: 'duration',     title: 'Duration',     description: 'Full offline block', example: 'e.g. 30 min screen-free after lunch' },
  { id: 'set-hours',    title: 'Set hours',     description: 'Gentle nudges',      example: 'e.g. No phone 9 PM – 7 AM' },
  { id: 'usage-limit',  title: 'Usage limit',   description: 'Cap screen time',    example: 'e.g. Max 60 min of social media/day' },
  { id: 'launch-count', title: 'Launch count',  description: 'Fewer opens',        example: 'e.g. Open Instagram max 5 times today' },
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

  // ── Single-screen quick block state ─────────────────────────────────────
  const [quickMethod, setQuickMethod] = React.useState<QuickMethod>(null);
  const [quickDuration, setQuickDuration] = React.useState(30);
  const [quickFromTime, setQuickFromTime] = React.useState('09:00');
  const [quickUntilTime, setQuickUntilTime] = React.useState('17:00');
  const [quickUsageLimit, setQuickUsageLimit] = React.useState(60);
  const [quickLaunchCount, setQuickLaunchCount] = React.useState(10);
  const [quickMessageId, setQuickMessageId] = React.useState('');
  const [previewingId, setPreviewingId] = React.useState<string | null>(null);
  const [quickSelectedApps, setQuickSelectedApps] = React.useState<string[]>([...COMMON_APPS]);
  const [quickAppsExpanded, setQuickAppsExpanded] = React.useState(false);
  const { apps: installedApps, isNativeList } = useInstalledApps();
  const seededNativeRef = React.useRef(false);

  React.useEffect(() => {
    if (!isNativeList || installedApps.length === 0 || seededNativeRef.current) return;
    seededNativeRef.current = true;
    const popular = installedApps
      .filter((a) => POPULAR_PACKAGE_HINTS.includes(a.packageName))
      .map((a) => a.packageName);
    setQuickSelectedApps(
      popular.length > 0 ? popular : installedApps.slice(0, 8).map((a) => a.packageName),
    );
  }, [isNativeList, installedApps]);

  const selectableIds = isNativeList
    ? installedApps.map((a) => a.packageName)
    : COMMON_APPS;

  const labelForId = (id: string): string => {
    if (isNativeList) {
      return installedApps.find((a) => a.packageName === id)?.appName ?? id;
    }
    return id;
  };

  const toggleQuickApp = (app: string) => {
    setQuickSelectedApps((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app],
    );
  };

  const selectCategoryApps = (apps: readonly string[]) => {
    setQuickSelectedApps((prev) => {
      const allSelected = apps.every((a) => prev.includes(a));
      if (allSelected) return prev.filter((a) => !apps.includes(a));
      return [...new Set([...prev, ...apps])];
    });
  };

  const quickAllAppsSelected =
    selectableIds.length > 0 && selectableIds.every((id) => quickSelectedApps.includes(id));
  const quickAppsBadge = quickAllAppsSelected
    ? 'All apps'
    : `${quickSelectedApps.length} app${quickSelectedApps.length === 1 ? '' : 's'}`;

  const quickAppsPreviewText = React.useMemo(() => {
    if (quickAllAppsSelected || quickSelectedApps.length === 0) return null;
    const names = quickSelectedApps.map(labelForId);
    const preview = names.slice(0, 3).join(', ');
    const remainder = names.length - 3;
    return remainder > 0 ? `${preview} +${remainder} more` : preview;
  }, [quickSelectedApps, quickAllAppsSelected, isNativeList, installedApps]);

  React.useEffect(() => {
    if (status === 'completed') {
      // Award rewards points for completing a block
      rewardsStore.recordBlockCompleted();
      if (isStrict) setOverlayVisible(true);
    }
  }, [status, isStrict]);

  // ── Celebration + streak affirmation on block completion ─────────────────
  const prevStatusRef = React.useRef<string>('idle');
  React.useEffect(() => {
    if (prevStatusRef.current !== 'completed' && status === 'completed') {
      const minutes = Math.max(1, Math.round(elapsedSeconds / 60));
      const minLabel = minutes === 1 ? 'minute' : 'minutes';

      // Weekly reclaim total (journal entries this week + current block)
      const weekMinutes = journalStore.getThisWeek().reduce((sum, e) => sum + e.minutesReclaimed, 0) + minutes;
      const weekHours = (weekMinutes / 60).toFixed(1);

      const celebrationMsg = weekMinutes > minutes
        ? `✨ Block complete! You just reclaimed ${minutes} ${minLabel}. You've reclaimed ${weekHours} hours this week.`
        : `✨ Block complete! You just reclaimed ${minutes} ${minLabel}.`;

      toastStore.show(celebrationMsg);

      // Streak affirmation — slight delay so toasts don't stack immediately
      const affirmation = streakStore.recordCompletion();
      if (affirmation) {
        window.setTimeout(() => toastStore.show(affirmation), 4200);
      }
    }
    prevStatusRef.current = status;
  }, [status, elapsedSeconds]);

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
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(sound.url);
    audio.loop = true;
    audioRef.current = audio;
    void audio.play().catch(() => {});
    return () => { audio.pause(); };
  }, [ambientSound]);

  React.useEffect(() => {
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };
  }, []);

  const handleDismissOverlay = () => { setOverlayVisible(false); reset(); };

  const handleJournalEntry = (trigger: string) => {
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    journalStore.add({ date: new Date().toISOString().slice(0, 10), trigger, minutesReclaimed: elapsedMinutes });
    setJournalLogged(true);
    reset();
  };

  const handlePreviewMessage = (id: string, text: string) => {
    if (previewingId === id) { window.speechSynthesis.cancel(); setPreviewingId(null); return; }
    window.speechSynthesis.cancel();
    const settings = settingsStore.get();
    setPreviewingId(id);
    void speak(text, settings.languageCode).then(() => setPreviewingId(null));
  };

  const handleStartNow = () => {
    if (quickMethod === null) return;
    settingsStore.set({ durationMinutes: quickDuration });
    settingsStore.set({ selectedMessageId: quickMessageId || null });
    // Pass selected apps (display names on web, package names on Android)
    start(
      quickSelectedApps.length > 0
        ? quickSelectedApps
        : selectableIds,
    );
    toastStore.show('✓ Offline block started. Charito will check in with you.');
  };

  const settings = settingsStore.get();
  const totalSeconds = settings.durationMinutes * 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;
  const preset = culturalPresets.find((p) => p.cultureCode === settings.cultureCode);

  // ── Idle state: single-screen block builder ─────────────────────────────
  if (status === 'idle') {
    const reminderAndApps = (
      <>
        <div className="quick-reminder-row quick-reminder-row--inline">
          <span className="quick-reminder-label">Reminder</span>
          <select
            className="select quick-message-select"
            value={quickMessageId}
            onChange={(e) => setQuickMessageId(e.target.value)}
          >
            <option value="">Random</option>
            {preset?.messages.map((msg) => (
              <option key={msg.id} value={msg.id}>
                {msg.text.length > 45 ? msg.text.slice(0, 42) + '…' : msg.text}
              </option>
            ))}
            {settings.customMessages.map((cm) => (
              <option key={cm.id} value={cm.id}>Custom: {cm.label}</option>
            ))}
          </select>
          {quickMessageId && (
            <button
              type="button"
              onClick={() => {
                const msg = preset?.messages.find((x) => x.id === quickMessageId)
                  ?? settings.customMessages.find((x) => x.id === quickMessageId);
                if (msg) handlePreviewMessage(quickMessageId, 'text' in msg ? msg.text : '');
              }}
              aria-label={previewingId === quickMessageId ? 'Stop preview' : 'Preview message'}
              className="quick-preview-btn"
            >
              {previewingId === quickMessageId ? '■' : '▶'}
            </button>
          )}
          <p className="quick-reminder-helper">
            Audio reminder — Charito will speak this when the block starts.
          </p>
        </div>

        <div className="quick-apps-row quick-apps-row--inline">
          <div className="apps-section-header">
            <span className="block-form-label" style={{ fontSize: '0.8125rem' }}>Apps</span>
            <span className={`apps-badge${quickAllAppsSelected ? ' apps-badge--all' : ' apps-badge--custom'}`}>
              {quickAppsBadge}
            </span>
          </div>
          <button
            type="button"
            className="apps-expand-btn"
            onClick={() => setQuickAppsExpanded((v) => !v)}
            aria-expanded={quickAppsExpanded}
          >
            {quickAppsExpanded ? '▲ Collapse' : '＋ Choose apps'}
          </button>
          {!quickAppsExpanded && quickAppsPreviewText && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-m)', margin: '0.15rem 0 0' }}>
              {quickAppsPreviewText}
            </p>
          )}
          {quickAppsExpanded && (
            <div className="apps-list" style={{ marginTop: '0.375rem' }}>
              {isNativeList ? (
                <>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-m)', margin: '0 0 0.5rem' }}>
                    Apps installed on this phone. Phone/Dialer is never blocked.
                  </p>
                  <div className="apps-recommended-row">
                    <button
                      type="button"
                      className="apps-recommended-btn"
                      onClick={() =>
                        setQuickSelectedApps(
                          installedApps
                            .filter((a) => POPULAR_PACKAGE_HINTS.includes(a.packageName))
                            .map((a) => a.packageName),
                        )
                      }
                    >
                      ＋ Popular apps
                    </button>
                    {!quickAllAppsSelected && (
                      <button
                        type="button"
                        className="apps-select-all-btn"
                        onClick={() => setQuickSelectedApps([...selectableIds])}
                      >
                        Select all
                      </button>
                    )}
                  </div>
                  <div className="apps-category-group">
                    {installedApps.map((app) => (
                      <label key={app.packageName} className="apps-list-row">
                        <input
                          type="checkbox"
                          checked={quickSelectedApps.includes(app.packageName)}
                          onChange={() => toggleQuickApp(app.packageName)}
                          className="apps-checkbox"
                        />
                        <span className="apps-list-name">{app.appName}</span>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="apps-recommended-row">
                    <button type="button" className="apps-recommended-btn"
                      onClick={() => setQuickSelectedApps([...APP_CATEGORIES[0].apps])}>
                      ＋ Social media block
                    </button>
                    <button type="button" className="apps-recommended-btn"
                      onClick={() => setQuickSelectedApps([...TOP_HIGH_DATA])}>
                      ＋ High-usage block
                    </button>
                  </div>
                  {!quickAllAppsSelected && (
                    <button type="button" className="apps-select-all-btn"
                      onClick={() => setQuickSelectedApps([...COMMON_APPS])}>
                      Select all
                    </button>
                  )}
                  {APP_CATEGORIES.map((cat) => (
                    <div key={cat.label} className="apps-category-group">
                      <div className="apps-category-header">
                        <span className="apps-category-label">{cat.label.toUpperCase()}</span>
                        <button type="button" className="apps-category-all-btn"
                          onClick={() => selectCategoryApps(cat.apps)}>
                          All
                        </button>
                      </div>
                      {cat.apps.map((app) => (
                        <label key={app} className="apps-list-row">
                          <input type="checkbox" checked={quickSelectedApps.includes(app)}
                            onChange={() => toggleQuickApp(app)} className="apps-checkbox" />
                          <span className="apps-list-name">{app}</span>
                          {HIGH_USAGE_APPS.has(app) && (
                            <span className="apps-high-usage-tag">📱 High usage</span>
                          )}
                        </label>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="quick-start-wrap">
          <button
            type="button"
            className="button button-primary quick-start-btn"
            onClick={handleStartNow}
            style={{ minHeight: 56, fontSize: '1.0625rem', fontWeight: 700 }}
          >
            Start offline block
          </button>
        </div>
      </>
    );

    return (
      <div className="quick-session-card">
        <p className="quick-section-label">Quick detox</p>

        {/* Vertically stacked methods — Reminder + Apps expand under the active one */}
        <div className="quick-method-grid">
          {QUICK_METHODS.map((m) => {
            const isActive = quickMethod === m.id;
            return (
              <div key={m.id} className={`quick-method-block${isActive ? ' quick-method-block--active' : ''}`}>
                <button
                  type="button"
                  className={`quick-method-card${isActive ? ' quick-method-card--active' : ''}`}
                  onClick={() => setQuickMethod(isActive ? null : m.id)}
                  aria-pressed={isActive}
                >
                  <span className="quick-method-card-title">{m.title}</span>
                  <span className="quick-method-card-desc">{m.description}</span>
                  {!isActive && (
                    <span className="quick-method-card-example">{m.example}</span>
                  )}

                  {isActive && (
                    <div
                      className="quick-method-card-config"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {m.id === 'duration' && (
                        <>
                          <p className="quick-card-value">{formatDuration(quickDuration)}</p>
                          <input
                            type="range"
                            className="quick-range"
                            min={5} max={120} step={5}
                            value={quickDuration}
                            onChange={(e) => setQuickDuration(Number(e.target.value))}
                            aria-label="Session duration"
                          />
                          <div className="quick-duration-pills">
                            {DURATION_PILLS.map((d) => (
                              <button
                                key={d}
                                type="button"
                                className={`quick-duration-pill${quickDuration === d ? ' quick-duration-pill--active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); setQuickDuration(d); }}
                              >
                                {formatDuration(d)}
                              </button>
                            ))}
                          </div>
                        </>
                      )}

                      {m.id === 'set-hours' && (
                        <div className="quick-time-row">
                          <span className="quick-time-label">From</span>
                          <input
                            type="time"
                            className="block-time-input"
                            value={quickFromTime}
                            onChange={(e) => setQuickFromTime(e.target.value)}
                            aria-label="Start time"
                          />
                          <span className="quick-time-label">to</span>
                          <input
                            type="time"
                            className="block-time-input"
                            value={quickUntilTime}
                            onChange={(e) => setQuickUntilTime(e.target.value)}
                            aria-label="End time"
                          />
                        </div>
                      )}

                      {m.id === 'usage-limit' && (
                        <>
                          <p className="quick-card-value">{quickUsageLimit} min/day</p>
                          <input
                            type="range"
                            className="quick-range"
                            min={15} max={240} step={15}
                            value={quickUsageLimit}
                            onChange={(e) => setQuickUsageLimit(Number(e.target.value))}
                            aria-label="Max minutes per day"
                          />
                        </>
                      )}

                      {m.id === 'launch-count' && (
                        <div className="quick-stepper">
                          <button
                            type="button"
                            className="quick-stepper-btn"
                            onClick={(e) => { e.stopPropagation(); setQuickLaunchCount((v) => Math.max(1, v - 1)); }}
                            aria-label="Decrease"
                          >−</button>
                          <span className="quick-card-value">{quickLaunchCount}×/day</span>
                          <button
                            type="button"
                            className="quick-stepper-btn"
                            onClick={(e) => { e.stopPropagation(); setQuickLaunchCount((v) => Math.min(50, v + 1)); }}
                            aria-label="Increase"
                          >+</button>
                        </div>
                      )}
                    </div>
                  )}
                </button>

                {isActive && (
                  <div className="quick-method-inline-panel">
                    {reminderAndApps}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Completed state ─────────────────────────────────────────────────────
  if (status === 'completed' && !overlayVisible) {
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const weekMinutes = journalStore.getThisWeek().reduce((sum, e) => sum + e.minutesReclaimed, 0) + elapsedMinutes;
    const weekHours = (weekMinutes / 60).toFixed(1);
    const hasWeeklyData = weekMinutes > elapsedMinutes;

    return (
      <div className="session-complete-card card">
        <div className="session-complete-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" fill="rgba(90,122,90,0.12)" stroke="var(--accent)" strokeWidth="1.5" />
            <path d="M13 20l5 5 9-10" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="session-complete-title">✨ Block complete.</p>
        <p className="session-complete-body">
          You just reclaimed {elapsedMinutes} {elapsedMinutes === 1 ? 'minute' : 'minutes'}.
          {hasWeeklyData && (
            <> You&rsquo;ve reclaimed <strong>{weekHours} hours</strong> this week.</>
          )}
        </p>
        {currentMessageText && (
          <p className="session-complete-quote"><em>"{currentMessageText}"</em></p>
        )}

        {!journalLogged && (
          <div className="journal-prompt">
            <p className="journal-prompt-label">What made you reach for your phone?</p>
            <div className="journal-trigger-grid">
              {JOURNAL_TRIGGERS.map((trigger) => (
                <button key={trigger} type="button" className="journal-trigger-btn"
                  onClick={() => handleJournalEntry(trigger)}>
                  {trigger}
                </button>
              ))}
            </div>
            <button type="button" className="journal-skip-link" onClick={reset}>Skip</button>
          </div>
        )}
        {journalLogged && (
          <button type="button" className="button button-primary" onClick={reset}>Start another</button>
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
        <p className="session-timer" aria-live="polite" aria-label="Time remaining">
          {formatTime(remainingSeconds)}
        </p>
        <div className="session-progress" role="progressbar"
          aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div className="session-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="session-controls">
        {status === 'running' && (
          <button type="button" className="button button-secondary" onClick={pause}>Pause</button>
        )}
        {status === 'paused' && (
          <button type="button" className="button button-primary" onClick={resume}>Resume</button>
        )}
        <button type="button" className="button button-ghost" onClick={reset}>Reset</button>
      </div>

      {status === 'running' && (
        <div className="ambient-sound-row">
          <p className="ambient-sound-label">Ambient sound</p>
          <div className="ambient-sound-pills">
            {AMBIENT_SOUNDS.map((s) => (
              <button key={s.id} type="button"
                className={`ambient-pill${ambientSound === s.id ? ' ambient-pill--active' : ''}`}
                onClick={() => setAmbientSound(s.id as typeof ambientSound)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {currentMessageText && (
        <p className="session-last-reminder" aria-live="polite"><em>{currentMessageText}</em></p>
      )}

      <StrictOverlay visible={overlayVisible} message={currentMessageText} onDismiss={handleDismissOverlay} />
    </div>
  );
};
