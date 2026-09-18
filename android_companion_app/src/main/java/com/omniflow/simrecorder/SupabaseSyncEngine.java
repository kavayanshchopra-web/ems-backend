package com.omniflow.simrecorder;

import android.content.ContentResolver;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * SupabaseSyncEngine — High-Speed Cloud Sync Engine for OmniFlow
 * - Stage 1 (0ms Instant): Records call in call_logs & auto-creates Lead in contacts table.
 * - Stage 2 (Follow-up & Audio): Uploads voice recording to Storage CDN & updates Lead with disposition & notes.
 */
public class SupabaseSyncEngine {

    private static final String TAG = "SupabaseSyncEngine";

    public static final String SUPABASE_REST_URL = "https://pdjaajbhrvglwukoacuh.supabase.co/rest/v1";
    public static final String SUPABASE_STORAGE_URL = "https://pdjaajbhrvglwukoacuh.supabase.co/storage/v1";
    public static final String SUPABASE_KEY = "sb_publishable_q8SBMvAwczXP0yfDfIMZsQ_ahP5YYq3";
    public static final String STORAGE_BUCKET = "omniflow-vault";
    public static final int DEFAULT_TENANT_ID = 0;

    public static int getTenantId(Context context) {
        if (context != null) {
            try {
                android.content.SharedPreferences prefs = context.getSharedPreferences("omniflow", Context.MODE_PRIVATE);
                int t = prefs.getInt("tenant_id", 0);
                if (t > 0) return t;
                String tStr = prefs.getString("tenant_id_str", null);
                if (tStr != null && !tStr.trim().isEmpty()) {
                    try {
                        int parsed = Integer.parseInt(tStr.trim());
                        if (parsed > 0) return parsed;
                    } catch (Exception ignored) {}
                }
            } catch (Exception ignored) {}
        }
        return DEFAULT_TENANT_ID;
    }

    public static String getAgentName(Context context, String fallback) {
        if (context != null) {
            try {
                android.content.SharedPreferences prefs = context.getSharedPreferences("omniflow", Context.MODE_PRIVATE);
                String n = prefs.getString("agent_name", null);
                if (n != null && !n.trim().isEmpty() && !n.equalsIgnoreCase("Mobile Agent")) return n.trim();
            } catch (Exception ignored) {}
        }
        return (fallback != null && !fallback.trim().isEmpty() && !fallback.equalsIgnoreCase("Mobile Agent")) ? fallback : "Mobile Telecaller";
    }

    public static String getAgentId(Context context) {
        if (context != null) {
            try {
                android.content.SharedPreferences prefs = context.getSharedPreferences("omniflow", Context.MODE_PRIVATE);
                return prefs.getString("agent_id", "");
            } catch (Exception ignored) {}
        }
        return "";
    }

    public static String getAgentEmail(Context context) {
        if (context != null) {
            try {
                android.content.SharedPreferences prefs = context.getSharedPreferences("omniflow", Context.MODE_PRIVATE);
                return prefs.getString("agent_email", "");
            } catch (Exception ignored) {}
        }
        return "";
    }

    public static String getAgentRole(Context context) {
        if (context != null) {
            try {
                android.content.SharedPreferences prefs = context.getSharedPreferences("omniflow", Context.MODE_PRIVATE);
                return prefs.getString("agent_role", "employee");
            } catch (Exception ignored) {}
        }
        return "employee";
    }

