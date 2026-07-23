import type { CultureId, ModeId } from '../data/presets'

export interface SessionSettings {
  durationMinutes: number
  cultureId: CultureId
  mode: ModeId
  phraseId: string
}

export const DEFAULT_DURATION_MINUTES = 30

