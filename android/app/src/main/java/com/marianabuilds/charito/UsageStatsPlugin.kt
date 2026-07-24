package com.marianabuilds.charito

import android.app.AppOpsManager
import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Process
import android.provider.Settings
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.Calendar

@CapacitorPlugin(name = "UsageStats")
class UsageStatsPlugin : Plugin() {

    /**
     * Returns whether the app has been granted the PACKAGE_USAGE_STATS permission.
     * This is a "special" permission that cannot be granted via a normal runtime request —
     * the user must manually enable it in System Settings > Apps > Special app access > Usage access.
     */
    private fun hasUsagePermission(): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            context.packageName
        )
        return mode == AppOpsManager.MODE_ALLOWED
    }

    /**
     * Try to resolve a human-readable app label from a package name.
     * Falls back to the package name itself if the app is not found.
     */
    private fun getAppLabel(pm: PackageManager, packageName: String): String {
        return try {
            val info: ApplicationInfo = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(info).toString()
        } catch (e: PackageManager.NameNotFoundException) {
            // Strip common prefixes to produce a cleaner fallback label
            packageName
                .removePrefix("com.")
                .removePrefix("org.")
                .removePrefix("net.")
                .split(".")
                .firstOrNull() ?: packageName
        }
    }

    /**
     * Plugin method called from JavaScript.
     *
     * Options:
     *   - days (Int, default 7): how many days back to query
     *
     * Returns:
     *   { stats: Array<{ packageName, appName, totalTimeMs, launchCount, lastUsed }> }
     *
     * Error codes:
     *   - PERMISSION_DENIED: user has not granted Usage Access — JS side should show a prompt
     */
    @PluginMethod
    fun getUsageStats(call: PluginCall) {
        if (!hasUsagePermission()) {
            call.reject("PERMISSION_DENIED", "Usage Access permission not granted")
            return
        }

        val days = call.getInt("days", 7) ?: 7

        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val pm = context.packageManager

        // Query window: midnight `days` ago → now
        val calendar = Calendar.getInstance()
        val endTime = calendar.timeInMillis
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        calendar.add(Calendar.DAY_OF_YEAR, -(days - 1))
        val startTime = calendar.timeInMillis

        val usageStatsList: List<UsageStats> =
            usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime)
                ?: emptyList()

        // Aggregate by package (INTERVAL_DAILY may return multiple entries per package)
        data class Agg(
            var totalTimeMs: Long = 0L,
            var launchCount: Int = 0,
            var lastUsed: Long = 0L
        )
        val aggregated = mutableMapOf<String, Agg>()
        for (stat in usageStatsList) {
            val pkg = stat.packageName
            val agg = aggregated.getOrPut(pkg) { Agg() }
            agg.totalTimeMs += stat.totalTimeInForeground
            // launchCount is only available on API 28+
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                agg.launchCount += stat.appLaunchCount
            }
            if (stat.lastTimeUsed > agg.lastUsed) agg.lastUsed = stat.lastTimeUsed
        }

        // Build the JSON result — filter out system/launcher noise (totalTimeMs == 0)
        val resultArray = JSArray()
        aggregated
            .filter { (_, agg) -> agg.totalTimeMs > 0 }
            .entries
            .sortedByDescending { it.value.totalTimeMs }
            .forEach { (pkg, agg) ->
                val obj = JSObject()
                obj.put("packageName", pkg)
                obj.put("appName", getAppLabel(pm, pkg))
                obj.put("totalTimeMs", agg.totalTimeMs)
                obj.put("launchCount", agg.launchCount)
                obj.put("lastUsed", java.util.Date(agg.lastUsed).toInstant().toString())
                resultArray.put(obj)
            }

        val result = JSObject()
        result.put("stats", resultArray)
        call.resolve(result)
    }

    /**
     * Sends the user to the system "Usage Access" settings screen so they can
     * grant the PACKAGE_USAGE_STATS permission manually.
     * Called from JS when getUsageStats returns PERMISSION_DENIED.
     */
    @PluginMethod
    fun openUsageAccessSettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        call.resolve()
    }
}
