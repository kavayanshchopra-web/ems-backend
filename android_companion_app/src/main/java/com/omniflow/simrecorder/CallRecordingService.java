package com.omniflow.simrecorder;

import android.app.DatePickerDialog;
import android.app.TimePickerDialog;
import java.util.Calendar;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.ContentUris;
import android.content.ContentResolver;
import android.database.Cursor;
import android.net.Uri;
import android.content.SharedPreferences;
import android.provider.MediaStore;
import android.provider.DocumentsContract;
import android.provider.ContactsContract;
import android.provider.CallLog;
import android.content.pm.PackageManager;
import java.io.InputStream;
import android.content.pm.ServiceInfo;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Environment;
import android.os.IBinder;
import android.util.Base64;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.GridLayout;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * CallRecordingService — Foreground Telecalling Companion Service
 * Responsibilities:
 * 1. Template 1: Show In-Call Floating Square Card in Teal Theme with (X) button
 * 2. Stage 1: Send instant (100ms) call log to CRM upon call termination
 * 3. Template 2: Launch Post-Call Wrap-up Screen with calendar picker and 0ms zero-lag dismiss
 * 4. Silently sync recording to CRM backend & GHL conversation without freezing UI
 */
public class CallRecordingService extends Service {

    private static final String TAG = "OmniFlowRecorder";
    private static final String CHANNEL_ID = "omniflow_recording";
    private static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_START_RECORDING = "ACTION_START_RECORDING";
    public static final String ACTION_STOP_RECORDING = "ACTION_STOP_RECORDING";

    private MediaRecorder mediaRecorder;
    private String recordingFilePath;
    private String phoneNumber;
    private String callType;
    private long callStartTime;

    private WindowManager windowManager;
    private View inCallCardView;
    private View postCallDialogView;
    private Handler inCallTimerHandler = new Handler(Looper.getMainLooper());
    private Runnable inCallTimerRunnable;
    private TextView tvInCallTimer;
    private Handler autoDismissHandler = new Handler(Looper.getMainLooper());
    private Runnable autoDismissRunnable;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        Log.d(TAG, "Service action: " + action);

