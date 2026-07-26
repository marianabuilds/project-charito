import { registerPlugin } from '@capacitor/core';

// ── Types ──────────────────────────────────────────────────────────────────

export interface StartBlockingOptions {
  packages: string[];
  blockEndEpochMs?: number;
  reminderText?: string;
}

export interface HasPermissionResult {
  granted: boolean;
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
  getInstalledApps(): Promise<GetInstalledAppsResult>;
  addListener(
    event: 'breakBlock',
    handler: (data: BreakBlockEvent) => void,
  ): Promise<{ remove: () => void }>;
}

export const AppBlocker = registerPlugin<AppBlockerPlugin>('AppBlocker');