    public static byte[] extractAudioBytes(Context context, Uri safFileUri, File backupFile) {
        try {
            if (safFileUri != null && context != null) {
                ContentResolver resolver = context.getContentResolver();
                try (InputStream is = resolver.openInputStream(safFileUri)) {
                    if (is != null) {
                        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                        byte[] buffer = new byte[8192];
                        int len;
                        int total = 0;
                        int maxLimit = 3000000; // Up to 3MB audio
                        while ((len = is.read(buffer)) != -1) {
                            baos.write(buffer, 0, len);
                            total += len;
                            if (total >= maxLimit) break;
                        }
                        baos.flush();
                        return baos.toByteArray();
                    }
                }
            } else if (backupFile != null && backupFile.exists() && backupFile.length() > 0) {
                try (FileInputStream fis = new FileInputStream(backupFile)) {
                    java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                    byte[] buffer = new byte[8192];
                    int len;
                    int total = 0;
                    int maxLimit = 3000000;
                    while ((len = fis.read(buffer)) != -1) {
                        baos.write(buffer, 0, len);
                        total += len;
                        if (total >= maxLimit) break;
                    }
                    baos.flush();
                    return baos.toByteArray();
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "extractAudioBytes error: " + e.getMessage());
        }
        return null;
    }

    /**
     * Stage 1: Instant Sync upon Call Cut (0ms delay)
     * - Upserts call log with disposition "Pending"
     * - Auto-creates Lead in contacts table if not already present
     */
    public static void syncStage1Instant(
            Context context,
            String phone,
            String customerName,
            String agentName,
            String callType,
            long durationSeconds,
            String callId,
            String simSlot
    ) {
        new Thread(() -> {
            try {
                if (phone == null || phone.trim().isEmpty()) return;

                String rawDigits = phone.replaceAll("\\D", "");
                String norm10 = rawDigits.length() >= 10 ? rawDigits.substring(rawDigits.length() - 10) : rawDigits;
                if (norm10.isEmpty()) return;
                String targetPhone = phone.startsWith("+") ? phone : ("+91" + norm10);
                String resolvedCustName = (customerName != null && !customerName.trim().isEmpty() && !customerName.equalsIgnoreCase("null") && !customerName.replaceAll("\\D", "").equals(rawDigits))
                        ? customerName.trim()
                        : ("Lead (" + norm10 + ")");

                int dynamicTenantId = getTenantId(context);
                if (dynamicTenantId <= 0) {
                    Log.w(TAG, "⚠️ [Stage 1 SupabaseSync] Aborting sync: No valid logged-in tenant found! (tenantId=" + dynamicTenantId + ")");
                    return;
                }
                String resolvedAgent = getAgentName(context, agentName);
                String dynamicAgentId = getAgentId(context);
                String dynamicAgentEmail = getAgentEmail(context);
                String dynamicAgentRole = getAgentRole(context);

                String resolvedType = (callType != null && !callType.trim().isEmpty()) ? callType.toUpperCase() : "OUTGOING";
                long dur = Math.max(durationSeconds, 0);
                String durationFormatted = String.format(Locale.getDefault(), "%02d:%02d", dur / 60, dur % 60);

                Log.d(TAG, "⚡ [Stage 1 SupabaseSync] Instant sync for: " + targetPhone + " [Tenant: " + dynamicTenantId + ", Agent: " + resolvedAgent + ", CallId: " + callId + "]");

                // 1. Insert/Upsert Call Log in call_logs table
                try {
                    String actualCallId = (callId != null && !callId.isEmpty()) ? callId : ("call_" + System.currentTimeMillis() + "_" + norm10);
                    JSONObject callPayload = new JSONObject();
                    callPayload.put("call_id", actualCallId);
                    callPayload.put("tenant_id", dynamicTenantId);
                    callPayload.put("customer_phone", targetPhone);
                    callPayload.put("customer_name", resolvedCustName);
                    callPayload.put("staff_name", resolvedAgent);
                    callPayload.put("agent_name", resolvedAgent);
                    if (!dynamicAgentId.isEmpty()) {
                        callPayload.put("staff_id", dynamicAgentId);
                        callPayload.put("agent_id", dynamicAgentId);
                    }
                    if (!dynamicAgentRole.isEmpty()) callPayload.put("agent_role", dynamicAgentRole);
                    callPayload.put("channel", (simSlot != null && !simSlot.isEmpty()) ? ("SIM (" + simSlot + ")") : "SIM");
                    callPayload.put("type", resolvedType);
                    callPayload.put("call_type", resolvedType);
                    callPayload.put("duration", durationFormatted);
                    callPayload.put("duration_seconds", dur);
                    callPayload.put("disposition", "MISSED".equalsIgnoreCase(resolvedType) ? "Missed Call" : "Pending");
                    callPayload.put("notes", "Call completed via " + (simSlot != null ? simSlot : "SIM 1") + " by " + resolvedAgent + " [Ref: " + actualCallId + "]");
                    callPayload.put("recording_url", "");

                    if (!dynamicAgentEmail.isEmpty()) {
                        JSONObject cf = new JSONObject();
                        cf.put("agent_email", dynamicAgentEmail);
                        callPayload.put("custom_fields", cf);
                    }

                    URL callUrl = new URL(SUPABASE_REST_URL + "/call_logs");
                    HttpURLConnection callConn = (HttpURLConnection) callUrl.openConnection();
                    callConn.setRequestMethod("POST");
                    callConn.setRequestProperty("apikey", SUPABASE_KEY);
                    callConn.setRequestProperty("Authorization", "Bearer " + SUPABASE_KEY);
                    callConn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                    callConn.setRequestProperty("Prefer", "resolution=merge-duplicates,return=representation");
                    callConn.setDoOutput(true);
                    callConn.setConnectTimeout(8000);
                    callConn.setReadTimeout(8000);

                    byte[] callBytes = callPayload.toString().getBytes("utf-8");
                    try (OutputStream os = callConn.getOutputStream()) {
                        os.write(callBytes);
                        os.flush();
                    }

                    int callRespCode = callConn.getResponseCode();
                    callConn.disconnect();
                    Log.d(TAG, "⚡ [Stage 1 SupabaseSync] Call Log Insert Response: " + callRespCode);
                } catch (Exception callErr) {
                    Log.e(TAG, "❌ [Stage 1 SupabaseSync] Call log insert error: " + callErr.getMessage());
                }

                // 2. Check if Lead already exists in contacts table; if not, create Lead!
                try {
                    URL checkUrl = new URL(SUPABASE_REST_URL + "/contacts?tenant_id=eq." + dynamicTenantId + "&phone_normalized=eq." + norm10);
                    HttpURLConnection checkConn = (HttpURLConnection) checkUrl.openConnection();
                    checkConn.setRequestMethod("GET");
                    checkConn.setRequestProperty("apikey", SUPABASE_KEY);
                    checkConn.setRequestProperty("Authorization", "Bearer " + SUPABASE_KEY);
                    checkConn.setConnectTimeout(8000);
                    checkConn.setReadTimeout(8000);

                    int checkCode = checkConn.getResponseCode();
                    boolean leadExists = false;
                    if (checkCode == 200) {
                        try (BufferedReader reader = new BufferedReader(new InputStreamReader(checkConn.getInputStream()))) {
                            StringBuilder sb = new StringBuilder();
                            String line;
                            while ((line = reader.readLine()) != null) sb.append(line);
                            JSONArray arr = new JSONArray(sb.toString());
                            leadExists = (arr.length() > 0);
                        }
                    }
                    checkConn.disconnect();

                    if (!leadExists) {
                        JSONObject leadPayload = new JSONObject();
                        leadPayload.put("id", norm10 + "@s.whatsapp.net");
                        leadPayload.put("tenant_id", dynamicTenantId);
                        leadPayload.put("name", resolvedCustName);
                        leadPayload.put("custom_name", resolvedCustName);
                        leadPayload.put("phone", targetPhone);
                        leadPayload.put("phone_normalized", norm10);
                        leadPayload.put("pipeline_stage", "lead");
                        leadPayload.put("notes", "Auto-created from Mobile Companion SIM Call (Pending)");
                        leadPayload.put("created_by", resolvedAgent);

                        JSONObject customFields = new JSONObject();
                        customFields.put("source", "SIM Call");
                        customFields.put("disposition", "MISSED".equalsIgnoreCase(resolvedType) ? "Missed Call" : "Pending");
                        leadPayload.put("custom_fields", customFields);

                        URL leadUrl = new URL(SUPABASE_REST_URL + "/contacts");
                        HttpURLConnection leadConn = (HttpURLConnection) leadUrl.openConnection();
                        leadConn.setRequestMethod("POST");
                        leadConn.setRequestProperty("apikey", SUPABASE_KEY);
                        leadConn.setRequestProperty("Authorization", "Bearer " + SUPABASE_KEY);
                        leadConn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                        leadConn.setRequestProperty("Prefer", "resolution=merge-duplicates,return=representation");
                        leadConn.setDoOutput(true);
                        leadConn.setConnectTimeout(8000);
                        leadConn.setReadTimeout(8000);

                        byte[] leadBytes = leadPayload.toString().getBytes("utf-8");
                        try (OutputStream os = leadConn.getOutputStream()) {
                            os.write(leadBytes);
                            os.flush();
                        }

                        int leadCode = leadConn.getResponseCode();
                        leadConn.disconnect();
                        Log.d(TAG, "🎯 [Stage 1 SupabaseSync] ✅ New Lead Created in Contacts! Response: " + leadCode);
                    } else {
                        Log.d(TAG, "ℹ️ [Stage 1 SupabaseSync] Lead already exists in contacts for: " + norm10);
                    }
                } catch (Exception leadErr) {
                    Log.e(TAG, "❌ [Stage 1 SupabaseSync] Lead check/create error: " + leadErr.getMessage());
                }

            } catch (Exception e) {
                Log.e(TAG, "❌ [Stage 1 SupabaseSync] General error: " + e.getMessage());
            }
        }).start();
    }

    /**
     * Stage 2: Follow-Up & Audio Sync
     * - Uploads audio to Supabase Storage CDN (omniflow-vault bucket)
     * - Updates call log with disposition, notes, audio URL
     * - Updates Lead in contacts table with disposition, notes, pipeline stage
     */
    public static void syncStage2FollowUp(
            Context context,
            String phone,
            String customerName,
            String agentName,
            String callType,
            long durationSeconds,
            String disposition,
            String notes,
            byte[] audioBytes,
            String callId,
            String followUpDate,
            String followUpTime,
            String simSlot
    ) {
        new Thread(() -> {
            try {
                if (phone == null || phone.trim().isEmpty()) return;

                String rawDigits = phone.replaceAll("\\D", "");
                String norm10 = rawDigits.length() >= 10 ? rawDigits.substring(rawDigits.length() - 10) : rawDigits;
                if (norm10.isEmpty()) return;
                String targetPhone = phone.startsWith("+") ? phone : ("+91" + norm10);
                String resolvedCustName = (customerName != null && !customerName.trim().isEmpty() && !customerName.equalsIgnoreCase("null") && !customerName.replaceAll("\\D", "").equals(rawDigits))
                        ? customerName.trim()
                        : ("Lead (" + norm10 + ")");

                int dynamicTenantId = getTenantId(context);
                if (dynamicTenantId <= 0) {
                    Log.w(TAG, "⚠️ [Stage 2 SupabaseSync] Aborting sync: No valid logged-in tenant found! (tenantId=" + dynamicTenantId + ")");
                    return;
                }
                String resolvedAgent = getAgentName(context, agentName);
                String dynamicAgentId = getAgentId(context);
                String dynamicAgentEmail = getAgentEmail(context);
                String dynamicAgentRole = getAgentRole(context);

                String resolvedDisp = (disposition != null && !disposition.trim().isEmpty()) ? disposition : "Completed";
                long dur = Math.max(durationSeconds, 0);
                String durationFormatted = String.format(Locale.getDefault(), "%02d:%02d", dur / 60, dur % 60);

                Log.d(TAG, "🚀 [Stage 2 SupabaseSync] Follow-up sync for: " + targetPhone + ", Tenant: " + dynamicTenantId + ", Agent: " + resolvedAgent + ", Disp: " + resolvedDisp + ", AudioBytes: " + (audioBytes != null ? audioBytes.length : 0));

                // 1. Upload Audio File to Supabase Storage if available
                String publicAudioUrl = "";
                if (audioBytes != null && audioBytes.length > 500) {
                    try {
                        String audioFileName = "call_" + System.currentTimeMillis() + "_" + norm10 + ".m4a";
                        String objectPath = "tenants/" + dynamicTenantId + "/calls/" + audioFileName;
                        String uploadUrlStr = SUPABASE_STORAGE_URL + "/object/" + STORAGE_BUCKET + "/" + objectPath;

                        URL uploadUrl = new URL(uploadUrlStr);
                        HttpURLConnection conn = (HttpURLConnection) uploadUrl.openConnection();
                        conn.setRequestMethod("POST");
                        conn.setRequestProperty("apikey", SUPABASE_KEY);
                        conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_KEY);
                        conn.setRequestProperty("Content-Type", "audio/mp4");
                        conn.setRequestProperty("x-upsert", "true");
                        conn.setDoOutput(true);
                        conn.setConnectTimeout(25000);
                        conn.setReadTimeout(30000);

                        try (OutputStream os = conn.getOutputStream()) {
                            os.write(audioBytes);
                            os.flush();
                        }

                        int uploadCode = conn.getResponseCode();
                        conn.disconnect();

                        if (uploadCode == 200 || uploadCode == 201) {
                            publicAudioUrl = SUPABASE_STORAGE_URL + "/object/public/" + STORAGE_BUCKET + "/" + objectPath;
                            Log.d(TAG, "🎧 [Stage 2 SupabaseSync] Audio Upload Success! CDN URL: " + publicAudioUrl);
                        } else {
                            Log.w(TAG, "⚠️ [Stage 2 SupabaseSync] Audio upload HTTP " + uploadCode);
                        }
                    } catch (Exception audioErr) {
                        Log.e(TAG, "❌ [Stage 2 SupabaseSync] Audio upload error: " + audioErr.getMessage());
                    }
                }

                // 2. Update Call Log in call_logs table via PATCH
                try {
                    String actualCallId = (callId != null && !callId.isEmpty()) ? callId : ("call_" + System.currentTimeMillis() + "_" + norm10);
                    JSONObject updatePayload = new JSONObject();
                    updatePayload.put("disposition", resolvedDisp);
                    String fullNotes = (notes != null && !notes.isEmpty()) ? notes : "SIM Call logged via OmniFlow Companion";
                    if (followUpDate != null && !followUpDate.isEmpty()) {
                        fullNotes += " | Follow-up: " + followUpDate + (followUpTime != null && !followUpTime.isEmpty() ? (" " + followUpTime) : "");
                    }
                    if (simSlot != null && !simSlot.isEmpty() && !fullNotes.contains(simSlot)) {
                        fullNotes += " [" + simSlot + "]";
                    }
                    updatePayload.put("notes", fullNotes);
                    updatePayload.put("duration_seconds", dur);
                    updatePayload.put("duration", durationFormatted);
                    if (!publicAudioUrl.isEmpty()) {
                        updatePayload.put("recording_url", publicAudioUrl);
                    }

                    String safeType = (callType != null && !callType.isEmpty() && !"MISSED".equalsIgnoreCase(callType)) ? callType.toUpperCase() : "OUTGOING";
                    if (dur > 0 || !publicAudioUrl.isEmpty()) {
                        updatePayload.put("type", safeType);
                        updatePayload.put("call_type", safeType);
                    }
                    if (simSlot != null && !simSlot.isEmpty()) {
                        updatePayload.put("channel", "SIM (" + simSlot + ")");
                    }

                    // Try PATCH by call_id
                    URL patchUrl = new URL(SUPABASE_REST_URL + "/call_logs?call_id=eq." + actualCallId + "&tenant_id=eq." + dynamicTenantId);
                    HttpURLConnection patchConn = (HttpURLConnection) patchUrl.openConnection();
                    patchConn.setRequestMethod("PATCH");
                    patchConn.setRequestProperty("apikey", SUPABASE_KEY);
                    patchConn.setRequestProperty("Authorization", "Bearer " + SUPABASE_KEY);
                    patchConn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                    patchConn.setRequestProperty("Prefer", "return=representation");
                    patchConn.setDoOutput(true);
                    patchConn.setConnectTimeout(15000);
                    patchConn.setReadTimeout(15000);

                    byte[] patchBytes = updatePayload.toString().getBytes("utf-8");
                    try (OutputStream os = patchConn.getOutputStream()) {
                        os.write(patchBytes);
                        os.flush();
                    }

                    int patchCode = patchConn.getResponseCode();
                    boolean patched = false;
                    if (patchCode == 200) {
                        try (BufferedReader r = new BufferedReader(new InputStreamReader(patchConn.getInputStream()))) {
                            StringBuilder sb = new StringBuilder();
                            String line;
                            while ((line = r.readLine()) != null) sb.append(line);
                            JSONArray arr = new JSONArray(sb.toString());
                            patched = (arr.length() > 0);
                        }
                    }
                    patchConn.disconnect();

                    // If not found to PATCH by call_id (e.g. slight timestamp discrepancy), find ID of recent call for this phone and PATCH by ID!
                    if (!patched) {
                        try {
                            String encPhone = java.net.URLEncoder.encode(targetPhone, "UTF-8");
                            URL getRecentUrl = new URL(SUPABASE_REST_URL + "/call_logs?customer_phone=eq." + encPhone + "&tenant_id=eq." + dynamicTenantId + "&order=id.desc&limit=1&select=id");
                            HttpURLConnection getConn = (HttpURLConnection) getRecentUrl.openConnection();
                            getConn.setRequestMethod("GET");
                            getConn.setRequestProperty("apikey", SUPABASE_KEY);
                            getConn.setRequestProperty("Authorization", "Bearer " + SUPABASE_KEY);
                            getConn.setConnectTimeout(8000);
                            getConn.setReadTimeout(8000);
                            if (getConn.getResponseCode() == 200) {
                                try (BufferedReader r = new BufferedReader(new InputStreamReader(getConn.getInputStream()))) {
                                    StringBuilder sb = new StringBuilder();
                                    String line;
                                    while ((line = r.readLine()) != null) sb.append(line);
                                    JSONArray arr = new JSONArray(sb.toString());
                                    if (arr.length() > 0) {
                                        long matchedDbId = arr.getJSONObject(0).optLong("id", -1);
                                        if (matchedDbId > 0) {
                                            URL patchByIdUrl = new URL(SUPABASE_REST_URL + "/call_logs?id=eq." + matchedDbId);
                                            HttpURLConnection patchByIdConn = (HttpURLConnection) patchByIdUrl.openConnection();
                                            patchByIdConn.setRequestMethod("PATCH");
                                            patchByIdConn.setRequestProperty("apikey", SUPABASE_KEY);
                                            patchByIdConn.setRequestProperty("Authorization", "Bearer " + SUPABASE_KEY);
                                            patchByIdConn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                                            patchByIdConn.setRequestProperty("Prefer", "return=representation");
                                            patchByIdConn.setDoOutput(true);
                                            try (OutputStream os = patchByIdConn.getOutputStream()) {
                                                os.write(patchBytes);
                                                os.flush();
                                            }
                                            if (patchByIdConn.getResponseCode() == 200) {
                                                try (BufferedReader r2 = new BufferedReader(new InputStreamReader(patchByIdConn.getInputStream()))) {
                                                    StringBuilder sb2 = new StringBuilder();
                                                    String line2;
                                                    while ((line2 = r2.readLine()) != null) sb2.append(line2);
                                                    JSONArray arr2 = new JSONArray(sb2.toString());
                                                    patched = (arr2.length() > 0);
                                                    if (patched) {
                                                        Log.d(TAG, "✅ [Stage 2 SupabaseSync] Successfully merged into existing call log ID " + matchedDbId + " for phone: " + targetPhone);
                                                    }
                                                }
                                            }
                                            patchByIdConn.disconnect();
                                        }
                                    }
                                }
                            }
                            getConn.disconnect();
                        } catch (Exception patchPhoneErr) {
                            Log.w(TAG, "Notice on phone PATCH merge: " + patchPhoneErr.getMessage());
                        }
                    }

                    // If still not found to PATCH, INSERT it!
                    if (!patched) {
                        updatePayload.put("call_id", actualCallId);
                        updatePayload.put("tenant_id", dynamicTenantId);
                        updatePayload.put("customer_phone", targetPhone);
                        updatePayload.put("customer_name", resolvedCustName);
                        updatePayload.put("staff_name", resolvedAgent);
                        updatePayload.put("agent_name", resolvedAgent);
                        if (!dynamicAgentId.isEmpty()) {
                            updatePayload.put("staff_id", dynamicAgentId);
                            updatePayload.put("agent_id", dynamicAgentId);
                        }
                        if (!dynamicAgentRole.isEmpty()) updatePayload.put("agent_role", dynamicAgentRole);
                        updatePayload.put("channel", (simSlot != null && !simSlot.isEmpty()) ? ("SIM (" + simSlot + ")") : "SIM");
                        safeType = (callType != null && !callType.isEmpty()) ? callType.toUpperCase() : "OUTGOING";
                        updatePayload.put("type", safeType);
                        updatePayload.put("call_type", safeType);
                        if (!updatePayload.has("recording_url")) updatePayload.put("recording_url", publicAudioUrl);
                        if (!dynamicAgentEmail.isEmpty()) {
                            JSONObject cf = new JSONObject();
                            cf.put("agent_email", dynamicAgentEmail);
                            updatePayload.put("custom_fields", cf);
                        }

                        URL insertUrl = new URL(SUPABASE_REST_URL + "/call_logs");
                        HttpURLConnection insConn = (HttpURLConnection) insertUrl.openConnection();
                        insConn.setRequestMethod("POST");
                        insConn.setRequestProperty("apikey", SUPABASE_KEY);
                        insConn.setRequestProperty("Authorization", "Bearer " + SUPABASE_KEY);
                        insConn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                        insConn.setRequestProperty("Prefer", "resolution=merge-duplicates,return=representation");
                        insConn.setDoOutput(true);
                        insConn.setConnectTimeout(15000);
                        insConn.setReadTimeout(15000);

                        byte[] insBytes = updatePayload.toString().getBytes("utf-8");
                        try (OutputStream os = insConn.getOutputStream()) {
                            os.write(insBytes);
                            os.flush();
                        }
                        int insCode = insConn.getResponseCode();
                        insConn.disconnect();
                        Log.d(TAG, "✅ [Stage 2 SupabaseSync] Call Log Insert Fallback Response: " + insCode);
                    } else {
                        Log.d(TAG, "✅ [Stage 2 SupabaseSync] Call Log Updated with Audio & Disposition! Response: " + patchCode);
                    }
                } catch (Exception updateErr) {
                    Log.e(TAG, "❌ [Stage 2 SupabaseSync] Call log update error: " + updateErr.getMessage());
                }

                // 3. Update Lead in contacts table with final disposition and notes!
                try {
                    JSONObject leadUpdate = new JSONObject();
                    leadUpdate.put("notes", (notes != null && !notes.isEmpty()) ? notes : ("SIM Call: " + resolvedDisp));
                    if (resolvedCustName != null && !resolvedCustName.startsWith("Lead (")) {
                        leadUpdate.put("name", resolvedCustName);
                        leadUpdate.put("custom_name", resolvedCustName);
                    }

                    JSONObject customFields = new JSONObject();
                    customFields.put("source", "SIM Call");
                    customFields.put("disposition", resolvedDisp);
                    if (followUpDate != null && !followUpDate.isEmpty()) {
                        customFields.put("followUpDate", followUpDate);
                        customFields.put("followUpTime", followUpTime != null ? followUpTime : "");
                    }
                    leadUpdate.put("custom_fields", customFields);

                    // If disposition is positive, map to pipeline stage
                    if ("Interested".equalsIgnoreCase(resolvedDisp) || "Meeting Set".equalsIgnoreCase(resolvedDisp)) {
                        leadUpdate.put("pipeline_stage", "qualified");
                    } else if ("Won / Converted".equalsIgnoreCase(resolvedDisp) || "Sale Done".equalsIgnoreCase(resolvedDisp)) {
                        leadUpdate.put("pipeline_stage", "won");
                    }

                    leadUpdate.put("updated_at", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(new Date()));

                    URL leadPatchUrl = new URL(SUPABASE_REST_URL + "/contacts?tenant_id=eq." + dynamicTenantId + "&phone_normalized=eq." + norm10);
                    HttpURLConnection leadPatchConn = (HttpURLConnection) leadPatchUrl.openConnection();
                    leadPatchConn.setRequestMethod("PATCH");
                    leadPatchConn.setRequestProperty("apikey", SUPABASE_KEY);
                    leadPatchConn.setRequestProperty("Authorization", "Bearer " + SUPABASE_KEY);
                    leadPatchConn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                    leadPatchConn.setRequestProperty("Prefer", "return=representation");
                    leadPatchConn.setDoOutput(true);
                    leadPatchConn.setConnectTimeout(10000);
                    leadPatchConn.setReadTimeout(10000);

                    byte[] lBytes = leadUpdate.toString().getBytes("utf-8");
                    try (OutputStream os = leadPatchConn.getOutputStream()) {
                        os.write(lBytes);
                        os.flush();
                    }

                    int lCode = leadPatchConn.getResponseCode();
                    leadPatchConn.disconnect();
                    Log.d(TAG, "🎯 [Stage 2 SupabaseSync] ✅ CRM Lead Updated with Disposition (" + resolvedDisp + ")! Code: " + lCode);
                } catch (Exception lErr) {
                    Log.e(TAG, "❌ [Stage 2 SupabaseSync] Lead update error: " + lErr.getMessage());
                }

            } catch (Exception e) {
                Log.e(TAG, "❌ [Stage 2 SupabaseSync] General follow-up error: " + e.getMessage());
            }
        }).start();
    }

