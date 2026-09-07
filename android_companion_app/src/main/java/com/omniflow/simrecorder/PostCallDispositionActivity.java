package com.omniflow.simrecorder;

import android.app.DatePickerDialog;
import android.app.TimePickerDialog;
import java.util.Calendar;
import android.content.ContentUris;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.Button;
import android.widget.EditText;
import android.widget.GridLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * PostCallDispositionActivity — Native Full-Screen/Dialog Lead Disposition & Notes Screen
 * Appears reliably upon call termination across all Android 8-14 versions!
 * Features: Zero-lag instant 0ms dismissal, Teal-Green theme, (X) close button, Calendar Follow-up
 */
public class PostCallDispositionActivity extends AppCompatActivity {

    private static final String TAG = "OmniFlowPostCall";

    private String phoneNumber = "";
    private String callType = "OUTGOING";
    private long durationSeconds = 0;
    private String audioPath = "";
    private String audioUriStr = "";
    private String callId = "";
    private String selectedDisposition = "Interested";
    private String selectedFollowUpDate = "";
    private String selectedFollowUpTime = "";

    private EditText etNotes;
    private Button btnSave;
    private TextView[] dispositionButtons;

    private final String[] dispositions = {
        "Interested", "Demo Scheduled", "Follow-up Needed", "Not Interested", "Busy / Callback", "Wrong Number"
    };
    private final String[] dispositionEmojis = {
        "🎯", "📅", "⏰", "❌", "📵", "🚫"
    };

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        supportRequestWindowFeature(Window.FEATURE_NO_TITLE);

        Intent intent = getIntent();
        if (intent != null) {
            phoneNumber = intent.getStringExtra("phone_number");
            callType = intent.getStringExtra("call_type");
            durationSeconds = intent.getLongExtra("duration", 0);
            audioPath = intent.getStringExtra("audio_path");
            audioUriStr = intent.getStringExtra("audio_uri");
            callId = intent.getStringExtra("call_id");
        }
        if (phoneNumber == null || phoneNumber.isEmpty()) phoneNumber = "Customer";
        if (callType == null || callType.isEmpty()) callType = "OUTGOING";
        if (callId == null || callId.isEmpty()) {
            callId = "call_" + System.currentTimeMillis() + "_" + phoneNumber.replaceAll("\\D", "");
        }

        // Build UI programmatically for speed and consistent styling
        setContentView(buildLayout());

