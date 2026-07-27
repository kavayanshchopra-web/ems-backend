package com.omniflow.simrecorder;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import java.util.ArrayList;
import java.util.List;

public class PermissionsActivity extends AppCompatActivity {

    private static final int PERMISSION_REQ_CODE = 301;
    private static final int OVERLAY_REQ_CODE = 302;
    private static final int BATTERY_REQ_CODE = 303;
    private static final int SAF_FOLDER_REQ_CODE = 304;

    private TextView tvPhoneStatus;
    private TextView tvNotifStatus;
    private TextView tvBatteryStatus;
    private TextView tvOverlayStatus;
    private TextView tvFolderStatus;
    private Button btnActionButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Root vertical layout
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#F8FAFC")); // Light slate

        // 1. Header Bar (OmniFlow Emerald Theme Gradient)
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setPadding(40, 45, 40, 35);
        header.setGravity(Gravity.CENTER_VERTICAL);

        GradientDrawable headerBg = new GradientDrawable(
            GradientDrawable.Orientation.LEFT_RIGHT,
            new int[]{Color.parseColor("#0F2B26"), Color.parseColor("#0D9488")}
        );
        header.setBackground(headerBg);

        TextView tvHeaderTitle = new TextView(this);
        tvHeaderTitle.setText("App Permissions");
        tvHeaderTitle.setTextColor(Color.WHITE);
        tvHeaderTitle.setTextSize(20f);
        tvHeaderTitle.setTypeface(null, Typeface.BOLD);

        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        header.addView(tvHeaderTitle, titleParams);

        root.addView(header);

        // 2. Scrollable Body
        ScrollView scrollView = new ScrollView(this);
        scrollView.setFillViewport(true);

        LinearLayout bodyLayout = new LinearLayout(this);
        bodyLayout.setOrientation(LinearLayout.VERTICAL);
        bodyLayout.setPadding(40, 30, 40, 30);

        // Generic Subtitle for all features
        TextView tvSubtitle = new TextView(this);
        tvSubtitle.setText("Please grant the required permissions below to ensure seamless operation of all app features.");
        tvSubtitle.setTextColor(Color.parseColor("#475569"));
        tvSubtitle.setTextSize(13f);
        tvSubtitle.setLineSpacing(0, 1.3f);
        tvSubtitle.setPadding(0, 0, 0, 30);
        bodyLayout.addView(tvSubtitle);

        // Permission Items List
        bodyLayout.addView(createPermissionRow("📞", "Phone & Call Log",
            "To track and update your incoming and outgoing call logs in OmniFlow CRM.",
            tvPhoneStatus = new TextView(this), v -> requestPhonePermissions()));

        bodyLayout.addView(createPermissionRow("🔔", "Notifications",
            "To show real-time background call recording service status.",
            tvNotifStatus = new TextView(this), v -> requestNotificationPermission()));

        bodyLayout.addView(createPermissionRow("🔋", "Battery Saver Exemption",
            "To prevent Android OS from killing the call recording service in background.",
            tvBatteryStatus = new TextView(this), v -> requestBatteryOptimizationPermission()));

        bodyLayout.addView(createPermissionRow("🪟", "Display Overlay",
            "To show live caller widget and floating call timer during active calls.",
            tvOverlayStatus = new TextView(this), v -> requestOverlayPermission()));

        bodyLayout.addView(createPermissionRow("📁", "Call Recordings Folder",
            "To access native phone recordings for automatic HD audio upload to CRM.",
            tvFolderStatus = new TextView(this), v -> requestFolderPermission()));

        scrollView.addView(bodyLayout);

