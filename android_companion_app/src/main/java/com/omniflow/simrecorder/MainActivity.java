package com.omniflow.simrecorder;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private static final int PERMISSION_REQUEST_CODE = 101;
    private static final int FOLDER_PICKER_REQUEST_CODE = 202;
    
    // Production dashboard URL
    public static final String DASHBOARD_URL = "https://ems-crm-sandy.vercel.app";

    private TextView tvFolderStatus;
    private Button btnSelectFolder;
    private Button btnToggleService;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Root container (vertical LinearLayout)
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.WHITE);

        // Programmatic settings header bar
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setPadding(25, 15, 25, 15);
        header.setBackgroundColor(Color.parseColor("#0F172A")); // Dark Slate
        header.setGravity(Gravity.CENTER_VERTICAL);

        LinearLayout textContainer = new LinearLayout(this);
        textContainer.setOrientation(LinearLayout.VERTICAL);
        
        TextView tvTitle = new TextView(this);
        tvTitle.setText("OmniFlow Recording Engine");
        tvTitle.setTextColor(Color.WHITE);
        tvTitle.setTextSize(14f);
        tvTitle.setTypeface(null, Typeface.BOLD);

        tvFolderStatus = new TextView(this);
        tvFolderStatus.setText("⚠️ Folder Not Configured");
        tvFolderStatus.setTextColor(Color.parseColor("#EF4444")); // Red
        tvFolderStatus.setTextSize(11f);

        textContainer.addView(tvTitle);
        textContainer.addView(tvFolderStatus);

        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(
            0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
        header.addView(textContainer, textParams);

        btnSelectFolder = new Button(this);
        btnSelectFolder.setText("📁 Link Folder");
        btnSelectFolder.setTextSize(11f);
        btnSelectFolder.setTextColor(Color.WHITE);
        btnSelectFolder.setBackgroundColor(Color.parseColor("#3B82F6")); // Blue
        btnSelectFolder.setAllCaps(false);
        btnSelectFolder.setPadding(20, 5, 20, 5);
        btnSelectFolder.setOnClickListener(v -> selectCallRecordingsFolder());

        LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        btnParams.setMargins(10, 0, 10, 0);
        header.addView(btnSelectFolder, btnParams);

        btnToggleService = new Button(this);
        btnToggleService.setText("Pause");
        btnToggleService.setTextSize(11f);
        btnToggleService.setTextColor(Color.WHITE);
        btnToggleService.setBackgroundColor(Color.parseColor("#10B981")); // Green
        btnToggleService.setAllCaps(false);
        btnToggleService.setPadding(20, 5, 20, 5);
        btnToggleService.setOnClickListener(v -> toggleMonitorService());

        header.addView(btnToggleService, btnParams);

        // Add header to root
        root.addView(header);

        // Setup WebView
        WebView webView = new WebView(this);
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl(DASHBOARD_URL);

        LinearLayout.LayoutParams webViewParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f);
        root.addView(webView, webViewParams);

        setContentView(root);

        requestEssentialPermissions();
        updateUI();

        // Start background call monitor service if active
        SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
        boolean enabled = prefs.getBoolean("recording_enabled", true);
        if (enabled && hasAllPermissions()) {
            startMonitorService();
        }
    }

    private void updateUI() {
        SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
        boolean enabled = prefs.getBoolean("recording_enabled", true);
        String folderUriStr = prefs.getString("selected_folder_uri", "");

        if (enabled) {
            btnToggleService.setText("🟢 ACTIVE");
            btnToggleService.setBackgroundColor(Color.parseColor("#10B981")); // Green
        } else {
            btnToggleService.setText("🔴 PAUSED");
            btnToggleService.setBackgroundColor(Color.parseColor("#EF4444")); // Red
        }

        if (folderUriStr.isEmpty()) {
            tvFolderStatus.setText("⚠️ Link Call Recordings folder!");
            tvFolderStatus.setTextColor(Color.parseColor("#F59E0B")); // Amber
        } else {
            try {
                Uri folderUri = Uri.parse(folderUriStr);
                String folderName = folderUri.getLastPathSegment();
                if (folderName != null && folderName.contains(":")) {
                    folderName = folderName.substring(folderName.indexOf(":") + 1);
                }
                tvFolderStatus.setText("🟢 Linked: " + folderName);
                tvFolderStatus.setTextColor(Color.parseColor("#10B981")); // Green
            } catch (Exception e) {
                tvFolderStatus.setText("🟢 Folder Linked Successfully");
                tvFolderStatus.setTextColor(Color.parseColor("#10B981"));
            }
        }
    }

    private void selectCallRecordingsFolder() {
        try {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
            intent.addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION |
                            Intent.FLAG_GRANT_READ_URI_PERMISSION |
                            Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            startActivityForResult(intent, FOLDER_PICKER_REQUEST_CODE);
        } catch (Exception e) {
            Toast.makeText(this, "Error opening folder tree picker: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void toggleMonitorService() {
        SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
        boolean current = prefs.getBoolean("recording_enabled", true);
        boolean next = !current;
        prefs.edit().putBoolean("recording_enabled", next).apply();

        if (next) {
            startMonitorService();
            Toast.makeText(this, "✅ SIM Call Monitor Started!", Toast.LENGTH_SHORT).show();
        } else {
            stopMonitorService();
            Toast.makeText(this, "⏸ SIM Call Monitor Paused", Toast.LENGTH_SHORT).show();
        }
        updateUI();
    }

    private void startMonitorService() {
        try {
            Intent serviceIntent = new Intent(this, CallRecordingService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.e("OmniFlow", "Error starting service: " + e.getMessage());
        }
    }

    private void stopMonitorService() {
        try {
            Intent serviceIntent = new Intent(this, CallRecordingService.class);
            stopService(serviceIntent);
        } catch (Exception e) {
            Log.e("OmniFlow", "Error stopping service: " + e.getMessage());
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FOLDER_PICKER_REQUEST_CODE && resultCode == RESULT_OK) {
            if (data != null && data.getData() != null) {
                Uri treeUri = data.getData();
                try {
                    int takeFlags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                    getContentResolver().takePersistableUriPermission(treeUri, takeFlags);

                    SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
                    prefs.edit().putString("selected_folder_uri", treeUri.toString()).apply();

                    Toast.makeText(this, "✅ Recordings folder linked successfully!", Toast.LENGTH_LONG).show();
                    updateUI();
                } catch (Exception e) {
                    Toast.makeText(this, "Permission persistence failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            }
        }
    }

    private List<String> getRequiredPermissionsList() {
        List<String> list = new ArrayList<>();
        list.add(Manifest.permission.READ_PHONE_STATE);
        list.add(Manifest.permission.RECORD_AUDIO);
        list.add(Manifest.permission.READ_CALL_LOG);
        list.add(Manifest.permission.PROCESS_OUTGOING_CALLS);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            list.add(Manifest.permission.READ_MEDIA_AUDIO);
        } else {
            list.add(Manifest.permission.READ_EXTERNAL_STORAGE);
        }
        return list;
    }

    private boolean hasAllPermissions() {
        for (String perm : getRequiredPermissionsList()) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
        }
        return true;
    }

    private void requestEssentialPermissions() {
        List<String> missing = new ArrayList<>();
        for (String perm : getRequiredPermissionsList()) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                missing.add(perm);
            }
        }
        if (!missing.isEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        } else {
            checkOverlayPermission();
        }
    }

    private void checkOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            try {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName()));
                startActivity(intent);
                Toast.makeText(this, "👉 Enable 'Display over other apps' overlay widget permission", Toast.LENGTH_LONG).show();
            } catch (Exception e) {}
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (hasAllPermissions()) {
                Toast.makeText(this, "🟢 Permissions Authorized. SIM Listener active.", Toast.LENGTH_LONG).show();
                checkOverlayPermission();
                updateUI();
            } else {
                Toast.makeText(this, "⚠️ Please grant all permissions in settings for call recording sync.", Toast.LENGTH_LONG).show();
            }
        }
    }
}
