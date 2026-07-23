export type DetoxMode = 'gentle' | 'strict';

export interface DetoxSettings {
  durationMinutes: number;
  cultureCode: string; // e.g. 'pe_PE'
  languageCode: string; // e.g. 'es-PE'
  mode: DetoxMode;
  selectedMessageIds: string[];
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
