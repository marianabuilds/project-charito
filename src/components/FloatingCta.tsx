import React from 'react';
import { createPortal } from 'react-dom';

interface FloatingCtaProps {
  /** Primary button label */
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Optional secondary text button under/beside primary (e.g. Cancel) */
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
  /** Accessible name for the bar */
  ariaLabel?: string;
}

/**
 * Fixed primary CTA above the bottom tab bar.
 * Use for main actions: Start block, Save block, etc.
 */
export const FloatingCta: React.FC<FloatingCtaProps> = ({
  label,
  onClick,
  disabled = false,
  secondaryLabel,
  onSecondaryClick,
  ariaLabel,
}) => {
  // Reserve scroll space so content (e.g. Schedule a block) isn't covered
  React.useEffect(() => {
    document.body.classList.add('has-floating-cta');
    return () => {
      document.body.classList.remove('has-floating-cta');
    };
  }, []);

  const node = (
    <div className="floating-cta-bar" role="region" aria-label={ariaLabel ?? label}>
      <div className="floating-cta-inner">
        <button
          type="button"
          className="button button-primary floating-cta-btn"
          onClick={onClick}
          disabled={disabled}
        >
          {label}
        </button>
        {secondaryLabel && onSecondaryClick && (
          <button
            type="button"
            className="floating-cta-secondary"
            onClick={onSecondaryClick}
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return node;
  return createPortal(node, document.body);
};
