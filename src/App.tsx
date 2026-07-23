import { useEffect } from 'react'
import './App.css'
import {
  CULTURE_CONFIGS,
  SUPPORTED_CULTURES,
  getPhrasesForCultureAndMode,
} from './data/presets'
import { speechEngine } from './audio/speechEngine'
import { useSessionSettings } from './settings/useSessionSettings'
import { SettingsPanel } from './components/SettingsPanel'
import { SessionPanel } from './components/SessionPanel'
import { useDetoxSession } from './hooks/useDetoxSession'
import type { CultureId, ModeId } from './data/presets'

function App() {
  const { settings, updateSetting } = useSessionSettings()

  const culture = CULTURE_CONFIGS[settings.cultureId]
  const phrases = getPhrasesForCultureAndMode(settings.cultureId, settings.mode)
  const selectedPhrase =
    phrases.find((p) => p.id === settings.phraseId) ?? phrases[0]

  // Ensure phrase stays in sync when the culture or mode changes.
  useEffect(() => {
    if (!selectedPhrase) return
    if (settings.phraseId === selectedPhrase.id) return
    updateSetting('phraseId', selectedPhrase.id)
  }, [selectedPhrase, settings.phraseId, updateSetting])

  const session = useDetoxSession({
    durationMinutes: settings.durationMinutes,
    mode: settings.mode,
    cultureId: settings.cultureId,
    phraseText: selectedPhrase?.text ?? '',
    voiceLang: culture.voiceLang,
    engine: speechEngine,
  })

  const isStrict = settings.mode === 'strict'
  const showStrictOverlay = isStrict && session.status === 'completed'

  const handleChangeCulture = (cultureId: CultureId) => {
    updateSetting('cultureId', cultureId)
  }

  const handleChangeMode = (mode: ModeId) => {
    updateSetting('mode', mode)
  }

  const handleChangePhrase = (phraseId: string) => {
    updateSetting('phraseId', phraseId)
  }

  const handleChangeDuration = (minutes: number) => {
    const clamped = Math.min(120, Math.max(5, Math.round(minutes)))
    updateSetting('durationMinutes', clamped)
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-title-block">
          <p className="app-badge">Project Charito</p>
          <h1 className="app-title">
            Culturally rooted nudges off your phone
          </h1>
          <p className="app-subtitle">
            Set a timer, pick a familiar voice line, and let Charito remind you
            when it is time to step away from the screen.
          </p>
        </div>
      </header>

      <main className="app-main">
        <SettingsPanel
          settings={settings}
          cultures={SUPPORTED_CULTURES}
          availablePhrases={phrases}
          selectedCulture={culture}
          onChangeCulture={handleChangeCulture}
          onChangeMode={handleChangeMode}
          onChangePhrase={handleChangePhrase}
          onChangeDuration={handleChangeDuration}
        />

        <SessionPanel
          status={session.status}
          remainingSeconds={session.remainingSeconds}
          totalSeconds={session.totalSeconds}
          mode={settings.mode}
          phraseText={selectedPhrase?.text ?? ''}
          onStart={session.start}
          onPause={session.pause}
          onResume={session.resume}
          onReset={session.reset}
        />
      </main>

      {showStrictOverlay && (
        <div
          className="strict-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Session complete"
        >
          <div className="strict-overlay-content">
            <p className="strict-overlay-label">Session complete</p>
            <p className="strict-overlay-text">{selectedPhrase?.text}</p>
            <button
              type="button"
              className="button button-primary strict-overlay-button"
              onClick={session.reset}
            >
              I&apos;ll put the phone down
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
