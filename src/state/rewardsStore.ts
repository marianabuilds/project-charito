const STORAGE_KEY = 'charito:rewards:v1';

export interface RewardsState {
  points: number;
  streak: number;
  longestStreak: number;
  blocksCompleted: number;
  /** ISO date string of the last completed block, e.g. "2026-07-25" */
  lastBlockDate: string | null;
}

function getDefault(): RewardsState {
  return {
    points: 0,
    streak: 0,
    longestStreak: 0,
    blocksCompleted: 0,
    lastBlockDate: null,
  };
}

function load(): RewardsState {
  if (typeof window === 'undefined') return getDefault();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefault();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const defaults = getDefault();
    return {
      points: typeof parsed.points === 'number' ? parsed.points : defaults.points,
      streak: typeof parsed.streak === 'number' ? parsed.streak : defaults.streak,
      longestStreak: typeof parsed.longestStreak === 'number' ? parsed.longestStreak : defaults.longestStreak,
      blocksCompleted: typeof parsed.blocksCompleted === 'number' ? parsed.blocksCompleted : defaults.blocksCompleted,
      lastBlockDate: typeof parsed.lastBlockDate === 'string' ? parsed.lastBlockDate : null,
    };
  } catch {
    return getDefault();
  }
}

function persist(state: RewardsState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // best-effort
  }
}

let current: RewardsState = load();
const listeners = new Set<(state: RewardsState) => void>();

function notify(): void {
  listeners.forEach((l) => l(current));
}

export const rewardsStore = {
  get(): RewardsState {
    return current;
  },

  subscribe(listener: (state: RewardsState) => void): () => void {
    listeners.add(listener);
    listener(current);
    return () => {
      listeners.delete(listener);
    };
  },

  addPoints(n: number): void {
    current = { ...current, points: current.points + n };
    persist(current);
    notify();
  },

  incrementStreak(): void {
    const newStreak = current.streak + 1;
    current = {
      ...current,
      streak: newStreak,
      longestStreak: Math.max(newStreak, current.longestStreak),
    };
    persist(current);
    notify();
  },

  resetStreak(): void {
    current = { ...current, streak: 0 };
    persist(current);
    notify();
  },

  /**
   * Called when a detox block session completes naturally (timer hits zero).
   * Awards 10 pts per block, 100 pts bonus at each 7-day streak,
   * and 500 pts bonus at each 30-day milestone.
   * Automatically manages the streak counter based on calendar days.
   */
  recordBlockCompleted(): void {
    const today = new Date().toISOString().slice(0, 10);
    const lastDate = current.lastBlockDate;

    let newStreak = current.streak;

    if (lastDate === null) {
      newStreak = 1;
    } else if (lastDate === today) {
      // Already recorded a block today — don't double-count streak
      newStreak = current.streak;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      newStreak = lastDate === yesterdayStr ? current.streak + 1 : 1;
    }

    const newBlocksCompleted = current.blocksCompleted + 1;

    // 10 pts per block + streak milestones
    let pts = 10;
    if (newStreak % 7 === 0 && newStreak > 0) pts += 100;
    if (newStreak % 30 === 0 && newStreak > 0) pts += 500;

    current = {
      ...current,
      points: current.points + pts,
      streak: newStreak,
      longestStreak: Math.max(newStreak, current.longestStreak),
      blocksCompleted: newBlocksCompleted,
      lastBlockDate: today,
    };

    persist(current);
    notify();
  },
};
