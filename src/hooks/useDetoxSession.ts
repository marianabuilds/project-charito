import { useCallback, useEffect, useRef, useState } from 'react';
import { settingsStore } from '../state/settingsStore';
import { culturalPresets } from '../data/culturalPresets';
import { speak } from '../services/audioEngine';
import type { DetoxSettings } from '../types/settings';

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
    if (settings.selectedMessageId === 'custom') {
      return settings.customMessage || null;
    }
    const preset = culturalPresets.find(
      (p) => p.cultureCode === settings.cultureCode,
    );
    if (!preset) return null;

    if (settings.selectedMessageId) {
      const msg = preset.messages.find((m) => m.id === settings.selectedMessageId);
      return msg?.text ?? null;
    }

    // Random from all messages in this culture
    if (preset.messages.length === 0) return null;
    const index = Math.floor(Math.random() * preset.messages.length);
    return preset.messages[index].text;
  }, [settings.cultureCode, settings.selectedMessageId, settings.customMessage]);

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

  const start = useCallback(() => {
    if (status === 'running') return;
    setStatus('running');
    setElapsedSeconds(0);
    setCurrentMessageText(null);
    clearTimer();
    intervalRef.current = window.setInterval(tick, 1000);
  }, [status, clearTimer, tick]);

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
