import React from 'react';
import { WeekStrip } from '../components/WeekStrip';
import { SessionView } from '../components/SessionView';
import { LeafIcon } from '../components/LeafIcon';
import { useDetoxBlocks } from '../hooks/useDetoxBlocks';
import { useSession } from '../state/SessionContext';
import { settingsStore } from '../state/settingsStore';
import { toastStore } from '../state/toastStore';
import type { DetoxBlock } from '../state/blockStore';
import { useUsageStats } from '../hooks/useUsageStats';
import {
  generateRecommendations,
  recToPrefill,
  formatPill,
} from '../utils/recommendations';
import type { Recommendation } from '../utils/recommendations';

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

const METHOD_EMOJI: Record<Recommendation['type'], string> = {
  duration: '⏱',
  'set-hours': '🌙',
  'usage-limit': '📊',
  'launch-count': '🔢',
};

const ROTATING_MESSAGES = [
  'Every minute offline is a minute truly yours.',
  'Small breaks, big clarity.',
  'You choose when to unplug.',
  'Rest your eyes. Clear your mind.',
  "You're doing great — one step at a time.",
  'Presence is the rarest gift you can give yourself.',
];

const DID_YOU_KNOW_FACTS = [
  'The average person unlocks their phone 96 times a day.',
  'Social media is engineered to be as addictive as slot machines.',
  'Every phone interruption costs 23 minutes of deep focus.',
  'Doomscrolling raises cortisol — your stress hormone.',
  'Heavy phone use before bed reduces REM sleep by up to 30%.',
];

