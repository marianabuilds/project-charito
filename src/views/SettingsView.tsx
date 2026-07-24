import React from 'react';
import { CultureSelector } from '../components/CultureSelector';
import { ModeToggle } from '../components/ModeToggle';
import { MessageSelector } from '../components/MessageSelector';

const StatsCard: React.FC = () => (
  <div className="stats-card card">
    <p className="card-label">Your stats</p>
    <div className="stats-placeholder">
      <span className="stats-icon" aria-hidden="true">📊</span>
      <p className="stats-placeholder-title">Session history &amp; streaks</p>
      <p className="stats-placeholder-body">
        Coming in a future update — we'll track your detox sessions, build streaks,
        and show your progress over time.
      </p>
    </div>
  </div>
);

type NotifStatus = 'idle' | 'granted' | 'denied' | 'unsupported';

const PermissionsSection: React.FC = () => {
  const [notifStatus, setNotifStatus] = React.useState<NotifStatus>(() => {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return 'idle';
  });

  const [audioStatus, setAudioStatus] = React.useState<'idle' | 'available' | 'unavailable'>(() => {
    if (!('speechSynthesis' in window)) return 'unavailable';
    return 'idle';
  });

  const [dataConfirm, setDataConfirm] = React.useState(false);
  const [dataCleared, setDataCleared] = React.useState(false);

  const handleNotifClick = async () => {
    if (!('Notification' in window)) {
      setNotifStatus('unsupported');
      return;
    }
    if (Notification.permission === 'granted') {
      setNotifStatus('granted');
      return;
    }
    const result = await Notification.requestPermission();
    if (result === 'granted') setNotifStatus('granted');
    else setNotifStatus('denied');
  };

  const handleAudioClick = () => {
    if (!('speechSynthesis' in window)) {
      setAudioStatus('unavailable');
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    setAudioStatus(voices.length > 0 ? 'available' : 'unavailable');
  };

  const handleClearData = () => {
    localStorage.clear();
    setDataCleared(true);
    setDataConfirm(false);
    // Reload to reset app state
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <div className="permissions-section">
      <p className="permissions-section-title">PERMISSIONS</p>

      {/* Notifications row */}
      <div
        className="permissions-row"
        role="button"
        tabIndex={0}
        onClick={() => void handleNotifClick()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') void handleNotifClick();
        }}
        aria-label="Notifications permission"
      >
        <div className="permissions-row-left">
          <span className="permissions-row-label">Notifications</span>
          <span className="permissions-row-desc">Allow reminders to reach you</span>
        </div>
        <div className="permissions-row-right">
          {notifStatus === 'granted' && (
            <span className="permissions-badge permissions-badge--on">Enabled</span>
          )}
          {notifStatus === 'denied' && (
            <span className="permissions-badge permissions-badge--off">
              Open Settings ↗
            </span>
          )}
          {notifStatus === 'unsupported' && (
            <span className="permissions-badge permissions-badge--muted">Not supported</span>
          )}
          {notifStatus === 'idle' && (
            <span className="permissions-arrow">›</span>
          )}
        </div>
      </div>
      {notifStatus === 'denied' && (
        <p className="permissions-hint">
          Tap to enable in your browser or device settings.
        </p>
      )}

      {/* Voice & audio row */}
      <div
        className="permissions-row"
        role="button"
        tabIndex={0}
        onClick={handleAudioClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleAudioClick();
        }}
        aria-label="Voice and audio permission"
      >
        <div className="permissions-row-left">
          <span className="permissions-row-label">Voice &amp; audio</span>
          <span className="permissions-row-desc">Enable spoken reminders</span>
        </div>
        <div className="permissions-row-right">
          {audioStatus === 'available' && (
            <span className="permissions-badge permissions-badge--on">Available</span>
          )}
          {audioStatus === 'unavailable' && (
            <span className="permissions-badge permissions-badge--off">Not available in this browser</span>
          )}
          {audioStatus === 'idle' && (
            <span className="permissions-arrow">›</span>
          )}
        </div>
      </div>

      {/* Data & storage row */}
      <div className="permissions-row permissions-row--data">
        {!dataConfirm && !dataCleared ? (
          <>
            <div className="permissions-row-left">
              <span className="permissions-row-label">Data &amp; storage</span>
              <span className="permissions-row-desc">Manage app data</span>
            </div>
            <div className="permissions-row-right">
              <button
                type="button"
                className="permissions-clear-btn"
                onClick={() => setDataConfirm(true)}
              >
                Clear data ›
              </button>
            </div>
          </>
        ) : dataCleared ? (
          <p className="permissions-row-desc">Data cleared. Reloading…</p>
        ) : (
          <div className="permissions-confirm-inline">
            <span className="permissions-row-desc">Are you sure?</span>
            <button
              type="button"
              className="permissions-confirm-btn permissions-confirm-btn--danger"
              onClick={handleClearData}
            >
              Clear data
            </button>
            <button
              type="button"
              className="permissions-confirm-btn"
              onClick={() => setDataConfirm(false)}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const SettingsView: React.FC = () => {
  const handleRevisitOnboarding = () => {
    try {
      localStorage.removeItem('charito:onboarded:v1');
    } catch {
      // best-effort
    }
    window.location.reload();
  };

  return (
    <div className="view">
      <header className="app-header">
        <p className="app-badge">Settings</p>
        <h1 className="app-title">Your preferences</h1>
        <p className="app-subtitle">
          Choose your culture, reminder style, and the phrases Charito will speak.
        </p>
      </header>

      <StatsCard />

      <div className="settings-form card">
        <CultureSelector />
        <ModeToggle />
        <MessageSelector />
      </div>

      <PermissionsSection />

      <div className="permissions-section">
        <p className="permissions-section-title">ACCOUNT</p>
        <div className="permissions-row">
          <div className="permissions-row-left">
            <button
              type="button"
              className="button button-ghost"
              style={{ width: '100%', textAlign: 'left' }}
              onClick={handleRevisitOnboarding}
            >
              Revisit onboarding
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
