import React from 'react';
import { screenTimeStore } from '../state/screenTimeStore';
import { journalStore } from '../state/journalStore';

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

const SCREEN_TIME_QUICK_VALUES = [30, 60, 90, 120, 180, 240] as const;

function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function formatWeekMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

const TRIGGERS = ['Boredom', 'Stress', 'Habit', 'Notification'];

export const InsightsView: React.FC = () => {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  const [screenTimeData, setScreenTimeData] = React.useState(() => screenTimeStore.get());
  const [journalEntries, setJournalEntries] = React.useState(() => journalStore.get());
  const [stepperValue, setStepperValue] = React.useState<number>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return screenTimeStore.get()[today] ?? 0;
  });

  React.useEffect(() => {
    return screenTimeStore.subscribe((data) => {
      setScreenTimeData(data);
      const today = new Date().toISOString().slice(0, 10);
      setStepperValue(data[today] ?? 0);
    });
  }, []);

  React.useEffect(() => {
    return journalStore.subscribe((entries) => {
      setJournalEntries(entries);
    });
  }, []);

  const toggle = (i: number) => setOpenIndex((prev) => (prev === i ? null : i));

  const handleStepperChange = (delta: number) => {
    const next = Math.max(0, Math.min(480, stepperValue + delta));
    setStepperValue(next);
    screenTimeStore.setToday(next);
  };

  const handleQuickSet = (minutes: number) => {
    setStepperValue(minutes);
    screenTimeStore.setToday(minutes);
  };

  // 7-day bar chart data
  const last7 = screenTimeStore.getLast7Days();
  const maxMinutes = Math.max(...last7.map((d) => d.minutes), 1);
  const todayISO = new Date().toISOString().slice(0, 10);

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

  // Void to suppress unused var lint
  void journalEntries;
  void screenTimeData;

  return (
    <div className="view">
      <header className="app-header">
        <p className="app-badge">Insights</p>
        <h1 className="app-title">Know your habits.</h1>
        <p className="app-subtitle">
          Science-backed reasons to disconnect and practical ways to do it.
        </p>
      </header>

      {/* ── Screen time self-report ──────────────────────────────────────── */}
      <section aria-label="Today's screen time" style={{ marginBottom: '1.5rem' }}>
        <p className="insights-screen-time-label">HOW LONG WAS I ON MY PHONE TODAY?</p>

        {/* Stepper */}
        <div className="insights-stepper-row">
          <button
            type="button"
            className="insights-stepper-btn"
            onClick={() => handleStepperChange(-30)}
            aria-label="Decrease by 30 minutes"
            disabled={stepperValue === 0}
          >
            −
          </button>
          <span className="insights-stepper-value">{formatMinutes(stepperValue)}</span>
          <button
            type="button"
            className="insights-stepper-btn"
            onClick={() => handleStepperChange(30)}
            aria-label="Increase by 30 minutes"
            disabled={stepperValue >= 480}
          >
            +
          </button>
        </div>

        {/* Quick-tap buttons */}
        <div className="insights-quick-btns">
          {SCREEN_TIME_QUICK_VALUES.map((v) => (
            <button
              key={v}
              type="button"
              className={`insights-quick-btn${stepperValue === v ? ' insights-quick-btn--active' : ''}`}
              onClick={() => handleQuickSet(v)}
            >
              {v === 240 ? '4h+' : formatMinutes(v).replace(' ', '')}
            </button>
          ))}
        </div>

        {/* 7-day bar chart */}
        <div className="insights-bar-chart" aria-label="Last 7 days screen time">
          {last7.map(({ date, minutes }) => {
            const isToday = date === todayISO;
            const heightPct = minutes === 0 ? 4 : Math.max(8, (minutes / maxMinutes) * 100);
            const dayLabel = new Date(date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' }).slice(0, 1);
            return (
              <div key={date} className="insights-bar-col">
                <div className="insights-bar-track">
                  <div
                    className={`insights-bar${isToday ? ' insights-bar--today' : ''}${minutes === 0 ? ' insights-bar--empty' : ''}`}
                    style={{ height: `${heightPct}%` }}
                    title={`${dayLabel}: ${formatMinutes(minutes)}`}
                  />
                </div>
                <span className="insights-bar-label">{dayLabel}</span>
              </div>
            );
          })}
        </div>
      </section>

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
