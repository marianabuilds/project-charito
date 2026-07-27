import React from 'react';
import { LeafIcon } from './LeafIcon';
import { settingsStore } from '../state/settingsStore';
import {
  onAppBecameVisible,
  refreshAndroidPermissions,
  requestAndroidPermission,
  type AndroidPermissionStatuses,
  type PermState,
} from '../utils/androidPermissions';

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

const TOTAL_SCREENS = 5;
type OnboardingScreen = 1 | 2 | 3 | 4 | 5;

const SCREENS: OnboardingScreen[] = [1, 2, 3, 4, 5];

const SWIPE_THRESHOLD_PX = 50;

const EMPTY_PERMS: AndroidPermissionStatuses = {
  notifications: 'idle',
  usage: 'idle',
  accessibility: 'idle',
  overlay: 'idle',
  microphone: 'idle',
};

function hasOnboarded(): boolean {
  try { return Boolean(localStorage.getItem(ONBOARDING_KEY)); } catch { return false; }
}

function markOnboarded(): void {
  try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
}

function actionLabel(status: PermState, enableWord = 'Enable'): string {
  if (status === 'granted') return '✓';
  if (status === 'denied') return 'Settings →';
  if (status === 'unsupported') return '—';
  return `${enableWord} →`;
}

export const Onboarding: React.FC = () => {
  const [visible, setVisible] = React.useState(!hasOnboarded());
  const [screen, setScreen] = React.useState<OnboardingScreen>(1);

  // Live preview countdown
  const [previewSecs, setPreviewSecs] = React.useState(90);
  const [previewRunning, setPreviewRunning] = React.useState(false);

  const [perms, setPerms] = React.useState<AndroidPermissionStatuses>(EMPTY_PERMS);
  const [permBusy, setPermBusy] = React.useState<keyof AndroidPermissionStatuses | null>(null);

  const syncPermissions = React.useCallback(() => {
    void refreshAndroidPermissions().then(setPerms);
  }, []);

  // Refresh when entering permissions screen + whenever returning from Settings
  React.useEffect(() => {
    if (screen !== 5) return;
    syncPermissions();
    return onAppBecameVisible(syncPermissions);
  }, [screen, syncPermissions]);

  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);

  const dismiss = () => { markOnboarded(); setVisible(false); };

  const goNext = React.useCallback(() => {
    setScreen((s) => {
      if (s >= TOTAL_SCREENS) return s;
      return (s + 1) as OnboardingScreen;
    });
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
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) {
      if (screen >= TOTAL_SCREENS) dismiss();
      else goNext();
    } else {
      goBack();
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
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
    if (dx < 0) {
      if (screen >= TOTAL_SCREENS) dismiss();
      else goNext();
    } else {
      goBack();
    }
  };

  const handlePermission = async (kind: keyof AndroidPermissionStatuses) => {
    if (perms[kind] === 'granted' || permBusy) return;
    setPermBusy(kind);
    try {
      const next = await requestAndroidPermission(kind);
      setPerms((prev) => ({ ...prev, [kind]: next }));
      // Special-access screens return while still idle — re-check on resume
      if (next === 'idle' || next === 'denied') {
        // Status will refresh via visibility listener after Settings closes
      }
    } finally {
      setPermBusy(null);
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
            <div className="onboarding-leaf-cluster" aria-hidden="true">
              <span className="onboarding-leaf-side"><LeafIcon size={28} className="onboarding-leaf" /></span>
              <LeafIcon size={56} className="onboarding-leaf onboarding-leaf--center" />
              <span className="onboarding-leaf-side"><LeafIcon size={28} className="onboarding-leaf" /></span>
            </div>

            <h1 className="onboarding-heading">Put the phone down.</h1>
            <p className="onboarding-subtext">
              Charito is a <strong>screen and apps detox</strong> companion — culturally rooted, honest, and human.
            </p>

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
            <h1 className="onboarding-heading">Here&apos;s what it looks like</h1>
            <p className="onboarding-subtext">When a detox block is active, you&apos;ll see this.</p>

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
                  <em>&ldquo;Oye, baja el tel&eacute;fono. El momento te espera.&rdquo;</em>
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
              Charito works best with these enabled. You&apos;ll be taken to Android Settings when needed — status updates when you return.
            </p>
            <div className="onboarding-permissions">
              <button
                type="button"
                className="onboarding-permission-row"
                onClick={() => void handlePermission('notifications')}
                disabled={perms.notifications === 'granted' || perms.notifications === 'unsupported' || permBusy !== null}
              >
                <span className="onboarding-permission-icon" aria-hidden="true">&#128276;</span>
                <div className="onboarding-permission-text">
                  <span className="onboarding-permission-title">Notifications</span>
                  <span className="onboarding-permission-desc">Get reminded when a block is active</span>
                </div>
                <span className="onboarding-permission-action">
                  {actionLabel(perms.notifications, 'Allow')}
                </span>
              </button>

              <button
                type="button"
                className="onboarding-permission-row"
                onClick={() => void handlePermission('usage')}
                disabled={perms.usage === 'granted' || permBusy !== null}
              >
                <span className="onboarding-permission-icon" aria-hidden="true">&#128202;</span>
                <div className="onboarding-permission-text">
                  <span className="onboarding-permission-title">App usage data</span>
                  <span className="onboarding-permission-desc">See which apps you use most — smarter block suggestions</span>
                </div>
                <span className="onboarding-permission-action">
                  {actionLabel(perms.usage, 'Allow')}
                </span>
              </button>

              <button
                type="button"
                className="onboarding-permission-row"
                onClick={() => void handlePermission('accessibility')}
                disabled={perms.accessibility === 'granted' || permBusy !== null}
              >
                <span className="onboarding-permission-icon" aria-hidden="true">&#128274;</span>
                <div className="onboarding-permission-text">
                  <span className="onboarding-permission-title">App blocking</span>
                  <span className="onboarding-permission-desc">Pause selected apps during a detox — Accessibility access</span>
                </div>
                <span className="onboarding-permission-action">
                  {actionLabel(perms.accessibility)}
                </span>
              </button>

              <button
                type="button"
                className="onboarding-permission-row"
                onClick={() => void handlePermission('overlay')}
                disabled={perms.overlay === 'granted' || permBusy !== null}
              >
                <span className="onboarding-permission-icon" aria-hidden="true">&#128438;</span>
                <div className="onboarding-permission-text">
                  <span className="onboarding-permission-title">Display over apps</span>
                  <span className="onboarding-permission-desc">Show the blocked-app screen on top of Instagram, TikTok, etc.</span>
                </div>
                <span className="onboarding-permission-action">
                  {actionLabel(perms.overlay)}
                </span>
              </button>

              <button
                type="button"
                className="onboarding-permission-row"
                onClick={() => void handlePermission('microphone')}
                disabled={perms.microphone === 'granted' || permBusy !== null}
              >
                <span className="onboarding-permission-icon" aria-hidden="true">&#127908;</span>
                <div className="onboarding-permission-text">
                  <span className="onboarding-permission-title">Microphone</span>
                  <span className="onboarding-permission-desc">Record your own voice reminders</span>
                </div>
                <span className="onboarding-permission-action">
                  {actionLabel(perms.microphone, 'Allow')}
                </span>
              </button>
            </div>

            <button
              type="button"
              className="button button-primary onboarding-btn"
              onClick={dismiss}
            >
              Let&apos;s go
            </button>
            <button
              type="button"
              className="onboarding-skip-link"
              onClick={dismiss}
            >
              Skip for now
            </button>
          </div>
        )}

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
