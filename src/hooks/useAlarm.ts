import { useCallback, useEffect, useRef, useState } from 'react';
import { alarmStore } from '../state/alarmStore';
import type { AlarmEntry, AlarmState } from '../state/alarmStore';

/** Returns current wall-clock time as "HH:MM" */
function currentHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** Returns today's ISO date string YYYY-MM-DD for deduplication */
function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

interface UseAlarmResult {
  alarms: AlarmEntry[];
  snooze: (alarmId: string) => void;
}

/**
 * Subscribes to alarmStore and polls every 30 s.
 * Calls `onTrigger(alarm)` once per day per alarm when the wall clock matches.
 * One-shot alarms (empty days) are removed after firing.
 * Repeating alarms track fired state in a runtime Set (resets on reload).
 */
export function useAlarm(onTrigger: (alarm: AlarmEntry) => void): UseAlarmResult {
  const [alarmState, setAlarmState] = useState<AlarmState>(alarmStore.get());
  // Track which alarms have fired today: `${id}:${YYYY-MM-DD}`
  const firedTodayRef = useRef<Set<string>>(new Set());
  const onTriggerRef = useRef(onTrigger);

  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    return alarmStore.subscribe((next) => setAlarmState(next));
  }, []);

  useEffect(() => {
    function check() {
      const now = new Date();
      const hhmm = currentHHMM();
      const dayOfWeek = now.getDay(); // 0=Sun…6=Sat
      const today = todayKey();
      const state = alarmStore.get();
      let changed = false;
      const remaining: AlarmEntry[] = [];

      for (const alarm of state.alarms) {
        if (!alarm.active) {
          remaining.push(alarm);
          continue;
        }

        const firedKey = `${alarm.id}:${today}`;
        const matchesTime = alarm.time === hhmm;
        const matchesDay =
          alarm.days.length === 0 || alarm.days.includes(dayOfWeek);

        if (matchesTime && matchesDay && !firedTodayRef.current.has(firedKey)) {
          firedTodayRef.current.add(firedKey);
          onTriggerRef.current(alarm);
          if (alarm.days.length === 0) {
            // One-shot: remove from store
            changed = true;
            continue;
          }
        }
        remaining.push(alarm);
      }

      if (changed) {
        alarmStore.set({ alarms: remaining });
      }
    }

    check();
    const id = window.setInterval(check, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const snooze = useCallback((alarmId: string) => {
    const state = alarmStore.get();
    const alarm = state.alarms.find((a) => a.id === alarmId);
    if (!alarm || alarm.snoozeMinutes === 0) return;
    const now = new Date();
    const snoozeTime = new Date(now.getTime() + alarm.snoozeMinutes * 60 * 1000);
    const hh = String(snoozeTime.getHours()).padStart(2, '0');
    const mm = String(snoozeTime.getMinutes()).padStart(2, '0');
    const snoozeEntry: AlarmEntry = {
      id: crypto.randomUUID(),
      time: `${hh}:${mm}`,
      days: [],
      messageId: alarm.messageId,
      customMessage: alarm.customMessage,
      snoozeMinutes: 0,
      label: alarm.label ? `${alarm.label} (snooze)` : 'Snooze',
      active: true,
    };
    alarmStore.set({ alarms: [...state.alarms, snoozeEntry] });
  }, []);

  return { alarms: alarmState.alarms, snooze };
}
