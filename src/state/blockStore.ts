const STORAGE_KEY = 'charito:blocks:v1';

export type BlockingMethod =
  | 'duration'
  | 'set-hours'
  | 'usage-limit'
  | 'launch-count'
  | 'location';

export interface DetoxBlock {
  id: string;
  label: string;
  /** Only meaningful when blockingMethod === 'set-hours'. "HH:MM" 24hr */
  setHoursStart: string;
  /** Only meaningful when blockingMethod === 'set-hours'. "HH:MM" 24hr */
  setHoursEnd: string;
  /** For "duration" method: session duration in minutes (default 30) */
  durationMinutes: number;
  /** For "usage-limit" method: max minutes per day (default 60) */
  usageLimitMinutes: number;
  /** For "launch-count" method: max opens per day (default 10) */
  launchCountMax: number;
  /** 0=Sun…6=Sat; empty = one-time (today) */
  days: number[];
  blockingMethod: BlockingMethod;
  /** null = random; 'custom' = use customMessage */
  messageId: string | null;
  customMessage: string;
  /** 0 | 5 | 10 | 15 */
  snoozeMinutes: number;
  active: boolean;
  /** For "location" method: lat/lng of saved position */
  location: { lat: number; lng: number } | null;
  /** For "location" method: radius in meters (50 | 100 | 200 | 500) */
  locationRadius: number;
  /**
   * Apps this block applies to.
   * Empty array = all apps (default).
   * Non-empty = only these specific apps.
   */
  selectedApps: string[];
}

export interface BlockState {
  blocks: DetoxBlock[];
}

function validateBlock(raw: unknown): DetoxBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string') return null;
  const validMethods: BlockingMethod[] = ['duration', 'set-hours', 'usage-limit', 'launch-count', 'location'];
  return {
    id: r.id,
    label: typeof r.label === 'string' ? r.label : '',
    // Support legacy startTime/endTime fields from old data
    setHoursStart:
      typeof r.setHoursStart === 'string'
        ? r.setHoursStart
        : typeof r.startTime === 'string'
        ? r.startTime
        : '',
    setHoursEnd:
      typeof r.setHoursEnd === 'string'
        ? r.setHoursEnd
        : typeof r.endTime === 'string'
        ? r.endTime
        : '',
    durationMinutes: typeof r.durationMinutes === 'number' ? r.durationMinutes : 30,
    usageLimitMinutes: typeof r.usageLimitMinutes === 'number' ? r.usageLimitMinutes : 60,
    launchCountMax: typeof r.launchCountMax === 'number' ? r.launchCountMax : 10,
    days: Array.isArray(r.days)
      ? (r.days as unknown[]).filter((d): d is number => typeof d === 'number')
      : [],
    blockingMethod: validMethods.includes(r.blockingMethod as BlockingMethod)
      ? (r.blockingMethod as BlockingMethod)
      : 'duration',
    messageId: typeof r.messageId === 'string' ? r.messageId : null,
    customMessage: typeof r.customMessage === 'string' ? r.customMessage : '',
    snoozeMinutes: typeof r.snoozeMinutes === 'number' ? r.snoozeMinutes : 0,
    active: typeof r.active === 'boolean' ? r.active : true,
    location:
      r.location && typeof (r.location as Record<string, unknown>).lat === 'number' &&
      typeof (r.location as Record<string, unknown>).lng === 'number'
        ? { lat: (r.location as Record<string, unknown>).lat as number, lng: (r.location as Record<string, unknown>).lng as number }
        : null,
    locationRadius: typeof r.locationRadius === 'number' ? r.locationRadius : 100,
    // Migrate legacy excludedApps → selectedApps (inverted semantics)
    // If old excludedApps exists and selectedApps doesn't, we can't recover the
    // full COMMON_APPS list here, so just default to [] (all apps).
    selectedApps: Array.isArray(r.selectedApps)
      ? (r.selectedApps as unknown[]).filter((a): a is string => typeof a === 'string')
      : [],
  };
}

function load(): BlockState {
  if (typeof window === 'undefined') return { blocks: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { blocks: [] };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const blocks = Array.isArray(parsed.blocks)
      ? (parsed.blocks as unknown[]).map(validateBlock).filter((b): b is DetoxBlock => b !== null)
      : [];
    return { blocks };
  } catch {
    return { blocks: [] };
  }
}

function persist(state: BlockState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // best-effort
  }
}

let current: BlockState = load();
const listeners = new Set<(state: BlockState) => void>();

export const blockStore = {
  get(): BlockState {
    return current;
  },
  set(state: BlockState): void {
    current = state;
    persist(state);
    listeners.forEach((l) => l(current));
  },
  subscribe(listener: (state: BlockState) => void): () => void {
    listeners.add(listener);
    listener(current);
    return () => {
      listeners.delete(listener);
    };
  },
};
