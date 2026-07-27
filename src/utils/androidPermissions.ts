import { Capacitor } from '@capacitor/core';

export type PermState = 'idle' | 'granted' | 'denied' | 'unsupported';

export interface AndroidPermissionStatuses {
  notifications: PermState;
  usage: PermState;
  accessibility: PermState;
  overlay: PermState;
  microphone: PermState;
}

const isAndroid = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

/** Read real granted/denied state from native APIs (or web fallbacks). */
export async function refreshAndroidPermissions(): Promise<AndroidPermissionStatuses> {
  const base: AndroidPermissionStatuses = {
    notifications: 'idle',
    usage: 'idle',
    accessibility: 'idle',
    overlay: 'idle',
    microphone: 'idle',
  };

  if (!isAndroid()) {
    if (!('Notification' in window)) base.notifications = 'unsupported';
    else if (Notification.permission === 'granted') base.notifications = 'granted';
    else if (Notification.permission === 'denied') base.notifications = 'denied';

    try {
      const result = await navigator.permissions?.query?.({ name: 'microphone' as PermissionName });
      if (result?.state === 'granted') base.microphone = 'granted';
      else if (result?.state === 'denied') base.microphone = 'denied';
    } catch { /* unsupported query */ }
    return base;
  }

  try {
    const { BlockScheduler } = await import('../plugins/BlockScheduler');
    const notif = await BlockScheduler.hasNotificationPermission();
    base.notifications = notif.granted ? 'granted' : 'idle';
  } catch { /* plugin miss */ }

  try {
    const { UsageStats } = await import('../plugins/UsageStats');
    const usage = await UsageStats.hasPermission();
    base.usage = usage.granted ? 'granted' : 'idle';
  } catch { /* plugin miss */ }

  try {
    const { AppBlocker } = await import('../plugins/AppBlocker');
    const [a11y, overlay, mic] = await Promise.all([
      AppBlocker.hasAccessibilityPermission(),
      AppBlocker.hasOverlayPermission(),
      AppBlocker.hasMicrophonePermission(),
    ]);
    base.accessibility = a11y.granted ? 'granted' : 'idle';
    base.overlay = overlay.granted ? 'granted' : 'idle';
    base.microphone = mic.granted ? 'granted' : mic.denied ? 'denied' : 'idle';
  } catch { /* plugin miss */ }

  return base;
}

/** Request / deep-link into the real Android Settings screen for each permission. */
export async function requestAndroidPermission(
  kind: keyof AndroidPermissionStatuses,
): Promise<PermState> {
  if (!isAndroid()) {
    if (kind === 'notifications') {
      if (!('Notification' in window)) return 'unsupported';
      if (Notification.permission === 'granted') return 'granted';
      const result = await Notification.requestPermission();
      return result === 'granted' ? 'granted' : 'denied';
    }
    if (kind === 'microphone') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        return 'granted';
      } catch {
        return 'denied';
      }
    }
    return 'idle';
  }

  try {
    if (kind === 'notifications') {
      const { BlockScheduler } = await import('../plugins/BlockScheduler');
      const current = await BlockScheduler.hasNotificationPermission();
      if (current.granted) return 'granted';
      const requested = await BlockScheduler.requestNotificationPermission();
      if (requested.granted) return 'granted';
      // Denied or permanently denied — open system notification settings
      await BlockScheduler.openNotificationSettings();
      const after = await BlockScheduler.hasNotificationPermission();
      return after.granted ? 'granted' : 'idle';
    }

    if (kind === 'usage') {
      const { UsageStats } = await import('../plugins/UsageStats');
      const current = await UsageStats.hasPermission();
      if (current.granted) return 'granted';
      await UsageStats.openUsageAccessSettings();
      return 'idle';
    }

    if (kind === 'accessibility') {
      const { AppBlocker } = await import('../plugins/AppBlocker');
      const current = await AppBlocker.hasAccessibilityPermission();
      if (current.granted) return 'granted';
      await AppBlocker.openAccessibilitySettings();
      return 'idle';
    }

    if (kind === 'overlay') {
      const { AppBlocker } = await import('../plugins/AppBlocker');
      const current = await AppBlocker.hasOverlayPermission();
      if (current.granted) return 'granted';
      await AppBlocker.openOverlaySettings();
      return 'idle';
    }

    if (kind === 'microphone') {
      const { AppBlocker } = await import('../plugins/AppBlocker');
      const current = await AppBlocker.hasMicrophonePermission();
      if (current.granted) return 'granted';
      if (current.denied) {
        await AppBlocker.openAppSettings();
        return 'denied';
      }
      const requested = await AppBlocker.requestMicrophonePermission();
      if (requested.granted) return 'granted';
      if (requested.denied) {
        await AppBlocker.openAppSettings();
        return 'denied';
      }
      return 'idle';
    }
  } catch {
    return 'idle';
  }

  return 'idle';
}

/** Call `onVisible` whenever the WebView returns to the foreground. */
export function onAppBecameVisible(onVisible: () => void): () => void {
  const handler = () => {
    if (document.visibilityState === 'visible') onVisible();
  };
  document.addEventListener('visibilitychange', handler);
  window.addEventListener('focus', onVisible);
  return () => {
    document.removeEventListener('visibilitychange', handler);
    window.removeEventListener('focus', onVisible);
  };
}
