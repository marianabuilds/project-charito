import React from 'react';

interface StrictOverlayProps {
  visible: boolean;
  message: string | null;
  onDismiss: () => void;
}

export const StrictOverlay: React.FC<StrictOverlayProps> = ({
  visible,
  message,
  onDismiss,
}) => {
  if (!visible) return null;

  return (
    <div className="strict-overlay" role="dialog" aria-modal="true" aria-label="Session complete">
      <div className="strict-overlay-content">
        <p className="strict-overlay-label">Session complete</p>
        <p className="strict-overlay-text">
          {message ?? 'Tiempo cumplido. Deja el celular un momento.'}
        </p>
        <button
          type="button"
          className="strict-overlay-button"
          onClick={onDismiss}
        >
          Okay, I will take a break
        </button>
      </div>
    </div>
  );
};
