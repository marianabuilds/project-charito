import React from 'react';
import { WeekStrip } from '../components/WeekStrip';
import { SessionView } from '../components/SessionView';
import { LeafIcon } from '../components/LeafIcon';
import { useDetoxBlocks } from '../hooks/useDetoxBlocks';
import { useSession } from '../state/SessionContext';
import { culturalPresets } from '../data/culturalPresets';
import { settingsStore } from '../state/settingsStore';
import { speak } from '../services/audioEngine';
import type { DetoxBlock } from '../state/blockStore';

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
    </div>
  );
};
