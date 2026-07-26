import React from 'react';
import { WeekStrip } from '../components/WeekStrip';
import { SessionView } from '../components/SessionView';
import { LeafIcon } from '../components/LeafIcon';
import { useDetoxBlocks } from '../hooks/useDetoxBlocks';
import { useSession } from '../state/SessionContext';
import { culturalPresets } from '../data/culturalPresets';
import { settingsStore } from '../state/settingsStore';
import { speak } from '../services/audioEngine';
import { toastStore } from '../state/toastStore';
import type { DetoxBlock } from '../state/blockStore';

// ── Smart Suggestions ─────────────────────────────────────────────────────

interface Recommendation {
  id: string;
  emoji: string;
  title: string;
  reason: string;
  durationMinutes: number;
  label: string;
  autoScheduled: boolean;
}

const DISMISSED_KEY = 'charito:dismissed-recs';

function getDismissed(): string[] {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function addDismissed(id: string): void {
  try {
    const cur = getDismissed();
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...cur, id]));
  } catch { /* ignore */ }
}

function generateRecommendations(
  mode: 'gentle' | 'strict',
  goals: string[],
  hour: number,
): Recommendation[] {
  const isStrict = mode === 'strict';
  const isMorning  = hour >= 6  && hour < 10;
  const isAfternoon = hour >= 12 && hour < 17;
  const isEvening  = hour >= 18 && hour < 23;
  const isLunch    = hour >= 12 && hour < 14;

  const pool: Recommendation[] = [
    {
      id: 'morning-clarity',
      emoji: '🌅',
      title: 'Morning clarity',
      reason: 'Starting phone-free builds mental clarity for the whole day.',
      durationMinutes: isStrict ? 60 : 30,
      label: isStrict ? '60 min' : '30 min',
      autoScheduled: isMorning,
    },
    {
      id: 'evening-wind-down',
      emoji: '🌙',
      title: 'Evening wind-down',
      reason: 'Phones before bed reduce deep sleep by up to 30%.',
      durationMinutes: isStrict ? 90 : 60,
      label: isStrict ? '90 min' : '60 min',
      autoScheduled: isEvening,
    },
    {
      id: 'deep-focus',
      emoji: '🧠',
      title: 'Deep focus block',
      reason: 'Every notification costs 23 minutes of concentration.',
      durationMinutes: isStrict ? 90 : 45,
      label: isStrict ? '90 min' : '45 min',
      autoScheduled: isAfternoon,
    },
    {
      id: 'social-pause',
      emoji: '📵',
      title: 'Social media pause',
      reason: 'A short break from social feeds lowers cortisol levels.',
      durationMinutes: isStrict ? 60 : 30,
      label: isStrict ? '60 min' : '30 min',
      autoScheduled: false,
    },
    {
      id: 'mindful-lunch',
      emoji: '🍃',
      title: 'Mindful lunch',
      reason: 'Eating without screens improves digestion and reduces stress.',
      durationMinutes: 20,
      label: '20 min',
      autoScheduled: isLunch,
    },
    {
      id: 'presence-break',
      emoji: '☀️',
      title: 'Presence break',
      reason: 'Step away for a while — your mind will thank you.',
      durationMinutes: isStrict ? 45 : 20,
      label: isStrict ? '45 min' : '20 min',
      autoScheduled: false,
    },
  ];

  // Score by relevance: time-slot match + goals alignment
  const scored = pool.map((r) => {
    let score = r.autoScheduled ? 10 : 0;
    if (goals.includes('sleep') && (r.id === 'evening-wind-down' || r.id === 'morning-clarity')) score += 6;
    if (goals.includes('focus') && r.id === 'deep-focus') score += 6;
    if ((goals.includes('anxiety') || goals.includes('stress')) && r.id === 'social-pause') score += 6;
    if (goals.includes('productivity') && r.id === 'deep-focus') score += 4;
    if (goals.includes('health') && r.id === 'mindful-lunch') score += 4;
    // Gentle mode: prefer shorter, non-intrusive suggestions
    if (!isStrict && r.durationMinutes <= 30) score += 1;
    return { ...r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const dismissed = getDismissed();
  return scored.filter((r) => !dismissed.includes(r.id)).slice(0, 3);
}

const ROTATING_MESSAGES = [
  'Every minute offline is a minute truly yours.',
  'Small breaks, big clarity.',
  'You choose when to unplug.',
  'Rest your eyes. Clear your mind.',
  "You're doing great — one step at a time.",
  'Presence is the rarest gift you can give yourself.',
];

const DID_YOU_KNOW_KEY = 'charito:did-you-know:dismissed';

const DID_YOU_KNOW_FACTS = [
  'The average person unlocks their phone 96 times a day.',
  'Social media is engineered to be as addictive as slot machines.',
  'Every phone interruption costs 23 minutes of deep focus.',
  'Doomscrolling raises cortisol — your stress hormone.',
  'Heavy phone use before bed reduces REM sleep by up to 30%.',
];

interface HomeViewProps {
  onNavigateToBlocks: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigateToBlocks }) => {
  const session = useSession();

  const [msgIndex, setMsgIndex] = React.useState(0);
  const [msgVisible, setMsgVisible] = React.useState(true);

  // Smart suggestions — recomputed once per mount (hour-granular)
  const [suggestions, setSuggestions] = React.useState<Recommendation[]>(() => {
    const s = settingsStore.get();
    return generateRecommendations(s.mode, s.goals, new Date().getHours());
  });

  const handleSkipSuggestion = (id: string) => {
    addDismissed(id);
    setSuggestions((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      // If we now have fewer than 3, try to backfill from the full pool
      if (filtered.length < 3) {
        const s = settingsStore.get();
        return generateRecommendations(s.mode, s.goals, new Date().getHours());
      }
      return filtered;
    });
  };

  const handleAcceptSuggestion = (rec: Recommendation) => {
    settingsStore.set({ durationMinutes: rec.durationMinutes });
    session.start();
    toastStore.show(`✓ ${rec.title} started. You've got this.`);
    addDismissed(rec.id);
    setSuggestions((prev) => prev.filter((r) => r.id !== rec.id));
  };

  // Did-you-know strip — once per session
  const [didYouKnowFact] = React.useState(() => {
    const idx = Math.floor(Math.random() * DID_YOU_KNOW_FACTS.length);
    return DID_YOU_KNOW_FACTS[idx];
  });
  const [didYouKnowVisible, setDidYouKnowVisible] = React.useState(() => {
    try {
      return !sessionStorage.getItem(DID_YOU_KNOW_KEY);
    } catch {
      return true;
    }
  });

  const dismissDidYouKnow = () => {
    try { sessionStorage.setItem(DID_YOU_KNOW_KEY, '1'); } catch { /* ignore */ }
    setDidYouKnowVisible(false);
  };

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMsgVisible(false);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % ROTATING_MESSAGES.length);
        setMsgVisible(true);
      }, 400);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleBlockTrigger = React.useCallback(
    (block: DetoxBlock) => {
      const settings = settingsStore.get();
      let messageText: string | null = null;

      if (block.messageId) {
        // Check custom messages in settings store
        const customMsg = settings.customMessages.find((m) => m.id === block.messageId);
        if (customMsg) {
          messageText = customMsg.text || null;
        } else if (block.messageId === 'custom') {
          messageText = block.customMessage || null;
        } else {
          const preset = culturalPresets.find((p) => p.cultureCode === settings.cultureCode);
          messageText = preset?.messages.find((m) => m.id === block.messageId)?.text ?? null;
        }
      } else {
        // Random message from current culture
        const preset = culturalPresets.find((p) => p.cultureCode === settings.cultureCode);
        if (preset && preset.messages.length > 0) {
          const idx = Math.floor(Math.random() * preset.messages.length);
          messageText = preset.messages[idx].text;
        }
      }

      if (messageText) {
        void speak(messageText, settings.languageCode);
      }

      session.start();
    },
    [session],
  );

  useDetoxBlocks(handleBlockTrigger);

  return (
    <div className="view">
      <header className="app-header">
        {/* Icon + rotating message on one line */}
        <div className="home-header-row">
          <LeafIcon size={28} className="home-leaf-icon" />
          <p
            className="app-subtitle home-subtitle-inline"
            style={{ opacity: msgVisible ? 1 : 0, transition: 'opacity 0.4s ease' }}
          >
            {ROTATING_MESSAGES[msgIndex]}
          </p>
        </div>

        {/* Did you know strip — once per session */}
        {didYouKnowVisible && (
          <div className="did-you-know-strip">
            <span className="did-you-know-label">Did you know?</span>
            <span className="did-you-know-text">{didYouKnowFact}</span>
            <button
              type="button"
              className="did-you-know-dismiss"
              onClick={dismissDidYouKnow}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}
      </header>

      <section aria-label="Active session">
        <SessionView />
      </section>

      <section aria-label="This week" className="card">
        <WeekStrip onDaySelect={() => {}} />
        <p className="week-strip-desc">Tap a day to see your scheduled detox blocks.</p>
        <button
          type="button"
          className="week-strip-cta"
          onClick={onNavigateToBlocks}
        >
          ＋ Schedule a block
        </button>
      </section>

      {/* Smart suggestions strip — top 3 AI-ranked recommendations */}
      {suggestions.length > 0 && (
        <section aria-label="Smart suggestions">
          <div className="home-recs-header">
            <p className="section-label" style={{ margin: 0 }}>Suggested for you</p>
            <span className="home-recs-ai-badge" aria-label="AI-powered">✦ pattern-aware</span>
          </div>
          <div className="smart-recs-list" style={{ marginTop: '0.5rem' }}>
            {suggestions.map((rec) => (
              <div key={rec.id} className="smart-rec-card">
                <div className="smart-rec-top">
                  <span className="smart-rec-emoji" aria-hidden="true">{rec.emoji}</span>
                  <div className="smart-rec-text">
                    <p className="smart-rec-app">
                      {rec.title}
                      {rec.autoScheduled && (
                        <span className="smart-rec-auto-tag" aria-label="Auto-scheduled">
                          &nbsp;🗓 Auto-scheduled
                        </span>
                      )}
                    </p>
                    <p className="smart-rec-reason">{rec.reason}</p>
                  </div>
                </div>
                <div className="smart-rec-footer">
                  <span className="smart-rec-label">{rec.label}</span>
                  <div className="smart-rec-actions">
                    <button
                      type="button"
                      className="button button-secondary smart-rec-accept"
                      onClick={() => handleAcceptSuggestion(rec)}
                    >
                      Start now
                    </button>
                    <button
                      type="button"
                      className="smart-rec-skip"
                      onClick={() => handleSkipSuggestion(rec.id)}
                      aria-label={`Skip ${rec.title} suggestion`}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
