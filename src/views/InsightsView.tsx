import React from 'react';
import { journalStore } from '../state/journalStore';
import { settingsStore } from '../state/settingsStore';

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

const TRIGGERS = ['Boredom', 'Stress', 'Habit', 'Notification'];

// ─── Smart Recommendations ──────────────────────────────────────────────────

interface MockAppStat {
  name: string;
  category: 'social' | 'productivity' | 'entertainment' | 'other';
  dailyAvgMinutes: number;
  launchCount: number;
  lastUsedHour: number; // 0–23
}

const MOCK_APP_STATS: MockAppStat[] = [
  { name: 'Instagram',  category: 'social',         dailyAvgMinutes: 87, launchCount: 23, lastUsedHour: 23 },
  { name: 'TikTok',     category: 'social',         dailyAvgMinutes: 72, launchCount: 18, lastUsedHour: 22 },
  { name: 'YouTube',    category: 'entertainment',  dailyAvgMinutes: 45, launchCount: 8,  lastUsedHour: 21 },
  { name: 'Gmail',      category: 'productivity',   dailyAvgMinutes: 30, launchCount: 15, lastUsedHour: 18 },
  { name: 'Twitter/X',  category: 'social',         dailyAvgMinutes: 28, launchCount: 12, lastUsedHour: 22 },
  { name: 'Notion',     category: 'productivity',   dailyAvgMinutes: 22, launchCount: 6,  lastUsedHour: 16 },
];

type RecType = 'usage-limit' | 'set-hours' | 'launch-count' | 'duration';

interface Recommendation {
  id: string;
  appName: string;
  reason: string;
  type: RecType;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  dailyAvgMinutes: number;
}

function generateRecommendations(): Recommendation[] {
  const intensity = settingsStore.get().detoxIntensity ?? 'moderate';

  const SOCIAL_MULT  = 1.3;
  const NIGHT_OWL_MULT = 1.2;

  type ScoredApp = MockAppStat & { score: number; nightOwl: boolean };

  const scored: ScoredApp[] = MOCK_APP_STATS.map((app) => {
    const catMult  = app.category === 'social' ? SOCIAL_MULT : 1.0;
    const nightOwl = app.lastUsedHour >= 22;
    const nightMult = nightOwl ? NIGHT_OWL_MULT : 1.0;
    const score = (app.dailyAvgMinutes + app.launchCount * 2) * catMult * nightMult;
    return { ...app, score, nightOwl };
  });

  scored.sort((a, b) => b.score - a.score);

  const topByTime = [...MOCK_APP_STATS].sort((a, b) => b.dailyAvgMinutes - a.dailyAvgMinutes)[0];

  const timeThreshold   = intensity === 'deep' ? 20  : intensity === 'light' ? 60  : 40;
  const launchThreshold = intensity === 'deep' ? 5   : intensity === 'light' ? 20  : 10;
  const maxRecs         = intensity === 'deep' ? 5   : intensity === 'light' ? 2   : 4;

  const recs: Recommendation[] = [];

  for (const app of scored) {
    if (recs.length >= maxRecs) break;

    const qualifies =
      app.dailyAvgMinutes > timeThreshold ||
      app.launchCount > launchThreshold ||
      app.name === topByTime.name;
    if (!qualifies) continue;

    let type: RecType;
    let defaultValue: number;
    let min: number;
    let max: number;
    let step: number;
    let reason: string;

    if (intensity === 'light') {
      // Gentle: duration blocks only, no set-hours
      type = 'duration';
      defaultValue = 30;
      min = 15;
      max = 60;
      step = 15;
      reason = `You use ${app.name} ~${app.dailyAvgMinutes} min/day. A gentle cap can help.`;
    } else if (intensity === 'deep') {
      // Strict: prefer usage-limit and set-hours, lower thresholds
      if (app.nightOwl && !recs.find((r) => r.type === 'set-hours')) {
        type = 'set-hours';
        defaultValue = 20; // 8 PM
        min = 18;
        max = 23;
        step = 1;
        reason = `${app.name} last used at ${app.lastUsedHour}:00 — flag as evening risk.`;
      } else {
        type = 'usage-limit';
        const capBase = Math.round((app.dailyAvgMinutes * 0.5) / 15) * 15;
        defaultValue = Math.max(15, capBase);
        min = Math.max(15, Math.round((app.dailyAvgMinutes * 0.25) / 15) * 15);
        max = app.dailyAvgMinutes;
        step = 15;
        reason = `Cut ${app.name} from ${app.dailyAvgMinutes} min/day — strict mode.`;
      }
    } else {
      // Moderate: mix based on pattern
      if (app.nightOwl && !recs.find((r) => r.type === 'set-hours')) {
        type = 'set-hours';
        defaultValue = 20;
        min = 18;
        max = 23;
        step = 1;
        reason = `${app.name} is frequently used after 10 PM.`;
      } else if (app.launchCount > launchThreshold && !recs.find((r) => r.type === 'launch-count')) {
        type = 'launch-count';
        defaultValue = Math.max(5, Math.round(app.launchCount * 0.6));
        min = 2;
        max = app.launchCount;
        step = 1;
        reason = `${app.name} opened ${app.launchCount}× today — limit daily opens.`;
      } else {
        type = 'usage-limit';
        const capBase = Math.round((app.dailyAvgMinutes * 0.6) / 15) * 15;
        defaultValue = Math.max(15, capBase);
        min = Math.max(15, Math.round((app.dailyAvgMinutes / 4) / 15) * 15);
        max = app.dailyAvgMinutes;
        step = 15;
        reason = `${app.name} is your #${recs.length + 1} time drain at ${app.dailyAvgMinutes} min/day.`;
      }
    }

    recs.push({
      id: `${app.name}-${type}`,
      appName: app.name,
      reason,
      type,
      defaultValue,
      min,
      max,
      step,
      dailyAvgMinutes: app.dailyAvgMinutes,
    });
  }

  return recs;
}

