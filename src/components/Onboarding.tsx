import React from 'react';
import { LeafIcon } from './LeafIcon';
import { settingsStore } from '../state/settingsStore';
import type { DetoxIntensity } from '../types/settings';

const ONBOARDING_KEY = 'charito:onboarded:v1';

const GOALS = [
  { id: 'sleep',      emoji: '😴', label: 'Sleep',      subtext: 'Rest and recharge' },
  { id: 'focus',      emoji: '🧠', label: 'Focus',      subtext: 'Deep work without distraction' },
  { id: 'presence',   emoji: '🫶', label: 'Presence',   subtext: 'Be here with the people you love' },
  { id: 'creativity', emoji: '🎨', label: 'Creativity', subtext: 'Space to think and create' },
] as const;

const BENEFIT_PILLS = [
  '🧘 Less stress',
  '😴 Better sleep',
  '🎯 More focus',
  '🌿 More presence',
  '📵 Real breaks',
];

const HOW_IT_WORKS = [
  {
    emoji: '📵',
    title: 'Set a detox block',
    body: "Choose a duration and which apps to pause. One tap \u2014 you're offline.",
  },
  {
    emoji: '🔊',
    title: 'Audio reminders',
    body: "Charito speaks to you in your culture's language. Gentle. Personal. Real.",
  },
  {
    emoji: '💸',
    title: '$1 accountability rule',
    body: "Break your schedule? A $1 charge goes toward the app \u2014 a light nudge, not a punishment.",
  },
];

function hasOnboarded(): boolean {
  try { return Boolean(localStorage.getItem(ONBOARDING_KEY)); } catch { return false; }
}

function markOnboarded(): void {
  try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
}

const DETOX_STYLES: { id: DetoxIntensity; emoji: string; label: string; description: string }[] = [
  { id: 'light',    emoji: '🌱', label: 'Light',    description: 'Gentle nudges. Reminders, soft limits.' },
  { id: 'moderate', emoji: '🌿', label: 'Moderate', description: 'Smart blocks, real limits. The default.' },
  { id: 'deep',     emoji: '🌳', label: 'Deep',     description: 'Strict blocks. Accountability mode.' },
];

type OnboardingScreen = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type MicStatus = 'idle' | 'granted' | 'denied';

