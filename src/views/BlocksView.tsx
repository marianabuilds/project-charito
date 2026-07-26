import React from 'react';
import { BlockCard } from '../components/BlockCard';
import type { DetoxBlock } from '../state/blockStore';

interface BlocksViewProps {
  prefill?: Partial<DetoxBlock>;
  onPrefillConsumed?: () => void;
}

export const BlocksView: React.FC<BlocksViewProps> = ({ prefill, onPrefillConsumed }) => {
  return (
    <div className="view">
      <header className="app-header">
        <p className="app-badge">DETOX BLOCKS</p>
        <h1 className="app-title">Your scheduled blocks</h1>
      </header>

      <section aria-label="Detox blocks">
        <BlockCard prefill={prefill} onPrefillConsumed={onPrefillConsumed} />
      </section>
    </div>
  );
};