interface HomeViewProps {
  onNavigateToBlocks: (prefill?: Partial<DetoxBlock>) => void;
  onNavigateToSettings?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigateToBlocks, onNavigateToSettings }) => {
  const session = useSession();
  const { stats, status: usageStatus, openPermissionSettings, refresh } =
    useUsageStats(8);

  const [msgIndex, setMsgIndex] = React.useState(0);
  const [msgVisible, setMsgVisible] = React.useState(true);
  const [dismissedTick, setDismissedTick] = React.useState(0);

  const hasUsageData = usageStatus === 'ready' && stats.length > 0;
  const needsPermission = usageStatus === 'permission-denied';
  const showEmptyRecs =
    needsPermission ||
    (usageStatus === 'ready' && stats.length === 0) ||
    usageStatus === 'error';

  const suggestions = React.useMemo(() => {
    void dismissedTick;
    if (needsPermission || usageStatus === 'error') return [];
    if (!hasUsageData && usageStatus !== 'ready') return [];
    // On web, useUsageStats provides demo stats — use them for richer copy
    const recs = generateRecommendations(stats, {
      allowDemoFallback: usageStatus === 'ready' && stats.length === 0 ? false : true,
      limit: 5,
    });
    const dismissed = getDismissed();
    return recs.filter((r) => !dismissed.includes(r.id)).slice(0, 5);
  }, [stats, hasUsageData, usageStatus, needsPermission, dismissedTick]);

  const handleSkipSuggestion = (id: string) => {
    addDismissed(id);
    setDismissedTick((t) => t + 1);
  };

  const handleStartNow = (rec: Recommendation) => {
    const duration =
      rec.type === 'duration' ? rec.defaultValue : Math.min(45, Math.max(20, rec.dailyAvgMinutes));
    settingsStore.set({ durationMinutes: duration });
    session.start([rec.appName]);
    toastStore.show(`✓ Focus block for ${rec.appName} started.`);
    addDismissed(rec.id);
    setDismissedTick((t) => t + 1);
  };

  const handleCreateBlock = (rec: Recommendation) => {
    onNavigateToBlocks(recToPrefill(rec));
    addDismissed(rec.id);
    setDismissedTick((t) => t + 1);
  };

  const [didYouKnowFact] = React.useState(() => {
    const idx = Math.floor(Math.random() * DID_YOU_KNOW_FACTS.length);
    return DID_YOU_KNOW_FACTS[idx];
  });

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

  // Audio + AppBlocker are handled inside useDetoxBlocks for scheduled blocks
  const handleBlockTrigger = React.useCallback((block: DetoxBlock) => {
    toastStore.show(`✓ ${block.label || 'Detox block'} is now active.`);
  }, []);

  useDetoxBlocks(handleBlockTrigger);

  return (
    <div className="view">
      <header className="app-header">
        <div className="home-header-row">
          <LeafIcon size={28} className="home-leaf-icon" />
          <p
            className="app-subtitle home-subtitle-inline"
            style={{ opacity: msgVisible ? 1 : 0, transition: 'opacity 0.4s ease' }}
          >
            {ROTATING_MESSAGES[msgIndex]}
          </p>
        </div>

        <div className="did-you-know-strip">
          <span className="did-you-know-label">Did you know?</span>
          <span className="did-you-know-text">{didYouKnowFact}</span>
        </div>
      </header>

      <section aria-label="Smart suggestions">
        <div className="home-recs-header">
          <p className="section-label" style={{ margin: 0 }}>Suggested for you</p>
          <span className="home-recs-ai-badge" aria-label="AI-powered">✦ pattern-aware</span>
        </div>

        {showEmptyRecs && suggestions.length === 0 ? (
          <div className="home-recs-empty" style={{ marginTop: '0.5rem' }}>
            <p className="home-recs-empty-title">Smart recommendations need usage access</p>
            <p className="home-recs-empty-body">
              Give the app access to data usage and screen time to get smart recommendations.
            </p>
            {needsPermission && (
              <button
                type="button"
                className="button button-primary"
                style={{ marginTop: '0.75rem', minHeight: '2.75rem' }}
                onClick={() => {
                  openPermissionSettings();
                  const handler = () => {
                    if (document.visibilityState === 'visible') {
                      refresh();
                      document.removeEventListener('visibilitychange', handler);
                    }
                  };
                  document.addEventListener('visibilitychange', handler);
                }}
              >
                Open usage access settings →
              </button>
            )}
            {usageStatus === 'error' && (
              <button
                type="button"
                className="button button-secondary"
                style={{ marginTop: '0.75rem' }}
                onClick={refresh}
              >
                Try again
              </button>
            )}
          </div>
        ) : suggestions.length === 0 ? (
          <div className="home-recs-empty" style={{ marginTop: '0.5rem' }}>
            <p className="home-recs-empty-title">No suggestions for now</p>
            <p className="home-recs-empty-body">
              You're all caught up. Check back later for new pattern-aware ideas.
            </p>
          </div>
        ) : (
          <div className="smart-recs-list" style={{ marginTop: '0.5rem' }}>
            {suggestions.map((rec) => (
              <div key={rec.id} className="smart-rec-card">
                <div className="smart-rec-top">
                  <span className="smart-rec-emoji" aria-hidden="true">
                    {METHOD_EMOJI[rec.type]}
                  </span>
                  <div className="smart-rec-text">
                    <p className="smart-rec-app">
                      {rec.type === 'duration'
                        ? `Focus block for ${rec.appName}`
                        : rec.appName}
                    </p>
                    <p className="smart-rec-reason">{rec.reason}</p>
                  </div>
                </div>
                <div className="smart-rec-footer">
                  <span className="smart-rec-label">{formatPill(rec.type, rec.defaultValue)}</span>
                  <div className="smart-rec-actions">
                    <button
                      type="button"
                      className="button button-secondary smart-rec-accept"
                      onClick={() => handleStartNow(rec)}
                    >
                      Start now
                    </button>
                    <button
                      type="button"
                      className="button button-primary smart-rec-accept"
                      onClick={() => handleCreateBlock(rec)}
                    >
                      Create block
                    </button>
                    <button
                      type="button"
                      className="smart-rec-skip"
                      onClick={() => handleSkipSuggestion(rec.id)}
                      aria-label={`Skip ${rec.appName} suggestion`}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Active session">
        <SessionView onNavigateToSettings={onNavigateToSettings} />
      </section>

      <section aria-label="This week" className="card">
        <WeekStrip onDaySelect={() => {}} />
        <p className="week-strip-desc">Tap a day to see your scheduled detox blocks.</p>
        <button
          type="button"
          className="week-strip-cta"
          onClick={() => onNavigateToBlocks()}
        >
          ＋ Schedule a block
        </button>
      </section>
    </div>
  );
};
