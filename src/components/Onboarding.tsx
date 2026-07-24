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

type MicStatus = 'idle' | 'granted' | 'denied' | 'coming-soon';

export const Onboarding: React.FC = () => {
  const [visible, setVisible] = React.useState(!hasOnboarded());
  const [screen, setScreen] = React.useState<OnboardingScreen>(1);
  const [selectedGoals, setSelectedGoals] = React.useState<string[]>([]);

  // Permission states
  const [notifStatus, setNotifStatus] = React.useState<'idle' | 'granted' | 'denied' | 'unsupported'>(() => {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    return 'idle';
  });
  const [appUsageStatus, setAppUsageStatus] = React.useState<'idle' | 'coming-soon'>('idle');
  const [micStatus, setMicStatus] = React.useState<MicStatus>('idle');

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
      return;
    }
    if (Notification.permission === 'granted') {
      setNotifStatus('granted');
      return;
    }
    const result = await Notification.requestPermission();
    setNotifStatus(result === 'granted' ? 'granted' : 'denied');
  };

  const handleAppUsage = () => {
    alert('App usage access requires native app permissions. This feature is coming in the mobile app.');
    setAppUsageStatus('coming-soon');
  };

  const handleMic = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus('granted');
    } catch {
      setMicStatus('denied');
    }
  };

  if (!visible) return null;

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Welcome to Charito">
      <div className="onboarding-container">

        {/* Screen 1 — Welcome */}
        {screen === 1 && (
          <div className="onboarding-screen">
            {/* Decorative leaf cluster */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ opacity: 0.6, display: 'flex' }}><LeafIcon size={32} className="onboarding-leaf" /></span>
              <LeafIcon size={48} className="onboarding-leaf" />
              <span style={{ opacity: 0.6, display: 'flex' }}><LeafIcon size={32} className="onboarding-leaf" /></span>
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
            <button
              type="button"
              className="onboarding-back-btn"
              onClick={() => setScreen(1)}
            >
              ←
            </button>
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

        {/* Screen 3 — How it works */}
        {screen === 3 && (
          <div className="onboarding-screen">
            <button
              type="button"
              className="onboarding-back-btn"
              onClick={() => setScreen(2)}
            >
              ←
            </button>
            <h1 className="onboarding-heading">How Charito works</h1>
            <div className="onboarding-steps">
              <div className="onboarding-step">
                <span className="onboarding-step-number">1</span>
                <div>
                  <p className="onboarding-step-title">Set your intention</p>
                  <p className="onboarding-step-desc">Choose when and how long to step away. Pick your culture's voice.</p>
                </div>
              </div>
              <div className="onboarding-step">
                <span className="onboarding-step-number">2</span>
                <div>
                  <p className="onboarding-step-title">Stay accountable</p>
                  <p className="onboarding-step-desc">If you open a blocked app during a detox, Charito charges $1 toward the app. No judgment — just a gentle cost.</p>
                </div>
              </div>
              <div className="onboarding-step">
                <span className="onboarding-step-number">3</span>
                <div>
                  <p className="onboarding-step-title">Track your growth</p>
                  <p className="onboarding-step-desc">See your patterns. Reclaim your time, one block at a time.</p>
                </div>
              </div>
            </div>
            <p className="onboarding-billing-note">
              Charges are processed securely. No payment info needed to start your free blocks.
            </p>
            <button
              type="button"
              className="button button-primary onboarding-btn"
              onClick={() => setScreen(4)}
            >
              Understood →
            </button>
          </div>
        )}

        {/* Screen 4 — Permissions */}
        {screen === 4 && (
          <div className="onboarding-screen">
            <button
              type="button"
              className="onboarding-back-btn"
              onClick={() => setScreen(3)}
            >
              ←
            </button>
            <h1 className="onboarding-heading">A few permissions</h1>
            <p className="onboarding-subtext">
              Charito works best with these enabled. You can change them anytime in Settings.
            </p>
            <div className="onboarding-permissions">
              {/* Notifications */}
              <button
                type="button"
                className="onboarding-permission-row"
                onClick={() => void handleAllowNotifications()}
                disabled={notifStatus === 'granted' || notifStatus === 'unsupported'}
              >
                <span className="onboarding-permission-icon" aria-hidden="true">🔔</span>
                <div className="onboarding-permission-text">
                  <span className="onboarding-permission-title">Notifications</span>
                  <span className="onboarding-permission-desc">Get reminded when a block is active</span>
                </div>
                <span className="onboarding-permission-action">
                  {notifStatus === 'granted' ? '✓' : 'Allow →'}
                </span>
              </button>

              {/* App usage */}
              <button
                type="button"
                className="onboarding-permission-row"
                onClick={handleAppUsage}
                disabled={appUsageStatus === 'coming-soon'}
              >
                <span className="onboarding-permission-icon" aria-hidden="true">📊</span>
                <div className="onboarding-permission-text">
                  <span className="onboarding-permission-title">App usage data</span>
                  <span className="onboarding-permission-desc">See which apps you use most, so we can suggest smarter blocks</span>
                </div>
                <span className="onboarding-permission-action">
                  {appUsageStatus === 'coming-soon'
                    ? <span style={{ fontSize: '0.7rem', color: 'var(--text-m)', fontStyle: 'italic' }}>Coming in app</span>
                    : 'Allow →'}
                </span>
              </button>

              {/* Microphone */}
              <button
                type="button"
                className="onboarding-permission-row"
                onClick={() => void handleMic()}
                disabled={micStatus === 'granted'}
              >
                <span className="onboarding-permission-icon" aria-hidden="true">🎤</span>
                <div className="onboarding-permission-text">
                  <span className="onboarding-permission-title">Microphone</span>
                  <span className="onboarding-permission-desc">Record your own voice reminders</span>
                </div>
                <span className="onboarding-permission-action">
                  {micStatus === 'granted' ? '✓' : micStatus === 'denied' ? '—' : 'Allow →'}
                </span>
              </button>
            </div>

            <button
              type="button"
              className="button button-primary onboarding-btn"
              onClick={() => setScreen(5)}
            >
              Continue →
            </button>
            <button
              type="button"
              className="onboarding-skip-link"
              onClick={() => setScreen(5)}
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Screen 5 — Done */}
        {screen === 5 && (
          <div className="onboarding-screen">
            <button
              type="button"
              className="onboarding-back-btn"
              onClick={() => setScreen(4)}
            >
              ←
            </button>
            <h1 className="onboarding-heading">You're all set.</h1>
            <p className="onboarding-subtext">
              Head to Settings to pick your culture and preferred reminders.
            </p>
            <button
              type="button"
              className="button button-primary onboarding-btn"
              onClick={dismiss}
            >
              Let's go
            </button>
          </div>
        )}

        {/* Dot indicators — 5 dots */}
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
