package com.omniflow.simrecorder;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.os.Build;
import android.provider.CallLog;
import android.telephony.TelephonyManager;
import android.util.Log;
import androidx.core.content.ContextCompat;

public class CallStateReceiver extends BroadcastReceiver {
    private static final String TAG = "OmniFlowSIMCall";

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

                prefs.edit()
                    .putString("active_call_number", outgoingNumber)
                    .putString("active_call_id", uniqueCallId)
                    .putBoolean("is_incoming", false)
                    .putBoolean("call_in_progress", true)
                    .putLong("call_start_time", callStartTime)
                    .apply();
                Log.d(TAG, "NEW_OUTGOING_CALL detected. Starting In-Call Floating Card for: " + outgoingNumber + " [CallID: " + uniqueCallId + "]");

                Intent startIntent = new Intent(context, CallRecordingService.class);
                startIntent.setAction(CallRecordingService.ACTION_START_RECORDING);
                startIntent.putExtra("phone_number", outgoingNumber);
                startIntent.putExtra("call_type", "OUTGOING");
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
            if (incomingNumber != null && !incomingNumber.isEmpty()) {
                prefs.edit()
                    .putString("active_call_number", incomingNumber)
                    .putBoolean("is_incoming", true)
                    .apply();
            }

            Log.d(TAG, "PHONE_STATE changed: " + stateStr);

            if (TelephonyManager.EXTRA_STATE_RINGING.equals(stateStr)) {
                prefs.edit()
                    .putBoolean("is_incoming", true)
                    .putBoolean("call_answered", false)
                    .apply();
                Log.d(TAG, "Incoming Call Ringing...");

                // Show In-Call Floating Caller Card immediately on ringing (Do NOT record mic yet while ringtone is playing)
                String number = (incomingNumber != null && !incomingNumber.isEmpty()) ? incomingNumber : prefs.getString("active_call_number", "");
                if (number == null || number.isEmpty()) {
                    number = fetchLatestCallNumber(context);
                }
                Intent showCardIntent = new Intent(context, CallRecordingService.class);
                showCardIntent.setAction(CallRecordingService.ACTION_SHOW_IN_CALL_CARD);
                showCardIntent.putExtra("phone_number", (number != null && !number.isEmpty()) ? number : "Customer");
                showCardIntent.putExtra("call_type", "INCOMING");
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
                boolean isIncoming = prefs.getBoolean("is_incoming", false);
                String rawDigits = (number != null) ? number.replaceAll("\\D", "") : "0";
                String norm10 = rawDigits.length() >= 10 ? rawDigits.substring(rawDigits.length() - 10) : rawDigits;
                String activeId = prefs.getString("active_call_id", "");
                String uniqueCallId = (!activeId.isEmpty()) ? activeId : ("call_" + callStartTime + "_" + norm10);

                prefs.edit()
                    .putBoolean("call_in_progress", true)
                    .putBoolean("call_answered", true)
                    .putLong("call_start_time", callStartTime)
                    .putString("active_call_id", uniqueCallId)
                    .putString("active_call_number", (number != null && !number.isEmpty()) ? number : "Customer")
                    .apply();

                Intent startIntent = new Intent(context, CallRecordingService.class);
                startIntent.setAction(CallRecordingService.ACTION_START_RECORDING);
                startIntent.putExtra("phone_number", (number != null && !number.isEmpty()) ? number : "Customer");
                startIntent.putExtra("call_type", isIncoming ? "INCOMING" : "OUTGOING");
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

                String rawDigits = (number != null) ? number.replaceAll("\\D", "") : "0";
                String norm10 = rawDigits.length() >= 10 ? rawDigits.substring(rawDigits.length() - 10) : rawDigits;
                String activeCallId = prefs.getString("active_call_id", "");
                if (activeCallId == null || activeCallId.isEmpty()) {
                    activeCallId = "call_" + System.currentTimeMillis() + "_" + norm10;
                }

                Intent stopIntent = new Intent(context, CallRecordingService.class);
                stopIntent.setAction(CallRecordingService.ACTION_STOP_RECORDING);
                stopIntent.putExtra("phone_number", (number != null && !number.isEmpty()) ? number : "Customer");
                stopIntent.putExtra("call_type", wasMissed ? "MISSED" : (isIncoming ? "INCOMING" : "OUTGOING"));
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

                // Reset call active flag & direction
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