export const Onboarding: React.FC = () => {
  const [visible, setVisible] = React.useState(!hasOnboarded());
  const [screen, setScreen] = React.useState<OnboardingScreen>(1);
  const [selectedGoals, setSelectedGoals] = React.useState<string[]>([]);
  const [detoxIntensity, setDetoxIntensity] = React.useState<DetoxIntensity>('moderate');
  const [navDirection, setNavDirection] = React.useState<'forward' | 'back' | null>(null);
  const touchStartX = React.useRef<number | null>(null);

  // Live preview countdown
  const [previewSecs, setPreviewSecs] = React.useState(90);
  const [previewRunning, setPreviewRunning] = React.useState(false);

  // Permission states
  const [notifStatus, setNotifStatus] = React.useState<'idle' | 'granted' | 'denied' | 'unsupported'>(() => {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    return 'idle';
  });
  const [appUsageStatus, setAppUsageStatus] = React.useState<'idle' | 'coming-soon'>('idle');
  const [micStatus, setMicStatus] = React.useState<MicStatus>('idle');

  const goToScreen = (next: OnboardingScreen, direction: 'forward' | 'back') => {
    setNavDirection(direction);
    setScreen(next);
    // Reset direction after animation completes
    const t = setTimeout(() => setNavDirection(null), 300);
    return () => clearTimeout(t);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (deltaX > 50 && screen > 1) {
      goToScreen((screen - 1) as OnboardingScreen, 'back');
    } else if (deltaX < -50 && screen < 8) {
      goToScreen((screen + 1) as OnboardingScreen, 'forward');
    }
  };

  const dismiss = () => { markOnboarded(); setVisible(false); };

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const handleGoalsContinue = () => {
    settingsStore.set({ goals: selectedGoals });
    setScreen(4);
  };

  const handleDetoxStyleContinue = () => {
    settingsStore.set({ detoxIntensity });
    setScreen(5);
  };

  const handleAllowNotifications = async () => {
    if (!('Notification' in window)) { setNotifStatus('unsupported'); return; }
    if (Notification.permission === 'granted') { setNotifStatus('granted'); return; }
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

  // Live preview timer — start when entering screen 6
  React.useEffect(() => {
    if (screen === 6) {
      setPreviewSecs(90);
      setPreviewRunning(true);
    } else {
      setPreviewRunning(false);
    }
  }, [screen]);

  React.useEffect(() => {
    if (!previewRunning) return;
    if (previewSecs <= 0) { setPreviewRunning(false); return; }
    const t = setTimeout(() => setPreviewSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [previewRunning, previewSecs]);

  const formatPreview = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (!visible) return null;

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Welcome to Charito">
      <div
        className="onboarding-container"
        data-direction={navDirection ?? undefined}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >

        {/* ── Screen 1 — Intro ─────────────────────────────────────────── */}
        {screen === 1 && (
          <div className="onboarding-screen">
            {/* Leaf cluster */}
            <div className="onboarding-leaf-cluster" aria-hidden="true">
              <span className="onboarding-leaf-side"><LeafIcon size={28} className="onboarding-leaf" /></span>
              <LeafIcon size={56} className="onboarding-leaf onboarding-leaf--center" />
              <span className="onboarding-leaf-side"><LeafIcon size={28} className="onboarding-leaf" /></span>
            </div>

            <h1 className="onboarding-heading">Put the phone down.</h1>
            <p className="onboarding-subtext">
              Charito is your <strong>screen and apps detox</strong> companion.
            </p>

            {/* Benefit pills */}
            <div className="onboarding-benefit-pills">
              {BENEFIT_PILLS.map((pill) => (
                <span key={pill} className="onboarding-benefit-pill">{pill}</span>
              ))}
            </div>

            <button
              type="button"
              className="button button-primary onboarding-btn"
              onClick={() => setScreen(2)}
            >
              Let me try it &#8594;
            </button>
          </div>
        )}

        {/* ── Screen 2 — Welcome ───────────────────────────────────────── */}
        {screen === 2 && (
          <div className="onboarding-screen">
            <button type="button" className="onboarding-back-btn" onClick={() => setScreen(1)}>&#8592;</button>
            <div className="onboarding-leaf-cluster" aria-hidden="true">
              <span className="onboarding-leaf-side"><LeafIcon size={24} className="onboarding-leaf" /></span>
              <LeafIcon size={44} className="onboarding-leaf onboarding-leaf--center" />
              <span className="onboarding-leaf-side"><LeafIcon size={24} className="onboarding-leaf" /></span>
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
              onClick={() => setScreen(3)}
            >
              Get started &#8594;
            </button>
          </div>
        )}

        {/* ── Screen 3 — Goals ─────────────────────────────────────────── */}
        {screen === 3 && (
          <div className="onboarding-screen">
            <button type="button" className="onboarding-back-btn" onClick={() => setScreen(2)}>&#8592;</button>
            <p className="onboarding-subtext">
              We'll personalize your reminders around what matters to you.
            </p>
            <div className="onboarding-goals-grid">
              {GOALS.map((goal) => {
                const isSelected = selectedGoals.includes(goal.id);
                return (
                  <button
                    key={goal.id}
                    type="button"
                    className={`onboarding-goal-card${isSelected ? ' onboarding-goal-card--selected' : ''}`}
                    onClick={() => toggleGoal(goal.id)}
                    aria-pressed={isSelected}
                    style={{
                      position: 'relative',
                      border: isSelected ? '2px solid var(--accent)' : undefined,
                      background: isSelected ? 'var(--accent-bg)' : undefined,
                    }}
                  >
                    {/* Checkmark badge */}
                    {isSelected && (
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          top: '0.375rem',
                          right: '0.375rem',
                          width: '1.1rem',
                          height: '1.1rem',
                          borderRadius: '50%',
                          background: 'var(--accent)',
                          color: '#fff',
                          fontSize: '0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          lineHeight: 1,
                        }}
                      >
                        &#10003;
                      </span>
                    )}
                    <span className="onboarding-goal-emoji" aria-hidden="true">{goal.emoji}</span>
                    <span className="onboarding-goal-label">{goal.label}</span>
                    <span className="onboarding-goal-subtext">{goal.subtext}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="button button-primary onboarding-btn"
              onClick={handleGoalsContinue}
            >
              Continue &#8594;
            </button>
          </div>
        )}

        {/* ── Screen 4 — Your detox style ──────────────────────────────── */}
        {screen === 4 && (
          <div className="onboarding-screen">
            <button type="button" className="onboarding-back-btn" onClick={() => setScreen(3)}>&#8592;</button>
            <h1 className="onboarding-heading">Your detox style</h1>
            <p className="onboarding-subtext">
              How strict do you want Charito to be? You can change this anytime in Settings.
            </p>
            <div className="onboarding-detox-style-grid">
              {DETOX_STYLES.map((style) => {
                const selected = detoxIntensity === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    className={`onboarding-detox-card${selected ? ' onboarding-detox-card--selected' : ''}`}
                    onClick={() => setDetoxIntensity(style.id)}
                    aria-pressed={selected}
                  >
                    {selected && (
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          top: '0.375rem',
                          right: '0.5rem',
                          width: '1.1rem',
                          height: '1.1rem',
                          borderRadius: '50%',
                          background: 'var(--accent)',
                          color: '#fff',
                          fontSize: '0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          lineHeight: 1,
                        }}
                      >
                        &#10003;
                      </span>
                    )}
                    <span className="onboarding-detox-card-emoji" aria-hidden="true">{style.emoji}</span>
                    <div className="onboarding-detox-card-text">
                      <span className="onboarding-goal-label">{style.label}</span>
                      <span className="onboarding-goal-subtext">{style.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="button button-primary onboarding-btn"
              onClick={handleDetoxStyleContinue}
            >
              Continue &#8594;
            </button>
          </div>
        )}

        {/* ── Screen 5 — How it works ───────────────────────────────────── */}
        {screen === 5 && (
          <div className="onboarding-screen">
            <button type="button" className="onboarding-back-btn" onClick={() => setScreen(4)}>&#8592;</button>
            <h1 className="onboarding-heading">How Charito works</h1>
            <p className="onboarding-subtext">Simple. Honest. Built around your life.</p>
            <div className="onboarding-how-cards">
              {HOW_IT_WORKS.map((item) => (
                <div key={item.title} className="onboarding-how-card">
                  <span className="onboarding-how-emoji" aria-hidden="true">{item.emoji}</span>
                  <div>
                    <p className="onboarding-how-title">{item.title}</p>
                    <p className="onboarding-how-body">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="onboarding-billing-note">
              Charges are processed securely. No payment info needed to start your free blocks.
            </p>
            <button
              type="button"
              className="button button-primary onboarding-btn"
              onClick={() => setScreen(6)}
            >
              Got it &#8594;
            </button>
          </div>
        )}

        {/* ── Screen 6 — Live preview ───────────────────────────────────── */}
        {screen === 6 && (
          <div className="onboarding-screen">
            <button type="button" className="onboarding-back-btn" onClick={() => setScreen(5)}>&#8592;</button>
            <h1 className="onboarding-heading">Here's what it looks like</h1>
            <p className="onboarding-subtext">When a detox block is active, you'll see this.</p>

            {/* Animated mock phone screen */}
            <div className="onboarding-preview-phone" aria-hidden="true">
              <div className="onboarding-preview-notch" />
              <div className="onboarding-preview-screen">
                <p className="onboarding-preview-mode">Focused block</p>
                <p className="onboarding-preview-timer">{formatPreview(previewSecs)}</p>
                <div className="onboarding-preview-bar">
                  <div
                    className="onboarding-preview-bar-fill"
                    style={{ width: `${((90 - previewSecs) / 90) * 100}%` }}
                  />
                </div>
                <p className="onboarding-preview-msg">
                  <em>"Oye, baja el tel&eacute;fono. El momento te espera."</em>
                </p>
              </div>
            </div>

            <button
              type="button"
              className="button button-primary onboarding-btn"
              onClick={() => setScreen(7)}
            >
              Looks good &#8594;
            </button>
          </div>
        )}

        {/* ── Screen 7 — Permissions ───────────────────────────────────── */}
        {screen === 7 && (
          <div className="onboarding-screen">
            <button type="button" className="onboarding-back-btn" onClick={() => setScreen(6)}>&#8592;</button>
            <h1 className="onboarding-heading">A few permissions</h1>
            <p className="onboarding-subtext">
              Charito works best with these enabled. You can change them anytime in Settings.
            </p>
            <div className="onboarding-permissions">
              <button
                type="button"
                className="onboarding-permission-row"
                onClick={() => void handleAllowNotifications()}
                disabled={notifStatus === 'granted' || notifStatus === 'unsupported'}
              >
                <span className="onboarding-permission-icon" aria-hidden="true">&#128276;</span>
                <div className="onboarding-permission-text">
                  <span className="onboarding-permission-title">Notifications</span>
                  <span className="onboarding-permission-desc">Get reminded when a block is active</span>
                </div>
                <span className="onboarding-permission-action">
                  {notifStatus === 'granted' ? '&#10003;' : 'Allow \u2192'}
                </span>
              </button>

              <button
                type="button"
                className="onboarding-permission-row"
                onClick={handleAppUsage}
                disabled={appUsageStatus === 'coming-soon'}
              >
                <span className="onboarding-permission-icon" aria-hidden="true">&#128202;</span>
                <div className="onboarding-permission-text">
                  <span className="onboarding-permission-title">App usage data</span>
                  <span className="onboarding-permission-desc">See which apps you use most — smarter block suggestions</span>
                </div>
                <span className="onboarding-permission-action">
                  {appUsageStatus === 'coming-soon'
                    ? <span style={{ fontSize: '0.7rem', color: 'var(--text-m)' }}>Coming in app</span>
                    : 'Allow \u2192'}
                </span>
              </button>

              <button
                type="button"
                className="onboarding-permission-row"
                onClick={() => void handleMic()}
                disabled={micStatus === 'granted'}
              >
                <span className="onboarding-permission-icon" aria-hidden="true">&#127908;</span>
                <div className="onboarding-permission-text">
                  <span className="onboarding-permission-title">Microphone</span>
                  <span className="onboarding-permission-desc">Record your own voice reminders</span>
                </div>
                <span className="onboarding-permission-action">
                  {micStatus === 'granted' ? '&#10003;' : micStatus === 'denied' ? '\u2014' : 'Allow \u2192'}
                </span>
              </button>
            </div>

            <button
              type="button"
              className="button button-primary onboarding-btn"
              onClick={() => setScreen(8)}
            >
              Continue &#8594;
            </button>
            <button
              type="button"
              className="onboarding-skip-link"
              onClick={() => setScreen(8)}
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── Screen 8 — Done ──────────────────────────────────────────── */}
        {screen === 8 && (
          <div className="onboarding-screen">
            <button type="button" className="onboarding-back-btn" onClick={() => setScreen(7)}>&#8592;</button>
            <div className="onboarding-leaf-cluster" aria-hidden="true">
              <span className="onboarding-leaf-side"><LeafIcon size={28} className="onboarding-leaf" /></span>
              <LeafIcon size={52} className="onboarding-leaf onboarding-leaf--center" />
              <span className="onboarding-leaf-side"><LeafIcon size={28} className="onboarding-leaf" /></span>
            </div>
            <h1 className="onboarding-heading">You're all set.</h1>
            <p className="onboarding-subtext">
              Head to Settings to pick your culture and preferred reminders. Your journey starts now.
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

        {/* ── Dot indicators — 8 dots ──────────────────────────────────── */}
        <div className="onboarding-dots" aria-hidden="true">
          {([1, 2, 3, 4, 5, 6, 7, 8] as OnboardingScreen[]).map((s) => (
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
