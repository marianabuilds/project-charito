import type {
  CultureConfig,
  CultureId,
  ModeId,
  PhrasePreset,
} from '../data/presets'
import type { SessionSettings } from '../settings/types'

interface SettingsPanelProps {
  settings: SessionSettings
  cultures: CultureConfig[]
  availablePhrases: PhrasePreset[]
  selectedCulture: CultureConfig
  onChangeCulture: (cultureId: CultureId) => void
  onChangeMode: (mode: ModeId) => void
  onChangePhrase: (phraseId: string) => void
  onChangeDuration: (minutes: number) => void
}

export function SettingsPanel({
  settings,
  cultures,
  availablePhrases,
  selectedCulture,
  onChangeCulture,
  onChangeMode,
  onChangePhrase,
  onChangeDuration,
}: SettingsPanelProps) {
  return (
    <section className="card settings-card" aria-labelledby="settings-heading">
      <div className="card-header">
        <h2 id="settings-heading">Session settings</h2>
        <p className="card-subtitle">
          Choose your culture, tone, and how long Charito should watch the clock
          for you.
        </p>
      </div>

      <form
        className="settings-form"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <div className="field">
          <label className="field-label" htmlFor="culture-select">
            Culture
          </label>
          <div className="field-description">
            We start with Peru, Mexico, and the United States.
          </div>
          <div className="field-control">
            <select
              id="culture-select"
              className="select"
              value={settings.cultureId}
              onChange={(event) =>
                onChangeCulture(event.target.value as CultureId)
              }
            >
              {cultures.map((culture) => (
                <option key={culture.id} value={culture.id}>
                  {culture.flagEmoji} {culture.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Mode</span>
          <div className="field-description">
            Gentle mode nudges you mid-session. Strict mode brings a full-screen
            overlay when time is up.
          </div>
          <div className="mode-toggle" role="radiogroup" aria-label="Session mode">
            <button
              type="button"
              className={`mode-pill${
                settings.mode === 'gentle' ? ' mode-pill--active' : ''
              }`}
              onClick={() => onChangeMode('gentle')}
              aria-pressed={settings.mode === 'gentle'}
            >
              <span className="mode-title">Gentle</span>
              <span className="mode-caption">Soft reminders, no blocker</span>
            </button>
            <button
              type="button"
              className={`mode-pill${
                settings.mode === 'strict' ? ' mode-pill--active' : ''
              }`}
              onClick={() => onChangeMode('strict')}
              aria-pressed={settings.mode === 'strict'}
            >
              <span className="mode-title">Strict</span>
              <span className="mode-caption">Stronger end-of-session prompt</span>
            </button>
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="duration-range">
            Session length
          </label>
          <div className="field-description">
            How long can Charito let you scroll before nudging you to pause?
          </div>
          <div className="field-control field-control--stack">
            <input
              id="duration-range"
              type="range"
              min={5}
              max={120}
              step={5}
              value={settings.durationMinutes}
              onChange={(event) =>
                onChangeDuration(Number.parseInt(event.target.value, 10))
              }
            />
            <div className="duration-display">
              <span className="duration-value">
                {settings.durationMinutes} min
              </span>
              <span className="duration-hint">Between 5 and 120 minutes</span>
            </div>
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="phrase-select">
            Voice line
          </label>
          <div className="field-description">
            Charito will speak this out loud using a browser voice in{' '}
            {selectedCulture.name}.
          </div>
          <div className="field-control">
            <select
              id="phrase-select"
              className="select"
              value={settings.phraseId}
              onChange={(event) => onChangePhrase(event.target.value)}
            >
              {availablePhrases.map((phrase) => (
                <option key={phrase.id} value={phrase.id}>
                  {phrase.text}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </section>
  )
}

