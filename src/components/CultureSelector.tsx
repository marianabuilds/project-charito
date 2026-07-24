import React from 'react';
import { culturalPresets } from '../data/culturalPresets';
import { settingsStore } from '../state/settingsStore';

export const CultureSelector: React.FC = () => {
  const [cultureCode, setCultureCode] = React.useState(
    settingsStore.get().cultureCode,
  );

  React.useEffect(() => {
    return settingsStore.subscribe((next) => setCultureCode(next.cultureCode));
  }, []);

  const handleChange = (value: string) => {
    const preset = culturalPresets.find((p) => p.cultureCode === value);
    if (!preset) return;
    settingsStore.set({
      cultureCode: preset.cultureCode,
      languageCode: preset.languageCode,
      selectedMessageId: null,
    });
  };

  return (
    <label className="field">
      <span className="field-label">Culture / region</span>
      <select
        className="select"
        value={cultureCode}
        onChange={(e) => handleChange(e.target.value)}
      >
        {culturalPresets.map((preset) => (
          <option key={preset.id} value={preset.cultureCode}>
            {preset.label}
          </option>
        ))}
      </select>
    </label>
  );
};
