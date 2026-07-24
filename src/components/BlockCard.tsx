import React from 'react';
import { blockStore } from '../state/blockStore';
import type { DetoxBlock, BlockingMethod } from '../state/blockStore';
import { settingsStore } from '../state/settingsStore';
import { culturalPresets } from '../data/culturalPresets';
import { speak } from '../services/audioEngine';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

// Single-letter day labels: S M T W T F S
const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const BLOCKING_METHODS: { id: BlockingMethod; title: string; description: string }[] = [
  { id: 'duration', title: 'Duration', description: 'Stay offline for a set time' },
  { id: 'set-hours', title: 'Set hours', description: 'Block during a time window' },
  { id: 'usage-limit', title: 'Usage limit', description: 'Cap daily screen time' },
  { id: 'launch-count', title: 'Launch count', description: 'Limit how many times you open apps' },
  { id: 'location', title: 'Location', description: 'Remind me when I\'m at a specific spot' },
];

const LOCATION_RADII = [50, 100, 200, 500] as const;

function formatDuration(minutes: number): string {
  if (minutes <= 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function blockSummary(block: DetoxBlock): string {
  switch (block.blockingMethod) {
    case 'duration':
      return formatDuration(block.durationMinutes);
    case 'set-hours':
      return block.setHoursStart && block.setHoursEnd
        ? `${block.setHoursStart}–${block.setHoursEnd}`
        : 'Set hours';
    case 'usage-limit':
      return `${block.usageLimitMinutes} min/day`;
    case 'launch-count':
      return `${block.launchCountMax} opens/day`;
    case 'location':
      return block.location ? `📍 ±${block.locationRadius}m` : 'Location';
    default:
      return '';
  }
}

function methodLabel(method: BlockingMethod): string {
  const m = BLOCKING_METHODS.find((b) => b.id === method);
  return m?.title ?? method;
}

/** Auto-generated description when the user hasn't supplied a label */
function blockAutoDescription(block: DetoxBlock): string {
  const method = methodLabel(block.blockingMethod);
  let value = '';
  switch (block.blockingMethod) {
    case 'duration':
      value = formatDuration(block.durationMinutes);
      break;
    case 'set-hours':
      value =
        block.setHoursStart && block.setHoursEnd
          ? `${block.setHoursStart}–${block.setHoursEnd}`
          : 'Set hours';
      break;
    case 'usage-limit':
      value = `${block.usageLimitMinutes} min/day`;
      break;
    case 'launch-count':
      value = `${block.launchCountMax} opens/day`;
      break;
    case 'location':
      value = block.location ? `±${block.locationRadius}m` : 'no location';
      break;
  }
  return `${method} · ${value}`;
}

interface FormState {
  label: string;
  days: number[];
  blockingMethod: BlockingMethod;
  durationMinutes: number;
  setHoursStart: string;
  setHoursEnd: string;
  usageLimitMinutes: number;
  launchCountMax: number;
  messageId: string;
  customMessage: string;
  snoozeMinutes: number;
  location: { lat: number; lng: number } | null;
  locationRadius: number;
  locationLoading: boolean;
  locationError: string;
}

const EMPTY_FORM: FormState = {
  label: '',
  days: [],
  blockingMethod: 'duration',
  durationMinutes: 30,
  setHoursStart: '',
  setHoursEnd: '',
  usageLimitMinutes: 60,
  launchCountMax: 10,
  messageId: '',
  customMessage: '',
  snoozeMinutes: 0,
  location: null,
  locationRadius: 100,
  locationLoading: false,
  locationError: '',
};

export const BlockCard: React.FC = () => {
  const [blocks, setBlocks] = React.useState<DetoxBlock[]>(blockStore.get().blocks);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [formCustomAudio, setFormCustomAudio] = React.useState<string>(
    () => settingsStore.get().customMessageAudio,
  );

  const {
    isRecording: isRecordingMsg,
    isSupported: hasMic,
    startRecording,
    stopRecording,
    discardRecording,
  } = useAudioRecorder((dataUrl) => {
    setFormCustomAudio(dataUrl);
    settingsStore.set({ customMessageAudio: dataUrl });
  });

  // Preview a message via TTS
  const [previewingSpeech, setPreviewingSpeech] = React.useState(false);
  const previewMessage = (text: string) => {
    const settings = settingsStore.get();
    setPreviewingSpeech(true);
    void speak(text, settings.languageCode).then(() => setPreviewingSpeech(false));
  };
  const stopPreview = () => {
    window.speechSynthesis.cancel();
    setPreviewingSpeech(false);
  };

  React.useEffect(() => {
    return blockStore.subscribe((next) => setBlocks(next.blocks));
  }, []);

  const settings = settingsStore.get();
  const preset = culturalPresets.find((p) => p.cultureCode === settings.cultureCode);

  const openForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const cancelForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const handleCaptureLocation = () => {
    if (!('geolocation' in navigator)) {
      setForm((f) => ({ ...f, locationError: 'Geolocation not supported.' }));
      return;
    }
    setForm((f) => ({ ...f, locationLoading: true, locationError: '' }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          locationLoading: false,
          locationError: '',
        }));
      },
      () => {
        setForm((f) => ({
          ...f,
          locationLoading: false,
          locationError: 'Location permission denied.',
        }));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  };

  const handleSave = () => {
    const block: DetoxBlock = {
      id: crypto.randomUUID(),
      label: form.label.trim(),
      setHoursStart: form.setHoursStart,
      setHoursEnd: form.setHoursEnd,
      durationMinutes: form.durationMinutes,
      usageLimitMinutes: form.usageLimitMinutes,
      launchCountMax: form.launchCountMax,
      days: [...form.days].sort((a, b) => a - b),
      blockingMethod: form.blockingMethod,
      messageId: form.messageId || null,
      customMessage: form.customMessage,
      snoozeMinutes: form.snoozeMinutes,
      active: true,
      location: form.location,
      locationRadius: form.locationRadius,
    };
    const current = blockStore.get();
    blockStore.set({ blocks: [...current.blocks, block] });
    cancelForm();
  };

  const handleDelete = (id: string) => {
    const current = blockStore.get();
    blockStore.set({ blocks: current.blocks.filter((b) => b.id !== id) });
  };

  const handleToggleActive = (id: string) => {
    const current = blockStore.get();
    blockStore.set({
      blocks: current.blocks.map((b) => (b.id === id ? { ...b, active: !b.active } : b)),
    });
  };

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  };

  const selectAllDays = () => {
    setForm((f) => ({
      ...f,
      days: f.days.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6],
    }));
  };

  // Validate save: set-hours requires both times; location requires a saved location
  const canSave =
    (form.blockingMethod !== 'set-hours' ||
      (form.setHoursStart.length > 0 && form.setHoursEnd.length > 0)) &&
    (form.blockingMethod !== 'location' || form.location !== null);

  return (
    <div className="block-card">
      <div className="block-card-header">
        <p className="block-card-label">Detox Blocks</p>
        {!showForm && (
          <button type="button" className="button button-ghost block-add-btn" onClick={openForm}>
            + Add block
          </button>
        )}
      </div>

      {showForm && (
        <div className="block-form">
          {/* 1. Name */}
          <div className="block-form-row">
            <label className="block-form-label" htmlFor="block-label">
              Name
            </label>
            <input
              id="block-label"
              type="text"
              className="block-text-input"
              placeholder="Block name (optional)"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
          </div>

          {/* 2. Days */}
          <div className="block-form-row">
            <span className="block-form-label">Days</span>
            <div className="block-days-picker">
              {DAY_LETTER.map((letter, i) => (
                <button
                  key={i}
                  type="button"
                  className={`block-day-pill${form.days.includes(i) ? ' block-day-pill--active' : ''}`}
                  onClick={() => toggleDay(i)}
                  aria-label={DAY_FULL[i]}
                  aria-pressed={form.days.includes(i)}
                >
                  {letter}
                </button>
              ))}
              <button
                type="button"
                className={`block-day-pill block-day-pill--every${form.days.length === 7 ? ' block-day-pill--active' : ''}`}
                onClick={selectAllDays}
                aria-pressed={form.days.length === 7}
              >
                Every day
              </button>
            </div>
            <p className="block-form-hint">
              {form.days.length === 0
                ? 'No days selected — one-time block (today only)'
                : form.days.length === 7
                ? 'Repeats every day'
                : `Repeats on ${form.days.map((d) => DAY_FULL[d]).join(', ')}`}
            </p>
          </div>

          {/* 3. Blocking method — full-width stacked rows + inline expansion */}
          <div className="block-form-row">
            <span className="block-form-label">Blocking method</span>
            <div className="blocking-method-rows">
              {BLOCKING_METHODS.map((m) => (
                <React.Fragment key={m.id}>
                  <button
                    type="button"
                    className={`blocking-method-row${form.blockingMethod === m.id ? ' blocking-method-row--active' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, blockingMethod: m.id }))}
                    aria-pressed={form.blockingMethod === m.id}
                  >
                    <span className="blocking-method-title">{m.title}</span>
                    <span className="blocking-method-desc">{m.description}</span>
                  </button>

                  {/* Inline expansion — shown immediately below the selected method */}
                  {form.blockingMethod === m.id && (
                    <div className="block-method-expansion">
                      {m.id === 'duration' && (
                        <>
                          <p className="block-method-value-display">{formatDuration(form.durationMinutes)}</p>
                          <input
                            type="range"
                            className="quick-range"
                            min={5}
                            max={120}
                            step={5}
                            value={form.durationMinutes}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))
                            }
                            aria-label="Block duration"
                            aria-valuetext={formatDuration(form.durationMinutes)}
                          />
                        </>
                      )}

                      {m.id === 'set-hours' && (
                        <div className="block-time-row">
                          <span className="block-time-from-label">From</span>
                          <input
                            type="time"
                            className="block-time-input"
                            value={form.setHoursStart}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, setHoursStart: e.target.value }))
                            }
                            aria-label="Start time"
                          />
                          <span className="block-time-sep">to</span>
                          <input
                            type="time"
                            className="block-time-input"
                            value={form.setHoursEnd}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, setHoursEnd: e.target.value }))
                            }
                            aria-label="End time"
                          />
                        </div>
                      )}

                      {m.id === 'usage-limit' && (
                        <>
                          <p className="block-method-value-display">{form.usageLimitMinutes} min/day</p>
                          <p className="block-form-label-sm">Max minutes per day</p>
                          <input
                            type="range"
                            className="quick-range"
                            min={15}
                            max={240}
                            step={15}
                            value={form.usageLimitMinutes}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, usageLimitMinutes: Number(e.target.value) }))
                            }
                            aria-label="Max minutes per day"
                          />
                        </>
                      )}

                      {m.id === 'launch-count' && (
                        <>
                          <p className="block-form-label-sm">Max opens per day</p>
                          <div className="quick-stepper">
                            <button
                              type="button"
                              className="quick-stepper-btn"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  launchCountMax: Math.max(1, f.launchCountMax - 1),
                                }))
                              }
                              aria-label="Decrease"
                            >
                              −
                            </button>
                            <span className="block-method-value-display">{form.launchCountMax}</span>
                            <button
                              type="button"
                              className="quick-stepper-btn"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  launchCountMax: Math.min(50, f.launchCountMax + 1),
                                }))
                              }
                              aria-label="Increase"
                            >
                              +
                            </button>
                          </div>
                        </>
                      )}

                      {m.id === 'location' && (
                        <>
                          <p className="block-form-label-sm">
                            Location block — your phone will remind you when you're at this spot
                          </p>
                          {form.location ? (
                            <p className="block-form-hint" style={{ color: 'var(--accent)' }}>
                              📍 Location saved (±{form.locationRadius}m)
                            </p>
                          ) : (
                            <button
                              type="button"
                              className="button button-ghost"
                              style={{ alignSelf: 'flex-start', fontSize: '0.8rem' }}
                              onClick={handleCaptureLocation}
                              disabled={form.locationLoading}
                            >
                              {form.locationLoading ? 'Getting location…' : 'Use my current location'}
                            </button>
                          )}
                          {form.locationError && (
                            <p style={{ color: '#e53e3e', fontSize: '0.75rem', margin: 0 }}>
                              {form.locationError}
                            </p>
                          )}
                          <p className="block-form-label-sm" style={{ marginTop: '0.5rem' }}>Radius</p>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {LOCATION_RADII.map((r) => (
                              <button
                                key={r}
                                type="button"
                                className={`block-day-pill${form.locationRadius === r ? ' block-day-pill--active' : ''}`}
                                onClick={() => setForm((f) => ({ ...f, locationRadius: r }))}
                              >
                                {r}m
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* 4. Message */}
          <div className="block-form-row">
            <label className="block-form-label" htmlFor="block-message">
              Message
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select
                id="block-message"
                className="select"
                value={form.messageId}
                onChange={(e) => setForm((f) => ({ ...f, messageId: e.target.value }))}
                style={{ flex: 1 }}
              >
                <option value="">Random</option>
                {preset?.messages.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.text.length > 55 ? m.text.slice(0, 52) + '…' : m.text}
                  </option>
                ))}
                <option value="custom">Custom…</option>
              </select>
              {/* TTS preview button for the selected non-custom message */}
              {form.messageId && form.messageId !== 'custom' && (
                <button
                  type="button"
                  onClick={previewingSpeech ? stopPreview : () => {
                    const msg = preset?.messages.find((m) => m.id === form.messageId);
                    if (msg) previewMessage(msg.text);
                  }}
                  aria-label={previewingSpeech ? 'Stop preview' : 'Preview message'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    color: 'var(--text-m, #888)',
                    flexShrink: 0,
                  }}
                >
                  {previewingSpeech ? '■' : '▶'}
                </button>
              )}
            </div>
          </div>

          {form.messageId === 'custom' && (
            <div className="block-form-row">
              <label className="block-form-label" htmlFor="block-custom-message">
                Custom reminder text
              </label>
              <input
                id="block-custom-message"
                type="text"
                className="block-text-input"
                placeholder="Type your reminder…"
                value={form.customMessage}
                onChange={(e) => setForm((f) => ({ ...f, customMessage: e.target.value }))}
              />
              {/* Mic recording */}
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
                    onClick={isRecordingMsg ? stopRecording : () => void startRecording()}
                    aria-label={isRecordingMsg ? 'Stop recording' : 'Record audio message'}
                    style={{
                      background: isRecordingMsg ? '#e53e3e' : 'none',
                      color: isRecordingMsg ? '#fff' : 'inherit',
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
                  {isRecordingMsg && (
                    <span style={{ fontSize: '0.75rem', color: '#e53e3e' }}>Recording…</span>
                  )}
                </div>
              )}
              {/* Recorded audio playback + discard */}
              {formCustomAudio && !isRecordingMsg && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.5rem',
                  }}
                >
                  <audio
                    src={formCustomAudio}
                    controls
                    style={{ height: 28, flex: 1, minWidth: 0 }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      discardRecording();
                      setFormCustomAudio('');
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

          {/* 5. Snooze */}
          <div className="block-form-row">
            <label className="block-form-label" htmlFor="block-snooze">
              Snooze
            </label>
            <select
              id="block-snooze"
              className="select"
              value={form.snoozeMinutes}
              onChange={(e) => setForm((f) => ({ ...f, snoozeMinutes: Number(e.target.value) }))}
            >
              <option value={0}>None</option>
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
            </select>
          </div>

          {/* 6. Save / Cancel */}
          <div className="block-form-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={handleSave}
              disabled={!canSave}
            >
              Save block
            </button>
            <button type="button" className="block-cancel-link" onClick={cancelForm}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {blocks.length > 0 && (
        <ul className="block-list" role="list">
          {blocks.map((block) => (
            <li
              key={block.id}
              className={`block-row${!block.active ? ' block-row--inactive' : ''}`}
            >
              <div className="block-row-left">
                <span className="block-row-time">{blockSummary(block)}</span>
                {block.label ? (
                  <span className="block-row-label" style={{ fontWeight: 600 }}>
                    {block.label}
                  </span>
                ) : (
                  <span
                    className="block-row-label"
                    style={{ color: 'var(--text-m)', fontWeight: 400 }}
                  >
                    {blockAutoDescription(block)}
                  </span>
                )}
                <div className="block-row-meta">
                  {block.days.length === 0 ? (
                    <span className="block-day-tag block-day-tag--once">Once</span>
                  ) : (
                    block.days.map((d) => (
                      <span key={d} className="block-day-tag">
                        {DAY_LETTER[d]}
                      </span>
                    ))
                  )}
                  <span className="block-method-badge">{methodLabel(block.blockingMethod)}</span>
                </div>
              </div>
              <div className="block-row-right">
                <button
                  type="button"
                  className={`block-toggle-btn${block.active ? ' block-toggle-btn--on' : ''}`}
                  onClick={() => handleToggleActive(block.id)}
                  aria-label={block.active ? 'Disable block' : 'Enable block'}
                  aria-pressed={block.active}
                >
                  <span className="block-toggle-track">
                    <span className="block-toggle-thumb" />
                  </span>
                </button>
                <button
                  type="button"
                  className="block-delete-btn"
                  onClick={() => handleDelete(block.id)}
                  aria-label="Delete block"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {blocks.length === 0 && !showForm && (
        <p className="block-hint">No detox blocks scheduled. Add one to get started.</p>
      )}
    </div>
  );
};
