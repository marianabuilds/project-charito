package com.marianabuilds.charito;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * After device reboot, restore AlarmManager schedules and any currently-active
 * detox block window so app blocking survives restart.
 */
public class BootReceiver extends BroadcastReceiver {

    private static final String TAG = "CharitoBoot";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            Log.d(TAG, "Rescheduling Charito blocks after boot/update");
            BlockAlarmReceiver.ensureChannel(context);
            BlockSchedulerHelper.rescheduleAll(context);
        }
    }
}
