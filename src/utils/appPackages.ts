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

/** Display names that must never appear as selectable blocked apps. */
export const EXCLUDED_APP_NAMES = new Set(['Phone', 'Dialer', 'Phone/Dialer', 'Calls']);

/**
 * Resolve display names and/or raw package names into Android packages.
 * Values that look like packages (contain a dot) are passed through.
 */
export function resolvePackages(appNames: string[]): string[] {
  return appNames
    .filter((name) => !EXCLUDED_APP_NAMES.has(name))
    .map((name) => {
      if (name.includes('.') && !name.includes(' ')) return name;
      return APP_PACKAGE_MAP[name] ?? '';
    })
    .filter((pkg) => pkg.length > 0 && !PHONE_PACKAGES.has(pkg));
}

export function filterBlockedPackages(packages: string[]): string[] {
  return packages.filter((pkg) => pkg.length > 0 && !PHONE_PACKAGES.has(pkg));
}
