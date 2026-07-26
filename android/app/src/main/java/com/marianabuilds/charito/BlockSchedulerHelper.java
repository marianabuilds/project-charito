package com.marianabuilds.charito;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.HashSet;
import java.util.Set;

/**
 * Persists scheduled detox blocks and registers AlarmManager alarms so blocks
 * fire even when the WebView is not running. Survives reboot via BootReceiver.
 */
public final class BlockSchedulerHelper {

    public static final String PREFS = "charito_schedules";
    public static final String KEY_JSON = "schedules_json";

    private BlockSchedulerHelper() {}

    public static void saveSchedules(Context context, JSONArray schedules) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_JSON, schedules.toString())
                .apply();
    }

    public static JSONArray loadSchedules(Context context) {
        String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_JSON, "[]");
        try {
            return new JSONArray(raw);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    public static JSONObject findSchedule(Context context, String id) {
        JSONArray all = loadSchedules(context);
        for (int i = 0; i < all.length(); i++) {
            JSONObject o = all.optJSONObject(i);
            if (o != null && id.equals(o.optString("id"))) return o;
        }
        return null;
    }

    /**
     * Cancel existing alarms and re-register for every schedule.
     * If a window is currently active, restore blocking immediately.
     */
    public static void rescheduleAll(Context context) {
        cancelAllAlarms(context);
        JSONArray schedules = loadSchedules(context);
        long now = System.currentTimeMillis();

        for (int i = 0; i < schedules.length(); i++) {
            JSONObject s = schedules.optJSONObject(i);
            if (s == null) continue;

            // Compute next occurrence windows from HH:MM + days
            long[] window = nextWindow(s, now);
            if (window == null) continue;
            long startMs = window[0];
            long endMs = window[1];
            int preMins = s.optInt("preMins", 10);
            long preMs = startMs - preMins * 60_000L;

            try {
                s.put("startEpochMs", startMs);
                s.put("endEpochMs", endMs);
            } catch (Exception ignored) { /* */ }

            if (preMs > now) {
                setAlarm(context, BlockAlarmReceiver.ACTION_PRE_NOTIFY, s.optString("id"), preMs, 1);
            }
            if (startMs > now) {
                setAlarm(context, BlockAlarmReceiver.ACTION_BLOCK_START, s.optString("id"), startMs, 2);
            } else if (now < endMs) {
                // Currently inside the window — restore blocking now
                restoreActiveBlocking(context, s, endMs);
            }
            if (endMs > now) {
                setAlarm(context, BlockAlarmReceiver.ACTION_BLOCK_END, s.optString("id"), endMs, 3);
            }
        }

        // Persist updated epoch fields
        saveSchedules(context, schedules);
    }

    private static void restoreActiveBlocking(Context context, JSONObject s, long endMs) {
        try {
            JSONArray pkgs = s.optJSONArray("packages");
            Set<String> set = new HashSet<>();
            if (pkgs != null) {
                for (int i = 0; i < pkgs.length(); i++) {
                    String p = pkgs.optString(i, "");
                    if (!p.isEmpty()) set.add(p);
                }
            }
            context.getSharedPreferences(AppBlockerService.PREFS_NAME, Context.MODE_PRIVATE)
                    .edit()
                    .putStringSet(AppBlockerService.KEY_BLOCKED, set)
                    .putLong(AppBlockerService.KEY_BLOCK_END_MS, endMs)
                    .putString(AppBlockerService.KEY_REMINDER_TEXT, s.optString("reminderText", ""))
                    .putString("active_schedule_id", s.optString("id", ""))
                    .apply();
        } catch (Exception ignored) { /* */ }
    }

    /**
     * Returns [startMs, endMs] for the next (or current) occurrence of a set-hours block.
     * Schedule JSON fields: startHHMM, endHHMM, days (JSONArray of 0–6, empty = every day).
     */
    static long[] nextWindow(JSONObject s, long nowMs) {
        String startHHMM = s.optString("startHHMM", "");
        String endHHMM = s.optString("endHHMM", "");
        if (startHHMM.isEmpty() || endHHMM.isEmpty()) return null;

        int[] startParts = parseHHMM(startHHMM);
        int[] endParts = parseHHMM(endHHMM);
        if (startParts == null || endParts == null) return null;

        JSONArray days = s.optJSONArray("days");
        boolean everyDay = days == null || days.length() == 0;

        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(nowMs);

        for (int offset = 0; offset < 8; offset++) {
            Calendar day = (Calendar) cal.clone();
            day.add(Calendar.DAY_OF_YEAR, offset);
            int dow = day.get(Calendar.DAY_OF_WEEK) - 1; // Calendar: Sun=1 → 0

            if (!everyDay && !containsDay(days, dow)) continue;

            Calendar start = (Calendar) day.clone();
            start.set(Calendar.HOUR_OF_DAY, startParts[0]);
            start.set(Calendar.MINUTE, startParts[1]);
            start.set(Calendar.SECOND, 0);
            start.set(Calendar.MILLISECOND, 0);

            Calendar end = (Calendar) day.clone();
            end.set(Calendar.HOUR_OF_DAY, endParts[0]);
            end.set(Calendar.MINUTE, endParts[1]);
            end.set(Calendar.SECOND, 0);
            end.set(Calendar.MILLISECOND, 0);

            boolean overnight = startParts[0] * 60 + startParts[1] > endParts[0] * 60 + endParts[1];
            if (overnight) {
                end.add(Calendar.DAY_OF_YEAR, 1);
            }

            // If we're still inside today's window, use it
            if (nowMs >= start.getTimeInMillis() && nowMs < end.getTimeInMillis()) {
                return new long[]{ start.getTimeInMillis(), end.getTimeInMillis() };
            }
            // Future start today/soon
            if (start.getTimeInMillis() > nowMs) {
                return new long[]{ start.getTimeInMillis(), end.getTimeInMillis() };
            }
        }
        return null;
    }

    private static boolean containsDay(JSONArray days, int dow) {
        for (int i = 0; i < days.length(); i++) {
            if (days.optInt(i, -1) == dow) return true;
        }
        return false;
    }

    private static int[] parseHHMM(String hhmm) {
        try {
            String[] parts = hhmm.split(":");
            return new int[]{ Integer.parseInt(parts[0]), Integer.parseInt(parts[1]) };
        } catch (Exception e) {
            return null;
        }
    }

    public static void cancelAllAlarms(Context context) {
        JSONArray schedules = loadSchedules(context);
        for (int i = 0; i < schedules.length(); i++) {
            JSONObject s = schedules.optJSONObject(i);
            if (s == null) continue;
            String id = s.optString("id");
            cancelAlarm(context, BlockAlarmReceiver.ACTION_PRE_NOTIFY, id, 1);
            cancelAlarm(context, BlockAlarmReceiver.ACTION_BLOCK_START, id, 2);
            cancelAlarm(context, BlockAlarmReceiver.ACTION_BLOCK_END, id, 3);
        }
    }

    private static void setAlarm(Context context, String action, String blockId, long atMs, int kind) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent intent = new Intent(context, BlockAlarmReceiver.class);
        intent.setAction(action);
        intent.putExtra(BlockAlarmReceiver.EXTRA_BLOCK_ID, blockId);
        int req = (blockId + ":" + kind).hashCode();
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getBroadcast(context, req, intent, flags);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMs, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, atMs, pi);
            }
        } catch (SecurityException e) {
            // Exact alarms may be denied — fall back to inexact
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMs, pi);
        }
    }

    private static void cancelAlarm(Context context, String action, String blockId, int kind) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent intent = new Intent(context, BlockAlarmReceiver.class);
        intent.setAction(action);
        intent.putExtra(BlockAlarmReceiver.EXTRA_BLOCK_ID, blockId);
        int req = (blockId + ":" + kind).hashCode();
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getBroadcast(context, req, intent, flags);
        am.cancel(pi);
    }
}
