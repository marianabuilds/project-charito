package com.marianabuilds.charito;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

/**
 * BlockedOverlayActivity — fullscreen "you're blocked" screen.
 *
 * Launched by AppBlockerService whenever the user tries to open a blocked app.
 * The user cannot dismiss it with the back button. They must either:
 *  a) Wait until the block expires (the activity auto-finishes), or
 *  b) Tap "Break block ($1)" to exit early (triggers charge flow in web layer).
 *
 * Layout is built entirely in code to avoid depending on a separate XML layout file,
 * keeping this file self-contained for Appflow builds.
 */
public class BlockedOverlayActivity extends Activity {

    public static final String EXTRA_APP_NAME      = "app_name";
    public static final String EXTRA_PACKAGE_NAME  = "package_name";
    public static final String EXTRA_BLOCK_END_MS  = "block_end_epoch_ms";

    /** Broadcast action — web layer listens via AppBlockerPlugin to trigger the $1 charge. */
    public static final String ACTION_BREAK_BLOCK  = "com.marianabuilds.charito.BREAK_BLOCK";

    private CountDownTimer countDownTimer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Fullscreen, keep screen on
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN
                        | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
                        | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        );

        String appName    = getIntent().getStringExtra(EXTRA_APP_NAME);
        String pkgName    = getIntent().getStringExtra(EXTRA_PACKAGE_NAME);
        long   blockEndMs = getIntent().getLongExtra(EXTRA_BLOCK_END_MS, 0L);

        if (appName == null) appName = "This app";

        // ── Build UI programmatically ──────────────────────────────────────────

        android.widget.LinearLayout root = new android.widget.LinearLayout(this);
        root.setOrientation(android.widget.LinearLayout.VERTICAL);
        root.setGravity(android.view.Gravity.CENTER);
        root.setBackgroundColor(Color.parseColor("#F5F0EA")); // Charito warm bg
        root.setPadding(dp(32), dp(64), dp(32), dp(64));

        // Leaf / logo emoji
        TextView logo = new TextView(this);
        logo.setText("🌿");
        logo.setTextSize(56);
        logo.setGravity(android.view.Gravity.CENTER);
        root.addView(logo, matchWrap());

        spacer(root, 24);

        // "Paused" label
        TextView pausedLabel = new TextView(this);
        pausedLabel.setText("Taking a breath");
        pausedLabel.setTextSize(13);
        pausedLabel.setLetterSpacing(0.12f);
        pausedLabel.setTextColor(Color.parseColor("#7A7065"));
        pausedLabel.setGravity(android.view.Gravity.CENTER);
        pausedLabel.setAllCaps(true);
        root.addView(pausedLabel, matchWrap());

        spacer(root, 12);

        // App name
        TextView appLabel = new TextView(this);
        appLabel.setText(appName + " is paused");
        appLabel.setTextSize(26);
        appLabel.setTextColor(Color.parseColor("#1A1714"));
        appLabel.setGravity(android.view.Gravity.CENTER);
        appLabel.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        root.addView(appLabel, matchWrap());

        spacer(root, 16);

        // Motivational message
        TextView msg = new TextView(this);
        msg.setText("You set this block intentionally.\nThis moment is yours.");
        msg.setTextSize(16);
        msg.setTextColor(Color.parseColor("#4A4540"));
        msg.setGravity(android.view.Gravity.CENTER);
        msg.setLineSpacing(0f, 1.4f);
        root.addView(msg, matchWrap());

        spacer(root, 32);

        // Countdown timer
        final TextView countdown = new TextView(this);
        countdown.setTextSize(14);
        countdown.setTextColor(Color.parseColor("#7A7065"));
        countdown.setGravity(android.view.Gravity.CENTER);
        root.addView(countdown, matchWrap());

        if (blockEndMs > 0) {
            long remaining = blockEndMs - System.currentTimeMillis();
            if (remaining > 0) {
                countDownTimer = new CountDownTimer(remaining, 1000) {
                    @Override
                    public void onTick(long millisUntilFinished) {
                        long secs  = millisUntilFinished / 1000;
                        long hrs   = secs / 3600;
                        long mins  = (secs % 3600) / 60;
                        long s     = secs % 60;
                        String label = hrs > 0
                                ? String.format("%d h %02d min remaining", hrs, mins)
                                : String.format("%d min %02d s remaining", mins, s);
                        countdown.setText(label);
                    }
                    @Override
                    public void onFinish() {
                        countdown.setText("Block complete ✓");
                        finish();
                    }
                }.start();
            } else {
                // Block already expired
                finish();
                return;
            }
        } else {
            countdown.setText("Block active");
        }

        spacer(root, 48);

        // Break block button
        Button breakBtn = new Button(this);
        breakBtn.setText("Break block ($1)");
        breakBtn.setTextColor(Color.parseColor("#7A7065"));
        breakBtn.setBackgroundColor(Color.TRANSPARENT);
        breakBtn.setTextSize(13);
        breakBtn.setOnClickListener(v -> {
            // Broadcast so AppBlockerPlugin can relay the event to JS
            Intent broadcast = new Intent(ACTION_BREAK_BLOCK);
            broadcast.putExtra(EXTRA_PACKAGE_NAME, pkgName);
            sendBroadcast(broadcast);

            // Clear the block from prefs so the service stops intercepting
            getSharedPreferences(AppBlockerService.PREFS_NAME, MODE_PRIVATE)
                    .edit()
                    .remove(AppBlockerService.KEY_BLOCKED)
                    .remove(AppBlockerService.KEY_BLOCK_END_MS)
                    .apply();

            finish();
        });
        root.addView(breakBtn, matchWrap());

        setContentView(root);
    }

    /** Back button does nothing — block cannot be dismissed this way. */
    @Override
    public void onBackPressed() {
        // intentionally swallowed
    }

    @Override
    protected void onDestroy() {
        if (countDownTimer != null) countDownTimer.cancel();
        super.onDestroy();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private int dp(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }

    private android.widget.LinearLayout.LayoutParams matchWrap() {
        return new android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        );
    }

    private void spacer(android.widget.LinearLayout parent, int heightDp) {
        View space = new View(this);
        android.widget.LinearLayout.LayoutParams lp = new android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT, dp(heightDp));
        parent.addView(space, lp);
    }
}
