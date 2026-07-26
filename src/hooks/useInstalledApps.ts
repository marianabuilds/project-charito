import React from 'react';
import { Capacitor } from '@capacitor/core';
import { AppBlocker } from '../plugins/AppBlocker';
import type { InstalledApp } from '../plugins/AppBlocker';

const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

/** Fallback list for web preview when native installed-apps query is unavailable. */
export const FALLBACK_APP_CATEGORIES = [
  { label: 'Social Media', apps: ['Instagram', 'TikTok', 'Twitter/X', 'Facebook', 'Snapchat', 'Reddit', 'LinkedIn'] },
  { label: 'Video & Music', apps: ['YouTube', 'Netflix', 'Spotify', 'Twitch'] },
  { label: 'Messaging', apps: ['WhatsApp', 'Telegram', 'Discord'] },
  { label: 'Browser & Games', apps: ['Safari/Chrome', 'Games'] },
] as const;

export function useInstalledApps(): {
  apps: InstalledApp[];
  isNativeList: boolean;
  loading: boolean;
  refresh: () => void;
} {
  const [apps, setApps] = React.useState<InstalledApp[]>([]);
  const [isNativeList, setIsNativeList] = React.useState(false);
  const [loading, setLoading] = React.useState(isAndroid);

  const refresh = React.useCallback(() => {
    if (!isAndroid) {
      setApps([]);
      setIsNativeList(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    void AppBlocker.getInstalledApps()
      .then((res) => {
        setApps(res.apps ?? []);
        setIsNativeList(true);
      })
      .catch(() => {
        setApps([]);
        setIsNativeList(false);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return { apps, isNativeList, loading, refresh };
}
