// ── Time-of-day body-cue messages ─────────────────────────────────────────
//
// Returns a context-aware nudge based on the current hour. These surface
// during evening/night and early-morning detox blocks as gentle reminders
// rooted in how the body actually feels at those times.

interface BodyCue {
  /** Earliest hour (inclusive, 24-h) this message applies */
  fromHour: number;
  /** Latest hour (exclusive, 24-h) this message applies */
  toHour: number;
  text: string;
}

const BODY_CUES: BodyCue[] = [
  {
    fromHour: 21, // 9 PM
    toHour: 22,
    text: "It's getting late — your eyes deserve rest too.",
  },
  {
    fromHour: 22, // 10 PM
    toHour: 23,
    text: "Your brain is winding down. Give it the quiet it needs.",
  },
  {
    fromHour: 23, // 11 PM – midnight
    toHour: 24,
    text: "You've done enough today. Rest is productive too.",
  },
  {
    fromHour: 0,  // midnight – 5 AM (same cue, late night)
    toHour: 5,
    text: "You've done enough today. Rest is productive too.",
  },
  {
    fromHour: 6,  // 6 AM – 8 AM
    toHour: 8,
    text: "Morning light is better than screen light. Start slow.",
  },
];

/**
 * Returns a body-cue message appropriate for the current hour, or null if
 * there is no cue for the current time window.
 */
export function getBodyCueMessage(): string | null {
  const hour = new Date().getHours();
  const cue = BODY_CUES.find((c) => hour >= c.fromHour && hour < c.toHour);
  return cue?.text ?? null;
}

/**
 * Returns true when the current time falls inside a body-cue window
 * (evening, night, or early morning).
 */
export function isBodyCueTime(): boolean {
  return getBodyCueMessage() !== null;
}
