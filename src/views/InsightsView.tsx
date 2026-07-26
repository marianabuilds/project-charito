import React from 'react';
import { journalStore } from '../state/journalStore';
import { generateRecommendations, formatHour, formatPill } from '../utils/recommendations';
import type { Recommendation, RecType } from '../utils/recommendations';
import type { DetoxBlock } from '../state/blockStore';

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

// ─── Method badge helpers ─────────────────────────────────────────────────────

const METHOD_BADGE: Record<RecType, { icon: string; label: string }> = {
  'duration':     { icon: '⏱', label: 'Duration' },
  'set-hours':    { icon: '🕐', label: 'Set hours' },
  'usage-limit':  { icon: '📊', label: 'Usage limit' },
  'launch-count': { icon: '🚀', label: 'Launch count' },
};

function getMethodBadgeText(type: RecType, value: number): string {
  const { icon, label } = METHOD_BADGE[type];
  if (type === 'set-hours') {
    return `${icon} ${label}  ·  ${formatHour(value)} – 7 AM`;
  }
  return `${icon} ${label}`;
}

// ─── Prefill builder ─────────────────────────────────────────────────────────

function recToPrefill(rec: Recommendation, value: number): Partial<DetoxBlock> {
  const base: Partial<DetoxBlock> = {
    blockingMethod: rec.type,
    selectedApps: [rec.appName],
    label: rec.appName,
  };
  switch (rec.type) {
    case 'usage-limit':
      return { ...base, usageLimitMinutes: value };
    case 'set-hours':
      return {
        ...base,
        setHoursStart: `${String(value).padStart(2, '0')}:00`,
        setHoursEnd: '07:00',
      };
    case 'launch-count':
      return { ...base, launchCountMax: value };
    case 'duration':
    default:
      return { ...base, durationMinutes: value };
  }
}

// ─── Smart Rec Card ──────────────────────────────────────────────────────────

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
        <span className="smart-rec-method-badge">
          {getMethodBadgeText(rec.type, value)}
        </span>
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
  onNavigateToBlocks: (prefill?: Partial<DetoxBlock>) => void;
}

const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({ onNavigateToBlocks }) => {
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  const recs = React.useMemo(() => generateRecommendations(), []);

  const visible = recs.filter((r) => !dismissed.has(r.id));
  if (visible.length === 0) return null;

  const handleSkip = (id: string) => setDismissed((prev) => new Set([...prev, id]));
  const handleAccept = (rec: Recommendation, value: number) =>
    onNavigateToBlocks(recToPrefill(rec, value));

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
  onNavigateToBlocks: (prefill?: Partial<DetoxBlock>) => void;
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