// ─── Smart Rec Card ──────────────────────────────────────────────────────────

function formatHour(h: number): string {
  if (h === 0)  return '12 AM';
  if (h === 12) return '12 PM';
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

function formatPill(type: RecType, value: number): string {
  switch (type) {
    case 'usage-limit':  return `${value} min/day max`;
    case 'set-hours':    return `No use after ${formatHour(value)}`;
    case 'launch-count': return `Max ${value} opens/day`;
    case 'duration':     return value >= 60 ? '1 hr focus block' : `${value} min focus block`;
  }
}

interface SmartRecCardProps {
  rec: Recommendation;
  onAccept: (rec: Recommendation, value: number) => void;
  onSkip: (id: string) => void;
}

const SmartRecCard: React.FC<SmartRecCardProps> = ({ rec, onAccept, onSkip }) => {
  const [value, setValue] = React.useState(rec.defaultValue);

  return (
    <div className="smart-rec-card">
      <div className="smart-rec-header">
        <span className="smart-rec-app">{rec.appName}</span>
        <span className="smart-rec-reason">{rec.reason}</span>
      </div>

      {/* Inline control */}
      <div className="smart-rec-control">
        {rec.type === 'usage-limit' && (
          <>
            <input
              type="range"
              className="quick-range"
              min={rec.min}
              max={rec.max}
              step={rec.step}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
            />
            <div className="smart-rec-range-labels">
              <span>{rec.min} min</span>
              <span>{rec.max} min</span>
            </div>
          </>
        )}

        {rec.type === 'set-hours' && (
          <div className="smart-rec-time-row">
            <span className="smart-rec-time-label">No use after</span>
            <select
              className="smart-rec-select"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
            >
              {[18, 19, 20, 21, 22, 23].map((h) => (
                <option key={h} value={h}>{formatHour(h)}</option>
              ))}
            </select>
          </div>
        )}

        {rec.type === 'launch-count' && (
          <div className="smart-rec-stepper">
            <button
              type="button"
              className="quick-stepper-btn"
              onClick={() => setValue((v) => Math.max(rec.min, v - 1))}
              disabled={value <= rec.min}
            >
              −
            </button>
            <span className="smart-rec-stepper-value">{value}</span>
            <button
              type="button"
              className="quick-stepper-btn"
              onClick={() => setValue((v) => Math.min(rec.max, v + 1))}
              disabled={value >= rec.max}
            >
              +
            </button>
          </div>
        )}

        {rec.type === 'duration' && (
          <div className="quick-duration-pills">
            {[15, 30, 45, 60].map((d) => (
              <button
                key={d}
                type="button"
                className={`quick-duration-pill${value === d ? ' quick-duration-pill--active' : ''}`}
                onClick={() => setValue(d)}
              >
                {d === 60 ? '1 hr' : `${d} min`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Live selection pill */}
      <div className="smart-rec-selection-pill">{formatPill(rec.type, value)}</div>

      {/* Actions */}
      <div className="smart-rec-actions">
        <button
          type="button"
          className="button button-primary smart-rec-accept-btn"
          onClick={() => onAccept(rec, value)}
        >
          Create block →
        </button>
        <button
          type="button"
          className="smart-rec-skip"
          onClick={() => onSkip(rec.id)}
        >
          Skip
        </button>
      </div>
    </div>
  );
};

// ─── SmartRecommendations section ───────────────────────────────────────────

interface SmartRecommendationsProps {
  onNavigateToBlocks: () => void;
}

const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({ onNavigateToBlocks }) => {
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  const recs = React.useMemo(() => generateRecommendations(), []);

  const visible = recs.filter((r) => !dismissed.has(r.id));
  if (visible.length === 0) return null;

  const handleSkip = (id: string) => setDismissed((prev) => new Set([...prev, id]));
  const handleAccept = (_rec: Recommendation, _value: number) => onNavigateToBlocks();

  return (
    <section aria-label="Smart block suggestions">
      <h2 className="insights-section-title">Smart suggestions</h2>
      <div className="smart-rec-list">
        {visible.map((rec) => (
          <SmartRecCard
            key={rec.id}
            rec={rec}
            onAccept={handleAccept}
            onSkip={handleSkip}
          />
        ))}
      </div>
    </section>
  );
};

// ─── InsightsView ────────────────────────────────────────────────────────────

interface InsightsViewProps {
  onNavigateToBlocks: () => void;
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

  const hasTriggerData = weekEntries.length > 0;
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

      {/* ── Smart suggestions ─────────────────────────────────────────────── */}
      <SmartRecommendations onNavigateToBlocks={onNavigateToBlocks} />

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
