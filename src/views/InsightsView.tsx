import React from 'react';
import { journalStore } from '../state/journalStore';
import { useUsageStats } from '../hooks/useUsageStats';
import type { PerAppStat } from '../state/screenTimeStore';

interface WhyItem {
  title: string;
  body: string;
}

const WHY_ITEMS: WhyItem[] = [
  {
    title: '96 phone checks per day',
    body: 'The average person picks up their phone 96 times daily — once every 10 minutes. Each check fragments attention and trains the brain to expect constant stimulation.',
  },
  {
    title: 'Designed to be addictive',
    body: 'Social media apps use variable reward loops — the same psychological mechanism as slot machines. Unpredictable likes and notifications trigger dopamine spikes that keep you scrolling.',
  },
  {
    title: 'Blue light disrupts your sleep',
    body: 'Just 2 hours of evening screen time suppresses melatonin production, delaying sleep onset by up to 1.5 hours and reducing REM sleep quality — even if you fall asleep on time.',
  },
  {
    title: 'Doomscrolling raises cortisol',
    body: 'Consuming negative news content on your phone elevates cortisol (the stress hormone), increasing anxiety and making it harder to relax — especially before bed.',
  },
  {
    title: '23 minutes to regain deep focus',
    body: 'After each phone interruption, it takes an average of 23 minutes and 15 seconds to return to full concentration on a complex task. Even "quick" checks are costly.',
  },
  {
    title: 'Phantom vibration syndrome',
    body: 'Up to 90% of smartphone users report feeling their phone vibrate when it hasn\'t. This conditioned anxiety — always expecting a notification — keeps your nervous system on constant alert.',
  },
];

const HOW_TIPS: string[] = [
  'Put your phone in another room while sleeping.',
  'Enable grayscale mode — color is a major engagement hook.',
  'Set defined "phone hours" (e.g., 9 AM – 6 PM only).',
  'Replace scroll habit with a physical one: book, walk, or journal.',
  'Charge your phone outside the bedroom.',
  'Delete your 3 most-distracting apps for one week and notice the difference.',
  'Use Do Not Disturb during meals and focused work blocks.',
  'Turn off all non-essential notifications — only allow calls and messages.',
];

function formatWeekMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const TRIGGERS = ['Boredom', 'Stress', 'Habit', 'Notification'];

// ── Top Apps Card ──────────────────────────────────────────────────────────

interface TopAppsCardProps {
  onBlockApp: (app: PerAppStat) => void;
}

