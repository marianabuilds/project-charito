import React from 'react';
import { useSession } from '../state/SessionContext';
import { settingsStore } from '../state/settingsStore';
import { culturalPresets } from '../data/culturalPresets';
import { StrictOverlay } from './StrictOverlay';
import { ActiveBlockOverlay, ActiveBlockBanner } from './ActiveBlockOverlay';
import { journalStore } from '../state/journalStore';
import { speak } from '../services/audioEngine';
import { toastStore } from '../state/toastStore';
import { rewardsStore } from '../state/rewardsStore';
import { streakStore } from '../state/streakStore';
import { APP_PACKAGE_MAP, formatExceptionsSummary } from '../utils/appPackages';
import { FloatingCta } from './FloatingCta';
import { useInstalledApps } from '../hooks/useInstalledApps';

const JOURNAL_TRIGGERS = ['Boredom', 'Stress', 'Habit', 'Notification'] as const;

const AMBIENT_SOUNDS = [
  { id: 'off', label: 'Off', url: '' },
  { id: 'rain', label: 'Rain', url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_270f7d3f76.mp3' },
  { id: 'forest', label: 'Forest', url: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_dc39bde8e6.mp3' },
  { id: 'lofi', label: 'Lo-fi', url: 'https://cdn.pixabay.com/download/audio/2023/01/27/audio_8b378b3728.mp3' },
] as const;

const DURATION_PILLS = [15, 30, 45, 60, 90, 120] as const;

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

interface SessionViewProps {
  onNavigateToSettings?: () => void;
}

export const SessionView: React.FC<SessionViewProps> = ({ onNavigateToSettings }) => {
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
  /** When true, full-screen session UI is hidden so user can browse Home. Default true — never trap in Charito. */
  const [activeUiDismissed, setActiveUiDismissed] = React.useState(true);

  const [quickMethod, setQuickMethod] = React.useState<QuickMethod>(null);
  const [quickDuration, setQuickDuration] = React.useState(30);
  const [quickFromTime, setQuickFromTime] = React.useState('09:00');
  const [quickUntilTime, setQuickUntilTime] = React.useState('17:00');
  const [quickUsageLimit, setQuickUsageLimit] = React.useState(60);
  const [quickLaunchCount, setQuickLaunchCount] = React.useState(10);
  const [quickMessageId, setQuickMessageId] = React.useState('');
  const [previewingId, setPreviewingId] = React.useState<string | null>(null);
  const [appsExpanded, setAppsExpanded] = React.useState(false);
  const { apps: installedApps, isNativeList } = useInstalledApps();

  const [blockExceptions, setBlockExceptions] = React.useState<string[]>(
    () => settingsStore.get().blockExceptions ?? ['Phone', 'Messages'],
  );
  React.useEffect(() => {
    return settingsStore.subscribe((s) => {
      setBlockExceptions(s.blockExceptions ?? ['Phone', 'Messages']);
    });
  }, []);

  const exceptionNames = Array.from(new Set(['Phone', ...blockExceptions]));
  const blockedPreviewNames = React.useMemo(() => {
    if (isNativeList && installedApps.length > 0) {
      return installedApps
        .map((a) => a.appName)
        .filter((name) => !exceptionNames.some(
          (ex) => name.toLowerCase() === ex.toLowerCase(),
        ));
    }
    return Object.keys(APP_PACKAGE_MAP).filter(
      (name) => !exceptionNames.includes(name) && name !== 'Phone' && name !== 'Messages',
    );
  }, [isNativeList, installedApps, exceptionNames]);

  React.useEffect(() => {
    if (status === 'completed') {
      rewardsStore.recordBlockCompleted();
      if (isStrict) setOverlayVisible(true);
    }
  }, [status, isStrict]);

  React.useEffect(() => {
    // Reset when the session ends; never auto-open full-screen on start.
    if (status === 'idle') setActiveUiDismissed(true);
  }, [status]);

  const prevStatusRef = React.useRef<string>('idle');
  React.useEffect(() => {
    if (prevStatusRef.current !== 'completed' && status === 'completed') {
      const minutes = Math.max(1, Math.round(elapsedSeconds / 60));
      const minLabel = minutes === 1 ? 'minute' : 'minutes';

      const weekMinutes = journalStore.getThisWeek().reduce((sum, e) => sum + e.minutesReclaimed, 0) + minutes;
      const weekHours = (weekMinutes / 60).toFixed(1);

      const celebrationMsg = weekMinutes > minutes
        ? `✨ Block complete! You just reclaimed ${minutes} ${minLabel}. You've reclaimed ${weekHours} hours this week.`
        : `✨ Block complete! You just reclaimed ${minutes} ${minLabel}.`;

      toastStore.show(celebrationMsg);

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
    const s = settingsStore.get();
    setPreviewingId(id);
    void speak(text, s.languageCode).then(() => setPreviewingId(null));
  };

  const handleStartNow = () => {
    if (quickMethod === null) return;
    settingsStore.set({ durationMinutes: quickDuration });
    settingsStore.set({ selectedMessageId: quickMessageId || null });
    start([]);
    toastStore.show(
      `✓ Block started — ${formatExceptionsSummary(blockExceptions).toLowerCase()}.`,
    );
  };

  const settings = settingsStore.get();
  const totalSeconds = settings.durationMinutes * 60;
  const preset = culturalPresets.find((p) => p.cultureCode === settings.cultureCode);

  // ── Active block: full-screen (or compact banner if dismissed) ──────────
  if (status === 'running' || status === 'paused') {
    if (!activeUiDismissed) {
      return (
        <ActiveBlockOverlay
          remainingSeconds={remainingSeconds}
          totalSeconds={totalSeconds}
          message={currentMessageText}
          isPaused={status === 'paused'}
          onPause={pause}
          onResume={resume}
          onEndBlock={reset}
          onBackToHome={() => setActiveUiDismissed(true)}
        />
      );
    }

    return (
      <div className="session-active-compact">
        <ActiveBlockBanner
          remainingSeconds={remainingSeconds}
          onOpen={() => setActiveUiDismissed(false)}
          onEndBlock={reset}
        />
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
      </div>
    );
  }

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
            <span className="apps-badge apps-badge--all">All apps</span>
          </div>
          <p className="quick-reminder-helper" style={{ marginTop: '0.35rem' }}>
            Blocks all apps. Exceptions from Settings stay available.
          </p>
          <button
            type="button"
            className="apps-expand-btn"
            onClick={() => setAppsExpanded((v) => !v)}
            aria-expanded={appsExpanded}
          >
            {appsExpanded ? '▲ Collapse' : '＋ All apps'}
          </button>
          {appsExpanded && (
            <div className="apps-list" style={{ marginTop: '0.5rem' }}>
              <p className="apps-category-label" style={{ marginBottom: '0.35rem' }}>
                Exceptions (stay on)
              </p>
              <ul className="quick-exceptions-list">
                {exceptionNames.map((name) => (
                  <li key={name} className="quick-exception-chip">
                    {name}
                    <span className="quick-exception-stay">stays on</span>
                  </li>
                ))}
              </ul>
              {onNavigateToSettings && (
                <button
                  type="button"
                  className="apps-select-all-btn"
                  style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}
                  onClick={onNavigateToSettings}
                >
                  Change exceptions in Settings →
                </button>
              )}
              <p className="apps-category-label" style={{ margin: '0.5rem 0 0.35rem' }}>
                Blocked
              </p>
              <ul className="quick-exceptions-list">
                {blockedPreviewNames.slice(0, 24).map((name) => (
                  <li key={name} className="quick-exception-chip quick-exception-chip--blocked">
                    {name}
                    <span className="quick-exception-blocked">blocked</span>
                  </li>
                ))}
              </ul>
              {blockedPreviewNames.length > 24 && (
                <p className="quick-reminder-helper" style={{ marginTop: '0.35rem' }}>
                  +{blockedPreviewNames.length - 24} more
                </p>
              )}
            </div>
          )}
        </div>
      </>
    );

    return (
      <div className="quick-session-card">
        <p className="quick-section-label">Quick detox</p>

        <div className="quick-method-grid">
          {QUICK_METHODS.map((m) => {
            const isActive = quickMethod === m.id;
            if (quickMethod !== null && !isActive) return null;
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
        {quickMethod !== null && (
          <FloatingCta
            label="Start offline block"
            onClick={handleStartNow}
            ariaLabel="Start offline block"
          />
        )}
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
          <p className="session-complete-quote"><em>&ldquo;{currentMessageText}&rdquo;</em></p>
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
          <>
            <div className="floating-cta-spacer" aria-hidden="true" />
            <FloatingCta label="Start another" onClick={reset} ariaLabel="Start another block" />
          </>
        )}
      </div>
    );
  }

  return (
    <StrictOverlay visible={overlayVisible} message={currentMessageText} onDismiss={handleDismissOverlay} />
  );
};
