export type DetoxMode = 'gentle' | 'strict';

export interface DetoxSettings {
  durationMinutes: number;
  cultureCode: string; // e.g. 'pe_PE'
  languageCode: string; // e.g. 'es-PE'
  mode: DetoxMode;
  /** ID of the selected message, null = random, 'custom' = use customMessage */
  selectedMessageId: string | null;
  customMessage: string;
  /** Base64 data URL of a recorded audio message; empty string = none */
  customMessageAudio: string;
  /** User's display name; empty string = not set */
  userName: string;
  /** Goals selected during onboarding, e.g. ['sleep', 'focus'] */
  goals: string[];
}

export interface CulturalMessage {
  id: string;
  text: string;
  tone: 'gentle' | 'playful' | 'stern';
}

export interface CulturalPreset {
  id: string;
  cultureCode: string;
  label: string;
  languageCode: string;
  messages: CulturalMessage[];
}