    /**
     * Stage 3: Real-Time Device Health & Compliance Telemetry
     * Telemetry sent on app startup, folder selection, and after every completed call.
     * Reports compliance status: HEALTHY, FOLDER_NOT_LINKED, or RECORDING_OFF_WARNING.
     */
    public static void sendDeviceHealth(Context context, String eventType, String detail) {
        new Thread(() -> {
            try {
                if (context == null) return;
                int dynamicTenantId = getTenantId(context);
                if (dynamicTenantId <= 0) return;

                android.content.SharedPreferences prefs = context.getSharedPreferences("omniflow", Context.MODE_PRIVATE);
                String folderUri = prefs.getString("selected_folder_uri", "");
                if (folderUri.isEmpty()) {
                    android.content.SharedPreferences defaultPrefs = android.preference.PreferenceManager.getDefaultSharedPreferences(context);
                    folderUri = defaultPrefs.getString("selected_folder_uri", "");
                }

                boolean folderLinked = !folderUri.isEmpty();
                boolean storageAccess = true;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    storageAccess = Environment.isExternalStorageManager();
                }

                String complianceStatus = "HEALTHY";
                if (!folderLinked) {
                    complianceStatus = "FOLDER_NOT_LINKED";
                } else if ("RECORDING_MISSING".equalsIgnoreCase(eventType)) {
                    complianceStatus = "RECORDING_OFF_WARNING";
                } else if ("PERMISSION_REVOKED".equalsIgnoreCase(eventType)) {
                    complianceStatus = "PERMISSION_REVOKED";
                }

                String dynamicAgent = getAgentName(context, "Mobile Telecaller");
                String dynamicAgentId = getAgentId(context);
                String dynamicAgentEmail = getAgentEmail(context);
                String deviceModel = Build.MANUFACTURER + " " + Build.MODEL;
                String osVersion = "Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")";

                // 1. Post to telecalling_device_health
                try {
                    JSONObject healthObj = new JSONObject();
                    healthObj.put("tenant_id", dynamicTenantId);
                    healthObj.put("agent_id", dynamicAgentId.isEmpty() ? "telecaller_" + dynamicTenantId : dynamicAgentId);
                    healthObj.put("agent_name", dynamicAgent);
                    healthObj.put("agent_email", dynamicAgentEmail);
                    healthObj.put("device_model", deviceModel);
                    healthObj.put("os_version", osVersion);
                    healthObj.put("folder_linked", folderLinked);
                    healthObj.put("folder_uri", folderUri);
                    healthObj.put("storage_access", storageAccess);
                    healthObj.put("compliance_status", complianceStatus);
                    healthObj.put("event_type", eventType != null ? eventType : "HEALTH_CHECK");
                    healthObj.put("details", detail != null ? detail : "");

                    URL healthUrl = new URL(SUPABASE_REST_URL + "/telecalling_device_health");
                    HttpURLConnection conn = (HttpURLConnection) healthUrl.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("apikey", SUPABASE_KEY);
                    conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_KEY);
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setRequestProperty("Prefer", "resolution=merge-duplicates");
                    conn.setDoOutput(true);
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(8000);

                    byte[] bytes = healthObj.toString().getBytes("utf-8");
                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(bytes);
                        os.flush();
                    }
                    int code = conn.getResponseCode();
                    conn.disconnect();
                    Log.d(TAG, "📡 [DeviceHealth] Status logged: " + complianceStatus + " (HTTP " + code + ")");
                } catch (Exception e) {
                    Log.w(TAG, "⚠️ [DeviceHealth] telecalling_device_health notice: " + e.getMessage());
                }

