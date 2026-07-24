import React from 'react';
import { LeafIcon } from './LeafIcon';

const ONBOARDING_KEY = 'charito:onboarded:v1';

function hasOnboarded(): boolean {
  try {
    return Boolean(localStorage.getItem(ONBOARDING_KEY));
  } catch {
    return false;
  }
}

function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, '1');
  } catch {
    // best-effort
  }
}

type OnboardingScreen = 1 | 2 | 3;

export const Onboarding: React.FC = () => {
  const [visible, setVisible] = React.useState(!hasOnboarded());
  const [screen, setScreen] = React.useState<OnboardingScreen>(1);
  const [notifStatus, setNotifStatus] = React.useState<'idle' | 'granted' | 'denied' | 'unsupported'>(() => {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    return 'idle';
  });

  const dismiss = () => {
    markOnboarded();
    setVisible(false);
  };

  const handleAllowNotifications = async () => {
    if (!('Notification' in window)) {
      setNotifStatus('unsupported');
      setScreen(3);
      return;
    }
    if (Notification.permission === 'granted') {
      setNotifStatus('granted');
      setScreen(3);
      return;
    }
    const result = await Notification.requestPermission();
    setNotifStatus(result === 'granted' ? 'granted' : 'denied');
    setScreen(3);
  };

  if (!visible) return null;

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Welcome to Charito">
      <div className="onboarding-container">
        {/* Screen 1 — Welcome */}
        {screen === 1 && (
          <div className="onboarding-screen">
            <div className="onboarding-icon-wrap">
              <LeafIcon size={64} className="onboarding-leaf" />
            </div>
            <h1 className="onboarding-heading">Welcome</h1>
            <p className="onboarding-subtext">
              Charito helps you spend time intentionally — with reminders rooted in your culture.
            </p>
            <button
              type="button"
              className="button button-primary onboarding-btn"
              onClick={() => setScreen(2)}
            >
              Get started →
            </button>
          </div>
        )}

        {/* Screen 2 — Notifications permission */}
        {screen === 2 && (
          <div className="onboarding-screen">
            <h1 className="onboarding-heading">Stay reminded</h1>
            <p className="onboarding-subtext">
              Allow notifications so Charito can reach you at the right moment.
            </p>
            <button
              type="button"
              className="button button-primary onboarding-btn"
              onClick={() => void handleAllowNotifications()}
            >
              {notifStatus === 'granted' ? '✓ Notifications enabled' : 'Allow notifications'}
            </button>
            <button
              type="button"
              className="onboarding-skip-link"
              onClick={() => setScreen(3)}
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Screen 3 — Done */}
        {screen === 3 && (
          <div className="onboarding-screen">
            <h1 className="onboarding-heading">You're all set.</h1>
            <p className="onboarding-subtext">
              Head to Settings to pick your culture and preferred reminders.
            </p>
            <button
              type="button"
              className="button button-primary onboarding-btn"
              onClick={dismiss}
            >
              Open Charito
            </button>
          </div>
        )}

        {/* Dot indicators */}
        <div className="onboarding-dots" aria-hidden="true">
          {([1, 2, 3] as OnboardingScreen[]).map((s) => (
            <span
              key={s}
              className={`onboarding-dot${screen === s ? ' onboarding-dot--active' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
