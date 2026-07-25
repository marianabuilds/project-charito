import type { DetoxSettings, DetoxIntensity } from '../types/settings';
import { culturalPresets } from '../data/culturalPresets';

const STORAGE_KEY = 'cultural-detox:settings:v1';

function getDefaultSettings(): DetoxSettings {
  const defaultPreset = culturalPresets[0];
  return {
    durationMinutes: 30,
    cultureCode: defaultPreset.cultureCode,
    languageCode: defaultPreset.languageCode,
    mode: 'gentle',
    selectedMessageId: null,
    customMessages: [],
    userName: '',
    goals: [],
    detoxIntensity: 'moderate',
  };
}

function loadSettings(): DetoxSettings {
  if (typeof window === 'undefined') return getDefaultSettings();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSettings();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const defaults = getDefaultSettings();
    // Migrate legacy selectedMessageIds → selectedMessageId
    let selectedMessageId = defaults.selectedMessageId;
    if (typeof parsed.selectedMessageId === 'string' || parsed.selectedMessageId === null) {
      selectedMessageId = parsed.selectedMessageId as string | null;
    } else if (Array.isArray(parsed.selectedMessageIds) && parsed.selectedMessageIds.length > 0) {
      selectedMessageId = parsed.selectedMessageIds[0] as string;
    }
    // Migrate legacy 'custom' selectedMessageId
    if (selectedMessageId === 'custom') {
      selectedMessageId = null;
    }
    return {
      ...defaults,
      ...(typeof parsed.durationMinutes === 'number' ? { durationMinutes: parsed.durationMinutes } : {}),
      ...(typeof parsed.cultureCode === 'string' ? { cultureCode: parsed.cultureCode } : {}),
      ...(typeof parsed.languageCode === 'string' ? { languageCode: parsed.languageCode } : {}),
      ...(parsed.mode === 'gentle' || parsed.mode === 'strict' ? { mode: parsed.mode } : {}),
      selectedMessageId,
      ...(Array.isArray(parsed.customMessages) ? { customMessages: parsed.customMessages } : {}),
      ...(typeof parsed.userName === 'string' ? { userName: parsed.userName } : {}),
      ...(Array.isArray(parsed.goals) ? { goals: parsed.goals as string[] } : {}),
      ...(parsed.detoxIntensity === 'light' || parsed.detoxIntensity === 'moderate' || parsed.detoxIntensity === 'deep'
        ? { detoxIntensity: parsed.detoxIntensity as DetoxIntensity }
        : {}),
    };
  } catch {
    return getDefaultSettings();
  }
}

function persist(settings: DetoxSettings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Best-effort persistence; ignore quota or serialization errors.
  }
}

let currentSettings: DetoxSettings = loadSettings();
const listeners = new Set<(settings: DetoxSettings) => void>();

export const settingsStore = {
  get(): DetoxSettings {
    return currentSettings;
  },
  set(partial: Partial<DetoxSettings>) {
    currentSettings = { ...currentSettings, ...partial };
    persist(currentSettings);
    listeners.forEach((l) => l(currentSettings));
  },
  subscribe(listener: (settings: DetoxSettings) => void): () => void {
    listeners.add(listener);
    listener(currentSettings);
    return () => {
      listeners.delete(listener);
    };
  },
};

export { getDefaultSettings };
