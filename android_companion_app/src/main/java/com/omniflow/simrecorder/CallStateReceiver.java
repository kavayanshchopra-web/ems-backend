package com.omniflow.simrecorder;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.os.Build;
import android.os.Bundle;
import android.provider.CallLog;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.telephony.TelephonyManager;
import android.util.Log;
import androidx.core.content.ContextCompat;
import java.util.List;

public class CallStateReceiver extends BroadcastReceiver {
    private static final String TAG = "OmniFlowSIMCall";

    public static String resolveSimSlotFromIntent(Context context, Intent intent) {
        if (intent == null) return "SIM 1";
        try {
            Bundle extras = intent.getExtras();
            if (extras == null) return "SIM 1";

            int subId = -1;
            int slotId = -1;

            if (extras.containsKey("subscription")) subId = extras.getInt("subscription", -1);
            else if (extras.containsKey("Subscription")) subId = extras.getInt("Subscription", -1);
            else if (extras.containsKey("android.telephony.extra.SUBSCRIPTION_INDEX")) subId = extras.getInt("android.telephony.extra.SUBSCRIPTION_INDEX", -1);
            else if (extras.containsKey("sub_id")) subId = extras.getInt("sub_id", -1);

            if (extras.containsKey("simSlot")) slotId = extras.getInt("simSlot", -1);
            else if (extras.containsKey("sim_slot")) slotId = extras.getInt("sim_slot", -1);
            else if (extras.containsKey("slot")) slotId = extras.getInt("slot", -1);
            else if (extras.containsKey("slot_id")) slotId = extras.getInt("slot_id", -1);
            else if (extras.containsKey("com.android.phone.extra.slot")) slotId = extras.getInt("com.android.phone.extra.slot", -1);
            else if (extras.containsKey("phone")) slotId = extras.getInt("phone", -1);

            if (slotId == 1 || slotId == 2) return "SIM 2";
            if (slotId == 0) return "SIM 1";

            if (subId != -1 && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                    SubscriptionManager sm = (SubscriptionManager) context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                    if (sm != null) {
                        SubscriptionInfo info = sm.getActiveSubscriptionInfo(subId);
                        if (info != null) {
                            return "SIM " + (info.getSimSlotIndex() + 1);
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Sim extraction from intent notice: " + e.getMessage());
        }
        return "SIM 1";
    }

    public static String detectActiveSim(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                    SubscriptionManager sm = (SubscriptionManager) context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                    TelephonyManager tm = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
                    if (sm != null && tm != null) {
                        List<SubscriptionInfo> subs = sm.getActiveSubscriptionInfoList();
                        if (subs != null && subs.size() > 1) {
                            for (SubscriptionInfo sub : subs) {
                                try {
                                    TelephonyManager subTm = tm.createForSubscriptionId(sub.getSubscriptionId());
                                    int state = subTm.getCallState();
                                    if (state == TelephonyManager.CALL_STATE_OFFHOOK || state == TelephonyManager.CALL_STATE_RINGING) {
                                        int slot = sub.getSimSlotIndex();
                                        Log.d(TAG, "🎯 Active call hardware match: subId=" + sub.getSubscriptionId() + ", slot=" + slot + " -> SIM " + (slot + 1));
                                        return "SIM " + (slot + 1);
                                    }
                                } catch (Exception ignored) {}
                            }
                        }
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "detectActiveSim notice: " + e.getMessage());
            }
        }
        return "SIM 1";
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;

        SharedPreferences prefs = context.getSharedPreferences("omniflow", Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean("recording_enabled", true);
        if (!enabled) {
            Log.d(TAG, "Call logging disabled in SharedPreferences. Skipping.");
            return;
        }

        String broadcastSim = resolveSimSlotFromIntent(context, intent);
        String liveSim = detectActiveSim(context);
        String currentDetectedSim = !"SIM 1".equals(liveSim) ? liveSim : broadcastSim;
        if (currentDetectedSim != null && !"SIM 1".equals(currentDetectedSim)) {
            prefs.edit().putString("active_call_sim", currentDetectedSim).apply();
        }

        if (action.equals("android.intent.action.NEW_OUTGOING_CALL")) {
            String outgoingNumber = intent.getStringExtra("android.intent.extra.PHONE_NUMBER");
            if (outgoingNumber == null) {
                outgoingNumber = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER);
            }
            if (outgoingNumber != null && !outgoingNumber.isEmpty()) {
                long callStartTime = System.currentTimeMillis();
                String rawDigits = outgoingNumber.replaceAll("\\D", "");
                String norm10 = rawDigits.length() >= 10 ? rawDigits.substring(rawDigits.length() - 10) : rawDigits;
                String uniqueCallId = "call_" + callStartTime + "_" + norm10;

                String activeSim = prefs.getString("active_call_sim", currentDetectedSim);

                prefs.edit()
                    .putString("active_call_number", outgoingNumber)
                    .putString("active_call_id", uniqueCallId)
                    .putString("active_call_sim", activeSim)
                    .putBoolean("is_incoming", false)
                    .putBoolean("call_in_progress", true)
                    .putLong("call_start_time", callStartTime)
                    .apply();
                Log.d(TAG, "NEW_OUTGOING_CALL detected for: " + outgoingNumber + " [SIM: " + activeSim + ", CallID: " + uniqueCallId + "]");

                Intent startIntent = new Intent(context, CallRecordingService.class);
                startIntent.setAction(CallRecordingService.ACTION_START_RECORDING);
                startIntent.putExtra("phone_number", outgoingNumber);
                startIntent.putExtra("call_type", "OUTGOING");
                startIntent.putExtra("sim_slot", activeSim);
                startIntent.putExtra("start_time", callStartTime);
                startIntent.putExtra("call_id", uniqueCallId);

                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(startIntent);
                    } else {
                        context.startService(startIntent);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Failed to start CallRecordingService on NEW_OUTGOING_CALL: " + e.getMessage());
                }
            }
        } else if (action.equals(TelephonyManager.ACTION_PHONE_STATE_CHANGED)) {
            String stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
            String incomingNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);

            Log.d(TAG, "PHONE_STATE changed: " + stateStr);

            if (TelephonyManager.EXTRA_STATE_RINGING.equals(stateStr)) {
                // RINGING state ONLY occurs for real incoming calls!
                if (incomingNumber != null && !incomingNumber.isEmpty()) {
                    prefs.edit().putString("active_call_number", incomingNumber).apply();
                }
                String activeSim = prefs.getString("active_call_sim", currentDetectedSim);
                prefs.edit()
                    .putBoolean("is_incoming", true)
                    .putBoolean("call_answered", false)
                    .putString("active_call_sim", activeSim)
                    .apply();
                Log.d(TAG, "Incoming Call Ringing...");

                // Show In-Call Floating Caller Card immediately on ringing
                String number = (incomingNumber != null && !incomingNumber.isEmpty()) ? incomingNumber : prefs.getString("active_call_number", "");
                if (number == null || number.isEmpty()) {
                    number = fetchLatestCallNumber(context);
                }
                Intent showCardIntent = new Intent(context, CallRecordingService.class);
                showCardIntent.setAction(CallRecordingService.ACTION_SHOW_IN_CALL_CARD);
                showCardIntent.putExtra("phone_number", (number != null && !number.isEmpty()) ? number : "Customer");
                showCardIntent.putExtra("call_type", "INCOMING");
                showCardIntent.putExtra("sim_slot", activeSim);
                showCardIntent.putExtra("start_time", System.currentTimeMillis());

                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(showCardIntent);
                    } else {
                        context.startService(showCardIntent);
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Notice starting service on RINGING: " + e.getMessage());
                }
            } else if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(stateStr)) {
                Log.d(TAG, "Call Active (OFFHOOK). Starting CallRecordingService...");
                long callStartTime = System.currentTimeMillis();

                String number = prefs.getString("active_call_number", "");
                if (number == null || number.isEmpty() || number.equalsIgnoreCase("Customer")) {
                    String latest = fetchLatestCallNumber(context);
                    if (latest != null && !latest.isEmpty() && !latest.equalsIgnoreCase("Customer")) {
                        number = latest;
                    }
                }

                // If OFFHOOK is reached WITHOUT prior RINGING, this is 100% guaranteed an OUTGOING call!
                boolean isIncoming = prefs.getBoolean("is_incoming", false);
                String callDirection = isIncoming ? "INCOMING" : "OUTGOING";

                // Re-evaluate SIM during active OFFHOOK:
                String hookSim = detectActiveSim(context);
                String activeSim = !"SIM 1".equals(hookSim) ? hookSim : prefs.getString("active_call_sim", currentDetectedSim);
                if (!"SIM 1".equals(activeSim)) {
                    prefs.edit().putString("active_call_sim", activeSim).apply();
                }

                String rawDigits = (number != null) ? number.replaceAll("\\D", "") : "0";
                String norm10 = rawDigits.length() >= 10 ? rawDigits.substring(rawDigits.length() - 10) : rawDigits;
                String activeId = prefs.getString("active_call_id", "");
                String uniqueCallId = (!activeId.isEmpty()) ? activeId : ("call_" + callStartTime + "_" + norm10);

                prefs.edit()
                    .putBoolean("call_in_progress", true)
                    .putBoolean("call_answered", true)
                    .putBoolean("is_incoming", isIncoming)
                    .putLong("call_start_time", callStartTime)
                    .putString("active_call_id", uniqueCallId)
                    .putString("active_call_sim", activeSim)
                    .putString("active_call_number", (number != null && !number.isEmpty()) ? number : "Customer")
                    .apply();

                Intent startIntent = new Intent(context, CallRecordingService.class);
                startIntent.setAction(CallRecordingService.ACTION_START_RECORDING);
                startIntent.putExtra("phone_number", (number != null && !number.isEmpty()) ? number : "Customer");
                startIntent.putExtra("call_type", callDirection);
                startIntent.putExtra("sim_slot", activeSim);
                startIntent.putExtra("start_time", callStartTime);
                startIntent.putExtra("call_id", uniqueCallId);

                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(startIntent);
                    } else {
                        context.startService(startIntent);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Failed to start CallRecordingService: " + e.getMessage());
                }
            } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(stateStr)) {
                Log.d(TAG, "Call Ended (IDLE). Triggering Stop Recording & Audio Scan...");

                String number = prefs.getString("active_call_number", "");
                if (number == null || number.isEmpty() || number.equalsIgnoreCase("Customer")) {
                    number = fetchLatestCallNumber(context);
                }
                boolean isIncoming = prefs.getBoolean("is_incoming", false);
                boolean wasAnswered = prefs.getBoolean("call_answered", false);
                boolean wasMissed = isIncoming && !wasAnswered;

                String activeSim = prefs.getString("active_call_sim", currentDetectedSim);

                String rawDigits = (number != null) ? number.replaceAll("\\D", "") : "0";
                String norm10 = rawDigits.length() >= 10 ? rawDigits.substring(rawDigits.length() - 10) : rawDigits;
                String activeCallId = prefs.getString("active_call_id", "");
                if (activeCallId == null || activeCallId.isEmpty()) {
                    activeCallId = "call_" + System.currentTimeMillis() + "_" + norm10;
                }

                String finalCallType = wasMissed ? "MISSED" : (isIncoming ? "INCOMING" : "OUTGOING");

                Intent stopIntent = new Intent(context, CallRecordingService.class);
                stopIntent.setAction(CallRecordingService.ACTION_STOP_RECORDING);
                stopIntent.putExtra("phone_number", (number != null && !number.isEmpty()) ? number : "Customer");
                stopIntent.putExtra("call_type", finalCallType);
                stopIntent.putExtra("sim_slot", activeSim);
                stopIntent.putExtra("was_missed", wasMissed);
                stopIntent.putExtra("call_id", activeCallId);

                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(stopIntent);
                    } else {
                        context.startService(stopIntent);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Failed to send stop service signal: " + e.getMessage());
                }

                // Reset call active flag & direction cleanly
                prefs.edit()
                    .putBoolean("call_in_progress", false)
                    .putBoolean("is_incoming", false)
                    .putBoolean("call_answered", false)
                    .putString("active_call_number", "")
                    .putString("active_call_id", "")
                    .apply();
            }
        }
    }

    private String fetchLatestCallNumber(Context context) {
        try {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED) {
                Cursor cursor = context.getContentResolver().query(
                    CallLog.Calls.CONTENT_URI,
                    new String[]{CallLog.Calls.NUMBER},
                    null, null,
                    CallLog.Calls.DATE + " DESC"
                );
                if (cursor != null && cursor.moveToFirst()) {
                    String num = cursor.getString(0);
                    cursor.close();
                    return num;
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error fetching latest call number from CallLog: " + e.getMessage());
        }
        return "Customer";
    }
}
