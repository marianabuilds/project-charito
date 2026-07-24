// ── Daily self-reported screen time ───────────────────────────────────────

const STORAGE_KEY = 'charito:screentime:v1';

type ScreenTimeData = Record<string, number>; // { [dateISO]: minutes }

function load(): ScreenTimeData {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ScreenTimeData;
  } catch {
    return {};
  }
}

function persist(data: ScreenTimeData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // best-effort
  }
}

let current: ScreenTimeData = load();
const listeners = new Set<(data: ScreenTimeData) => void>();

// ── Per-app native stats (Android only) ───────────────────────────────────

const PER_APP_KEY = 'charito:perapps:v1';

/**
 * Aggregated stats for a single app, as fetched from the Android
 * UsageStatsManager via the UsageStats Capacitor plugin.
 */
export interface PerAppStat {
  /** Android package name, e.g. 'com.instagram.android' */
  packageName: string;
  /** Human-readable app label resolved on the native side */
  appName: string;
  /** Total foreground usage in whole minutes for the queried period */
  totalMinutes: number;
  /** Number of times launched (Android 9+; 0 on older devices) */
  launchCount: number;
  /** ISO timestamp of last use */
  lastUsed: string;
  /** ISO date string of when this record was last synced from the device */
  syncedAt: string;
}

function loadPerApp(): PerAppStat[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PER_APP_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PerAppStat[];
  } catch {
    return [];
  }
}

function persistPerApp(stats: PerAppStat[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PER_APP_KEY, JSON.stringify(stats));
  } catch {
    // best-effort
  }
}

let perAppCurrent: PerAppStat[] = loadPerApp();
const perAppListeners = new Set<(stats: PerAppStat[]) => void>();

// ── Unified store export ───────────────────────────────────────────────────

export const screenTimeStore = {
  // ── Daily self-report (web + Android) ──────────────────────────────────

  get(): ScreenTimeData {
    return current;
  },

  setToday(minutes: number): void {
    const today = new Date().toISOString().slice(0, 10);
    current = { ...current, [today]: minutes };
    persist(current);
    listeners.forEach((l) => l(current));
  },

  subscribe(listener: (data: ScreenTimeData) => void): () => void {
    listeners.add(listener);
    listener(current);
    return () => { listeners.delete(listener); };
  },

  /** Returns last 7 days including today as array of { date, minutes } */
  getLast7Days(): { date: string; minutes: number }[] {
    const result: { date: string; minutes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      result.push({ date, minutes: current[date] ?? 0 });
    }
    return result;
  },

  // ── Per-app native stats (Android only) ────────────────────────────────

  /**
   * Replace the stored per-app stats with a fresh batch from the native plugin.
   * Called by `useUsageStats` after a successful `getUsageStats()` call.
   */
  setPerApp(stats: PerAppStat[]): void {
    perAppCurrent = stats;
    persistPerApp(stats);
    perAppListeners.forEach((l) => l(stats));
  },

  /** Returns the full per-app list, sorted by totalMinutes descending. */
  getPerApp(): PerAppStat[] {
    return [...perAppCurrent].sort((a, b) => b.totalMinutes - a.totalMinutes);
  },

  /**
   * Returns the top N apps by foreground usage time.
   * @param n - number of apps to return (default 5)
   */
  getTopApps(n = 5): PerAppStat[] {
    return screenTimeStore.getPerApp().slice(0, n);
  },

  subscribePerApp(listener: (stats: PerAppStat[]) => void): () => void {
    perAppListeners.add(listener);
    listener(perAppCurrent);
    return () => { perAppListeners.delete(listener); };
  },
};
