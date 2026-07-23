export type CultureId = 'pe' | 'mx' | 'us'

export type ModeId = 'gentle' | 'strict'

export interface PhrasePreset {
  id: string
  cultureId: CultureId
  mode: ModeId
  text: string
  tone: 'gentle' | 'playful' | 'firm'
  note?: string
}

export interface CultureConfig {
  id: CultureId
  name: string
  flagEmoji: string
  voiceLang: string
  phrases: PhrasePreset[]
}

export const CULTURE_CONFIGS: Record<CultureId, CultureConfig> = {
  pe: {
    id: 'pe',
    name: 'Perú',
    flagEmoji: '🇵🇪',
    // Exact es-PE may not exist; we prefer any es- variant and let the engine pick closest.
    voiceLang: 'es-PE',
    phrases: [
      {
        id: 'pe-gentle-1',
        cultureId: 'pe',
        mode: 'gentle',
        tone: 'gentle',
        text: 'Oye, tómate un descansito del celular. Afuera también pasan cosas bonitas.',
        note: 'Soft, caring reminder to look away from the phone.',
      },
      {
        id: 'pe-gentle-2',
        cultureId: 'pe',
        mode: 'gentle',
        tone: 'playful',
        text: 'Un ratito sin pantalla, ¿sí? Tu mente también necesita respirar.',
      },
      {
        id: 'pe-strict-1',
        cultureId: 'pe',
        mode: 'strict',
        tone: 'firm',
        text: 'Oye compadre, ya basta con el celular. Date un respiro y mira a tu alrededor.',
        note: 'Direct but non-insulting; firm nudge to stop.',
      },
      {
        id: 'pe-strict-2',
        cultureId: 'pe',
        mode: 'strict',
        tone: 'firm',
        text: 'Ya fue por hoy el scroll. Cierra el celular y regresa a tu mundo.',
      },
    ],
  },
  mx: {
    id: 'mx',
    name: 'México',
    flagEmoji: '🇲🇽',
    voiceLang: 'es-MX',
    phrases: [
      {
        id: 'mx-gentle-1',
        cultureId: 'mx',
        mode: 'gentle',
        tone: 'gentle',
        text: 'Oye, ya llevas un buen rato en el cel. Tómate una pausa chiquita.',
      },
      {
        id: 'mx-gentle-2',
        cultureId: 'mx',
        mode: 'gentle',
        tone: 'playful',
        text: 'Un descansito, ¿no? Afuera también hay cosas padres esperándote.',
      },
      {
        id: 'mx-strict-1',
        cultureId: 'mx',
        mode: 'strict',
        tone: 'firm',
        text: 'Ya estuvo bueno de celular por hoy. Cierra la pantalla y date un respiro.',
      },
      {
        id: 'mx-strict-2',
        cultureId: 'mx',
        mode: 'strict',
        tone: 'firm',
        text: 'Haz una pausa ya. Tu mente y tus ojos también necesitan descansar.',
      },
    ],
  },
  us: {
    id: 'us',
    name: 'United States',
    flagEmoji: '🇺🇸',
    voiceLang: 'en-US',
    phrases: [
      {
        id: 'us-gentle-1',
        cultureId: 'us',
        mode: 'gentle',
        tone: 'gentle',
        text: 'Hey, you’ve been on your phone for a while. How about a quick breather?',
      },
      {
        id: 'us-gentle-2',
        cultureId: 'us',
        mode: 'gentle',
        tone: 'playful',
        text: 'Let’s pause the scrolling for a bit. The offline world misses you.',
      },
      {
        id: 'us-strict-1',
        cultureId: 'us',
        mode: 'strict',
        tone: 'firm',
        text: 'Okay, that’s enough phone time for now. Put it down and give yourself a break.',
      },
      {
        id: 'us-strict-2',
        cultureId: 'us',
        mode: 'strict',
        tone: 'firm',
        text: 'Time to wrap this session. Lock the screen and take a real-life moment.',
      },
    ],
  },
}

export const SUPPORTED_CULTURES: CultureConfig[] = [
  CULTURE_CONFIGS.pe,
  CULTURE_CONFIGS.mx,
  CULTURE_CONFIGS.us,
]

export function getPhrasesForCultureAndMode(
  cultureId: CultureId,
  mode: ModeId,
): PhrasePreset[] {
  return CULTURE_CONFIGS[cultureId].phrases.filter((p) => p.mode === mode)
}