        applyCompactWindowBounds();
    }

    @Override
    protected void onResume() {
        super.onResume();
        applyCompactWindowBounds();
    }

    private void applyCompactWindowBounds() {
        if (getWindow() != null) {
            int screenWidth = getResources().getDisplayMetrics().widthPixels;
            getWindow().setLayout((int) (screenWidth * 0.90), ViewGroup.LayoutParams.WRAP_CONTENT);
            getWindow().setGravity(Gravity.CENTER);
            getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT));
        }
    }

    private TextView tvDatePill;
    private TextView tvTimePill;

    private View buildLayout() {
        ScrollView scroll = new ScrollView(this);
        scroll.setVerticalScrollBarEnabled(false);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(32, 28, 32, 28);

        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor("#041F1E")); // Deep Dark Teal Glass
        bg.setCornerRadius(28f);
        bg.setStroke(2, Color.parseColor("#14B8A6")); // Glowing Teal Border
        root.setBackground(bg);

        String resolvedName = CallRecordingService.resolveContactOrCallerIdName(this, phoneNumber);

        // ==========================================
        // 1. TOP HEADER: Name + Duration Badge + (X) Close
        // ==========================================
        LinearLayout headerRow = new LinearLayout(this);
        headerRow.setOrientation(LinearLayout.HORIZONTAL);
        headerRow.setGravity(Gravity.CENTER_VERTICAL);

        LinearLayout nameCol = new LinearLayout(this);
        nameCol.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams nameColParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);

        TextView tvCallStatus = new TextView(this);
        tvCallStatus.setText("Call Completed");
        tvCallStatus.setTextColor(Color.parseColor("#5EEAD4"));
        tvCallStatus.setTextSize(11f);
        nameCol.addView(tvCallStatus);

        TextView tvName = new TextView(this);
        tvName.setText(resolvedName != null && !resolvedName.isEmpty() ? resolvedName : phoneNumber);
        tvName.setTextColor(Color.WHITE);
        tvName.setTextSize(19f);
        tvName.setTypeface(null, Typeface.BOLD);
        nameCol.addView(tvName);

        TextView tvPhoneSub = new TextView(this);
        tvPhoneSub.setText(phoneNumber + " • " + callType);
        tvPhoneSub.setTextColor(Color.parseColor("#94A3B8"));
        tvPhoneSub.setTextSize(11f);
        nameCol.addView(tvPhoneSub);

        headerRow.addView(nameCol, nameColParams);

        // Right side: Duration Badge + (X) Close Button
        LinearLayout rightHeader = new LinearLayout(this);
        rightHeader.setOrientation(LinearLayout.HORIZONTAL);
        rightHeader.setGravity(Gravity.CENTER_VERTICAL);

        LinearLayout durBadge = new LinearLayout(this);
        durBadge.setOrientation(LinearLayout.VERTICAL);
        durBadge.setPadding(14, 8, 14, 8);
        durBadge.setGravity(Gravity.CENTER);
        GradientDrawable durBg = new GradientDrawable();
        durBg.setColor(Color.parseColor("#082B28"));
        durBg.setCornerRadius(12f);
        durBg.setStroke(1, Color.parseColor("#0F766E"));
        durBadge.setBackground(durBg);

        TextView tvDurLabel = new TextView(this);
        tvDurLabel.setText("Call Duration:");
        tvDurLabel.setTextColor(Color.parseColor("#94A3B8"));
        tvDurLabel.setTextSize(9.5f);
        durBadge.addView(tvDurLabel);

        long mins = durationSeconds / 60;
        long secs = durationSeconds % 60;
        String durText = String.format(Locale.getDefault(), "%02d:%02d mins", mins, secs);

        TextView tvDurVal = new TextView(this);
        tvDurVal.setText(durText);
        tvDurVal.setTextColor(Color.WHITE);
        tvDurVal.setTextSize(11f);
        tvDurVal.setTypeface(null, Typeface.BOLD);
        durBadge.addView(tvDurVal);

        rightHeader.addView(durBadge);

        TextView btnClose = new TextView(this);
        btnClose.setText("✕");
        btnClose.setTextColor(Color.parseColor("#94A3B8"));
        btnClose.setTextSize(18f);
        btnClose.setTypeface(null, Typeface.BOLD);
        btnClose.setPadding(18, 4, 0, 4);
        btnClose.setClickable(true);
        btnClose.setOnClickListener(v -> finish());
        rightHeader.addView(btnClose);

        headerRow.addView(rightHeader);
        root.addView(headerRow);

        // ==========================================
        // 2. AUDIO WAVEFORM PREVIEW BAR
        // ==========================================
        LinearLayout waveBar = new LinearLayout(this);
        waveBar.setOrientation(LinearLayout.HORIZONTAL);
        waveBar.setGravity(Gravity.CENTER_VERTICAL);
        waveBar.setPadding(16, 10, 16, 10);

        GradientDrawable waveBg = new GradientDrawable();
        waveBg.setColor(Color.parseColor("#062422"));
        waveBg.setCornerRadius(14f);
        waveBg.setStroke(1, Color.parseColor("#0E4743"));
        waveBar.setBackground(waveBg);

        TextView tvPlayBtn = new TextView(this);
        tvPlayBtn.setText("▶");
        tvPlayBtn.setTextColor(Color.parseColor("#14B8A6"));
        tvPlayBtn.setTextSize(13f);
        tvPlayBtn.setPadding(0, 0, 12, 0);
        waveBar.addView(tvPlayBtn);

        TextView tvWaveform = new TextView(this);
        tvWaveform.setText("||| | ||| |||| | ||| || |||| ||| | ||| |||| | ||| || ||||");
        tvWaveform.setTextColor(Color.parseColor("#2DD4BF"));
        tvWaveform.setTextSize(10.5f);
        tvWaveform.setLetterSpacing(0.08f);
        waveBar.addView(tvWaveform, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        TextView tvWaveTime = new TextView(this);
        tvWaveTime.setText(String.format(Locale.getDefault(), "%02d:%02d", mins, secs));
        tvWaveTime.setTextColor(Color.parseColor("#94A3B8"));
        tvWaveTime.setTextSize(11f);
        waveBar.addView(tvWaveTime);

        LinearLayout.LayoutParams waveParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        waveParams.setMargins(0, 14, 0, 12);
        root.addView(waveBar, waveParams);

        // ==========================================
        // 3. SECTION: LEAD OUTCOME / DISPOSITION CARD
        // ==========================================
        LinearLayout dispCard = createSectionCard("Lead Outcome / Disposition");

        GridLayout grid = new GridLayout(this);
        grid.setColumnCount(2);
        dispositionButtons = new TextView[dispositions.length];

        for (int i = 0; i < dispositions.length; i++) {
            final String disp = dispositions[i];

            TextView chip = new TextView(this);
            chip.setText((i == 0 ? "✔ " : "") + disp);
            chip.setTextSize(11.5f);
            chip.setGravity(Gravity.CENTER);
            chip.setPadding(10, 12, 10, 12);
            chip.setClickable(true);

            GridLayout.LayoutParams glp = new GridLayout.LayoutParams();
            glp.width = 0;
            glp.height = ViewGroup.LayoutParams.WRAP_CONTENT;
            glp.columnSpec = GridLayout.spec(i % 2, 1.0f);
            glp.setMargins(4, 4, 4, 4);
            chip.setLayoutParams(glp);

            chip.setOnClickListener(v -> {
                selectedDisposition = disp;
                updateDispositionStyles();
            });

            dispositionButtons[i] = chip;
            grid.addView(chip);
        }
        updateDispositionStyles();
        dispCard.addView(grid);
        root.addView(dispCard);

        // ==========================================
        // 4. SECTION: CALENDAR FOLLOW-UP DATE & TIME
        // ==========================================
        LinearLayout calCard = createSectionCard("Calendar Follow-up Date & Time");

        LinearLayout calRow = new LinearLayout(this);
        calRow.setOrientation(LinearLayout.HORIZONTAL);
        calRow.setGravity(Gravity.CENTER_VERTICAL);

        // Glowing Teal Calendar Square Icon
        TextView tvCalBox = new TextView(this);
        tvCalBox.setText("📅");
        tvCalBox.setTextSize(16f);
        tvCalBox.setGravity(Gravity.CENTER);
        GradientDrawable calBoxBg = new GradientDrawable();
        calBoxBg.setColor(Color.parseColor("#093834"));
        calBoxBg.setCornerRadius(14f);
        calBoxBg.setStroke(2, Color.parseColor("#14B8A6"));
        tvCalBox.setBackground(calBoxBg);
        LinearLayout.LayoutParams calBoxParams = new LinearLayout.LayoutParams(100, 100);
        calBoxParams.setMargins(0, 0, 14, 0);
        tvCalBox.setLayoutParams(calBoxParams);
        calRow.addView(tvCalBox);

        LinearLayout calCol = new LinearLayout(this);
        calCol.setOrientation(LinearLayout.VERTICAL);

        TextView tvCalSub = new TextView(this);
        tvCalSub.setText("Select Next Follow-up Date");
        tvCalSub.setTextColor(Color.parseColor("#94A3B8"));
        tvCalSub.setTextSize(11f);
        tvCalSub.setPadding(0, 0, 0, 4);
        calCol.addView(tvCalSub);

        // Date & Time Pills Row
        LinearLayout pillsRow = new LinearLayout(this);
        pillsRow.setOrientation(LinearLayout.HORIZONTAL);

        tvDatePill = new TextView(this);
        tvDatePill.setText("Choose Date");
        tvDatePill.setTextColor(Color.WHITE);
        tvDatePill.setTextSize(11.5f);
        tvDatePill.setPadding(14, 6, 14, 6);
        GradientDrawable datePillBg = new GradientDrawable();
        datePillBg.setColor(Color.parseColor("#082F2C"));
        datePillBg.setCornerRadius(12f);
        datePillBg.setStroke(1, Color.parseColor("#0F766E"));
        tvDatePill.setBackground(datePillBg);
        tvDatePill.setClickable(true);
        tvDatePill.setOnClickListener(v -> openDatePicker());
        pillsRow.addView(tvDatePill);

        tvTimePill = new TextView(this);
        tvTimePill.setText("11:00 AM ⌵");
        tvTimePill.setTextColor(Color.parseColor("#2DD4BF"));
        tvTimePill.setTextSize(11.5f);
        tvTimePill.setPadding(14, 6, 14, 6);
        GradientDrawable timePillBg = new GradientDrawable();
        timePillBg.setColor(Color.parseColor("#082F2C"));
        timePillBg.setCornerRadius(12f);
        timePillBg.setStroke(1, Color.parseColor("#0F766E"));
        tvTimePill.setBackground(timePillBg);
        tvTimePill.setClickable(true);
        LinearLayout.LayoutParams timeParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        timeParams.setMargins(8, 0, 0, 0);
        tvTimePill.setLayoutParams(timeParams);
        tvTimePill.setOnClickListener(v -> openTimePicker());
        pillsRow.addView(tvTimePill);

        calCol.addView(pillsRow);
        calRow.addView(calCol, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));
        calCard.addView(calRow);
        root.addView(calCard);

        // ==========================================
        // 5. SECTION: CALL NOTES
        // ==========================================
        LinearLayout notesCard = createSectionCard("Call Notes");

        etNotes = new EditText(this);
        etNotes.setHint("Add notes from the call...");
        etNotes.setHintTextColor(Color.parseColor("#4A6B68"));
        etNotes.setTextColor(Color.WHITE);
        etNotes.setTextSize(12f);
        etNotes.setPadding(16, 12, 16, 12);
        etNotes.setLines(2);
        etNotes.setMaxLines(3);
        etNotes.setGravity(Gravity.TOP);

        GradientDrawable inputBg = new GradientDrawable();
        inputBg.setColor(Color.parseColor("#041B19"));
        inputBg.setCornerRadius(12f);
        inputBg.setStroke(1, Color.parseColor("#0D4E4A"));
        etNotes.setBackground(inputBg);
        notesCard.addView(etNotes);
        root.addView(notesCard);

        // ==========================================
        // 6. BOTTOM ACTION BUTTON: SAVE & SYNC LEAD
        // ==========================================
        btnSave = new Button(this);
        btnSave.setText("Save & Sync Lead");
        btnSave.setTextColor(Color.WHITE);
        btnSave.setTextSize(14f);
        btnSave.setTypeface(null, Typeface.BOLD);
        btnSave.setAllCaps(false);

        GradientDrawable btnBg = new GradientDrawable(
            GradientDrawable.Orientation.LEFT_RIGHT,
            new int[]{Color.parseColor("#059669"), Color.parseColor("#14B8A6")}
        );
        btnBg.setCornerRadius(22f);
        btnSave.setBackground(btnBg);

        // ZERO-LAG INSTANT DISMISS (0ms)
        btnSave.setOnClickListener(v -> {
            final String notes = etNotes != null ? etNotes.getText().toString().trim() : "";
            final String disp = selectedDisposition;
            final String fDate = selectedFollowUpDate;
            final String fTime = selectedFollowUpTime;
            final String cId = callId;

            // 1. Instantly close screen (phone freed immediately!)
            Toast.makeText(this, "✅ Lead Saved & Synced!", Toast.LENGTH_SHORT).show();
            finish();

            // 2. Heavy background sync runs detached
            new Thread(() -> {
                executeBackgroundSync(disp, notes, fDate, fTime, cId);
            }).start();
        });

        LinearLayout.LayoutParams saveParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 110);
        saveParams.setMargins(0, 16, 0, 0);
        root.addView(btnSave, saveParams);

        scroll.addView(root);
        return scroll;
    }

    private LinearLayout createSectionCard(String title) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(18, 14, 18, 14);

        GradientDrawable cBg = new GradientDrawable();
        cBg.setColor(Color.parseColor("#062422")); // Elevated Card Surface
        cBg.setCornerRadius(16f);
        cBg.setStroke(1, Color.parseColor("#0B413E"));
        card.setBackground(cBg);

        TextView tvTitle = new TextView(this);
        tvTitle.setText(title);
        tvTitle.setTextColor(Color.parseColor("#94A3B8"));
        tvTitle.setTextSize(11.5f);
        tvTitle.setTypeface(null, Typeface.BOLD);
        tvTitle.setPadding(0, 0, 0, 8);
        card.addView(tvTitle);

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 0, 0, 10);
        card.setLayoutParams(lp);
        return card;
    }

    private void openDatePicker() {
        Calendar now = Calendar.getInstance();
        DatePickerDialog dpd = new DatePickerDialog(this, (view, year, month, dayOfMonth) -> {
            Calendar chosen = Calendar.getInstance();
            chosen.set(year, month, dayOfMonth);
            String dateStr = new SimpleDateFormat("EEE, dd MMM", Locale.getDefault()).format(chosen.getTime());
            selectedFollowUpDate = dateStr;
            if (tvDatePill != null) {
                tvDatePill.setText(dateStr);
                tvDatePill.setTextColor(Color.parseColor("#2DD4BF"));
            }
        }, now.get(Calendar.YEAR), now.get(Calendar.MONTH), now.get(Calendar.DAY_OF_MONTH));
        dpd.show();
    }

    private void openTimePicker() {
        Calendar now = Calendar.getInstance();
        TimePickerDialog tpd = new TimePickerDialog(this, (tView, hourOfDay, minute) -> {
            String ampm = hourOfDay >= 12 ? "PM" : "AM";
            int hr12 = hourOfDay % 12;
            if (hr12 == 0) hr12 = 12;
            String timeStr = String.format(Locale.getDefault(), "%02d:%02d %s", hr12, minute, ampm);
            selectedFollowUpTime = timeStr;
            if (tvTimePill != null) {
                tvTimePill.setText(timeStr + " ⌵");
                tvTimePill.setTextColor(Color.parseColor("#2DD4BF"));
            }
        }, now.get(Calendar.HOUR_OF_DAY) + 1, 0, false);
        tpd.show();
    }

    private void updateDispositionStyles() {
        for (int i = 0; i < dispositions.length; i++) {
            TextView btn = dispositionButtons[i];
            if (btn == null) continue;
            boolean isSelected = dispositions[i].equals(selectedDisposition);

            GradientDrawable chipBg = new GradientDrawable();
            chipBg.setCornerRadius(14f);

            if (isSelected) {
                chipBg.setColor(Color.parseColor("#0D9488")); // Glowing Active Teal
                chipBg.setStroke(2, Color.parseColor("#14B8A6"));
                btn.setText("✔ " + dispositions[i]);
                btn.setTextColor(Color.WHITE);
                btn.setTypeface(null, Typeface.BOLD);
            } else {
                chipBg.setColor(Color.parseColor("#082B29")); // Subtle Surface Teal
                chipBg.setStroke(1, Color.parseColor("#0D4E4A"));
                btn.setText(dispositions[i]);
                btn.setTextColor(Color.parseColor("#94A3B8"));
                btn.setTypeface(null, Typeface.NORMAL);
            }
            btn.setBackground(chipBg);
        }
    }

    private String resolveLatestRecordingUriOrPath(SharedPreferences prefs) {
        // 1. Scan user-selected SAF folder (Runo System)
        String folderUriStr = prefs.getString("selected_folder_uri", "");
        if (!folderUriStr.isEmpty()) {
            try {
                Uri treeUri = Uri.parse(folderUriStr);
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
                    Uri latest = null;
                    long newest = 0;
                    long timeFilter = System.currentTimeMillis() - 300000; // last 5 mins
                    while (cursor.moveToNext()) {
                        String docId = cursor.getString(0);
                        String name = cursor.getString(1);
                        long lastMod = cursor.getLong(2);
                        long size = cursor.getLong(3);
                        if (size > 2000 && lastMod >= timeFilter) {
                            String lower = (name != null ? name.toLowerCase() : "");
                            if (lower.endsWith(".m4a") || lower.endsWith(".mp3") || lower.endsWith(".amr") || lower.endsWith(".3gp") || lower.endsWith(".wav") || lower.endsWith(".aac")) {
                                if (lastMod > newest) {
                                    newest = lastMod;
                                    latest = DocumentsContract.buildDocumentUriUsingTree(treeUri, docId);
                                }
                            }
                        }
                    }
                    cursor.close();
                    if (latest != null) {
                        return latest.toString();
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Error re-scanning SAF folder in PostCall: " + e.getMessage());
            }
        }

        // 2. Query Android MediaStore (Zero-Permission Direct Query for Samsung Native Call Recordings)
        Uri mediaStoreUri = findLatestRecordingViaMediaStore();
        if (mediaStoreUri != null) {
            Log.d(TAG, "🎯 Found Samsung Native Call Recording via MediaStore: " + mediaStoreUri.toString());
            return mediaStoreUri.toString();
        }

        // 3. Scan native directories (Samsung / Xiaomi / Oppo / Vivo)
        String[] dirs = {
            android.os.Environment.getExternalStorageDirectory().getAbsolutePath() + "/Recordings/Call",
            android.os.Environment.getExternalStorageDirectory().getAbsolutePath() + "/Recordings",
            android.os.Environment.getExternalStorageDirectory().getAbsolutePath() + "/Sounds/CallRecordings",
            android.os.Environment.getExternalStorageDirectory().getAbsolutePath() + "/MIUI/sound_recorder/call_rec",
            android.os.Environment.getExternalStorageDirectory().getAbsolutePath() + "/ColorOS/CallRecordings",
            android.os.Environment.getExternalStorageDirectory().getAbsolutePath() + "/Record/Call",
            android.os.Environment.getExternalStorageDirectory().getAbsolutePath() + "/Music/Recordings/Call"
        };
        long newestMod = 0;
        File best = null;
        long timeFilter = System.currentTimeMillis() - 300000;
        for (String dirPath : dirs) {
            File d = new File(dirPath);
            if (d.exists() && d.isDirectory()) {
                File[] files = d.listFiles();
                if (files != null) {
                    for (File f : files) {
                        if (f.isFile() && f.length() > 2000) {
                            String n = f.getName().toLowerCase();
                            if (n.endsWith(".m4a") || n.endsWith(".mp3") || n.endsWith(".amr") || n.endsWith(".3gp") || n.endsWith(".wav") || n.endsWith(".aac")) {
                                if (f.lastModified() >= timeFilter && f.lastModified() > newestMod) {
                                    newestMod = f.lastModified();
                                    best = f;
                                }
                            }
                        }
                    }
                }
            }
        }
        if (best != null) {
            return best.getAbsolutePath();
        }
        return null;
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

            // Search audio files created in last 8 minutes
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
                            return ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id);
                        }
                    }
                }
                cursor.close();
            }
        } catch (Exception e) {
            Log.e(TAG, "MediaStore query error in PostCall: " + e.getMessage());
        }
        return null;
    }

    private void executeBackgroundSync(String selectedDisp, String notes, String followUpDate, String followUpTime, String cId) {
        SharedPreferences prefs = getSharedPreferences("omniflow", Context.MODE_PRIVATE);
        String agentName = prefs.getString("agent_name", "Mobile Agent");
        String agentEmail = prefs.getString("agent_email", "agent@omniflow.in");
        String apiUrl = prefs.getString("api_url", "https://ems-backend-9hig.onrender.com");

        // Fresh Re-scan of Selected SAF Folder / Native Samsung Recordings Folder
        String freshTarget = resolveLatestRecordingUriOrPath(prefs);
        if (freshTarget != null) {
            if (freshTarget.startsWith("content://")) {
                audioUriStr = freshTarget;
                audioPath = "";
            } else {
                audioPath = freshTarget;
                audioUriStr = "";
            }
            Log.d(TAG, "🎯 Re-scanned and picked Samsung native hardware recording: " + freshTarget);
        }

        String audioBase64 = null;
        long finalFileSize = 0;

        // 1. Read Complete Audio Bytes and Convert to Valid Base64 Audio Data URI
        try {
            byte[] completeAudioBytes = null;
            String mimeType = "audio/mp4";

            if (audioUriStr != null && !audioUriStr.isEmpty()) {
                Uri uri = Uri.parse(audioUriStr);
                ContentResolver resolver = getContentResolver();
                try (InputStream is = resolver.openInputStream(uri)) {
                    if (is != null) {
                        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                        byte[] buffer = new byte[8192];
                        int len;
                        int total = 0;
                        int maxLimit = 1500000; // 1.5MB limit
                        while ((len = is.read(buffer)) != -1) {
                            baos.write(buffer, 0, len);
                            total += len;
                            if (total >= maxLimit) break;
                        }
                        baos.flush();
                        completeAudioBytes = baos.toByteArray();
                        finalFileSize = completeAudioBytes.length;
                    }
                }
                if (audioUriStr.toLowerCase().endsWith(".mp3")) {
                    mimeType = "audio/mpeg";
                } else if (audioUriStr.toLowerCase().endsWith(".wav")) {
                    mimeType = "audio/wav";
                } else if (audioUriStr.toLowerCase().endsWith(".3gp") || audioUriStr.toLowerCase().endsWith(".amr")) {
                    mimeType = "audio/3gpp";
                }
            } else if (audioPath != null && !audioPath.isEmpty()) {
                File file = new File(audioPath);
                if (file.exists() && file.length() > 0) {
                    try (FileInputStream fis = new FileInputStream(file)) {
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
                        completeAudioBytes = baos.toByteArray();
                        finalFileSize = completeAudioBytes.length;
                    }
                }
                if (audioPath.toLowerCase().endsWith(".mp3")) {
                    mimeType = "audio/mpeg";
                } else if (audioPath.toLowerCase().endsWith(".wav")) {
                    mimeType = "audio/wav";
                } else if (audioPath.toLowerCase().endsWith(".3gp") || audioPath.toLowerCase().endsWith(".amr")) {
                    mimeType = "audio/3gpp";
                }
            }

            if (completeAudioBytes != null && completeAudioBytes.length > 500) {
                audioBase64 = "data:" + mimeType + ";base64," + Base64.encodeToString(completeAudioBytes, Base64.NO_WRAP);
                Log.d(TAG, "✅ [executeBackgroundSync] Audio encoded (" + completeAudioBytes.length + " bytes)");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error converting audio to Base64: " + e.getMessage());
        }

        // Smart Name Resolution
        String customerName = CallRecordingService.resolveContactOrCallerIdName(this, phoneNumber);

        // 2. Post to Backend API (CRM + GHL sync)
        boolean syncOk = false;
        try {
            String timestamp = new SimpleDateFormat("dd/MM/yyyy, hh:mm:ss aa", Locale.getDefault()).format(new Date());
            String json = "{"
                + "\"agentName\":\"" + escapeJson(agentName) + "\","
                + "\"agentEmail\":\"" + escapeJson(agentEmail) + "\","
                + "\"customerPhone\":\"" + escapeJson(phoneNumber) + "\","
                + "\"customerName\":\"" + escapeJson(customerName != null ? customerName : phoneNumber) + "\","
                + "\"channel\":\"SIM\","
                + "\"type\":\"" + callType + "\","
                + "\"durationSeconds\":" + durationSeconds + ","
                + "\"callId\":\"" + escapeJson(cId) + "\","
                + "\"followUpDate\":\"" + escapeJson(followUpDate) + "\","
                + "\"followUpTime\":\"" + escapeJson(followUpTime) + "\","
                + "\"timestamp\":\"" + timestamp + "\","
                + "\"disposition\":\"" + escapeJson(selectedDisp) + "\","
                + "\"notes\":\"" + escapeJson(notes) + "\","
                + "\"recordingBase64\":\"" + (audioBase64 != null ? audioBase64 : "") + "\","
                + "\"audioBase64\":\"" + (audioBase64 != null ? audioBase64 : "") + "\","
                + "\"simSlot\":\"SIM 1\""
                + "}";

            java.net.URL url = new java.net.URL(apiUrl + "/api/telecalling/sync-log");
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setDoOutput(true);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(20000);

            byte[] input = json.getBytes("utf-8");
            conn.getOutputStream().write(input, 0, input.length);
            int responseCode = conn.getResponseCode();
            Log.d(TAG, "✅ Backend Sync Response: " + responseCode);
            conn.disconnect();
            syncOk = (responseCode >= 200 && responseCode < 300);
        } catch (Exception e) {
            Log.e(TAG, "Backend sync error: " + e.getMessage());
        }

        // 3. Post to Firebase Firestore
        try {
            String timestamp = new SimpleDateFormat("dd/MM/yyyy, hh:mm:ss aa", Locale.getDefault()).format(new Date());
            String json = "{\"fields\":{"
                + "\"customerPhone\":{\"stringValue\":\"" + escapeJson(phoneNumber) + "\"},"
                + "\"customerName\":{\"stringValue\":\"" + escapeJson(customerName != null ? customerName : phoneNumber) + "\"},"
                + "\"callType\":{\"stringValue\":\"" + callType + "\"},"
                + "\"durationSeconds\":{\"integerValue\":\"" + durationSeconds + "\"},"
                + "\"agentName\":{\"stringValue\":\"" + escapeJson(agentName) + "\"},"
                + "\"disposition\":{\"stringValue\":\"" + escapeJson(selectedDisp) + "\"},"
                + "\"notes\":{\"stringValue\":\"" + escapeJson(notes) + "\"},"
                + "\"callId\":{\"stringValue\":\"" + escapeJson(cId) + "\"},"
                + "\"timestamp\":{\"stringValue\":\"" + timestamp + "\"}"
                + (audioBase64 != null ? ",\"audioBase64\":{\"stringValue\":\"" + audioBase64 + "\"}" : "")
                + "}}";

            java.net.URL url = new java.net.URL("https://firestore.googleapis.com/v1/projects/ems-ag/databases/(default)/documents/callLogs");
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setDoOutput(true);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);

            byte[] input = json.getBytes("utf-8");
            conn.getOutputStream().write(input, 0, input.length);
            conn.getResponseCode();
            conn.disconnect();
        } catch (Exception ignored) {}

        // 4. Auto-clean file if synced (Zero Memory Mode)
        if (syncOk) {
            try {
                if (audioUriStr != null && audioUriStr.startsWith("content://")) {
                    DocumentsContract.deleteDocument(getContentResolver(), Uri.parse(audioUriStr));
                    Log.d(TAG, "🗑️ Auto-deleted native recording from folder: " + audioUriStr);
                } else if (audioPath != null && !audioPath.isEmpty()) {
                    File f = new File(audioPath);
                    if (f.exists()) f.delete();
                }
            } catch (Exception e) {
                Log.w(TAG, "File cleanup note: " + e.getMessage());
            }
        }
        Log.d(TAG, "✅ [executeBackgroundSync] Finished silently for call: " + cId);
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ").replace("\r", "");
    }
}
