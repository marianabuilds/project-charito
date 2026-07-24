import React from 'react';
import { speak } from '../services/audioEngine';
import { settingsStore } from '../state/settingsStore';

interface AudioMessageRowProps {
  /** The full message text to display and preview via TTS */
  text: string;
  /** radio group name */
  name: string;
  /** radio value */
  value: string;
  checked: boolean;
  onChange: () => void;
  className?: string;
  textClassName?: string;
}

/**
 * A message selection row (radio + text) with a small ▶/■ TTS preview button.
 */
export const AudioMessageRow: React.FC<AudioMessageRowProps> = ({
  text,
  name,
  value,
  checked,
  onChange,
  className = 'message-option',
  textClassName,
}) => {
  const [speaking, setSpeaking] = React.useState(false);

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const settings = settingsStore.get();
    setSpeaking(true);
    void speak(text, settings.languageCode).then(() => setSpeaking(false));
  };

  const handleStop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <label
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />
      <span className={textClassName} style={{ flex: 1 }}>
        {text}
      </span>
      <button
        type="button"
        onClick={speaking ? handleStop : handlePlay}
        aria-label={speaking ? 'Stop preview' : 'Preview message'}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 4px',
          fontSize: '0.75rem',
          lineHeight: 1,
          color: 'var(--text-m, #888)',
          flexShrink: 0,
        }}
      >
        {speaking ? '■' : '▶'}
      </button>
    </label>
  );
};