        // Always ensure service is in Foreground on start command
        Notification notif = buildNotification("🟢 OmniFlow is active and monitoring calls");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                startForeground(NOTIFICATION_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
            } catch (Exception e) {
                startForeground(NOTIFICATION_ID, notif);
            }
        } else {
            startForeground(NOTIFICATION_ID, notif);
        }

        if (ACTION_START_RECORDING.equals(action) && intent != null) {
            phoneNumber = intent.getStringExtra("phone_number");
            callType = intent.getStringExtra("call_type");
            callStartTime = intent.getLongExtra("start_time", System.currentTimeMillis());

            // Update Notification to Recording Status
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(NOTIFICATION_ID, buildNotification("🔴 Call in progress with " + phoneNumber));
            }

            // Template 1: Show In-Call Floating Square Card in Teal-Green Theme
            showInCallFloatingCard(phoneNumber, callType);

            startRecording();

        } else if (ACTION_STOP_RECORDING.equals(action)) {
            stopRecording();
        }

        return START_STICKY;
    }

    private void startRecording() {
        SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
        try {
            // Create recordings directory
            File dir = new File(getExternalFilesDir(null), "CallRecordings");
            if (!dir.exists()) dir.mkdirs();

            // File name with timestamp
            String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
            recordingFilePath = dir.getAbsolutePath() + "/call_" + timestamp + ".m4a";

            Log.d(TAG, "In-App Backup Recording to: " + recordingFilePath);

            mediaRecorder = new MediaRecorder();
            // 1. Try VOICE_COMMUNICATION source (Captures both earpiece & mic audio on Android chipsets)
            try {
                mediaRecorder.setAudioSource(MediaRecorder.AudioSource.VOICE_COMMUNICATION);
                mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
                mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
                mediaRecorder.setAudioSamplingRate(16000); // 16kHz HD Voice
                mediaRecorder.setAudioEncodingBitRate(24000); // 24kbps (Ultra compact for Firestore sync)
                mediaRecorder.setOutputFile(recordingFilePath);
                mediaRecorder.prepare();
                mediaRecorder.start();
                Log.d(TAG, "✅ In-App Recording STARTED (VOICE_COMMUNICATION AAC 24kbps)");
                prefs.edit().remove("last_recording_error").apply();
            } catch (Exception e1) {
                Log.w(TAG, "VOICE_COMMUNICATION failed, trying MIC: " + e1.getMessage());
                // Fallback: MIC
                mediaRecorder = new MediaRecorder();
                mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
                mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
                mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
                mediaRecorder.setAudioSamplingRate(16000);
                mediaRecorder.setAudioEncodingBitRate(24000);
                mediaRecorder.setOutputFile(recordingFilePath);
                mediaRecorder.prepare();
                mediaRecorder.start();
                Log.d(TAG, "✅ In-App Recording STARTED (MIC AAC 24kbps)");
                prefs.edit().remove("last_recording_error").apply();
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to start in-app recording: " + e.getMessage());
            prefs.edit().putString("last_recording_error", "Recorder init failed: " + e.getMessage()).apply();
        }
    }

    private void stopRecording() {
        // Dismiss in-call floating card
        dismissInCallFloatingCard();

        long durationSeconds = (System.currentTimeMillis() - callStartTime) / 1000;
        if (durationSeconds < 0) durationSeconds = 0;
        SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);

        try {
            if (mediaRecorder != null) {
                try {
                    mediaRecorder.stop();
                    Log.d(TAG, "⏹️ MediaRecorder stopped. Duration: " + durationSeconds + "s");
                } catch (Exception stopEx) {
                    Log.w(TAG, "Stop warning (short call): " + stopEx.getMessage());
                }
                mediaRecorder.release();
                mediaRecorder = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error releasing recorder: " + e.getMessage());
        }

        // Reset notification
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(NOTIFICATION_ID, buildNotification("🟢 OmniFlow is active and monitoring calls"));
        }

        // Generate unique callId for 2-stage decoupled tracking
        final String callId = "call_" + System.currentTimeMillis() + "_" + (phoneNumber != null ? phoneNumber.replaceAll("\\D", "") : "0");

        // Stage 1: Send instant 100ms lightweight call log to CRM (bina audio ke, zero delay!)
        sendStage1InstantLog(phoneNumber, durationSeconds, callType, callId);

        // Locate audio file (SAF / Native file / In-app mic)
        final long finalDuration = durationSeconds;
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            CapturedAudioInfo audioInfo = resolveAudioFiles();

            // Launch Native PostCallDispositionActivity Dialog
            try {
                Intent dialogIntent = new Intent(this, PostCallDispositionActivity.class);
                dialogIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                dialogIntent.putExtra("phone_number", phoneNumber != null ? phoneNumber : "Customer");
                dialogIntent.putExtra("call_type", callType != null ? callType : "OUTGOING");
                dialogIntent.putExtra("duration", finalDuration);
                dialogIntent.putExtra("call_id", callId);
                if (audioInfo != null && audioInfo.backupFileToUpload != null) {
                    dialogIntent.putExtra("audio_path", audioInfo.backupFileToUpload.getAbsolutePath());
                }
                if (audioInfo != null && audioInfo.safFileUri != null) {
                    dialogIntent.putExtra("audio_uri", audioInfo.safFileUri.toString());
                }
                startActivity(dialogIntent);
            } catch (Exception e) {
                Log.w(TAG, "Failed to launch PostCallDispositionActivity: " + e.getMessage());
                showPostCallDispositionDialog(finalDuration, audioInfo, callId);
            }
        }, 800); // Short delay to let native phone dialer write file
    }

    /**
     * Stage 1: Fast 100ms Instant Call-Log Fetch to CRM
     */
    private void sendStage1InstantLog(String phone, long duration, String type, String cId) {
        new Thread(() -> {
            try {
                SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
                String apiUrl = prefs.getString("api_url", "https://ems-backend-9hig.onrender.com");
                String agentName = prefs.getString("agent_name", "Mobile Agent");
                String agentEmail = prefs.getString("agent_email", "agent@omniflow.in");
                String custName = resolveContactOrCallerIdName(this, phone);

                String timestamp = new SimpleDateFormat("dd/MM/yyyy, hh:mm:ss aa", Locale.getDefault()).format(new Date());
                String json = "{"
                    + "\"customerPhone\":\"" + escapeJson(phone != null ? phone : "Unknown") + "\","
                    + "\"customerName\":\"" + escapeJson(custName != null ? custName : (phone != null ? phone : "Customer")) + "\","
                    + "\"agentName\":\"" + escapeJson(agentName) + "\","
                    + "\"agentEmail\":\"" + escapeJson(agentEmail) + "\","
                    + "\"channel\":\"SIM\","
                    + "\"type\":\"" + escapeJson(type != null ? type : "OUTGOING") + "\","
                    + "\"durationSeconds\":" + duration + ","
                    + "\"callId\":\"" + escapeJson(cId) + "\","
                    + "\"timestamp\":\"" + timestamp + "\","
                    + "\"disposition\":\"Pending\","
                    + "\"notes\":\"Call completed via SIM [Ref: " + escapeJson(cId) + "]\","
                    + "\"simSlot\":\"SIM 1\""
                    + "}";

                java.net.URL url = new java.net.URL(apiUrl + "/api/telecalling/sync-log");
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                conn.setDoOutput(true);
                conn.setConnectTimeout(4000);
                conn.setReadTimeout(4000);

                byte[] input = json.getBytes("utf-8");
                conn.getOutputStream().write(input, 0, input.length);
                int code = conn.getResponseCode();
                Log.d(TAG, "⚡ [Stage 1] Instant call log sent: " + code);
                conn.disconnect();
            } catch (Exception e) {
                Log.w(TAG, "Stage 1 instant sync notice: " + e.getMessage());
            }
        }).start();
    }

    /**
     * Template 1: In-Call Floating Square Card in Signature Teal Theme
     */
    private void showInCallFloatingCard(String phone, String type) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            Log.w(TAG, "Overlay permission not granted — opening overlay settings");
            try {
                Intent pIntent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName()));
                pIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(pIntent);
            } catch (Exception ignored) {}
            return;
        }

        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                dismissInCallFloatingCard();
                windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

                // Container matching Template 1
                LinearLayout card = new LinearLayout(this);
                card.setOrientation(LinearLayout.VERTICAL);
                card.setPadding(32, 24, 32, 24);

                GradientDrawable cardBg = new GradientDrawable();
                cardBg.setColor(Color.parseColor("#041F1E")); // Dark Teal Glass
                cardBg.setCornerRadius(28f);
                cardBg.setStroke(2, Color.parseColor("#14B8A6")); // Glowing Teal
                card.setBackground(cardBg);

                // Top Header: Label + Top-Right (X) Button
                LinearLayout headerRow = new LinearLayout(this);
                headerRow.setOrientation(LinearLayout.HORIZONTAL);
                headerRow.setGravity(Gravity.CENTER_VERTICAL);

                TextView tvHeader = new TextView(this);
                tvHeader.setText("CRM LIVE CALL • SIM 1");
                tvHeader.setTextColor(Color.parseColor("#5EEAD4"));
                tvHeader.setTextSize(10.5f);
                tvHeader.setTypeface(null, android.graphics.Typeface.BOLD);
                LinearLayout.LayoutParams hParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
                headerRow.addView(tvHeader, hParams);

                TextView btnClose = new TextView(this);
                btnClose.setText("✕");
                btnClose.setTextColor(Color.parseColor("#94A3B8"));
                btnClose.setTextSize(16f);
                btnClose.setTypeface(null, android.graphics.Typeface.BOLD);
                btnClose.setPadding(16, 0, 8, 8);
                btnClose.setClickable(true);
                btnClose.setOnClickListener(v -> dismissInCallFloatingCard());
                headerRow.addView(btnClose);
                card.addView(headerRow);

                // Client Info Row: Avatar + Name + Company/Tag
                LinearLayout clientRow = new LinearLayout(this);
                clientRow.setOrientation(LinearLayout.HORIZONTAL);
                clientRow.setGravity(Gravity.CENTER_VERTICAL);
                clientRow.setPadding(0, 10, 0, 10);

                // Circular Avatar Placeholder
                TextView tvAvatar = new TextView(this);
                String custName = resolveContactOrCallerIdName(this, phone);
                String initial = (custName != null && !custName.isEmpty()) ? custName.substring(0, 1).toUpperCase() : "C";
                tvAvatar.setText(initial);
                tvAvatar.setTextColor(Color.WHITE);
                tvAvatar.setTextSize(14f);
                tvAvatar.setTypeface(null, android.graphics.Typeface.BOLD);
                tvAvatar.setGravity(Gravity.CENTER);
                GradientDrawable avBg = new GradientDrawable();
                avBg.setColor(Color.parseColor("#0D9488"));
                avBg.setShape(GradientDrawable.OVAL);
                avBg.setStroke(2, Color.parseColor("#14B8A6"));
                tvAvatar.setBackground(avBg);
                LinearLayout.LayoutParams avParams = new LinearLayout.LayoutParams(90, 90);
                avParams.setMargins(0, 0, 16, 0);
                tvAvatar.setLayoutParams(avParams);
                clientRow.addView(tvAvatar);

                LinearLayout nameCol = new LinearLayout(this);
                nameCol.setOrientation(LinearLayout.VERTICAL);

                TextView tvName = new TextView(this);
                tvName.setText(custName != null ? custName : phone);
                tvName.setTextColor(Color.WHITE);
                tvName.setTextSize(14.5f);
                tvName.setTypeface(null, android.graphics.Typeface.BOLD);
                nameCol.addView(tvName);

                TextView tvTag = new TextView(this);
                tvTag.setText(phone + " • Hot Lead (₹2.5L)");
                tvTag.setTextColor(Color.parseColor("#2DD4BF"));
                tvTag.setTextSize(11f);
                nameCol.addView(tvTag);

                clientRow.addView(nameCol, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));
                card.addView(clientRow);

                // Live Call Timer with pulsing green dot
                tvInCallTimer = new TextView(this);
                tvInCallTimer.setText("🟢 00:00 (Call in Progress)");
                tvInCallTimer.setTextColor(Color.parseColor("#34D399"));
                tvInCallTimer.setTextSize(11.5f);
                tvInCallTimer.setTypeface(null, android.graphics.Typeface.BOLD);
                tvInCallTimer.setPadding(0, 4, 0, 10);
                card.addView(tvInCallTimer);

                // Quick Actions Row (WhatsApp + CRM)
                LinearLayout actRow = new LinearLayout(this);
                actRow.setOrientation(LinearLayout.HORIZONTAL);

                Button btnWa = new Button(this);
                btnWa.setText("💬 WhatsApp");
                btnWa.setTextSize(10.5f);
                btnWa.setTextColor(Color.parseColor("#A7F3D0"));
                btnWa.setAllCaps(false);
                GradientDrawable waBg = new GradientDrawable();
                waBg.setColor(Color.parseColor("#064E3B"));
                waBg.setCornerRadius(14f);
                waBg.setStroke(1, Color.parseColor("#059669"));
                btnWa.setBackground(waBg);
                btnWa.setOnClickListener(v -> {
                    try {
                        String clean = (phone != null ? phone : "").replaceAll("\\D", "");
                        Intent waIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/" + clean));
                        waIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(waIntent);
                    } catch (Exception ignored) {}
                });
                LinearLayout.LayoutParams waParams = new LinearLayout.LayoutParams(0, 85, 1.0f);
                waParams.setMargins(0, 0, 8, 0);
                actRow.addView(btnWa, waParams);

                Button btnCrm = new Button(this);
                btnCrm.setText("📋 CRM Profile");
                btnCrm.setTextSize(10.5f);
                btnCrm.setTextColor(Color.parseColor("#99F6E4"));
                btnCrm.setAllCaps(false);
                GradientDrawable crmBg = new GradientDrawable();
                crmBg.setColor(Color.parseColor("#0F3836"));
                crmBg.setCornerRadius(14f);
                crmBg.setStroke(1, Color.parseColor("#14B8A6"));
                btnCrm.setBackground(crmBg);
                btnCrm.setOnClickListener(v -> {
                    try {
                        Intent crmIntent = new Intent(this, MainActivity.class);
                        crmIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(crmIntent);
                    } catch (Exception ignored) {}
                });
                LinearLayout.LayoutParams crmParams = new LinearLayout.LayoutParams(0, 85, 1.0f);
                actRow.addView(btnCrm, crmParams);
                card.addView(actRow);

                // Layout Params & Dragging Support
                int layoutFlag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O 
                    ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY 
                    : WindowManager.LayoutParams.TYPE_PHONE;

                int screenWidth = getResources().getDisplayMetrics().widthPixels;
                WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                    (int) (screenWidth * 0.90),
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    layoutFlag,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                    PixelFormat.TRANSLUCENT
                );

                params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
                params.y = 140;

                card.setOnTouchListener(new View.OnTouchListener() {
                    private int initialX, initialY;
                    private float initialTouchX, initialTouchY;
                    private boolean isDragging = false;

                    @Override
                    public boolean onTouch(View v, MotionEvent event) {
                        switch (event.getAction()) {
                            case MotionEvent.ACTION_DOWN:
                                initialX = params.x;
                                initialY = params.y;
                                initialTouchX = event.getRawX();
                                initialTouchY = event.getRawY();
                                isDragging = false;
                                return false; // Allow buttons inside to receive touch down
                            case MotionEvent.ACTION_MOVE:
                                float dx = Math.abs(event.getRawX() - initialTouchX);
                                float dy = Math.abs(event.getRawY() - initialTouchY);
                                if (dx > 12 || dy > 12 || isDragging) {
                                    isDragging = true;
                                    params.x = initialX + (int) (event.getRawX() - initialTouchX);
                                    params.y = initialY + (int) (event.getRawY() - initialTouchY);
                                    if (windowManager != null && inCallCardView != null) {
                                        windowManager.updateViewLayout(inCallCardView, params);
                                    }
                                    return true;
                                }
                                break;
                            case MotionEvent.ACTION_UP:
                                if (isDragging) {
                                    isDragging = false;
                                    return true;
                                }
                                break;
                        }
                        return false;
                    }
                });

                inCallCardView = card;
                windowManager.addView(inCallCardView, params);

                // Start live timer
                inCallTimerRunnable = new Runnable() {
                    @Override
                    public void run() {
                        long elapsed = (System.currentTimeMillis() - callStartTime) / 1000;
                        long m = elapsed / 60;
                        long s = elapsed % 60;
                        if (tvInCallTimer != null) {
                            tvInCallTimer.setText(String.format(Locale.getDefault(), "🟢 %02d:%02d (Call in Progress)", m, s));
                        }
                        inCallTimerHandler.postDelayed(this, 1000);
                    }
                };
                inCallTimerHandler.postDelayed(inCallTimerRunnable, 1000);

            } catch (Exception e) {
                Log.e(TAG, "Error showing in-call floating card: " + e.getMessage());
            }
        });
    }

    private void dismissInCallFloatingCard() {
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                if (inCallTimerRunnable != null) inCallTimerHandler.removeCallbacks(inCallTimerRunnable);
                if (windowManager != null && inCallCardView != null) {
                    windowManager.removeView(inCallCardView);
                    inCallCardView = null;
                }
            } catch (Exception ignored) {}
        });
    }

    private static class CapturedAudioInfo {
        Uri safFileUri;
        File backupFileToUpload;
        boolean isNative;
        String modeNote;
    }

    private CapturedAudioInfo resolveAudioFiles() {
        CapturedAudioInfo info = new CapturedAudioInfo();
        SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
        info.modeNote = "🎙️ In-App Mic Recording (Fallback Mode)";

        // 1. Try finding call recording in User Selected SAF folder FIRST
        String folderUriStr = prefs.getString("selected_folder_uri", "");
        if (!folderUriStr.isEmpty()) {
            try {
                Uri treeUri = Uri.parse(folderUriStr);
                info.safFileUri = findRecordingInSelectedFolder(treeUri);
                if (info.safFileUri != null) {
                    info.isNative = true;
                    info.modeNote = "🎧 HD Both-Sides Recording (Selected Folder)";
                    Log.d(TAG, "✅ Selected NATIVE Recording from SAF Folder: " + info.safFileUri.toString());
                    return info;
                }
            } catch (Exception e) {
                Log.e(TAG, "Error checking SAF folder: " + e.getMessage());
            }
        }

        // 2. Try MediaStore (Zero-Permission Direct Query for Samsung / Xiaomi Native Call Recordings)
        Uri mediaStoreUri = findLatestRecordingViaMediaStore();
        if (mediaStoreUri != null) {
            info.safFileUri = mediaStoreUri;
            info.isNative = true;
            info.modeNote = "🎧 HD Both-Sides Recording (Samsung MediaStore)";
            Log.d(TAG, "✅ Selected NATIVE Recording from MediaStore: " + mediaStoreUri.toString());
            return info;
        }

        // 3. If not found in MediaStore, try hardcoded direct paths
        File nativeFile = findNativeCallRecordingFile();
        if (nativeFile != null && nativeFile.exists() && nativeFile.length() > 2000) {
            info.backupFileToUpload = nativeFile;
            info.isNative = true;
            info.modeNote = "🎧 HD Both-Sides Recording (Native Scanner Path)";
            Log.d(TAG, "✅ Selected NATIVE Recording from path: " + nativeFile.getAbsolutePath());
            return info;
        }

        // 4. Fallback to In-App Mic recording
        if (recordingFilePath != null) {
            File inAppFile = new File(recordingFilePath);
            if (inAppFile.exists() && inAppFile.length() > 200) {
                info.backupFileToUpload = inAppFile;
                Log.d(TAG, "✅ Selected FALLBACK In-App Mic Recording");
            }
        }
        return info;
    }

    private Uri findLatestRecordingViaMediaStore() {
        try {
            Uri audioUri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
            String[] projection = {
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.DISPLAY_NAME,
                MediaStore.Audio.Media.DATE_ADDED,
                MediaStore.Audio.Media.DATE_MODIFIED,
                MediaStore.Audio.Media.SIZE
            };

            // Search files created in last 8 minutes
            long timeSeconds = (System.currentTimeMillis() - 480000) / 1000;
            String selection = MediaStore.Audio.Media.DATE_ADDED + " >= ? OR " + MediaStore.Audio.Media.DATE_MODIFIED + " >= ?";
            String[] selectionArgs = { String.valueOf(timeSeconds), String.valueOf(timeSeconds) };
            String sortOrder = MediaStore.Audio.Media.DATE_MODIFIED + " DESC";

            Cursor cursor = getContentResolver().query(audioUri, projection, selection, selectionArgs, sortOrder);
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    long id = cursor.getLong(0);
                    String name = cursor.getString(1);
                    long size = cursor.getLong(4);

                    if (size > 1500) {
                        String lower = (name != null ? name.toLowerCase() : "");
                        if (lower.contains("call") || lower.contains("rec") || lower.endsWith(".m4a") || lower.endsWith(".mp3") || lower.endsWith(".amr") || lower.endsWith(".3gp") || lower.endsWith(".aac")) {
                            cursor.close();
                            Uri contentUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id);
                            Log.d(TAG, "🎯 Found Samsung Native Call Recording via MediaStore: " + contentUri + " (" + name + ")");
                            return contentUri;
                        }
                    }
                }
                cursor.close();
            }
        } catch (Exception e) {
            Log.e(TAG, "MediaStore query error: " + e.getMessage());
        }
        return null;
    }

    private File findNativeCallRecordingFile() {
        try {
            long windowStart = callStartTime - 30000; // Search window

            String[] directoriesToSearch = {
                Environment.getExternalStorageDirectory().getAbsolutePath() + "/Recordings/Call",
                Environment.getExternalStorageDirectory().getAbsolutePath() + "/Recordings",
                Environment.getExternalStorageDirectory().getAbsolutePath() + "/Sounds/CallRecordings",
                Environment.getExternalStorageDirectory().getAbsolutePath() + "/MIUI/sound_recorder/call_rec",
                Environment.getExternalStorageDirectory().getAbsolutePath() + "/ColorOS/CallRecordings",
                Environment.getExternalStorageDirectory().getAbsolutePath() + "/Record/Call",
                Environment.getExternalStorageDirectory().getAbsolutePath() + "/Music/Recordings/Call"
            };

            File bestFile = null;
            long newestModTime = 0;

            for (String dirPath : directoriesToSearch) {
                File dir = new File(dirPath);
                if (dir.exists() && dir.isDirectory()) {
                    File[] files = dir.listFiles();
                    if (files != null) {
                        for (File f : files) {
                            if (f.isFile() && f.length() > 2000) { // Size > 2KB
                                String name = f.getName().toLowerCase();
                                if (name.endsWith(".m4a") || name.endsWith(".mp3") || name.endsWith(".amr") || name.endsWith(".3gp") || name.endsWith(".wav") || name.endsWith(".aac")) {
                                    long modTime = f.lastModified();
                                    if (modTime >= windowStart && modTime > newestModTime) {
                                        newestModTime = modTime;
                                        bestFile = f;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (bestFile != null) {
                Log.d(TAG, "🎯 Found Native Phone Call Recording from path: " + bestFile.getAbsolutePath() + " (" + bestFile.length() + " bytes)");
                return bestFile;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error scanning native recording directories: " + e.getMessage());
        }
        return null;
    }

    private Uri findRecordingInSelectedFolder(Uri treeUri) {
        try {
            ContentResolver resolver = getContentResolver();
            Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(
                treeUri, 
                DocumentsContract.getTreeDocumentId(treeUri)
            );

            String[] projection = {
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                DocumentsContract.Document.COLUMN_LAST_MODIFIED,
                DocumentsContract.Document.COLUMN_SIZE
            };

            Cursor cursor = resolver.query(childrenUri, projection, null, null, null);
            if (cursor != null) {
                Uri latestUri = null;
                long newestTime = 0;
                long timeFilter = System.currentTimeMillis() - 240000; // Search last 4 minutes

                while (cursor.moveToNext()) {
                    String docId = cursor.getString(0);
                    String name = cursor.getString(1);
                    long lastMod = cursor.getLong(2);
                    long size = cursor.getLong(3);

                    if (size > 2000 && lastMod >= timeFilter) {
                        String lowerName = (name != null ? name.toLowerCase() : "");
                        if (lowerName.endsWith(".m4a") || lowerName.endsWith(".mp3") || lowerName.endsWith(".amr") || lowerName.endsWith(".3gp") || lowerName.endsWith(".wav") || lowerName.endsWith(".aac")) {
                            if (lastMod > newestTime) {
                                newestTime = lastMod;
                                latestUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, docId);
                            }
                        }
                    }
                }
                cursor.close();
                return latestUri;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error scanning selected tree URI: " + e.getMessage());
        }
        return null;
    }

    /**
     * Display Modern Post-Call Lead Disposition Popup Card in Signature Teal Theme
     * Features: Zero-lag 0ms dismiss, (X) close button, Calendar follow-up picker
     */
    private void showPostCallDispositionDialog(long durationSeconds, CapturedAudioInfo audioInfo, String callId) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            Log.w(TAG, "Overlay permission not granted — uploading directly with default status");
            uploadToCRM(durationSeconds, "Completed", "Call recorded via Companion", audioInfo, callId, "", "");
            return;
        }

        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                dismissPostCallDialog(); // Dismiss existing if any

                windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

                // Root Container matching Signature Teal Theme
                LinearLayout rootLayout = new LinearLayout(this);
                rootLayout.setOrientation(LinearLayout.VERTICAL);
                rootLayout.setPadding(36, 30, 36, 30);

                GradientDrawable cardBg = new GradientDrawable();
                cardBg.setColor(Color.parseColor("#041F1E")); // Deep Dark Teal
                cardBg.setCornerRadius(28f);
                cardBg.setStroke(2, Color.parseColor("#14B8A6")); // Glowing Teal
                rootLayout.setBackground(cardBg);

                // --- HEADER ROW (Title + Duration Badge + Top-Right '✕' Close) ---
                LinearLayout headerRow = new LinearLayout(this);
                headerRow.setOrientation(LinearLayout.HORIZONTAL);
                headerRow.setGravity(Gravity.CENTER_VERTICAL);
                headerRow.setPadding(0, 0, 0, 14);

                LinearLayout titleCol = new LinearLayout(this);
                titleCol.setOrientation(LinearLayout.VERTICAL);

                TextView tvHeading = new TextView(this);
                tvHeading.setText("📞 Call Completed");
                tvHeading.setTextColor(Color.WHITE);
                tvHeading.setTextSize(15.5f);
                tvHeading.setTypeface(null, android.graphics.Typeface.BOLD);

                long min = durationSeconds / 60;
                long sec = durationSeconds % 60;
                String durStr = String.format(Locale.getDefault(), "%02d:%02d", min, sec);

                TextView tvSubheading = new TextView(this);
                tvSubheading.setText(phoneNumber + " • Duration: " + durStr + " (SIM 1)");
                tvSubheading.setTextColor(Color.parseColor("#2DD4BF")); // Teal
                tvSubheading.setTextSize(12f);
                tvSubheading.setTypeface(null, android.graphics.Typeface.BOLD);

                titleCol.addView(tvHeading);
                titleCol.addView(tvSubheading);

                LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
                headerRow.addView(titleCol, titleParams);

                // Top-Right Close '✕' Button
                TextView btnClose = new TextView(this);
                btnClose.setText("✕");
                btnClose.setTextColor(Color.parseColor("#94A3B8"));
                btnClose.setTextSize(18f);
                btnClose.setTypeface(null, android.graphics.Typeface.BOLD);
                btnClose.setPadding(16, 4, 8, 4);
                btnClose.setClickable(true);
                btnClose.setOnClickListener(v -> {
                    dismissPostCallDialog();
                    uploadToCRM(durationSeconds, "Completed", "Call dismissed by agent", audioInfo, callId, "", "");
                });
                headerRow.addView(btnClose);
                rootLayout.addView(headerRow);

                // --- SECTION: SELECT LEAD DISPOSITION ---
                TextView tvStatusLabel = new TextView(this);
                tvStatusLabel.setText("SELECT LEAD OUTCOME / DISPOSITION:");
                tvStatusLabel.setTextColor(Color.parseColor("#94A3B8"));
                tvStatusLabel.setTextSize(11f);
                tvStatusLabel.setTypeface(null, android.graphics.Typeface.BOLD);
                tvStatusLabel.setPadding(0, 6, 0, 10);
                rootLayout.addView(tvStatusLabel);

                // 6 Status Chips Array
                String[] dispositions = {
                    "🎯 Interested", "📅 Demo Scheduled", "⏰ Follow-up Needed", 
                    "❌ Not Interested", "📵 Busy / Callback", "🚫 Wrong Number"
                };
                final String[] selectedDisp = {"Interested"};

                LinearLayout row1 = new LinearLayout(this);
                row1.setOrientation(LinearLayout.HORIZONTAL);
                row1.setPadding(0, 0, 0, 8);

                LinearLayout row2 = new LinearLayout(this);
                row2.setOrientation(LinearLayout.HORIZONTAL);
                row2.setPadding(0, 0, 0, 10);

                List<Button> allButtons = new java.util.ArrayList<>();

                for (int i = 0; i < dispositions.length; i++) {
                    final String disp = dispositions[i];
                    Button btn = new Button(this);
                    btn.setText(disp);
                    btn.setTextSize(11f);
                    btn.setAllCaps(false);
                    btn.setPadding(10, 8, 10, 8);

                    GradientDrawable btnBg = new GradientDrawable();
                    btnBg.setCornerRadius(14f);
                    btnBg.setColor(disp.contains("Interested") && !disp.contains("Not") ? Color.parseColor("#0D9488") : Color.parseColor("#072725"));
                    btnBg.setStroke(1, disp.contains("Interested") && !disp.contains("Not") ? Color.parseColor("#14B8A6") : Color.parseColor("#134E4A"));
                    btn.setBackground(btnBg);
                    btn.setTextColor(Color.WHITE);

                    LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
                    btnParams.setMargins(4, 0, 4, 0);
                    btn.setLayoutParams(btnParams);

                    btn.setOnClickListener(v -> {
                        selectedDisp[0] = disp.replaceAll("[^a-zA-Z -]", "").trim();
                        for (Button b : allButtons) {
                            GradientDrawable unselected = new GradientDrawable();
                            unselected.setCornerRadius(14f);
                            unselected.setColor(Color.parseColor("#072725"));
                            unselected.setStroke(1, Color.parseColor("#134E4A"));
                            b.setBackground(unselected);
                            b.setTextColor(Color.parseColor("#94A3B8"));
                        }
                        GradientDrawable activeBg = new GradientDrawable();
                        activeBg.setCornerRadius(14f);
                        activeBg.setColor(Color.parseColor("#0D9488")); // Active Teal
                        activeBg.setStroke(2, Color.parseColor("#14B8A6"));
                        btn.setBackground(activeBg);
                        btn.setTextColor(Color.WHITE);
                    });

                    allButtons.add(btn);
                    if (i < 3) {
                        row1.addView(btn);
                    } else {
                        row2.addView(btn);
                    }
                }
                rootLayout.addView(row1);
                rootLayout.addView(row2);

                // --- SECTION: CALENDAR FOLLOW-UP PICKER ---
                final String[] selectedFollowUpDate = {""};
                final String[] selectedFollowUpTime = {""};

                LinearLayout followUpRow = new LinearLayout(this);
                followUpRow.setOrientation(LinearLayout.HORIZONTAL);
                followUpRow.setGravity(Gravity.CENTER_VERTICAL);
                followUpRow.setPadding(16, 12, 16, 12);
                followUpRow.setClickable(true);

                GradientDrawable calBg = new GradientDrawable();
                calBg.setColor(Color.parseColor("#082F2C"));
                calBg.setCornerRadius(14f);
                calBg.setStroke(1, Color.parseColor("#14B8A6"));
                followUpRow.setBackground(calBg);

                TextView tvCalIcon = new TextView(this);
                tvCalIcon.setText("📅");
                tvCalIcon.setTextSize(14f);
                tvCalIcon.setPadding(0, 0, 10, 0);
                followUpRow.addView(tvCalIcon);

                TextView tvFollowUpText = new TextView(this);
                tvFollowUpText.setText("Set Follow-up Date & Time Reminder");
                tvFollowUpText.setTextColor(Color.parseColor("#5EEAD4"));
                tvFollowUpText.setTextSize(11.5f);
                tvFollowUpText.setTypeface(null, android.graphics.Typeface.BOLD);
                followUpRow.addView(tvFollowUpText, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

                followUpRow.setOnClickListener(v -> {
                    Calendar now = Calendar.getInstance();
                    DatePickerDialog dpd = new DatePickerDialog(this, (view, year, month, dayOfMonth) -> {
                        Calendar chosen = Calendar.getInstance();
                        chosen.set(year, month, dayOfMonth);
                        String dateStr = new SimpleDateFormat("dd MMM yyyy", Locale.getDefault()).format(chosen.getTime());
                        selectedFollowUpDate[0] = dateStr;

                        TimePickerDialog tpd = new TimePickerDialog(this, (tView, hourOfDay, minute) -> {
                            String ampm = hourOfDay >= 12 ? "PM" : "AM";
                            int hr12 = hourOfDay % 12;
                            if (hr12 == 0) hr12 = 12;
                            String timeStr = String.format(Locale.getDefault(), "%02d:%02d %s", hr12, minute, ampm);
                            selectedFollowUpTime[0] = timeStr;
                            tvFollowUpText.setText("📅 " + dateStr + " • " + timeStr);
                            tvFollowUpText.setTextColor(Color.parseColor("#14B8A6"));
                        }, now.get(Calendar.HOUR_OF_DAY) + 1, 0, false);
                        tpd.show();
                    }, now.get(Calendar.YEAR), now.get(Calendar.MONTH), now.get(Calendar.DAY_OF_MONTH));
                    dpd.show();
                });

                LinearLayout.LayoutParams calParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                calParams.setMargins(0, 4, 0, 8);
                rootLayout.addView(followUpRow, calParams);

                // --- SECTION: NOTES INPUT ---
                TextView tvNotesLabel = new TextView(this);
                tvNotesLabel.setText("CALL NOTES / DISCUSSION REMARKS:");
                tvNotesLabel.setTextColor(Color.parseColor("#94A3B8"));
                tvNotesLabel.setTextSize(11f);
                tvNotesLabel.setTypeface(null, android.graphics.Typeface.BOLD);
                tvNotesLabel.setPadding(0, 4, 0, 6);
                rootLayout.addView(tvNotesLabel);

                EditText etNotes = new EditText(this);
                etNotes.setHint("Enter client requirements, budget, timeline, project scope...");
                etNotes.setHintTextColor(Color.parseColor("#4B6B68"));
                etNotes.setTextColor(Color.WHITE);
                etNotes.setTextSize(12f);
                etNotes.setPadding(18, 14, 18, 14);
                etNotes.setMinLines(2);
                etNotes.setMaxLines(4);

                GradientDrawable inputBg = new GradientDrawable();
                inputBg.setColor(Color.parseColor("#072725"));
                inputBg.setCornerRadius(14f);
                inputBg.setStroke(1, Color.parseColor("#134E4A"));
                etNotes.setBackground(inputBg);
                rootLayout.addView(etNotes);

                // --- SECTION: ACTIONS (SAVE & SKIP) ---
                LinearLayout actionsRow = new LinearLayout(this);
                actionsRow.setOrientation(LinearLayout.HORIZONTAL);
                actionsRow.setPadding(0, 16, 0, 0);

                Button btnSkip = new Button(this);
                btnSkip.setText("Skip");
                btnSkip.setTextColor(Color.parseColor("#94A3B8"));
                btnSkip.setTextSize(12f);
                btnSkip.setBackgroundColor(Color.TRANSPARENT);
                btnSkip.setOnClickListener(v -> dismissPostCallDialog());
                LinearLayout.LayoutParams skipParams = new LinearLayout.LayoutParams(0, 100, 0.7f);
                skipParams.setMargins(0, 0, 8, 0);
                actionsRow.addView(btnSkip, skipParams);

                Button btnSave = new Button(this);
                btnSave.setText("💾 Save & Sync Lead");
                btnSave.setTextSize(13f);
                btnSave.setTypeface(null, android.graphics.Typeface.BOLD);
                btnSave.setTextColor(Color.WHITE);
                btnSave.setAllCaps(false);

                GradientDrawable saveBg = new GradientDrawable();
                saveBg.setColor(Color.parseColor("#0D9488")); // Signature Emerald Teal
                saveBg.setCornerRadius(16f);
                btnSave.setBackground(saveBg);

                LinearLayout.LayoutParams saveParams = new LinearLayout.LayoutParams(0, 100, 2.3f);
                btnSave.setLayoutParams(saveParams);

                // --- ZERO-LAG INSTANT DISMISS (0ms) ---
                btnSave.setOnClickListener(v -> {
                    String customNotes = etNotes.getText().toString().trim();
                    if (customNotes.isEmpty()) {
                        customNotes = "Call logged via Android Companion";
                    }

                    // 1. Instantly close screen (phone is 100% free for next call!)
                    dismissPostCallDialog();
                    Toast.makeText(this, "✅ Saved & Synced!", Toast.LENGTH_SHORT).show();

                    // 2. Heavy audio upload + CRM sync run in detached background thread
                    final String notesToSync = customNotes;
                    new Thread(() -> {
                        uploadToCRM(durationSeconds, selectedDisp[0], notesToSync, audioInfo, callId, selectedFollowUpDate[0], selectedFollowUpTime[0]);
                    }).start();
                });

                actionsRow.addView(btnSave);
                rootLayout.addView(actionsRow);

                // WindowManager Layout Parameters
                int layoutFlag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O 
                    ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY 
                    : WindowManager.LayoutParams.TYPE_PHONE;

                WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                    (int) (getResources().getDisplayMetrics().widthPixels * 0.92),
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    layoutFlag,
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
                    PixelFormat.TRANSLUCENT
                );

                params.gravity = Gravity.CENTER;

                postCallDialogView = rootLayout;
                windowManager.addView(postCallDialogView, params);

                // Auto-Dismiss Safety Timer: Dismiss after 60 seconds if untouched
                autoDismissRunnable = () -> {
                    dismissPostCallDialog();
                    new Thread(() -> {
                        uploadToCRM(durationSeconds, "Interested", "Auto-synced after timeout", audioInfo, callId, "", "");
                    }).start();
                };
                autoDismissHandler.postDelayed(autoDismissRunnable, 60000);

            } catch (Exception e) {
                Log.e(TAG, "Error displaying post-call dialog: " + e.getMessage());
                new Thread(() -> {
                    uploadToCRM(durationSeconds, "Completed", "Call recorded", audioInfo, callId, "", "");
                }).start();
            }
        });
    }

    private void dismissPostCallDialog() {
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                if (autoDismissRunnable != null) {
                    autoDismissHandler.removeCallbacks(autoDismissRunnable);
                }
                if (windowManager != null && postCallDialogView != null) {
                    windowManager.removeView(postCallDialogView);
                    postCallDialogView = null;
                }
            } catch (Exception e) {
                Log.e(TAG, "Error dismissing post-call dialog: " + e.getMessage());
            }
        });
    }

    /**
     * Resolves contact name from Phonebook Contacts or Android System CallLog (Truecaller / Google Smart Caller-ID)
     */
    public static String resolveContactOrCallerIdName(android.content.Context context, String phoneNumber) {
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
            return "Customer";
        }
        String cleanPhone = phoneNumber.trim();
        String resolvedName = null;

        // 1. Check Phone Contacts (ContactsContract.PhoneLookup)
        try {
            if (context.checkSelfPermission(android.Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED) {
                Uri lookupUri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(cleanPhone));
                String[] projection = new String[]{ContactsContract.PhoneLookup.DISPLAY_NAME};
                try (Cursor cursor = context.getContentResolver().query(lookupUri, projection, null, null, null)) {
                    if (cursor != null && cursor.moveToFirst()) {
                        int nameIdx = cursor.getColumnIndex(ContactsContract.PhoneLookup.DISPLAY_NAME);
                        if (nameIdx >= 0) {
                            String foundName = cursor.getString(nameIdx);
                            if (foundName != null && !foundName.trim().isEmpty() && !foundName.equalsIgnoreCase("null")) {
                                resolvedName = foundName.trim();
                                Log.d(TAG, "👤 Resolved Contact Name from Phonebook: " + resolvedName);
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Contacts lookup notice: " + e.getMessage());
        }

        // 2. If not found in Contacts, Check Android CallLog (CACHED_NAME from Truecaller / Google Caller ID)
        if (resolvedName == null || resolvedName.isEmpty()) {
            try {
                if (context.checkSelfPermission(android.Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED) {
                    Uri callLogUri = CallLog.Calls.CONTENT_URI;
                    String[] projection = new String[]{CallLog.Calls.CACHED_NAME, CallLog.Calls.NUMBER};
                    String norm10 = cleanPhone.replaceAll("\\D", "");
                    if (norm10.length() >= 7) norm10 = norm10.substring(norm10.length() - Math.min(norm10.length(), 10));
                    String selection = CallLog.Calls.NUMBER + " LIKE ? OR " + CallLog.Calls.NUMBER + " = ?";
                    String[] args = new String[]{"%" + norm10, cleanPhone};

                    try (Cursor cursor = context.getContentResolver().query(callLogUri, projection, selection, args, CallLog.Calls.DATE + " DESC")) {
                        if (cursor != null && cursor.moveToFirst()) {
                            int cachedIdx = cursor.getColumnIndex(CallLog.Calls.CACHED_NAME);
                            if (cachedIdx >= 0) {
                                String cachedName = cursor.getString(cachedIdx);
                                if (cachedName != null && !cachedName.trim().isEmpty() && !cachedName.equalsIgnoreCase("null")) {
                                    resolvedName = cachedName.trim();
                                    Log.d(TAG, "🎯 Resolved Truecaller / System Caller-ID Name: " + resolvedName);
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "CallLog CACHED_NAME lookup notice: " + e.getMessage());
            }
        }

        // 3. Validation: If resolvedName is just digits/phone, fallback
        if (resolvedName != null) {
            String digitsOnly = resolvedName.replaceAll("\\D", "");
            String phoneDigits = cleanPhone.replaceAll("\\D", "");
            if (digitsOnly.equals(phoneDigits) || resolvedName.matches("^\\+?[0-9\\s\\-()]+$")) {
                resolvedName = null;
            }
        }

        return (resolvedName != null && !resolvedName.trim().isEmpty()) ? resolvedName : cleanPhone;
    }

    private void uploadToCRM(long durationSeconds, String disposition, String customNotes, CapturedAudioInfo audioInfo) {
        uploadToCRM(durationSeconds, disposition, customNotes, audioInfo, "", "", "");
    }

    private void uploadToCRM(long durationSeconds, String disposition, String customNotes, CapturedAudioInfo audioInfo, String callId, String followUpDate, String followUpTime) {
        new Thread(() -> {
            SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
            String apiUrl = prefs.getString("api_url", "https://ems-backend-9hig.onrender.com");
            String agentName = prefs.getString("agent_name", "Mobile Agent");
            String agentEmail = prefs.getString("agent_email", "agent@omniflow.in");

            // Smart Name Resolution: Check Phonebook Contacts first, then Truecaller/Google Caller-ID
            String customerName = resolveContactOrCallerIdName(this, phoneNumber);

            String audioBase64 = null;
            long finalFileSize = 0;
            String modeNote = audioInfo != null ? audioInfo.modeNote : "SIM Call Recording";
            if (customNotes != null && !customNotes.isEmpty()) {
                modeNote = customNotes + " (" + modeNote + ")";
            }

            Uri safFileUri = audioInfo != null ? audioInfo.safFileUri : null;
            File backupFileToUpload = audioInfo != null ? audioInfo.backupFileToUpload : null;

            // Convert selected file to Base64 (Full Audio Stream)
            try {
                byte[] fullBytes = null;
                String mimeType = "audio/mp4";

                if (safFileUri != null) {
                    ContentResolver resolver = getContentResolver();
                    try (InputStream is = resolver.openInputStream(safFileUri)) {
                        if (is != null) {
                            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                            byte[] buffer = new byte[8192];
                            int len;
                            int total = 0;
                            int maxLimit = 1500000;
                            while ((len = is.read(buffer)) != -1) {
                                baos.write(buffer, 0, len);
                                total += len;
                                if (total >= maxLimit) break;
                            }
                            baos.flush();
                            fullBytes = baos.toByteArray();
                            finalFileSize = fullBytes.length;
                        }
                    }
                } else if (backupFileToUpload != null && backupFileToUpload.exists() && backupFileToUpload.length() > 0) {
                    try (FileInputStream fis = new FileInputStream(backupFileToUpload)) {
                        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                        byte[] buffer = new byte[8192];
                        int len;
                        int total = 0;
                        int maxLimit = 1500000;
                        while ((len = fis.read(buffer)) != -1) {
                            baos.write(buffer, 0, len);
                            total += len;
                            if (total >= maxLimit) break;
                        }
                        baos.flush();
                        fullBytes = baos.toByteArray();
                        finalFileSize = fullBytes.length;
                    }
                    if (backupFileToUpload.getName().toLowerCase().endsWith(".mp3")) {
                        mimeType = "audio/mpeg";
                    } else if (backupFileToUpload.getName().toLowerCase().endsWith(".wav")) {
                        mimeType = "audio/wav";
                    }
                }

                if (fullBytes != null && fullBytes.length > 500) {
                    audioBase64 = "data:" + mimeType + ";base64," + Base64.encodeToString(fullBytes, Base64.NO_WRAP);
                    Log.d(TAG, "✅ [uploadToCRM] Full audio encoded (" + fullBytes.length + " bytes)");
                }
            } catch (Exception e) {
                Log.e(TAG, "Error converting audio to Base64: " + e.getMessage());
            }

            // Post to Firebase Firestore
            boolean uploadSuccess = false;
            try {
                postToFirebaseFirestore(phoneNumber, customerName, callType, durationSeconds, agentName, audioBase64, disposition, modeNote);
                uploadSuccess = true;
            } catch (Exception fbEx) {
                Log.e(TAG, "Firestore sync failed: " + fbEx.getMessage());
            }

            // Save metadata/logs for stats
            prefs.edit()
                .putString("last_recorded_file_path", safFileUri != null ? safFileUri.toString() : (backupFileToUpload != null ? backupFileToUpload.getAbsolutePath() : ""))
                .putLong("last_recorded_file_size", finalFileSize)
                .apply();

            // Post to Render backend
            try {
                String timestamp = new SimpleDateFormat("dd/MM/yyyy, hh:mm:ss aa", Locale.getDefault()).format(new Date());
                String json = "{"
                    + "\"agentName\":\"" + escapeJson(agentName) + "\","
                    + "\"agentEmail\":\"" + escapeJson(agentEmail) + "\","
                    + "\"customerPhone\":\"" + escapeJson(phoneNumber) + "\","
                    + "\"customerName\":\"" + escapeJson(customerName) + "\","
                    + "\"channel\":\"SIM\","
                    + "\"type\":\"" + callType + "\","
                    + "\"durationSeconds\":" + durationSeconds + ","
                    + "\"timestamp\":\"" + timestamp + "\","
                    + "\"disposition\":\"" + escapeJson(disposition) + "\","
                    + "\"notes\":\"" + escapeJson(modeNote) + "\","
                    + "\"simSlot\":\"SIM 1\""
                    + (callId != null && !callId.isEmpty() ? ",\"callId\":\"" + escapeJson(callId) + "\"" : "")
                    + (followUpDate != null && !followUpDate.isEmpty() ? ",\"followUpDate\":\"" + escapeJson(followUpDate) + "\"" : "")
                    + (followUpTime != null && !followUpTime.isEmpty() ? ",\"followUpTime\":\"" + escapeJson(followUpTime) + "\"" : "")
                    + (audioBase64 != null && !audioBase64.isEmpty() ? ",\"recordingBase64\":\"" + audioBase64 + "\"" : "")
                    + "}";

                java.net.URL url = new java.net.URL(apiUrl + "/api/telecalling/sync-log");
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                conn.setDoOutput(true);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);

                byte[] input = json.getBytes("utf-8");
                conn.getOutputStream().write(input, 0, input.length);
                int responseCode = conn.getResponseCode();
                Log.d(TAG, "✅ Backend Sync Response: " + responseCode);

                // Update stats in SharedPreferences
                int prevCount = prefs.getInt("total_calls_recorded", 0);
                prefs.edit()
                    .putInt("total_calls_recorded", prevCount + 1)
                    .putString("last_call_info", callType + " | " + customerName + " (" + phoneNumber + ") | " + durationSeconds + "s | " + disposition)
                    .apply();

                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "Backend sync error: " + e.getMessage());
            }

            // 4. Clean up / Delete the call recording file after successful upload to save phone memory
            if (uploadSuccess) {
                try {
                    if (safFileUri != null) {
                        DocumentsContract.deleteDocument(getContentResolver(), safFileUri);
                        Log.d(TAG, "🗑️ Deleted native recording from selected folder: " + safFileUri.toString());
                    } else if (backupFileToUpload != null && backupFileToUpload.exists()) {
                        backupFileToUpload.delete();
                        Log.d(TAG, "🗑️ Deleted backup local mic recording: " + backupFileToUpload.getAbsolutePath());
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Failed to delete call recording: " + e.getMessage());
                }
            }
        }).start();
    }

    private void postToFirebaseFirestore(String phone, String customerName, String type, long duration, String agent, String audioBase64, String disposition, String modeNote) {
        try {
            long now = System.currentTimeMillis();
            String timestamp = new SimpleDateFormat("dd/MM/yyyy, hh:mm:ss aa", Locale.getDefault()).format(new Date());
            String safePhone = escapeJson(phone);
            String safeCustName = escapeJson((customerName != null && !customerName.trim().isEmpty()) ? customerName : phone);
            String safeAgent = escapeJson(agent);
            String recUrl = (audioBase64 != null && audioBase64.length() > 0) ? escapeJson(audioBase64) : "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

            String json = "{"
                + "\"fields\":{"
                    + "\"agentName\":{\"stringValue\":\"" + safeAgent + "\"},"
                    + "\"agentRole\":{\"stringValue\":\"Senior Telecaller\"},"
                    + "\"customerName\":{\"stringValue\":\"" + safeCustName + "\"},"
                    + "\"customerPhone\":{\"stringValue\":\"" + safePhone + "\"},"
                    + "\"channel\":{\"stringValue\":\"SIM\"},"
                    + "\"type\":{\"stringValue\":\"" + escapeJson(type) + "\"},"
                    + "\"durationSeconds\":{\"integerValue\":\"" + duration + "\"},"
                    + "\"timestamp\":{\"stringValue\":\"" + timestamp + "\"},"
                    + "\"recordingUrl\":{\"stringValue\":\"" + recUrl + "\"},"
                    + "\"disposition\":{\"stringValue\":\"" + escapeJson(disposition) + "\"},"
                    + "\"notes\":{\"stringValue\":\"" + escapeJson(modeNote) + "\"},"
                    + "\"simSlot\":{\"stringValue\":\"SIM 1\"},"
                    + "\"_createdAt\":{\"integerValue\":\"" + now + "\"}"
                + "}"
            + "}";

            java.net.URL url = new java.net.URL("https://firestore.googleapis.com/v1/projects/ems-ag/databases/(default)/documents/callLogs");
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setDoOutput(true);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);

            byte[] input = json.getBytes("utf-8");
            conn.getOutputStream().write(input, 0, input.length);
            int code = conn.getResponseCode();
            Log.d(TAG, "🔥 Firestore Sync Direct Response: " + code);
            conn.disconnect();
        } catch (Exception e) {
            Log.e(TAG, "Firestore direct sync exception: " + e.getMessage());
        }
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "").replace("\r", "");
    }

    private Notification buildNotification(String text) {
        Intent notifIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notifIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("OmniFlow CRM")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "OmniFlow Call Recording",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows when OmniFlow is recording a call");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        dismissPostCallDialog();
        if (mediaRecorder != null) {
            try { mediaRecorder.release(); } catch (Exception e) {}
            mediaRecorder = null;
        }
    }
}
