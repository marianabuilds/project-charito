/**
 * Curated "voice actors" mapped onto device Speech Synthesis voices.
 * Matching is best-effort by name/lang patterns — availability varies by OS.
 */

export type VoiceTone =
  | 'professional'
  | 'narration'
  | 'conversational'
  | 'educational'
  | 'acting'
  | 'meditation';

export const VOICE_TONES: VoiceTone[] = [
  'professional',
  'narration',
  'conversational',
  'educational',
  'acting',
  'meditation',
];

export const VOICE_TONE_LABELS: Record<VoiceTone, string> = {
  professional: 'Professional',
  narration: 'Narration',
  conversational: 'Conversational',
  educational: 'Educational',
  acting: 'Acting',
  meditation: 'Meditation',
};

export interface VoiceActor {
  id: string;
  name: string;
  /** Short personality label, Speechify-style */
  style: string;
  /** Primary delivery tone for filtering */
  tone: VoiceTone;
  /** Primary language tag, e.g. es-MX */
  languageCode: string;
  /** Language family for filtering: es | en */
  langFamily: 'es' | 'en';
  gender: 'feminine' | 'masculine' | 'neutral';
  /** Case-insensitive substrings matched against SpeechSynthesisVoice.name */
  voiceNameHints: string[];
  /** Sample line for preview */
  sample: string;
}

export const VOICE_ACTORS: VoiceActor[] = [
  {
    id: 'sofia',
    name: 'Sofía',
    style: 'Warm & clear',
    tone: 'conversational',
    languageCode: 'es-MX',
    langFamily: 'es',
    gender: 'feminine',
    voiceNameHints: ['sabina', 'paulina', 'mexican', 'español mexico', 'spanish mexico', 'lucia', 'soledad'],
    sample: 'Oye, un ratito sin pantalla. Tu mente también necesita respirar.',
  },
  {
    id: 'mateo',
    name: 'Mateo',
    style: 'Steady & firm',
    tone: 'professional',
    languageCode: 'es-ES',
    langFamily: 'es',
    gender: 'masculine',
    voiceNameHints: ['jorge', 'juan', 'diego', 'enrique', 'pablo', 'spanish spain', 'español españa'],
    sample: 'Ya basta con el celular. Date un respiro y mira a tu alrededor.',
  },
  {
    id: 'camila',
    name: 'Camila',
    style: 'Soft & caring',
    tone: 'meditation',
    languageCode: 'es-US',
    langFamily: 'es',
    gender: 'feminine',
    voiceNameHints: ['monica', 'elena', 'maria', 'carmen', 'spanish', 'español'],
    sample: 'Haz un descanso, tu mente te lo va a agradecer.',
  },
  {
    id: 'andres',
    name: 'Andrés',
    style: 'Calm coach',
    tone: 'educational',
    languageCode: 'es-MX',
    langFamily: 'es',
    gender: 'masculine',
    voiceNameHints: ['rafael', 'antonio', 'carlos', 'google español', 'microsoft sabina'],
    sample: 'Ya fue por hoy el scroll. Cierra el celular y regresa a tu mundo.',
  },
  {
    id: 'jordan',
    name: 'Jordan',
    style: 'Clear & grounded',
    tone: 'narration',
    languageCode: 'en-US',
    langFamily: 'en',
    gender: 'neutral',
    voiceNameHints: ['samantha', 'alex', 'daniel', 'karen', 'moira', 'google us english', 'microsoft david', 'microsoft zira'],
    sample: 'Put the phone down for a moment. Your mind deserves a real break.',
  },
  {
    id: 'ava',
    name: 'Ava',
    style: 'Gentle nudge',
    tone: 'conversational',
    languageCode: 'en-US',
    langFamily: 'en',
    gender: 'feminine',
    voiceNameHints: ['samantha', 'victoria', 'karen', 'susan', 'zira', 'google us english'],
    sample: 'Hey — step away from the scroll. One deep breath, then come back later.',
  },
  {
    id: 'marcus',
    name: 'Marcus',
    style: 'Direct',
    tone: 'acting',
    languageCode: 'en-GB',
    langFamily: 'en',
    gender: 'masculine',
    voiceNameHints: ['daniel', 'arthur', 'oliver', 'google uk english', 'microsoft george', 'ravi'],
    sample: 'Enough scrolling for now. Close the app and return to your day.',
  },
];

export const DEFAULT_VOICE_ACTOR_ID = 'sofia';

export function getVoiceActor(id: string | null | undefined): VoiceActor {
  return VOICE_ACTORS.find((v) => v.id === id) ?? VOICE_ACTORS[0];
}

export function voiceActorsForLanguage(languageCode: string): VoiceActor[] {
  const family = languageCode.toLowerCase().startsWith('en') ? 'en' : 'es';
  const preferred = VOICE_ACTORS.filter((v) => v.langFamily === family);
  const rest = VOICE_ACTORS.filter((v) => v.langFamily !== family);
  return [...preferred, ...rest];
}

export type VoiceLangFilter = 'all' | 'es' | 'en';
export type VoiceToneFilter = 'all' | VoiceTone;

/** Filter curated actors by language family and/or tone. */
export function filterVoiceActors(
  actors: VoiceActor[],
  lang: VoiceLangFilter,
  tone: VoiceToneFilter,
): VoiceActor[] {
  return actors.filter((actor) => {
    if (lang !== 'all' && actor.langFamily !== lang) return false;
    if (tone !== 'all' && actor.tone !== tone) return false;
    return true;
  });
}

/** Best-effort match of a curated actor to a device voice. */
export function resolveDeviceVoice(
  actor: VoiceActor,
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  const hints = actor.voiceNameHints.map((h) => h.toLowerCase());
  const byHint = voices.find((v) => {
    const name = v.name.toLowerCase();
    return hints.some((h) => name.includes(h));
  });
  if (byHint) return byHint;

  const exactLang = voices.find((v) => v.lang === actor.languageCode);
  if (exactLang) return exactLang;

  const base = actor.languageCode.split('-')[0];
  const byBase = voices.find((v) => v.lang.toLowerCase().startsWith(base));
  if (byBase) return byBase;

  return voices[0] ?? null;
}
