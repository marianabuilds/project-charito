import { useCallback, useEffect, useRef, useState } from 'react';
import { blockStore } from '../state/blockStore';
import type { DetoxBlock, BlockState } from '../state/blockStore';

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

/** Haversine distance between two lat/lng points in meters */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface UseDetoxBlocksResult {
  blocks: DetoxBlock[];
  snooze: (blockId: string) => void;
}

/**
 * Subscribes to blockStore and polls every 30 s.
 * Calls `onTrigger(block)` once per session per block when:
 *   - block.active is true
 *   - current day is in block.days (or block.days is empty = today only)
 *   - for "set-hours" blocks: current "HH:MM" is within [setHoursStart, setHoursEnd]
 *   - other methods are not auto-triggered (require manual start)
 * Uses a runtime Set keyed by `${block.id}:${YYYY-MM-DD}` to avoid duplicate triggers.
 * One-shot blocks (empty days) are removed after firing.
 */
export function useDetoxBlocks(onTrigger: (block: DetoxBlock) => void): UseDetoxBlocksResult {
  const [blockState, setBlockState] = useState<BlockState>(blockStore.get());
  const firedRef = useRef<Set<string>>(new Set());
  const onTriggerRef = useRef(onTrigger);

  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    return blockStore.subscribe((next) => setBlockState(next));
  }, []);

  useEffect(() => {
    function check() {
      const now = new Date();
      const hhmm = currentHHMM();
      const dayOfWeek = now.getDay();
      const today = todayKey();
      const state = blockStore.get();
      let changed = false;
      const remaining: DetoxBlock[] = [];

      for (const block of state.blocks) {
        if (!block.active) {
          remaining.push(block);
          continue;
        }

        // Only "set-hours" and "location" blocks are auto-triggered
        if (block.blockingMethod !== 'set-hours' && block.blockingMethod !== 'location') {
          remaining.push(block);
          continue;
        }

        const firedKey = `${block.id}:${today}`;
        const matchesDay =
          block.days.length === 0 ? true : block.days.includes(dayOfWeek);

        if (block.blockingMethod === 'set-hours') {
          const inWindow =
            block.setHoursStart.length > 0 &&
            block.setHoursEnd.length > 0 &&
            block.setHoursStart <= hhmm &&
            hhmm <= block.setHoursEnd;

          if (matchesDay && inWindow && !firedRef.current.has(firedKey)) {
            firedRef.current.add(firedKey);
            onTriggerRef.current(block);
            if (block.days.length === 0) {
              changed = true;
              continue;
            }
          }
        }
        // Location blocks are checked asynchronously — skip synchronous firing here
        remaining.push(block);
      }

      if (changed) {
        blockStore.set({ blocks: remaining });
      }
    }

    check();
    const id = window.setInterval(check, 30_000);

    // Location block polling: check position every 30s separately
    let locationIntervalId: number | null = null;
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      const checkLocation = () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const today = todayKey();
            const state = blockStore.get();
            const now = new Date();
            const dayOfWeek = now.getDay();
            for (const block of state.blocks) {
              if (!block.active || block.blockingMethod !== 'location') continue;
              if (!block.location) continue;
              const firedKey = `${block.id}:${today}`;
              if (firedRef.current.has(firedKey)) continue;
              const matchesDay = block.days.length === 0 ? true : block.days.includes(dayOfWeek);
              if (!matchesDay) continue;
              const dist = haversineMeters(
                pos.coords.latitude,
                pos.coords.longitude,
                block.location.lat,
                block.location.lng,
              );
              if (dist <= block.locationRadius) {
                firedRef.current.add(firedKey);
                onTriggerRef.current(block);
              }
            }
          },
          () => { /* permission denied or error — silently ignore */ },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 20000 },
        );
      };
      locationIntervalId = window.setInterval(checkLocation, 30_000);
    }

    return () => {
      window.clearInterval(id);
      if (locationIntervalId !== null) window.clearInterval(locationIntervalId);
    };
  }, []);

  const snooze = useCallback((blockId: string) => {
    const state = blockStore.get();
    const block = state.blocks.find((b) => b.id === blockId);
    if (!block || block.snoozeMinutes === 0) return;
    const now = new Date();
    const snoozeTime = new Date(now.getTime() + block.snoozeMinutes * 60 * 1000);
    const hh = String(snoozeTime.getHours()).padStart(2, '0');
    const mm = String(snoozeTime.getMinutes()).padStart(2, '0');
    // Snooze creates a new one-shot "set-hours" block starting at snooze time
    const snoozedBlock: DetoxBlock = {
      id: crypto.randomUUID(),
      label: block.label ? `${block.label} (snooze)` : 'Snooze',
      setHoursStart: `${hh}:${mm}`,
      setHoursEnd: `${hh}:${mm}`,
      durationMinutes: block.durationMinutes,
      usageLimitMinutes: block.usageLimitMinutes,
      launchCountMax: block.launchCountMax,
      days: [],
      blockingMethod: 'set-hours',
      messageId: block.messageId,
      customMessage: block.customMessage,
      snoozeMinutes: 0,
      active: true,
      location: null,
      locationRadius: 100,
      selectedApps: [],
    };
    blockStore.set({ blocks: [...state.blocks, snoozedBlock] });
  }, []);

  return { blocks: blockState.blocks, snooze };
}
