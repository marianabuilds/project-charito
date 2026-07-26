package com.marianabuilds.charito;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

/**
 * Handles AlarmManager callbacks for pre-block notifications, block start, and block end.
 * Also used after reboot via BootReceiver → BlockSchedulerHelper.rescheduleAll().
 */
public class BlockAlarmReceiver extends BroadcastReceiver {

    public static final String ACTION_PRE_NOTIFY  = "com.marianabuilds.charito.PRE_NOTIFY";
    public static final String ACTION_BLOCK_START = "com.marianabuilds.charito.BLOCK_START";
    public static final String ACTION_BLOCK_END   = "com.marianabuilds.charito.BLOCK_END";

    public static final String EXTRA_BLOCK_ID = "block_id";
    public static final String CHANNEL_ID = "charito_blocks";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String action = intent.getAction();
        String blockId = intent.getStringExtra(EXTRA_BLOCK_ID);
        if (blockId == null) return;

        JSONObject schedule = BlockSchedulerHelper.findSchedule(context, blockId);
        if (schedule == null) return;

        switch (action) {
            case ACTION_PRE_NOTIFY:
                showPreNotify(context, schedule);
                break;
            case ACTION_BLOCK_START:
                applyBlocking(context, schedule);
                showStartedNotify(context, schedule);
                break;
            case ACTION_BLOCK_END:
                clearBlocking(context, blockId);
                break;
            default:
                break;
        }
    }

    private void showPreNotify(Context context, JSONObject schedule) {
        ensureChannel(context);
        String label = schedule.optString("label", "Detox block");
        int preMins = schedule.optInt("preMins", 10);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("Block starting soon")
                .setContentText("\"" + label + "\" begins in " + preMins + " minute"
                        + (preMins == 1 ? "" : "s") + ".")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(openAppPending(context));
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(("pre:" + schedule.optString("id")).hashCode(), builder.build());
    }

    private void showStartedNotify(Context context, JSONObject schedule) {
        ensureChannel(context);
        String label = schedule.optString("label", "Detox block");
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
                .setContentTitle("Detox block active")
                .setContentText("\"" + label + "\" is running. Selected apps are paused.")
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setOngoing(true)
                .setContentIntent(openAppPending(context));
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(("active:" + schedule.optString("id")).hashCode(), builder.build());
    }

    private void applyBlocking(Context context, JSONObject schedule) {
        try {
            JSONArray pkgs = schedule.optJSONArray("packages");
            Set<String> set = new HashSet<>();
            if (pkgs != null) {
                for (int i = 0; i < pkgs.length(); i++) {
                    String p = pkgs.optString(i, "");
                    if (!p.isEmpty()) set.add(p);
                }
            }
            long endMs = schedule.optLong("endEpochMs", 0L);
            String reminder = schedule.optString("reminderText", "");
            SharedPreferences prefs = context.getSharedPreferences(
                    AppBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                    .putStringSet(AppBlockerService.KEY_BLOCKED, set)
                    .putLong(AppBlockerService.KEY_BLOCK_END_MS, endMs)
                    .putString(AppBlockerService.KEY_REMINDER_TEXT, reminder)
                    .putString("active_schedule_id", schedule.optString("id", ""))
                    .apply();
        } catch (Exception ignored) { /* */ }
    }

    private void clearBlocking(Context context, String blockId) {
        SharedPreferences prefs = context.getSharedPreferences(
                AppBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
        String active = prefs.getString("active_schedule_id", "");
        if (active.equals(blockId) || active.isEmpty()) {
            prefs.edit()
                    .remove(AppBlockerService.KEY_BLOCKED)
                    .remove(AppBlockerService.KEY_BLOCK_END_MS)
                    .remove(AppBlockerService.KEY_REMINDER_TEXT)
                    .remove("active_schedule_id")
                    .apply();
        }
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(("active:" + blockId).hashCode());
            nm.cancel(("pre:" + blockId).hashCode());
        }
    }

    static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Detox block reminders",
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Pre-block and active detox notifications");
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.createNotificationChannel(channel);
    }

    private PendingIntent openAppPending(Context context) {
        Intent launch = context.getPackageManager()
                .getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) launch = new Intent(context, MainActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(context, 0, launch, flags);
    }
}
