import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { settingsStore } from '../state/settingsStore';
import { culturalPresets } from '../data/culturalPresets';
import { speak } from '../services/audioEngine';
import type { DetoxSettings } from '../types/settings';
import { getBodyCueMessage } from '../utils/bodyCues';
import { AppBlocker } from '../plugins/AppBlocker';

// ── App-name → Android package-name lookup ────────────────────────────────
// Used to resolve the human-readable app names stored in SessionView/blockStore
// into the package names required by AppBlockerService.
const APP_PACKAGE_MAP: Record<string, string> = {
  'Instagram':    'com.instagram.android',
  'TikTok':       'com.zhiliaoapp.musically',
  'Twitter/X':    'com.twitter.android',
  'Facebook':     'com.facebook.katana',
  'Snapchat':     'com.snapchat.android',
  'Reddit':       'com.reddit.frontpage',
  'LinkedIn':     'com.linkedin.android',
  'YouTube':      'com.google.android.youtube',
  'Netflix':      'com.netflix.mediaclient',
  'Spotify':      'com.spotify.music',
  'Twitch':       'tv.twitch.android.app',
  'WhatsApp':     'com.whatsapp',
  'Telegram':     'org.telegram.messenger',
  'iMessage':     'com.apple.MobileSMS', // iOS only — will silently not match on Android
  'Discord':      'com.discord',
  'Safari/Chrome':'com.android.chrome',
  'Games':        '', // no single package — omit
};

function resolvePackages(appNames: string[]): string[] {
  return appNames
    .map((name) => APP_PACKAGE_MAP[name] ?? '')
    .filter((pkg) => pkg.length > 0);
}

const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export type SessionStatus = 'idle' | 'running' | 'paused' | 'completed';

export function useDetoxSession() {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentMessageText, setCurrentMessageText] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [settings, setSettings] = useState<DetoxSettings>(settingsStore.get());

  useEffect(() => {
    const unsubscribe = settingsStore.subscribe((next) => setSettings(next));
    return unsubscribe;
  }, []);

  const totalSeconds = settings.durationMinutes * 60;

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pickMessage = useCallback((): string | null => {
    if (settings.selectedMessageId) {
      // Check if it matches a custom message in the array
      const customMsg = settings.customMessages.find((m) => m.id === settings.selectedMessageId);
      if (customMsg) {
        return customMsg.text || 'Your custom reminder';
      }
      // Look up in cultural preset messages
      const preset = culturalPresets.find(
        (p) => p.cultureCode === settings.cultureCode,
      );
      const msg = preset?.messages.find((m) => m.id === settings.selectedMessageId);
      if (msg) return msg.text;
    }

    // Body-cue messages surface ~30% of the time during evening/morning windows
    const bodyCue = getBodyCueMessage();
    if (bodyCue && Math.random() < 0.3) {
      return bodyCue;
    }

    // Random from all messages in this culture
    const preset = culturalPresets.find(
      (p) => p.cultureCode === settings.cultureCode,
    );
    if (!preset || preset.messages.length === 0) return null;
    const index = Math.floor(Math.random() * preset.messages.length);
    return preset.messages[index].text;
  }, [settings.cultureCode, settings.selectedMessageId, settings.customMessages]);

  const tick = useCallback(() => {
    setElapsedSeconds((prev) => {
      const next = prev + 1;

      if (next >= totalSeconds) {
        const text = pickMessage();
        if (text) {
          setCurrentMessageText(text);
          void speak(text, settings.languageCode);
        }
        setStatus('completed');
        clearTimer();
        return totalSeconds;
      }

      // Gentle mode: speak a reminder every 5 minutes.
      if (settings.mode === 'gentle' && next % (5 * 60) === 0) {
        const text = pickMessage();
        if (text) {
          setCurrentMessageText(text);
          void speak(text, settings.languageCode);
        }
      }

      return next;
    });
  }, [
    totalSeconds,
    settings.mode,
    settings.languageCode,
    pickMessage,
    clearTimer,
  ]);

  const start = useCallback((selectedApps: string[] = []) => {
    if (status === 'running') return;
    setStatus('running');
    setElapsedSeconds(0);
    setCurrentMessageText(null);
    clearTimer();
    intervalRef.current = window.setInterval(tick, 1000);

    // On Android: activate the Accessibility Service app blocker
    if (isAndroid && selectedApps.length > 0) {
      const packages = resolvePackages(selectedApps);
      if (packages.length > 0) {
        const blockEndEpochMs = Date.now() + settings.durationMinutes * 60 * 1000;
        void AppBlocker.startBlocking({ packages, blockEndEpochMs }).catch(() => {
          // Silently swallow — if the service isn't enabled, blocking just won't happen
        });
      }
    }
  }, [status, clearTimer, tick, settings.durationMinutes]);

  const pause = useCallback(() => {
    if (status !== 'running') return;
    setStatus('paused');
    clearTimer();
  }, [status, clearTimer]);

  const resume = useCallback(() => {
    if (status !== 'paused') return;
    setStatus('running');
    clearTimer();
    intervalRef.current = window.setInterval(tick, 1000);
  }, [status, clearTimer, tick]);

  const reset = useCallback(() => {
    setStatus('idle');
    setElapsedSeconds(0);
    setCurrentMessageText(null);
    clearTimer();
    // Ensure blocking is deactivated whenever a session ends or is cancelled
    if (isAndroid) {
      void AppBlocker.stopBlocking().catch(() => { /* ignore */ });
    }
  }, [clearTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const remainingSeconds = Math.max(totalSeconds - elapsedSeconds, 0);

  return {
    status,
    elapsedSeconds,
    remainingSeconds,
    isStrict: settings.mode === 'strict',
    currentMessageText,
    start,
    pause,
    resume,
    reset,
  };
}
