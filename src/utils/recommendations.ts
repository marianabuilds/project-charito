import { settingsStore } from '../state/settingsStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MockAppStat {
  name: string;
  category: 'social' | 'productivity' | 'entertainment' | 'other';
  dailyAvgMinutes: number;
  launchCount: number;
  lastUsedHour: number; // 0–23
}

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
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_APP_STATS: MockAppStat[] = [
  { name: 'Instagram',  category: 'social',        dailyAvgMinutes: 87, launchCount: 23, lastUsedHour: 23 },
  { name: 'TikTok',     category: 'social',        dailyAvgMinutes: 72, launchCount: 18, lastUsedHour: 22 },
  { name: 'YouTube',    category: 'entertainment', dailyAvgMinutes: 45, launchCount: 8,  lastUsedHour: 21 },
  { name: 'Gmail',      category: 'productivity',  dailyAvgMinutes: 30, launchCount: 15, lastUsedHour: 18 },
  { name: 'Twitter/X',  category: 'social',        dailyAvgMinutes: 28, launchCount: 12, lastUsedHour: 22 },
  { name: 'Notion',     category: 'productivity',  dailyAvgMinutes: 22, launchCount: 6,  lastUsedHour: 16 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatHour(h: number): string {
  if (h === 0)  return '12 AM';
  if (h === 12) return '12 PM';
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

export function formatPill(type: RecType, value: number): string {
  switch (type) {
    case 'usage-limit':  return `${value} min/day max`;
    case 'set-hours':    return `No use after ${formatHour(value)}`;
    case 'launch-count': return `Max ${value} opens/day`;
    case 'duration':     return value >= 60 ? '1 hr focus block' : `${value} min focus block`;
  }
}

// ─── Core logic ───────────────────────────────────────────────────────────────

export function generateRecommendations(): Recommendation[] {
  const intensity = settingsStore.get().detoxIntensity ?? 'moderate';

  const SOCIAL_MULT    = 1.3;
  const NIGHT_OWL_MULT = 1.2;

  type ScoredApp = MockAppStat & { score: number; nightOwl: boolean };

  const scored: ScoredApp[] = MOCK_APP_STATS.map((app) => {
    const catMult  = app.category === 'social' ? SOCIAL_MULT : 1.0;
    const nightOwl = app.lastUsedHour >= 22;
    const nightMult = nightOwl ? NIGHT_OWL_MULT : 1.0;
    const score = (app.dailyAvgMinutes + app.launchCount * 2) * catMult * nightMult;
    return { ...app, score, nightOwl };
  });

  scored.sort((a, b) => b.score - a.score);

  const topByTime = [...MOCK_APP_STATS].sort((a, b) => b.dailyAvgMinutes - a.dailyAvgMinutes)[0];

  const timeThreshold   = intensity === 'deep' ? 20  : intensity === 'light' ? 60  : 40;
  const launchThreshold = intensity === 'deep' ? 5   : intensity === 'light' ? 20  : 10;
  const maxRecs         = intensity === 'deep' ? 5   : intensity === 'light' ? 2   : 4;

  const recs: Recommendation[] = [];

  for (const app of scored) {
    if (recs.length >= maxRecs) break;

    const qualifies =
      app.dailyAvgMinutes > timeThreshold ||
      app.launchCount > launchThreshold ||
      app.name === topByTime.name;
    if (!qualifies) continue;

    let type: RecType;
    let defaultValue: number;
    let min: number;
    let max: number;
    let step: number;
    let reason: string;

    if (intensity === 'light') {
      type = 'duration';
      defaultValue = 30;
      min = 15;
      max = 60;
      step = 15;
      reason = `You use ${app.name} ~${app.dailyAvgMinutes} min/day. A gentle cap can help.`;
    } else if (intensity === 'deep') {
      if (app.nightOwl && !recs.find((r) => r.type === 'set-hours')) {
        type = 'set-hours';
        defaultValue = 20;
        min = 18;
        max = 23;
        step = 1;
        reason = `${app.name} last used at ${app.lastUsedHour}:00 — flag as evening risk.`;
      } else {
        type = 'usage-limit';
        const capBase = Math.round((app.dailyAvgMinutes * 0.5) / 15) * 15;
        defaultValue = Math.max(15, capBase);
        min = Math.max(15, Math.round((app.dailyAvgMinutes * 0.25) / 15) * 15);
        max = app.dailyAvgMinutes;
        step = 15;
        reason = `Cut ${app.name} from ${app.dailyAvgMinutes} min/day — strict mode.`;
      }
    } else {
      if (app.nightOwl && !recs.find((r) => r.type === 'set-hours')) {
        type = 'set-hours';
        defaultValue = 20;
        min = 18;
        max = 23;
        step = 1;
        reason = `${app.name} is frequently used after 10 PM.`;
      } else if (app.launchCount > launchThreshold && !recs.find((r) => r.type === 'launch-count')) {
        type = 'launch-count';
        defaultValue = Math.max(5, Math.round(app.launchCount * 0.6));
        min = 2;
        max = app.launchCount;
        step = 1;
        reason = `${app.name} opened ${app.launchCount}× today — limit daily opens.`;
      } else {
        type = 'usage-limit';
        const capBase = Math.round((app.dailyAvgMinutes * 0.6) / 15) * 15;
        defaultValue = Math.max(15, capBase);
        min = Math.max(15, Math.round((app.dailyAvgMinutes / 4) / 15) * 15);
        max = app.dailyAvgMinutes;
        step = 15;
        reason = `${app.name} is your #${recs.length + 1} time drain at ${app.dailyAvgMinutes} min/day.`;
      }
    }

    recs.push({
      id: `${app.name}-${type}`,
      appName: app.name,
      reason,
      type,
      defaultValue,
      min,
      max,
      step,
      dailyAvgMinutes: app.dailyAvgMinutes,
    });
  }

  return recs;
}
