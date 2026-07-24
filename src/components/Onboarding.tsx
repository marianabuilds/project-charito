import React from 'react';
import { LeafIcon } from './LeafIcon';
import { settingsStore } from '../state/settingsStore';

const ONBOARDING_KEY = 'charito:onboarded:v1';

const GOALS = [
  { id: 'sleep', emoji: '😴', label: 'Sleep', subtext: 'Rest and recharge' },
  { id: 'focus', emoji: '🧠', label: 'Focus', subtext: 'Deep work without distraction' },
  { id: 'presence', emoji: '🫶', label: 'Presence', subtext: 'Be here with the people you love' },
  { id: 'creativity', emoji: '🎨', label: 'Creativity', subtext: 'Space to think and create' },
] as const;

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

type OnboardingScreen = 1 | 2 | 3 | 4 | 5;

export const Onboarding: React.FC = () => {
  const [visible, setVisible] = React.useState(!hasOnboarded());
  const [screen, setScreen] = React.useState<OnboardingScreen>(1);
  const [selectedGoals, setSelectedGoals] = React.useState<string[]>([]);
  const [notifStatus, setNotifStatus] = React.useState<'idle' | 'granted' | 'denied' | 'unsupported'>(() => {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    return 'idle';
  });

  const dismiss = () => {
    markOnboarded();
    setVisible(false);
  };

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const handleGoalsContinue = () => {
    settingsStore.set({ goals: selectedGoals });
    setScreen(3);
  };

  const handleAllowNotifications = async () => {
    if (!('Notification' in window)) {
      setNotifStatus('unsupported');
      setScreen(4);
      return;
    }
    if (Notification.permission === 'granted') {
      setNotifStatus('granted');
      setScreen(4);
      return;
    }
    const result = await Notification.requestPermission();
    setNotifStatus(result === 'granted' ? 'granted' : 'denied');
    setScreen(4);
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
            <input
              type="text"
              className="block-text-input"
              placeholder="What's your name?"
              defaultValue={settingsStore.get().userName}
              onChange={(e) => settingsStore.set({ userName: e.target.value })}
              style={{ marginBottom: '0.75rem' }}
            />
            <button
              type="button"
              className="button button-primary onboarding-btn"
              onClick={() => setScreen(2)}
            >
              Get started →
            </button>
          </div>
        )}

        {/* Screen 2 — Goals */}
        {screen === 2 && (
          <div className="onboarding-screen">
            <h1 className="onboarding-heading">What do you want more of?</h1>
            <p className="onboarding-subtext">
              We'll personalize your reminders around what matters to you.
            </p>
            <div className="onboarding-goals-grid">
              {GOALS.map((goal) => (
                <button
                  key={goal.id}
                  type="button"
                  className={`onboarding-goal-card${selectedGoals.includes(goal.id) ? ' onboarding-goal-card--selected' : ''}`}
                  onClick={() => toggleGoal(goal.id)}
                  aria-pressed={selectedGoals.includes(goal.id)}
                >
                  <span className="onboarding-goal-emoji" aria-hidden="true">{goal.emoji}</span>
                  <span className="onboarding-goal-label">{goal.label}</span>
                  <span className="onboarding-goal-subtext">{goal.subtext}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="button button-primary onboarding-btn"
              onClick={handleGoalsContinue}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Screen 3 — Notifications permission */}
        {screen === 3 && (
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
              onClick={() => setScreen(4)}
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Screen 4 — Pricing */}
        {screen === 4 && (
          <div className="onboarding-screen">
            <h1 className="onboarding-heading">Free to start</h1>
            <p className="onboarding-subtext">
              Charito is free to download and use. When you're ready, a premium plan unlocks
              unlimited detox blocks, session history, weekly digests, and advanced blocking methods.
            </p>
            <p className="onboarding-subtext" style={{ fontWeight: 600, color: 'var(--text-h)' }}>
              No charge today. You'll only be asked to subscribe when you hit the free-tier limit (3 detox blocks).
            </p>

            {/* Pricing card */}
            <div className="pricing-card">
              <div className="pricing-tier">
                <div className="pricing-tier-header">
                  <span className="pricing-tier-name">Free</span>
                </div>
                <ul className="pricing-tier-features">
                  <li>3 detox blocks</li>
                  <li>Core reminders</li>
                  <li>1 culture preset</li>
                </ul>
              </div>
              <div className="pricing-tier pricing-tier--premium">
                <div className="pricing-tier-header">
                  <span className="pricing-tier-name">Premium</span>
                  <span className="pricing-tier-price">$2.99/mo</span>
                </div>
                <ul className="pricing-tier-features">
                  <li>Unlimited blocks</li>
                  <li>All cultures</li>
                  <li>Session history</li>
                  <li>Weekly digest</li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              className="button button-primary onboarding-btn"
              onClick={() => setScreen(5)}
            >
              Continue
            </button>
            <p className="onboarding-billing-note">
              You can manage billing anytime in Settings.
            </p>
          </div>
        )}

        {/* Screen 5 — Done */}
        {screen === 5 && (
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
          {([1, 2, 3, 4, 5] as OnboardingScreen[]).map((s) => (
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
