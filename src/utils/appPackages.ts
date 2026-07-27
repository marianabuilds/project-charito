/**
 * Display-name → Android package-name map for AppBlocker.
 * Phone/dialer packages are never blocked (see PHONE_PACKAGES).
 */
export const APP_PACKAGE_MAP: Record<string, string> = {
  Instagram: 'com.instagram.android',
  TikTok: 'com.zhiliaoapp.musically',
  'Twitter/X': 'com.twitter.android',
  'Twitter / X': 'com.twitter.android',
  Facebook: 'com.facebook.katana',
  Snapchat: 'com.snapchat.android',
  Reddit: 'com.reddit.frontpage',
  LinkedIn: 'com.linkedin.android',
  YouTube: 'com.google.android.youtube',
  Netflix: 'com.netflix.mediaclient',
  Spotify: 'com.spotify.music',
  Twitch: 'tv.twitch.android.app',
  WhatsApp: 'com.whatsapp',
  Telegram: 'org.telegram.messenger',
  iMessage: 'com.apple.MobileSMS',
  Discord: 'com.discord',
  'Safari/Chrome': 'com.android.chrome',
  Chrome: 'com.android.chrome',
  Games: '',
  Messages: 'com.google.android.apps.messaging',
  Phone: 'com.google.android.dialer',
};

/** Android dialer / phone packages that must never be blocked. */
export const PHONE_PACKAGES = new Set([
  'com.android.dialer',
  'com.google.android.dialer',
  'com.samsung.android.dialer',
  'com.samsung.android.incallui',
  'com.android.phone',
  'com.android.server.telecom',
  'com.google.android.apps.dialer',
  'com.oneplus.dialer',
  'com.miui.dialer',
  'com.huawei.android.dialer',
  'com.coloros.dialer',
  'com.truecaller',
]);

/** SMS / Messages packages treated as the "Messages" exception. */
export const MESSAGES_PACKAGES = new Set([
  'com.google.android.apps.messaging',
  'com.android.mms',
  'com.samsung.android.messaging',
  'com.android.messaging',
]);

/** Display names that must never appear as selectable blocked apps. */
export const EXCLUDED_APP_NAMES = new Set(['Phone', 'Dialer', 'Phone/Dialer', 'Calls']);

/** Toggleable exception options shown in Settings (Phone is always forced on). */
export const BLOCK_EXCEPTION_OPTIONS = [
  { id: 'Phone', label: 'Phone', locked: true, hint: 'Always available for calls' },
  { id: 'Messages', label: 'Messages', locked: false, hint: 'SMS / default messaging app' },
  { id: 'WhatsApp', label: 'WhatsApp', locked: false, hint: 'Stay reachable on WhatsApp' },
  { id: 'Telegram', label: 'Telegram', locked: false, hint: 'Stay reachable on Telegram' },
] as const;

/** Packages that must stay available for a given exception id. */
export function packagesForException(exceptionId: string): string[] {
  if (exceptionId === 'Phone') return [...PHONE_PACKAGES];
  if (exceptionId === 'Messages') return [...MESSAGES_PACKAGES];
  const mapped = APP_PACKAGE_MAP[exceptionId];
  if (mapped) return [mapped];
  // Raw Android package name stored as an exception
  if (exceptionId.includes('.') && !exceptionId.includes(' ')) return [exceptionId];
  return [];
}

export function exceptionPackageSet(exceptions: string[]): Set<string> {
  const set = new Set<string>([...PHONE_PACKAGES]);
  for (const ex of exceptions) {
    for (const pkg of packagesForException(ex)) set.add(pkg);
  }
  return set;
}

/** Whether an exception list covers this display name or package id. */
export function hasException(exceptions: string[], id: string): boolean {
  if (exceptions.includes(id)) return true;
  if (id === 'Phone' || PHONE_PACKAGES.has(id)) {
    return exceptions.includes('Phone') || exceptions.some((e) => PHONE_PACKAGES.has(e));
  }
  const mapped = APP_PACKAGE_MAP[id];
  if (mapped && exceptions.includes(mapped)) return true;
  for (const [name, pkg] of Object.entries(APP_PACKAGE_MAP)) {
    if (pkg === id && exceptions.includes(name)) return true;
  }
  return false;
}

/**
 * Resolve display names and/or raw package names into Android packages.
 * Always strips Phone/dialer and any settings-based block exceptions.
 */
export function resolvePackages(
  appNames: string[],
  exceptions: string[] = ['Phone', 'Messages'],
): string[] {
  const excluded = exceptionPackageSet(exceptions);
  return appNames
    .filter((name) => !EXCLUDED_APP_NAMES.has(name) && !exceptions.includes(name))
    .map((name) => {
      if (name.includes('.') && !name.includes(' ')) return name;
      return APP_PACKAGE_MAP[name] ?? '';
    })
    .filter((pkg) => pkg.length > 0 && !excluded.has(pkg));
}

export function filterBlockedPackages(
  packages: string[],
  exceptions: string[] = ['Phone', 'Messages'],
): string[] {
  const excluded = exceptionPackageSet(exceptions);
  return packages.filter((pkg) => pkg.length > 0 && !excluded.has(pkg));
}

/** Human-readable summary, e.g. "All apps except Phone, Messages". */
export function formatExceptionsSummary(exceptions: string[]): string {
  const list = Array.from(new Set(['Phone', ...exceptions]));
  if (list.length === 0) return 'All apps';
  return `All apps except ${list.join(', ')}`;
}
