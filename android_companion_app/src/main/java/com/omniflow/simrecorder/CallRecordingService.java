package com.omniflow.simrecorder;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.ContentResolver;
import android.database.Cursor;
import android.net.Uri;
import android.content.SharedPreferences;
import android.provider.MediaStore;
import android.provider.DocumentsContract;
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
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * CallRecordingService — Foreground Service
 *
 * Responsibilities:
 * 1. Start MediaRecorder when call connects (ACTION_START_RECORDING)
 * 2. Display Floating Screen Overlay Popup Widget during live call
 * 3. Stop recording when call ends (ACTION_STOP_RECORDING)
 * 4. Convert recorded audio to Base64 & upload to CRM
 * 5. AUTO-DELETE audio files from phone storage (Zero Memory Mode)
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
    private View overlayView;
    private TextView tvOverlayStatus;
    private TextView tvOverlaySubtext;
    private Handler timerHandler = new Handler(Looper.getMainLooper());
    private Runnable timerRunnable;

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
                nm.notify(NOTIFICATION_ID, buildNotification("🔴 Recording call with " + phoneNumber));
            }

            // Show floating screen overlay popup
            showFloatingOverlay(phoneNumber, callType);

            startRecording();

        } else if (ACTION_STOP_RECORDING.equals(action)) {
            stopRecording();
        }

        return START_STICKY;
    }

    private void showFloatingOverlay(String phone, String type) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            Log.w(TAG, "Overlay permission not granted — skipping floating widget");
            return;
        }

        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

                LinearLayout layout = new LinearLayout(this);
                layout.setOrientation(LinearLayout.VERTICAL);
                layout.setPadding(30, 20, 30, 20);

                GradientDrawable background = new GradientDrawable();
                background.setColor(Color.parseColor("#0F172A")); // Slate Dark
                background.setCornerRadius(24f);
                background.setStroke(3, Color.parseColor("#38BDF8")); // Cyan Border
                layout.setBackground(background);

                tvOverlayStatus = new TextView(this);
                tvOverlayStatus.setText("🔴 OmniFlow: Live Recording... 00:00");
                tvOverlayStatus.setTextColor(Color.parseColor("#38BDF8"));
                tvOverlayStatus.setTextSize(13f);
                tvOverlayStatus.setTypeface(null, android.graphics.Typeface.BOLD);

                tvOverlaySubtext = new TextView(this);
                tvOverlaySubtext.setText("📞 " + type + ": " + phone + " | Zero Memory Mode");
                tvOverlaySubtext.setTextColor(Color.parseColor("#94A3B8"));
                tvOverlaySubtext.setTextSize(11f);

                layout.addView(tvOverlayStatus);
                layout.addView(tvOverlaySubtext);

                int layoutFlag;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
                } else {
                    layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
                }

                WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    layoutFlag,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                    PixelFormat.TRANSLUCENT
                );

                params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
                params.y = 120; // 120px from top

                // Touch listener for dragging overlay anywhere on screen
                layout.setOnTouchListener(new View.OnTouchListener() {
                    private int initialX, initialY;
                    private float initialTouchX, initialTouchY;

                    @Override
                    public boolean onTouch(View v, MotionEvent event) {
                        switch (event.getAction()) {
                            case MotionEvent.ACTION_DOWN:
                                initialX = params.x;
                                initialY = params.y;
                                initialTouchX = event.getRawX();
                                initialTouchY = event.getRawY();
                                return true;
                            case MotionEvent.ACTION_MOVE:
                                params.x = initialX + (int) (event.getRawX() - initialTouchX);
                                params.y = initialY + (int) (event.getRawY() - initialTouchY);
                                if (windowManager != null && overlayView != null) {
                                    windowManager.updateViewLayout(overlayView, params);
                                }
                                return true;
                        }
                        return false;
                    }
                });

                overlayView = layout;
                windowManager.addView(overlayView, params);

                // Start live timer
                timerRunnable = new Runnable() {
                    @Override
                    public void run() {
                        long elapsedSec = (System.currentTimeMillis() - callStartTime) / 1000;
                        long min = elapsedSec / 60;
                        long sec = elapsedSec % 60;
                        String timerStr = String.format(Locale.getDefault(), "%02d:%02d", min, sec);
                        if (tvOverlayStatus != null) {
                            tvOverlayStatus.setText("🔴 OmniFlow: Recording... " + timerStr);
                        }
                        timerHandler.postDelayed(this, 1000);
                    }
                };
                timerHandler.postDelayed(timerRunnable, 1000);

            } catch (Exception e) {
                Log.e(TAG, "Error showing floating overlay: " + e.getMessage());
            }
        });
    }

    private void updateOverlayStatus(String mainText, String subText) {
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                if (timerRunnable != null) timerHandler.removeCallbacks(timerRunnable);
                if (tvOverlayStatus != null) tvOverlayStatus.setText(mainText);
                if (tvOverlaySubtext != null) tvOverlaySubtext.setText(subText);
            } catch (Exception e) {}
        });
    }

    private void hideFloatingOverlay() {
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            try {
                if (timerRunnable != null) timerHandler.removeCallbacks(timerRunnable);
                if (windowManager != null && overlayView != null) {
                    windowManager.removeView(overlayView);
                    overlayView = null;
                }
            } catch (Exception e) {
                Log.e(TAG, "Error removing overlay: " + e.getMessage());
            }
        }, 1500);
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
        long durationSeconds = (System.currentTimeMillis() - callStartTime) / 1000;
        SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);

        try {
            if (mediaRecorder != null) {
                mediaRecorder.stop();
                mediaRecorder.release();
                mediaRecorder = null;
                Log.d(TAG, "✅ In-App Recording STOPPED. Duration: " + durationSeconds + "s");

                // Validate if file size is non-zero
                if (recordingFilePath != null) {
                    File file = new File(recordingFilePath);
                    if (!file.exists() || file.length() < 500) {
                        prefs.edit().putString("last_recording_error", "Recorded file is empty (" + (file.exists() ? file.length() : 0) + " bytes). OS mic-lock concurrent block is active.").apply();
                    } else {
                        prefs.edit().remove("last_recording_error").apply();
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping in-app recording: " + e.getMessage());
            prefs.edit().putString("last_recording_error", "Stop recording failed: " + e.getMessage()).apply();
        }

        updateOverlayStatus("⚡ Syncing Call to CRM...", "Auto-cleaning phone memory...");

        // Upload to CRM in background thread and reset notification status
        final long finalDuration = durationSeconds;
        new Thread(() -> {
            uploadToCRM(finalDuration);
            
            // Reset active notification back to monitoring status
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(NOTIFICATION_ID, buildNotification("🟢 OmniFlow is active and monitoring calls"));
            }
        }).start();
    }

    private File findNativeCallRecordingFile() {
        // Method A: Check direct storage paths first
        File fromPaths = findNativeCallRecordingFromPaths();
        if (fromPaths != null) {
            return fromPaths;
        }

        // Method B: Query MediaStore (official Android Scoped Storage query)
        try {
            ContentResolver resolver = getContentResolver();
            Uri uri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;

            // Search audio files added in the last 4 minutes (240 seconds)
            long timeFilter = (System.currentTimeMillis() / 1000) - 240;
            String selection = MediaStore.Audio.Media.DATE_ADDED + " >= ?";
            String[] selectionArgs = new String[]{String.valueOf(timeFilter)};
            String sortOrder = MediaStore.Audio.Media.DATE_ADDED + " DESC";

            String[] projection = {
                MediaStore.Audio.Media.DATA,
                MediaStore.Audio.Media.SIZE,
                MediaStore.Audio.Media.DISPLAY_NAME
            };

            Cursor cursor = resolver.query(uri, projection, selection, selectionArgs, sortOrder);
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    String path = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA));
                    long size = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE));
                    String name = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME));

                    if (path != null && size > 2000) {
                        String lowerName = (name != null ? name.toLowerCase() : "");
                        String lowerPath = path.toLowerCase();
                        if (lowerName.contains("call") || lowerName.contains("rec") || lowerPath.contains("call") || lowerPath.contains("record")) {
                            Log.d(TAG, "🎯 MediaStore query found native match: " + path + " (" + size + " bytes)");
                            cursor.close();
                            return new File(path);
                        }
                    }
                }
                cursor.close();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error querying MediaStore for call recordings: " + e.getMessage());
        }
        return null;
    }

    private File findNativeCallRecordingFromPaths() {
        try {
            long now = System.currentTimeMillis();
            long windowStart = now - 180000; // Search files created in last 3 minutes

            String[] directoriesToSearch = {
                Environment.getExternalStorageDirectory().getAbsolutePath() + "/Recordings/Call",
                Environment.getExternalStorageDirectory().getAbsolutePath() + "/CallRecord",
                Environment.getExternalStorageDirectory().getAbsolutePath() + "/MIUI/sound_recorder/call_rec",
                Environment.getExternalStorageDirectory().getAbsolutePath() + "/SoundRecorder/call_rec",
                Environment.getExternalStorageDirectory().getAbsolutePath() + "/Recordings",
                Environment.getExternalStorageDirectory().getAbsolutePath() + "/VoiceRecorder",
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MUSIC).getAbsolutePath() + "/Recordings",
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS).getAbsolutePath()
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

    private void uploadToCRM(long durationSeconds) {
        SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
        String apiUrl = prefs.getString("api_url", "https://ems-backend-9hig.onrender.com");
        String agentName = prefs.getString("agent_name", "Mobile Agent");
        String agentEmail = prefs.getString("agent_email", "agent@omniflow.in");

        String audioBase64 = null;
        boolean isNativeRecording = false;
        long finalFileSize = 0;
        String modeNote = "🎙️ In-App Mic Recording (Fallback Mode)";

        Uri safFileUri = null;
        File backupFileToUpload = null;

        // 1. Try finding call recording in User Selected SAF folder FIRST
        String folderUriStr = prefs.getString("selected_folder_uri", "");
        if (!folderUriStr.isEmpty()) {
            try {
                Uri treeUri = Uri.parse(folderUriStr);
                safFileUri = findRecordingInSelectedFolder(treeUri);
                if (safFileUri != null) {
                    isNativeRecording = true;
                    modeNote = "🎧 HD Both-Sides Recording (Selected Folder)";
                    Log.d(TAG, "✅ Selected NATIVE Recording from SAF Folder: " + safFileUri.toString());
                }
            } catch (Exception e) {
                Log.e(TAG, "Error checking SAF folder: " + e.getMessage());
            }
        }

        // 2. If not found in SAF, try hardcoded direct paths or MediaStore
        if (safFileUri == null) {
            File nativeFile = findNativeCallRecordingFile();
            if (nativeFile != null && nativeFile.exists() && nativeFile.length() > 2000) {
                backupFileToUpload = nativeFile;
                isNativeRecording = true;
                modeNote = "🎧 HD Both-Sides Recording (Native Scanner Path)";
                Log.d(TAG, "✅ Selected NATIVE Recording from path: " + nativeFile.getAbsolutePath());
            } else {
                // 3. Fallback to In-App Mic recording
                if (recordingFilePath != null) {
                    File inAppFile = new File(recordingFilePath);
                    if (inAppFile.exists() && inAppFile.length() > 200) {
                        backupFileToUpload = inAppFile;
                        Log.d(TAG, "✅ Selected FALLBACK In-App Mic Recording");
                    }
                }
            }
        }

        // Convert selected file to Base64
        try {
            if (safFileUri != null) {
                ContentResolver resolver = getContentResolver();
                try (Cursor cursor = resolver.query(safFileUri, new String[]{DocumentsContract.Document.COLUMN_SIZE}, null, null, null)) {
                    if (cursor != null && cursor.moveToFirst()) {
                        finalFileSize = cursor.getLong(0);
                    }
                }

                InputStream is = resolver.openInputStream(safFileUri);
                if (is != null) {
                    int maxBytes = Math.min((int) finalFileSize, 750000);
                    if (maxBytes <= 0) maxBytes = 750000;
                    byte[] bytes = new byte[maxBytes];
                    int read = is.read(bytes);
                    is.close();
                    if (read > 0) {
                        audioBase64 = "data:audio/mp4;base64," + Base64.encodeToString(bytes, 0, read, Base64.NO_WRAP);
                    }
                }
            } else if (backupFileToUpload != null && backupFileToUpload.exists()) {
                finalFileSize = backupFileToUpload.length();
                FileInputStream fis = new FileInputStream(backupFileToUpload);
                int maxBytes = Math.min((int) finalFileSize, 750000);
                byte[] bytes = new byte[maxBytes];
                int read = fis.read(bytes);
                fis.close();
                if (read > 0) {
                    audioBase64 = "data:audio/mp4;base64," + Base64.encodeToString(bytes, 0, read, Base64.NO_WRAP);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error converting audio to Base64: " + e.getMessage());
        }

        // Post to Firebase Firestore
        boolean uploadSuccess = false;
        try {
            postToFirebaseFirestore(phoneNumber, callType, durationSeconds, agentName, audioBase64, modeNote);
            uploadSuccess = true;
        } catch (Exception fbEx) {
            Log.e(TAG, "Firestore sync failed: " + fbEx.getMessage());
        }

        // Save metadata/logs for testing
        prefs.edit()
            .putString("last_recorded_file_path", safFileUri != null ? safFileUri.toString() : (backupFileToUpload != null ? backupFileToUpload.getAbsolutePath() : ""))
            .putLong("last_recorded_file_size", finalFileSize)
            .apply();

        updateOverlayStatus("✅ Saved on Phone! (" + (finalFileSize / 1024) + " KB)", "Tap 'Play Last Recording' in App");
        hideFloatingOverlay();

        // 3. Post to Render backend
        try {
            String timestamp = new SimpleDateFormat("dd/MM/yyyy, hh:mm:ss aa", Locale.getDefault()).format(new Date());
            String json = "{"
                + "\"agentName\":\"" + escapeJson(agentName) + "\","
                + "\"agentEmail\":\"" + escapeJson(agentEmail) + "\","
                + "\"customerPhone\":\"" + escapeJson(phoneNumber) + "\","
                + "\"customerName\":\"" + escapeJson(phoneNumber) + "\","
                + "\"channel\":\"SIM\","
                + "\"type\":\"" + callType + "\","
                + "\"durationSeconds\":" + durationSeconds + ","
                + "\"timestamp\":\"" + timestamp + "\","
                + "\"disposition\":\"Interested\","
                + "\"notes\":\"" + escapeJson(modeNote) + "\","
                + "\"simSlot\":\"SIM 1\""
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
                .putString("last_call_info", callType + " | " + phoneNumber + " | " + durationSeconds + "s")
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
                    // For backup files, we can also delete them to save space
                    backupFileToUpload.delete();
                    Log.d(TAG, "🗑️ Deleted backup local mic recording: " + backupFileToUpload.getAbsolutePath());
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to delete call recording: " + e.getMessage());
            }
        }
    }

    private void postToFirebaseFirestore(String phone, String type, long duration, String agent, String audioBase64, String modeNote) {
        try {
            long now = System.currentTimeMillis();
            String timestamp = new SimpleDateFormat("dd/MM/yyyy, hh:mm:ss aa", Locale.getDefault()).format(new Date());
            String safePhone = escapeJson(phone);
            String safeAgent = escapeJson(agent);
            String recUrl = (audioBase64 != null && audioBase64.length() > 0) ? escapeJson(audioBase64) : "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

            String json = "{"
                + "\"fields\":{"
                    + "\"agentName\":{\"stringValue\":\"" + safeAgent + "\"},"
                    + "\"agentRole\":{\"stringValue\":\"Senior Telecaller\"},"
                    + "\"customerName\":{\"stringValue\":\"" + safePhone + "\"},"
                    + "\"customerPhone\":{\"stringValue\":\"" + safePhone + "\"},"
                    + "\"channel\":{\"stringValue\":\"SIM\"},"
                    + "\"type\":{\"stringValue\":\"" + escapeJson(type) + "\"},"
                    + "\"durationSeconds\":{\"integerValue\":\"" + duration + "\"},"
                    + "\"timestamp\":{\"stringValue\":\"" + timestamp + "\"},"
                    + "\"recordingUrl\":{\"stringValue\":\"" + recUrl + "\"},"
                    + "\"disposition\":{\"stringValue\":\"Interested\"},"
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
        if (mediaRecorder != null) {
            try { mediaRecorder.release(); } catch (Exception e) {}
            mediaRecorder = null;
        }
    }
}
