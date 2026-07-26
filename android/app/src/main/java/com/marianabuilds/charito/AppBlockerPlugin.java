package com.marianabuilds.charito;

import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * AppBlockerPlugin — Capacitor bridge for Charito's app-blocking feature.
 *
 * JavaScript interface:
 *   startBlocking({ packages: string[], blockEndEpochMs: number, reminderText?: string }) → void
 *   stopBlocking()                                                  → void
 *   hasAccessibilityPermission()                                    → { granted: boolean }
 *   openAccessibilitySettings()                                     → void
 *
 * The plugin writes the active blocked-packages list into SharedPreferences so
 * AppBlockerService can read it without needing a bound-service connection.
 *
 * A BroadcastReceiver listens for ACTION_BREAK_BLOCK events from BlockedOverlayActivity
 * and forwards them to JS as a "breakBlock" plugin event.
 */
@CapacitorPlugin(name = "AppBlocker")
public class AppBlockerPlugin extends Plugin {

    /** Dialer / phone packages that must never be blocked. */
    private static final List<String> PHONE_PACKAGES = Arrays.asList(
            "com.android.dialer",
            "com.google.android.dialer",
            "com.samsung.android.dialer",
            "com.samsung.android.incallui",
            "com.android.phone",
            "com.android.server.telecom",
            "com.google.android.apps.dialer",
            "com.oneplus.dialer",
            "com.miui.dialer",
            "com.huawei.android.dialer",
            "com.coloros.dialer",
            "com.truecaller"
    );

