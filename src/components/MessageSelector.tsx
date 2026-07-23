import React from 'react';
import { culturalPresets } from '../data/culturalPresets';
import { settingsStore } from '../state/settingsStore';
import type { DetoxSettings } from '../types/settings';

export const MessageSelector: React.FC = () => {
  const [state, setState] = React.useState<DetoxSettings>(settingsStore.get());

  React.useEffect(() => {
    return settingsStore.subscribe((next) => setState(next));
  }, []);

  const preset = culturalPresets.find(
    (p) => p.cultureCode === state.cultureCode,
  );
  if (!preset) return null;

  const toggleMessage = (id: string) => {
    const selected = new Set(state.selectedMessageIds);
    if (selected.has(id)) {
      // Always keep at least one message selected.
      if (selected.size === 1) return;
      selected.delete(id);
    } else {
      selected.add(id);
    }
    settingsStore.set({ selectedMessageIds: Array.from(selected) });
  };

  return (
    <fieldset className="field">
      <legend className="field-label">Messages for this culture</legend>
      <div className="message-list">
        {preset.messages.map((message) => (
          <label key={message.id} className="message-option">
            <input
              type="checkbox"
              checked={state.selectedMessageIds.includes(message.id)}
              onChange={() => toggleMessage(message.id)}
            />
            <span>{message.text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};
