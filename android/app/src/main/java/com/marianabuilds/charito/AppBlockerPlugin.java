package com.marianabuilds.charito;

import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.provider.Settings;
import android.text.TextUtils;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;

/**
 * AppBlockerPlugin — Capacitor bridge for Charito's app-blocking feature.
 *
 * JavaScript interface:
 *   startBlocking({ packages: string[], blockEndEpochMs: number }) → void
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

        if (packages == null || packages.length() == 0) {
            call.reject("packages array is required and must not be empty");
            return;
        }

        Set<String> pkgSet = new HashSet<>();
        try {
            for (int i = 0; i < packages.length(); i++) {
                String pkg = packages.getString(i);
                if (pkg != null && !pkg.isEmpty()) pkgSet.add(pkg);
            }
        } catch (Exception e) {
            call.reject("Failed to parse packages: " + e.getMessage());
            return;
        }

        SharedPreferences prefs = getContext()
                .getSharedPreferences(AppBlockerService.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putStringSet(AppBlockerService.KEY_BLOCKED, pkgSet)
                .putLong(AppBlockerService.KEY_BLOCK_END_MS, blockEndMs)
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
