package com.marianabuilds.charito;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Process;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "UsageStats")
public class UsageStatsPlugin extends Plugin {

    /**
     * Returns whether the app has been granted the PACKAGE_USAGE_STATS permission.
     * This is a "special" permission — the user must enable it manually in
     * System Settings > Apps > Special app access > Usage access.
     */
    private boolean hasUsagePermission() {
        AppOpsManager appOps = (AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
        int mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            getContext().getPackageName()
        );
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    /**
     * Resolves a human-readable app label from a package name.
     * Falls back to a cleaned-up version of the package name if the app is not found.
     */
    private String getAppLabel(PackageManager pm, String packageName) {
        try {
            ApplicationInfo info = pm.getApplicationInfo(packageName, 0);
            return pm.getApplicationLabel(info).toString();
        } catch (PackageManager.NameNotFoundException e) {
            // Strip common prefixes to produce a cleaner fallback label
            String label = packageName;
            if (label.startsWith("com.")) label = label.substring(4);
            else if (label.startsWith("org.")) label = label.substring(4);
            else if (label.startsWith("net.")) label = label.substring(4);
            int dot = label.indexOf('.');
            return dot > 0 ? label.substring(0, dot) : label;
        }
    }

    /**
     * Plugin method called from JavaScript.
     *
     * Options:
     *   - days (int, default 7): how many days back to query
     *
     * Returns:
     *   { stats: Array<{ packageName, appName, totalTimeMs, launchCount, lastUsed }> }
     *
     * Rejects with "PERMISSION_DENIED" if usage access has not been granted.
     */
    @PluginMethod
    public void getUsageStats(PluginCall call) {
        if (!hasUsagePermission()) {
            call.reject("PERMISSION_DENIED");
            return;
        }

        Integer daysArg = call.getInt("days", 7);
        int days = daysArg != null ? daysArg : 7;

        UsageStatsManager usm = (UsageStatsManager) getContext()
                .getSystemService(Context.USAGE_STATS_SERVICE);
        PackageManager pm = getContext().getPackageManager();

        // Build query window: midnight `days` ago → now
        Calendar calendar = Calendar.getInstance();
        long endTime = calendar.getTimeInMillis();
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        calendar.add(Calendar.DAY_OF_YEAR, -(days - 1));
        long startTime = calendar.getTimeInMillis();

        List<UsageStats> usageStatsList = usm.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY, startTime, endTime);

        // Aggregate by package name (INTERVAL_DAILY may return multiple entries per package)
        Map<String, long[]> aggregated = new HashMap<>();
        // Values: [totalTimeMs, launchCount, lastUsed]
        if (usageStatsList != null) {
            for (UsageStats stat : usageStatsList) {
                String pkg = stat.getPackageName();
                long[] agg = aggregated.get(pkg);
                if (agg == null) {
                    agg = new long[]{0L, 0L, 0L};
                    aggregated.put(pkg, agg);
                }
                agg[0] += stat.getTotalTimeInForeground();
                // launchCount left as 0 — getAppLaunchCount() requires SDK level
                // that may not be available in all build environments
                if (stat.getLastTimeUsed() > agg[2]) {
                    agg[2] = stat.getLastTimeUsed();
                }
            }
        }

        // Build result — filter out entries with zero foreground time
        JSArray resultArray = new JSArray();
        for (Map.Entry<String, long[]> entry : aggregated.entrySet()) {
            String pkg = entry.getKey();
            long[] agg = entry.getValue();
            if (agg[0] <= 0) continue;

            JSObject obj = new JSObject();
            obj.put("packageName", pkg);
            obj.put("appName", getAppLabel(pm, pkg));
            obj.put("totalTimeMs", agg[0]);
            obj.put("launchCount", (int) agg[1]);
            obj.put("lastUsed", new java.util.Date(agg[2]).toInstant().toString());
            resultArray.put(obj);
        }

        JSObject result = new JSObject();
        result.put("stats", resultArray);
        call.resolve(result);
    }

    /**
     * Opens the Android "Usage Access" system settings screen so the user can
     * manually grant the PACKAGE_USAGE_STATS permission.
     */
    @PluginMethod
    public void openUsageAccessSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }
}