        LinearLayout.LayoutParams scrollParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f);
        root.addView(scrollView, scrollParams);

        // 3. Bottom Action Button Bar
        LinearLayout bottomBar = new LinearLayout(this);
        bottomBar.setPadding(40, 20, 40, 30);
        bottomBar.setBackgroundColor(Color.WHITE);

        btnActionButton = new Button(this);
        btnActionButton.setText("Request Permissions");
        btnActionButton.setTextColor(Color.WHITE);
        btnActionButton.setTextSize(15f);
        btnActionButton.setTypeface(null, Typeface.BOLD);
        btnActionButton.setAllCaps(false);

        GradientDrawable btnBg = new GradientDrawable(
            GradientDrawable.Orientation.LEFT_RIGHT,
            new int[]{Color.parseColor("#0D9488"), Color.parseColor("#059669")}
        );
        btnBg.setCornerRadius(24f);
        btnActionButton.setBackground(btnBg);
        btnActionButton.setPadding(0, 25, 0, 25);
        btnActionButton.setOnClickListener(v -> requestNextMissingPermission());

        LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        bottomBar.addView(btnActionButton, btnParams);

        root.addView(bottomBar);

        setContentView(root);
        updateAllPermissionStatuses();
    }

    private View createPermissionRow(String iconEmoji, String title, String description, TextView tvStatus, View.OnClickListener onClickListener) {
        LinearLayout rowCard = new LinearLayout(this);
        rowCard.setOrientation(LinearLayout.HORIZONTAL);
        rowCard.setPadding(30, 25, 30, 25);
        rowCard.setGravity(Gravity.CENTER_VERTICAL);
        rowCard.setOnClickListener(onClickListener);

        GradientDrawable cardBg = new GradientDrawable();
        cardBg.setColor(Color.WHITE);
        cardBg.setCornerRadius(20f);
        cardBg.setStroke(2, Color.parseColor("#E2E8F0"));
        rowCard.setBackground(cardBg);

        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        cardParams.setMargins(0, 0, 0, 20);
        rowCard.setLayoutParams(cardParams);

        // Icon Circle
        TextView tvIcon = new TextView(this);
        tvIcon.setText(iconEmoji);
        tvIcon.setTextSize(20f);
        tvIcon.setGravity(Gravity.CENTER);

        GradientDrawable iconBg = new GradientDrawable();
        iconBg.setColor(Color.parseColor("#F0FDF4")); // Light Emerald
        iconBg.setCornerRadius(50f);
        tvIcon.setBackground(iconBg);

        LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(110, 110);
        iconParams.setMargins(0, 0, 25, 0);
        rowCard.addView(tvIcon, iconParams);

        // Title + Description
        LinearLayout textLayout = new LinearLayout(this);
        textLayout.setOrientation(LinearLayout.VERTICAL);

        TextView tvTitle = new TextView(this);
        tvTitle.setText(title);
        tvTitle.setTextColor(Color.parseColor("#0F2B26"));
        tvTitle.setTextSize(15f);
        tvTitle.setTypeface(null, Typeface.BOLD);

        TextView tvDesc = new TextView(this);
        tvDesc.setText(description);
        tvDesc.setTextColor(Color.parseColor("#64748B"));
        tvDesc.setTextSize(11f);
        tvDesc.setLineSpacing(0, 1.2f);

        textLayout.addView(tvTitle);
        textLayout.addView(tvDesc);

        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(
            0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
        rowCard.addView(textLayout, textParams);

        // Status Badge (Tick or Warning)
        tvStatus.setTextSize(16f);
        tvStatus.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams statusParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        statusParams.setMargins(15, 0, 0, 0);
        rowCard.addView(tvStatus, statusParams);

        return rowCard;
    }

    private void updateAllPermissionStatuses() {
        boolean phoneGranted = isPhonePermissionGranted();
        setBadgedStatus(tvPhoneStatus, phoneGranted);

        boolean notifGranted = isNotificationPermissionGranted();
        setBadgedStatus(tvNotifStatus, notifGranted);

        boolean batteryGranted = isBatteryOptimizationGranted();
        setBadgedStatus(tvBatteryStatus, batteryGranted);

        boolean overlayGranted = isOverlayPermissionGranted();
        setBadgedStatus(tvOverlayStatus, overlayGranted);

        boolean folderGranted = isFolderPermissionGranted();
        setBadgedStatus(tvFolderStatus, folderGranted);

        boolean allGranted = phoneGranted && notifGranted && batteryGranted && overlayGranted && folderGranted;
        if (allGranted) {
            btnActionButton.setText("🚀 Launch OmniFlow Telecalling");
            GradientDrawable btnBg = new GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                new int[]{Color.parseColor("#10B981"), Color.parseColor("#059669")}
            );
            btnBg.setCornerRadius(24f);
            btnActionButton.setBackground(btnBg);
        } else {
            btnActionButton.setText("Request Permissions");
        }
    }

    private void setBadgedStatus(TextView tv, boolean granted) {
        if (granted) {
            tv.setText("✓");
            tv.setTextColor(Color.parseColor("#10B981")); // Green
            tv.setTypeface(null, Typeface.BOLD);
        } else {
            tv.setText("⚠️");
            tv.setTextColor(Color.parseColor("#F59E0B")); // Amber
        }
    }

    private boolean isPhonePermissionGranted() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED &&
               ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED &&
               ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isNotificationPermissionGranted() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    private boolean isBatteryOptimizationGranted() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            return pm != null && pm.isIgnoringBatteryOptimizations(getPackageName());
        }
        return true;
    }

    private boolean isOverlayPermissionGranted() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(this);
        }
        return true;
    }

    private boolean isFolderPermissionGranted() {
        SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
        String uriStr = prefs.getString("selected_folder_uri", "");
        return !uriStr.isEmpty();
    }

    private void requestNextMissingPermission() {
        if (!isPhonePermissionGranted()) {
            requestPhonePermissions();
        } else if (!isNotificationPermissionGranted()) {
            requestNotificationPermission();
        } else if (!isBatteryOptimizationGranted()) {
            requestBatteryOptimizationPermission();
        } else if (!isOverlayPermissionGranted()) {
            requestOverlayPermission();
        } else if (!isFolderPermissionGranted()) {
            requestFolderPermission();
        } else {
            finishAndLaunchMain();
        }
    }

    private void requestPhonePermissions() {
        List<String> list = new ArrayList<>();
        list.add(Manifest.permission.READ_PHONE_STATE);
        list.add(Manifest.permission.READ_CALL_LOG);
        list.add(Manifest.permission.RECORD_AUDIO);
        list.add(Manifest.permission.PROCESS_OUTGOING_CALLS);
        ActivityCompat.requestPermissions(this, list.toArray(new String[0]), PERMISSION_REQ_CODE);
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, PERMISSION_REQ_CODE);
        }
    }

    private void requestBatteryOptimizationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getPackageName()));
                startActivityForResult(intent, BATTERY_REQ_CODE);
            } catch (Exception e) {
                Toast.makeText(this, "Please disable battery saver manually for OmniFlow", Toast.LENGTH_SHORT).show();
            }
        }
    }

    private void requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getPackageName()));
            startActivityForResult(intent, OVERLAY_REQ_CODE);
        }
    }

    private void requestFolderPermission() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION |
                        Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
                        Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(intent, SAF_FOLDER_REQ_CODE);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == SAF_FOLDER_REQ_CODE && resultCode == RESULT_OK && data != null) {
            Uri treeUri = data.getData();
            if (treeUri != null) {
                getContentResolver().takePersistableUriPermission(treeUri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                getSharedPreferences("omniflow", MODE_PRIVATE)
                    .edit()
                    .putString("selected_folder_uri", treeUri.toString())
                    .apply();
                Toast.makeText(this, "✓ Call Recordings Folder Linked!", Toast.LENGTH_SHORT).show();
            }
        }
        updateAllPermissionStatuses();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        updateAllPermissionStatuses();
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateAllPermissionStatuses();
    }

    private void finishAndLaunchMain() {
        getSharedPreferences("omniflow", MODE_PRIVATE)
            .edit()
            .putBoolean("permissions_onboarded", true)
            .apply();
        Intent intent = new Intent(this, MainActivity.class);
        startActivity(intent);
        finish();
    }
}
