import { getPhrasesForCultureAndMode } from '../data/presets'
import type { CultureId, ModeId } from '../data/presets'
import { DEFAULT_DURATION_MINUTES, type SessionSettings } from './types'

const STORAGE_KEY = 'project-charito-settings-v1'

const DEFAULT_SETTINGS: SessionSettings = {
  durationMinutes: DEFAULT_DURATION_MINUTES,
  cultureId: 'pe',
  mode: 'gentle',
  phraseId: getPhrasesForCultureAndMode('pe', 'gentle')[0]?.id ?? '',
}

function safeGetLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function loadSettings(): SessionSettings {
  const storage = safeGetLocalStorage()
  if (!storage) return DEFAULT_SETTINGS

  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS

    const parsed = JSON.parse(raw) as Partial<SessionSettings>

    const cultureId = (parsed.cultureId ?? DEFAULT_SETTINGS.cultureId) as CultureId
    const mode = (parsed.mode ?? DEFAULT_SETTINGS.mode) as ModeId

    const phrases = getPhrasesForCultureAndMode(cultureId, mode)
    const fallbackPhraseId = phrases[0]?.id ?? DEFAULT_SETTINGS.phraseId
    const phraseId =
      phrases.find((p) => p.id === parsed.phraseId)?.id ?? fallbackPhraseId

    const durationMinutes =
      typeof parsed.durationMinutes === 'number' && parsed.durationMinutes > 0
        ? Math.round(parsed.durationMinutes)
        : DEFAULT_SETTINGS.durationMinutes

    return {
      durationMinutes,
      cultureId,
      mode,
      phraseId,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: SessionSettings): void {
  const storage = safeGetLocalStorage()
  if (!storage) return

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Best-effort persistence; ignore quota or serialization errors.
  }
}

