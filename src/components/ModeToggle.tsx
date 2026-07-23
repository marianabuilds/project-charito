import React from 'react';
import { settingsStore } from '../state/settingsStore';
import type { DetoxMode } from '../types/settings';

export const ModeToggle: React.FC = () => {
  const [mode, setMode] = React.useState<DetoxMode>(settingsStore.get().mode);

  React.useEffect(() => {
    return settingsStore.subscribe((next) => setMode(next.mode));
  }, []);

  const handleChange = (value: DetoxMode) => {
    settingsStore.set({ mode: value });
  };

  return (
    <fieldset className="field">
      <legend className="field-label">Reminder style</legend>
      <div className="mode-toggle" role="radiogroup" aria-label="Reminder style">
        <label className="mode-option">
          <input
            type="radio"
            name="mode"
            value="gentle"
            checked={mode === 'gentle'}
            onChange={() => handleChange('gentle')}
          />
          Gentle reminders (can keep using phone)
        </label>
        <label className="mode-option">
          <input
            type="radio"
            name="mode"
            value="strict"
            checked={mode === 'strict'}
            onChange={() => handleChange('strict')}
          />
          Strict mode (full-screen prompt at end)
        </label>
      </div>
    </fieldset>
  );
};
