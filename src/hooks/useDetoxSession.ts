import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { settingsStore } from '../state/settingsStore';
import { culturalPresets } from '../data/culturalPresets';
import { speak } from '../services/audioEngine';
import type { DetoxSettings } from '../types/settings';
import { getBodyCueMessage } from '../utils/bodyCues';
import { AppBlocker } from '../plugins/AppBlocker';
import { APP_PACKAGE_MAP, filterBlockedPackages, resolvePackages } from '../utils/appPackages';

const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export type SessionStatus = 'idle' | 'running' | 'paused' | 'completed';

export function useDetoxSession() {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentMessageText, setCurrentMessageText] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [settings, setSettings] = useState<DetoxSettings>(settingsStore.get());
  const activeReminderRef = useRef<string | null>(null);
  const selectedAppsRef = useRef<string[]>([]);

  useEffect(() => {
    const unsubscribe = settingsStore.subscribe((next) => setSettings(next));
    return unsubscribe;
  }, []);

  // When user taps "Break block" on the overlay, play the reminder again
  useEffect(() => {
    if (!isAndroid) return;
    let handle: { remove: () => void } | undefined;
    void AppBlocker.addListener('breakBlock', () => {
      const text = activeReminderRef.current;
      if (text) {
        void speak(text, settingsStore.get().languageCode);
      }
    }).then((h) => {
      handle = h;
    }).catch(() => { /* plugin unavailable */ });
    return () => {
      handle?.remove();
    };
  }, []);

  const totalSeconds = settings.durationMinutes * 60;

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
    }
    intervalRef.current = null;
  }, []);

  const pickMessage = useCallback((): string | null => {
    if (settings.selectedMessageId) {
      const customMsg = settings.customMessages.find((m) => m.id === settings.selectedMessageId);
      if (customMsg) {
        return customMsg.text || 'Your custom reminder';
      }
      const preset = culturalPresets.find(
        (p) => p.cultureCode === settings.cultureCode,
      );
      const msg = preset?.messages.find((m) => m.id === settings.selectedMessageId);
      if (msg) return msg.text;
    }

    const bodyCue = getBodyCueMessage();
    if (bodyCue && Math.random() < 0.3) {
      return bodyCue;
    }

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
        if (isAndroid) {
          void AppBlocker.stopBlocking().catch(() => { /* ignore */ });
        }
        return totalSeconds;
      }

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

  const activateAppBlocking = useCallback(async (selectedApps: string[], reminderText: string | null) => {
    if (!isAndroid) return;
    const exceptions = settings.blockExceptions ?? ['Phone', 'Messages'];
    let pkgs: string[];
    if (selectedApps.length > 0) {
      pkgs = resolvePackages(selectedApps, exceptions);
    } else {
      // Empty selection = block all launcher apps minus Settings exceptions
      try {
        const { apps } = await AppBlocker.getInstalledApps();
        pkgs = filterBlockedPackages(apps.map((a) => a.packageName), exceptions);
      } catch {
        pkgs = resolvePackages(Object.keys(APP_PACKAGE_MAP), exceptions);
      }
    }
    if (pkgs.length === 0) return;

    const blockEndEpochMs = Date.now() + settings.durationMinutes * 60 * 1000;
    await AppBlocker.startBlocking({
      packages: pkgs,
      blockEndEpochMs,
      reminderText: reminderText ?? undefined,
    });
  }, [settings.durationMinutes, settings.blockExceptions]);

  const start = useCallback((selectedApps: string[] = []) => {
    if (status === 'running') return;
    setStatus('running');
    setElapsedSeconds(0);
    setCurrentMessageText(null);
    clearTimer();
    selectedAppsRef.current = selectedApps;
    intervalRef.current = window.setInterval(tick, 1000);

    // 1) Speak reminder first, 2) then activate AppBlocker
    const text = pickMessage();
    activeReminderRef.current = text;
    if (text) {
      setCurrentMessageText(text);
      void speak(text, settings.languageCode).finally(() => {
        void activateAppBlocking(selectedApps, text).catch(() => { /* ignore */ });
      });
    } else {
      void activateAppBlocking(selectedApps, null).catch(() => { /* ignore */ });
    }
  }, [status, clearTimer, tick, pickMessage, settings.languageCode, activateAppBlocking]);

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
    activeReminderRef.current = null;
    selectedAppsRef.current = [];
    clearTimer();
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
