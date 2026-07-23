import React from 'react';
import { settingsStore } from '../state/settingsStore';

export const DurationPicker: React.FC = () => {
  const [duration, setDuration] = React.useState(
    settingsStore.get().durationMinutes,
  );

  React.useEffect(() => {
    return settingsStore.subscribe((next) => setDuration(next.durationMinutes));
  }, []);

  const handleChange = (value: number) => {
    settingsStore.set({ durationMinutes: value });
  };

  return (
    <label className="field">
      <span className="field-label">Session length (minutes)</span>
      <input
        type="range"
        min={5}
        max={120}
        step={5}
        value={duration}
        onChange={(e) => handleChange(Number(e.target.value))}
        aria-valuenow={duration}
        aria-valuemin={5}
        aria-valuemax={120}
      />
      <span className="duration-value">{duration} min</span>
    </label>
  );
};
