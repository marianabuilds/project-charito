const STORAGE_KEY = 'charito:alarm:v2';

export interface AlarmEntry {
  id: string;
  /** 24-hr format "HH:MM" */
  time: string;
  /** 0=Sun … 6=Sat; empty array = fires once (today) */
  days: number[];
  /** Which cultural message to speak; null = random; 'custom' = use customMessage */
  messageId: string | null;
  customMessage: string;
  /** 0 = no snooze */
  snoozeMinutes: number;
  label: string;
  active: boolean;
}

export interface AlarmState {
  alarms: AlarmEntry[];
}

function validateEntry(raw: unknown): AlarmEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.time !== 'string') return null;
  return {
    id: r.id,
    time: r.time,
    days: Array.isArray(r.days) ? (r.days as number[]).filter((d) => typeof d === 'number') : [],
    messageId: typeof r.messageId === 'string' ? r.messageId : null,
    customMessage: typeof r.customMessage === 'string' ? r.customMessage : '',
    snoozeMinutes: typeof r.snoozeMinutes === 'number' ? r.snoozeMinutes : 0,
    label: typeof r.label === 'string' ? r.label : '',
    active: typeof r.active === 'boolean' ? r.active : true,
  };
}

function load(): AlarmState {
  if (typeof window === 'undefined') return { alarms: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { alarms: [] };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const alarms = Array.isArray(parsed.alarms)
      ? (parsed.alarms as unknown[]).map(validateEntry).filter(Boolean) as AlarmEntry[]
      : [];
    return { alarms };
  } catch {
    return { alarms: [] };
  }
}

function persist(state: AlarmState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // best-effort
  }
}

let current: AlarmState = load();
const listeners = new Set<(state: AlarmState) => void>();

export const alarmStore = {
  get(): AlarmState {
    return current;
  },
  set(state: AlarmState): void {
    current = state;
    persist(state);
    listeners.forEach((l) => l(current));
  },
  subscribe(listener: (state: AlarmState) => void): () => void {
    listeners.add(listener);
    listener(current);
    return () => {
      listeners.delete(listener);
    };
  },
};
