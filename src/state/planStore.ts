const PLAN_KEY = 'charito:plan:v1';

export type Plan = 'free' | 'premium';

export interface PlanState {
  plan: Plan;
}

function load(): PlanState {
  if (typeof window === 'undefined') return { plan: 'free' };
  try {
    const raw = window.localStorage.getItem(PLAN_KEY);
    if (!raw) return { plan: 'free' };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return { plan: parsed.plan === 'premium' ? 'premium' : 'free' };
  } catch {
    return { plan: 'free' };
  }
}

function persist(state: PlanState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PLAN_KEY, JSON.stringify(state));
  } catch {
    // best-effort
  }
}

let current: PlanState = load();
const listeners = new Set<(state: PlanState) => void>();

export const planStore = {
  get(): PlanState {
    return current;
  },
  set(state: PlanState): void {
    current = state;
    persist(state);
    listeners.forEach((l) => l(current));
  },
  subscribe(listener: (state: PlanState) => void): () => void {
    listeners.add(listener);
    listener(current);
    return () => {
      listeners.delete(listener);
    };
  },
};
