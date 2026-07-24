const STORAGE_KEY = 'charito:journal:v1';

export interface JournalEntry {
  date: string;        // ISO date string e.g. "2024-01-15"
  trigger: string;     // "Boredom" | "Stress" | "Habit" | "Notification"
  minutesReclaimed: number;
}

function load(): JournalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as JournalEntry[];
  } catch {
    return [];
  }
}

function persist(entries: JournalEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // best-effort
  }
}

let current: JournalEntry[] = load();
const listeners = new Set<(entries: JournalEntry[]) => void>();

export const journalStore = {
  get(): JournalEntry[] {
    return current;
  },
  add(entry: JournalEntry): void {
    current = [...current, entry];
    persist(current);
    listeners.forEach((l) => l(current));
  },
  subscribe(listener: (entries: JournalEntry[]) => void): () => void {
    listeners.add(listener);
    listener(current);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Returns entries from the last 7 days */
  getThisWeek(): JournalEntry[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return current.filter((e) => e.date >= cutoffStr);
  },
  /** Returns tally of triggers this week */
  getWeeklyTriggerTally(): Record<string, number> {
    const week = journalStore.getThisWeek();
    const tally: Record<string, number> = {};
    for (const entry of week) {
      tally[entry.trigger] = (tally[entry.trigger] ?? 0) + 1;
    }
    return tally;
  },
};
