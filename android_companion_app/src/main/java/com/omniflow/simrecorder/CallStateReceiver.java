package com.omniflow.simrecorder;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.telephony.TelephonyManager;
import android.util.Log;

public class CallStateReceiver extends BroadcastReceiver {
    private static final String TAG = "OmniFlowSIMCall";
    private static String lastState = TelephonyManager.EXTRA_STATE_IDLE;
    private static String savedNumber = "";
    private static long callStartTime = 0;

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
            savedNumber = intent.getExtras().getString("android.intent.extra.PHONE_NUMBER");
            Log.d(TAG, "NEW_OUTGOING_CALL detected. Outgoing number: " + savedNumber);
        } else if (action.equals(TelephonyManager.ACTION_PHONE_STATE_CHANGED)) {
            String stateStr = intent.getExtras().getString(TelephonyManager.EXTRA_STATE);
            String number = intent.getExtras().getString(TelephonyManager.EXTRA_INCOMING_NUMBER);
            if (number != null && !number.isEmpty()) savedNumber = number;

            Log.d(TAG, "PHONE_STATE changed: " + stateStr + " (Saved Number: " + savedNumber + ")");

            if (TelephonyManager.EXTRA_STATE_RINGING.equals(stateStr)) {
                Log.d(TAG, "Incoming Call Ringing from: " + savedNumber);
            } else if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(stateStr)) {
                if (TelephonyManager.EXTRA_STATE_IDLE.equals(lastState) || TelephonyManager.EXTRA_STATE_RINGING.equals(lastState)) {
                    Log.d(TAG, "Call Answered (OFFHOOK). Notifying CallRecordingService...");
                    callStartTime = System.currentTimeMillis();

                    Intent startIntent = new Intent(context, CallRecordingService.class);
                    startIntent.setAction(CallRecordingService.ACTION_START_RECORDING);
                    startIntent.putExtra("phone_number", savedNumber);
                    startIntent.putExtra("call_type", TelephonyManager.EXTRA_STATE_RINGING.equals(lastState) ? "INCOMING" : "OUTGOING");
                    startIntent.putExtra("start_time", callStartTime);

                    try {
                        context.startService(startIntent);
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to start service directly: " + e.getMessage());
                    }
                }
            } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(stateStr)) {
                if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(lastState)) {
                    Log.d(TAG, "Call Ended (IDLE). Stopping CallRecordingService...");
                    Intent stopIntent = new Intent(context, CallRecordingService.class);
                    stopIntent.setAction(CallRecordingService.ACTION_STOP_RECORDING);
                    try {
                        context.startService(stopIntent);
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to send stop service signal: " + e.getMessage());
                    }
                }
            }
            lastState = stateStr;
        }
    }
}
