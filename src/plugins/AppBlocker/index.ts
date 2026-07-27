import { registerPlugin } from '@capacitor/core';

// ── Types ──────────────────────────────────────────────────────────────────

export interface StartBlockingOptions {
  packages: string[];
  blockEndEpochMs?: number;
  reminderText?: string;
}

export interface PreviewBlockedScreenOptions {
  /** Spoken / quoted reminder on the native overlay. */
  reminderText?: string;
  /** Sample third-party app label shown on the preview (defaults to Instagram). */
  appName?: string;
}

export interface HasPermissionResult {
  granted: boolean;
  /** Present for runtime permissions that can be permanently denied. */
  denied?: boolean;
}

export interface InstalledApp {
  packageName: string;
  appName: string;
}

export interface GetInstalledAppsResult {
  apps: InstalledApp[];
}

export interface BreakBlockEvent {
  packageName: string;
}

export interface AppBlockerPlugin {
  startBlocking(options: StartBlockingOptions): Promise<void>;
  stopBlocking(): Promise<void>;
  hasAccessibilityPermission(): Promise<HasPermissionResult>;
  openAccessibilitySettings(): Promise<void>;
  hasOverlayPermission(): Promise<HasPermissionResult>;
  openOverlaySettings(): Promise<void>;
  hasMicrophonePermission(): Promise<HasPermissionResult>;
  requestMicrophonePermission(): Promise<HasPermissionResult>;
  /** Opens Charito's app details settings (mic, notifications, etc.). */
  openAppSettings(): Promise<void>;
  /**
   * Native full-screen blocked-app preview (dismissible). Does not start a live block.
   * Android only — reject/no-op on web.
   */
  previewBlockedScreen(options?: PreviewBlockedScreenOptions): Promise<void>;
  getInstalledApps(): Promise<GetInstalledAppsResult>;
  addListener(
    event: 'breakBlock',
    handler: (data: BreakBlockEvent) => void,
  ): Promise<{ remove: () => void }>;
}

export const AppBlocker = registerPlugin<AppBlockerPlugin>('AppBlocker');
