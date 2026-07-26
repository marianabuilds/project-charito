import { screenTimeStore } from '../state/screenTimeStore';
import type { PerAppStat } from '../state/screenTimeStore';
import type { DetoxBlock, BlockingMethod } from '../state/blockStore';
import { EXCLUDED_APP_NAMES } from './appPackages';

export type RecType = 'usage-limit' | 'set-hours' | 'launch-count' | 'duration';

export interface Recommendation {
  id: string;
  appName: string;
  reason: string;
  type: RecType;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  dailyAvgMinutes: number;
  launchCount: number;
}

/** Demo stats used when native usage data is unavailable (web preview). */
const DEMO_STATS: PerAppStat[] = [
  { packageName: 'com.instagram.android', appName: 'Instagram', totalMinutes: 204, launchCount: 47, lastUsed: new Date().toISOString(), syncedAt: new Date().toISOString() },
  { packageName: 'com.zhiliaoapp.musically', appName: 'TikTok', totalMinutes: 130, launchCount: 32, lastUsed: new Date().toISOString(), syncedAt: new Date().toISOString() },
  { packageName: 'com.google.android.youtube', appName: 'YouTube', totalMinutes: 100, launchCount: 18, lastUsed: new Date().toISOString(), syncedAt: new Date().toISOString() },
  { packageName: 'com.twitter.android', appName: 'Twitter/X', totalMinutes: 58, launchCount: 29, lastUsed: new Date().toISOString(), syncedAt: new Date().toISOString() },
  { packageName: 'com.reddit.frontpage', appName: 'Reddit', totalMinutes: 34, launchCount: 12, lastUsed: new Date().toISOString(), syncedAt: new Date().toISOString() },
  { packageName: 'com.netflix.mediaclient', appName: 'Netflix', totalMinutes: 90, launchCount: 6, lastUsed: new Date().toISOString(), syncedAt: new Date().toISOString() },
  { packageName: 'com.whatsapp', appName: 'WhatsApp', totalMinutes: 45, launchCount: 38, lastUsed: new Date().toISOString(), syncedAt: new Date().toISOString() },
  { packageName: 'com.discord', appName: 'Discord', totalMinutes: 22, launchCount: 11, lastUsed: new Date().toISOString(), syncedAt: new Date().toISOString() },
];

const SOCIAL = new Set(['Instagram', 'TikTok', 'Twitter/X', 'Twitter / X', 'Facebook', 'Snapchat', 'Reddit']);

export function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

export function formatPill(type: RecType, value: number): string {
  switch (type) {
    case 'usage-limit':
      return `${value} min/day max`;
    case 'set-hours':
      return `No use after ${formatHour(value)}`;
    case 'launch-count':
      return `Max ${value} opens/day`;
    case 'duration':
      return value >= 60 ? '1 hr focus block' : `${value} min focus block`;
  }
}

function normalizeAppName(name: string): string {
  return name === 'Twitter / X' ? 'Twitter/X' : name;
}

function toDaily(stats: PerAppStat[]): Array<PerAppStat & { dailyMin: number; dailyLaunches: number }> {
  return stats
    .filter((s) => !EXCLUDED_APP_NAMES.has(s.appName))
    .map((s) => ({
      ...s,
      appName: normalizeAppName(s.appName),
      dailyMin: Math.max(1, Math.round(s.totalMinutes / 7)),
      dailyLaunches: Math.max(1, Math.round(s.launchCount / 7)),
    }));
}

/**
 * Build usage-based smart recommendations.
 * Pass real stats when available; falls back to stored then demo data.
 * Returns [] when `allowDemoFallback` is false and there is no real data.
 */
export function generateRecommendations(
  stats?: PerAppStat[],
  options: { allowDemoFallback?: boolean; limit?: number } = {},
): Recommendation[] {
  const { allowDemoFallback = true, limit = 5 } = options;
  const source =
    stats && stats.length > 0
      ? stats
      : screenTimeStore.getPerApp().length > 0
        ? screenTimeStore.getPerApp()
        : allowDemoFallback
          ? DEMO_STATS
          : [];

  if (source.length === 0) return [];

  const apps = toDaily(source).sort((a, b) => b.totalMinutes - a.totalMinutes);
  const recs: Recommendation[] = [];
  const usedTypes = new Set<RecType>();

  for (const app of apps) {
    if (recs.length >= limit) break;

    let type: RecType;
    let defaultValue: number;
    let min: number;
    let max: number;
    let step: number;
    let reason: string;

    const lastHour = app.lastUsed
      ? new Date(app.lastUsed).getHours()
      : 12;
    const nightOwl = lastHour >= 22 || lastHour < 5;

    if (app.dailyLaunches >= 15 && !usedTypes.has('launch-count')) {
      type = 'launch-count';
      defaultValue = Math.max(5, Math.round(app.dailyLaunches * 0.5));
      min = 2;
      max = Math.max(defaultValue + 5, app.dailyLaunches);
      step = 1;
      reason = `You opened ${app.appName} ~${app.dailyLaunches}×/day (${app.launchCount} launches this week). Cap opens to cut the habit loop.`;
      usedTypes.add('launch-count');
    } else if (SOCIAL.has(app.appName) && (nightOwl || app.dailyMin >= 30) && !usedTypes.has('set-hours')) {
      type = 'set-hours';
      defaultValue = 20;
      min = 18;
      max = 23;
      step = 1;
      reason = nightOwl
        ? `${app.appName} was last used around ${formatHour(lastHour)} — ${app.dailyMin} min/day avg. Block after 10 PM to protect sleep.`
        : `${app.appName} averages ${app.dailyMin} min/day. Evening set-hours (8 PM–7 AM) curb late scrolling.`;
      usedTypes.add('set-hours');
    } else if (app.dailyMin >= 40) {
      type = 'usage-limit';
      const capBase = Math.round((app.dailyMin * 0.6) / 15) * 15;
      defaultValue = Math.max(15, capBase);
      min = 15;
      max = Math.max(defaultValue + 30, app.dailyMin);
      step = 15;
      reason = `${app.appName} is a top time drain at ~${app.dailyMin} min/day (${app.totalMinutes} min this week). A daily cap helps.`;
    } else {
      type = 'duration';
      defaultValue = 30;
      min = 15;
      max = 60;
      step = 15;
      reason = `Focus block for ${app.appName}: ${app.dailyMin} min/day avg, ${app.dailyLaunches} opens/day. A short offline stretch rebuilds attention.`;
    }

    recs.push({
      id: `${app.appName}-${type}`,
      appName: app.appName,
      reason,
      type,
      defaultValue,
      min,
      max,
      step,
      dailyAvgMinutes: app.dailyMin,
      launchCount: app.launchCount,
    });
  }

  return recs;
}

/** Convert a recommendation into a Blocks form prefill payload. */
export function recToPrefill(rec: Recommendation, value = rec.defaultValue): Partial<DetoxBlock> {
  const base: Partial<DetoxBlock> = {
    blockingMethod: rec.type as BlockingMethod,
    selectedApps: [rec.appName],
    label: rec.appName,
  };
  switch (rec.type) {
    case 'usage-limit':
      return { ...base, usageLimitMinutes: value };
    case 'set-hours':
      return {
        ...base,
        setHoursStart: `${String(value).padStart(2, '0')}:00`,
        setHoursEnd: '07:00',
      };
    case 'launch-count':
      return { ...base, launchCountMax: value };
    case 'duration':
    default:
      return { ...base, durationMinutes: value };
  }
}
