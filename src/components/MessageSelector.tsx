import React from 'react';
import { culturalPresets } from '../data/culturalPresets';
import { settingsStore } from '../state/settingsStore';
import type { DetoxSettings, CustomMessage } from '../types/settings';
import { AudioMessageRow } from './AudioMessageRow';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { speak } from '../services/audioEngine';

export const MessageSelector: React.FC = () => {
  const [state, setState] = React.useState<DetoxSettings>(settingsStore.get());
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newText, setNewText] = React.useState('');
  const [newAudio, setNewAudio] = React.useState('');
  const [previewingId, setPreviewingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    return settingsStore.subscribe((next) => setState(next));
  }, []);

  const { isRecording, isSupported: hasMic, startRecording, stopRecording, discardRecording } =
    useAudioRecorder((dataUrl) => {
      setNewAudio(dataUrl);
    });

  const preset = culturalPresets.find((p) => p.cultureCode === state.cultureCode);
  if (!preset) return null;

  const handleSelect = (id: string | null) => {
    settingsStore.set({ selectedMessageId: id });
  };

  const handlePreview = (id: string, text: string) => {
    if (previewingId === id) {
      window.speechSynthesis.cancel();
      setPreviewingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    setPreviewingId(id);
    const settings = settingsStore.get();
    void speak(text, settings.languageCode).then(() => setPreviewingId(null));
  };

  const handleSaveCustomMessage = () => {
    if (!newText.trim() && !newAudio) return;
    const existing = settingsStore.get().customMessages;
    const label = newText.trim().slice(0, 30) || `Recording ${existing.length + 1}`;
    const newMsg: CustomMessage = {
      id: crypto.randomUUID(),
      text: newText.trim(),
      audioDataUrl: newAudio,
      label,
    };
    settingsStore.set({ customMessages: [...existing, newMsg] });
    setNewText('');
    setNewAudio('');
    discardRecording();
    setShowAddForm(false);
  };

  const handleDeleteCustomMessage = (id: string) => {
    const updated = state.customMessages.filter((m) => m.id !== id);
    settingsStore.set({ customMessages: updated });
    if (state.selectedMessageId === id) {
      settingsStore.set({ selectedMessageId: null });
    }
  };

  const handleDiscardNewAudio = () => {
    discardRecording();
    setNewAudio('');
  };

  return (
    <fieldset className="field" style={{ border: 'none', padding: 0, margin: 0 }}>
      <legend className="field-label">Reminder message</legend>
      <div className="message-list">
        {/* Random option */}
        <label className="message-option">
          <input
            type="radio"
            name="selected-message"
            checked={state.selectedMessageId === null}
            onChange={() => handleSelect(null)}
          />
          <span style={{ color: 'var(--text-m)', fontStyle: 'italic' }}>
            Random (pick one each time)
          </span>
        </label>

        {/* Cultural preset messages — play lives inside AudioMessageRow */}
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

        {/* Custom messages — list */}
        {state.customMessages.length > 0 && (
          <div className="custom-messages-list">
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-m)', margin: '0.5rem 0 0.25rem' }}>
              Your custom reminders
            </p>
            {state.customMessages.map((cm) => (
              <div key={cm.id} className="custom-message-row">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, cursor: 'pointer', minWidth: 0 }}>
                  <input
                    type="radio"
                    name="selected-message"
                    checked={state.selectedMessageId === cm.id}
                    onChange={() => handleSelect(cm.id)}
                    style={{ accentColor: 'var(--accent)', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cm.label}
                  </span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                  {cm.audioDataUrl && (
                    <button
                      type="button"
                      onClick={() => handlePreview(cm.id, cm.text || 'Custom audio reminder')}
                      aria-label={previewingId === cm.id ? 'Stop preview' : 'Play audio'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-m)', padding: '0 0.2rem' }}
                    >
                      {previewingId === cm.id ? '■' : '▶'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomMessage(cm.id)}
                    aria-label="Delete custom message"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-m)', padding: '0 0.2rem' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add custom message */}
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            style={{
              background: 'none',
              border: '1px dashed var(--border)',
              borderRadius: 4,
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              color: 'var(--accent)',
              cursor: 'pointer',
              textAlign: 'left',
              marginTop: '0.25rem',
            }}
          >
            + Add message
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--surface-2)' }}>
            <input
              type="text"
              className="block-text-input"
              placeholder="Type your reminder…"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
            />

            {/* Mic recording */}
            {hasMic && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

            {/* Recorded audio playback */}
            {newAudio && !isRecording && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <audio src={newAudio} controls style={{ height: 28, flex: 1, minWidth: 0 }} />
                <button
                  type="button"
                  onClick={handleDiscardNewAudio}
                  aria-label="Discard recording"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="button button-primary"
                onClick={handleSaveCustomMessage}
                disabled={!newText.trim() && !newAudio}
                style={{ flex: 1, minHeight: '2.25rem', fontSize: '0.875rem' }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setNewText(''); setNewAudio(''); discardRecording(); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-m)', fontSize: '0.875rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </fieldset>
  );
};
