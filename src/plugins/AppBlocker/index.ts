import { registerPlugin } from '@capacitor/core';

// ── Types ──────────────────────────────────────────────────────────────────

export interface StartBlockingOptions {
  /**
   * Android package names of apps to block.
   * e.g. ['com.instagram.android', 'com.zhiliaoapp.musically']
   */
  packages: string[];
  /**
   * Unix epoch milliseconds when the block should auto-expire.
   * Pass 0 (or omit) for no expiry — the block stays until stopBlocking() is called.
   */
  blockEndEpochMs?: number;
}

export interface HasAccessibilityPermissionResult {
  /** True if AppBlockerService is enabled in Android Accessibility Settings. */
  granted: boolean;
}

/**
 * Event payload emitted when the user taps "Break block ($1)" in the overlay.
 */
export interface BreakBlockEvent {
  /** The package name of the app the user unlocked. */
  packageName: string;
}

export interface AppBlockerPlugin {
  /**
   * Start blocking the given apps.
   * Writes the package list to SharedPreferences; AppBlockerService picks it up
   * on the next foreground-app change event.
   *
   * Requires the Accessibility Service to be enabled (check hasAccessibilityPermission first).
   */
  startBlocking(options: StartBlockingOptions): Promise<void>;

  /**
   * Stop all active blocking — clears the blocked-packages list.
   * Call this when the detox session ends (completed or cancelled).
   */
  stopBlocking(): Promise<void>;

  /**
   * Returns whether AppBlockerService is enabled in Android Accessibility Settings.
   * If false, call openAccessibilitySettings() to guide the user.
   */
  hasAccessibilityPermission(): Promise<HasAccessibilityPermissionResult>;

  /**
   * Opens the Android Accessibility Settings screen so the user can enable
   * AppBlockerService. The app cannot enable it programmatically.
   */
  openAccessibilitySettings(): Promise<void>;

  /**
   * Register a listener for the "breakBlock" event, fired when the user taps
   * "Break block ($1)" in BlockedOverlayActivity.
   * Use this to trigger the $1 charge flow in the web layer.
   */
  addListener(
    event: 'breakBlock',
    handler: (data: BreakBlockEvent) => void,
  ): Promise<{ remove: () => void }>;
}

// ── Registration ───────────────────────────────────────────────────────────

/**
 * AppBlocker Capacitor plugin.
 *
 * On Android: bridges to AppBlockerPlugin.java + AppBlockerService.java.
 * On web / iOS: registered but all calls are no-ops (guarded by isNativePlatform checks).
 */
export const AppBlocker = registerPlugin<AppBlockerPlugin>('AppBlocker');
