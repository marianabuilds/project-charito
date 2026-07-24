import React from 'react';
import { culturalPresets } from '../data/culturalPresets';
import { settingsStore } from '../state/settingsStore';
import type { DetoxSettings } from '../types/settings';
import { AudioMessageRow } from './AudioMessageRow';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

export const MessageSelector: React.FC = () => {
  const [state, setState] = React.useState<DetoxSettings>(settingsStore.get());

  React.useEffect(() => {
    return settingsStore.subscribe((next) => setState(next));
  }, []);

  const { isRecording, isSupported: hasMic, startRecording, stopRecording, discardRecording } =
    useAudioRecorder((dataUrl) => settingsStore.set({ customMessageAudio: dataUrl }));

  const preset = culturalPresets.find((p) => p.cultureCode === state.cultureCode);
  if (!preset) return null;

  const handleSelect = (id: string) => {
    settingsStore.set({ selectedMessageId: id === state.selectedMessageId ? null : id });
  };

  return (
    <fieldset className="field" style={{ border: 'none', padding: 0, margin: 0 }}>
      <legend className="field-label">Reminder message</legend>
      <div className="message-list">
        {preset.messages.map((message) => (
          <AudioMessageRow
            key={message.id}
            text={message.text}
            name="selected-message"
            value={message.id}
            checked={state.selectedMessageId === message.id}
            onChange={() => handleSelect(message.id)}
          />
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

            {/* Mic recording button — hidden when MediaRecorder not supported */}
            {hasMic && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : () => void startRecording()}
                  aria-label={isRecording ? 'Stop recording' : 'Record audio message'}
                  style={{
                    background: isRecording ? '#e53e3e' : 'none',
                    color: isRecording ? '#fff' : 'inherit',
                    border: '1px solid currentColor',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    flexShrink: 0,
                  }}
                >
                  🎤
                </button>
                {isRecording && (
                  <span style={{ fontSize: '0.75rem', color: '#e53e3e' }}>Recording…</span>
                )}
              </div>
            )}

            {/* Recorded audio playback + discard */}
            {state.customMessageAudio && !isRecording && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                }}
              >
                <audio
                  src={state.customMessageAudio}
                  controls
                  style={{ height: 28, flex: 1, minWidth: 0 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    discardRecording();
                    settingsStore.set({ customMessageAudio: '' });
                  }}
                  aria-label="Discard recording"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        <label className="message-option">
          <input
            type="radio"
            name="selected-message"
            checked={state.selectedMessageId === null}
            onChange={() => settingsStore.set({ selectedMessageId: null })}
          />
          <span style={{ color: 'var(--text-m)', fontStyle: 'italic' }}>
            Random (pick one each time)
          </span>
        </label>
      </div>
    </fieldset>
  );
};
