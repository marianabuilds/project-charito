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

  const handleSelect = (id: string) => {
    settingsStore.set({ selectedMessageId: id === state.selectedMessageId ? null : id });
  };

  return (
    <fieldset className="field" style={{ border: 'none', padding: 0, margin: 0 }}>
      <legend className="field-label">Reminder message</legend>
      <div className="message-list">
        {preset.messages.map((message) => (
          <label key={message.id} className="message-option">
            <input
              type="radio"
              name="selected-message"
              checked={state.selectedMessageId === message.id}
              onChange={() => handleSelect(message.id)}
            />
            <span>{message.text}</span>
          </label>
        ))}

        <label className="message-option">
          <input
            type="radio"
            name="selected-message"
            checked={state.selectedMessageId === 'custom'}
            onChange={() => settingsStore.set({ selectedMessageId: 'custom' })}
          />
          <span>Custom message…</span>
        </label>

        {state.selectedMessageId === 'custom' && (
          <div style={{ paddingLeft: '1.5rem', marginTop: '0.25rem' }}>
            <input
              type="text"
              className="alarm-time-input"
              style={{ width: '100%' }}
              placeholder="Type your custom reminder…"
              value={state.customMessage}
              onChange={(e) => settingsStore.set({ customMessage: e.target.value })}
            />
          </div>
        )}

        <label className="message-option">
          <input
            type="radio"
            name="selected-message"
            checked={state.selectedMessageId === null}
            onChange={() => settingsStore.set({ selectedMessageId: null })}
          />
          <span style={{ color: 'var(--text-m)', fontStyle: 'italic' }}>Random (pick one each time)</span>
        </label>
      </div>
    </fieldset>
  );
};
