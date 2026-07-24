import React from 'react';
import { BlockCard } from '../components/BlockCard';

export const BlocksView: React.FC = () => {
  return (
    <div className="view">
      <header className="app-header">
        <p className="app-badge">DETOX BLOCKS</p>
        <h1 className="app-title">Your scheduled blocks</h1>
      </header>

      <section aria-label="Detox blocks">
        <BlockCard />
      </section>
    </div>
  );
};
