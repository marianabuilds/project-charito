import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { blockStore } from '../state/blockStore';
import type { DetoxBlock, BlockState } from '../state/blockStore';
import { settingsStore } from '../state/settingsStore';
import { culturalPresets } from '../data/culturalPresets';
import { speak } from '../services/audioEngine';
import { AppBlocker } from '../plugins/AppBlocker';
import { BlockScheduler } from '../plugins/BlockScheduler';
import type { ScheduledBlockNative } from '../plugins/BlockScheduler';
import { APP_PACKAGE_MAP, filterBlockedPackages, resolvePackages } from '../utils/appPackages';
import {
  isWithinSetHoursWindow,
  showLocalNotification,
  subtractMinutesHHMM,
} from '../utils/notifications';

const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

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
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function resolveBlockMessage(block: DetoxBlock): string | null {
  const settings = settingsStore.get();
  if (block.messageId) {
    const customMsg = settings.customMessages.find((m) => m.id === block.messageId);
    if (customMsg) return customMsg.text || null;
    if (block.messageId === 'custom') return block.customMessage || null;
    const preset = culturalPresets.find((p) => p.cultureCode === settings.cultureCode);
    return preset?.messages.find((m) => m.id === block.messageId)?.text ?? null;
  }
  const preset = culturalPresets.find((p) => p.cultureCode === settings.cultureCode);
  if (preset && preset.messages.length > 0) {
    return preset.messages[Math.floor(Math.random() * preset.messages.length)].text;
  }
  return null;
}

function blockEndEpochMs(block: DetoxBlock): number {
  if (block.blockingMethod === 'set-hours' && block.setHoursEnd) {
    const now = new Date();
    const [eh, em] = block.setHoursEnd.split(':').map(Number);
    const end = new Date(now);
    end.setHours(eh, em, 0, 0);
    if (block.setHoursStart && block.setHoursEnd < block.setHoursStart) {
      // Overnight — end is tomorrow if we're past start
      if (currentHHMM() >= block.setHoursStart) {
        end.setDate(end.getDate() + 1);
      }
    } else if (end.getTime() <= now.getTime()) {
      end.setDate(end.getDate() + 1);
    }
    return end.getTime();
  }
  return Date.now() + Math.max(1, block.durationMinutes) * 60 * 1000;
}

async function startBlockAppBlocking(block: DetoxBlock, reminderText: string | null): Promise<void> {
  if (!isAndroid) return;
  const exceptions = settingsStore.get().blockExceptions ?? ['Phone', 'Messages'];
  let pkgs: string[];
  if (block.selectedApps.length > 0) {
    pkgs = resolvePackages(block.selectedApps, exceptions);
  } else {
    try {
      const { apps } = await AppBlocker.getInstalledApps();
      pkgs = filterBlockedPackages(apps.map((a) => a.packageName), exceptions);
    } catch {
      pkgs = resolvePackages(Object.keys(APP_PACKAGE_MAP), exceptions);
    }
  }
  if (pkgs.length === 0) return;
  await AppBlocker.startBlocking({
    packages: pkgs,
    blockEndEpochMs: blockEndEpochMs(block),
    reminderText: reminderText ?? undefined,
  });
}

interface UseDetoxBlocksResult {
  blocks: DetoxBlock[];
  snooze: (blockId: string) => void;
}

/**
 * Subscribes to blockStore and polls every 30 s.
 * Calls `onTrigger(block)` once per session per block when active windows match.
 * Also: pre-block notifications, AppBlocker start/stop for scheduled set-hours blocks.
 */