const TopAppsCard: React.FC<TopAppsCardProps> = ({ onBlockApp }) => {
  const { status, isAvailable, isLoading, topApps, refresh, openPermissionSettings } =
    useUsageStats(5);

  // Not on Android — show a neutral "Android only" note
  if (!isAvailable) {
    return (
      <section aria-label="App usage this week" style={{ marginBottom: '1.5rem' }}>
        <h2 className="insights-section-title">App usage this week</h2>
        <div className="insights-coming-soon">
          <span className="insights-coming-soon-icon" aria-hidden="true">📱</span>
          <p className="insights-coming-soon-title">Available on Android</p>
          <p className="insights-coming-soon-body">
            Install the Charito Android app to see real per-app screen time pulled
            directly from your device.
          </p>
        </div>
      </section>
    );
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <section aria-label="App usage this week" style={{ marginBottom: '1.5rem' }}>
        <h2 className="insights-section-title">App usage this week</h2>
        <div className="top-apps-loading">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="top-apps-skeleton-row" />
          ))}
        </div>
      </section>
    );
  }

  // Permission not yet granted
  if (status === 'permission-denied') {
    return (
      <section aria-label="App usage this week" style={{ marginBottom: '1.5rem' }}>
        <h2 className="insights-section-title">App usage this week</h2>
        <div className="insights-coming-soon">
          <span className="insights-coming-soon-icon" aria-hidden="true">🔒</span>
          <p className="insights-coming-soon-title">Usage Access needed</p>
          <p className="insights-coming-soon-body">
            Charito needs the "Usage Access" permission to read how long you use each
            app. Your data never leaves your device.
          </p>
          <button
            type="button"
            className="button button-primary"
            style={{ marginTop: '0.75rem', minHeight: '2.75rem' }}
            onClick={() => {
              openPermissionSettings();
              // Refresh when user comes back via page visibility event
              const handler = () => {
                if (document.visibilityState === 'visible') {
                  refresh();
                  document.removeEventListener('visibilitychange', handler);
                }
              };
              document.addEventListener('visibilitychange', handler);
            }}
          >
            Grant permission →
          </button>
        </div>
      </section>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <section aria-label="App usage this week" style={{ marginBottom: '1.5rem' }}>
        <h2 className="insights-section-title">App usage this week</h2>
        <p className="insights-coming-soon-body">
          Could not load usage data.{' '}
          <button type="button" className="insights-inline-link" onClick={refresh}>
            Try again
          </button>
        </p>
      </section>
    );
  }

  // No data yet (first open, empty store)
  if (topApps.length === 0) {
    return (
      <section aria-label="App usage this week" style={{ marginBottom: '1.5rem' }}>
        <h2 className="insights-section-title">App usage this week</h2>
        <p className="insights-coming-soon-body" style={{ margin: 0 }}>
          No usage data found.{' '}
          <button type="button" className="insights-inline-link" onClick={refresh}>
            Refresh
          </button>
        </p>
      </section>
    );
  }

  // The top app's minutes is used to scale the bars to 100%
  const maxMinutes = topApps[0].totalMinutes;

  return (
    <section aria-label="App usage this week" style={{ marginBottom: '1.5rem' }}>
      <div className="insights-section-header-row">
        <h2 className="insights-section-title" style={{ margin: 0 }}>App usage this week</h2>
        <button type="button" className="insights-inline-link" onClick={refresh}>
          Refresh
        </button>
      </div>
      <p className="insights-section-subtitle">Tap an app to create a block for it.</p>

      <div className="top-apps-list">
        {topApps.map((app) => {
          const pct = maxMinutes > 0 ? Math.round((app.totalMinutes / maxMinutes) * 100) : 0;
          return (
            <button
              key={app.packageName}
              type="button"
              className="top-apps-row"
              onClick={() => onBlockApp(app)}
              aria-label={`Block ${app.appName} — ${formatMinutes(app.totalMinutes)} this week`}
            >
              <span className="top-apps-name">{app.appName}</span>
              <div className="top-apps-bar-wrap">
                <div
                  className="top-apps-bar"
                  style={{ width: `${pct}%` }}
                  role="presentation"
                />
              </div>
              <span className="top-apps-time">{formatMinutes(app.totalMinutes)}</span>
            </button>
          );
        })}
      </div>

      {topApps.length > 0 && (
        <p className="top-apps-sync-note">
          Synced from your device &middot; last 7 days
        </p>
      )}
    </section>
  );
};

// ── Smart Recommendations ─────────────────────────────────────────────────

type BlockMethod = 'duration' | 'set-hours' | 'usage-limit' | 'launch-count';

interface Recommendation {
  app: PerAppStat;
  method: BlockMethod;
  reason: string;
  label: string;        // e.g. "Max 30 min/day"
}

