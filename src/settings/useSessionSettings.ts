import { useEffect, useState } from 'react'
import { loadSettings, saveSettings } from './storage'
import type { SessionSettings } from './types'

export function useSessionSettings() {
  const [settings, setSettings] = useState<SessionSettings>(() => loadSettings())

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  function updateSetting<K extends keyof SessionSettings>(
    key: K,
    value: SessionSettings[K],
  ) {
    setSettings((prev) => {
      if (prev[key] === value) return prev
      return { ...prev, [key]: value }
    })
  }

  return { settings, updateSetting }
}

