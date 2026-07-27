import { registerPlugin } from '@capacitor/core';

export interface ScheduledBlockNative {
  id: string;
  label: string;
  /** "HH:MM" */
  startHHMM: string;
  /** "HH:MM" */
  endHHMM: string;
  /** 0=Sun…6=Sat; empty = every day */
  days: number[];
  /** Android package names */
  packages: string[];
  preMins: number;
  reminderText?: string;
}

export interface BlockSchedulerPlugin {
  /** Persist and (re)register AlarmManager schedules for all active set-hours blocks. */
  syncSchedules(options: { schedules: ScheduledBlockNative[] }): Promise<void>;
  clearSchedules(): Promise<void>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
  hasNotificationPermission(): Promise<{ granted: boolean }>;
  /** Opens the system notification settings screen for Charito. */
  openNotificationSettings(): Promise<void>;
  hasExactAlarmPermission(): Promise<{ granted: boolean }>;
  openExactAlarmSettings(): Promise<void>;
}

export const BlockScheduler = registerPlugin<BlockSchedulerPlugin>('BlockScheduler');
