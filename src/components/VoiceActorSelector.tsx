import React from 'react';
import { settingsStore } from '../state/settingsStore';
import type { DetoxSettings } from '../types/settings';
import {
  filterVoiceActors,
  voiceActorsForLanguage,
  VOICE_TONE_LABELS,
  VOICE_TONES,
  type VoiceActor,
  type VoiceLangFilter,
  type VoiceToneFilter,
} from '../data/voiceActors';
import { speak, ensureVoicesLoaded } from '../services/audioEngine';

const LANG_OPTIONS: { id: VoiceLangFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'es', label: 'Español' },
  { id: 'en', label: 'English' },
];

const TONE_OPTIONS: { id: VoiceToneFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  ...VOICE_TONES.map((tone) => ({ id: tone, label: VOICE_TONE_LABELS[tone] })),
];

export const VoiceActorSelector: React.FC = () => {
  const [state, setState] = React.useState<DetoxSettings>(settingsStore.get());
  const [previewingId, setPreviewingId] = React.useState<string | null>(null);
  const [langFilter, setLangFilter] = React.useState<VoiceLangFilter>('all');
  const [toneFilter, setToneFilter] = React.useState<VoiceToneFilter>('all');

  React.useEffect(() => {
    return settingsStore.subscribe((next) => setState(next));
  }, []);

  React.useEffect(() => {
    void ensureVoicesLoaded();
  }, []);

  const orderedActors = React.useMemo(
    () => voiceActorsForLanguage(state.languageCode),
    [state.languageCode],
  );

  const actors = React.useMemo(
    () => filterVoiceActors(orderedActors, langFilter, toneFilter),
    [orderedActors, langFilter, toneFilter],
  );

  const handleSelect = (id: string) => {
    settingsStore.set({ voiceActorId: id });
  };

  const handlePreview = (actor: VoiceActor) => {
    if (previewingId === actor.id) {
      window.speechSynthesis.cancel();
      setPreviewingId(null);
      return;
    }
    settingsStore.set({ voiceActorId: actor.id });
    setPreviewingId(actor.id);
    void speak(actor.sample, actor.languageCode).finally(() => {
      setPreviewingId(null);
    });
  };

  return (
    <fieldset className="field" style={{ border: 'none', padding: 0, margin: 0 }}>
      <legend className="field-label">Select a voice actor</legend>
      <p className="field-description">
        Choose who speaks your reminders — preview any voice before you commit.
      </p>

      <div className="voice-actor-filters">
        <div className="voice-actor-filter-group" role="group" aria-label="Language">
          <span className="voice-actor-filter-label">Language</span>
          <div className="voice-actor-chip-row">
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`voice-actor-chip${langFilter === opt.id ? ' voice-actor-chip--active' : ''}`}
                aria-pressed={langFilter === opt.id}
                onClick={() => setLangFilter(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="voice-actor-filter-group" role="group" aria-label="Tone">
          <span className="voice-actor-filter-label">Tone</span>
          <div className="voice-actor-chip-row">
            {TONE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`voice-actor-chip${toneFilter === opt.id ? ' voice-actor-chip--active' : ''}`}
                aria-pressed={toneFilter === opt.id}
                onClick={() => setToneFilter(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {actors.length === 0 ? (
        <p className="voice-actor-empty" role="status">
          No voices match these filters. Try All language or All tone.
        </p>
      ) : (
        <div className="voice-actor-list" role="listbox" aria-label="Voice actors">
          {actors.map((actor) => {
            const selected = state.voiceActorId === actor.id;
            return (
              <div
                key={actor.id}
                role="option"
                aria-selected={selected}
                className={`voice-actor-card${selected ? ' voice-actor-card--selected' : ''}`}
              >
                <button
                  type="button"
                  className="voice-actor-card-main"
                  onClick={() => handleSelect(actor.id)}
                >
                  <span className="voice-actor-avatar" aria-hidden="true">
                    {actor.name.slice(0, 1)}
                  </span>
                  <span className="voice-actor-meta">
                    <span className="voice-actor-name">{actor.name}</span>
                    <span className="voice-actor-style">
                      {actor.style}
                      <span className="voice-actor-lang">
                        · {actor.langFamily === 'es' ? 'Español' : 'English'}
                        · {VOICE_TONE_LABELS[actor.tone]}
                      </span>
                    </span>
                  </span>
                  {selected && (
                    <span className="voice-actor-check" aria-hidden="true">✓</span>
                  )}
                </button>
                <button
                  type="button"
                  className="voice-actor-play"
                  onClick={() => handlePreview(actor)}
                  aria-label={
                    previewingId === actor.id
                      ? `Stop ${actor.name}`
                      : `Preview ${actor.name}`
                  }
                >
                  {previewingId === actor.id ? '■' : '▶'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </fieldset>
  );
};
