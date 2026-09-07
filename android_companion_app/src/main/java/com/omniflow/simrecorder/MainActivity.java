package com.omniflow.simrecorder;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.telecom.TelecomManager;
import android.util.Log;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

/**
 * MainActivity — Full-Screen EMS Mobile Web Experience + Native 1-Click SIM Telephony
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "OmniFlowMain";
    public static final String DASHBOARD_URL = "https://app.employeemanagementsystems.com";

    private WebView webView;
    private ProgressBar progressBar;

    public class WebAppInterface {
        Context mContext;
        WebAppInterface(Context c) {
            mContext = c;
        }

        @JavascriptInterface
        public void makeDirectCall(String phoneNumber) {
            new Handler(Looper.getMainLooper()).post(() -> performDirectCall(phoneNumber));
        }

        @JavascriptInterface
        public void dial(String phoneNumber) {
            new Handler(Looper.getMainLooper()).post(() -> performDirectCall(phoneNumber));
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Full Screen Root FrameLayout
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#0F172A")); // Slate dark

        // 1. Setup 100% Full-Screen WebView
        webView = new WebView(this);
        FrameLayout.LayoutParams webViewParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, 
            FrameLayout.LayoutParams.MATCH_PARENT
        );
        webView.setLayoutParams(webViewParams);

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setUseWideViewPort(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setSupportZoom(false);
        webSettings.setBuiltInZoomControls(false);
        webSettings.setDisplayZoomControls(false);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Bind Direct Native Telephony JavaScript Interfaces
        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidApp");
        webView.addJavascriptInterface(new WebAppInterface(this), "OmniFlowNative");

        // Progress bar for page load
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgress(0);
        progressBar.setVisibility(View.GONE);
        FrameLayout.LayoutParams pbParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, 8
        );
        progressBar.setLayoutParams(pbParams);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String url = uri != null ? uri.toString() : "";
                
                // If it's a tel: link, trigger direct GSM call immediately bypassing Zoom
                if (url.startsWith("tel:")) {
                    String cleanPhone = url.replace("tel:", "").trim();
                    performDirectCall(cleanPhone);
                    return true;
                }
                if (url.startsWith("mailto:") || url.startsWith("whatsapp:")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        Log.e(TAG, "Error launching external intent: " + e.getMessage());
                    }
                }
                return false;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Ensure proper mobile viewport
                webView.evaluateJavascript(
                    "(function() { " +
                    "  var meta = document.querySelector('meta[name=\"viewport\"]');" +
                    "  if (!meta) {" +
                    "    meta = document.createElement('meta');" +
                    "    meta.name = 'viewport';" +
                    "    document.head.appendChild(meta);" +
                    "  }" +
                    "  meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';" +
                    "})();", null
                );
            }
        });

        root.addView(webView);
        root.addView(progressBar);

        setContentView(root);

        // Load the full Live EMS Portal
        SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
        String targetUrl = prefs.getString("dashboard_url", DASHBOARD_URL);
        webView.loadUrl(targetUrl);

        // Start background call recording & sync services silently
        startMonitorService();

        // Check and prompt for Overlay permission (Required for Post-Call Lead Notes Popup)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !android.provider.Settings.canDrawOverlays(this)) {
            try {
                Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName()));
                startActivity(intent);
                Toast.makeText(this, "Please enable 'Appear on top' to show Lead Notes Popup after calls.", Toast.LENGTH_LONG).show();
            } catch (Exception e) {
                Log.w(TAG, "Could not open overlay settings: " + e.getMessage());
            }
        }
    }

    /**
     * Directly places GSM Phone Call using the native Samsung / Android Dialer package
     * Completely bypasses Zoom, Skype, and any third-party app chooser popups!
     */
    public void performDirectCall(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) return;
        String cleanPhone = phoneNumber.replaceAll("[^0-9+]", "").trim();
        if (cleanPhone.isEmpty()) return;
        
        Uri callUri = Uri.parse("tel:" + cleanPhone);
        Log.d(TAG, "🎯 performDirectCall triggered for: " + cleanPhone);

        TelecomManager telecomManager = (TelecomManager) getSystemService(Context.TELECOM_SERVICE);
        String defaultDialer = (telecomManager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) 
            ? telecomManager.getDefaultDialerPackage() : null;

        if (defaultDialer == null || defaultDialer.isEmpty()) {
            defaultDialer = "com.samsung.android.dialer";
        }

        // 1. Explicit ACTION_CALL with Phone Package (Strictly forces SIM / Phone Dialer)
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED) {
            try {
                Intent callIntent = new Intent(Intent.ACTION_CALL, callUri);
                callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                if (defaultDialer != null && !defaultDialer.isEmpty()) {
                    callIntent.setPackage(defaultDialer);
                }
                startActivity(callIntent);
                return;
            } catch (Exception e) {
                Log.w(TAG, "Direct package call failed, trying generic ACTION_CALL: " + e.getMessage());
            }

            try {
                Intent callIntent = new Intent(Intent.ACTION_CALL, callUri);
                callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(callIntent);
                return;
            } catch (Exception e) {
                Log.w(TAG, "Generic ACTION_CALL failed: " + e.getMessage());
            }
        }

        // 2. Fallback: ACTION_DIAL with explicit Dialer Package
        try {
            Intent dialIntent = new Intent(Intent.ACTION_DIAL, callUri);
            dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (defaultDialer != null && !defaultDialer.isEmpty()) {
                dialIntent.setPackage(defaultDialer);
            }
            startActivity(dialIntent);
        } catch (Exception e) {
            Log.e(TAG, "Fallback dial failed: " + e.getMessage());
            try {
                Intent fallback = new Intent(Intent.ACTION_DIAL, callUri);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(fallback);
            } catch (Exception ignored) {}
        }
    }

    private void startMonitorService() {
        try {
            Intent recIntent = new Intent(this, CallRecordingService.class);
            Intent bridgeIntent = new Intent(this, SimBridgeService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(recIntent);
                try {
                    startForegroundService(bridgeIntent);
                } catch (Exception ignored) {}
            } else {
                startService(recIntent);
                startService(bridgeIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting background services: " + e.getMessage());
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (webView != null) {
            webView.destroy();
        }
    }
}
