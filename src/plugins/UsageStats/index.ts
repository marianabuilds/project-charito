import { registerPlugin } from '@capacitor/core';

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * A single app's aggregated usage for the requested period.
 * Returned by the Android UsageStatsManager bridge.
 */
export interface AppUsageStat {
  /** Android package name, e.g. 'com.instagram.android' */
  packageName: string;
  /** Human-readable label resolved from PackageManager */
  appName: string;
  /** Total foreground time in milliseconds for the period */
  totalTimeMs: number;
  /** Number of times the app was launched (Android 9+ only; 0 on older devices) */
  launchCount: number;
  /** ISO 8601 timestamp of the last time the app was used */
  lastUsed: string;
}

export interface GetUsageStatsOptions {
  /** How many days back to include. Defaults to 7. */
  days?: number;
}

export interface GetUsageStatsResult {
  stats: AppUsageStat[];
}

/** Plugin interface exposed to TypeScript. */
export interface UsageStatsPlugin {
  /**
   * Fetch per-app usage stats from Android UsageStatsManager.
   *
   * Rejects with code "PERMISSION_DENIED" if the user has not yet granted
   * Usage Access in System Settings. Call `openUsageAccessSettings()` to
   * send them there.
   */
  getUsageStats(options?: GetUsageStatsOptions): Promise<GetUsageStatsResult>;

  /** Returns whether PACKAGE_USAGE_STATS / Usage Access is granted. */
  hasPermission(): Promise<{ granted: boolean }>;

  /**
   * Opens the Android "Usage Access" system settings screen so the user can
   * manually grant the PACKAGE_USAGE_STATS permission.
   */
  openUsageAccessSettings(): Promise<void>;
}

// ── Registration ───────────────────────────────────────────────────────────

/**
 * UsageStats Capacitor plugin.
 *
 * On Android: bridges to UsageStatsPlugin.kt.
 * On web / iOS: the plugin is registered but all calls will throw because there
 * is no native implementation — guard with `Capacitor.isNativePlatform()` or
 * check the `isAvailable` flag returned by `useUsageStats`.
 */
export const UsageStats = registerPlugin<UsageStatsPlugin>('UsageStats');
