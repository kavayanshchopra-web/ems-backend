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
import android.view.View;
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

import com.journeyapps.barcodescanner.ScanContract;
import com.journeyapps.barcodescanner.ScanOptions;
import org.json.JSONObject;

public class MainActivity extends AppCompatActivity {

    private static final int PERMISSION_REQUEST_CODE = 101;
    private static final int FOLDER_PICKER_REQUEST_CODE = 202;
    
    // Production dashboard URL
    public static final String DASHBOARD_URL = "https://ems-crm-sandy.vercel.app";

    private TextView tvFolderStatus;
    private Button btnScanQr;
    private Button btnSelectFolder;
    private Button btnToggleService;
    private Button btnExtSetup;
    private LinearLayout header;

    // QR Code Scanner Launcher
    private final androidx.activity.result.ActivityResultLauncher<ScanOptions> barcodeLauncher = 
        registerForActivityResult(new ScanContract(), result -> {
            if (result.getContents() != null) {
                handleScannedQrData(result.getContents());
            }
        });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Root container (vertical LinearLayout)
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.WHITE);

        // Programmatic settings header bar
        header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setPadding(16, 12, 16, 12);
        header.setBackgroundColor(Color.parseColor("#0F172A")); // Dark Slate
        header.setGravity(Gravity.CENTER_VERTICAL);

        LinearLayout textContainer = new LinearLayout(this);
        textContainer.setOrientation(LinearLayout.VERTICAL);
        
        TextView tvTitle = new TextView(this);
        tvTitle.setText("OmniFlow PBX");
        tvTitle.setTextColor(Color.WHITE);
        tvTitle.setTextSize(12f);
        tvTitle.setTypeface(null, Typeface.BOLD);

        tvFolderStatus = new TextView(this);
        tvFolderStatus.setText("Ext: 101 • Ready");
        tvFolderStatus.setTextColor(Color.parseColor("#10B981")); // Green
        tvFolderStatus.setTextSize(10f);

        textContainer.addView(tvTitle);
        textContainer.addView(tvFolderStatus);

        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(
            0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
        header.addView(textContainer, textParams);

        // 1. Scan QR from Laptop Button
        btnScanQr = new Button(this);
        btnScanQr.setText("📷 Scan QR");
        btnScanQr.setTextSize(11f);
        btnScanQr.setTextColor(Color.WHITE);
        btnScanQr.setBackgroundColor(Color.parseColor("#0D9488")); // Emerald Teal
        btnScanQr.setAllCaps(false);
        btnScanQr.setPadding(12, 5, 12, 5);
        btnScanQr.setOnClickListener(v -> startQrScanner());

        LinearLayout.LayoutParams qrParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        qrParams.setMargins(3, 0, 3, 0);
        header.addView(btnScanQr, qrParams);

        // 2. Extension Setup Button
        btnExtSetup = new Button(this);
        btnExtSetup.setText("☎️ 101");
        btnExtSetup.setTextSize(11f);
        btnExtSetup.setTextColor(Color.WHITE);
        btnExtSetup.setBackgroundColor(Color.parseColor("#6366F1")); // Indigo
        btnExtSetup.setAllCaps(false);
        btnExtSetup.setPadding(12, 5, 12, 5);
        btnExtSetup.setOnClickListener(v -> showExtensionConfigDialog());

        header.addView(btnExtSetup, qrParams);

        // 3. Folder Button
        btnSelectFolder = new Button(this);
        btnSelectFolder.setText("📁 Folder");
        btnSelectFolder.setTextSize(11f);
        btnSelectFolder.setTextColor(Color.WHITE);
        btnSelectFolder.setBackgroundColor(Color.parseColor("#3B82F6")); // Blue
        btnSelectFolder.setAllCaps(false);
        btnSelectFolder.setPadding(12, 5, 12, 5);
        btnSelectFolder.setOnClickListener(v -> selectCallRecordingsFolder());

        header.addView(btnSelectFolder, qrParams);

        // 4. Toggle Service Button
        btnToggleService = new Button(this);
        btnToggleService.setText("🟢 ACTIVE");
        btnToggleService.setTextSize(11f);
        btnToggleService.setTextColor(Color.WHITE);
        btnToggleService.setBackgroundColor(Color.parseColor("#10B981")); // Green
        btnToggleService.setAllCaps(false);
        btnToggleService.setPadding(12, 5, 12, 5);
        btnToggleService.setOnClickListener(v -> toggleMonitorService());

        header.addView(btnToggleService, qrParams);

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
        startMonitorService();
    }

    private void startQrScanner() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, 109);
            return;
        }
        ScanOptions options = new ScanOptions();
        options.setPrompt("Scan Laptop CRM Pairing QR Code");
        options.setBeepEnabled(true);
        options.setOrientationLocked(false);
        options.setBarcodeImageEnabled(false);
        barcodeLauncher.launch(options);
    }

    private void handleScannedQrData(String rawData) {
        try {
            JSONObject json = new JSONObject(rawData);
            String action = json.optString("action", "");
            String serverUrl = json.optString("serverUrl", "");
            String ext = json.optString("extension", "101");
            String name = json.optString("staffName", "Telecaller Agent");

            if (!serverUrl.isEmpty()) {
                SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
                prefs.edit()
                    .putString("api_url", serverUrl)
                    .putString("extension", ext)
                    .putString("staff_id", ext)
                    .putString("staff_name", name)
                    .apply();

                updateUI();
                stopMonitorService();
                startMonitorService();

                android.app.AlertDialog.Builder builder = new android.app.AlertDialog.Builder(this);
                builder.setTitle("🎉 Paired Successfully!");
                builder.setMessage("Connected to Laptop CRM!\n\nExtension: " + ext + "\nAgent: " + name + "\nServer: " + serverUrl);
                builder.setPositiveButton("OK", null);
                builder.show();
            } else {
                Toast.makeText(this, "Invalid QR Code: Server URL missing", Toast.LENGTH_LONG).show();
            }
        } catch (Exception e) {
            // Handle plain URL or extension text
            Toast.makeText(this, "QR Code Scanned: " + rawData, Toast.LENGTH_SHORT).show();
        }
    }


    private void showExtensionConfigDialog() {
        SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
        String currentExt = prefs.getString("extension", "101");
        String currentName = prefs.getString("staff_name", "Telecaller Agent");
        String currentUrl = prefs.getString("api_url", "http://192.168.29.95:5000");

        android.app.AlertDialog.Builder builder = new android.app.AlertDialog.Builder(this);
        builder.setTitle("📞 Telecaller Extension & Server Setup");

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(40, 20, 40, 10);

        TextView tvExtLabel = new TextView(this);
        tvExtLabel.setText("Your Extension Number (e.g. 101, 102, 103):");
        tvExtLabel.setTextSize(12f);
        layout.addView(tvExtLabel);

        final android.widget.EditText inputExt = new android.widget.EditText(this);
        inputExt.setText(currentExt);
        inputExt.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        layout.addView(inputExt);

        TextView tvNameLabel = new TextView(this);
        tvNameLabel.setText("Staff / Agent Name:");
        tvNameLabel.setTextSize(12f);
        tvNameLabel.setPadding(0, 15, 0, 0);
        layout.addView(tvNameLabel);

        final android.widget.EditText inputName = new android.widget.EditText(this);
        inputName.setText(currentName);
        layout.addView(inputName);

        TextView tvUrlLabel = new TextView(this);
        tvUrlLabel.setText("CRM Server IP / URL:");
        tvUrlLabel.setTextSize(12f);
        tvUrlLabel.setPadding(0, 15, 0, 0);
        layout.addView(tvUrlLabel);

        final android.widget.EditText inputUrl = new android.widget.EditText(this);
        inputUrl.setText(currentUrl);
        layout.addView(inputUrl);

        builder.setView(layout);

        builder.setPositiveButton("Save & Pair", (dialog, which) -> {
            String newExt = inputExt.getText().toString().trim();
            String newName = inputName.getText().toString().trim();
            String newUrl = inputUrl.getText().toString().trim();

            if (newExt.isEmpty()) newExt = "101";
            if (newName.isEmpty()) newName = "Telecaller Agent";
            if (newUrl.isEmpty()) newUrl = "http://192.168.29.95:5000";

            prefs.edit()
                .putString("extension", newExt)
                .putString("staff_id", newExt)
                .putString("staff_name", newName)
                .putString("api_url", newUrl)
                .apply();

            updateUI();
            // Restart SimBridgeService to apply new credentials
            stopMonitorService();
            startMonitorService();

            Toast.makeText(MainActivity.this, "✅ Extension " + newExt + " Paired Successfully!", Toast.LENGTH_LONG).show();
        });

        builder.setNegativeButton("Cancel", (dialog, which) -> dialog.cancel());
        builder.show();
    }

    private void updateUI() {
        SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
        boolean enabled = prefs.getBoolean("recording_enabled", true);
        String folderUriStr = prefs.getString("selected_folder_uri", "");
        String ext = prefs.getString("extension", "101");
        String name = prefs.getString("staff_name", "Telecaller Agent");

        if (btnExtSetup != null) {
            btnExtSetup.setText("☎️ Ext: " + ext);
        }

        if (enabled) {
            btnToggleService.setText("🟢 ACTIVE");
            btnToggleService.setBackgroundColor(Color.parseColor("#10B981")); // Green
        } else {
            btnToggleService.setText("🔴 PAUSED");
            btnToggleService.setBackgroundColor(Color.parseColor("#EF4444")); // Red
        }

        if (folderUriStr.isEmpty()) {
            tvFolderStatus.setText("Ext " + ext + " • ⚠️ Link Folder");
            tvFolderStatus.setTextColor(Color.parseColor("#F59E0B")); // Amber
        } else {
            tvFolderStatus.setText("Ext " + ext + " (" + name + ") • 🟢 Ready");
            tvFolderStatus.setTextColor(Color.parseColor("#10B981")); // Green
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
            Intent recIntent = new Intent(this, CallRecordingService.class);
            Intent bridgeIntent = new Intent(this, SimBridgeService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(recIntent);
                startForegroundService(bridgeIntent);
            } else {
                startService(recIntent);
                startService(bridgeIntent);
            }
        } catch (Exception e) {
            Log.e("OmniFlow", "Error starting services: " + e.getMessage());
        }
    }

    private void stopMonitorService() {
        try {
            Intent recIntent = new Intent(this, CallRecordingService.class);
            Intent bridgeIntent = new Intent(this, SimBridgeService.class);
            stopService(recIntent);
            stopService(bridgeIntent);
        } catch (Exception e) {
            Log.e("OmniFlow", "Error stopping services: " + e.getMessage());
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
