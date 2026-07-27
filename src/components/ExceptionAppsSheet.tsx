import React from 'react';
import { createPortal } from 'react-dom';
import { useInstalledApps, FALLBACK_APP_CATEGORIES } from '../hooks/useInstalledApps';
import { APP_PACKAGE_MAP, PHONE_PACKAGES, hasException } from '../utils/appPackages';

export interface ExceptionAppOption {
  id: string;
  label: string;
  locked?: boolean;
}

interface ExceptionAppsSheetProps {
  open: boolean;
  selected: string[];
  onClose: () => void;
  onChange: (next: string[]) => void;
}

function isPhoneId(id: string): boolean {
  return id === 'Phone' || PHONE_PACKAGES.has(id);
}

/** Web fallback: flatten curated categories into selectable exception options. */
function fallbackOptions(): ExceptionAppOption[] {
  const seen = new Set<string>();
  const out: ExceptionAppOption[] = [
    { id: 'Phone', label: 'Phone', locked: true },
    { id: 'Messages', label: 'Messages' },
  ];
  seen.add('Phone');
  seen.add('Messages');

  for (const cat of FALLBACK_APP_CATEGORIES) {
    for (const app of cat.apps) {
      if (seen.has(app) || !APP_PACKAGE_MAP[app]) continue;
      seen.add(app);
      out.push({ id: app, label: app });
    }
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

export const ExceptionAppsSheet: React.FC<ExceptionAppsSheetProps> = ({
  open,
  selected,
  onClose,
  onChange,
}) => {
  const { apps: installedApps, isNativeList, loading } = useInstalledApps();
  const [query, setQuery] = React.useState('');
  const [draft, setDraft] = React.useState<string[]>(selected);

  React.useEffect(() => {
    if (open) {
      setDraft(Array.from(new Set(['Phone', ...selected])));
      setQuery('');
    }
  }, [open, selected]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const options = React.useMemo((): ExceptionAppOption[] => {
    if (isNativeList && installedApps.length > 0) {
      return installedApps
        .map((a) => ({
          id: a.packageName,
          label: a.appName,
          locked: PHONE_PACKAGES.has(a.packageName),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    return fallbackOptions();
  }, [installedApps, isNativeList]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.id.toLowerCase().includes(q),
    );
  }, [options, query]);

  const toggle = (id: string, locked?: boolean) => {
    if (locked || isPhoneId(id)) return;
    setDraft((prev) => {
      if (hasException(prev, id)) {
        // Remove matching display name and/or package id
        const mapped = APP_PACKAGE_MAP[id];
        const reverseName = Object.entries(APP_PACKAGE_MAP).find(([, pkg]) => pkg === id)?.[0];
        return prev.filter(
          (x) => x !== id && x !== mapped && x !== reverseName,
        );
      }
      return [...prev, id];
    });
  };

  const handleDone = () => {
    // Prefer canonical Phone id; drop raw dialer package duplicates
    const cleaned = draft.filter((id) => id === 'Phone' || !PHONE_PACKAGES.has(id));
    const next = Array.from(new Set(['Phone', ...cleaned]));
    onChange(next);
    onClose();
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="bottom-sheet-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Choose exception apps"
      >
        <div className="bottom-sheet-handle" aria-hidden="true" />
        <div className="bottom-sheet-header">
          <div>
            <h2 className="bottom-sheet-title">Exception apps</h2>
            <p className="bottom-sheet-subtitle">
              Stay available during every detox. Phone is always on.
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

        <label className="bottom-sheet-search">
          <span className="visually-hidden">Search apps</span>
          <input
            type="search"
            placeholder="Search apps"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </label>

        <div className="bottom-sheet-body">
          {loading ? (
            <p className="bottom-sheet-empty">Loading apps…</p>
          ) : filtered.length === 0 ? (
            <p className="bottom-sheet-empty">No apps match “{query}”.</p>
          ) : (
            <ul className="bottom-sheet-app-list">
              {filtered.map((opt) => {
                const locked = Boolean(opt.locked) || isPhoneId(opt.id);
                const checked = locked || hasException(draft, opt.id);
                return (
                  <li key={opt.id}>
                    <label
                      className={`bottom-sheet-app-row${locked ? ' bottom-sheet-app-row--locked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={locked}
                        onChange={() => toggle(opt.id, locked)}
                      />
                      <span className="bottom-sheet-app-name">{opt.label}</span>
                      {locked && (
                        <span className="bottom-sheet-app-badge">Always on</span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bottom-sheet-footer">
          <button type="button" className="button button-primary" onClick={handleDone}>
            Done · {Math.max(1, new Set(['Phone', ...draft.filter((id) => !isPhoneId(id))]).size)} selected
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
