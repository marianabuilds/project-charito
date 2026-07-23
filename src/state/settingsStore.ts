import type { DetoxSettings } from '../types/settings';
import { culturalPresets } from '../data/culturalPresets';

const STORAGE_KEY = 'cultural-detox:settings:v1';

function getDefaultSettings(): DetoxSettings {
  const defaultPreset = culturalPresets[0];
  return {
    durationMinutes: 30,
    cultureCode: defaultPreset.cultureCode,
    languageCode: defaultPreset.languageCode,
    mode: 'gentle',
    selectedMessageIds: defaultPreset.messages.map((m) => m.id),
  };
}

function loadSettings(): DetoxSettings {
  if (typeof window === 'undefined') return getDefaultSettings();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSettings();
    const parsed = JSON.parse(raw) as DetoxSettings;
    return { ...getDefaultSettings(), ...parsed };
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
