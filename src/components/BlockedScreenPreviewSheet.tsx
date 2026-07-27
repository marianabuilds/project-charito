import React from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { culturalPresets } from '../data/culturalPresets';
import { settingsStore } from '../state/settingsStore';
import type { DetoxSettings } from '../types/settings';
import { AppBlocker } from '../plugins/AppBlocker';
import { LeafIcon } from './LeafIcon';

const isAndroid = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

function resolveReminderText(settings: DetoxSettings): string {
  if (settings.selectedMessageId) {
    const custom = settings.customMessages.find((m) => m.id === settings.selectedMessageId);
    if (custom?.text) return custom.text;
    const preset = culturalPresets.find((p) => p.cultureCode === settings.cultureCode);
    const msg = preset?.messages.find((m) => m.id === settings.selectedMessageId);
    if (msg?.text) return msg.text;
  }
  const preset = culturalPresets.find((p) => p.cultureCode === settings.cultureCode);
  return (
    preset?.messages[0]?.text ??
    'You set this block intentionally. This moment is yours.'
  );
}

function reminderSummary(settings: DetoxSettings): string {
  if (!settings.selectedMessageId) return 'Random from your culture';
  const custom = settings.customMessages.find((m) => m.id === settings.selectedMessageId);
  if (custom) return custom.label || custom.text.slice(0, 40);
  const preset = culturalPresets.find((p) => p.cultureCode === settings.cultureCode);
  const msg = preset?.messages.find((m) => m.id === settings.selectedMessageId);
  if (msg) {
    return msg.text.length > 48 ? `${msg.text.slice(0, 45)}…` : msg.text;
  }
  return 'Your selected reminder';
}

interface BlockedScreenPreviewSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Android-style bottom sheet: customize what the native blocked-app screen uses,
 * then preview it (native BlockedOverlayActivity on device; web mock in browser).
 */
export const BlockedScreenPreviewSheet: React.FC<BlockedScreenPreviewSheetProps> = ({
  open,
  onClose,
}) => {
  const [settings, setSettings] = React.useState<DetoxSettings>(() => settingsStore.get());
  const [webPreview, setWebPreview] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    return settingsStore.subscribe(setSettings);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setWebPreview(false);
      setError(null);
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const reminderText = resolveReminderText(settings);
  const sampleApp = 'Instagram';

  const handlePreview = async () => {
    setError(null);
    if (!isAndroid()) {
      setWebPreview(true);
      return;
    }
    setBusy(true);
    try {
      await AppBlocker.previewBlockedScreen({
        reminderText,
        appName: sampleApp,
      });
      onClose();
    } catch {
      setError('Could not open the native preview. Rebuild the Android app if this method is missing.');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <>
      <div
        className="bottom-sheet-overlay"
        role="presentation"
        onClick={onClose}
      >
        <div
          className="bottom-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Blocked screen preview"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bottom-sheet-handle" aria-hidden="true" />
          <div className="bottom-sheet-header">
            <div>
              <h2 className="bottom-sheet-title">Blocked screen</h2>
              <p className="bottom-sheet-subtitle">
                What other apps see during a detox — Charito itself stays open.
              </p>
            </div>
            <button
              type="button"
              className="bottom-sheet-close"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="bottom-sheet-body blocked-preview-sheet-body">
            <div className="blocked-preview-meta">
              <p className="blocked-preview-meta-label">Reminder message</p>
              <p className="blocked-preview-meta-value">{reminderSummary(settings)}</p>
              <p className="blocked-preview-meta-hint">
                Change this above under Reminder message. Your selected voice speaks it on the blocked screen.
              </p>
            </div>

            <div className="blocked-preview-meta">
              <p className="blocked-preview-meta-label">Sample app</p>
              <p className="blocked-preview-meta-value">{sampleApp}</p>
              <p className="blocked-preview-meta-hint">
                On device this opens the native full-screen overlay used when a blocked app is opened.
              </p>
            </div>

            {error && (
              <p className="blocked-preview-error" role="alert">{error}</p>
            )}
          </div>

          <div className="bottom-sheet-footer">
            <button
              type="button"
              className="button button-primary"
              onClick={() => void handlePreview()}
              disabled={busy}
            >
              {busy ? 'Opening…' : 'Preview blocked screen'}
            </button>
          </div>
        </div>
      </div>

      {webPreview && (
        <div
          className="blocked-web-preview"
          role="dialog"
          aria-modal="true"
          aria-label="Blocked screen web preview"
        >
          <div className="blocked-web-preview-inner">
            <div className="blocked-web-preview-icon" aria-hidden="true">
              {sampleApp.charAt(0)}
            </div>
            <p className="active-block-eyebrow">Preview · Disabled during detox</p>
            <div className="blocked-web-preview-brand">
              <LeafIcon size={20} />
              <span>Charito</span>
            </div>
            <p className="active-block-eyebrow">Taking a breath</p>
            <h1 className="active-block-title">{sampleApp} is paused</h1>
            <p className="active-block-sub">
              This is what blocked apps look like during a detox.
              Your reminder message is spoken aloud on Android.
            </p>
            <p className="active-block-message">
              <em>&ldquo;{reminderText}&rdquo;</em>
            </p>
            <p className="blocked-preview-meta-hint" style={{ marginTop: '0.5rem' }}>
              Preview — not a live block
            </p>
            <button
              type="button"
              className="button button-primary"
              style={{ marginTop: '1.25rem', width: '100%', maxWidth: '18rem' }}
              onClick={() => setWebPreview(false)}
            >
              Close preview
            </button>
            <p className="active-block-home-hint">
              On Android this uses the native BlockedOverlayActivity.
            </p>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
};
