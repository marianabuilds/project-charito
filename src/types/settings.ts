export type DetoxMode = 'gentle' | 'strict';

export interface CustomMessage {
  id: string;           // crypto.randomUUID()
  text: string;         // typed text (may be empty if audio only)
  audioDataUrl: string; // base64 data URL (may be empty if text only)
  label: string;        // auto-label: first 30 chars of text, or "Recording N"
}

export interface DetoxSettings {
  durationMinutes: number;
  cultureCode: string; // e.g. 'pe_PE'
  languageCode: string; // e.g. 'es-PE'
  mode: DetoxMode;
  /** Curated voice actor id used for TTS reminders */
  voiceActorId: string;
  /** ID of the selected message, null = random */
  selectedMessageId: string | null;
  /** Array of custom reminder messages */
  customMessages: CustomMessage[];
  /** User's display name; empty string = not set */
  userName: string;
  /** Goals selected during onboarding, e.g. ['sleep', 'focus'] */
  goals: string[];
  /**
   * Minutes before a scheduled set-hours block starts to show a reminder notification.
   * Default 10.
   */
  preBlockReminderMinutes: number;
  /**
   * Apps that stay available during every detox block (exceptions).
   * Display names, e.g. ['Phone', 'Messages']. Phone is always kept.
   */
  blockExceptions: string[];
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
