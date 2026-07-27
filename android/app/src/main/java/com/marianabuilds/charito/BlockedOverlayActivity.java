package com.marianabuilds.charito;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.speech.tts.TextToSpeech;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.Locale;

/**
 * BlockedOverlayActivity — fullscreen "you're blocked" screen.
 *
 * Launched by AppBlockerService whenever the user tries to open a blocked app.
 * Also launched in preview mode from Settings via AppBlockerPlugin.previewBlockedScreen.
 *
 * Live block: cannot dismiss with back. User must wait for expiry or break for $1.
 * Preview: back and a Close button dismiss without touching the active block prefs.
 *
 * Layout is built entirely in code to avoid depending on a separate XML layout file,
 * keeping this file self-contained for Appflow builds.
 */
public class BlockedOverlayActivity extends Activity {

    public static final String EXTRA_APP_NAME      = "app_name";
    public static final String EXTRA_PACKAGE_NAME  = "package_name";
    public static final String EXTRA_BLOCK_END_MS  = "block_end_epoch_ms";
    public static final String EXTRA_REMINDER_TEXT = "reminder_text";
    /** When true, screen is dismissible and does not clear / charge the live block. */
    public static final String EXTRA_PREVIEW       = "preview_mode";

    /** Broadcast action — web layer listens via AppBlockerPlugin to trigger the $1 charge. */
    public static final String ACTION_BREAK_BLOCK  = "com.marianabuilds.charito.BREAK_BLOCK";

    private CountDownTimer countDownTimer;
    private TextToSpeech tts;
    private boolean previewMode;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

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
        String reminderText = getIntent().getStringExtra(EXTRA_REMINDER_TEXT);
        previewMode = getIntent().getBooleanExtra(EXTRA_PREVIEW, false);

        if (appName == null || appName.isEmpty()) {
            appName = previewMode ? "Instagram" : "This app";
        }