                // 2. Log to audit_logs (Universal CRM Auditing)
                try {
                    JSONObject auditObj = new JSONObject();
                    auditObj.put("tenant_id", dynamicTenantId);
                    auditObj.put("user_id", dynamicAgentId.isEmpty() ? "mobile_telecaller" : dynamicAgentId);
                    auditObj.put("action", "DEVICE_COMPLIANCE_ALERT");
                    auditObj.put("entity_type", "telecaller_device");
                    auditObj.put("entity_id", dynamicAgent + " (" + Build.MODEL + ")");
                    
                    JSONObject detailsJson = new JSONObject();
                    detailsJson.put("compliance_status", complianceStatus);
                    detailsJson.put("event_type", eventType);
                    detailsJson.put("device_model", deviceModel);
                    detailsJson.put("folder_linked", folderLinked);
                    detailsJson.put("folder_uri", folderUri);
                    detailsJson.put("storage_access", storageAccess);
                    detailsJson.put("notes", detail);
                    auditObj.put("details", detailsJson);

                    URL auditUrl = new URL(SUPABASE_REST_URL + "/audit_logs");
                    HttpURLConnection aConn = (HttpURLConnection) auditUrl.openConnection();
                    aConn.setRequestMethod("POST");
                    aConn.setRequestProperty("apikey", SUPABASE_KEY);
                    aConn.setRequestProperty("Authorization", "Bearer " + SUPABASE_KEY);
                    aConn.setRequestProperty("Content-Type", "application/json");
                    aConn.setDoOutput(true);
                    aConn.setConnectTimeout(8000);
                    aConn.setReadTimeout(8000);

                    byte[] aBytes = auditObj.toString().getBytes("utf-8");
                    try (OutputStream os = aConn.getOutputStream()) {
                        os.write(aBytes);
                        os.flush();
                    }
                    int aCode = aConn.getResponseCode();
                    aConn.disconnect();
                    Log.d(TAG, "🚨 [DeviceHealth] Audit alert posted to CRM! Code: " + aCode);
                } catch (Exception aErr) {
                    Log.w(TAG, "⚠️ [DeviceHealth] Audit log notice: " + aErr.getMessage());
                }
            } catch (Exception err) {
                Log.e(TAG, "❌ [DeviceHealth] Error sending device health: " + err.getMessage());
            }
        }).start();
    }
}
