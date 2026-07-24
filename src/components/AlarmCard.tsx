import React from 'react';
import { alarmStore } from '../state/alarmStore';
import type { AlarmEntry } from '../state/alarmStore';
import { settingsStore } from '../state/settingsStore';
import { culturalPresets } from '../data/culturalPresets';

const DAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDisplayTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

interface FormState {
  time: string;
  days: number[];
  messageId: string;
  customMessage: string;
  snoozeMinutes: number;
  label: string;
}

const EMPTY_FORM: FormState = {
  time: '',
  days: [],
  messageId: '',
  customMessage: '',
  snoozeMinutes: 0,
  label: '',
};

export const AlarmCard: React.FC = () => {
  const [alarms, setAlarms] = React.useState<AlarmEntry[]>(
    alarmStore.get().alarms,
  );
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);

  React.useEffect(() => {
    return alarmStore.subscribe((next) => setAlarms(next.alarms));
  }, []);

  const settings = settingsStore.get();
  const preset = culturalPresets.find(
    (p) => p.cultureCode === settings.cultureCode,
  );

  const openForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const cancelForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!form.time) return;
    const entry: AlarmEntry = {
      id: crypto.randomUUID(),
      time: form.time,
      days: [...form.days].sort((a, b) => a - b),
      messageId: form.messageId || null,
      customMessage: form.customMessage,
      snoozeMinutes: form.snoozeMinutes,
      label: form.label.trim(),
      active: true,
    };
    const current = alarmStore.get();
    alarmStore.set({ alarms: [...current.alarms, entry] });
    cancelForm();
  };

  const handleDelete = (id: string) => {
    const current = alarmStore.get();
    alarmStore.set({ alarms: current.alarms.filter((a) => a.id !== id) });
  };

  const handleToggleActive = (id: string) => {
    const current = alarmStore.get();
    alarmStore.set({
      alarms: current.alarms.map((a) =>
        a.id === id ? { ...a, active: !a.active } : a,
      ),
    });
  };

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day)
        ? f.days.filter((d) => d !== day)
        : [...f.days, day],
    }));
  };

  return (
    <div className="alarm-card-v2">
      <div className="alarm-card-v2-header">
        <p className="alarm-card-label">Alarms</p>
        {!showForm && (
          <button
            type="button"
            className="button button-ghost alarm-add-btn"
            onClick={openForm}
          >
            + Add alarm
          </button>
        )}
      </div>

      {showForm && (
        <div className="alarm-form">
          {/* Time */}
          <div className="alarm-form-row">
            <label className="alarm-form-label" htmlFor="alarm-time">
              Time
            </label>
            <input
              id="alarm-time"
              type="time"
              className="alarm-time-input"
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
            />
          </div>

          {/* Days */}
          <div className="alarm-form-row">
            <span className="alarm-form-label">Repeat</span>
            <div className="alarm-days-picker">
              {DAY_SHORT.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  className={`alarm-day-pill${form.days.includes(i) ? ' alarm-day-pill--active' : ''}`}
                  onClick={() => toggleDay(i)}
                  aria-label={DAY_FULL[i]}
                  aria-pressed={form.days.includes(i)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="alarm-form-hint">
              {form.days.length === 0
                ? 'No days selected — fires once today'
                : `Repeats on ${form.days.map((d) => DAY_SHORT[d]).join(', ')}`}
            </p>
          </div>

          {/* Message */}
          <div className="alarm-form-row">
            <label className="alarm-form-label" htmlFor="alarm-message">
              Message
            </label>
            <select
              id="alarm-message"
              className="select"
              value={form.messageId}
              onChange={(e) =>
                setForm((f) => ({ ...f, messageId: e.target.value }))
              }
            >
              <option value="">Random</option>
              {preset?.messages.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.text.length > 55 ? m.text.slice(0, 52) + '…' : m.text}
                </option>
              ))}
              <option value="custom">Custom…</option>
            </select>
          </div>

          {form.messageId === 'custom' && (
            <div className="alarm-form-row">
              <label
                className="alarm-form-label"
                htmlFor="alarm-custom-message"
              >
                Custom reminder text
              </label>
              <input
                id="alarm-custom-message"
                type="text"
                className="alarm-time-input"
                placeholder="Type your reminder…"
                value={form.customMessage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, customMessage: e.target.value }))
                }
              />
            </div>
          )}

          {/* Snooze */}
          <div className="alarm-form-row">
            <label className="alarm-form-label" htmlFor="alarm-snooze">
              Snooze
            </label>
            <select
              id="alarm-snooze"
              className="select"
              value={form.snoozeMinutes}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  snoozeMinutes: Number(e.target.value),
                }))
              }
            >
              <option value={0}>No snooze</option>
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
            </select>
          </div>

          {/* Label */}
          <div className="alarm-form-row">
            <label className="alarm-form-label" htmlFor="alarm-label">
              Label{' '}
              <span style={{ fontWeight: 400, color: 'var(--text-m)' }}>
                (optional)
              </span>
            </label>
            <input
              id="alarm-label"
              type="text"
              className="alarm-time-input"
              placeholder="e.g. Morning detox"
              value={form.label}
              onChange={(e) =>
                setForm((f) => ({ ...f, label: e.target.value }))
              }
            />
          </div>

          <div className="alarm-form-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={handleSave}
              disabled={!form.time}
            >
              Save alarm
            </button>
            <button
              type="button"
              className="button button-ghost"
              onClick={cancelForm}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {alarms.length > 0 && (
        <ul className="alarm-list" role="list">
          {alarms.map((alarm) => (
            <li
              key={alarm.id}
              className={`alarm-row${!alarm.active ? ' alarm-row--inactive' : ''}`}
            >
              <div className="alarm-row-left">
                <span className="alarm-row-time">
                  {formatDisplayTime(alarm.time)}
                </span>
                {alarm.label && (
                  <span className="alarm-row-label">{alarm.label}</span>
                )}
                <div className="alarm-row-days">
                  {alarm.days.length === 0 ? (
                    <span className="alarm-day-tag alarm-day-tag--once">
                      Once
                    </span>
                  ) : (
                    alarm.days.map((d) => (
                      <span key={d} className="alarm-day-tag">
                        {DAY_SHORT[d]}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="alarm-row-right">
                <button
                  type="button"
                  className={`alarm-toggle-btn${alarm.active ? ' alarm-toggle-btn--on' : ''}`}
                  onClick={() => handleToggleActive(alarm.id)}
                  aria-label={alarm.active ? 'Disable alarm' : 'Enable alarm'}
                  aria-pressed={alarm.active}
                >
                  <span className="alarm-toggle-track">
                    <span className="alarm-toggle-thumb" />
                  </span>
                </button>
                <button
                  type="button"
                  className="alarm-delete-btn"
                  onClick={() => handleDelete(alarm.id)}
                  aria-label="Delete alarm"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {alarms.length === 0 && !showForm && (
        <p className="alarm-hint">
          No alarms set. App must be open to trigger.
        </p>
      )}
    </div>
  );
};
