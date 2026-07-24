import React from 'react';
import { WeekStrip } from '../components/WeekStrip';
import { SessionView } from '../components/SessionView';
import { BlockCard } from '../components/BlockCard';
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

export const HomeView: React.FC = () => {
  const session = useSession();

  const [msgIndex, setMsgIndex] = React.useState(0);
  const [msgVisible, setMsgVisible] = React.useState(true);
  const [userName, setUserName] = React.useState(settingsStore.get().userName);

  React.useEffect(() => {
    return settingsStore.subscribe((s) => setUserName(s.userName));
  }, []);

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

      if (block.messageId === 'custom') {
        messageText = block.customMessage || null;
      } else if (block.messageId) {
        const preset = culturalPresets.find((p) => p.cultureCode === settings.cultureCode);
        messageText = preset?.messages.find((m) => m.id === block.messageId)?.text ?? null;
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

  const trimmedName = userName.trim();

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

        {/* User name as large heading — only shown if set */}
        {trimmedName && (
          <h1 className="app-title home-username-heading">"{trimmedName}"</h1>
        )}
      </header>

      <section aria-label="This week" className="card">
        <WeekStrip onDaySelect={() => {}} />
      </section>

      <section aria-label="Active session">
        <SessionView />
      </section>

      <section aria-label="Detox blocks">
        <BlockCard />
      </section>
    </div>
  );
};
