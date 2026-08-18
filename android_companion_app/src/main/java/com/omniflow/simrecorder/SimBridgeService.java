package com.omniflow.simrecorder;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.telephony.TelephonyManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Scanner;

/**
 * OmniFlow SIM Bridge Service for Android Companion App
 * Bridges Laptop CRM Calling with physical GSM SIM card over WiFi / Cloud Relay.
 */
public class SimBridgeService extends Service {

    private static final String TAG = "OmniFlowSimBridge";
    private static final String CHANNEL_ID = "omniflow_sim_bridge_channel";
    private static final int NOTIFICATION_ID = 3001;

    private boolean isRunning = false;
    private String serverUrl = "https://ems-backend-9hig.onrender.com";
    private String staffId = "staff_1";
    private String extension = "101";
    private String staffName = "Telecaller Agent";
    private Thread pollingThread;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, buildForegroundNotification());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
        serverUrl = prefs.getString("api_url", "https://ems-backend-9hig.onrender.com");
        staffId = prefs.getString("staff_id", "staff_1");
        extension = prefs.getString("extension", "101");
        staffName = prefs.getString("staff_name", "Telecaller Agent");

        if (!isRunning) {
            isRunning = true;
            registerDeviceWithBackend();
            startCommandPolling();
        }

        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "OmniFlow SIM Bridge Service",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Relaying Laptop CRM calls through Mobile SIM & WiFi");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildForegroundNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("OmniFlow PBX Ext " + extension + ": ACTIVE")
            .setContentText("Connected to CRM • Ready for Direct SIM Calling")
            .setSmallIcon(android.R.drawable.stat_sys_phone_call)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void registerDeviceWithBackend() {
        new Thread(() -> {
            String[] targets = new String[]{
                "http://192.168.29.95:5000",
                serverUrl,
                "https://ems-backend-9hig.onrender.com"
            };

            for (String base : targets) {
                if (base == null || base.isEmpty()) continue;
                try {
                    TelephonyManager tm = (TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE);
                    String carrierName = tm != null ? tm.getNetworkOperatorName() : "Mobile SIM";
                    if (carrierName == null || carrierName.isEmpty()) carrierName = "Mobile SIM (Active)";
                    String deviceModel = Build.MANUFACTURER + " " + Build.MODEL;

                    JSONObject payload = new JSONObject();
                    payload.put("extension", extension);
                    payload.put("staffId", staffId);
                    payload.put("staffName", staffName);
                    payload.put("deviceId", Build.ID + "_" + Build.SERIAL);
                    payload.put("deviceName", deviceModel);
                    payload.put("simCarrier", carrierName);
                    payload.put("status", "online");

                    URL url = new URL(base + "/api/sim-bridge/pair");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setDoOutput(true);
                    conn.setConnectTimeout(3000);

                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(payload.toString().getBytes("UTF-8"));
                    }

                    int code = conn.getResponseCode();
                    Log.d(TAG, "Device registered on " + base + " (Ext " + extension + "). Code: " + code);
                    conn.disconnect();
                } catch (Exception e) {
                    Log.e(TAG, "Register failed on " + base + ": " + e.getMessage());
                }
            }
        }).start();
    }

    private void startCommandPolling() {
        pollingThread = new Thread(() -> {
            String[] targetUrls = new String[]{
                "http://192.168.29.95:5000",
                serverUrl,
                "https://ems-backend-9hig.onrender.com"
            };

            long lastHeartbeat = 0;

            while (isRunning) {
                // Heartbeat every 20 seconds
                long now = System.currentTimeMillis();
                if (now - lastHeartbeat > 20000) {
                    lastHeartbeat = now;
                    sendHeartbeat(targetUrls);
                }

                for (String base : targetUrls) {
                    if (base == null || base.isEmpty()) continue;
                    try {
                        URL url = new URL(base + "/api/sim-bridge/poll-call?extension=" + extension + "&staffId=" + staffId);
                        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("GET");
                        conn.setConnectTimeout(1500);
                        conn.setReadTimeout(1500);

                        if (conn.getResponseCode() == 200) {
                            InputStream in = conn.getInputStream();
                            Scanner scanner = new Scanner(in).useDelimiter("\\A");
                            String response = scanner.hasNext() ? scanner.next() : "";
                            in.close();

                            JSONObject json = new JSONObject(response);
                            if (json.optBoolean("hasCall", false)) {
                                String phone = json.optString("customerPhone", "");
                                if (!phone.isEmpty()) {
                                    Log.d(TAG, "⚡ Triggering incoming SIM call to: " + phone + " (Ext: " + extension + ")");
                                    makeGsmCall(getApplicationContext(), phone);
                                }
                            }
                        }
                        conn.disconnect();
                    } catch (Exception e) {
                        // Ignore individual target network timeout
                    }
                }

                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    break;
                }
            }
        });
        pollingThread.start();
    }

    private void sendHeartbeat(String[] targets) {
        new Thread(() -> {
            for (String base : targets) {
                if (base == null || base.isEmpty()) continue;
                try {
                    JSONObject payload = new JSONObject();
                    payload.put("extension", extension);
                    payload.put("staffId", staffId);
                    payload.put("status", "online");

                    URL url = new URL(base + "/api/sim-bridge/heartbeat");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setDoOutput(true);
                    conn.setConnectTimeout(2000);

                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(payload.toString().getBytes("UTF-8"));
                    }
                    conn.getResponseCode();
                    conn.disconnect();
                } catch (Exception ignored) {}
            }
        }).start();
    }

    public static void makeGsmCall(Context context, String phoneNumber) {
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) return;
        try {
            Intent callIntent = new Intent(Intent.ACTION_CALL);
            callIntent.setData(Uri.parse("tel:" + phoneNumber.trim()));
            callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(callIntent);
            Log.d(TAG, "Making GSM Call via SIM Bridge to: " + phoneNumber);
        } catch (SecurityException se) {
            Log.e(TAG, "CALL_PHONE permission missing: " + se.getMessage());
            Intent dialIntent = new Intent(Intent.ACTION_DIAL);
            dialIntent.setData(Uri.parse("tel:" + phoneNumber.trim()));
            dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(dialIntent);
        } catch (Exception e) {
            Log.e(TAG, "Error executing GSM call: " + e.getMessage());
        }
    }

    @Override
    public void onDestroy() {
        isRunning = false;
        if (pollingThread != null) {
            pollingThread.interrupt();
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
