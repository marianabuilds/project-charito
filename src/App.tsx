import React from 'react';
import { DurationPicker } from './components/DurationPicker';
import { CultureSelector } from './components/CultureSelector';
import { MessageSelector } from './components/MessageSelector';
import { ModeToggle } from './components/ModeToggle';
import { SessionView } from './components/SessionView';
import './styles/global.css';

export const App: React.FC = () => {
  return (
    <div className="app-root">
      <header className="app-header">
        <p className="app-badge">Project Charito</p>
        <h1 className="app-title">
          Culturally rooted nudges off your phone
        </h1>
        <p className="app-subtitle">
          Spoken reminders from your culture to help you disconnect.
        </p>
      </header>
      <main>
        <section aria-label="Session settings" className="settings-section">
          <CultureSelector />
          <ModeToggle />
          <DurationPicker />
          <MessageSelector />
        </section>
        <section aria-label="Active session">
          <SessionView />
        </section>
      </main>
    </div>
  );
};

export default App;
