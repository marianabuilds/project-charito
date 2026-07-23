export interface SpeechOptions {
  lang: string
  rate?: number
  pitch?: number
  volume?: number
}

export interface SpeechEngine {
  readonly isSupported: boolean
  speak: (text: string, options: SpeechOptions) => void
  cancel: () => void
}

function resolveVoice(lang: string): SpeechSynthesisVoice | null {
  const synth = window.speechSynthesis
  const voices = synth.getVoices()
  if (!voices || voices.length === 0) return null

  const exact = voices.find((v) => v.lang === lang)
  if (exact) return exact

  const baseLang = lang.split('-')[0]
  const byBase = voices.find((v) => v.lang.startsWith(baseLang))
  if (byBase) return byBase

  return voices[0] ?? null
}

function createBrowserSpeechEngine(): SpeechEngine {
  const supported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'

  if (!supported) {
    return {
      isSupported: false,
      speak: () => {
        // No-op fallback on unsupported browsers.
      },
      cancel: () => {},
    }
  }

  return {
    isSupported: true,
    speak(text, options) {
      if (!text.trim()) return

      const utterance = new window.SpeechSynthesisUtterance(text)
      utterance.lang = options.lang

      if (options.rate) utterance.rate = options.rate
      if (options.pitch) utterance.pitch = options.pitch
      if (options.volume !== undefined) utterance.volume = options.volume

      const voice = resolveVoice(options.lang)
      if (voice) {
        utterance.voice = voice
      }

      window.speechSynthesis.speak(utterance)
    },
    cancel() {
      window.speechSynthesis.cancel()
    },
  }
}

export const speechEngine: SpeechEngine = createBrowserSpeechEngine()

