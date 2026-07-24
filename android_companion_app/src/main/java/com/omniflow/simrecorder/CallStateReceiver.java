package com.omniflow.simrecorder;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.MediaRecorder;
import android.os.Environment;
import android.telephony.TelephonyManager;
import android.util.Base64;
import android.util.Log;

import java.io.File;
import java.io.FileInputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class CallStateReceiver extends BroadcastReceiver {
    private static final String TAG = "OmniFlowSIMCall";
    private static String lastState = TelephonyManager.EXTRA_STATE_IDLE;
    private static String savedNumber = "";
    private static MediaRecorder recorder;
    private static File audioFile;
    private static long callStartTime = 0;

    // YOUR CRM BACKEND SERVER IP (Edit if needed)
    public static final String BACKEND_SERVER_URL = "http://192.168.29.95:5000/api/telecalling/sync-log";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;

        if (action.equals("android.intent.action.NEW_OUTGOING_CALL")) {
            savedNumber = intent.getExtras().getString("android.intent.extra.PHONE_NUMBER");
        } else if (action.equals(TelephonyManager.ACTION_PHONE_STATE_CHANGED)) {
            String stateStr = intent.getExtras().getString(TelephonyManager.EXTRA_STATE);
            String number = intent.getExtras().getString(TelephonyManager.EXTRA_INCOMING_NUMBER);
            if (number != null && !number.isEmpty()) savedNumber = number;

            if (TelephonyManager.EXTRA_STATE_RINGING.equals(stateStr)) {
                Log.d(TAG, "Incoming SIM Call Ringing from: " + savedNumber);
            } else if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(stateStr)) {
                if (TelephonyManager.EXTRA_STATE_IDLE.equals(lastState) || TelephonyManager.EXTRA_STATE_RINGING.equals(lastState)) {
                    Log.d(TAG, "SIM Call Answered/Connected. Starting Audio Recording...");
                    callStartTime = System.currentTimeMillis();
                    startRecording(context);
                }
            } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(stateStr)) {
                if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(lastState)) {
                    Log.d(TAG, "SIM Call Ended. Saving & Syncing to CRM Backend...");
                    stopRecordingAndUpload(savedNumber);
                }
            }
            lastState = stateStr;
        }
    }

    private void startRecording(Context context) {
        try {
            audioFile = File.createTempFile("call_rec_", ".mp3", context.getCacheDir());
            recorder = new MediaRecorder();
            recorder.setAudioSource(MediaRecorder.AudioSource.VOICE_CALL);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            recorder.setOutputFile(audioFile.getAbsolutePath());
            recorder.prepare();
            recorder.start();
        } catch (Exception e) {
            Log.e(TAG, "MediaRecorder start error: " + e.getMessage());
        }
    }

    private void stopRecordingAndUpload(final String phoneNumber) {
        final long durationSec = (System.currentTimeMillis() - callStartTime) / 1000;
        try {
            if (recorder != null) {
                recorder.stop();
                recorder.release();
                recorder = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "MediaRecorder stop error: " + e.getMessage());
        }

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    String base64Audio = "";
                    if (audioFile != null && audioFile.exists()) {
                        FileInputStream fis = new FileInputStream(audioFile);
                        byte[] bytes = new byte[(int) audioFile.length()];
                        fis.read(bytes);
                        fis.close();
                        base64Audio = "data:audio/mp3;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);
                    }

                    URL url = new URL(BACKEND_SERVER_URL);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setDoOutput(true);

                    String jsonPayload = String.format(
                        "{\"agentName\":\"Rahul Sharma (Android SIM App)\",\"customerPhone\":\"%s\",\"customerName\":\"Live SIM Lead\",\"channel\":\"SIM\",\"type\":\"OUTGOING\",\"durationSeconds\":%d,\"audioBase64\":\"%s\",\"disposition\":\"Interested\",\"notes\":\"Real GSM SIM Call auto-recorded and synced via Android Companion APK Service.\"}",
                        phoneNumber != null ? phoneNumber : "+91 98765 43210",
                        durationSec > 0 ? durationSec : 15,
                        base64Audio
                    );

                    OutputStream os = conn.getOutputStream();
                    os.write(jsonPayload.getBytes("UTF-8"));
                    os.close();

                    int responseCode = conn.getResponseCode();
                    Log.d(TAG, "CRM Upload Response Code: " + responseCode);
                } catch (Exception e) {
                    Log.e(TAG, "Upload failed: " + e.getMessage());
                }
            }
        }).start();
    }
}