        final String speakText = (reminderText != null && !reminderText.isEmpty())
                ? reminderText
                : "You set this block intentionally. This moment is yours.";
        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS && tts != null) {
                tts.setLanguage(Locale.getDefault());
                tts.speak(speakText, TextToSpeech.QUEUE_FLUSH, null, "charito_block");
            }
        });

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.parseColor("#F5F0EA"));
        root.setPadding(dp(32), dp(48), dp(32), dp(48));

        // Disabled-app icon tile (launcher-disabled feel)
        TextView iconTile = new TextView(this);
        iconTile.setText(appName.length() > 0
                ? String.valueOf(Character.toUpperCase(appName.charAt(0)))
                : "•");
        iconTile.setTextSize(28);
        iconTile.setTextColor(Color.parseColor("#9A9188"));
        iconTile.setGravity(Gravity.CENTER);
        iconTile.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable iconBg = new GradientDrawable();
        iconBg.setColor(Color.parseColor("#E4DDD4"));
        iconBg.setCornerRadius(dp(18));
        iconTile.setBackground(iconBg);
        iconTile.setAlpha(0.55f);
        LinearLayout.LayoutParams iconLp = new LinearLayout.LayoutParams(dp(72), dp(72));
        iconLp.gravity = Gravity.CENTER_HORIZONTAL;
        root.addView(iconTile, iconLp);

        spacer(root, 10);

        TextView disabledBadge = new TextView(this);
        disabledBadge.setText(previewMode ? "PREVIEW · DISABLED DURING DETOX" : "DISABLED DURING DETOX");
        disabledBadge.setTextSize(11);
        disabledBadge.setLetterSpacing(0.14f);
        disabledBadge.setTextColor(Color.parseColor("#9A9188"));
        disabledBadge.setGravity(Gravity.CENTER);
        disabledBadge.setTypeface(Typeface.DEFAULT_BOLD);
        root.addView(disabledBadge, matchWrap());

        spacer(root, 28);

        TextView brand = new TextView(this);
        brand.setText("Charito");
        brand.setTextSize(13);
        brand.setLetterSpacing(0.16f);
        brand.setTextColor(Color.parseColor("#5A7A5A"));
        brand.setGravity(Gravity.CENTER);
        brand.setAllCaps(true);
        brand.setTypeface(Typeface.DEFAULT_BOLD);
        root.addView(brand, matchWrap());

        spacer(root, 10);

        TextView pausedLabel = new TextView(this);
        pausedLabel.setText("Taking a breath");
        pausedLabel.setTextSize(13);
        pausedLabel.setLetterSpacing(0.12f);
        pausedLabel.setTextColor(Color.parseColor("#7A7065"));
        pausedLabel.setGravity(Gravity.CENTER);
        pausedLabel.setAllCaps(true);
        root.addView(pausedLabel, matchWrap());

        spacer(root, 12);

        TextView appLabel = new TextView(this);
        appLabel.setText(appName + " is paused");
        appLabel.setTextSize(26);
        appLabel.setTextColor(Color.parseColor("#1A1714"));
        appLabel.setGravity(Gravity.CENTER);
        appLabel.setTypeface(Typeface.DEFAULT_BOLD);
        root.addView(appLabel, matchWrap());

        spacer(root, 16);

        TextView msg = new TextView(this);
        if (previewMode) {
            msg.setText("This is what blocked apps look like during a detox.\nYour reminder message is spoken aloud.");
        } else {
            msg.setText("This app is unavailable while your detox block is active.\nUnblocking costs $1.");
        }
        msg.setTextSize(16);
        msg.setTextColor(Color.parseColor("#4A4540"));
        msg.setGravity(Gravity.CENTER);
        msg.setLineSpacing(0f, 1.4f);
        root.addView(msg, matchWrap());

        if (reminderText != null && !reminderText.isEmpty()) {
            spacer(root, 16);
            TextView quote = new TextView(this);
            quote.setText("\u201C" + reminderText + "\u201D");
            quote.setTextSize(15);
            quote.setTextColor(Color.parseColor("#5A7A5A"));
            quote.setGravity(Gravity.CENTER);
            quote.setTypeface(Typeface.defaultFromStyle(Typeface.ITALIC));
            quote.setLineSpacing(0f, 1.35f);
            root.addView(quote, matchWrap());
        }

        spacer(root, 28);

        final TextView countdown = new TextView(this);
        countdown.setTextSize(14);
        countdown.setTextColor(Color.parseColor("#7A7065"));
        countdown.setGravity(Gravity.CENTER);
        root.addView(countdown, matchWrap());

        if (previewMode) {
            countdown.setText("Preview — not a live block");
        } else if (blockEndMs > 0) {
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
                finish();
                return;
            }
        } else {
            countdown.setText("Block active");
        }

        spacer(root, 40);

        Button primaryBtn = new Button(this);
        primaryBtn.setTextColor(Color.WHITE);
        primaryBtn.setTextSize(15);
        primaryBtn.setAllCaps(false);
        primaryBtn.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable btnBg = new GradientDrawable();
        btnBg.setColor(Color.parseColor("#5A7A5A"));
        btnBg.setCornerRadius(dp(6));
        primaryBtn.setBackground(btnBg);
        primaryBtn.setPadding(dp(20), dp(14), dp(20), dp(14));

        if (previewMode) {
            primaryBtn.setText("Close preview");
            primaryBtn.setOnClickListener(v -> finish());
        } else {
            primaryBtn.setText("Break block — $1");
            final String blockedPkg = pkgName;
            primaryBtn.setOnClickListener(v -> {
                Intent broadcast = new Intent(ACTION_BREAK_BLOCK);
                broadcast.putExtra(EXTRA_PACKAGE_NAME, blockedPkg);
                sendBroadcast(broadcast);

                getSharedPreferences(AppBlockerService.PREFS_NAME, MODE_PRIVATE)
                        .edit()
                        .remove(AppBlockerService.KEY_BLOCKED)
                        .remove(AppBlockerService.KEY_BLOCK_END_MS)
                        .remove(AppBlockerService.KEY_REMINDER_TEXT)
                        .apply();

                finish();
            });
        }
        LinearLayout.LayoutParams btnLp = matchWrap();
        btnLp.width = LinearLayout.LayoutParams.MATCH_PARENT;
        root.addView(primaryBtn, btnLp);

        spacer(root, 14);

        TextView stayHint = new TextView(this);
        stayHint.setText(previewMode
                ? "On device, this screen covers blocked apps — Charito itself stays usable."
                : "Stay with the moment — the block will end on its own.");
        stayHint.setTextSize(12);
        stayHint.setTextColor(Color.parseColor("#9A9188"));
        stayHint.setGravity(Gravity.CENTER);
        root.addView(stayHint, matchWrap());

        setContentView(root);
    }

    @Override
    public void onBackPressed() {
        if (previewMode) {
            finish();
            return;
        }
        // Live block cannot be dismissed this way
    }

    @Override
    protected void onDestroy() {
        if (countDownTimer != null) countDownTimer.cancel();
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        super.onDestroy();
    }

    private int dp(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }

    private LinearLayout.LayoutParams matchWrap() {
        return new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
    }

    private void spacer(LinearLayout parent, int heightDp) {
        View space = new View(this);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(heightDp));
        parent.addView(space, lp);
    }
}
