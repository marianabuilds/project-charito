import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { loadSettings, saveSettings } from './storage'
import { DEFAULT_DURATION_MINUTES } from './types'

const STORAGE_KEY = 'project-charito-settings-v1'

describe('settings storage', () => {
  const originalLocalStorage = globalThis.localStorage

  beforeEach(() => {
    const store = new Map<string, string>()
    // Vitest with jsdom provides localStorage, but we create a minimal mock
    // so we can assert reads and writes deterministically.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).localStorage = {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value)
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key)
      }),
      clear: vi.fn(() => store.clear()),
      key: vi.fn(),
      get length() {
        return store.size
      },
    }
  })

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).localStorage = originalLocalStorage
    vi.restoreAllMocks()
  })

  it('returns defaults when storage is empty', () => {
    const settings = loadSettings()
    expect(settings.durationMinutes).toBe(DEFAULT_DURATION_MINUTES)
    expect(settings.cultureId).toBe('pe')
    expect(settings.mode).toBe('gentle')
  })

  it('round-trips values through save and load', () => {
    const initial = loadSettings()
    const updated = {
      ...initial,
      durationMinutes: 45,
      cultureId: 'mx' as const,
      mode: 'strict' as const,
    }

    saveSettings(updated)
    const loaded = loadSettings()

    expect(loaded.durationMinutes).toBe(45)
    expect(loaded.cultureId).toBe('mx')
    expect(loaded.mode).toBe('strict')
  })

  it('recovers safely from invalid JSON', () => {
    globalThis.localStorage.setItem(STORAGE_KEY, '{not-json')
    const settings = loadSettings()
    expect(settings.durationMinutes).toBe(DEFAULT_DURATION_MINUTES)
  })
})

