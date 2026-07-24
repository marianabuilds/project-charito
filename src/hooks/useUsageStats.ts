import React from 'react';
import { Capacitor } from '@capacitor/core';
import { UsageStats } from '../plugins/UsageStats';
import { screenTimeStore } from '../state/screenTimeStore';
import type { PerAppStat } from '../state/screenTimeStore';

// ── Status type ────────────────────────────────────────────────────────────

export type UsageStatsStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'permission-denied'
  | 'unavailable'  // non-Android platform
  | 'error';

export interface UseUsageStatsResult {
  /** Current status of the data fetch */
  status: UsageStatsStatus;
  /** True only on Android where the plugin is available */
  isAvailable: boolean;
  /** True while the native query is in flight */
  isLoading: boolean;
  /** Sorted per-app stats (top apps first); empty on non-Android or before first load */
  stats: PerAppStat[];
  /** Top N apps by foreground time */
  topApps: PerAppStat[];
  /** Human-readable error message if status === 'error' */
  error: string | null;
  /** Re-fetch stats (e.g. after the user grants permission and returns to the app) */
  refresh: () => void;
  /** Open the Android Usage Access settings screen */
  openPermissionSettings: () => void;
}

// ── Friendly name overrides ────────────────────────────────────────────────
// Maps common Android package names to the label we want to show in the UI.
// The native side already tries PackageManager, but these provide a cleaner
// override for well-known apps in case the device label differs.

const FRIENDLY_NAMES: Record<string, string> = {
  'com.instagram.android':      'Instagram',
  'com.zhiliaoapp.musically':   'TikTok',
  'com.ss.android.ugc.trill':   'TikTok',
  'com.twitter.android':        'Twitter / X',
  'com.facebook.katana':        'Facebook',
  'com.snapchat.android':       'Snapchat',
  'com.reddit.frontpage':       'Reddit',
  'com.linkedin.android':       'LinkedIn',
  'com.google.android.youtube': 'YouTube',
  'com.netflix.mediaclient':    'Netflix',
  'com.spotify.music':          'Spotify',
  'tv.twitch.android.app':      'Twitch',
  'com.whatsapp':               'WhatsApp',
  'org.telegram.messenger':     'Telegram',
  'com.discord':                'Discord',
  'com.android.chrome':         'Chrome',
  'com.google.android.gm':      'Gmail',
  'com.google.android.apps.maps': 'Google Maps',
};

function applyFriendlyName(packageName: string, nativeLabel: string): string {
  return FRIENDLY_NAMES[packageName] ?? nativeLabel;
}

// ── Hook ───────────────────────────────────────────────────────────────────

/**
 * Fetches real per-app screen time data from Android UsageStatsManager.
 *
 * - On non-Android platforms, returns `isAvailable: false` and empty stats
 *   immediately — no errors thrown.
 * - On Android, queries the last 7 days, maps results into `PerAppStat`,
 *   pushes them into `screenTimeStore`, and re-fetches when `refresh()` is
 *   called (e.g. after the user returns from the permission settings screen).
 */
export function useUsageStats(topN = 5): UseUsageStatsResult {
  const isAvailable = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  const [status, setStatus] = React.useState<UsageStatsStatus>(
    isAvailable ? 'idle' : 'unavailable',
  );
  const [stats, setStats] = React.useState<PerAppStat[]>(() =>
    screenTimeStore.getPerApp(),
  );
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refresh = React.useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const openPermissionSettings = React.useCallback(() => {
    if (!isAvailable) return;
    void UsageStats.openUsageAccessSettings();
  }, [isAvailable]);

  React.useEffect(() => {
    if (!isAvailable) return;

    let cancelled = false;
    setStatus('loading');
    setError(null);

    void (async () => {
      try {
        const { stats: raw } = await UsageStats.getUsageStats({ days: 7 });

        if (cancelled) return;

        const now = new Date().toISOString();
        const mapped: PerAppStat[] = raw.map((s) => ({
          packageName: s.packageName,
          appName: applyFriendlyName(s.packageName, s.appName),
          totalMinutes: Math.round(s.totalTimeMs / 60_000),
          launchCount: s.launchCount,
          lastUsed: s.lastUsed,
          syncedAt: now,
        }));

        screenTimeStore.setPerApp(mapped);
        setStats(mapped);
        setStatus('ready');
      } catch (err: unknown) {
        if (cancelled) return;

        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'PERMISSION_DENIED' || msg.includes('PERMISSION_DENIED')) {
          setStatus('permission-denied');
        } else {
          setStatus('error');
          setError(msg);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [isAvailable, refreshKey]);

  // Also sync from store subscription so other components sharing the store
  // see updates without needing to call the hook themselves.
  React.useEffect(() => {
    return screenTimeStore.subscribePerApp((updated) => {
      setStats([...updated].sort((a, b) => b.totalMinutes - a.totalMinutes));
    });
  }, []);

  return {
    status,
    isAvailable,
    isLoading: status === 'loading',
    stats,
    topApps: stats.slice(0, topN),
    error,
    refresh,
    openPermissionSettings,
  };
}
