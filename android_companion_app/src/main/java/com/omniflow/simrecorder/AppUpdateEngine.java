package com.omniflow.simrecorder;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.ProgressDialog;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * AppUpdateEngine — Over-The-Air (OTA) In-App Auto-Update System for OmniFlow Companion
 * 
 * Flow:
 * 1. Checks version.json on Supabase Storage CDN.
 * 2. If remote versionCode > local versionCode, displays Luxury Dark Teal Update Dialog.
 * 3. Downloads updated APK to app cache directory with progress bar.
 * 4. Invokes Android Native Package Installer via FileProvider without data loss.
 */
public class AppUpdateEngine {

    private static final String TAG = "AppUpdateEngine";
    public static final String VERSION_JSON_URL = "https://pdjaajbhrvglwukoacuh.supabase.co/storage/v1/object/public/omniflow-vault/app/version.json";
    public static final String FALLBACK_APK_URL = "https://pdjaajbhrvglwukoacuh.supabase.co/storage/v1/object/public/omniflow-vault/app/OmniFlow-Live-Companion.apk";

    public interface UpdateCheckCallback {
        void onCheckComplete(boolean updateAvailable, String latestVersion, String changelog);
    }

    /**
     * Check for updates on startup or manual trigger
     * @param activity Hosting activity
     * @param showToastIfLatest If true, displays toast when already on newest version (for manual checks)
     */
    public static void checkForUpdate(final Activity activity, final boolean showToastIfLatest) {
        if (activity == null || activity.isFinishing()) return;

        new Thread(() -> {
            try {
                Context ctx = activity.getApplicationContext();
                PackageManager pm = ctx.getPackageManager();
                PackageInfo pInfo = pm.getPackageInfo(ctx.getPackageName(), 0);
                long currentVersionCode = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) 
                    ? pInfo.getLongVersionCode() 
                    : pInfo.versionCode;
                String currentVersionName = pInfo.versionName;

                Log.d(TAG, "🔍 Checking update... Current app version: " + currentVersionName + " (Code: " + currentVersionCode + ")");

                URL url = new URL(VERSION_JSON_URL + "?nocache=" + System.currentTimeMillis());
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(6000);

                int code = conn.getResponseCode();
                if (code != 200) {
                    Log.w(TAG, "Version check HTTP error: " + code);
                    if (showToastIfLatest) {
                        new Handler(Looper.getMainLooper()).post(() -> 
                            Toast.makeText(ctx, "App is up to date (" + currentVersionName + ")", Toast.LENGTH_SHORT).show()
                        );
                    }
                    conn.disconnect();
                    return;
                }

                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                reader.close();
                conn.disconnect();

                JSONObject json = new JSONObject(sb.toString());
                int remoteVersionCode = json.optInt("versionCode", 1);
                String remoteVersionName = json.optString("versionName", "1.0.0");
                String apkUrl = json.optString("apkUrl", FALLBACK_APK_URL);
                String changeLog = json.optString("changeLog", "Bug fixes and telephony improvements.");
                boolean forceUpdate = json.optBoolean("forceUpdate", false);

                Log.d(TAG, "📦 Remote version: " + remoteVersionName + " (Code: " + remoteVersionCode + ")");

                if (remoteVersionCode > currentVersionCode) {
                    new Handler(Looper.getMainLooper()).post(() -> {
                        if (!activity.isFinishing()) {
                            showUpdateDialog(activity, remoteVersionName, changeLog, apkUrl, forceUpdate);
                        }
                    });
                } else if (showToastIfLatest) {
                    new Handler(Looper.getMainLooper()).post(() -> 
                        Toast.makeText(ctx, "✅ OmniFlow is up to date (v" + currentVersionName + ")", Toast.LENGTH_SHORT).show()
                    );
                }

            } catch (Exception e) {
                Log.e(TAG, "Error checking update: " + e.getMessage());
                if (showToastIfLatest) {
                    new Handler(Looper.getMainLooper()).post(() -> 
                        Toast.makeText(activity, "Version check failed: " + e.getMessage(), Toast.LENGTH_SHORT).show()
                    );
                }
            }
        }).start();
    }

    /**
     * Shows Luxury Dark Teal Themed Update Dialog
     */
    private static void showUpdateDialog(final Activity activity, final String newVersion, final String changeLog, final String apkUrl, final boolean forceUpdate) {
        float density = activity.getResources().getDisplayMetrics().density;

        LinearLayout layout = new LinearLayout(activity);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding((int)(20 * density), (int)(18 * density), (int)(20 * density), (int)(18 * density));

        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor("#041F1E")); // Deep Obsidian Teal
        bg.setCornerRadius(18 * density);
        bg.setStroke((int)(1.5f * density), Color.parseColor("#14B8A6")); // Mint Teal Glow
        layout.setBackground(bg);

        // Header Title
        TextView tvTitle = new TextView(activity);
        tvTitle.setText("🚀  New Update Available!");
        tvTitle.setTextSize(17f);
        tvTitle.setTypeface(null, Typeface.BOLD);
        tvTitle.setTextColor(Color.WHITE);
        tvTitle.setPadding(0, 0, 0, (int)(6 * density));
        layout.addView(tvTitle);

        // Version Subtitle
        TextView tvSub = new TextView(activity);
        tvSub.setText("Version v" + newVersion + " is ready to install.");
        tvSub.setTextSize(12.5f);
        tvSub.setTextColor(Color.parseColor("#5EEAD4"));
        tvSub.setPadding(0, 0, 0, (int)(12 * density));
        layout.addView(tvSub);

        // Changelog Box
        TextView tvNotesTitle = new TextView(activity);
        tvNotesTitle.setText("WHAT'S NEW:");
        tvNotesTitle.setTextSize(10.5f);
        tvNotesTitle.setTypeface(null, Typeface.BOLD);
        tvNotesTitle.setTextColor(Color.parseColor("#94A3B8"));
        layout.addView(tvNotesTitle);

        TextView tvNotes = new TextView(activity);
        tvNotes.setText(changeLog != null && !changeLog.isEmpty() ? changeLog : "Performance improvements & bug fixes.");
        tvNotes.setTextSize(12f);
        tvNotes.setTextColor(Color.parseColor("#E2E8F0"));
        tvNotes.setPadding((int)(8 * density), (int)(6 * density), (int)(8 * density), (int)(6 * density));
        
        GradientDrawable notesBg = new GradientDrawable();
        notesBg.setColor(Color.parseColor("#062B29"));
        notesBg.setCornerRadius(8 * density);
        tvNotes.setBackground(notesBg);
        
        LinearLayout.LayoutParams notesParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        notesParams.setMargins(0, (int)(4 * density), 0, (int)(16 * density));
        layout.addView(tvNotes, notesParams);

        AlertDialog.Builder builder = new AlertDialog.Builder(activity);
        builder.setView(layout);
        builder.setCancelable(!forceUpdate);

        final AlertDialog dialog = builder.create();
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }

        // Action Buttons Row
        LinearLayout btnRow = new LinearLayout(activity);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);
        btnRow.setGravity(Gravity.RIGHT);

        if (!forceUpdate) {
            TextView btnLater = new TextView(activity);
            btnLater.setText("Later");
            btnLater.setTextSize(13f);
            btnLater.setTextColor(Color.parseColor("#94A3B8"));
            btnLater.setPadding((int)(14 * density), (int)(10 * density), (int)(14 * density), (int)(10 * density));
            btnLater.setClickable(true);
            btnLater.setOnClickListener(v -> dialog.dismiss());
            btnRow.addView(btnLater);
        }

        TextView btnUpdate = new TextView(activity);
        btnUpdate.setText("📥  Update Now");
        btnUpdate.setTextSize(13.5f);
        btnUpdate.setTypeface(null, Typeface.BOLD);
        btnUpdate.setTextColor(Color.WHITE);
        btnUpdate.setPadding((int)(16 * density), (int)(10 * density), (int)(16 * density), (int)(10 * density));
        btnUpdate.setClickable(true);

        GradientDrawable btnUpdateBg = new GradientDrawable();
        btnUpdateBg.setColor(Color.parseColor("#0D9488")); // Glowing Mint Teal
        btnUpdateBg.setCornerRadius(10 * density);
        btnUpdate.setBackground(btnUpdateBg);

        btnUpdate.setOnClickListener(v -> {
            dialog.dismiss();
            startDownloadAndInstall(activity, apkUrl);
        });
        btnRow.addView(btnUpdate);

        layout.addView(btnRow);

        dialog.show();
    }

    /**
     * Downloads APK stream and initiates Android Package Installer
     */
    private static void startDownloadAndInstall(final Activity activity, final String downloadUrl) {
        final ProgressDialog progressDialog = new ProgressDialog(activity);
        progressDialog.setMessage("Downloading OmniFlow update...");
        progressDialog.setProgressStyle(ProgressDialog.STYLE_HORIZONTAL);
        progressDialog.setCancelable(false);
        progressDialog.setMax(100);
        progressDialog.show();

        new Thread(() -> {
            File tempApk = null;
            try {
                File updatesDir = new File(activity.getCacheDir(), "updates");
                if (!updatesDir.exists()) updatesDir.mkdirs();
                tempApk = new File(updatesDir, "OmniFlow-Update.apk");
                if (tempApk.exists()) tempApk.delete();

                URL url = new URL(downloadUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                conn.connect();

                int fileLength = conn.getContentLength();
                InputStream is = conn.getInputStream();
                FileOutputStream fos = new FileOutputStream(tempApk);

                byte[] buffer = new byte[8192];
                int total = 0;
                int count;
                while ((count = is.read(buffer)) != -1) {
                    total += count;
                    if (fileLength > 0) {
                        final int progress = (int) (total * 100L / fileLength);
                        new Handler(Looper.getMainLooper()).post(() -> progressDialog.setProgress(progress));
                    }
                    fos.write(buffer, 0, count);
                }
                fos.flush();
                fos.close();
                is.close();
                conn.disconnect();

                final File finalApk = tempApk;
                new Handler(Looper.getMainLooper()).post(() -> {
                    try {
                        progressDialog.dismiss();
                    } catch (Exception ignored) {}
                    launchInstaller(activity, finalApk);
                });

            } catch (Exception e) {
                Log.e(TAG, "Download error: " + e.getMessage());
                new Handler(Looper.getMainLooper()).post(() -> {
                    try {
                        progressDialog.dismiss();
                    } catch (Exception ignored) {}
                    Toast.makeText(activity, "Download failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        }).start();
    }

    /**
     * Launches Android Native Package Installer via FileProvider
     */
    private static void launchInstaller(Activity activity, File apkFile) {
        try {
            if (apkFile == null || !apkFile.exists() || apkFile.length() < 100000) {
                Toast.makeText(activity, "Corrupted update file", Toast.LENGTH_SHORT).show();
                return;
            }

            // Android 8.0+ (Oreo+) Unknown App Sources Check
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!activity.getPackageManager().canRequestPackageInstalls()) {
                    Toast.makeText(activity, "Please allow OmniFlow to install updates", Toast.LENGTH_LONG).show();
                    Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                        .setData(Uri.parse(String.format("package:%s", activity.getPackageName())));
                    activity.startActivity(settingsIntent);
                    return;
                }
            }

            Uri apkUri = FileProvider.getUriForFile(
                activity, 
                activity.getPackageName() + ".fileprovider", 
                apkFile
            );

            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            activity.startActivity(installIntent);
            Log.d(TAG, "🚀 Package installer invoked successfully for: " + apkUri);

        } catch (Exception e) {
            Log.e(TAG, "Failed to launch package installer: " + e.getMessage());
            Toast.makeText(activity, "Installer error: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }
}
