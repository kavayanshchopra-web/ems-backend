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

    private static String lastPhoneState = TelephonyManager.EXTRA_STATE_IDLE;
    private static boolean wasRinging = false;
    private static String currentCallNumber = "";

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
                currentCallNumber = outgoingNumber;
                wasRinging = false;
                long callStartTime = System.currentTimeMillis();
                prefs.edit()
                    .putString("active_call_number", outgoingNumber)
                    .putBoolean("is_incoming", false)
                    .putBoolean("was_ringing", false)
                    .putBoolean("call_in_progress", true)
                    .putLong("call_start_time", callStartTime)
                    .apply();
                Log.d(TAG, "NEW_OUTGOING_CALL detected for: " + outgoingNumber);
            }
        } else if (action.equals(TelephonyManager.ACTION_PHONE_STATE_CHANGED)) {
            String stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
            String incomingNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);

            if (incomingNumber != null && !incomingNumber.isEmpty()) {
                currentCallNumber = incomingNumber;
                prefs.edit().putString("active_call_number", incomingNumber).apply();
            }

            Log.d(TAG, "PHONE_STATE changed: " + stateStr + " (last: " + lastPhoneState + ", wasRinging: " + wasRinging + ")");

            if (TelephonyManager.EXTRA_STATE_RINGING.equals(stateStr)) {
                // Phone is ringing: track incoming call, but DO NOT record microphone yet!
                wasRinging = true;
                lastPhoneState = TelephonyManager.EXTRA_STATE_RINGING;
                prefs.edit()
                    .putBoolean("is_incoming", true)
                    .putBoolean("was_ringing", true)
                    .apply();
                Log.d(TAG, "Incoming Call Ringing... Showing caller card without premature mic recording.");

                String number = (incomingNumber != null && !incomingNumber.isEmpty()) ? incomingNumber : prefs.getString("active_call_number", "");
                if (number == null || number.isEmpty()) {
                    number = "Incoming Call";
                }

                Intent cardIntent = new Intent(context, CallRecordingService.class);
                cardIntent.setAction(CallRecordingService.ACTION_SHOW_IN_CALL_CARD);
                cardIntent.putExtra("phone_number", number);
                cardIntent.putExtra("call_type", "INCOMING");
                cardIntent.putExtra("start_time", System.currentTimeMillis());

                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(cardIntent);
                    } else {
                        context.startService(cardIntent);
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Notice starting service on RINGING: " + e.getMessage());
                }

            } else if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(stateStr)) {
                // Call is now active / answered / dialed!
                long callStartTime = System.currentTimeMillis();
                boolean isIncomingCall = wasRinging || prefs.getBoolean("was_ringing", false);
                String callDirection = isIncomingCall ? "INCOMING" : "OUTGOING";

                Log.d(TAG, "Call Active (OFFHOOK). Direction: " + callDirection + ". Starting CallRecordingService...");

                String number = currentCallNumber;
                if (number == null || number.isEmpty()) {
                    number = prefs.getString("active_call_number", "");
                }

                prefs.edit()
                    .putBoolean("call_in_progress", true)
                    .putLong("call_start_time", callStartTime)
                    .putString("active_call_number", number)
                    .putString("call_type", callDirection)
                    .apply();

                lastPhoneState = TelephonyManager.EXTRA_STATE_OFFHOOK;

                Intent startIntent = new Intent(context, CallRecordingService.class);
                startIntent.setAction(CallRecordingService.ACTION_START_RECORDING);
                startIntent.putExtra("phone_number", (number != null && !number.isEmpty()) ? number : "Customer");
                startIntent.putExtra("call_type", callDirection);
                startIntent.putExtra("start_time", callStartTime);

                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(startIntent);
                    } else {
                        context.startService(startIntent);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Failed to start CallRecordingService on OFFHOOK: " + e.getMessage());
                }

            } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(stateStr)) {
                // Call terminated! Check if it was a missed call or answered call.
                boolean isMissed = wasRinging && !TelephonyManager.EXTRA_STATE_OFFHOOK.equals(lastPhoneState);
                String callDirection = wasRinging ? (isMissed ? "MISSED" : "INCOMING") : "OUTGOING";

                Log.d(TAG, "Call Ended (IDLE). WasMissed: " + isMissed + ", Direction: " + callDirection);

                String number = currentCallNumber;
                if (number == null || number.isEmpty()) {
                    number = prefs.getString("active_call_number", "");
                }

                Intent stopIntent = new Intent(context, CallRecordingService.class);
                stopIntent.setAction(CallRecordingService.ACTION_STOP_RECORDING);
                stopIntent.putExtra("phone_number", (number != null && !number.isEmpty()) ? number : "Customer");
                stopIntent.putExtra("call_type", callDirection);
                stopIntent.putExtra("was_missed", isMissed);

                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(stopIntent);
                    } else {
                        context.startService(stopIntent);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Failed to send stop service signal: " + e.getMessage());
                }

                // Reset state
                lastPhoneState = TelephonyManager.EXTRA_STATE_IDLE;
                wasRinging = false;
                currentCallNumber = "";
                prefs.edit()
                    .putBoolean("call_in_progress", false)
                    .putBoolean("is_incoming", false)
                    .putBoolean("was_ringing", false)
                    .putString("active_call_number", "")
                    .apply();
            }
        }
    }
}
