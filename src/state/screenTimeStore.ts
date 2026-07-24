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

export const screenTimeStore = {
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
    return () => {
      listeners.delete(listener);
    };
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
};