export function useDetoxBlocks(onTrigger: (block: DetoxBlock) => void): UseDetoxBlocksResult {
  const [blockState, setBlockState] = useState<BlockState>(blockStore.get());
  const firedRef = useRef<Set<string>>(new Set());
  const preNotifiedRef = useRef<Set<string>>(new Set());
  const activeBlockingIdRef = useRef<string | null>(null);
  const onTriggerRef = useRef(onTrigger);

  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    return blockStore.subscribe((next) => setBlockState(next));
  }, []);

  // Sync set-hours blocks to native AlarmManager so they fire when the app is closed / after reboot
  useEffect(() => {
    if (!isAndroid) return;
    let cancelled = false;
    void (async () => {
      const preMins = settingsStore.get().preBlockReminderMinutes ?? 10;
      const exceptions = settingsStore.get().blockExceptions ?? ['Phone', 'Messages'];
      let installedPkgs: string[] | null = null;
      try {
        const { apps } = await AppBlocker.getInstalledApps();
        installedPkgs = apps.map((a) => a.packageName);
      } catch { /* fall back to map */ }

      if (cancelled) return;

      const schedules: ScheduledBlockNative[] = blockState.blocks
        .filter((b) => b.active && b.blockingMethod === 'set-hours' && b.setHoursStart && b.setHoursEnd)
        .map((b) => {
          let pkgs: string[];
          if (b.selectedApps.length > 0) {
            pkgs = resolvePackages(b.selectedApps, exceptions);
          } else if (installedPkgs) {
            pkgs = filterBlockedPackages(installedPkgs, exceptions);
          } else {
            pkgs = resolvePackages(Object.keys(APP_PACKAGE_MAP), exceptions);
          }
          return {
            id: b.id,
            label: b.label || 'Detox block',
            startHHMM: b.setHoursStart,
            endHHMM: b.setHoursEnd,
            days: [...b.days],
            packages: pkgs,
            preMins,
            reminderText: resolveBlockMessage(b) ?? undefined,
          };
        })
        .filter((s) => s.packages.length > 0);

      void BlockScheduler.syncSchedules({ schedules }).catch(() => { /* ignore on web/plugin miss */ });
    })();
    return () => { cancelled = true; };
  }, [blockState.blocks]);

  useEffect(() => {
    function check() {
      const now = new Date();
      const hhmm = currentHHMM();
      const dayOfWeek = now.getDay();
      const today = todayKey();
      const state = blockStore.get();
      const preMins = settingsStore.get().preBlockReminderMinutes ?? 10;
      let changed = false;
      const remaining: DetoxBlock[] = [];
      let anySetHoursActive = false;

      for (const block of state.blocks) {
        if (!block.active) {
          remaining.push(block);
          continue;
        }

        if (block.blockingMethod !== 'set-hours' && block.blockingMethod !== 'location') {
          remaining.push(block);
          continue;
        }

        const firedKey = `${block.id}:${today}`;
        const matchesDay =
          block.days.length === 0 ? true : block.days.includes(dayOfWeek);

        if (block.blockingMethod === 'set-hours') {
          // Pre-block notification X minutes before start
          if (
            matchesDay &&
            block.setHoursStart &&
            preMins > 0
          ) {
            const notifyAt = subtractMinutesHHMM(block.setHoursStart, preMins);
            const preKey = `pre:${block.id}:${today}`;
            if (hhmm === notifyAt && !preNotifiedRef.current.has(preKey)) {
              preNotifiedRef.current.add(preKey);
              const label = block.label || 'Detox block';
              void showLocalNotification(
                'Block starting soon',
                `"${label}" begins in ${preMins} minute${preMins === 1 ? '' : 's'}.`,
              );
            }
          }

          const inWindow =
            matchesDay &&
            isWithinSetHoursWindow(hhmm, block.setHoursStart, block.setHoursEnd);

          if (inWindow) {
            anySetHoursActive = true;
            if (!firedRef.current.has(firedKey)) {
              firedRef.current.add(firedKey);
              const messageText = resolveBlockMessage(block);
              // Audio first, then AppBlocker
              const afterAudio = () => {
                void startBlockAppBlocking(block, messageText).catch(() => { /* ignore */ });
                activeBlockingIdRef.current = block.id;
              };
              if (messageText) {
                void speak(messageText, settingsStore.get().languageCode).finally(afterAudio);
              } else {
                afterAudio();
              }
              onTriggerRef.current(block);
              if (block.days.length === 0) {
                changed = true;
                continue;
              }
            } else if (activeBlockingIdRef.current !== block.id && isAndroid) {
              // Re-assert blocking if we missed stop/start (e.g. app reopen mid-window)
              void startBlockAppBlocking(block, resolveBlockMessage(block)).catch(() => {});
              activeBlockingIdRef.current = block.id;
            }
          }
        }
        remaining.push(block);
      }

      // Stop AppBlocker when no set-hours window is active
      if (!anySetHoursActive && activeBlockingIdRef.current && isAndroid) {
        activeBlockingIdRef.current = null;
        void AppBlocker.stopBlocking().catch(() => { /* ignore */ });
      }

      if (changed) {
        blockStore.set({ blocks: remaining });
      }
    }

    check();
    const id = window.setInterval(check, 30_000);

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
                const messageText = resolveBlockMessage(block);
                const afterAudio = () => {
                  void startBlockAppBlocking(block, messageText).catch(() => {});
                  activeBlockingIdRef.current = block.id;
                };
                if (messageText) {
                  void speak(messageText, settingsStore.get().languageCode).finally(afterAudio);
                } else {
                  afterAudio();
                }
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
      selectedApps: [...block.selectedApps],
    };
    blockStore.set({ blocks: [...state.blocks, snoozedBlock] });
  }, []);

  return { blocks: blockState.blocks, snooze };
}
