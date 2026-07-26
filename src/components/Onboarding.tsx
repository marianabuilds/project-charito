import React from 'react';
import { LeafIcon } from './LeafIcon';
import { settingsStore } from '../state/settingsStore';

const ONBOARDING_KEY = 'charito:onboarded:v1';

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
    emoji: '🤖',
    title: 'Smart recommendations',
    body: 'Charito learns your habits and suggests personalized blocks \u2014 so you spend less time deciding and more time living.',
  },
  {
    emoji: '💸',
    title: '$1 accountability rule',
    body: "Break your schedule? A $1 charge goes toward the app \u2014 a light nudge, not a punishment.",
  },
];

const TOTAL_SCREENS = 6;
type OnboardingScreen = 1 | 2 | 3 | 4 | 5 | 6;
type MicStatus = 'idle' | 'granted' | 'denied';

const SCREENS: OnboardingScreen[] = [1, 2, 3, 4, 5, 6];

const SWIPE_THRESHOLD_PX = 50;

function hasOnboarded(): boolean {
  try { return Boolean(localStorage.getItem(ONBOARDING_KEY)); } catch { return false; }
}

function markOnboarded(): void {
  try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
}

export const Onboarding: React.FC = () => {
  const [visible, setVisible] = React.useState(!hasOnboarded());
  const [screen, setScreen] = React.useState<OnboardingScreen>(1);

  // Live preview countdown
  const [previewSecs, setPreviewSecs] = React.useState(90);
  const [previewRunning, setPreviewRunning] = React.useState(false);

  // Permission states
  const [notifStatus, setNotifStatus] = React.useState<'idle' | 'granted' | 'denied' | 'unsupported'>(() => {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    return 'idle';
  });
  const [appUsageStatus, setAppUsageStatus] = React.useState<'idle' | 'opened' | 'granted'>('idle');
  const [accessibilityStatus, setAccessibilityStatus] = React.useState<'idle' | 'opened' | 'granted'>('idle');
  const [overlayStatus, setOverlayStatus] = React.useState<'idle' | 'opened' | 'granted'>('idle');
  const [micStatus, setMicStatus] = React.useState<MicStatus>('idle');

  // Refresh Android permission statuses when entering the permissions screen
  React.useEffect(() => {
    if (screen !== 5) return;
    void (async () => {
      try {
        const { AppBlocker } = await import('../plugins/AppBlocker');
        const { BlockScheduler } = await import('../plugins/BlockScheduler');
        const [a11y, overlay, notif] = await Promise.all([
          AppBlocker.hasAccessibilityPermission(),
          AppBlocker.hasOverlayPermission(),
          BlockScheduler.hasNotificationPermission(),
        ]);
        if (a11y.granted) setAccessibilityStatus('granted');
        if (overlay.granted) setOverlayStatus('granted');
        if (notif.granted) setNotifStatus('granted');
      } catch { /* web preview */ }
    })();
  }, [screen]);

  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);

  const dismiss = () => { markOnboarded(); setVisible(false); };

  const goNext = React.useCallback(() => {
    setScreen((s) => (s < TOTAL_SCREENS ? ((s + 1) as OnboardingScreen) : s));
  }, []);

  const goBack = React.useCallback(() => {
    setScreen((s) => (s > 1 ? ((s - 1) as OnboardingScreen) : s));
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Prefer horizontal swipes; ignore mostly-vertical scrolls
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext();
    else goBack();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Touch is handled via touch events; avoid double-firing on touch devices
    if (e.pointerType === 'touch') return;
    touchStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext();
    else goBack();
  };

  const handleAllowNotifications = async () => {
    try {
      const { ensureNotificationPermission } = await import('../utils/notifications');
      const ok = await ensureNotificationPermission();
      setNotifStatus(ok ? 'granted' : 'denied');
      return;
    } catch { /* fall through */ }
    if (!('Notification' in window)) { setNotifStatus('unsupported'); return; }
    if (Notification.permission === 'granted') { setNotifStatus('granted'); return; }
    const result = await Notification.requestPermission();
    setNotifStatus(result === 'granted' ? 'granted' : 'denied');
  };

  const handleAppUsage = async () => {
    try {
      const { UsageStats } = await import('../plugins/UsageStats');
      await UsageStats.openUsageAccessSettings();
      setAppUsageStatus('opened');
    } catch {
      alert('Open Settings \u2192 Apps \u2192 Special app access \u2192 Usage access \u2192 Charito.');
      setAppUsageStatus('opened');
    }
  };

  const handleAccessibilityPermission = async () => {
    try {
      const { AppBlocker } = await import('../plugins/AppBlocker');
      const status = await AppBlocker.hasAccessibilityPermission();
      if (status.granted) { setAccessibilityStatus('granted'); return; }
      await AppBlocker.openAccessibilitySettings();
      setAccessibilityStatus('opened');
    } catch {
      alert('App blocking is available in the Android app. Enable Charito in Settings \u2192 Accessibility.');
      setAccessibilityStatus('opened');
    }
  };

  const handleOverlayPermission = async () => {
    try {
      const { AppBlocker } = await import('../plugins/AppBlocker');
      const status = await AppBlocker.hasOverlayPermission();
      if (status.granted) { setOverlayStatus('granted'); return; }
      await AppBlocker.openOverlaySettings();
      setOverlayStatus('opened');
    } catch {
      alert('Allow Charito to display over other apps in Settings \u2192 Special app access.');
      setOverlayStatus('opened');
    }
  };

  const handleMic = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus('granted');
    } catch {
      setMicStatus('denied');
    }
  };

  // Live preview timer — start when entering screen 4
  React.useEffect(() => {
    if (screen === 4) {
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
    <div
      className="onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Charito"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div className="onboarding-container">

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
              Charito is a <strong>screen and apps detox</strong> companion — culturally rooted, honest, and human.
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

        {/* ── Screen 3 — How it works ───────────────────────────────────── */}
        {screen === 3 && (
          <div className="onboarding-screen">
            <button type="button" className="onboarding-back-btn" onClick={() => setScreen(2)}>&#8592;</button>
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
              onClick={() => setScreen(4)}
            >
              Got it &#8594;
            </button>
          </div>
        )}

        {/* ── Screen 4 — Live preview ───────────────────────────────────── */}
        {screen === 4 && (
          <div className="onboarding-screen">
            <button type="button" className="onboarding-back-btn" onClick={() => setScreen(3)}>&#8592;</button>
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

            {/* Body-cue feature callout */}
            <div className="onboarding-how-card" style={{ marginTop: '1rem', textAlign: 'left' }}>
              <span className="onboarding-how-emoji" aria-hidden="true">🌙</span>
              <div>
                <p className="onboarding-how-title">Body-aware reminders</p>
                <p className="onboarding-how-body">
                  Charito notices the time and nudges you accordingly — so you wind down when your body needs it most.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="button button-primary onboarding-btn"
              onClick={() => setScreen(5)}
            >
              Looks good &#8594;
            </button>
          </div>
        )}

        {/* ── Screen 5 — Permissions ───────────────────────────────────── */}
        {screen === 5 && (
          <div className="onboarding-screen">
            <button type="button" className="onboarding-back-btn" onClick={() => setScreen(4)}>&#8592;</button>
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
                onClick={() => void handleAppUsage()}
                disabled={appUsageStatus === 'granted'}
              >
                <span className="onboarding-permission-icon" aria-hidden="true">&#128202;</span>
                <div className="onboarding-permission-text">
                  <span className="onboarding-permission-title">App usage data</span>
                  <span className="onboarding-permission-desc">See which apps you use most — smarter block suggestions</span>
                </div>
                <span className="onboarding-permission-action">
                  {appUsageStatus === 'granted' ? '&#10003;' : appUsageStatus === 'opened' ? 'Opened \u203a' : 'Allow \u2192'}
                </span>
              </button>

              <button
                type="button"
                className="onboarding-permission-row"
                onClick={() => void handleAccessibilityPermission()}
                disabled={accessibilityStatus === 'granted'}
              >
                <span className="onboarding-permission-icon" aria-hidden="true">&#128274;</span>
                <div className="onboarding-permission-text">
                  <span className="onboarding-permission-title">App blocking</span>
                  <span className="onboarding-permission-desc">Pause selected apps during a detox — Accessibility access</span>
                </div>
                <span className="onboarding-permission-action">
                  {accessibilityStatus === 'granted' ? '&#10003;' : accessibilityStatus === 'opened' ? 'Opened \u203a' : 'Enable \u2192'}
                </span>
              </button>

              <button
                type="button"
                className="onboarding-permission-row"
                onClick={() => void handleOverlayPermission()}
                disabled={overlayStatus === 'granted'}
              >
                <span className="onboarding-permission-icon" aria-hidden="true">&#128438;</span>
                <div className="onboarding-permission-text">
                  <span className="onboarding-permission-title">Display over apps</span>
                  <span className="onboarding-permission-desc">Show the blocked-app screen on top of Instagram, TikTok, etc.</span>
                </div>
                <span className="onboarding-permission-action">
                  {overlayStatus === 'granted' ? '&#10003;' : overlayStatus === 'opened' ? 'Opened \u203a' : 'Enable \u2192'}
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
              onClick={() => setScreen(6)}
            >
              Continue &#8594;
            </button>
            <button
              type="button"
              className="onboarding-skip-link"
              onClick={() => setScreen(6)}
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── Screen 6 — Done ──────────────────────────────────────────── */}
        {screen === 6 && (
          <div className="onboarding-screen">
            <button type="button" className="onboarding-back-btn" onClick={() => setScreen(5)}>&#8592;</button>
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

        {/* ── Dot indicators — 6 dots ──────────────────────────────────── */}
        <div className="onboarding-dots" aria-hidden="true">
          {SCREENS.map((s) => (
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
