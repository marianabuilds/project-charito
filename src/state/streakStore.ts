// ── Consecutive-day streak tracker ────────────────────────────────────────
//
// Records one completion per calendar day. Each new day resets or continues
// the streak. Streak milestones unlock a warm affirmation shown via toastStore.

const STORAGE_KEY = 'charito:streak:v1';

interface StreakData {
  /** Number of consecutive calendar days with ≥1 completed block */
  currentStreak: number;
  /** ISO date string of the last day a block was recorded, or null */
  lastCompletedDate: string | null;
}

const AFFIRMATIONS: { days: number; message: string }[] = [
  { days: 1,  message: "First step taken. That matters. 🌱" },
  { days: 3,  message: "Three days of intention. You're building something real. 🔥" },
  { days: 7,  message: "A full week of presence. Charito is proud of you. 🌟" },
  { days: 14, message: "Two weeks in. This is who you're becoming. 💫" },
  { days: 30, message: "Un mes completo. That's extraordinary. 🎉" },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function load(): StreakData {
  if (typeof window === 'undefined') return { currentStreak: 0, lastCompletedDate: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { currentStreak: 0, lastCompletedDate: null };
    return JSON.parse(raw) as StreakData;
  } catch {
    return { currentStreak: 0, lastCompletedDate: null };
  }
}

function persist(data: StreakData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // best-effort
  }
}

let current: StreakData = load();
const listeners = new Set<(data: StreakData) => void>();

export const streakStore = {
  get(): StreakData {
    return current;
  },

  /**
   * Call this every time a detox block completes. Returns the affirmation
   * string if today is a milestone, otherwise null.
   */
  recordCompletion(): string | null {
    const today = todayISO();
    const yesterday = yesterdayISO();
    const prev = current;

    let newStreak: number;
    if (prev.lastCompletedDate === today) {
      // Already recorded today — no change to streak
      newStreak = prev.currentStreak;
    } else if (prev.lastCompletedDate === yesterday) {
      // Consecutive day
      newStreak = prev.currentStreak + 1;
    } else {
      // Gap or first ever — restart
      newStreak = 1;
    }

    current = { currentStreak: newStreak, lastCompletedDate: today };
    persist(current);
    listeners.forEach((l) => l(current));

    // Only fire affirmation on the exact milestone day (first record of that day)
    if (prev.lastCompletedDate !== today) {
      const hit = AFFIRMATIONS.find((a) => a.days === newStreak);
      return hit?.message ?? null;
    }
    return null;
  },

  subscribe(listener: (data: StreakData) => void): () => void {
    listeners.add(listener);
    listener(current);
    return () => { listeners.delete(listener); };
  },
};
