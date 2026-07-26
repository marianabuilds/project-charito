package com.marianabuilds.charito;

import android.accessibilityservice.AccessibilityService;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;

import java.util.HashSet;
import java.util.Set;

/**
 * AppBlockerService — Accessibility Service for Charito app blocking.
 *
 * Listens for TYPE_WINDOW_STATE_CHANGED events (fired every time the foreground
 * app changes) and launches BlockedOverlayActivity when the incoming package is
 * in the user's active blocked-apps list.
 *
 * The blocked-packages list is maintained by AppBlockerPlugin via SharedPreferences
 * so both the service and the plugin share the same source of truth without needing
 * a bound-service IPC channel.
 */
public class AppBlockerService extends AccessibilityService {

    private static final String TAG = "CharitoBlocker";
    public static final String PREFS_NAME  = "charito_prefs";
    public static final String KEY_BLOCKED = "blocked_packages";
    public static final String KEY_BLOCK_END_MS = "block_end_epoch_ms";

    /** Package that is currently showing our overlay (avoid re-launching it). */
    private String lastBlockedPackage = null;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return;

        CharSequence pkgSeq = event.getPackageName();
        if (pkgSeq == null) return;
        String pkg = pkgSeq.toString();

        // Ignore our own app and system UI
        if (pkg.equals(getPackageName())) {
            lastBlockedPackage = null;
            return;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        // Check whether the block period has expired
        long blockEndMs = prefs.getLong(KEY_BLOCK_END_MS, 0L);
        if (blockEndMs > 0 && System.currentTimeMillis() > blockEndMs) {
            // Block has expired — clear it
            prefs.edit().remove(KEY_BLOCKED).remove(KEY_BLOCK_END_MS).apply();
            lastBlockedPackage = null;
            return;
        }

        Set<String> blocked = prefs.getStringSet(KEY_BLOCKED, new HashSet<>());
        if (blocked == null || !blocked.contains(pkg)) {
            // Not a blocked app — reset tracking
            if (!pkg.equals(lastBlockedPackage)) lastBlockedPackage = null;
            return;
        }

        // Already showing overlay for this package — skip
        if (pkg.equals(lastBlockedPackage)) return;

        lastBlockedPackage = pkg;
        Log.d(TAG, "Blocking app: " + pkg);

        // Resolve human-readable app name if possible
        String appName = pkg;
        try {
            appName = getPackageManager()
                    .getApplicationLabel(getPackageManager().getApplicationInfo(pkg, 0))
                    .toString();
        } catch (Exception ignored) { /* fall back to package name */ }

        Intent overlay = new Intent(this, BlockedOverlayActivity.class);
        overlay.putExtra(BlockedOverlayActivity.EXTRA_APP_NAME, appName);
        overlay.putExtra(BlockedOverlayActivity.EXTRA_PACKAGE_NAME, pkg);
        overlay.putExtra(BlockedOverlayActivity.EXTRA_BLOCK_END_MS, blockEndMs);
        overlay.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(overlay);
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "AppBlockerService interrupted");
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        Log.d(TAG, "AppBlockerService connected");
    }
}
