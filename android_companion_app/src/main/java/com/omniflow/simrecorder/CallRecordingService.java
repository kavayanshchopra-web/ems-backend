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
import android.content.Context;
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
import android.telephony.SubscriptionManager;
import android.telephony.SubscriptionInfo;
import androidx.core.content.ContextCompat;
import android.Manifest;
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
import android.graphics.Typeface;
import android.text.TextUtils;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
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

    public static final String ACTION_SHOW_IN_CALL_CARD = "ACTION_SHOW_IN_CALL_CARD";
    public static final String ACTION_START_RECORDING = "ACTION_START_RECORDING";
    public static final String ACTION_STOP_RECORDING = "ACTION_STOP_RECORDING";

    private MediaRecorder mediaRecorder;
    private String recordingFilePath;
    private String phoneNumber;
    private String callType;
    private long callStartTime;
    private String currentCallId = null;
    private String currentSimSlot = "SIM 1";

    private WindowManager windowManager;
    private View inCallCardView;
    private View postCallDialogView;
    private boolean inCallCardManuallyDismissed = false;
    private Handler inCallTimerHandler = new Handler(Looper.getMainLooper());
    private Runnable inCallTimerRunnable;
    private TextView tvInCallTimer;
    private Handler autoDismissHandler = new Handler(Looper.getMainLooper());
    private Runnable autoDismissRunnable;

    // Wotel-Style Two-Tone Floating Card UI References
    private TextView tvInCallBadge;
    private TextView tvInCallName;
    private TextView tvInCallPhone;
    private TextView tvInCallAvatar;
    private TextView btnInCallRedial;
    private TextView btnInCallLog;
    private String currentInCallPhone = "";

    public static class ResolvedCallDetails {
        public String phoneNumber = "";
        public String customerName = "";
        public String callType = "OUTGOING";
        public long duration = 0;
        public String simSlot = "SIM 1";
        public boolean isMissedOrRejected = false;
    }

    public static String resolveSimSlotFromCursor(Context context, Cursor cursor) {
        if (cursor == null) return "SIM 1";

        // 1. Check Samsung / OEM specific columns
        String[] possibleCols = {"sim_id", "simnum", "slot_id", "sim_slot", "sub_id", "subscription_id", "sim_index", "sim_code", "phone"};
        for (String col : possibleCols) {
            int idx = cursor.getColumnIndex(col);
            if (idx != -1 && !cursor.isNull(idx)) {
                try {
                    String strVal = cursor.getString(idx);
                    if (strVal != null && !strVal.trim().isEmpty()) {
                        int intVal = -1;
                        try { intVal = Integer.parseInt(strVal.trim()); } catch (Exception ignored) {}
                        
                        // sim_id / slot_id / sim_slot / sim_index is typically 0-indexed: 0 -> SIM 1, 1 -> SIM 2
                        if (col.equals("sim_id") || col.equals("slot_id") || col.equals("sim_slot") || col.equals("sim_index")) {
                            if (intVal == 1 || intVal == 2) return "SIM 2";
                            if (intVal == 0) return "SIM 1";
                        }
                        // simnum is 1-indexed: 1 -> SIM 1, 2 -> SIM 2
                        if (col.equals("simnum")) {
                            if (intVal == 2) return "SIM 2";
                            if (intVal == 1) return "SIM 1";
                        }
                        // sub_id / subscription_id
                        if (col.equals("sub_id") || col.equals("subscription_id")) {
                            String res = resolveSimSlot(context, strVal.trim());
                            if (res != null && !res.isEmpty() && !"SIM 1".equals(res)) return res;
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        // 2. Check standard PHONE_ACCOUNT_ID
        int accIdx = cursor.getColumnIndex(CallLog.Calls.PHONE_ACCOUNT_ID);
        if (accIdx != -1 && !cursor.isNull(accIdx)) {
            String accId = cursor.getString(accIdx);
            if (accId != null && !accId.trim().isEmpty()) {
                String res = resolveSimSlot(context, accId.trim());
                if (res != null && !res.isEmpty() && !"SIM 1".equals(res)) return res;
            }
        }

        // 3. Check PHONE_ACCOUNT_COMPONENT_NAME
        int compIdx = cursor.getColumnIndex("phone_account_component_name");
        if (compIdx != -1 && !cursor.isNull(compIdx)) {
            String comp = cursor.getString(compIdx);
            if (comp != null) {
                String lower = comp.toLowerCase();
                if (lower.contains("sim2") || lower.contains("sub2") || lower.contains("slot1") || lower.contains("slot_1")) {
                    return "SIM 2";
                }
            }
        }

        return "SIM 1";
    }

    public static String resolveSimSlot(Context context, String phoneAccountId) {
        if (phoneAccountId == null || phoneAccountId.trim().isEmpty()) return "SIM 1";
        String cleanId = phoneAccountId.trim();

        // 1. Check TelecomManager call-capable accounts (Native multi-SIM handles)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                    android.telecom.TelecomManager tm = (android.telecom.TelecomManager) context.getSystemService(Context.TELECOM_SERVICE);
                    if (tm != null) {
                        List<android.telecom.PhoneAccountHandle> handles = tm.getCallCapablePhoneAccounts();
                        if (handles != null && handles.size() > 1) {
                            for (int i = 0; i < handles.size(); i++) {
                                android.telecom.PhoneAccountHandle h = handles.get(i);
                                if (h != null && h.getId() != null) {
                                    String hid = h.getId().trim();
                                    if (cleanId.equals(hid) || cleanId.contains(hid) || hid.contains(cleanId)) {
                                        return "SIM " + (i + 1);
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                Log.w("OmniFlowSIMCall", "TelecomManager lookup notice: " + e.getMessage());
            }
        }

        // 2. Check SubscriptionManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            try {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                    SubscriptionManager sm = (SubscriptionManager) context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                    if (sm != null) {
                        List<SubscriptionInfo> subs = sm.getActiveSubscriptionInfoList();
                        if (subs != null && !subs.isEmpty()) {
                            for (SubscriptionInfo sub : subs) {
                                String subIdStr = String.valueOf(sub.getSubscriptionId());
                                String iccId = sub.getIccId();
                                int slotIndex = sub.getSimSlotIndex(); // 0 for SIM 1, 1 for SIM 2

                                if (cleanId.equals(subIdStr) || cleanId.contains(subIdStr) || subIdStr.contains(cleanId)) {
                                    return "SIM " + (slotIndex + 1);
                                }
                                if (iccId != null && !iccId.isEmpty() && (cleanId.equals(iccId) || cleanId.contains(iccId) || iccId.contains(cleanId))) {
                                    return "SIM " + (slotIndex + 1);
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                Log.w("OmniFlowSIMCall", "SimSlot resolution notice: " + e.getMessage());
            }
        }

        String lower = cleanId.toLowerCase();
        if (lower.equals("1") || lower.contains("sim2") || lower.contains("sub2") || lower.contains("slot1") || lower.contains("slot_1") || lower.endsWith(":1") || lower.endsWith(":2")) {
            return "SIM 2";
        }
        if (lower.equals("2")) return "SIM 2";
        if (lower.equals("0") || lower.equals("sim1") || lower.equals("sub1") || lower.contains("slot0")) return "SIM 1";

        return "SIM 1";
    }

    private ResolvedCallDetails resolveCallDetailsFromCallLog(String fallbackPhone, String fallbackType, long fallbackDur) {
        ResolvedCallDetails details = new ResolvedCallDetails();
        details.phoneNumber = (fallbackPhone != null && !fallbackPhone.isEmpty() && !fallbackPhone.equalsIgnoreCase("Customer") && !fallbackPhone.equalsIgnoreCase("Incoming Call")) ? fallbackPhone : "";
        details.callType = (fallbackType != null && !fallbackType.isEmpty()) ? fallbackType : "OUTGOING";
        details.duration = fallbackDur;
        
        String prefSim = getSharedPreferences("omniflow", MODE_PRIVATE).getString("active_call_sim", "");
        if ("SIM 2".equalsIgnoreCase(currentSimSlot) || "SIM 2".equalsIgnoreCase(prefSim)) {
            details.simSlot = "SIM 2";
        } else {
            details.simSlot = (currentSimSlot != null && !currentSimSlot.isEmpty()) ? currentSimSlot : "SIM 1";
        }

        String cleanFallback = details.phoneNumber.replaceAll("\\D", "");
        String normFallback10 = cleanFallback.length() >= 7 ? cleanFallback.substring(cleanFallback.length() - Math.min(10, cleanFallback.length())) : cleanFallback;

        // Strict date boundary: only consider rows written for THIS call (never borrow an old call from minutes ago!)
        long minValidCallDate = (callStartTime > 0) ? (callStartTime - 10000) : (System.currentTimeMillis() - 45000);

        try {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED) {
                long recentWindow = minValidCallDate;
                Uri callLogUri = CallLog.Calls.CONTENT_URI;
                // Query with null projection so ALL OEM-specific columns (sim_id, sub_id, etc.) are returned!
                try (Cursor cursor = getContentResolver().query(
                    callLogUri,
                    null,
                    CallLog.Calls.DATE + " >= ?",
                    new String[]{String.valueOf(recentWindow)},
                    CallLog.Calls.DATE + " DESC LIMIT 10"
                )) {
                    if (cursor != null) {
                        int numIdx = cursor.getColumnIndex(CallLog.Calls.NUMBER);
                        int nameIdx = cursor.getColumnIndex(CallLog.Calls.CACHED_NAME);
                        int typeIdx = cursor.getColumnIndex(CallLog.Calls.TYPE);
                        int durIdx = cursor.getColumnIndex(CallLog.Calls.DURATION);
                        int dateIdx = cursor.getColumnIndex(CallLog.Calls.DATE);

                        while (cursor.moveToNext()) {
                            long rowDate = (dateIdx >= 0) ? cursor.getLong(dateIdx) : 0;
                            if (rowDate > 0 && rowDate < minValidCallDate) {
                                // Old call row from before current call started. Skip!
                                continue;
                            }

                            String num = (numIdx >= 0) ? cursor.getString(numIdx) : "";
                            String cleanNum = (num != null) ? num.replaceAll("\\D", "") : "";
                            boolean matchesPhone = normFallback10.isEmpty() || cleanNum.endsWith(normFallback10) || normFallback10.endsWith(cleanNum);

                            if (!matchesPhone && cursor.getPosition() > 0) {
                                continue;
                            }

                            if (num != null && !num.trim().isEmpty()) {
                                details.phoneNumber = num.trim();
                            }

                            if (nameIdx >= 0) {
                                String name = cursor.getString(nameIdx);
                                if (name != null && !name.trim().isEmpty() && !name.equalsIgnoreCase("null")) {
                                    details.customerName = name.trim();
                                }
                            }

                            if (durIdx >= 0) {
                                long d = cursor.getLong(durIdx);
                                if (d > 0) details.duration = d;
                            }

                            // Direction Resolution: An OUTGOING call initiated by the user NEVER becomes INCOMING!
                            if ("OUTGOING".equalsIgnoreCase(fallbackType) || "OUTGOING".equalsIgnoreCase(this.callType)) {
                                details.callType = "OUTGOING";
                            } else if (typeIdx >= 0) {
                                int rawType = cursor.getInt(typeIdx);
                                switch (rawType) {
                                    case CallLog.Calls.INCOMING_TYPE:
                                        details.callType = "INCOMING";
                                        break;
                                    case CallLog.Calls.OUTGOING_TYPE:
                                        details.callType = "OUTGOING";
                                        break;
                                    case CallLog.Calls.MISSED_TYPE:
                                        details.callType = "MISSED";
                                        details.isMissedOrRejected = true;
                                        break;
                                    case 5: // REJECTED_TYPE
                                        details.callType = "REJECTED";
                                        details.isMissedOrRejected = true;
                                        break;
                                    case 6: // BLOCKED_TYPE
                                        details.callType = "BLOCKED";
                                        details.isMissedOrRejected = true;
                                        break;
                                    default:
                                        details.callType = (fallbackType != null ? fallbackType : "OUTGOING");
                                        break;
                                }
                            }

                            // SIM Slot Resolution
                            if (!"SIM 2".equalsIgnoreCase(details.simSlot)) {
                                String resolvedSlot = resolveSimSlotFromCursor(this, cursor);
                                if ("SIM 2".equalsIgnoreCase(resolvedSlot)) {
                                    details.simSlot = "SIM 2";
                                }
                            }

                            if (matchesPhone) break;
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "CallLog detailed resolution notice: " + e.getMessage());
        }

        if (details.phoneNumber.isEmpty()) {
            details.phoneNumber = (fallbackPhone != null && !fallbackPhone.isEmpty()) ? fallbackPhone : "Customer";
        }

        // Final safety locks:
        if ("SIM 2".equalsIgnoreCase(currentSimSlot) || "SIM 2".equalsIgnoreCase(prefSim)) {
            details.simSlot = "SIM 2";
        }
        if ("OUTGOING".equalsIgnoreCase(fallbackType) || "OUTGOING".equalsIgnoreCase(this.callType)) {
            details.callType = "OUTGOING";
        }

        boolean wasAnsweredInPrefs = getSharedPreferences("omniflow", MODE_PRIVATE).getBoolean("call_answered", false);
        if (details.duration <= 0) {
            if (fallbackDur > 0) {
                details.duration = fallbackDur;
                details.isMissedOrRejected = false;
                if ("MISSED".equalsIgnoreCase(details.callType)) {
                    details.callType = (fallbackType != null && !fallbackType.equalsIgnoreCase("MISSED")) ? fallbackType : "OUTGOING";
                }
            } else if (wasAnsweredInPrefs || (callStartTime > 0)) {
                // Call was OFFHOOK / Answered! Do NOT falsely convert to MISSED!
                details.isMissedOrRejected = false;
                details.callType = (fallbackType != null && !fallbackType.equalsIgnoreCase("MISSED")) ? fallbackType : "OUTGOING";
            } else if ("INCOMING".equalsIgnoreCase(details.callType)) {
                details.callType = "MISSED";
                details.isMissedOrRejected = true;
            }
        }

        return details;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        Log.d(TAG, "Service action: " + action);

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

        if (ACTION_SHOW_IN_CALL_CARD.equals(action) && intent != null) {
            phoneNumber = intent.getStringExtra("phone_number");
            callType = intent.getStringExtra("call_type");
            inCallCardManuallyDismissed = false;
            showOrUpdateInCallFloatingCard(phoneNumber, callType != null ? callType : "INCOMING", false, false);
        } else if (ACTION_START_RECORDING.equals(action) && intent != null) {
            phoneNumber = intent.getStringExtra("phone_number");
            callType = intent.getStringExtra("call_type");
            callStartTime = intent.getLongExtra("start_time", System.currentTimeMillis());
            String passedSim = intent.getStringExtra("sim_slot");
            if (passedSim != null && !passedSim.isEmpty()) {
                currentSimSlot = passedSim;
            } else {
                currentSimSlot = getSharedPreferences("omniflow", MODE_PRIVATE).getString("active_call_sim", "SIM 1");
            }
            // Live active hardware SIM check during active recording:
            String activeHardwareSim = CallStateReceiver.detectActiveSim(this);
            if (!"SIM 1".equals(activeHardwareSim)) {
                currentSimSlot = activeHardwareSim;
                getSharedPreferences("omniflow", MODE_PRIVATE).edit().putString("active_call_sim", activeHardwareSim).apply();
            }
            String passedId = intent.getStringExtra("call_id");
            if (passedId != null && !passedId.isEmpty()) {
                if (!passedId.equals(currentCallId)) {
                    inCallCardManuallyDismissed = false;
                }
                currentCallId = passedId;
            } else {
                inCallCardManuallyDismissed = false;
                currentCallId = "call_" + callStartTime + "_" + (phoneNumber != null ? phoneNumber.replaceAll("\\D", "") : "0");
            }

            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(NOTIFICATION_ID, buildNotification("🔴 Call in progress with " + (phoneNumber != null ? phoneNumber : "Customer")));
            }

            showOrUpdateInCallFloatingCard(phoneNumber, callType != null ? callType : "OUTGOING", true, false);
            startRecording();

        } else if (ACTION_STOP_RECORDING.equals(action)) {
            inCallCardManuallyDismissed = false;
            boolean wasMissed = (intent != null) && intent.getBooleanExtra("was_missed", false);
            String stopType = (intent != null) ? intent.getStringExtra("call_type") : null;
            if (stopType != null && !stopType.isEmpty()) {
                callType = stopType;
            }
            String stopSim = (intent != null) ? intent.getStringExtra("sim_slot") : null;
            if (stopSim != null && !stopSim.isEmpty() && !"SIM 1".equals(stopSim)) {
                currentSimSlot = stopSim;
            } else if (currentSimSlot == null || "SIM 1".equals(currentSimSlot)) {
                currentSimSlot = getSharedPreferences("omniflow", MODE_PRIVATE).getString("active_call_sim", "SIM 1");
            }
            if ("SIM 1".equals(currentSimSlot)) {
                String liveSim = CallStateReceiver.detectActiveSim(this);
                if (!"SIM 1".equals(liveSim)) {
                    currentSimSlot = liveSim;
                }
            }
            String stopPhone = (intent != null) ? intent.getStringExtra("phone_number") : null;
            if (stopPhone != null && !stopPhone.isEmpty() && !"Customer".equalsIgnoreCase(stopPhone)) {
                phoneNumber = stopPhone;
            }
            String passedStopId = (intent != null) ? intent.getStringExtra("call_id") : null;
            if (passedStopId != null && !passedStopId.isEmpty()) {
                currentCallId = passedStopId;
            }
            if (currentCallId == null || currentCallId.isEmpty()) {
                currentCallId = "call_" + System.currentTimeMillis() + "_" + (phoneNumber != null ? phoneNumber.replaceAll("\\D", "") : "0");
            }

            if (wasMissed) {
                showOrUpdateInCallFloatingCard(phoneNumber, "MISSED", false, true);
            } else {
                dismissInCallFloatingCard();
            }
            stopRecording(wasMissed);
        }

        return START_STICKY;
    }

    private void startRecording() {
        SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
        try {
            File dir = new File(getExternalFilesDir(null), "CallRecordings");
            if (!dir.exists()) dir.mkdirs();

            String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
            recordingFilePath = dir.getAbsolutePath() + "/call_" + timestamp + ".m4a";

            Log.d(TAG, "In-App Backup Recording to: " + recordingFilePath);

            mediaRecorder = new MediaRecorder();
            try {
                mediaRecorder.setAudioSource(MediaRecorder.AudioSource.VOICE_COMMUNICATION);
                mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
                mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
                mediaRecorder.setAudioSamplingRate(16000);
                mediaRecorder.setAudioEncodingBitRate(24000);
                mediaRecorder.setOutputFile(recordingFilePath);
                mediaRecorder.prepare();
                mediaRecorder.start();
                Log.d(TAG, "✅ In-App Recording STARTED (VOICE_COMMUNICATION AAC 24kbps)");
                prefs.edit().remove("last_recording_error").apply();
            } catch (Exception e1) {
                Log.w(TAG, "Native dialer recorder is already active on device: " + e1.getMessage());
                // Release cleanly so Android OS does not show repeated conflict toasts
                if (mediaRecorder != null) {
                    try { mediaRecorder.release(); } catch (Exception ignored) {}
                    mediaRecorder = null;
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Native call recording active. Fallback mic init skipped.");
        }
    }

    private void stopRecording() {
        stopRecording(false);
    }

    private void stopRecording(boolean wasMissedIntent) {
        if (!wasMissedIntent) {
            dismissInCallFloatingCard();
        }

        long rawDuration = (callStartTime > 0) ? (System.currentTimeMillis() - callStartTime) / 1000 : 0;
        if (rawDuration < 0) rawDuration = 0;

        try {
            if (mediaRecorder != null) {
                try {
                    mediaRecorder.stop();
                    Log.d(TAG, "⏹️ MediaRecorder stopped.");
                } catch (Exception stopEx) {
                    Log.w(TAG, "Stop warning (short call): " + stopEx.getMessage());
                }
                mediaRecorder.release();
                mediaRecorder = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error releasing recorder: " + e.getMessage());
        }

        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(NOTIFICATION_ID, buildNotification("🟢 OmniFlow is active and monitoring calls"));
        }

        final long fallbackDuration = rawDuration;
        final String fallbackPhone = this.phoneNumber;
        final String fallbackType = wasMissedIntent ? "MISSED" : this.callType;

        // Optimized 1600ms delay: gives Samsung & OEM dialers time to commit the actual talk duration to CallLog
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            ResolvedCallDetails details = resolveCallDetailsFromCallLog(fallbackPhone, fallbackType, fallbackDuration);
            if (details.duration <= 0 && !wasMissedIntent) {
                // Secondary retry after 700ms for heavy Android 14 OEM skins (One UI, ColorOS)
                try {
                    ResolvedCallDetails retryDetails = resolveCallDetailsFromCallLog(fallbackPhone, fallbackType, fallbackDuration);
                    if (retryDetails != null && retryDetails.duration > 0) {
                        details.duration = retryDetails.duration;
                    }
                } catch (Exception ignored) {}
            }

            if (wasMissedIntent) {
                details.callType = "MISSED";
                details.isMissedOrRejected = true;
                details.duration = 0;
            } else {
                if (details.duration <= 0 && fallbackDuration > 0) {
                    details.duration = fallbackDuration;
                }
                details.isMissedOrRejected = false;
                if ("MISSED".equalsIgnoreCase(details.callType)) {
                    details.callType = (fallbackType != null && !fallbackType.equalsIgnoreCase("MISSED")) ? fallbackType : "OUTGOING";
                }
            }

            final String finalPhone = details.phoneNumber;
            final String finalType = ("OUTGOING".equalsIgnoreCase(fallbackType) || "OUTGOING".equalsIgnoreCase(this.callType)) ? "OUTGOING" : details.callType;
            final long finalDuration = details.duration;
            final String finalSimSlot = ("SIM 2".equalsIgnoreCase(currentSimSlot) || "SIM 2".equalsIgnoreCase(details.simSlot)) ? "SIM 2" : ((details.simSlot != null && !details.simSlot.isEmpty()) ? details.simSlot : "SIM 1");
            final String finalCallId = (currentCallId != null && !currentCallId.isEmpty()) ? currentCallId : ("call_" + System.currentTimeMillis() + "_" + (finalPhone != null ? finalPhone.replaceAll("\\D", "") : "0"));

            Log.d(TAG, "🎯 [Post-Call Resolved] Type: " + finalType + ", Duration: " + finalDuration + "s, SIM: " + finalSimSlot + ", Phone: " + finalPhone);

            if ((details.isMissedOrRejected || finalDuration == 0) && wasMissedIntent) {
                if (recordingFilePath != null) {
                    try {
                        File partial = new File(recordingFilePath);
                        if (partial.exists()) partial.delete();
                    } catch (Exception ignored) {}
                }
                uploadMissedCallToCRM(finalPhone, details.customerName, finalType, finalSimSlot, finalCallId);
                return;
            }

            sendStage1InstantLog(finalPhone, finalDuration, finalType, finalCallId, finalSimSlot);

            // Pop up instantly without blocking the Main Looper on heavy file scans!
            showPostCallDispositionDialog(finalPhone, details.customerName, finalType, finalSimSlot, finalDuration, null, finalCallId);
        }, 600);
    }

    private void uploadMissedCallToCRM(String phone, String custName, String type, String simSlot, String cId) {
        new Thread(() -> {
            try {
                SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
                String apiUrl = prefs.getString("api_url", "https://ems-backend-9hig.onrender.com");
                String agentName = prefs.getString("agent_name", "Mobile Agent");
                String agentEmail = prefs.getString("agent_email", "agent@omniflow.in");
                String resolvedName = (custName != null && !custName.trim().isEmpty()) ? custName : resolveContactOrCallerIdName(this, phone);

                // Stage 1 Direct Supabase Sandbox Sync (Record missed call + Auto-create CRM Lead)
                try {
                    SupabaseSyncEngine.syncStage1Instant(this, phone, resolvedName, agentName, type, 0, cId, simSlot);
                } catch (Exception se) {
                    Log.e(TAG, "Missed call SupabaseSync notice: " + se.getMessage());
                }

                String timestamp = new SimpleDateFormat("dd/MM/yyyy, hh:mm:ss aa", Locale.getDefault()).format(new Date());

                String json = "{"
                    + "\"customerPhone\":\"" + escapeJson(phone != null ? phone : "Unknown") + "\","
                    + "\"customerName\":\"" + escapeJson(resolvedName != null ? resolvedName : (phone != null ? phone : "Customer")) + "\","
                    + "\"agentName\":\"" + escapeJson(agentName) + "\","
                    + "\"agentEmail\":\"" + escapeJson(agentEmail) + "\","
                    + "\"channel\":\"SIM\","
                    + "\"type\":\"" + escapeJson(type != null ? type : "MISSED") + "\","
                    + "\"durationSeconds\":0,"
                    + "\"callId\":\"" + escapeJson(cId) + "\","
                    + "\"timestamp\":\"" + timestamp + "\","
                    + "\"disposition\":\"Missed Call\","
                    + "\"notes\":\"Missed call via " + escapeJson(simSlot) + " [Ref: " + escapeJson(cId) + "]\","
                    + "\"recordingBase64\":\"\","
                    + "\"audioBase64\":\"\","
                    + "\"simSlot\":\"" + escapeJson(simSlot) + "\""
                    + "}";

                try {
                    java.net.URL url = new java.net.URL(apiUrl + "/api/telecalling/sync-log");
                    java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                    conn.setDoOutput(true);
                    conn.setConnectTimeout(5000);
                    conn.setReadTimeout(5000);
                    byte[] input = json.getBytes("utf-8");
                    conn.getOutputStream().write(input, 0, input.length);
                    conn.getResponseCode();
                    conn.disconnect();
                } catch (Exception ignored) {}

                postToFirebaseFirestore(phone, resolvedName, type, 0, agentName, null, "Missed Call", "Missed call via " + simSlot, simSlot);
            } catch (Exception e) {
                Log.w(TAG, "uploadMissedCallToCRM error: " + e.getMessage());
            }
        }).start();
    }

    private void sendStage1InstantLog(String phone, long duration, String type, String cId) {
        sendStage1InstantLog(phone, duration, type, cId, (currentSimSlot != null ? currentSimSlot : "SIM 1"));
    }

    private void sendStage1InstantLog(String phone, long duration, String type, String cId, String simSlot) {
        new Thread(() -> {
            try {
                SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
                String apiUrl = prefs.getString("api_url", "https://ems-backend-9hig.onrender.com");
                String agentName = prefs.getString("agent_name", "Mobile Agent");
                String agentEmail = prefs.getString("agent_email", "agent@omniflow.in");
                String custName = resolveContactOrCallerIdName(this, phone);

                // Stage 1 Direct Supabase Sandbox Instant Sync (0ms Instant call log + Auto-create CRM Lead)
                try {
                    SupabaseSyncEngine.syncStage1Instant(this, phone, custName, agentName, type, duration, cId, simSlot);
                } catch (Exception se) {
                    Log.e(TAG, "Stage 1 SupabaseSync notice: " + se.getMessage());
                }

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
                    + "\"notes\":\"Call completed via " + escapeJson(simSlot != null ? simSlot : "SIM 1") + " [Ref: " + escapeJson(cId) + "]\","
                    + "\"simSlot\":\"" + escapeJson(simSlot != null ? simSlot : "SIM 1") + "\""
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
     * Wotel-Style In-Call & Post-Call Two-Tone Floating Card in OmniFlow Deep Teal (#064E43)
     */
    private void showInCallFloatingCard(String phone, String type) {
        boolean isActive = "OUTGOING".equalsIgnoreCase(type) || (callStartTime > 0 && Math.abs(System.currentTimeMillis() - callStartTime) < 3600000);
        showOrUpdateInCallFloatingCard(phone, type, isActive, false);
    }

    private void showOrUpdateInCallFloatingCard(String phone, String type, boolean isCallActive, boolean isMissed) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            Log.w(TAG, "Overlay permission not granted — opening overlay settings");
            try {
                Intent pIntent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName()));
                pIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(pIntent);
            } catch (Exception ignored) {}
            return;
        }

        if (Looper.myLooper() != Looper.getMainLooper()) {
            new Handler(Looper.getMainLooper()).post(() -> showOrUpdateInCallFloatingCard(phone, type, isCallActive, isMissed));
            return;
        }

        // If user manually closed the card for this call, do not resurrect it
        if (inCallCardManuallyDismissed) {
            Log.d(TAG, "In-Call card was manually dismissed by user for this call. Skipping show/update.");
            return;
        }

        try {
            currentInCallPhone = (phone != null && !phone.trim().isEmpty()) ? phone.trim() : "Customer";
            String custName = resolveContactOrCallerIdName(this, currentInCallPhone);
            String displayName = (custName != null && !custName.trim().isEmpty()) ? custName.trim() : currentInCallPhone;
            String simLabel = resolveSimSlot(this, null);

            // IF CARD IS ALREADY SHOWN, UPDATE IN PLACE (0ms instant update, no flickering, no crash!)
            if (inCallCardView != null && inCallCardView.isAttachedToWindow() && tvInCallBadge != null && tvInCallName != null) {
                tvInCallName.setText(displayName);
                if (tvInCallPhone != null) {
                    tvInCallPhone.setText(currentInCallPhone + (simLabel != null ? " • " + simLabel : ""));
                }
                updateFloatingBadgeAndTimer(isCallActive, isMissed);
                setupFloatingButtonListeners(currentInCallPhone, custName, type, simLabel);
                return;
            }

            // Otherwise, dismiss any stale card safely and synchronously
            dismissInCallFloatingCard();

            windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
            float density = getResources().getDisplayMetrics().density;
            float cornerRadius = 18 * density;

            int screenWidth = getResources().getDisplayMetrics().widthPixels;
            int cardWidth = (int) (screenWidth * 0.94);
            int initialX = (screenWidth - cardWidth) / 2;
            int initialY = (int) (32 * density);

            int layoutFlag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

            final WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                cardWidth,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE 
                    | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN 
                    | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                PixelFormat.TRANSLUCENT
            );

            params.gravity = Gravity.TOP | Gravity.START;
            params.x = initialX;
            params.y = initialY;

            // 1. Root Container with intelligent Drag & Click separation
            LinearLayout card = new LinearLayout(this) {
                private int startX, startY;
                private float touchStartX, touchStartY;
                private boolean isDragging = false;
                private final int touchSlop = ViewConfiguration.get(CallRecordingService.this).getScaledTouchSlop();

                @Override
                public boolean onInterceptTouchEvent(MotionEvent ev) {
                    switch (ev.getAction()) {
                        case MotionEvent.ACTION_DOWN:
                            startX = params.x;
                            startY = params.y;
                            touchStartX = ev.getRawX();
                            touchStartY = ev.getRawY();
                            isDragging = false;
                            return false; // Allows children (like btnClose, action buttons) to receive ACTION_DOWN
                        case MotionEvent.ACTION_MOVE:
                            float dx = Math.abs(ev.getRawX() - touchStartX);
                            float dy = Math.abs(ev.getRawY() - touchStartY);
                            if (dx > touchSlop || dy > touchSlop) {
                                isDragging = true;
                                return true; // Intercept! Cancel child click and take over dragging
                            }
                            break;
                        case MotionEvent.ACTION_UP:
                        case MotionEvent.ACTION_CANCEL:
                            isDragging = false;
                            break;
                    }
                    return false;
                }

                @Override
                public boolean onTouchEvent(MotionEvent event) {
                    switch (event.getAction()) {
                        case MotionEvent.ACTION_DOWN:
                            startX = params.x;
                            startY = params.y;
                            touchStartX = event.getRawX();
                            touchStartY = event.getRawY();
                            return true; // Consume DOWN so we receive MOVE even if touched on empty areas!
                        case MotionEvent.ACTION_MOVE:
                            float dx = Math.abs(event.getRawX() - touchStartX);
                            float dy = Math.abs(event.getRawY() - touchStartY);
                            if (dx > touchSlop || dy > touchSlop || isDragging) {
                                isDragging = true;
                                int newX = startX + (int) (event.getRawX() - touchStartX);
                                int newY = startY + (int) (event.getRawY() - touchStartY);
                                int maxX = screenWidth - cardWidth;
                                params.x = Math.max(0, Math.min(newX, maxX));
                                params.y = Math.max((int)(8 * density), newY);
                                if (windowManager != null && inCallCardView != null && inCallCardView.isAttachedToWindow()) {
                                    windowManager.updateViewLayout(inCallCardView, params);
                                }
                                return true;
                            }
                            break;
                        case MotionEvent.ACTION_UP:
                        case MotionEvent.ACTION_CANCEL:
                            if (isDragging) {
                                isDragging = false;
                                return true;
                            }
                            break;
                    }
                    return super.onTouchEvent(event);
                }
            };
            card.setOrientation(LinearLayout.VERTICAL);
            GradientDrawable rootBg = new GradientDrawable();
            rootBg.setColor(Color.WHITE);
            rootBg.setCornerRadius(cornerRadius);
            rootBg.setStroke((int)(1.5f * density), Color.WHITE);
            card.setBackground(rootBg);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                card.setElevation(16 * density);
                card.setClipToOutline(true);
            }

            // 2. TOP SECTION: Deep Teal (#064E43) matching EMS CRM brand theme
            LinearLayout topSection = new LinearLayout(this);
            topSection.setOrientation(LinearLayout.VERTICAL);
            topSection.setPadding((int)(16 * density), (int)(14 * density), (int)(16 * density), (int)(14 * density));

            GradientDrawable topBg = new GradientDrawable();
            topBg.setColor(Color.parseColor("#064E43"));
            topBg.setCornerRadii(new float[]{cornerRadius, cornerRadius, cornerRadius, cornerRadius, 0, 0, 0, 0});
            topSection.setBackground(topBg);

            // 2a. Top Row: Status Badge (Left) + Close '✕' (Right)
            LinearLayout topRow = new LinearLayout(this);
            topRow.setOrientation(LinearLayout.HORIZONTAL);
            topRow.setGravity(Gravity.CENTER_VERTICAL);

            tvInCallBadge = new TextView(this);
            tvInCallBadge.setTextSize(10.5f);
            tvInCallBadge.setTypeface(null, Typeface.BOLD);
            tvInCallBadge.setTextColor(Color.WHITE);
            tvInCallBadge.setGravity(Gravity.CENTER);
            tvInCallBadge.setPadding((int)(10 * density), (int)(4 * density), (int)(10 * density), (int)(4 * density));
            topRow.addView(tvInCallBadge);

            View spacer = new View(this);
            LinearLayout.LayoutParams spacerParams = new LinearLayout.LayoutParams(0, 0, 1.0f);
            topRow.addView(spacer, spacerParams);

            TextView btnClose = new TextView(this);
            btnClose.setText("✕");
            btnClose.setTextColor(Color.WHITE);
            btnClose.setTextSize(16f);
            btnClose.setTypeface(null, Typeface.BOLD);
            btnClose.setGravity(Gravity.CENTER);
            int closeBtnSize = (int)(38 * density);
            LinearLayout.LayoutParams closeParams = new LinearLayout.LayoutParams(closeBtnSize, closeBtnSize);
            btnClose.setLayoutParams(closeParams);
            GradientDrawable closeBg = new GradientDrawable();
            closeBg.setShape(GradientDrawable.OVAL);
            closeBg.setColor(Color.parseColor("#25FFFFFF")); // 15% translucent circular pill
            btnClose.setBackground(closeBg);
            btnClose.setClickable(true);
            btnClose.setFocusable(false);
            btnClose.setOnClickListener(v -> {
                Log.d(TAG, "✕ Close tapped on In-Call Floating Card. Dismissing permanently for this call.");
                inCallCardManuallyDismissed = true;
                dismissInCallFloatingCard();
            });
            topRow.addView(btnClose);

            topSection.addView(topRow);

            // 2b. Contact Row: Circular Avatar + Name/Phone
            LinearLayout contactRow = new LinearLayout(this);
            contactRow.setOrientation(LinearLayout.HORIZONTAL);
            contactRow.setGravity(Gravity.CENTER_VERTICAL);
            LinearLayout.LayoutParams contactParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            contactParams.setMargins(0, (int)(10 * density), 0, 0);
            contactRow.setLayoutParams(contactParams);

            // Circular Cyan-Teal Avatar with white phone icon
            tvInCallAvatar = new TextView(this);
            tvInCallAvatar.setText("📞");
            tvInCallAvatar.setTextColor(Color.WHITE);
            tvInCallAvatar.setTextSize(18f);
            tvInCallAvatar.setGravity(Gravity.CENTER);
            GradientDrawable avBg = new GradientDrawable();
            avBg.setColor(Color.parseColor("#00A8B5"));
            avBg.setShape(GradientDrawable.OVAL);
            avBg.setStroke((int)(2 * density), Color.WHITE);
            tvInCallAvatar.setBackground(avBg);
            LinearLayout.LayoutParams avParams = new LinearLayout.LayoutParams((int)(48 * density), (int)(48 * density));
            avParams.setMargins(0, 0, (int)(14 * density), 0);
            tvInCallAvatar.setLayoutParams(avParams);
            contactRow.addView(tvInCallAvatar);

            // Name & Phone column
            LinearLayout nameCol = new LinearLayout(this);
            nameCol.setOrientation(LinearLayout.VERTICAL);

            tvInCallName = new TextView(this);
            tvInCallName.setText(displayName);
            tvInCallName.setTextColor(Color.WHITE);
            tvInCallName.setTextSize(16.5f);
            tvInCallName.setTypeface(null, Typeface.BOLD);
            tvInCallName.setSingleLine(true);
            tvInCallName.setEllipsize(TextUtils.TruncateAt.END);
            nameCol.addView(tvInCallName);

            tvInCallPhone = new TextView(this);
            tvInCallPhone.setText(currentInCallPhone + (simLabel != null ? " • " + simLabel : ""));
            tvInCallPhone.setTextColor(Color.parseColor("#94A3B8"));
            tvInCallPhone.setTextSize(12.5f);
            LinearLayout.LayoutParams pParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            pParams.setMargins(0, (int)(2 * density), 0, 0);
            tvInCallPhone.setLayoutParams(pParams);
            nameCol.addView(tvInCallPhone);

            contactRow.addView(nameCol, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));
            topSection.addView(contactRow);

            card.addView(topSection);

            // 3. BOTTOM SECTION: Pure White (#FFFFFF) with Re-Dial and Call Log buttons
            LinearLayout bottomSection = new LinearLayout(this);
            bottomSection.setOrientation(LinearLayout.HORIZONTAL);
            bottomSection.setPadding((int)(14 * density), (int)(12 * density), (int)(14 * density), (int)(14 * density));

            GradientDrawable bottomBg = new GradientDrawable();
            bottomBg.setColor(Color.WHITE);
            bottomBg.setCornerRadii(new float[]{0, 0, 0, 0, cornerRadius, cornerRadius, cornerRadius, cornerRadius});
            bottomSection.setBackground(bottomBg);

            // Re-Dial Button (White with Deep Teal border)
            btnInCallRedial = new TextView(this);
            btnInCallRedial.setText("📞  Re-Dial");
            btnInCallRedial.setTextColor(Color.parseColor("#064E43"));
            btnInCallRedial.setTextSize(13f);
            btnInCallRedial.setTypeface(null, Typeface.BOLD);
            btnInCallRedial.setGravity(Gravity.CENTER);
            btnInCallRedial.setClickable(true);
            GradientDrawable redialBg = new GradientDrawable();
            redialBg.setColor(Color.WHITE);
            redialBg.setCornerRadius(22 * density);
            redialBg.setStroke((int)(1.5f * density), Color.parseColor("#064E43"));
            btnInCallRedial.setBackground(redialBg);

            LinearLayout.LayoutParams redialParams = new LinearLayout.LayoutParams(0, (int)(42 * density), 1.0f);
            redialParams.setMargins(0, 0, (int)(8 * density), 0);
            btnInCallRedial.setLayoutParams(redialParams);
            bottomSection.addView(btnInCallRedial);

            // Call Log Button (Solid Deep Teal with white text)
            btnInCallLog = new TextView(this);
            btnInCallLog.setText("📞+  Call Log");
            btnInCallLog.setTextColor(Color.WHITE);
            btnInCallLog.setTextSize(13f);
            btnInCallLog.setTypeface(null, Typeface.BOLD);
            btnInCallLog.setGravity(Gravity.CENTER);
            btnInCallLog.setClickable(true);
            GradientDrawable callLogBg = new GradientDrawable();
            callLogBg.setColor(Color.parseColor("#064E43"));
            callLogBg.setCornerRadius(22 * density);
            btnInCallLog.setBackground(callLogBg);

            LinearLayout.LayoutParams callLogParams = new LinearLayout.LayoutParams(0, (int)(42 * density), 1.0f);
            callLogParams.setMargins((int)(8 * density), 0, 0, 0);
            btnInCallLog.setLayoutParams(callLogParams);
            bottomSection.addView(btnInCallLog);

            card.addView(bottomSection);

            // 4. Update Badge & Button actions
            updateFloatingBadgeAndTimer(isCallActive, isMissed);
            setupFloatingButtonListeners(currentInCallPhone, custName, type, simLabel);

            // 5. Add to WindowManager
            inCallCardView = card;
            windowManager.addView(inCallCardView, params);

        } catch (Exception e) {
            Log.e(TAG, "Error showing Wotel-style floating card: " + e.getMessage());
        }
    }

    private void updateFloatingBadgeAndTimer(boolean isCallActive, boolean isMissed) {
        if (inCallTimerRunnable != null) {
            inCallTimerHandler.removeCallbacks(inCallTimerRunnable);
            inCallTimerRunnable = null;
        }
        if (autoDismissRunnable != null) {
            autoDismissHandler.removeCallbacks(autoDismissRunnable);
            autoDismissRunnable = null;
        }

        if (tvInCallBadge == null) return;
        float density = getResources().getDisplayMetrics().density;
        GradientDrawable badgeBg = new GradientDrawable();
        badgeBg.setCornerRadius(12 * density);

        if (isMissed) {
            badgeBg.setColor(Color.parseColor("#0A3830")); // Subtle dark teal backing
            tvInCallBadge.setBackground(badgeBg);
            tvInCallBadge.setText("⊘ NO RESPONSE");
            tvInCallBadge.setTextColor(Color.parseColor("#F59E0B")); // Amber symbol and text

            // Auto-dismiss missed card after 35 seconds if untouched
            autoDismissRunnable = this::dismissInCallFloatingCard;
            autoDismissHandler.postDelayed(autoDismissRunnable, 35000);

        } else if (isCallActive) {
            badgeBg.setColor(Color.parseColor("#059669")); // Emerald green
            tvInCallBadge.setBackground(badgeBg);
            tvInCallBadge.setText("🟢  IN CALL");
            tvInCallBadge.setTextColor(Color.WHITE);
            // Timer completely removed per user instruction

        } else {
            // RINGING STATE
            badgeBg.setColor(Color.parseColor("#0D9488")); // Teal
            tvInCallBadge.setBackground(badgeBg);
            tvInCallBadge.setText("🔔  INCOMING CALL");
            tvInCallBadge.setTextColor(Color.WHITE);
        }
    }

    private void setupFloatingButtonListeners(String phone, String custName, String type, String simSlot) {
        if (btnInCallRedial != null) {
            btnInCallRedial.setOnClickListener(v -> {
                try {
                    String clean = (phone != null ? phone : "").replaceAll("[^0-9+]", "").trim();
                    if (!clean.isEmpty()) {
                        Intent callIntent = new Intent(Intent.ACTION_CALL, Uri.parse("tel:" + clean));
                        callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(callIntent);
                    }
                } catch (Exception e) {
                    try {
                        String clean = (phone != null ? phone : "").replaceAll("[^0-9+]", "").trim();
                        Intent dialIntent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + clean));
                        dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(dialIntent);
                    } catch (Exception ignored) {}
                }
            });
        }

        if (btnInCallLog != null) {
            btnInCallLog.setOnClickListener(v -> {
                dismissInCallFloatingCard();
                long dur = (callStartTime > 0) ? Math.max(0, (System.currentTimeMillis() - callStartTime) / 1000) : 0;
                showPostCallDispositionDialog(phone, custName, type, simSlot, dur, null, "call_" + System.currentTimeMillis());
            });
        }
    }

    private void dismissInCallFloatingCard() {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            new Handler(Looper.getMainLooper()).post(this::dismissInCallFloatingCard);
            return;
        }
        try {
            if (inCallTimerRunnable != null) {
                inCallTimerHandler.removeCallbacks(inCallTimerRunnable);
                inCallTimerRunnable = null;
            }
            if (autoDismissRunnable != null) {
                autoDismissHandler.removeCallbacks(autoDismissRunnable);
                autoDismissRunnable = null;
            }
            if (windowManager != null && inCallCardView != null) {
                if (inCallCardView.isAttachedToWindow()) {
                    try {
                        windowManager.removeViewImmediate(inCallCardView);
                    } catch (Exception e) {
                        try {
                            windowManager.removeView(inCallCardView);
                        } catch (Exception ignored) {}
                    }
                }
                inCallCardView = null;
            }
            tvInCallBadge = null;
            tvInCallName = null;
            tvInCallPhone = null;
            tvInCallAvatar = null;
            btnInCallRedial = null;
            btnInCallLog = null;
        } catch (Exception ignored) {}
    }

    private static class CapturedAudioInfo {
        Uri safFileUri;
        File backupFileToUpload;
        boolean isNative;
        String modeNote;
    }

    private CapturedAudioInfo resolveAudioFiles() {
        return resolveAudioFiles(this.phoneNumber, null);
    }

    private CapturedAudioInfo resolveAudioFiles(String phone) {
        return resolveAudioFiles(phone, null);
    }

    private CapturedAudioInfo resolveAudioFiles(String phone, String custName) {
        CapturedAudioInfo info = new CapturedAudioInfo();
        SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
        info.modeNote = "🎙️ In-App Mic Recording (Fallback Mode)";

        String cleanPhone = (phone != null) ? phone.replaceAll("\\D", "") : "";
        String norm10 = (cleanPhone.length() >= 10) ? cleanPhone.substring(cleanPhone.length() - 10) : cleanPhone;

        // Try up to 5 attempts with 600ms delays (up to ~3.0s) to allow Samsung / Xiaomi / Vivo native recorder to finish writing the file
        for (int attempt = 0; attempt < 5; attempt++) {
            // 1. Try finding call recording in User Selected SAF folder FIRST
            String folderUriStr = prefs.getString("selected_folder_uri", "");
            if (!folderUriStr.isEmpty()) {
                try {
                    Uri treeUri = Uri.parse(folderUriStr);
                    info.safFileUri = findRecordingInSelectedFolder(treeUri, norm10);
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

            // Trigger MediaScanner for known Samsung / Vivo / Xiaomi recording directories
            triggerMediaScannerForKnownFolders();

            // 2. Try MediaStore (Direct Query for Samsung / Xiaomi / Vivo Native Call Recordings)
            Uri mediaStoreUri = findLatestRecordingViaMediaStore(norm10);
            if (mediaStoreUri != null) {
                info.safFileUri = mediaStoreUri;
                info.isNative = true;
                info.modeNote = "🎧 HD Both-Sides Recording (Native MediaStore)";
                Log.d(TAG, "✅ Selected NATIVE Recording from MediaStore: " + mediaStoreUri.toString());
                return info;
            }

            // 3. Direct filesystem scan with Deep Recursive Search (Vivo / Xiaomi / Samsung / Oppo)
            File nativeFile = findNativeCallRecordingFile(norm10, custName);
            if (nativeFile != null && nativeFile.exists() && nativeFile.length() > 2000) {
                info.backupFileToUpload = nativeFile;
                info.isNative = true;
                info.modeNote = "🎧 HD Both-Sides Recording (Native Scanner Path)";
                Log.d(TAG, "✅ Selected NATIVE Recording from path: " + nativeFile.getAbsolutePath() + " (" + nativeFile.length() + " bytes)");
                return info;
            }

            // Pause briefly before retry if OEM recorder is still writing file to storage
            if (attempt < 4) {
                try { Thread.sleep(600); } catch (InterruptedException ignored) {}
            }
        }

        // In cellular calls, background apps are muted by Android OS. Never upload blank silence.
        Log.w(TAG, "⚠️ No native call recording found on device. Skipping silent fallback upload.");
        info.backupFileToUpload = null;
        info.safFileUri = null;
        info.isNative = false;
        return info;
    }

    private void scanDirectoryRecursive(File dir, int depth, long windowStart, List<File> candidates) {
        if (dir == null || !dir.exists() || !dir.isDirectory() || depth > 3) return;
        try {
            File[] files = dir.listFiles();
            if (files == null) return;
            for (File f : files) {
                if (f.isDirectory()) {
                    String dName = f.getName().toLowerCase();
                    if (!dName.startsWith(".") && !dName.equals("android") && !dName.equals("obb")) {
                        scanDirectoryRecursive(f, depth + 1, windowStart, candidates);
                    }
                } else if (f.isFile() && f.length() > 2000) {
                    String name = f.getName().toLowerCase();
                    if (name.endsWith(".m4a") || name.endsWith(".mp3") || name.endsWith(".amr") || name.endsWith(".3gp") || name.endsWith(".wav") || name.endsWith(".aac")) {
                        long modTime = f.lastModified();
                        if (modTime >= windowStart) {
                            candidates.add(f);
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
    }

    private void triggerMediaScannerForKnownFolders() {
        try {
            String storageRoot = Environment.getExternalStorageDirectory().getAbsolutePath();
            String[] baseRoots = {
                storageRoot + "/Record",
                storageRoot + "/Recordings",
                storageRoot + "/PhoneRecord",
                storageRoot + "/CallRecordings",
                storageRoot + "/MIUI/sound_recorder",
                storageRoot + "/Sounds",
                storageRoot + "/Voice Recorder",
                "/storage/emulated/0/Record",
                "/storage/emulated/0/Recordings",
                "/storage/emulated/0/PhoneRecord",
                "/storage/emulated/0/CallRecordings",
                "/storage/emulated/0/vivoservice"
            };
            List<File> candidates = new ArrayList<>();
            long window = System.currentTimeMillis() - 600000;
            for (String r : baseRoots) {
                File dir = new File(r);
                if (dir.exists() && dir.isDirectory()) {
                    scanDirectoryRecursive(dir, 0, window, candidates);
                }
            }
            if (!candidates.isEmpty()) {
                List<String> toScan = new ArrayList<>();
                for (File f : candidates) {
                    toScan.add(f.getAbsolutePath());
                }
                android.media.MediaScannerConnection.scanFile(this, toScan.toArray(new String[0]), null, null);
            }
        } catch (Exception ignored) {}
    }

    private Uri findLatestRecordingViaMediaStore(String norm10) {
        try {
            Uri audioUri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
            String[] projection = {
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.DISPLAY_NAME,
                MediaStore.Audio.Media.DATE_ADDED,
                MediaStore.Audio.Media.DATE_MODIFIED,
                MediaStore.Audio.Media.SIZE,
                MediaStore.Audio.Media.DATA
            };

            String sortOrder = MediaStore.Audio.Media.DATE_MODIFIED + " DESC, " + MediaStore.Audio.Media._ID + " DESC LIMIT 60";

            Cursor cursor = getContentResolver().query(audioUri, projection, null, null, sortOrder);
            if (cursor != null) {
                Uri matchByPhone = null;
                Uri matchByKeyword = null;
                long windowStartSeconds = (callStartTime > 0 ? (callStartTime - 120000) : (System.currentTimeMillis() - 900000)) / 1000;

                while (cursor.moveToNext()) {
                    long id = cursor.getLong(0);
                    String name = cursor.getString(1);
                    long dateAdded = cursor.getLong(2);
                    long dateModified = cursor.getLong(3);
                    long size = cursor.getLong(4);
                    String dataPath = null;
                    try {
                        dataPath = cursor.getString(5);
                    } catch (Exception ignored) {}

                    if (size > 2000) {
                        String lower = (name != null ? name.toLowerCase() : "");
                        String lowerPath = (dataPath != null ? dataPath.toLowerCase() : "");

                        boolean isAudioExt = lower.endsWith(".m4a") || lower.endsWith(".mp3") || lower.endsWith(".amr") || lower.endsWith(".3gp") || lower.endsWith(".aac") || lower.endsWith(".wav");
                        if (!isAudioExt) continue;

                        long effectiveTime = Math.max(dateModified, dateAdded);
                        if (effectiveTime > 100000000000L) {
                            effectiveTime = effectiveTime / 1000L;
                        }
                        boolean isRecent = (effectiveTime >= windowStartSeconds) || (effectiveTime > (System.currentTimeMillis() - 900000) / 1000);

                        if (isRecent) {
                            if (norm10 != null && !norm10.isEmpty() && (lower.contains(norm10) || lowerPath.contains(norm10))) {
                                matchByPhone = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id);
                                Log.d(TAG, "🎯 MediaStore Phone Exact Match: " + name + " -> " + matchByPhone);
                                cursor.close();
                                return matchByPhone;
                            }
                            if (matchByKeyword == null && (
                                lower.contains("call") || lower.contains("rec") || lower.contains("voice") || lower.contains("record") ||
                                lowerPath.contains("call_rec") || lowerPath.contains("/record") || lowerPath.contains("/miui") || lowerPath.contains("recordings")
                            )) {
                                matchByKeyword = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id);
                            }
                        }
                    }
                }
                cursor.close();
                if (matchByKeyword != null) {
                    Log.d(TAG, "🎯 MediaStore Keyword/Path Match: " + matchByKeyword);
                    return matchByKeyword;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "MediaStore query error: " + e.getMessage());
        }
        return null;
    }

    private File findNativeCallRecordingFile(String norm10, String custName) {
        try {
            long windowStart = (callStartTime > 0) ? (callStartTime - 120000) : (System.currentTimeMillis() - 900000);

            String storageRoot = Environment.getExternalStorageDirectory().getAbsolutePath();
            String[] baseRoots = {
                // Vivo / iQOO (Funtouch OS / Origin OS)
                storageRoot + "/Record",
                storageRoot + "/Recordings",
                storageRoot + "/PhoneRecord",
                storageRoot + "/CallRecordings",
                storageRoot + "/vivoservice",
                "/storage/emulated/0/Record",
                "/storage/emulated/0/Recordings",
                "/storage/emulated/0/PhoneRecord",
                "/storage/emulated/0/CallRecordings",
                "/storage/emulated/0/vivoservice",

                // Xiaomi / MIUI / HyperOS
                storageRoot + "/MIUI/sound_recorder",
                storageRoot + "/MIUI",
                storageRoot + "/sound_recorder",
                "/storage/emulated/0/MIUI/sound_recorder",
                "/storage/emulated/0/MIUI",

                // Samsung (OneUI)
                storageRoot + "/Recordings/Call",
                storageRoot + "/Voice Recorder",
                "/storage/emulated/0/Recordings/Call",

                // Oppo / Realme / OnePlus
                storageRoot + "/Recordings/CallRecordings",
                storageRoot + "/Music/Recordings",
                storageRoot + "/ColorOS",

                // Generic
                storageRoot + "/Sounds",
                storageRoot + "/Call Recordings",
                storageRoot + "/Call",
                "/storage/emulated/0/Sounds"
            };

            List<File> allCandidates = new ArrayList<>();
            for (String rootPath : baseRoots) {
                File dir = new File(rootPath);
                if (dir.exists() && dir.isDirectory()) {
                    scanDirectoryRecursive(dir, 0, windowStart, allCandidates);
                }
            }

            String cleanCustName = (custName != null && !custName.equalsIgnoreCase("Customer") && !custName.equalsIgnoreCase("Lead")) 
                ? custName.toLowerCase().replaceAll("[^a-z0-9]", " ").trim() 
                : "";

            File phoneMatchFile = null;
            File nameMatchFile = null;
            File newestFile = null;
            long newestModTime = 0;

            for (File f : allCandidates) {
                String lowerName = f.getName().toLowerCase();
                long modTime = f.lastModified();

                // 1. Phone number match (handles 10-digit, prefix 0 or 91)
                if (norm10 != null && !norm10.isEmpty() && lowerName.contains(norm10)) {
                    phoneMatchFile = f;
                    break;
                }

                // 2. Customer Name match (e.g. "Bro Sahil" -> checks "sahil")
                if (!cleanCustName.isEmpty()) {
                    String[] parts = cleanCustName.split("\\s+");
                    for (String p : parts) {
                        if (p.length() >= 3 && lowerName.contains(p)) {
                            nameMatchFile = f;
                            break;
                        }
                    }
                }

                // 3. Newest modified file in call window
                if (modTime > newestModTime) {
                    newestModTime = modTime;
                    newestFile = f;
                }
            }

            if (phoneMatchFile != null) {
                Log.d(TAG, "🎯 Direct Filesystem Phone Exact Match: " + phoneMatchFile.getAbsolutePath());
                return phoneMatchFile;
            }
            if (nameMatchFile != null) {
                Log.d(TAG, "🎯 Direct Filesystem Customer Name Match: " + nameMatchFile.getAbsolutePath());
                return nameMatchFile;
            }
            if (newestFile != null) {
                Log.d(TAG, "🎯 Direct Filesystem Recency Match: " + newestFile.getAbsolutePath());
                return newestFile;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error scanning native recording directories: " + e.getMessage());
        }
        return null;
    }

    private Uri findRecordingInSelectedFolder(Uri treeUri, String norm10) {
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
                long timeFilter = System.currentTimeMillis() - 900000;

                while (cursor.moveToNext()) {
                    String docId = cursor.getString(0);
                    String name = cursor.getString(1);
                    long lastMod = cursor.getLong(2);
                    long size = cursor.getLong(3);

                    if (size > 2000 && (lastMod == 0 || lastMod >= timeFilter)) {
                        String lowerName = (name != null ? name.toLowerCase() : "");
                        if (lowerName.endsWith(".m4a") || lowerName.endsWith(".mp3") || lowerName.endsWith(".amr") || lowerName.endsWith(".3gp") || lowerName.endsWith(".wav") || lowerName.endsWith(".aac")) {
                            if (norm10 != null && !norm10.isEmpty() && lowerName.contains(norm10)) {
                                cursor.close();
                                return DocumentsContract.buildDocumentUriUsingTree(treeUri, docId);
                            }
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
        showPostCallDispositionDialog(this.phoneNumber, null, this.callType, (this.currentSimSlot != null ? this.currentSimSlot : "SIM 1"), durationSeconds, audioInfo, callId);
    }

    private void showPostCallDispositionDialog(String phone, String custName, String type, String simSlot, long durationSeconds, CapturedAudioInfo audioInfo, String callId) {
        final String finalPhone = (phone != null && !phone.trim().isEmpty()) ? phone.trim() : "Customer";
        final String resolvedCustName = (custName != null && !custName.trim().isEmpty()) ? custName.trim() : resolveContactOrCallerIdName(this, finalPhone);
        final String finalSimSlot = (simSlot != null && !simSlot.trim().isEmpty()) ? simSlot.trim() : "SIM 1";
        final String finalType = (type != null && !type.trim().isEmpty()) ? type.trim() : "OUTGOING";

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            Log.w(TAG, "Overlay permission not granted — uploading directly with default status");
            uploadToCRM(durationSeconds, "Completed", "Call recorded via Companion", audioInfo, callId, "", "", finalSimSlot, finalPhone, resolvedCustName, finalType);
            return;
        }

        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                // 1. Dismiss any lingering dialog synchronously
                dismissPostCallDialog();

                windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
                float density = getResources().getDisplayMetrics().density;
                int screenWidth = getResources().getDisplayMetrics().widthPixels;

                // 2. Fullscreen transparent/dim backdrop container (ensures tap-outside works 100% reliably)
                final FrameLayout rootOverlay = new FrameLayout(this);
                rootOverlay.setBackgroundColor(Color.parseColor("#70000000")); // Clean 44% dark dim

                // 3. Inner Card matching Luxury Dark Obsidian Teal Theme (#041F1E)
                LinearLayout card = new LinearLayout(this);
                card.setOrientation(LinearLayout.VERTICAL);
                card.setPadding((int)(18 * density), (int)(16 * density), (int)(18 * density), (int)(16 * density));

                GradientDrawable cardBg = new GradientDrawable();
                cardBg.setColor(Color.parseColor("#041F1E")); // Deep Obsidian Teal
                cardBg.setCornerRadius(22 * density);
                cardBg.setStroke((int)(1.5f * density), Color.parseColor("#14B8A6")); // Glowing Mint Teal
                card.setBackground(cardBg);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    card.setElevation(20 * density);
                }

                FrameLayout.LayoutParams cardParams = new FrameLayout.LayoutParams(
                    (int) (screenWidth * 0.92),
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    Gravity.CENTER
                );
                card.setLayoutParams(cardParams);
                card.setClickable(true); // Consumes clicks so clicking card does not dismiss rootOverlay
                card.setFocusable(false);

                // Safe helper to dismiss this exact overlay instance synchronously (0ms, zero lag)
                final Runnable closeThisDialog = () -> {
                    dismissPostCallDialog();
                    try {
                        if (windowManager != null && rootOverlay.isAttachedToWindow()) {
                            windowManager.removeViewImmediate(rootOverlay);
                        }
                    } catch (Exception ignored) {}
                    postCallDialogView = null;
                };

                // Tap outside card dismisses popup and auto-saves recording to CRM
                rootOverlay.setOnClickListener(v -> {
                    closeThisDialog.run();
                    new Thread(() -> {
                        uploadToCRM(durationSeconds, "Completed", "Call dismissed", audioInfo, callId, "", "", finalSimSlot, finalPhone, resolvedCustName, finalType);
                    }).start();
                });

                // --- HEADER ROW (Title + SIM Badge + Duration Badge + Close '✕') ---
                LinearLayout headerRow = new LinearLayout(this);
                headerRow.setOrientation(LinearLayout.HORIZONTAL);
                headerRow.setGravity(Gravity.CENTER_VERTICAL);
                headerRow.setPadding(0, 0, 0, (int)(10 * density));

                TextView tvHeading = new TextView(this);
                tvHeading.setText("📞  Call Summary");
                tvHeading.setTextColor(Color.WHITE);
                tvHeading.setTextSize(15.5f);
                tvHeading.setTypeface(null, Typeface.BOLD);
                headerRow.addView(tvHeading, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

                // SIM Badge
                TextView tvSimBadge = new TextView(this);
                tvSimBadge.setText(finalSimSlot != null ? finalSimSlot : "SIM 1");
                tvSimBadge.setTextColor(Color.parseColor("#2DD4BF"));
                tvSimBadge.setTextSize(10.5f);
                tvSimBadge.setTypeface(null, Typeface.BOLD);
                tvSimBadge.setPadding((int)(8 * density), (int)(3 * density), (int)(8 * density), (int)(3 * density));
                GradientDrawable simBg = new GradientDrawable();
                simBg.setColor(Color.parseColor("#082F2C"));
                simBg.setCornerRadius(10 * density);
                simBg.setStroke((int)(1 * density), Color.parseColor("#134E4A"));
                tvSimBadge.setBackground(simBg);
                LinearLayout.LayoutParams simParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                simParams.setMargins(0, 0, (int)(6 * density), 0);
                tvSimBadge.setLayoutParams(simParams);
                headerRow.addView(tvSimBadge);

                // Duration Badge
                long min = durationSeconds / 60;
                long sec = durationSeconds % 60;
                String durStr = String.format(Locale.getDefault(), "%02d:%02d", min, sec);
                TextView tvDurBadge = new TextView(this);
                tvDurBadge.setText(durStr);
                tvDurBadge.setTextColor(Color.parseColor("#94A3B8"));
                tvDurBadge.setTextSize(10.5f);
                tvDurBadge.setTypeface(null, Typeface.BOLD);
                tvDurBadge.setPadding((int)(8 * density), (int)(3 * density), (int)(8 * density), (int)(3 * density));
                GradientDrawable durBg = new GradientDrawable();
                durBg.setColor(Color.parseColor("#062825"));
                durBg.setCornerRadius(10 * density);
                durBg.setStroke((int)(1 * density), Color.parseColor("#134E4A"));
                tvDurBadge.setBackground(durBg);
                headerRow.addView(tvDurBadge);

                // Close Button '✕'
                TextView btnClose = new TextView(this);
                btnClose.setText("✕");
                btnClose.setTextColor(Color.parseColor("#94A3B8"));
                btnClose.setTextSize(16f);
                btnClose.setTypeface(null, Typeface.BOLD);
                btnClose.setGravity(Gravity.CENTER);
                int closeBtnSize = (int)(36 * density);
                LinearLayout.LayoutParams closeParams = new LinearLayout.LayoutParams(closeBtnSize, closeBtnSize);
                btnClose.setLayoutParams(closeParams);
                GradientDrawable closeBg = new GradientDrawable();
                closeBg.setShape(GradientDrawable.OVAL);
                closeBg.setColor(Color.parseColor("#134E4A"));
                btnClose.setBackground(closeBg);
                btnClose.setClickable(true);
                btnClose.setFocusable(false);
                btnClose.setOnClickListener(v -> {
                    closeThisDialog.run();
                    uploadToCRM(durationSeconds, "Completed", "Call dismissed by agent", audioInfo, callId, "", "", finalSimSlot, finalPhone, resolvedCustName, finalType);
                });
                headerRow.addView(btnClose);

                card.addView(headerRow);

                // --- CONTACT ROW (Avatar + Name + Phone) ---
                LinearLayout contactBox = new LinearLayout(this);
                contactBox.setOrientation(LinearLayout.HORIZONTAL);
                contactBox.setGravity(Gravity.CENTER_VERTICAL);
                contactBox.setPadding((int)(12 * density), (int)(9 * density), (int)(12 * density), (int)(9 * density));
                GradientDrawable contactBoxBg = new GradientDrawable();
                contactBoxBg.setColor(Color.parseColor("#062825"));
                contactBoxBg.setCornerRadius(14 * density);
                contactBoxBg.setStroke((int)(1 * density), Color.parseColor("#0F443E"));
                contactBox.setBackground(contactBoxBg);

                // Circular Initials Avatar
                String safeName = (resolvedCustName != null && !resolvedCustName.trim().isEmpty() && !resolvedCustName.equalsIgnoreCase("Customer") && !resolvedCustName.equalsIgnoreCase(finalPhone))
                    ? resolvedCustName.trim() : "";
                String initials = "📞";
                if (!safeName.isEmpty()) {
                    String[] parts = safeName.split("\\s+");
                    if (parts.length >= 2 && parts[0].length() > 0 && parts[1].length() > 0) {
                        initials = (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
                    } else if (parts.length == 1 && parts[0].length() > 0) {
                        initials = parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase();
                    }
                }
                TextView tvAvatar = new TextView(this);
                tvAvatar.setText(initials);
                tvAvatar.setTextColor(Color.WHITE);
                tvAvatar.setTextSize(13f);
                tvAvatar.setTypeface(null, Typeface.BOLD);
                tvAvatar.setGravity(Gravity.CENTER);
                GradientDrawable avBg = new GradientDrawable();
                avBg.setShape(GradientDrawable.OVAL);
                int[] avColors = {0xFF0D9488, 0xFF0284C7, 0xFF8B5CF6, 0xFFF97316, 0xFFEC4899, 0xFF059669};
                int avColor = avColors[Math.abs((safeName.isEmpty() ? finalPhone : safeName).hashCode()) % avColors.length];
                avBg.setColor(avColor);
                tvAvatar.setBackground(avBg);
                LinearLayout.LayoutParams avParams = new LinearLayout.LayoutParams((int)(38 * density), (int)(38 * density));
                avParams.setMargins(0, 0, (int)(10 * density), 0);
                tvAvatar.setLayoutParams(avParams);
                contactBox.addView(tvAvatar);

                // Name and Phone Column
                LinearLayout nameCol = new LinearLayout(this);
                nameCol.setOrientation(LinearLayout.VERTICAL);
                TextView tvName = new TextView(this);
                tvName.setText(!safeName.isEmpty() ? safeName : finalPhone);
                tvName.setTextColor(Color.WHITE);
                tvName.setTextSize(14.5f);
                tvName.setTypeface(null, Typeface.BOLD);
                tvName.setSingleLine(true);
                tvName.setEllipsize(TextUtils.TruncateAt.END);
                nameCol.addView(tvName);

                TextView tvPhone = new TextView(this);
                tvPhone.setText(finalPhone);
                tvPhone.setTextColor(Color.parseColor("#94A3B8"));
                tvPhone.setTextSize(11.5f);
                nameCol.addView(tvPhone);

                contactBox.addView(nameCol, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

                LinearLayout.LayoutParams contactBoxParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                contactBoxParams.setMargins(0, 0, 0, (int)(12 * density));
                card.addView(contactBox, contactBoxParams);

                // --- DISPOSITION CHIPS (6 Options) ---
                TextView tvStatusLabel = new TextView(this);
                tvStatusLabel.setText("SELECT LEAD OUTCOME:");
                tvStatusLabel.setTextColor(Color.parseColor("#94A3B8"));
                tvStatusLabel.setTextSize(10f);
                tvStatusLabel.setTypeface(null, Typeface.BOLD);
                tvStatusLabel.setPadding(0, 0, 0, (int)(6 * density));
                card.addView(tvStatusLabel);

                String[] dispositions = {
                    "🎯 Interested", "📅 Meeting Set", "⏰ Follow-up",
                    "❌ Not Interested", "📵 Callback", "🚫 Wrong Number"
                };
                final String[] selectedDisp = {"Interested"};
                final String[] selectedFollowUpDate = {""};
                final String[] selectedFollowUpTime = {""};

                LinearLayout row1 = new LinearLayout(this);
                row1.setOrientation(LinearLayout.HORIZONTAL);
                row1.setPadding(0, 0, 0, (int)(6 * density));

                LinearLayout row2 = new LinearLayout(this);
                row2.setOrientation(LinearLayout.HORIZONTAL);
                row2.setPadding(0, 0, 0, (int)(12 * density));

                List<TextView> allDispButtons = new ArrayList<>();

                // --- FOLLOW-UP TIME & REMINDER SECTION ---
                LinearLayout followUpHeaderRow = new LinearLayout(this);
                followUpHeaderRow.setOrientation(LinearLayout.HORIZONTAL);
                followUpHeaderRow.setGravity(Gravity.CENTER_VERTICAL);
                followUpHeaderRow.setPadding(0, 0, 0, (int)(6 * density));

                TextView tvFollowUpLabel = new TextView(this);
                tvFollowUpLabel.setText("FOLLOW-UP TIME:");
                tvFollowUpLabel.setTextColor(Color.parseColor("#94A3B8"));
                tvFollowUpLabel.setTextSize(10f);
                tvFollowUpLabel.setTypeface(null, Typeface.BOLD);
                followUpHeaderRow.addView(tvFollowUpLabel, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

                TextView tvFollowUpDisplay = new TextView(this);
                tvFollowUpDisplay.setText("Not Set");
                tvFollowUpDisplay.setTextColor(Color.parseColor("#64748B"));
                tvFollowUpDisplay.setTextSize(10.5f);
                tvFollowUpDisplay.setTypeface(null, Typeface.BOLD);
                followUpHeaderRow.addView(tvFollowUpDisplay);

                card.addView(followUpHeaderRow);

                // Quick Presets Row: [Today 5 PM] [Tomorrow 11 AM] [In 2 Days]
                LinearLayout presetsRow = new LinearLayout(this);
                presetsRow.setOrientation(LinearLayout.HORIZONTAL);
                presetsRow.setPadding(0, 0, 0, (int)(12 * density));

                TextView btnToday = new TextView(this);
                btnToday.setText("Today 5 PM");
                btnToday.setTextSize(10.5f);
                btnToday.setGravity(Gravity.CENTER);
                btnToday.setClickable(true);
                btnToday.setFocusable(false);
                btnToday.setPadding((int)(8 * density), (int)(8 * density), (int)(8 * density), (int)(8 * density));

                TextView btnTomorrow = new TextView(this);
                btnTomorrow.setText("Tomorrow 11 AM");
                btnTomorrow.setTextSize(10.5f);
                btnTomorrow.setGravity(Gravity.CENTER);
                btnTomorrow.setClickable(true);
                btnTomorrow.setFocusable(false);
                btnTomorrow.setPadding((int)(8 * density), (int)(8 * density), (int)(8 * density), (int)(8 * density));

                TextView btnIn2Days = new TextView(this);
                btnIn2Days.setText("In 2 Days");
                btnIn2Days.setTextSize(10.5f);
                btnIn2Days.setGravity(Gravity.CENTER);
                btnIn2Days.setClickable(true);
                btnIn2Days.setFocusable(false);
                btnIn2Days.setPadding((int)(8 * density), (int)(8 * density), (int)(8 * density), (int)(8 * density));

                List<TextView> presetButtons = new ArrayList<>();
                presetButtons.add(btnToday);
                presetButtons.add(btnTomorrow);
                presetButtons.add(btnIn2Days);

                for (TextView pb : presetButtons) {
                    GradientDrawable unselected = new GradientDrawable();
                    unselected.setCornerRadius(12 * density);
                    unselected.setColor(Color.parseColor("#072725"));
                    unselected.setStroke((int)(1 * density), Color.parseColor("#134E4A"));
                    pb.setBackground(unselected);
                    pb.setTextColor(Color.parseColor("#94A3B8"));
                    LinearLayout.LayoutParams pbp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
                    pbp.setMargins((int)(3 * density), 0, (int)(3 * density), 0);
                    pb.setLayoutParams(pbp);
                    presetsRow.addView(pb);
                }
                card.addView(presetsRow);

                // Helper to reset preset button styles
                Runnable resetPresets = () -> {
                    for (TextView pb : presetButtons) {
                        GradientDrawable unsel = new GradientDrawable();
                        unsel.setCornerRadius(12 * density);
                        unsel.setColor(Color.parseColor("#072725"));
                        unsel.setStroke((int)(1 * density), Color.parseColor("#134E4A"));
                        pb.setBackground(unsel);
                        pb.setTextColor(Color.parseColor("#94A3B8"));
                    }
                };

                // Preset button listeners (100% crash-free, instant response)
                btnToday.setOnClickListener(v -> {
                    Calendar cal = Calendar.getInstance();
                    if (cal.get(Calendar.HOUR_OF_DAY) >= 17) {
                        cal.add(Calendar.DAY_OF_YEAR, 1);
                    }
                    String dStr = new SimpleDateFormat("dd MMM yyyy", Locale.getDefault()).format(cal.getTime());
                    selectedFollowUpDate[0] = dStr;
                    selectedFollowUpTime[0] = "05:00 PM";
                    tvFollowUpDisplay.setText("📅 Today • 05:00 PM");
                    tvFollowUpDisplay.setTextColor(Color.parseColor("#5EEAD4"));

                    resetPresets.run();
                    GradientDrawable sel = new GradientDrawable();
                    sel.setCornerRadius(12 * density);
                    sel.setColor(Color.parseColor("#0D9488"));
                    sel.setStroke((int)(1 * density), Color.parseColor("#14B8A6"));
                    btnToday.setBackground(sel);
                    btnToday.setTextColor(Color.WHITE);
                });

                btnTomorrow.setOnClickListener(v -> {
                    Calendar cal = Calendar.getInstance();
                    cal.add(Calendar.DAY_OF_YEAR, 1);
                    String dStr = new SimpleDateFormat("dd MMM yyyy", Locale.getDefault()).format(cal.getTime());
                    selectedFollowUpDate[0] = dStr;
                    selectedFollowUpTime[0] = "11:00 AM";
                    tvFollowUpDisplay.setText("📅 Tomorrow • 11:00 AM");
                    tvFollowUpDisplay.setTextColor(Color.parseColor("#5EEAD4"));

                    resetPresets.run();
                    GradientDrawable sel = new GradientDrawable();
                    sel.setCornerRadius(12 * density);
                    sel.setColor(Color.parseColor("#0D9488"));
                    sel.setStroke((int)(1 * density), Color.parseColor("#14B8A6"));
                    btnTomorrow.setBackground(sel);
                    btnTomorrow.setTextColor(Color.WHITE);
                });

                btnIn2Days.setOnClickListener(v -> {
                    Calendar cal = Calendar.getInstance();
                    cal.add(Calendar.DAY_OF_YEAR, 2);
                    String dStr = new SimpleDateFormat("dd MMM yyyy", Locale.getDefault()).format(cal.getTime());
                    selectedFollowUpDate[0] = dStr;
                    selectedFollowUpTime[0] = "03:00 PM";
                    tvFollowUpDisplay.setText("📅 " + dStr + " • 03:00 PM");
                    tvFollowUpDisplay.setTextColor(Color.parseColor("#5EEAD4"));

                    resetPresets.run();
                    GradientDrawable sel = new GradientDrawable();
                    sel.setCornerRadius(12 * density);
                    sel.setColor(Color.parseColor("#0D9488"));
                    sel.setStroke((int)(1 * density), Color.parseColor("#14B8A6"));
                    btnIn2Days.setBackground(sel);
                    btnIn2Days.setTextColor(Color.WHITE);
                });

                // Setup Disposition Buttons
                for (int i = 0; i < dispositions.length; i++) {
                    final String disp = dispositions[i];
                    TextView btn = new TextView(this);
                    btn.setText(disp);
                    btn.setTextSize(10.5f);
                    btn.setGravity(Gravity.CENTER);
                    btn.setClickable(true);
                    btn.setFocusable(false);
                    btn.setPadding((int)(8 * density), (int)(8 * density), (int)(8 * density), (int)(8 * density));

                    GradientDrawable btnBg = new GradientDrawable();
                    btnBg.setCornerRadius(12 * density);
                    btnBg.setColor(disp.contains("Interested") && !disp.contains("Not") ? Color.parseColor("#0D9488") : Color.parseColor("#072725"));
                    btnBg.setStroke((int)(1 * density), disp.contains("Interested") && !disp.contains("Not") ? Color.parseColor("#14B8A6") : Color.parseColor("#134E4A"));
                    btn.setBackground(btnBg);
                    btn.setTextColor(disp.contains("Interested") && !disp.contains("Not") ? Color.WHITE : Color.parseColor("#94A3B8"));

                    LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
                    btnParams.setMargins((int)(3 * density), 0, (int)(3 * density), 0);
                    btn.setLayoutParams(btnParams);

                    btn.setOnClickListener(v -> {
                        selectedDisp[0] = disp.replaceAll("[^a-zA-Z -]", "").trim();
                        for (TextView b : allDispButtons) {
                            GradientDrawable unselected = new GradientDrawable();
                            unselected.setCornerRadius(12 * density);
                            unselected.setColor(Color.parseColor("#072725"));
                            unselected.setStroke((int)(1 * density), Color.parseColor("#134E4A"));
                            b.setBackground(unselected);
                            b.setTextColor(Color.parseColor("#94A3B8"));
                        }
                        GradientDrawable selected = new GradientDrawable();
                        selected.setCornerRadius(12 * density);
                        selected.setColor(Color.parseColor("#0D9488")); // Emerald Active
                        selected.setStroke((int)(1 * density), Color.parseColor("#14B8A6"));
                        btn.setBackground(selected);
                        btn.setTextColor(Color.WHITE);

                        // If "Meeting Set" or "Follow-up" selected, automatically set Tomorrow 11 AM preset
                        if ((disp.contains("Meeting") || disp.contains("Follow-up")) && selectedFollowUpDate[0].isEmpty()) {
                            btnTomorrow.performClick();
                        }
                    });

                    allDispButtons.add(btn);
                    if (i < 3) row1.addView(btn);
                    else row2.addView(btn);
                }
                card.addView(row1);
                card.addView(row2);

                // --- NOTES / REMARKS INPUT ---
                TextView tvNotesLabel = new TextView(this);
                tvNotesLabel.setText("NOTES / REMARKS:");
                tvNotesLabel.setTextColor(Color.parseColor("#94A3B8"));
                tvNotesLabel.setTextSize(10f);
                tvNotesLabel.setTypeface(null, Typeface.BOLD);
                tvNotesLabel.setPadding(0, 0, 0, (int)(4 * density));
                card.addView(tvNotesLabel);

                EditText etNotes = new EditText(this);
                etNotes.setHint("Remarks / Deal size / Client budget...");
                etNotes.setHintTextColor(Color.parseColor("#4B6B68"));
                etNotes.setTextColor(Color.WHITE);
                etNotes.setTextSize(11.5f);
                etNotes.setPadding((int)(12 * density), (int)(10 * density), (int)(12 * density), (int)(10 * density));
                etNotes.setMinLines(2);
                etNotes.setMaxLines(3);

                GradientDrawable inputBg = new GradientDrawable();
                inputBg.setColor(Color.parseColor("#072725"));
                inputBg.setCornerRadius(12 * density);
                inputBg.setStroke((int)(1 * density), Color.parseColor("#134E4A"));
                etNotes.setBackground(inputBg);
                card.addView(etNotes);

                // --- ACTIONS ROW (Skip & Save to CRM) ---
                LinearLayout actionsRow = new LinearLayout(this);
                actionsRow.setOrientation(LinearLayout.HORIZONTAL);
                actionsRow.setGravity(Gravity.CENTER_VERTICAL);
                actionsRow.setPadding(0, (int)(14 * density), 0, 0);

                TextView btnSkip = new TextView(this);
                btnSkip.setText("Skip");
                btnSkip.setTextColor(Color.parseColor("#94A3B8"));
                btnSkip.setTextSize(13f);
                btnSkip.setGravity(Gravity.CENTER);
                btnSkip.setClickable(true);
                btnSkip.setFocusable(false);
                btnSkip.setPadding((int)(12 * density), (int)(10 * density), (int)(12 * density), (int)(10 * density));
                btnSkip.setOnClickListener(v -> {
                    closeThisDialog.run();
                    new Thread(() -> {
                        uploadToCRM(durationSeconds, "Completed", "Call follow-up skipped", audioInfo, callId, "", "", finalSimSlot, finalPhone, resolvedCustName, finalType);
                    }).start();
                });
                LinearLayout.LayoutParams skipParams = new LinearLayout.LayoutParams(0, (int)(44 * density), 0.7f);
                skipParams.setMargins(0, 0, (int)(8 * density), 0);
                actionsRow.addView(btnSkip, skipParams);

                TextView btnSave = new TextView(this);
                btnSave.setText("💾  Save to CRM");
                btnSave.setTextSize(13.5f);
                btnSave.setTypeface(null, Typeface.BOLD);
                btnSave.setTextColor(Color.WHITE);
                btnSave.setGravity(Gravity.CENTER);
                btnSave.setClickable(true);
                btnSave.setFocusable(false);
                btnSave.setPadding((int)(12 * density), (int)(10 * density), (int)(12 * density), (int)(10 * density));

                GradientDrawable saveBg = new GradientDrawable();
                saveBg.setColor(Color.parseColor("#0D9488")); // Glowing Emerald Teal
                saveBg.setCornerRadius(14 * density);
                btnSave.setBackground(saveBg);

                LinearLayout.LayoutParams saveParams = new LinearLayout.LayoutParams(0, (int)(44 * density), 2.3f);
                btnSave.setLayoutParams(saveParams);

                btnSave.setOnClickListener(v -> {
                    String customNotes = etNotes.getText().toString().trim();
                    if (customNotes.isEmpty()) {
                        customNotes = "Call logged via Android Companion";
                    }

                    // 1. Instantly close screen (0ms delay)
                    closeThisDialog.run();
                    Toast.makeText(this, "✅ Saved & Synced to CRM!", Toast.LENGTH_SHORT).show();

                    // 2. Heavy audio upload + CRM sync run in detached background thread
                    final String notesToSync = customNotes;
                    new Thread(() -> {
                        uploadToCRM(durationSeconds, selectedDisp[0], notesToSync, audioInfo, callId, selectedFollowUpDate[0], selectedFollowUpTime[0], finalSimSlot, finalPhone, resolvedCustName, finalType);
                    }).start();
                });

                actionsRow.addView(btnSave);
                card.addView(actionsRow);

                rootOverlay.addView(card);

                // WindowManager Layout Parameters
                int layoutFlag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O 
                    ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY 
                    : WindowManager.LayoutParams.TYPE_PHONE;

                int windowFlags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                    | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;

                WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    layoutFlag,
                    windowFlags,
                    PixelFormat.TRANSLUCENT
                );

                params.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN;
                params.gravity = Gravity.CENTER;

                // Dynamically allow focus ONLY when typing in etNotes
                etNotes.setOnTouchListener((v, event) -> {
                    if (event.getAction() == MotionEvent.ACTION_UP) {
                        params.flags &= ~WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
                        if (windowManager != null && postCallDialogView != null && postCallDialogView.isAttachedToWindow()) {
                            windowManager.updateViewLayout(postCallDialogView, params);
                        }
                        etNotes.requestFocus();
                        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                        if (imm != null) imm.showSoftInput(etNotes, InputMethodManager.SHOW_IMPLICIT);
                    }
                    return false;
                });

                postCallDialogView = rootOverlay;
                windowManager.addView(postCallDialogView, params);

                // Auto-Dismiss Safety Timer: Dismiss after 60 seconds if untouched
                autoDismissRunnable = () -> {
                    closeThisDialog.run();
                    new Thread(() -> {
                        uploadToCRM(durationSeconds, "Interested", "Auto-synced after timeout", audioInfo, callId, "", "", finalSimSlot, finalPhone, resolvedCustName, finalType);
                    }).start();
                };
                autoDismissHandler.postDelayed(autoDismissRunnable, 60000);

            } catch (Exception e) {
                Log.e(TAG, "Error displaying post-call dialog: " + e.getMessage());
                new Thread(() -> {
                    uploadToCRM(durationSeconds, "Completed", "Call recorded", audioInfo, callId, "", "", finalSimSlot, finalPhone, resolvedCustName, finalType);
                }).start();
            }
        });
    }

    private void dismissPostCallDialog() {
        Runnable task = () -> {
            try {
                if (autoDismissRunnable != null) {
                    autoDismissHandler.removeCallbacks(autoDismissRunnable);
                    autoDismissRunnable = null;
                }
                if (windowManager != null && postCallDialogView != null) {
                    try {
                        windowManager.removeViewImmediate(postCallDialogView);
                    } catch (Exception e1) {
                        try {
                            windowManager.removeView(postCallDialogView);
                        } catch (Exception ignored) {}
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Error dismissing post-call dialog: " + e.getMessage());
            } finally {
                postCallDialogView = null;
            }
        };

        if (Looper.myLooper() == Looper.getMainLooper()) {
            task.run();
        } else {
            new Handler(Looper.getMainLooper()).post(task);
        }
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
        uploadToCRM(durationSeconds, disposition, customNotes, audioInfo, "", "", "", (currentSimSlot != null ? currentSimSlot : "SIM 1"), phoneNumber, null, callType);
    }

    private void uploadToCRM(long durationSeconds, String disposition, String customNotes, CapturedAudioInfo audioInfo, String callId, String followUpDate, String followUpTime) {
        uploadToCRM(durationSeconds, disposition, customNotes, audioInfo, callId, followUpDate, followUpTime, (currentSimSlot != null ? currentSimSlot : "SIM 1"), phoneNumber, null, callType);
    }

    private void uploadToCRM(long durationSeconds, String disposition, String customNotes, CapturedAudioInfo audioInfo, String callId, String followUpDate, String followUpTime, String simSlot) {
        uploadToCRM(durationSeconds, disposition, customNotes, audioInfo, callId, followUpDate, followUpTime, simSlot, phoneNumber, null, callType);
    }

    private void uploadToCRM(long durationSeconds, String disposition, String customNotes, CapturedAudioInfo audioInfo, String callId, String followUpDate, String followUpTime, String simSlot, String targetPhone, String targetCustName, String targetCallType) {
        new Thread(() -> {
            SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
            String apiUrl = prefs.getString("api_url", "https://ems-backend-9hig.onrender.com");
            String agentName = prefs.getString("agent_name", "Mobile Agent");
            String agentEmail = prefs.getString("agent_email", "agent@omniflow.in");

            String activePhone = (targetPhone != null && !targetPhone.trim().isEmpty()) ? targetPhone.trim() : phoneNumber;
            String customerName = (targetCustName != null && !targetCustName.trim().isEmpty()) ? targetCustName.trim() : resolveContactOrCallerIdName(this, activePhone);
            String activeCallType = (targetCallType != null && !targetCallType.trim().isEmpty()) ? targetCallType.trim() : callType;

            String audioBase64 = null;
            CapturedAudioInfo currentAudio = (audioInfo != null) ? audioInfo : resolveAudioFiles(activePhone, customerName);
            String modeNote = currentAudio != null ? currentAudio.modeNote : "SIM Call Recording";
            if (customNotes != null && !customNotes.isEmpty()) {
                modeNote = customNotes + " (" + modeNote + ")";
            }

            Uri safFileUri = currentAudio != null ? currentAudio.safFileUri : null;
            File backupFileToUpload = currentAudio != null ? currentAudio.backupFileToUpload : null;
            byte[] fullBytes = null;
            long finalFileSize = 0;

            // Convert selected file to Base64 (Full Audio Stream)
            try {
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

            // Direct Supabase Sandbox Sync: Uploads voice audio to Storage CDN + updates call log + updates CRM Lead!
            try {
                byte[] bytesToSend = (fullBytes != null && fullBytes.length > 500) ? fullBytes : null;
                SupabaseSyncEngine.syncStage2FollowUp(
                    this,
                    activePhone,
                    customerName,
                    agentName,
                    activeCallType,
                    durationSeconds,
                    disposition,
                    customNotes,
                    bytesToSend,
                    callId,
                    followUpDate,
                    followUpTime,
                    simSlot
                );

                // Stage 3 Telecaller Device Health & Compliance Telemetry
                if (bytesToSend != null) {
                    SupabaseSyncEngine.sendDeviceHealth(this, "RECORDING_SUCCESS", "Audio captured successfully (" + bytesToSend.length + " bytes)");
                } else if (durationSeconds > 10) {
                    String currentFolder = prefs.getString("selected_folder_uri", "");
                    if (currentFolder.isEmpty()) {
                        SupabaseSyncEngine.sendDeviceHealth(this, "FOLDER_NOT_LINKED", "Call finished (" + durationSeconds + "s) but Call Recordings folder is NOT configured");
                    } else {
                        SupabaseSyncEngine.sendDeviceHealth(this, "RECORDING_MISSING", "Call finished (" + durationSeconds + "s) but audio file was not found. Native call recording may be OFF");
                    }
                }
            } catch (Exception se) {
                Log.e(TAG, "Stage 2 SupabaseSync notice: " + se.getMessage());
            }

            // Post to Firebase Firestore
            boolean uploadSuccess = false;
            try {
                postToFirebaseFirestore(activePhone, customerName, activeCallType, durationSeconds, agentName, audioBase64, disposition, modeNote, simSlot, followUpDate, followUpTime);
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
                    + "\"customerPhone\":\"" + escapeJson(activePhone) + "\","
                    + "\"customerName\":\"" + escapeJson(customerName) + "\","
                    + "\"channel\":\"SIM\","
                    + "\"type\":\"" + escapeJson(activeCallType) + "\","
                    + "\"durationSeconds\":" + durationSeconds + ","
                    + "\"timestamp\":\"" + timestamp + "\","
                    + "\"disposition\":\"" + escapeJson(disposition) + "\","
                    + "\"notes\":\"" + escapeJson(modeNote) + "\","
                    + "\"simSlot\":\"" + escapeJson(simSlot != null ? simSlot : "SIM 1") + "\""
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

            // Clean up / Delete the call recording file after successful upload to save phone memory
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
        postToFirebaseFirestore(phone, customerName, type, duration, agent, audioBase64, disposition, modeNote, "SIM 1", "", "");
    }

    private void postToFirebaseFirestore(String phone, String customerName, String type, long duration, String agent, String audioBase64, String disposition, String modeNote, String simSlot) {
        postToFirebaseFirestore(phone, customerName, type, duration, agent, audioBase64, disposition, modeNote, simSlot, "", "");
    }

    private void postToFirebaseFirestore(String phone, String customerName, String type, long duration, String agent, String audioBase64, String disposition, String modeNote, String simSlot, String followUpDate, String followUpTime) {
        try {
            long now = System.currentTimeMillis();
            String timestamp = new SimpleDateFormat("dd/MM/yyyy, hh:mm:ss aa", Locale.getDefault()).format(new Date());
            String safePhone = escapeJson(phone);
            String safeCustName = escapeJson((customerName != null && !customerName.trim().isEmpty()) ? customerName : phone);
            String safeAgent = escapeJson(agent);
            String recUrl = (audioBase64 != null && audioBase64.length() > 0) ? escapeJson(audioBase64) : "";
            String safeSim = escapeJson(simSlot != null ? simSlot : "SIM 1");

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
                    + "\"simSlot\":{\"stringValue\":\"" + safeSim + "\"},"
                    + (followUpDate != null && !followUpDate.isEmpty() ? "\"followUpDate\":{\"stringValue\":\"" + escapeJson(followUpDate) + "\"}," : "")
                    + (followUpTime != null && !followUpTime.isEmpty() ? "\"followUpTime\":{\"stringValue\":\"" + escapeJson(followUpTime) + "\"}," : "")
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
