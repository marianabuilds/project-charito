import React from 'react';
import { CultureSelector } from '../components/CultureSelector';
import { VoiceActorSelector } from '../components/VoiceActorSelector';
import { MessageSelector } from '../components/MessageSelector';
import { planStore } from '../state/planStore';
import type { Plan } from '../state/planStore';
import { settingsStore } from '../state/settingsStore';
import { APP_PACKAGE_MAP, BLOCK_EXCEPTION_OPTIONS, hasException } from '../utils/appPackages';
import { ExceptionAppsSheet } from '../components/ExceptionAppsSheet';
import { BlockedScreenPreviewSheet } from '../components/BlockedScreenPreviewSheet';

function exceptionLabel(id: string): string {
  if (APP_PACKAGE_MAP[id]) return id;
  const named = Object.entries(APP_PACKAGE_MAP).find(([, pkg]) => pkg === id)?.[0];
  if (named) return named;
  const segment = id.includes('.') ? id.split('.').pop() : id;
  return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : id;
}
import {
  onAppBecameVisible,
  refreshAndroidPermissions,
  requestAndroidPermission,
  type AndroidPermissionStatuses,
  type PermState,
} from '../utils/androidPermissions';

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

const PermissionsSection: React.FC = () => {
  const [perms, setPerms] = React.useState<AndroidPermissionStatuses>({
    notifications: 'idle',
    usage: 'idle',
    accessibility: 'idle',
    overlay: 'idle',
    microphone: 'idle',
  });
  const [dataConfirm, setDataConfirm] = React.useState(false);
  const [dataCleared, setDataCleared] = React.useState(false);
  const [busy, setBusy] = React.useState<keyof AndroidPermissionStatuses | null>(null);

  const sync = React.useCallback(() => {
    void refreshAndroidPermissions().then(setPerms);
  }, []);

  React.useEffect(() => {
    sync();
    return onAppBecameVisible(sync);
  }, [sync]);

  const handlePerm = async (kind: keyof AndroidPermissionStatuses) => {
    if (perms[kind] === 'granted' || busy) return;
    setBusy(kind);
    try {
      const next = await requestAndroidPermission(kind);
      setPerms((prev) => ({ ...prev, [kind]: next }));
    } finally {
      setBusy(null);
    }
  };

  const badge = (status: PermState) => {
    if (status === 'granted') {
      return <span className="permissions-badge permissions-badge--on">Enabled</span>;
    }
    if (status === 'denied') {
      return <span className="permissions-badge permissions-badge--off">Open Settings ↗</span>;
    }
    if (status === 'unsupported') {
      return <span className="permissions-badge permissions-badge--muted">Not supported</span>;
    }
    return <span className="permissions-arrow">›</span>;
  };

  const handleClearData = () => {
    localStorage.clear();
    setDataCleared(true);
    setDataConfirm(false);
    setTimeout(() => window.location.reload(), 800);
  };

  const rows: { key: keyof AndroidPermissionStatuses; label: string; desc: string }[] = [
    { key: 'notifications', label: 'Notifications', desc: 'Allow reminders to reach you' },
    { key: 'usage', label: 'App usage data', desc: 'Smarter block suggestions from screen time' },
    { key: 'accessibility', label: 'App blocking', desc: 'Accessibility — pause apps during a detox' },
    { key: 'overlay', label: 'Display over apps', desc: 'Show the blocked-app screen on top' },
    { key: 'microphone', label: 'Microphone', desc: 'Record your own voice reminders' },
  ];

  return (
    <div className="permissions-section">
      <p className="permissions-section-title">PERMISSIONS</p>

      {rows.map((row) => (
        <div
          key={row.key}
          className="permissions-row"
          role="button"
          tabIndex={0}
          onClick={() => void handlePerm(row.key)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') void handlePerm(row.key);
          }}
          aria-label={`${row.label} permission`}
        >
          <div className="permissions-row-left">
            <span className="permissions-row-label">{row.label}</span>
            <span className="permissions-row-desc">{row.desc}</span>
          </div>
          <div className="permissions-row-right">{badge(perms[row.key])}</div>
        </div>
      ))}

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

const BillingSection: React.FC = () => {
  const [plan, setPlan] = React.useState<Plan>(() => planStore.get().plan);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [toast, setToast] = React.useState(false);

  React.useEffect(() => {
    return planStore.subscribe((s) => setPlan(s.plan));
  }, []);

  const handleSubscribeClick = () => {
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  return (
    <>
      <div className="permissions-section">
        <p className="permissions-section-title">BILLING</p>

        {/* Current plan row */}
        <div className="permissions-row permissions-row--data">
          <div className="permissions-row-left">
            <span className="permissions-row-label">Current plan</span>
          </div>
          <div className="permissions-row-right">
            {plan === 'free' ? (
              <span className="plan-badge plan-badge--free">Free</span>
            ) : (
              <span className="plan-badge plan-badge--premium">Premium</span>
            )}
          </div>
        </div>

        {/* Upgrade row */}
        {plan === 'free' && (
          <div
            className="permissions-row"
            role="button"
            tabIndex={0}
            onClick={() => setUpgradeOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setUpgradeOpen(true);
            }}
            aria-label="Upgrade to Premium"
          >
            <div className="permissions-row-left">
              <span className="permissions-row-label" style={{ color: 'var(--sage-green, #5a7a5a)' }}>
                Upgrade to Premium →
              </span>
              <span className="permissions-row-desc">Unlimited blocks, all cultures &amp; more</span>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade modal */}
      {upgradeOpen && (
        <div
          className="billing-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Upgrade to Premium"
          onClick={(e) => {
            if (e.target === e.currentTarget) setUpgradeOpen(false);
          }}
        >
          <div className="billing-modal">
            <button
              type="button"
              className="billing-modal-close"
              onClick={() => setUpgradeOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>
            <h2 className="billing-modal-title">Upgrade to Premium</h2>
            <p className="billing-modal-subtitle">
              Unlock the full Charito experience.
            </p>

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
              className="button button-primary"
              style={{ marginTop: '1rem' }}
              onClick={handleSubscribeClick}
            >
              Subscribe — $2.99/mo
            </button>

            {toast && (
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--sage-green, #5a7a5a)',
                  textAlign: 'center',
                  margin: '0.5rem 0 0',
                }}
              >
                Billing coming soon
              </p>
            )}

            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-m)',
                textAlign: 'center',
                marginTop: '0.75rem',
              }}
            >
              You can manage billing anytime in Settings.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

const PRE_BLOCK_OPTIONS = [0, 5, 10, 15] as const;

const BlockExceptionsSection: React.FC = () => {
  const [exceptions, setExceptions] = React.useState<string[]>(
    () => settingsStore.get().blockExceptions ?? ['Phone', 'Messages'],
  );
  const [sheetOpen, setSheetOpen] = React.useState(false);

  React.useEffect(() => {
    return settingsStore.subscribe((s) => {
      setExceptions(s.blockExceptions ?? ['Phone', 'Messages']);
    });
  }, []);

  const persist = (next: string[]) => {
    const withPhone = Array.from(new Set(['Phone', ...next]));
    setExceptions(withPhone);
    settingsStore.set({ blockExceptions: withPhone });
  };

  const toggle = (id: string, locked: boolean) => {
    if (locked) return;
    const next = hasException(exceptions, id)
      ? exceptions.filter((x) => x !== id)
      : [...exceptions, id];
    persist(next);
  };

  const quickIds = new Set<string>(BLOCK_EXCEPTION_OPTIONS.map((o) => o.id));
  const extraExceptions = exceptions.filter((id) => id !== 'Phone' && !quickIds.has(id));

  return (
    <div className="settings-field" style={{ marginTop: '1.25rem' }}>
      <p className="block-form-label">Block exceptions</p>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-m)', margin: '0.25rem 0 0.75rem' }}>
        These apps stay available during every Quick detox and scheduled block.
        Phone is always on.
      </p>
      <div className="block-exceptions-list">
        {BLOCK_EXCEPTION_OPTIONS.map((opt) => {
          const checked = opt.locked || hasException(exceptions, opt.id);
          return (
            <label
              key={opt.id}
              className={`block-exception-row${opt.locked ? ' block-exception-row--locked' : ''}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={opt.locked}
                onChange={() => toggle(opt.id, opt.locked)}
              />
              <span className="block-exception-text">
                <span className="block-exception-name">{opt.label}</span>
                <span className="block-exception-hint">{opt.hint}</span>
              </span>
            </label>
          );
        })}
      </div>

      {extraExceptions.length > 0 && (
        <ul className="block-exception-extras">
          {extraExceptions.map((id) => (
            <li key={id} className="block-exception-chip">
              <span>{exceptionLabel(id)}</span>
              <button
                type="button"
                aria-label={`Remove ${exceptionLabel(id)}`}
                onClick={() => persist(exceptions.filter((x) => x !== id))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="block-exceptions-browse"
        onClick={() => setSheetOpen(true)}
      >
        Browse all apps →
      </button>

      <ExceptionAppsSheet
        open={sheetOpen}
        selected={exceptions}
        onClose={() => setSheetOpen(false)}
        onChange={persist}
      />
    </div>
  );
};

const BlockedScreenSection: React.FC = () => {
  const [sheetOpen, setSheetOpen] = React.useState(false);

  return (
    <>
      <div className="permissions-section">
        <p className="permissions-section-title">BLOCKED SCREEN</p>
        <div
          className="permissions-row"
          role="button"
          tabIndex={0}
          onClick={() => setSheetOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setSheetOpen(true);
          }}
          aria-label="Preview blocked screen"
        >
          <div className="permissions-row-left">
            <span className="permissions-row-label">Preview blocked screen</span>
            <span className="permissions-row-desc">
              See the full-screen overlay other apps get — uses your reminder &amp; voice
            </span>
          </div>
          <div className="permissions-row-right">
            <span className="permissions-arrow">›</span>
          </div>
        </div>
      </div>
      <BlockedScreenPreviewSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
};

export const SettingsView: React.FC = () => {
  const [preBlockMins, setPreBlockMins] = React.useState(
    () => settingsStore.get().preBlockReminderMinutes ?? 10,
  );

  React.useEffect(() => {
    return settingsStore.subscribe((s) => setPreBlockMins(s.preBlockReminderMinutes ?? 10));
  }, []);

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
          Choose your culture, voice, and the phrases Charito will speak.
        </p>
      </header>

      <StatsCard />

      <div className="settings-form card">
        <CultureSelector />
        <VoiceActorSelector />
        <MessageSelector />
        <BlockExceptionsSection />

        <div className="settings-field" style={{ marginTop: '1.25rem' }}>
          <label className="block-form-label" htmlFor="pre-block-reminder">
            Pre-block notification
          </label>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-m)', margin: '0.25rem 0 0.5rem' }}>
            Notify you before a scheduled block starts.
          </p>
          <select
            id="pre-block-reminder"
            className="select"
            value={preBlockMins}
            onChange={(e) => {
              const v = Number(e.target.value);
              setPreBlockMins(v);
              settingsStore.set({ preBlockReminderMinutes: v });
            }}
          >
            {PRE_BLOCK_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m === 0 ? 'Off' : `${m} minutes before`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <BlockedScreenSection />

      <PermissionsSection />

      <BillingSection />

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