function generateRecommendations(stats: PerAppStat[]): Recommendation[] {
  const SOCIAL = new Set(['Instagram', 'TikTok', 'Twitter / X', 'Facebook', 'Snapchat', 'Reddit']);
  const recs: Recommendation[] = [];

  for (const app of stats.slice(0, 6)) {
    const dailyMin = Math.round(app.totalMinutes / 7);

    if (app.launchCount >= 20) {
      // Opened very frequently → limit launches
      const cap = Math.max(5, Math.round(app.launchCount / 7 / 2));
      recs.push({
        app,
        method: 'launch-count',
        reason: `You opened ${app.appName} ~${Math.round(app.launchCount / 7)}× a day`,
        label: `Max ${cap} opens/day`,
      });
    } else if (SOCIAL.has(app.appName) && dailyMin >= 30) {
      // Heavy social media evening use → set hours block
      recs.push({
        app,
        method: 'set-hours',
        reason: `${app.appName} keeps you up — block it after 8 PM`,
        label: 'Block 8 PM – 7 AM',
      });
    } else if (dailyMin >= 45) {
      // High daily usage → cap it
      const cap = Math.max(15, Math.round(dailyMin * 0.6 / 15) * 15);
      recs.push({
        app,
        method: 'usage-limit',
        reason: `You average ${dailyMin} min/day on ${app.appName}`,
        label: `Max ${cap} min/day`,
      });
    } else if (dailyMin >= 20) {
      // Moderate use → focused duration block
      recs.push({
        app,
        method: 'duration',
        reason: `Take a 30-min break from ${app.appName}`,
        label: '30 min offline block',
      });
    }

    if (recs.length >= 3) break;
  }
  return recs;
}

const METHOD_EMOJI: Record<BlockMethod, string> = {
  'duration': '⏱',
  'set-hours': '🌙',
  'usage-limit': '📊',
  'launch-count': '🔢',
};

interface SmartRecsProps {
  stats: PerAppStat[];
  onAccept: (app: PerAppStat) => void;
}