    private BroadcastReceiver breakBlockReceiver;

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @Override
    public void load() {
        // Register a receiver so BlockedOverlayActivity can notify JS when
        // the user taps "Break block ($1)"
        breakBlockReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String pkg = intent.getStringExtra(BlockedOverlayActivity.EXTRA_PACKAGE_NAME);
                JSObject data = new JSObject();
                data.put("packageName", pkg != null ? pkg : "");
                notifyListeners("breakBlock", data);
            }
        };

        IntentFilter filter = new IntentFilter(BlockedOverlayActivity.ACTION_BREAK_BLOCK);
        getContext().registerReceiver(breakBlockReceiver, filter);
    }

    @Override
    protected void handleOnDestroy() {
        if (breakBlockReceiver != null) {
            try {
                getContext().unregisterReceiver(breakBlockReceiver);
            } catch (IllegalArgumentException ignored) { /* already unregistered */ }
        }
    }

    // ── Plugin methods ────────────────────────────────────────────────────────

    /**
     * Activates app blocking for the given package list.
     *
     * Call options:
     *   packages      — string[] of Android package names to block
     *   blockEndEpochMs — epoch ms when the block should auto-expire (0 = no expiry)
     */
    @PluginMethod
    public void startBlocking(PluginCall call) {
        JSArray packages = call.getArray("packages");
        long blockEndMs  = call.getLong("blockEndEpochMs", 0L);
        String reminderText = call.getString("reminderText", "");

        if (packages == null || packages.length() == 0) {
            call.reject("packages array is required and must not be empty");
            return;
        }

        Set<String> pkgSet = new HashSet<>();
        try {
            for (int i = 0; i < packages.length(); i++) {
                String pkg = packages.getString(i);
                if (pkg != null && !pkg.isEmpty() && !PHONE_PACKAGES.contains(pkg)) {
                    pkgSet.add(pkg);
                }
            }
        } catch (Exception e) {
            call.reject("Failed to parse packages: " + e.getMessage());
            return;
        }

        if (pkgSet.isEmpty()) {
            call.reject("No blockable packages after excluding Phone/Dialer");
            return;
        }

        SharedPreferences prefs = getContext()
                .getSharedPreferences(AppBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putStringSet(AppBlockerService.KEY_BLOCKED, pkgSet)
                .putLong(AppBlockerService.KEY_BLOCK_END_MS, blockEndMs)
                .putString(AppBlockerService.KEY_REMINDER_TEXT,
                        reminderText != null ? reminderText : "")
                .apply();

        call.resolve();
    }

    /**
     * Deactivates app blocking — clears the blocked-packages list.
     */
    @PluginMethod
    public void stopBlocking(PluginCall call) {
        getContext()
                .getSharedPreferences(AppBlockerService.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .remove(AppBlockerService.KEY_BLOCKED)
                .remove(AppBlockerService.KEY_BLOCK_END_MS)
                .remove(AppBlockerService.KEY_REMINDER_TEXT)
                .apply();
        call.resolve();
    }

    /**
     * Returns whether the Accessibility Service is currently enabled in system settings.
     * The user must enable it manually; it cannot be granted programmatically.
     */
    @PluginMethod
    public void hasAccessibilityPermission(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", isAccessibilityServiceEnabled());
        call.resolve(result);
    }

    /**
     * Opens Android Accessibility Settings so the user can enable AppBlockerService.
     */
    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    /**
     * Returns whether "Display over other apps" (SYSTEM_ALERT_WINDOW) is granted.
     */
    @PluginMethod
    public void hasOverlayPermission(PluginCall call) {
        JSObject result = new JSObject();
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            granted = Settings.canDrawOverlays(getContext());
        }
        result.put("granted", granted);
        call.resolve(result);
    }

    /**
     * Opens the system screen to grant "Display over other apps".
     */
    @PluginMethod
    public void openOverlaySettings(PluginCall call) {
        try {
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                intent = new Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getContext().getPackageName())
                );
            } else {
                intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    /**
     * Returns launcher apps installed on the device (for the app picker UI).
     * Phone/dialer packages and Charito itself are excluded.
     *
     * Returns: { apps: Array<{ packageName, appName }> }
     */
    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        Intent main = new Intent(Intent.ACTION_MAIN, null);
        main.addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> resolved = pm.queryIntentActivities(main, 0);

        java.util.ArrayList<String[]> rows = new java.util.ArrayList<>();
        Set<String> seen = new HashSet<>();
        String selfPkg = getContext().getPackageName();

        for (ResolveInfo ri : resolved) {
            if (ri.activityInfo == null) continue;
            String pkg = ri.activityInfo.packageName;
            if (pkg == null || seen.contains(pkg)) continue;
            if (pkg.equals(selfPkg) || PHONE_PACKAGES.contains(pkg)) continue;
            if (pkg.equals("com.android.settings") || pkg.equals("com.android.systemui")) continue;

            seen.add(pkg);
            String label;
            try {
                ApplicationInfo info = pm.getApplicationInfo(pkg, 0);
                label = pm.getApplicationLabel(info).toString();
            } catch (Exception e) {
                label = pkg;
            }
            rows.add(new String[]{ pkg, label });
        }

        Collections.sort(rows, new Comparator<String[]>() {
            @Override
            public int compare(String[] a, String[] b) {
                return a[1].compareToIgnoreCase(b[1]);
            }
        });

        JSArray apps = new JSArray();
        for (String[] row : rows) {
            JSObject obj = new JSObject();
            obj.put("packageName", row[0]);
            obj.put("appName", row[1]);
            apps.put(obj);
        }

        JSObject result = new JSObject();
        result.put("apps", apps);
        call.resolve(result);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Checks the secure settings string "enabled_accessibility_services" for our
     * service component — the only reliable way to detect if an accessibility
     * service is active without BIND_ACCESSIBILITY_SERVICE permission.
     */
    private boolean isAccessibilityServiceEnabled() {
        ComponentName cn = new ComponentName(getContext(), AppBlockerService.class);
        String flat = cn.flattenToString();
        try {
            String enabled = Settings.Secure.getString(
                    getContext().getContentResolver(),
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            );
            if (enabled == null) return false;
            // The value is colon-separated list of "package/class" strings
            for (String entry : enabled.split(":")) {
                if (flat.equalsIgnoreCase(entry.trim())) return true;
            }
        } catch (Exception ignored) { /* */ }
        return false;
    }
}
