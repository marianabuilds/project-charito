/**
 * Lightweight pre-block notifications.
 * Uses the Web Notification API (works in browsers + Capacitor WebView when permitted).
 * No @capacitor/local-notifications dependency required.
 */

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

export async function showLocalNotification(
  title: string,
  body: string,
): Promise<void> {
  const ok = await ensureNotificationPermission();
  if (!ok) return;
  try {
    new Notification(title, { body, silent: false });
  } catch {
    // Ignored — some WebViews disallow Notification constructor without a service worker
  }
}

/** Subtract minutes from an "HH:MM" clock string (wraps within the day). */
export function subtractMinutesHHMM(hhmm: string, minutes: number): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  let total = h * 60 + m - minutes;
  total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

/** Minutes from midnight for "HH:MM"; supports overnight windows. */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function isWithinSetHoursWindow(
  nowHHMM: string,
  start: string,
  end: string,
): boolean {
  if (!start || !end) return false;
  const now = hhmmToMinutes(nowHHMM);
  const s = hhmmToMinutes(start);
  const e = hhmmToMinutes(end);
  if (s <= e) return now >= s && now <= e;
  // Overnight window e.g. 21:00–07:00
  return now >= s || now <= e;
}