const SmartRecommendations: React.FC<SmartRecsProps> = ({ stats, onAccept }) => {
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  const recs = generateRecommendations(stats).filter((r) => !dismissed.has(r.app.packageName));

  if (recs.length === 0) return null;

  return (
    <section aria-label="Smart block suggestions" style={{ marginBottom: '1.5rem' }}>
      <h2 className="insights-section-title">Smart suggestions</h2>
      <p className="insights-section-subtitle">Based on your usage this week.</p>
      <div className="smart-recs-list">
        {recs.map((rec) => (
          <div key={rec.app.packageName} className="smart-rec-card">
            <div className="smart-rec-top">
              <span className="smart-rec-emoji" aria-hidden="true">{METHOD_EMOJI[rec.method]}</span>
              <div className="smart-rec-text">
                <p className="smart-rec-app">{rec.app.appName}</p>
                <p className="smart-rec-reason">{rec.reason}</p>
              </div>
            </div>
            <div className="smart-rec-footer">
              <span className="smart-rec-label">{rec.label}</span>
              <div className="smart-rec-actions">
                <button
                  type="button"
                  className="button button-primary smart-rec-accept"
                  onClick={() => onAccept(rec.app)}
                >
                  Create block
                </button>
                <button
                  type="button"
                  className="smart-rec-skip"
                  onClick={() => setDismissed((prev) => new Set([...prev, rec.app.packageName]))}
                  aria-label="Skip suggestion"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const SmartRecsWrapper: React.FC<{ onNavigateToBlocks?: (app?: string) => void }> = ({ onNavigateToBlocks }) => {
  const { stats, status } = useUsageStats(8);
  if (status !== 'ready' || stats.length === 0) return null;
  return (
    <SmartRecommendations
      stats={stats}
      onAccept={(app) => onNavigateToBlocks?.(app.appName)}
    />
  );
};

interface InsightsViewProps {
  onNavigateToBlocks?: (prefilledApp?: string) => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ onNavigateToBlocks }) => {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  React.useEffect(() => {
    return journalStore.subscribe(() => {
      setJournalEntries(journalStore.get());
    });
  }, []);

  const [journalEntries, setJournalEntries] = React.useState(() => journalStore.get());

  const toggle = (i: number) => setOpenIndex((prev) => (prev === i ? null : i));

  // Weekly digest data
  const weekEntries = journalStore.getThisWeek();
  const blocksCompleted = weekEntries.length;
  const minutesReclaimed = weekEntries.reduce((acc, e) => acc + e.minutesReclaimed, 0);
  const triggerTally = journalStore.getWeeklyTriggerTally();
  const topTrigger = Object.entries(triggerTally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Trigger patterns this week
  const hasTriggerData = weekEntries.length > 0;

  // Monday banner
  const isMonday = new Date().getDay() === 1;

  void journalEntries;

  return (
    <div className="view">
      <header className="app-header">
        <p className="app-badge">Insights</p>
        <h1 className="app-title">Know your habits.</h1>
        <p className="app-subtitle">
          Science-backed reasons to disconnect and practical ways to do it.
        </p>
      </header>


      {/* ── Top Apps + Smart Recommendations ────────────────────────────── */}
      <TopAppsCard
        onBlockApp={(app) => onNavigateToBlocks?.(app.appName)}
      />
      <SmartRecsWrapper onNavigateToBlocks={onNavigateToBlocks} />

      {/* ── Trigger patterns ──────────────────────────────────────────────── */}
      <section aria-label="Trigger patterns" style={{ marginBottom: '1.5rem' }}>
        <h2 className="insights-section-title">Trigger patterns</h2>
        {hasTriggerData ? (
          <div className="insights-trigger-list">
            {TRIGGERS.map((trigger) => (
              <div key={trigger} className="insights-trigger-row">
                <span className="insights-trigger-name">{trigger}</span>
                <span className="insights-trigger-count">{triggerTally[trigger] ?? 0}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="insights-coming-soon-body" style={{ margin: 0 }}>
            Complete your first detox block to see patterns.
          </p>
        )}
      </section>

      {/* ── Weekly digest ──────────────────────────────────────────────────── */}
      <section aria-label="This week" style={{ marginBottom: '1.5rem' }}>
        <h2 className="insights-section-title">This week</h2>

        {isMonday && (
          <p className="insights-monday-banner">New week, fresh start. 🌱</p>
        )}

        <div className="insights-digest-grid">
          <div className="insights-digest-tile">
            <span className="insights-digest-number">{blocksCompleted}</span>
            <span className="insights-digest-label">Blocks completed</span>
          </div>
          <div className="insights-digest-tile">
            <span className="insights-digest-number">{formatWeekMinutes(minutesReclaimed)}</span>
            <span className="insights-digest-label">Minutes reclaimed</span>
          </div>
          <div className="insights-digest-tile">
            <span className="insights-digest-number">{topTrigger ?? '—'}</span>
            <span className="insights-digest-label">Top trigger</span>
          </div>
          <div className="insights-digest-tile">
            <span className="insights-digest-number" style={{ fontSize: '0.875rem' }}>Coming soon</span>
            <span className="insights-digest-label">Most used message</span>
          </div>
        </div>
      </section>

      {/* Section 1 — Why disconnect */}
      <section aria-label="Why disconnect">
        <h2 className="insights-section-title">Why disconnect?</h2>
        <div className="insights-accordion">
          {WHY_ITEMS.map((item, i) => (
            <div
              key={i}
              className={`insights-item${openIndex === i ? ' insights-item--open' : ''}`}
            >
              <button
                type="button"
                className="insights-item-trigger"
                onClick={() => toggle(i)}
                aria-expanded={openIndex === i}
              >
                <span className="insights-item-title">{item.title}</span>
                <svg
                  className="insights-chevron"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {openIndex === i && (
                <p className="insights-item-body">{item.body}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Section 2 — Ways to disconnect */}
      <section aria-label="Ways to disconnect">
        <h2 className="insights-section-title">Ways to disconnect</h2>
        <ol className="insights-tips">
          {HOW_TIPS.map((tip, i) => (
            <li key={i} className="insights-tip">
              <span className="insights-tip-num">{i + 1}</span>
              <span>{tip}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Section 3 — Your stats (coming soon) */}
      <section aria-label="Your stats">
        <h2 className="insights-section-title">Your stats</h2>
        <div className="insights-coming-soon">
          <span className="insights-coming-soon-icon" aria-hidden="true">📊</span>
          <p className="insights-coming-soon-title">Session history & streaks</p>
          <p className="insights-coming-soon-body">
            Coming in a future update — we'll track your detox sessions, build
            streaks, and show your progress over time.
          </p>
        </div>
      </section>
    </div>
  );
};
