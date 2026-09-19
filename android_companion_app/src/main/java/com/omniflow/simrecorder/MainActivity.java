package com.omniflow.simrecorder;

import java.io.File;
import android.Manifest;
import android.app.role.RoleManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.os.Environment;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.CallLog;
import android.provider.ContactsContract;
import android.telecom.TelecomManager;
import android.text.Editable;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.util.Log;
import android.view.Gravity;
import android.view.HapticFeedbackConstants;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.AbsListView;
import android.widget.BaseAdapter;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.ProgressBar;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * MainActivity -- Native Wotel Hub with Luxury Card Design & Brand Theme:
 * Tabs: [Recents] [Dialer] [Contacts] [CRM Login]
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "OmniFlowMain";
    public static final String DASHBOARD_URL = "https://app.employeemanagementsystems.com?app=android";
    private static final int PERMISSION_REQ_CODE = 1001;
    public static boolean isCallInitiatedFromApp = false;

    // Filter modes for Recent Calls
    private static final int FILTER_ALL = 0;
    private static final int FILTER_MISSED = 1;
    private static final int FILTER_INCOMING = 2;
    private static final int FILTER_OUTGOING = 3;
    private int currentCallFilter = FILTER_ALL;
    private String currentCallSearch = "";

    // View Containers
    private LinearLayout headerBar;
    private LinearLayout btnFolderSettings;
    private TextView tvFolderBadge;
    private static final int SAF_SETTINGS_REQ_CODE = 401;
    private FrameLayout contentContainer;
    private LinearLayout recentCallsLayout;
    private ScrollView dialerScrollView;
    private LinearLayout contactsLayout;
    private FrameLayout crmLayout;

    // Bottom Navigation Bar Views (5 tabs: Home, Recents, Dialer, Contacts, All Apps)
    private LinearLayout[] navTabs = new LinearLayout[5];
    private ImageView[] navIcons = new ImageView[5];
    private TextView[] navLabels = new TextView[5];

    // Recent Calls Data & UI
    private ListView lvRecentCalls;
    private CallLogAdapter callLogAdapter;
    private List<CallLogEntry> allCallLogs = new ArrayList<>();
    private List<CallLogEntry> filteredCallLogs = new ArrayList<>();
    private EditText etRecentSearch;
    private TextView[] filterChips = new TextView[4];
    private TextView tvEmptyCalls;
    private ProgressBar pbLoadingCalls;

    // Contacts Data & UI
    private ListView lvContacts;
    private ContactsAdapter contactsAdapter;
    private List<ContactEntry> allContacts = new ArrayList<>();
    private List<ContactEntry> filteredContacts = new ArrayList<>();
    private EditText etContactSearch;
    private TextView tvEmptyContacts;
    private ProgressBar pbLoadingContacts;

    // Dialer Views
    private TextView tvDialDisplay;
    private TextView btnBackspace;
    private StringBuilder dialNumber = new StringBuilder();

    // Dialer Audio & Haptics
    private ToneGenerator toneGenerator;
    private final Object toneGeneratorLock = new Object();
    private Vibrator vibrator;

    // CRM WebView
    private WebView webView;
    private ProgressBar progressBar;

    public static class CallLogEntry {
        public String name = "";
        public String number = "";
        public int type = CallLog.Calls.OUTGOING_TYPE;
        public long duration = 0;
        public long date = 0;
        public String simSlot = "SIM 1";
        public String initials = "";
        public int avatarColor = Color.parseColor("#064E43");
    }

    public static class ContactEntry {
        public String name = "";
        public String number = "";
        public String initials = "";
        public int avatarColor = Color.parseColor("#064E43");
    }

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

        @JavascriptInterface
        public boolean isAndroidApp() {
            return true;
        }

        @JavascriptInterface
        public void switchNativeTab(int tabIndex) {
            new Handler(Looper.getMainLooper()).post(() -> switchTab(tabIndex));
        }

        @JavascriptInterface
        public void syncUserProfile(String profileJson) {
            try {
                if (profileJson == null || profileJson.trim().isEmpty()) return;
                org.json.JSONObject obj = new org.json.JSONObject(profileJson);
                int tenantId = 0;
                if (obj.has("tenantId")) {
                    tenantId = obj.optInt("tenantId", 0);
                    if (tenantId <= 0) {
                        String s = obj.optString("tenantId", "").replaceAll("\\D", "");
                        if (!s.isEmpty()) {
                            try { tenantId = Integer.parseInt(s); } catch (Exception ignored) {}
                        }
                    }
                }
                if (tenantId <= 0 && obj.has("companyId")) {
                    tenantId = obj.optInt("companyId", 0);
                    if (tenantId <= 0) {
                        String s = obj.optString("companyId", "").replaceAll("\\D", "");
                        if (!s.isEmpty()) {
                            try { tenantId = Integer.parseInt(s); } catch (Exception ignored) {}
                        }
                    }
                }
                if (tenantId <= 0 && obj.has("tenant_id")) {
                    tenantId = obj.optInt("tenant_id", 0);
                    if (tenantId <= 0) {
                        String s = obj.optString("tenant_id", "").replaceAll("\\D", "");
                        if (!s.isEmpty()) {
                            try { tenantId = Integer.parseInt(s); } catch (Exception ignored) {}
                        }
                    }
                }

                String tenantSlug = obj.optString("tenantSlug", obj.optString("tenant_slug", ""));
                String employeeId = obj.optString("employeeId", obj.optString("id", ""));
                String name = obj.optString("name", "Mobile Telecaller");
                String email = obj.optString("email", "");
                String role = obj.optString("role", "employee");
                String department = obj.optString("department", "");

                SharedPreferences prefs = mContext.getSharedPreferences("omniflow", Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();
                if (tenantId > 0) {
                    editor.putInt("tenant_id", tenantId);
                    editor.putString("tenant_id_str", String.valueOf(tenantId));
                }
                if (!tenantSlug.isEmpty()) {
                    editor.putString("tenant_slug", tenantSlug);
                }
                editor.putString("agent_id", employeeId)
                    .putString("agent_name", name)
                    .putString("agent_email", email)
                    .putString("agent_role", role)
                    .putString("agent_department", department)
                    .apply();

                Log.d("WebAppInterface", "✅ User profile synced to Native Android: Tenant=" + tenantId + " (slug=" + tenantSlug + "), Agent=" + name + " (" + email + "), Role=" + role + ", EmpId=" + employeeId);
            } catch (Exception e) {
                Log.e("WebAppInterface", "❌ syncUserProfile error: " + e.getMessage());
            }
        }

        @JavascriptInterface
        public void clearUserProfile() {
            try {
                SharedPreferences prefs = mContext.getSharedPreferences("omniflow", Context.MODE_PRIVATE);
                prefs.edit()
                    .remove("tenant_id")
                    .remove("tenant_id_str")
                    .remove("tenant_slug")
                    .remove("agent_id")
                    .remove("agent_name")
                    .remove("agent_email")
                    .remove("agent_role")
                    .remove("agent_department")
                    .apply();
                Log.d("WebAppInterface", "🧹 User profile cleared from Native Android");
            } catch (Exception e) {
                Log.e("WebAppInterface", "❌ clearUserProfile error: " + e.getMessage());
            }
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        float density = getResources().getDisplayMetrics().density;

        // Root layout: Top Header + Middle Content + Bottom Navigation Bar
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#F8FAFC"));

        // 1. TOP HEADER BAR: Deep Forest Teal (#064E43) Brand Bar with Folder / Recording Status
        headerBar = new LinearLayout(this);
        headerBar.setOrientation(LinearLayout.HORIZONTAL);
        headerBar.setBackgroundColor(Color.parseColor("#064E43"));
        headerBar.setPadding((int)(16 * density), (int)(10 * density), (int)(16 * density), (int)(10 * density));
        headerBar.setGravity(Gravity.CENTER_VERTICAL);

        LinearLayout logoContainer = new LinearLayout(this);
        logoContainer.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        logoContainer.setLayoutParams(logoParams);

        TextView tvLogo = new TextView(this);
        tvLogo.setText("OmniFlow");
        tvLogo.setTextColor(Color.WHITE);
        tvLogo.setTextSize(20f);
        tvLogo.setTypeface(null, Typeface.BOLD);
        logoContainer.addView(tvLogo);

        TextView tvSubHeader = new TextView(this);
        tvSubHeader.setText("Active SIM Telecaller");
        tvSubHeader.setTextColor(Color.parseColor("#99F6E4")); // Soft mint
        tvSubHeader.setTextSize(11f);
        logoContainer.addView(tvSubHeader);

        headerBar.addView(logoContainer);

        // Recording & Folder Settings Button
        btnFolderSettings = new LinearLayout(this);
        btnFolderSettings.setOrientation(LinearLayout.HORIZONTAL);
        btnFolderSettings.setGravity(Gravity.CENTER);
        btnFolderSettings.setPadding((int)(12 * density), (int)(6 * density), (int)(12 * density), (int)(6 * density));
        btnFolderSettings.setClickable(true);
        btnFolderSettings.setFocusable(true);

        tvFolderBadge = new TextView(this);
        tvFolderBadge.setTextSize(11.5f);
        tvFolderBadge.setTypeface(null, Typeface.BOLD);
        btnFolderSettings.addView(tvFolderBadge);

        btnFolderSettings.setOnClickListener(v -> showRecordingSettingsDialog());
        headerBar.addView(btnFolderSettings);

        root.addView(headerBar);
        updateFolderHeaderBadge();

        // 2. MIDDLE CONTENT CONTAINER (Houses the screens)
        contentContainer = new FrameLayout(this);
        LinearLayout.LayoutParams contentParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f
        );
        contentContainer.setLayoutParams(contentParams);

        // Screen 0 & 4: CRM WebView (Serves Home and All Apps views)
        setupCrmLayout(density);
        crmLayout.setVisibility(View.VISIBLE);
        contentContainer.addView(crmLayout);

        // Screen 1: Recent Calls (Native Java)
        setupRecentCallsLayout(density);
        recentCallsLayout.setVisibility(View.GONE);
        contentContainer.addView(recentCallsLayout);

        // Screen 2: Dialer (Native Java)
        setupDialerLayout(density);
        dialerScrollView.setVisibility(View.GONE);
        contentContainer.addView(dialerScrollView);

        // Screen 3: Contacts (Native Java)
        setupContactsLayout(density);
        contactsLayout.setVisibility(View.GONE);
        contentContainer.addView(contactsLayout);

        root.addView(contentContainer);

        // 3. BOTTOM NAVIGATION BAR: [Home] [Recents] [Dialer] [Contacts] [All Apps]
        setupBottomNavBar(root, density);

        setContentView(root);

        // Initialize Native DTMF Sound & Haptics Engine
        initToneAndHaptics();

        // Default to Home tab
        switchTab(0);

        // Start background recording & monitoring services
        startMonitorService();

        // Check & request runtime permissions
        checkAndRequestPermissions();

        // Check for In-App OTA Updates in background
        AppUpdateEngine.checkForUpdate(this, false);

        // Check Overlay Permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !android.provider.Settings.canDrawOverlays(this)) {
            try {
                Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName()));
                startActivity(intent);
                Toast.makeText(this, "Please enable 'Appear on top' to show floating call card.", Toast.LENGTH_LONG).show();
            } catch (Exception e) {
                Log.w(TAG, "Could not open overlay settings: " + e.getMessage());
            }
        }

        // Handle dial intent if opened from external dialer or tel: link
        handleDialIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDialIntent(intent);
    }

    private void handleDialIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_DIAL.equals(action) || Intent.ACTION_VIEW.equals(action)) {
            Uri data = intent.getData();
            if (data != null && "tel".equalsIgnoreCase(data.getScheme())) {
                String number = data.getSchemeSpecificPart();
                if (number != null && !number.trim().isEmpty()) {
                    try {
                        number = java.net.URLDecoder.decode(number, "UTF-8");
                    } catch (Exception ignored) {}
                    switchTab(1); // Switch to Dialer tab
                    dialNumber.setLength(0);
                    dialNumber.append(number);
                    if (tvDialDisplay != null) {
                        updateDialDisplay();
                    }
                }
            }
        }
    }

    private void checkDefaultDialer() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            TelecomManager telecomManager = (TelecomManager) getSystemService(Context.TELECOM_SERVICE);
            if (telecomManager != null && !getPackageName().equals(telecomManager.getDefaultDialerPackage())) {
                promptDefaultDialer();
            }
        }
    }

    private void promptDefaultDialer() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            RoleManager roleManager = (RoleManager) getSystemService(Context.ROLE_SERVICE);
            if (roleManager != null && roleManager.isRoleAvailable(RoleManager.ROLE_DIALER) && !roleManager.isRoleHeld(RoleManager.ROLE_DIALER)) {
                Intent intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER);
                try {
                    startActivity(intent);
                    return;
                } catch (Exception ignored) {}
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Intent intent = new Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER);
                intent.putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, getPackageName());
                startActivity(intent);
            } catch (Exception ignored) {}
        }
    }

    // ==========================================
    // DIALER SOUND & HAPTIC FEEDBACK ENGINE
    // ==========================================
    private void initToneAndHaptics() {
        try {
            synchronized (toneGeneratorLock) {
                toneGenerator = new ToneGenerator(AudioManager.STREAM_DTMF, 85);
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not initialize ToneGenerator: " + e.getMessage());
            toneGenerator = null;
        }
        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        } catch (Exception ignored) {}
    }

    private void triggerKeyFeedback(View view, String digit) {
        playToneForDigit(digit);
        triggerHaptic(view);
    }

    private void playToneForDigit(String digit) {
        if (digit == null || digit.isEmpty()) return;
        int tone = -1;
        switch (digit.charAt(0)) {
            case '0': tone = ToneGenerator.TONE_DTMF_0; break;
            case '1': tone = ToneGenerator.TONE_DTMF_1; break;
            case '2': tone = ToneGenerator.TONE_DTMF_2; break;
            case '3': tone = ToneGenerator.TONE_DTMF_3; break;
            case '4': tone = ToneGenerator.TONE_DTMF_4; break;
            case '5': tone = ToneGenerator.TONE_DTMF_5; break;
            case '6': tone = ToneGenerator.TONE_DTMF_6; break;
            case '7': tone = ToneGenerator.TONE_DTMF_7; break;
            case '8': tone = ToneGenerator.TONE_DTMF_8; break;
            case '9': tone = ToneGenerator.TONE_DTMF_9; break;
            case '*': tone = ToneGenerator.TONE_DTMF_S; break;
            case '#': tone = ToneGenerator.TONE_DTMF_P; break;
            default:  tone = ToneGenerator.TONE_DTMF_0; break;
        }

        synchronized (toneGeneratorLock) {
            if (toneGenerator != null && tone != -1) {
                try {
                    toneGenerator.startTone(tone, 140);
                } catch (Exception e) {
                    Log.w(TAG, "Tone playback error: " + e.getMessage());
                }
            }
        }
    }

    private void playCallFeedback(View view) {
        synchronized (toneGeneratorLock) {
            if (toneGenerator != null) {
                try {
                    toneGenerator.startTone(ToneGenerator.TONE_PROP_PROMPT, 180);
                } catch (Exception ignored) {}
            }
        }
        if (vibrator != null && vibrator.hasVibrator()) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(35, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    vibrator.vibrate(35);
                }
            } catch (Exception ignored) {}
        }
        if (view != null) {
            view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS);
        }
    }

    private void playBackspaceFeedback(View view) {
        try {
            AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                am.playSoundEffect(AudioManager.FX_KEYPRESS_DELETE, 1.0f);
            }
        } catch (Exception ignored) {}
        triggerHaptic(view);
    }

    private void triggerHaptic(View view) {
        if (view != null) {
            view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP, HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING);
        }
        if (vibrator != null && vibrator.hasVibrator()) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(18, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    vibrator.vibrate(18);
                }
            } catch (Exception ignored) {}
        }
    }

    // ==========================================
    // BOTTOM NAVIGATION BAR (CRISP VECTOR ICONS + BRAND TINT)
    // 5 TABS: [Home] [Recents] [Dialer] [Contacts] [All Apps]
    // ==========================================
    private void setupBottomNavBar(LinearLayout root, float density) {
        LinearLayout bottomBar = new LinearLayout(this);
        bottomBar.setOrientation(LinearLayout.HORIZONTAL);
        bottomBar.setBackgroundColor(Color.WHITE);
        bottomBar.setPadding(0, (int)(8 * density), 0, (int)(8 * density));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            bottomBar.setElevation(12 * density);
        }

        String[] labels = {"Home", "Recents", "Dialer", "Contacts", "All Apps"};
        int[] iconRes = {
            R.drawable.ic_nav_home,
            R.drawable.ic_nav_recents,
            R.drawable.ic_nav_dialer,
            R.drawable.ic_nav_contacts,
            R.drawable.ic_nav_apps
        };

        for (int i = 0; i < 5; i++) {
            final int tabIndex = i;
            LinearLayout tab = new LinearLayout(this);
            tab.setOrientation(LinearLayout.VERTICAL);
            tab.setGravity(Gravity.CENTER);
            tab.setPadding(0, (int)(3 * density), 0, (int)(3 * density));

            ImageView icon = new ImageView(this);
            icon.setImageResource(iconRes[i]);
            icon.setScaleType(ImageView.ScaleType.FIT_CENTER);
            LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams((int)(22 * density), (int)(22 * density));
            icon.setLayoutParams(iconParams);

            TextView label = new TextView(this);
            label.setText(labels[i]);
            label.setTextSize(10.5f);
            label.setTypeface(null, Typeface.BOLD);
            label.setGravity(Gravity.CENTER);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, (int)(3 * density), 0, 0);
            label.setLayoutParams(lp);

            tab.addView(icon);
            tab.addView(label);

            tab.setOnClickListener(v -> switchTab(tabIndex));

            navTabs[i] = tab;
            navIcons[i] = icon;
            navLabels[i] = label;

            bottomBar.addView(tab, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));
        }

        root.addView(bottomBar);
    }

    private void switchTab(int index) {
        crmLayout.setVisibility((index == 0 || index == 4) ? View.VISIBLE : View.GONE);
        recentCallsLayout.setVisibility(index == 1 ? View.VISIBLE : View.GONE);
        dialerScrollView.setVisibility(index == 2 ? View.VISIBLE : View.GONE);
        contactsLayout.setVisibility(index == 3 ? View.VISIBLE : View.GONE);

        // Native top brand header is visible only on Native Phone tabs (Recents, Dialer, Contacts).
        // Home (0) and All Apps (4) use the rich web launcher header.
        if (headerBar != null) {
            headerBar.setVisibility((index == 0 || index == 4) ? View.GONE : View.VISIBLE);
        }

        for (int i = 0; i < 5; i++) {
            boolean isActive = (i == index);
            int color = isActive ? Color.parseColor("#064E43") : Color.parseColor("#94A3B8");
            if (navLabels[i] != null) navLabels[i].setTextColor(color);
            if (navIcons[i] != null) {
                navIcons[i].setColorFilter(color);
            }
            if (navTabs[i] != null) navTabs[i].setAlpha(isActive ? 1.0f : 0.65f);
        }

        if (index == 0) {
            if (webView != null) {
                webView.evaluateJavascript("if (window.setOmniFlowMobileView) { window.setOmniFlowMobileView('home'); }", null);
            }
        } else if (index == 1) {
            loadRecentCalls();
        } else if (index == 3) {
            loadContacts();
        } else if (index == 4) {
            if (webView != null) {
                webView.evaluateJavascript("if (window.setOmniFlowMobileView) { window.setOmniFlowMobileView('all_apps'); }", null);
            }
        }
    }

    // ==========================================
    // TAB 0: RECENT CALLS (SEARCH + FILTER CHIPS + LUXURY CARDS)
    // ==========================================
    private void setupRecentCallsLayout(float density) {
        recentCallsLayout = new LinearLayout(this);
        recentCallsLayout.setOrientation(LinearLayout.VERTICAL);
        recentCallsLayout.setBackgroundColor(Color.parseColor("#F1F5F9"));

        // 1. Search Bar: "🔍 Search calls..."
        LinearLayout searchContainer = new LinearLayout(this);
        searchContainer.setOrientation(LinearLayout.HORIZONTAL);
        searchContainer.setGravity(Gravity.CENTER_VERTICAL);
        searchContainer.setPadding((int)(14 * density), (int)(10 * density), (int)(14 * density), (int)(6 * density));

        etRecentSearch = new EditText(this);
        etRecentSearch.setHint("\uD83D\uDD0D  Search calls...");
        etRecentSearch.setHintTextColor(Color.parseColor("#94A3B8"));
        etRecentSearch.setTextColor(Color.parseColor("#0F172A"));
        etRecentSearch.setTextSize(14f);
        etRecentSearch.setPadding((int)(14 * density), (int)(10 * density), (int)(14 * density), (int)(10 * density));
        GradientDrawable searchBg = new GradientDrawable();
        searchBg.setColor(Color.WHITE);
        searchBg.setCornerRadius(14 * density);
        searchBg.setStroke((int)(1 * density), Color.parseColor("#E2E8F0"));
        etRecentSearch.setBackground(searchBg);
        searchContainer.addView(etRecentSearch, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        recentCallsLayout.addView(searchContainer);

        etRecentSearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                currentCallSearch = s.toString();
                applyCallLogFilters();
            }
            @Override
            public void afterTextChanged(Editable s) {}
        });

        // 2. Horizontal Filter Chips: [All Calls] [Missed] [Incoming] [Outgoing]
        HorizontalScrollView chipScroll = new HorizontalScrollView(this);
        chipScroll.setHorizontalScrollBarEnabled(false);
        chipScroll.setPadding((int)(14 * density), (int)(4 * density), (int)(14 * density), (int)(8 * density));
        chipScroll.setClipToPadding(false);

        LinearLayout chipRow = new LinearLayout(this);
        chipRow.setOrientation(LinearLayout.HORIZONTAL);

        String[] chipTitles = {"All Calls", "Missed", "Incoming", "Outgoing"};
        for (int i = 0; i < 4; i++) {
            final int filterIndex = i;
            TextView chip = new TextView(this);
            chip.setText(chipTitles[i]);
            chip.setTextSize(12.5f);
            chip.setTypeface(null, Typeface.BOLD);
            chip.setGravity(Gravity.CENTER);
            chip.setPadding((int)(14 * density), (int)(6 * density), (int)(14 * density), (int)(6 * density));

            LinearLayout.LayoutParams chipParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT
            );
            chipParams.setMargins(0, 0, (int)(8 * density), 0);
            chip.setLayoutParams(chipParams);

            chip.setOnClickListener(v -> {
                currentCallFilter = filterIndex;
                updateFilterChipStyles(density);
                applyCallLogFilters();
            });

            filterChips[i] = chip;
            chipRow.addView(chip);
        }
        updateFilterChipStyles(density);
        chipScroll.addView(chipRow);
        recentCallsLayout.addView(chipScroll);

        // Loading & Empty States
        pbLoadingCalls = new ProgressBar(this);
        pbLoadingCalls.setVisibility(View.GONE);
        LinearLayout.LayoutParams pbParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT
        );
        pbParams.gravity = Gravity.CENTER;
        pbParams.setMargins(0, (int)(30 * density), 0, 0);
        recentCallsLayout.addView(pbLoadingCalls, pbParams);

        tvEmptyCalls = new TextView(this);
        tvEmptyCalls.setText("Loading recent calls from phone...");
        tvEmptyCalls.setTextColor(Color.parseColor("#64748B"));
        tvEmptyCalls.setTextSize(14f);
        tvEmptyCalls.setGravity(Gravity.CENTER);
        tvEmptyCalls.setVisibility(View.GONE);
        LinearLayout.LayoutParams emptyParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        );
        emptyParams.setMargins(0, (int)(30 * density), 0, 0);
        recentCallsLayout.addView(tvEmptyCalls, emptyParams);

        // Recent Calls List
        lvRecentCalls = new ListView(this);
        lvRecentCalls.setDivider(null);
        lvRecentCalls.setDividerHeight(0);
        lvRecentCalls.setSelector(new ColorDrawable(Color.TRANSPARENT));
        lvRecentCalls.setPadding(0, (int)(4 * density), 0, (int)(16 * density));
        lvRecentCalls.setClipToPadding(false);
        lvRecentCalls.setClipChildren(false);

        callLogAdapter = new CallLogAdapter();
        lvRecentCalls.setAdapter(callLogAdapter);

        recentCallsLayout.addView(lvRecentCalls, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT
        ));
    }

    private void updateFilterChipStyles(float density) {
        for (int i = 0; i < 4; i++) {
            boolean isSelected = (i == currentCallFilter);
            GradientDrawable bg = new GradientDrawable();
            bg.setCornerRadius(16 * density);
            if (isSelected) {
                bg.setColor(Color.parseColor("#064E43")); // Deep Forest Teal (Brand theme)
                filterChips[i].setTextColor(Color.WHITE);
            } else {
                bg.setColor(Color.WHITE);
                bg.setStroke((int)(1 * density), Color.parseColor("#CBD5E1"));
                filterChips[i].setTextColor(Color.parseColor("#475569"));
            }
            filterChips[i].setBackground(bg);
        }
    }

    private void applyCallLogFilters() {
        filteredCallLogs.clear();
        String query = currentCallSearch.toLowerCase().trim();

        for (CallLogEntry entry : allCallLogs) {
            // Type filter
            boolean matchesType = true;
            if (currentCallFilter == FILTER_MISSED) {
                matchesType = (entry.type == CallLog.Calls.MISSED_TYPE || entry.type == CallLog.Calls.REJECTED_TYPE);
            } else if (currentCallFilter == FILTER_INCOMING) {
                matchesType = (entry.type == CallLog.Calls.INCOMING_TYPE);
            } else if (currentCallFilter == FILTER_OUTGOING) {
                matchesType = (entry.type == CallLog.Calls.OUTGOING_TYPE);
            }

            if (!matchesType) continue;

            // Search filter
            if (!TextUtils.isEmpty(query)) {
                boolean matchesSearch = entry.name.toLowerCase().contains(query) ||
                    entry.number.replaceAll("[^0-9]", "").contains(query);
                if (!matchesSearch) continue;
            }

            filteredCallLogs.add(entry);
        }

        if (callLogAdapter != null) callLogAdapter.notifyDataSetChanged();
        if (tvEmptyCalls != null) {
            if (filteredCallLogs.isEmpty()) {
                tvEmptyCalls.setText("No calls matching current filter.");
                tvEmptyCalls.setVisibility(View.VISIBLE);
            } else {
                tvEmptyCalls.setVisibility(View.GONE);
            }
        }
    }

    private void loadRecentCalls() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            if (tvEmptyCalls != null) {
                tvEmptyCalls.setText("Call log permission required.\nTap here to grant permission.");
                tvEmptyCalls.setVisibility(View.VISIBLE);
                tvEmptyCalls.setOnClickListener(v -> checkAndRequestPermissions());
            }
            return;
        }

        if (pbLoadingCalls != null) pbLoadingCalls.setVisibility(View.VISIBLE);
        if (tvEmptyCalls != null) tvEmptyCalls.setVisibility(View.GONE);

        new Thread(() -> {
            List<CallLogEntry> list = new ArrayList<>();
            // Vibrant multicolor palette for contact avatars
            int[] avatarPalette = {
                Color.parseColor("#E11D48"), // Vivid Rose Pink
                Color.parseColor("#2563EB"), // Royal Blue
                Color.parseColor("#0284C7"), // Sky Blue
                Color.parseColor("#7C3AED"), // Vibrant Purple
                Color.parseColor("#EA580C"), // Vibrant Orange
                Color.parseColor("#0D9488"), // Teal
                Color.parseColor("#059669"), // Emerald Green
                Color.parseColor("#D97706"), // Amber
                Color.parseColor("#4F46E5"), // Deep Indigo
                Color.parseColor("#C026D3")  // Magenta
            };

            try {
                Cursor cursor = getContentResolver().query(
                    CallLog.Calls.CONTENT_URI,
                    null,
                    null,
                    null,
                    CallLog.Calls.DATE + " DESC"
                );

                if (cursor != null) {
                    int numIdx = cursor.getColumnIndex(CallLog.Calls.NUMBER);
                    int nameIdx = cursor.getColumnIndex(CallLog.Calls.CACHED_NAME);
                    int typeIdx = cursor.getColumnIndex(CallLog.Calls.TYPE);
                    int durIdx = cursor.getColumnIndex(CallLog.Calls.DURATION);
                    int dateIdx = cursor.getColumnIndex(CallLog.Calls.DATE);

                    int count = 0;
                    while (cursor.moveToNext() && count < 100) {
                        count++;
                        CallLogEntry entry = new CallLogEntry();
                        entry.number = numIdx != -1 ? cursor.getString(numIdx) : "";
                        String rawName = nameIdx != -1 ? cursor.getString(nameIdx) : "";

                        if (TextUtils.isEmpty(rawName) && !TextUtils.isEmpty(entry.number)) {
                            rawName = resolveContactName(MainActivity.this, entry.number);
                        }
                        entry.name = rawName != null ? rawName : "";

                        entry.type = typeIdx != -1 ? cursor.getInt(typeIdx) : CallLog.Calls.OUTGOING_TYPE;
                        entry.duration = durIdx != -1 ? cursor.getLong(durIdx) : 0;
                        entry.date = dateIdx != -1 ? cursor.getLong(dateIdx) : System.currentTimeMillis();

                        // Accurate SIM 1 vs SIM 2 detection
                        entry.simSlot = CallRecordingService.resolveSimSlotFromCursor(MainActivity.this, cursor);

                        // Initials & avatar color
                        String targetForInitials = !TextUtils.isEmpty(entry.name) ? entry.name : entry.number;
                        entry.initials = extractInitials(targetForInitials);
                        entry.avatarColor = avatarPalette[Math.abs(targetForInitials.hashCode()) % avatarPalette.length];

                        list.add(entry);
                    }
                    cursor.close();
                }
            } catch (Exception e) {
                Log.e(TAG, "Error fetching call logs: " + e.getMessage());
            }

            runOnUiThread(() -> {
                if (pbLoadingCalls != null) pbLoadingCalls.setVisibility(View.GONE);
                allCallLogs.clear();
                allCallLogs.addAll(list);
                applyCallLogFilters();
            });
        }).start();
    }

    private static String extractInitials(String str) {
        if (TextUtils.isEmpty(str)) return "\uD83D\uDCDE";
        String clean = str.trim();
        String[] parts = clean.split("\\s+");
        if (parts.length >= 2 && parts[0].length() > 0 && parts[1].length() > 0) {
            return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
        } else if (clean.length() >= 2) {
            return clean.substring(0, 2).toUpperCase();
        }
        return clean.toUpperCase();
    }

    public static String resolveContactName(Context context, String phoneNumber) {
        if (context == null || TextUtils.isEmpty(phoneNumber)) return "";
        try {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED) {
                Uri uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(phoneNumber));
                try (Cursor c = context.getContentResolver().query(uri, new String[]{ContactsContract.PhoneLookup.DISPLAY_NAME}, null, null, null)) {
                    if (c != null && c.moveToFirst()) {
                        int nameIdx = c.getColumnIndex(ContactsContract.PhoneLookup.DISPLAY_NAME);
                        if (nameIdx != -1) {
                            String res = c.getString(nameIdx);
                            if (!TextUtils.isEmpty(res)) return res;
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        return "";
    }

    private class CallLogAdapter extends BaseAdapter {
        @Override
        public int getCount() { return filteredCallLogs.size(); }
        @Override
        public Object getItem(int position) { return filteredCallLogs.get(position); }
        @Override
        public long getItemId(int position) { return position; }

        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            float density = getResources().getDisplayMetrics().density;
            CallLogEntry entry = filteredCallLogs.get(position);

            // 1. Root wrapper guaranteeing exact card gaps and side margins in ListView
            FrameLayout itemContainer = new FrameLayout(MainActivity.this);
            itemContainer.setLayoutParams(new AbsListView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ));
            itemContainer.setPadding((int)(14 * density), (int)(5 * density), (int)(14 * density), (int)(5 * density));
            itemContainer.setClipToPadding(false);
            itemContainer.setClipChildren(false);

            // 2. Floating luxury card with rounded corners, subtle border and drop shadow
            LinearLayout card = new LinearLayout(MainActivity.this);
            card.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ));
            card.setOrientation(LinearLayout.HORIZONTAL);
            card.setGravity(Gravity.CENTER_VERTICAL);
            card.setPadding((int)(14 * density), (int)(12 * density), (int)(14 * density), (int)(12 * density));

            GradientDrawable cardBg = new GradientDrawable();
            cardBg.setColor(Color.WHITE);
            cardBg.setCornerRadius(16 * density);
            cardBg.setStroke((int)(1 * density), Color.parseColor("#E2E8F0"));
            card.setBackground(cardBg);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                card.setElevation(3 * density);
            }

            // A. Left: Circular Initials Avatar (44dp x 44dp)
            TextView tvAvatar = new TextView(MainActivity.this);
            tvAvatar.setText(entry.initials);
            tvAvatar.setTextColor(Color.WHITE);
            tvAvatar.setTextSize(14f);
            tvAvatar.setTypeface(null, Typeface.BOLD);
            tvAvatar.setGravity(Gravity.CENTER);
            GradientDrawable avBg = new GradientDrawable();
            avBg.setColor(entry.avatarColor);
            avBg.setShape(GradientDrawable.OVAL);
            tvAvatar.setBackground(avBg);
            LinearLayout.LayoutParams avParams = new LinearLayout.LayoutParams((int)(44 * density), (int)(44 * density));
            avParams.setMargins(0, 0, (int)(12 * density), 0);
            tvAvatar.setLayoutParams(avParams);
            card.addView(tvAvatar);

            // B. Middle: Name, Phone, Status Details
            LinearLayout infoCol = new LinearLayout(MainActivity.this);
            infoCol.setOrientation(LinearLayout.VERTICAL);

            // Row 1: Caller Name
            TextView tvTitle = new TextView(MainActivity.this);
            String titleText = (!TextUtils.isEmpty(entry.name)) ? entry.name : entry.number;
            tvTitle.setText(titleText);
            tvTitle.setTextColor(Color.parseColor("#0F172A"));
            tvTitle.setTextSize(15f);
            tvTitle.setTypeface(null, Typeface.BOLD);
            tvTitle.setSingleLine(true);
            tvTitle.setEllipsize(TextUtils.TruncateAt.END);
            infoCol.addView(tvTitle);

            // Row 2: Call Direction Icon + Timestamp + Duration
            LinearLayout subRow = new LinearLayout(MainActivity.this);
            subRow.setOrientation(LinearLayout.HORIZONTAL);
            subRow.setGravity(Gravity.CENTER_VERTICAL);
            LinearLayout.LayoutParams subParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            subParams.setMargins(0, (int)(3 * density), 0, 0);
            subRow.setLayoutParams(subParams);

            TextView tvTypeIcon = new TextView(MainActivity.this);
            tvTypeIcon.setTextSize(11.5f);
            tvTypeIcon.setTypeface(null, Typeface.BOLD);

            String typeStr;
            if (entry.type == CallLog.Calls.INCOMING_TYPE) {
                typeStr = "\u2199 Incoming";
                tvTypeIcon.setTextColor(Color.parseColor("#10B981")); // Emerald
            } else if (entry.type == CallLog.Calls.OUTGOING_TYPE) {
                typeStr = "\u2197 Outgoing";
                tvTypeIcon.setTextColor(Color.parseColor("#0284C7")); // Blue
            } else {
                typeStr = "\u2715 Missed";
                tvTypeIcon.setTextColor(Color.parseColor("#EF4444")); // Red
            }
            tvTypeIcon.setText(typeStr);
            subRow.addView(tvTypeIcon);

            String timeFormatted = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date(entry.date));
            String durationStr = "";
            if (entry.duration > 0) {
                long m = entry.duration / 60;
                long s = entry.duration % 60;
                durationStr = " \u2022 " + (m > 0 ? m + "m " : "") + s + "s";
            }

            TextView tvTime = new TextView(MainActivity.this);
            tvTime.setText(" \u2022 " + timeFormatted + durationStr);
            tvTime.setTextColor(Color.parseColor("#64748B"));
            tvTime.setTextSize(11.5f);
            subRow.addView(tvTime);

            infoCol.addView(subRow);
            card.addView(infoCol, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

            // C. SIM Slot Pill Badge (SIM 1 / SIM 2)
            TextView tvSim = new TextView(MainActivity.this);
            tvSim.setText(entry.simSlot != null ? entry.simSlot : "SIM 1");
            tvSim.setTextColor(Color.WHITE);
            tvSim.setTextSize(9.5f);
            tvSim.setTypeface(null, Typeface.BOLD);
            tvSim.setPadding((int)(7 * density), (int)(3 * density), (int)(7 * density), (int)(3 * density));
            GradientDrawable simBg = new GradientDrawable();
            if ("SIM 2".equalsIgnoreCase(entry.simSlot)) {
                simBg.setColor(Color.parseColor("#4F46E5")); // Distinct Indigo for SIM 2
            } else {
                simBg.setColor(Color.parseColor("#064E43")); // Deep Forest Teal for SIM 1
            }
            simBg.setCornerRadius(6 * density);
            tvSim.setBackground(simBg);
            LinearLayout.LayoutParams simParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            simParams.setMargins((int)(8 * density), 0, (int)(10 * density), 0);
            tvSim.setLayoutParams(simParams);
            card.addView(tvSim);

            // D. Right: Circular Emerald Quick-Call Button (42dp x 42dp with vector white handset)
            ImageView btnCall = new ImageView(MainActivity.this);
            btnCall.setImageResource(R.drawable.ic_phone_white);
            btnCall.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
            int callPad = (int)(11 * density);
            btnCall.setPadding(callPad, callPad, callPad, callPad);
            GradientDrawable callBg = new GradientDrawable();
            callBg.setColor(Color.parseColor("#10B981"));
            callBg.setShape(GradientDrawable.OVAL);
            btnCall.setBackground(callBg);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                btnCall.setElevation(2 * density);
            }
            LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams((int)(42 * density), (int)(42 * density));
            btnCall.setLayoutParams(btnParams);
            btnCall.setOnClickListener(v -> performDirectCall(entry.number));
            card.addView(btnCall);

            // E. Swipe-to-Call Gesture Listener
            card.setOnTouchListener(new View.OnTouchListener() {
                private float startX;
                private float startY;
                private boolean isSwiping = false;

                @Override
                public boolean onTouch(View v, MotionEvent event) {
                    switch (event.getAction()) {
                        case MotionEvent.ACTION_DOWN:
                            startX = event.getX();
                            startY = event.getY();
                            isSwiping = false;
                            return false;

                        case MotionEvent.ACTION_MOVE:
                            float dx = event.getX() - startX;
                            float dy = Math.abs(event.getY() - startY);
                            if (dx > 25 * density && dy < 35 * density) {
                                isSwiping = true;
                                card.setTranslationX(Math.min(dx, 80 * density));
                                cardBg.setColor(Color.parseColor("#DCFCE7"));
                                cardBg.setStroke((int)(1.5f * density), Color.parseColor("#10B981"));
                                return true;
                            }
                            break;

                        case MotionEvent.ACTION_UP:
                        case MotionEvent.ACTION_CANCEL:
                            float finalDx = event.getX() - startX;
                            card.animate().translationX(0).setDuration(150).start();
                            cardBg.setColor(Color.WHITE);
                            cardBg.setStroke((int)(1 * density), Color.parseColor("#E2E8F0"));

                            if (isSwiping && finalDx > 65 * density) {
                                String targetName = !TextUtils.isEmpty(entry.name) ? entry.name : entry.number;
                                Toast.makeText(MainActivity.this, "📞 Calling " + targetName + "...", Toast.LENGTH_SHORT).show();
                                performDirectCall(entry.number);
                                return true;
                            }
                            break;
                    }
                    return false;
                }
            });

            card.setOnClickListener(v -> performDirectCall(entry.number));

            itemContainer.addView(card);
            return itemContainer;
        }
    }

    // ==========================================
    // TAB 1: NATIVE PRO DIALER PAD
    // ==========================================
    private void setupDialerLayout(float density) {
        dialerScrollView = new ScrollView(this);
        dialerScrollView.setFillViewport(true);
        dialerScrollView.setBackgroundColor(Color.WHITE);

        LinearLayout dialerContainer = new LinearLayout(this);
        dialerContainer.setOrientation(LinearLayout.VERTICAL);
        dialerContainer.setGravity(Gravity.CENTER_HORIZONTAL);
        dialerContainer.setPadding((int)(20 * density), (int)(16 * density), (int)(20 * density), (int)(20 * density));

        // Dial Display Row
        LinearLayout displayRow = new LinearLayout(this);
        displayRow.setOrientation(LinearLayout.HORIZONTAL);
        displayRow.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams dispParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, (int)(64 * density));
        dispParams.setMargins(0, (int)(8 * density), 0, (int)(10 * density));
        displayRow.setLayoutParams(dispParams);

        tvDialDisplay = new TextView(this);
        tvDialDisplay.setHint("Dial a number");
        tvDialDisplay.setHintTextColor(Color.parseColor("#94A3B8"));
        tvDialDisplay.setTextColor(Color.parseColor("#0F172A"));
        tvDialDisplay.setTextSize(28f);
        tvDialDisplay.setTypeface(null, Typeface.BOLD);
        tvDialDisplay.setGravity(Gravity.CENTER);
        tvDialDisplay.setSingleLine(true);
        tvDialDisplay.setEllipsize(TextUtils.TruncateAt.START);
        displayRow.addView(tvDialDisplay, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        btnBackspace = new TextView(this);
        btnBackspace.setText("\u232B");
        btnBackspace.setTextColor(Color.parseColor("#475569"));
        btnBackspace.setTextSize(20f);
        btnBackspace.setGravity(Gravity.CENTER);
        btnBackspace.setVisibility(View.INVISIBLE);
        GradientDrawable bsBg = new GradientDrawable();
        bsBg.setColor(Color.parseColor("#F1F5F9"));
        bsBg.setCornerRadius(20 * density);
        btnBackspace.setBackground(bsBg);
        LinearLayout.LayoutParams bsParams = new LinearLayout.LayoutParams((int)(44 * density), (int)(44 * density));
        bsParams.setMargins((int)(8 * density), 0, (int)(4 * density), 0);
        btnBackspace.setLayoutParams(bsParams);

        btnBackspace.setOnClickListener(v -> {
            if (dialNumber.length() > 0) {
                playBackspaceFeedback(v);
                dialNumber.deleteCharAt(dialNumber.length() - 1);
                updateDialDisplay();
            }
        });
        btnBackspace.setOnLongClickListener(v -> {
            playBackspaceFeedback(v);
            dialNumber.setLength(0);
            updateDialDisplay();
            return true;
        });
        displayRow.addView(btnBackspace);

        dialerContainer.addView(displayRow);

        View sep = new View(this);
        sep.setBackgroundColor(Color.parseColor("#E2E8F0"));
        LinearLayout.LayoutParams sepParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, (int)(1 * density));
        sepParams.setMargins((int)(24 * density), 0, (int)(24 * density), (int)(14 * density));
        dialerContainer.addView(sep, sepParams);

        // 3x4 Pro Keypad Grid
        String[][] keyDigits = {
            {"1", "2", "3"},
            {"4", "5", "6"},
            {"7", "8", "9"},
            {"*", "0", "#"}
        };
        String[][] keySubtitles = {
            {" ", "ABC", "DEF"},
            {"GHI", "JKL", "MNO"},
            {"PQRS", "TUV", "WXYZ"},
            {" ", "+", " "}
        };

        int keySize = (int)(72 * density);

        for (int r = 0; r < 4; r++) {
            LinearLayout keyRow = new LinearLayout(this);
            keyRow.setOrientation(LinearLayout.HORIZONTAL);
            keyRow.setGravity(Gravity.CENTER);
            LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            rowParams.setMargins(0, (int)(5 * density), 0, (int)(5 * density));
            keyRow.setLayoutParams(rowParams);

            for (int c = 0; c < 3; c++) {
                final String digit = keyDigits[r][c];
                final String sub = keySubtitles[r][c];

                LinearLayout keyBtn = new LinearLayout(this);
                keyBtn.setOrientation(LinearLayout.VERTICAL);
                keyBtn.setGravity(Gravity.CENTER);

                GradientDrawable keyBg = new GradientDrawable();
                keyBg.setColor(Color.parseColor("#F8FAFC"));
                keyBg.setCornerRadius(keySize / 2f);
                keyBg.setStroke((int)(1 * density), Color.parseColor("#E2E8F0"));
                keyBtn.setBackground(keyBg);

                TextView tvDigit = new TextView(this);
                tvDigit.setText(digit);
                tvDigit.setTextColor(Color.parseColor("#0F172A"));
                tvDigit.setTextSize(23f);
                tvDigit.setTypeface(null, Typeface.BOLD);
                tvDigit.setGravity(Gravity.CENTER);
                keyBtn.addView(tvDigit);

                if (!sub.trim().isEmpty()) {
                    TextView tvSub = new TextView(this);
                    tvSub.setText(sub);
                    tvSub.setTextColor(Color.parseColor("#64748B"));
                    tvSub.setTextSize(9.5f);
                    tvSub.setTypeface(null, Typeface.BOLD);
                    tvSub.setGravity(Gravity.CENTER);
                    keyBtn.addView(tvSub);
                }

                LinearLayout.LayoutParams keyParams = new LinearLayout.LayoutParams(keySize, keySize);
                keyParams.setMargins((int)(16 * density), 0, (int)(16 * density), 0);
                keyBtn.setLayoutParams(keyParams);

                keyBtn.setOnTouchListener((v, event) -> {
                    if (event.getAction() == MotionEvent.ACTION_DOWN) {
                        keyBg.setColor(Color.parseColor("#E2E8F0"));
                    } else if (event.getAction() == MotionEvent.ACTION_UP || event.getAction() == MotionEvent.ACTION_CANCEL) {
                        keyBg.setColor(Color.parseColor("#F8FAFC"));
                    }
                    return false;
                });

                keyBtn.setOnClickListener(v -> {
                    triggerKeyFeedback(v, digit);
                    dialNumber.append(digit);
                    updateDialDisplay();
                });

                if (digit.equals("0")) {
                    keyBtn.setOnLongClickListener(v -> {
                        triggerKeyFeedback(v, "0");
                        dialNumber.append("+");
                        updateDialDisplay();
                        return true;
                    });
                }

                keyRow.addView(keyBtn);
            }
            dialerContainer.addView(keyRow);
        }

        // Circular Call Button
        TextView btnDialCall = new TextView(this);
        btnDialCall.setText("\uD83D\uDCDE");
        btnDialCall.setTextColor(Color.WHITE);
        btnDialCall.setTextSize(24f);
        btnDialCall.setGravity(Gravity.CENTER);

        GradientDrawable dialBg = new GradientDrawable();
        dialBg.setColor(Color.parseColor("#10B981"));
        dialBg.setCornerRadius(34 * density);
        btnDialCall.setBackground(dialBg);

        LinearLayout.LayoutParams callParams = new LinearLayout.LayoutParams((int)(68 * density), (int)(68 * density));
        callParams.setMargins(0, (int)(18 * density), 0, (int)(10 * density));
        btnDialCall.setLayoutParams(callParams);

        btnDialCall.setOnClickListener(v -> {
            String num = dialNumber.toString().trim();
            if (!num.isEmpty()) {
                playCallFeedback(v);
                performDirectCall(num);
            } else {
                Toast.makeText(this, "Please enter a phone number", Toast.LENGTH_SHORT).show();
            }
        });

        dialerContainer.addView(btnDialCall);
        dialerScrollView.addView(dialerContainer);
    }

    private void updateDialDisplay() {
        if (tvDialDisplay != null) {
            tvDialDisplay.setText(dialNumber.toString());
        }
        if (btnBackspace != null) {
            btnBackspace.setVisibility(dialNumber.length() > 0 ? View.VISIBLE : View.INVISIBLE);
        }
    }

    // ==========================================
    // TAB 2: PHONE CONTACTS (BRAND TEAL #064E43 AVATARS)
    // ==========================================
    private void setupContactsLayout(float density) {
        contactsLayout = new LinearLayout(this);
        contactsLayout.setOrientation(LinearLayout.VERTICAL);
        contactsLayout.setBackgroundColor(Color.parseColor("#F1F5F9"));

        // Search Bar container
        LinearLayout searchContainer = new LinearLayout(this);
        searchContainer.setOrientation(LinearLayout.HORIZONTAL);
        searchContainer.setGravity(Gravity.CENTER_VERTICAL);
        searchContainer.setPadding((int)(14 * density), (int)(10 * density), (int)(14 * density), (int)(8 * density));

        etContactSearch = new EditText(this);
        etContactSearch.setHint("\uD83D\uDD0D  Search contacts...");
        etContactSearch.setHintTextColor(Color.parseColor("#94A3B8"));
        etContactSearch.setTextColor(Color.parseColor("#0F172A"));
        etContactSearch.setTextSize(14f);
        etContactSearch.setPadding((int)(14 * density), (int)(10 * density), (int)(14 * density), (int)(10 * density));
        GradientDrawable searchBg = new GradientDrawable();
        searchBg.setColor(Color.WHITE);
        searchBg.setCornerRadius(14 * density);
        searchBg.setStroke((int)(1 * density), Color.parseColor("#E2E8F0"));
        etContactSearch.setBackground(searchBg);
        searchContainer.addView(etContactSearch, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        contactsLayout.addView(searchContainer);

        etContactSearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                filterContacts(s.toString());
            }
            @Override
            public void afterTextChanged(Editable s) {}
        });

        pbLoadingContacts = new ProgressBar(this);
        pbLoadingContacts.setVisibility(View.GONE);
        LinearLayout.LayoutParams pbParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        pbParams.gravity = Gravity.CENTER;
        pbParams.setMargins(0, (int)(30 * density), 0, 0);
        contactsLayout.addView(pbLoadingContacts, pbParams);

        tvEmptyContacts = new TextView(this);
        tvEmptyContacts.setText("No contacts found.");
        tvEmptyContacts.setTextColor(Color.parseColor("#64748B"));
        tvEmptyContacts.setTextSize(15f);
        tvEmptyContacts.setGravity(Gravity.CENTER);
        tvEmptyContacts.setVisibility(View.GONE);
        LinearLayout.LayoutParams emptyParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        emptyParams.setMargins(0, (int)(40 * density), 0, 0);
        contactsLayout.addView(tvEmptyContacts, emptyParams);

        lvContacts = new ListView(this);
        lvContacts.setDivider(null);
        lvContacts.setDividerHeight(0);
        lvContacts.setSelector(new ColorDrawable(Color.TRANSPARENT));
        lvContacts.setPadding(0, (int)(4 * density), 0, (int)(16 * density));
        lvContacts.setClipToPadding(false);
        lvContacts.setClipChildren(false);

        contactsAdapter = new ContactsAdapter();
        lvContacts.setAdapter(contactsAdapter);

        contactsLayout.addView(lvContacts, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private void loadContacts() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            if (tvEmptyContacts != null) {
                tvEmptyContacts.setText("Contacts permission required.\nTap here to grant.");
                tvEmptyContacts.setVisibility(View.VISIBLE);
                tvEmptyContacts.setOnClickListener(v -> checkAndRequestPermissions());
            }
            return;
        }

        if (pbLoadingContacts != null) pbLoadingContacts.setVisibility(View.VISIBLE);
        if (tvEmptyContacts != null) tvEmptyContacts.setVisibility(View.GONE);

        new Thread(() -> {
            List<ContactEntry> list = new ArrayList<>();
            int[] contactColors = {
                Color.parseColor("#E11D48"), // Rose
                Color.parseColor("#2563EB"), // Royal Blue
                Color.parseColor("#0284C7"), // Sky Blue
                Color.parseColor("#7C3AED"), // Purple
                Color.parseColor("#EA580C"), // Orange
                Color.parseColor("#0D9488"), // Teal
                Color.parseColor("#059669"), // Emerald Green
                Color.parseColor("#D97706"), // Amber
                Color.parseColor("#4F46E5"), // Indigo
                Color.parseColor("#C026D3")  // Magenta
            };

            try {
                Uri uri = ContactsContract.CommonDataKinds.Phone.CONTENT_URI;
                String[] projection = {
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                    ContactsContract.CommonDataKinds.Phone.NUMBER
                };

                Cursor cursor = getContentResolver().query(
                    uri,
                    projection,
                    null,
                    null,
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
                );

                if (cursor != null) {
                    int nameIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME);
                    int numIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);

                    while (cursor.moveToNext()) {
                        String name = nameIdx != -1 ? cursor.getString(nameIdx) : "";
                        String number = numIdx != -1 ? cursor.getString(numIdx) : "";

                        if (!TextUtils.isEmpty(name) && !TextUtils.isEmpty(number)) {
                            ContactEntry entry = new ContactEntry();
                            entry.name = name;
                            entry.number = number;

                            String[] parts = name.trim().split("\\s+");
                            if (parts.length >= 2 && parts[0].length() > 0 && parts[1].length() > 0) {
                                entry.initials = (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
                            } else if (name.length() >= 2) {
                                entry.initials = name.substring(0, 2).toUpperCase();
                            } else {
                                entry.initials = name.toUpperCase();
                            }

                            entry.avatarColor = contactColors[Math.abs(name.hashCode()) % contactColors.length];
                            list.add(entry);
                        }
                    }
                    cursor.close();
                }
            } catch (Exception e) {
                Log.e(TAG, "Error loading contacts: " + e.getMessage());
            }

            runOnUiThread(() -> {
                if (pbLoadingContacts != null) pbLoadingContacts.setVisibility(View.GONE);
                allContacts.clear();
                allContacts.addAll(list);
                filteredContacts.clear();
                filteredContacts.addAll(list);
                if (contactsAdapter != null) contactsAdapter.notifyDataSetChanged();

                if (filteredContacts.isEmpty() && tvEmptyContacts != null) {
                    tvEmptyContacts.setText("No contacts found on device.");
                    tvEmptyContacts.setVisibility(View.VISIBLE);
                } else if (tvEmptyContacts != null) {
                    tvEmptyContacts.setVisibility(View.GONE);
                }
            });
        }).start();
    }

    private void filterContacts(String query) {
        filteredContacts.clear();
        if (TextUtils.isEmpty(query)) {
            filteredContacts.addAll(allContacts);
        } else {
            String lower = query.toLowerCase().trim();
            for (ContactEntry c : allContacts) {
                if (c.name.toLowerCase().contains(lower) || c.number.replaceAll("[^0-9]", "").contains(lower)) {
                    filteredContacts.add(c);
                }
            }
        }
        if (contactsAdapter != null) contactsAdapter.notifyDataSetChanged();
        if (tvEmptyContacts != null) {
            tvEmptyContacts.setVisibility(filteredContacts.isEmpty() ? View.VISIBLE : View.GONE);
            tvEmptyContacts.setText("No matching contacts for '" + query + "'");
        }
    }

    private class ContactsAdapter extends BaseAdapter {
        @Override
        public int getCount() { return filteredContacts.size(); }
        @Override
        public Object getItem(int position) { return filteredContacts.get(position); }
        @Override
        public long getItemId(int position) { return position; }

        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            float density = getResources().getDisplayMetrics().density;
            ContactEntry entry = filteredContacts.get(position);

            // 1. Root wrapper guaranteeing exact 10dp card gap and 14dp side margins in ListView
            FrameLayout itemContainer = new FrameLayout(MainActivity.this);
            itemContainer.setLayoutParams(new AbsListView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ));
            itemContainer.setPadding((int)(14 * density), (int)(5 * density), (int)(14 * density), (int)(5 * density));
            itemContainer.setClipToPadding(false);
            itemContainer.setClipChildren(false);

            // 2. Floating luxury card with rounded corners, subtle border and elevation
            LinearLayout card = new LinearLayout(MainActivity.this);
            card.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ));
            card.setOrientation(LinearLayout.HORIZONTAL);
            card.setGravity(Gravity.CENTER_VERTICAL);
            card.setPadding((int)(14 * density), (int)(12 * density), (int)(14 * density), (int)(12 * density));

            GradientDrawable cardBg = new GradientDrawable();
            cardBg.setColor(Color.WHITE);
            cardBg.setCornerRadius(16 * density);
            cardBg.setStroke((int)(1 * density), Color.parseColor("#E2E8F0"));
            card.setBackground(cardBg);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                card.setElevation(3 * density);
            }

            // A. Left: Circular Initials Avatar (44dp x 44dp) with vibrant color
            TextView tvAvatar = new TextView(MainActivity.this);
            tvAvatar.setText(entry.initials);
            tvAvatar.setTextColor(Color.WHITE);
            tvAvatar.setTextSize(14f);
            tvAvatar.setTypeface(null, Typeface.BOLD);
            tvAvatar.setGravity(Gravity.CENTER);
            GradientDrawable avBg = new GradientDrawable();
            avBg.setColor(entry.avatarColor);
            avBg.setShape(GradientDrawable.OVAL);
            tvAvatar.setBackground(avBg);
            LinearLayout.LayoutParams avParams = new LinearLayout.LayoutParams((int)(44 * density), (int)(44 * density));
            avParams.setMargins(0, 0, (int)(12 * density), 0);
            tvAvatar.setLayoutParams(avParams);
            card.addView(tvAvatar);

            // B. Middle: Name + Phone
            LinearLayout textCol = new LinearLayout(MainActivity.this);
            textCol.setOrientation(LinearLayout.VERTICAL);

            TextView tvName = new TextView(MainActivity.this);
            tvName.setText(entry.name);
            tvName.setTextColor(Color.parseColor("#0F172A"));
            tvName.setTextSize(15.5f);
            tvName.setTypeface(null, Typeface.BOLD);
            tvName.setSingleLine(true);
            tvName.setEllipsize(TextUtils.TruncateAt.END);
            textCol.addView(tvName);

            TextView tvPhone = new TextView(MainActivity.this);
            tvPhone.setText(entry.number);
            tvPhone.setTextColor(Color.parseColor("#64748B"));
            tvPhone.setTextSize(12.5f);
            LinearLayout.LayoutParams phoneParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            phoneParams.setMargins(0, (int)(2 * density), 0, 0);
            tvPhone.setLayoutParams(phoneParams);
            textCol.addView(tvPhone);

            card.addView(textCol, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

            // C. Right: Circular Emerald Quick-Call Button (42dp x 42dp with vector white handset)
            ImageView btnCall = new ImageView(MainActivity.this);
            btnCall.setImageResource(R.drawable.ic_phone_white);
            btnCall.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
            int callPad = (int)(11 * density);
            btnCall.setPadding(callPad, callPad, callPad, callPad);
            GradientDrawable callBg = new GradientDrawable();
            callBg.setColor(Color.parseColor("#10B981"));
            callBg.setShape(GradientDrawable.OVAL);
            btnCall.setBackground(callBg);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                btnCall.setElevation(2 * density);
            }
            LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams((int)(42 * density), (int)(42 * density));
            btnParams.setMargins((int)(10 * density), 0, 0, 0);
            btnCall.setLayoutParams(btnParams);
            btnCall.setOnClickListener(v -> performDirectCall(entry.number));
            card.addView(btnCall);

            card.setOnClickListener(v -> performDirectCall(entry.number));

            itemContainer.addView(card);
            return itemContainer;
        }
    }

    // ==========================================
    // TAB 3: CRM LOGIN / PORTAL (WEBVIEW)
    // ==========================================
    private void setupCrmLayout(float density) {
        crmLayout = new FrameLayout(this);
        crmLayout.setBackgroundColor(Color.parseColor("#0F172A"));

        webView = new WebView(this);
        FrameLayout.LayoutParams webParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT
        );
        webView.setLayoutParams(webParams);

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
        webSettings.setUserAgentString(webSettings.getUserAgentString() + " OmniFlowAndroidApp/1.0");

        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidApp");
        webView.addJavascriptInterface(new WebAppInterface(this), "OmniFlowNative");

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgress(0);
        progressBar.setVisibility(View.GONE);
        FrameLayout.LayoutParams pbParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, (int)(4 * density)
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
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
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

        crmLayout.addView(webView);
        crmLayout.addView(progressBar);

        SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
        if (!prefs.contains("agent_id") || prefs.getString("agent_id", "").trim().isEmpty()) {
            try {
                android.webkit.WebStorage.getInstance().deleteAllData();
                android.webkit.CookieManager.getInstance().removeAllCookies(null);
                webView.clearCache(true);
                webView.clearFormData();
                webView.clearHistory();
                Log.d(TAG, "🧹 Clean install / unauthenticated launch: purged leftover WebView session");
            } catch (Exception ignored) {}
        }
        String targetUrl = prefs.getString("dashboard_url", DASHBOARD_URL);
        if (!targetUrl.contains("app=android")) {
            targetUrl += (targetUrl.contains("?") ? "&" : "?") + "app=android";
        }
        webView.loadUrl(targetUrl);
    }

    // ==========================================
    // DIRECT GSM SIM CALLING
    // ==========================================
    public void performDirectCall(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) return;
        String cleanPhone = phoneNumber.replaceAll("[^0-9+]", "").trim();
        if (cleanPhone.isEmpty()) return;

        playCallFeedback(null);

        Uri callUri = Uri.parse("tel:" + cleanPhone);
        Log.d(TAG, "🎯 performDirectCall triggered for: " + cleanPhone);
        isCallInitiatedFromApp = true;

        TelecomManager telecomManager = (TelecomManager) getSystemService(Context.TELECOM_SERVICE);
        String defaultDialer = (telecomManager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            ? telecomManager.getDefaultDialerPackage() : null;

        if (defaultDialer != null && defaultDialer.equals(getPackageName())) {
            defaultDialer = null;
        }

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

        try {
            Intent dialIntent = new Intent(Intent.ACTION_DIAL, callUri);
            dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (defaultDialer != null && !defaultDialer.isEmpty()) {
                dialIntent.setPackage(defaultDialer);
            }
            startActivity(dialIntent);
        } catch (Exception e) {
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

    private void checkAndRequestPermissions() {
        List<String> needed = new ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.READ_CALL_LOG);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.READ_CONTACTS);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.CALL_PHONE);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.READ_PHONE_STATE);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.RECORD_AUDIO);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.POST_NOTIFICATIONS);
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.READ_MEDIA_AUDIO);
            }
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
        }

        if (!needed.isEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toArray(new String[0]), PERMISSION_REQ_CODE);
        } else {
            loadRecentCalls();
        }

        // Check All Files Access for Android 11+ so native Samsung Call Recordings folder can be accessed directly
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && !android.os.Environment.isExternalStorageManager()) {
            SharedPreferences p = getSharedPreferences("omniflow", MODE_PRIVATE);
            if (!p.getBoolean("prompted_all_files_access", false)) {
                p.edit().putBoolean("prompted_all_files_access", true).apply();
                try {
                    Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                    Toast.makeText(this, "Please enable 'All Files Access' to sync Samsung call recordings to CRM", Toast.LENGTH_LONG).show();
                } catch (Exception ignored) {
                    try {
                        Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                        startActivity(intent);
                    } catch (Exception ignored2) {}
                }
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQ_CODE) {
            loadRecentCalls();
            loadContacts();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();

        SharedPreferences prefs = getSharedPreferences("omniflow", MODE_PRIVATE);
        boolean callInProgress = prefs.getBoolean("call_in_progress", false);
        long callStartTime = prefs.getLong("call_start_time", 0);
        long timeSinceCall = System.currentTimeMillis() - callStartTime;

        // Verify with TelephonyManager if a phone call is REALLY active on hardware
        boolean isHardwareCallActive = false;
        try {
            android.telephony.TelephonyManager tm = (android.telephony.TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE);
            if (tm != null) {
                isHardwareCallActive = (tm.getCallState() != android.telephony.TelephonyManager.CALL_STATE_IDLE);
            }
        } catch (Exception ignored) {}

        // If hardware is idle, cleanly clear stale callInProgress flag
        if (!isHardwareCallActive && callInProgress) {
            prefs.edit().putBoolean("call_in_progress", false).apply();
            callInProgress = false;
        }

        // Only send to back if hardware phone call is genuinely active right now outside app
        if (!isCallInitiatedFromApp && isHardwareCallActive && (callInProgress || (callStartTime > 0 && timeSinceCall < 10000))) {
            Log.d(TAG, "External active phone call detected — moving task to back");
            moveTaskToBack(true);
            return;
        }

        // Reset flag after resume
        isCallInitiatedFromApp = false;

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED) {
            loadRecentCalls();
        }

        updateFolderHeaderBadge();
        SupabaseSyncEngine.sendDeviceHealth(this, "APP_ACTIVE", "OmniFlow main activity active");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == SAF_SETTINGS_REQ_CODE && resultCode == RESULT_OK && data != null) {
            Uri treeUri = data.getData();
            if (treeUri != null) {
                try {
                    getContentResolver().takePersistableUriPermission(treeUri,
                            Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                } catch (Exception e) {
                    Log.w(TAG, "Persistable URI permission notice: " + e.getMessage());
                }

                SharedPreferences prefs = getSharedPreferences("omniflow", Context.MODE_PRIVATE);
                prefs.edit().putString("selected_folder_uri", treeUri.toString()).apply();
                try {
                    android.preference.PreferenceManager.getDefaultSharedPreferences(this)
                            .edit().putString("selected_folder_uri", treeUri.toString()).apply();
                } catch (Exception ignored) {}

                Toast.makeText(this, "✅ Call Recordings Folder linked successfully!", Toast.LENGTH_LONG).show();
                updateFolderHeaderBadge();
                SupabaseSyncEngine.sendDeviceHealth(this, "FOLDER_LINKED", "Folder linked via in-app Settings: " + treeUri.toString());
            }
        }
    }

    private String detectDefaultCallRecordingsFolder() {
        try {
            String storageRoot = Environment.getExternalStorageDirectory().getAbsolutePath();
            SharedPreferences prefs = getSharedPreferences("omniflow", Context.MODE_PRIVATE);
            String autoLocked = prefs.getString("auto_discovered_folder_path", "");
            if (!autoLocked.isEmpty() && new File(autoLocked).exists()) {
                return autoLocked;
            }

            String[] candidatePaths = {
                storageRoot + "/Recordings/Call",
                storageRoot + "/Record/Call",
                storageRoot + "/Record",
                storageRoot + "/Recordings",
                storageRoot + "/MIUI/sound_recorder/call_rec",
                storageRoot + "/Recordings/CallRecordings",
                storageRoot + "/CallRecordings",
                storageRoot + "/Voice Recorder",
                "/storage/emulated/0/Recordings/Call",
                "/storage/emulated/0/Record/Call",
                "/storage/emulated/0/Record",
                "/storage/emulated/0/Recordings"
            };

            for (String path : candidatePaths) {
                File f = new File(path);
                if (f.exists() && f.isDirectory()) {
                    return path;
                }
            }

            String mfg = (Build.MANUFACTURER != null ? Build.MANUFACTURER.toLowerCase() : "");
            if (mfg.contains("samsung")) return storageRoot + "/Recordings/Call";
            if (mfg.contains("vivo") || mfg.contains("iqoo")) return storageRoot + "/Record";
            if (mfg.contains("xiaomi") || mfg.contains("redmi") || mfg.contains("poco")) return storageRoot + "/MIUI/sound_recorder/call_rec";
            if (mfg.contains("oppo") || mfg.contains("realme") || mfg.contains("oneplus")) return storageRoot + "/Recordings/CallRecordings";
            return storageRoot + "/Recordings/Call";
        } catch (Exception e) {
            return "/storage/emulated/0/Recordings/Call";
        }
    }

    private void updateFolderHeaderBadge() {
        if (tvFolderBadge == null || btnFolderSettings == null) return;

        boolean hasAllFilesAccess = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R)
                ? Environment.isExternalStorageManager()
                : (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED);

        float density = getResources().getDisplayMetrics().density;
        GradientDrawable badgeBg = new GradientDrawable();
        badgeBg.setCornerRadius(16 * density);

        if (hasAllFilesAccess) {
            tvFolderBadge.setText("⚡ Auto-Discovery Active");
            tvFolderBadge.setTextColor(Color.parseColor("#A7F3D0")); // Emerald 200
            badgeBg.setColor(Color.parseColor("#064E3B")); // Emerald 900
            badgeBg.setStroke((int)(1 * density), Color.parseColor("#10B981"));
        } else {
            tvFolderBadge.setText("⚠️ Grant Storage");
            tvFolderBadge.setTextColor(Color.parseColor("#FEF08A")); // Yellow 200
            badgeBg.setColor(Color.parseColor("#78350F")); // Amber 900
            badgeBg.setStroke((int)(1 * density), Color.parseColor("#F59E0B"));
        }
        btnFolderSettings.setBackground(badgeBg);
    }

    private void requestFolderSelection() {
        try {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                    | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                    | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                    | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
            startActivityForResult(intent, SAF_SETTINGS_REQ_CODE);
            Toast.makeText(this, "Select custom recordings folder and tap 'USE THIS FOLDER'", Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Toast.makeText(this, "Cannot open folder picker: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void showRecordingSettingsDialog() {
        float density = getResources().getDisplayMetrics().density;
        SharedPreferences prefs = getSharedPreferences("omniflow", Context.MODE_PRIVATE);
        boolean hasAllFilesAccess = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R)
                ? Environment.isExternalStorageManager()
                : (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED);

        String detectedFolder = detectDefaultCallRecordingsFolder();

        android.app.AlertDialog.Builder builder = new android.app.AlertDialog.Builder(this);

        ScrollView scroll = new ScrollView(this);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding((int)(20 * density), (int)(16 * density), (int)(20 * density), (int)(16 * density));

        // Header Title
        TextView tvTitle = new TextView(this);
        tvTitle.setText("🎙️ Call Recording & Sync Hub");
        tvTitle.setTextSize(18f);
        tvTitle.setTypeface(null, Typeface.BOLD);
        tvTitle.setTextColor(Color.parseColor("#0F172A"));
        tvTitle.setPadding(0, 0, 0, (int)(12 * density));
        layout.addView(tvTitle);

        // Status Card: Zero-Touch Auto Discovery
        LinearLayout statusCard = new LinearLayout(this);
        statusCard.setOrientation(LinearLayout.VERTICAL);
        statusCard.setPadding((int)(14 * density), (int)(12 * density), (int)(14 * density), (int)(12 * density));
        GradientDrawable statusBg = new GradientDrawable();
        statusBg.setCornerRadius(12 * density);

        if (hasAllFilesAccess) {
            statusBg.setColor(Color.parseColor("#ECFDF5")); // Mint 50
            statusBg.setStroke((int)(1 * density), Color.parseColor("#A7F3D0"));

            TextView tvStatusHeader = new TextView(this);
            tvStatusHeader.setText("⚡ ZERO-TOUCH AUTO-DISCOVERY ACTIVE");
            tvStatusHeader.setTextColor(Color.parseColor("#065F46"));
            tvStatusHeader.setTypeface(null, Typeface.BOLD);
            tvStatusHeader.setTextSize(13f);
            statusCard.addView(tvStatusHeader);

            TextView tvPath = new TextView(this);
            tvPath.setText("📂 Auto-Detected: " + detectedFolder + " (Ready ✓)");
            tvPath.setTextColor(Color.parseColor("#0F766E"));
            tvPath.setTypeface(null, Typeface.BOLD);
            tvPath.setTextSize(11.5f);
            tvPath.setPadding(0, (int)(4 * density), 0, 0);
            statusCard.addView(tvPath);

            TextView tvStatusDetail = new TextView(this);
            tvStatusDetail.setText("OmniFlow automatically discovers and syncs recordings after every call. No manual folder selection needed!");
            tvStatusDetail.setTextColor(Color.parseColor("#047857"));
            tvStatusDetail.setTextSize(11f);
            tvStatusDetail.setPadding(0, (int)(4 * density), 0, 0);
            statusCard.addView(tvStatusDetail);
        } else {
            statusBg.setColor(Color.parseColor("#FEF2F2")); // Red 50
            statusBg.setStroke((int)(1 * density), Color.parseColor("#FECACA"));

            TextView tvStatusHeader = new TextView(this);
            tvStatusHeader.setText("⚠️ ALL FILES ACCESS REQUIRED");
            tvStatusHeader.setTextColor(Color.parseColor("#991B1B"));
            tvStatusHeader.setTypeface(null, Typeface.BOLD);
            tvStatusHeader.setTextSize(13f);
            statusCard.addView(tvStatusHeader);

            TextView tvStatusDetail = new TextView(this);
            tvStatusDetail.setText("Please grant storage permission so OmniFlow can auto-discover your phone's call recordings.");
            tvStatusDetail.setTextColor(Color.parseColor("#B91C1C"));
            tvStatusDetail.setTextSize(11.5f);
            tvStatusDetail.setPadding(0, (int)(4 * density), 0, 0);
            statusCard.addView(tvStatusDetail);
        }
        statusCard.setBackground(statusBg);
        layout.addView(statusCard);

        // -------------------------------------------------------------
        // Official Work SIM Selection Card (Dual SIM Privacy & Bypass Shield)
        // -------------------------------------------------------------
        LinearLayout simCard = new LinearLayout(this);
        simCard.setOrientation(LinearLayout.VERTICAL);
        simCard.setPadding((int)(14 * density), (int)(12 * density), (int)(14 * density), (int)(12 * density));
        GradientDrawable simBg = new GradientDrawable();
        simBg.setCornerRadius(12 * density);
        simBg.setColor(Color.parseColor("#F8FAFC"));
        simBg.setStroke((int)(1 * density), Color.parseColor("#CBD5E1"));
        simCard.setBackground(simBg);

        TextView tvSimTitle = new TextView(this);
        tvSimTitle.setText("📱 Official Work Calling SIM");
        tvSimTitle.setTextSize(13.5f);
        tvSimTitle.setTypeface(null, Typeface.BOLD);
        tvSimTitle.setTextColor(Color.parseColor("#0F172A"));
        simCard.addView(tvSimTitle);

        TextView tvSimSub = new TextView(this);
        tvSimSub.setText("Personal calls to non-leads are completely private (zero logs). Calls to official CRM leads will be recorded & audited.");
        tvSimSub.setTextSize(11f);
        tvSimSub.setTextColor(Color.parseColor("#64748B"));
        tvSimSub.setPadding(0, (int)(3 * density), 0, (int)(10 * density));
        simCard.addView(tvSimSub);

        // Detect carrier names dynamically
        String sim1Label = "SIM 1";
        String sim2Label = "SIM 2";
        try {
            SubscriptionManager sm = (SubscriptionManager) getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
            if (sm != null && checkSelfPermission(android.Manifest.permission.READ_PHONE_STATE) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                List<SubscriptionInfo> subList = sm.getActiveSubscriptionInfoList();
                if (subList != null) {
                    for (SubscriptionInfo si : subList) {
                        int slot = si.getSimSlotIndex();
                        String carrier = si.getCarrierName() != null ? si.getCarrierName().toString().trim() : "";
                        if (carrier.isEmpty() && si.getDisplayName() != null) {
                            carrier = si.getDisplayName().toString().trim();
                        }
                        if (slot == 0) {
                            sim1Label = "SIM 1" + (!carrier.isEmpty() ? " (" + carrier + ")" : "");
                        } else if (slot == 1) {
                            sim2Label = "SIM 2" + (!carrier.isEmpty() ? " (" + carrier + ")" : "");
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        String currentSimSetting = prefs.getString("official_work_sim", "BOTH");

        RadioGroup rgSim = new RadioGroup(this);
        rgSim.setOrientation(RadioGroup.VERTICAL);

        RadioButton rbBoth = new RadioButton(this);
        rbBoth.setText("Both SIMs (All Calls Official)");
        rbBoth.setTextSize(12f);
        rbBoth.setTextColor(Color.parseColor("#1E293B"));
        rbBoth.setId(View.generateViewId());

        RadioButton rbSim1 = new RadioButton(this);
        rbSim1.setText(sim1Label + " - Official Work SIM");
        rbSim1.setTextSize(12f);
        rbSim1.setTextColor(Color.parseColor("#1E293B"));
        rbSim1.setId(View.generateViewId());

        RadioButton rbSim2 = new RadioButton(this);
        rbSim2.setText(sim2Label + " - Official Work SIM");
        rbSim2.setTextSize(12f);
        rbSim2.setTextColor(Color.parseColor("#1E293B"));
        rbSim2.setId(View.generateViewId());

        rgSim.addView(rbBoth);
        rgSim.addView(rbSim1);
        rgSim.addView(rbSim2);

        if ("SIM 1".equalsIgnoreCase(currentSimSetting)) {
            rbSim1.setChecked(true);
        } else if ("SIM 2".equalsIgnoreCase(currentSimSetting)) {
            rbSim2.setChecked(true);
        } else {
            rbBoth.setChecked(true);
        }

        rgSim.setOnCheckedChangeListener((group, checkedId) -> {
            String newSetting = "BOTH";
            if (checkedId == rbSim1.getId()) newSetting = "SIM 1";
            else if (checkedId == rbSim2.getId()) newSetting = "SIM 2";
            prefs.edit().putString("official_work_sim", newSetting).apply();
            Toast.makeText(MainActivity.this, "✅ Official Work SIM set to: " + newSetting, Toast.LENGTH_SHORT).show();
        });

        simCard.addView(rgSim);

        LinearLayout.LayoutParams simCardParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        simCardParams.setMargins(0, 0, 0, (int)(14 * density));
        simCard.setLayoutParams(simCardParams);
        layout.addView(simCard);

        // Intelligent Device Hardware & Brand Setup Guide Card
        LinearLayout guideCard = new LinearLayout(this);
        guideCard.setOrientation(LinearLayout.VERTICAL);
        guideCard.setPadding((int)(14 * density), (int)(14 * density), (int)(14 * density), (int)(14 * density));
        GradientDrawable guideBg = new GradientDrawable();
        guideBg.setCornerRadius(14 * density);
        guideBg.setColor(Color.parseColor("#F8FAFC"));
        guideBg.setStroke((int)(1.5f * density), Color.parseColor("#CBD5E1"));
        guideCard.setBackground(guideBg);

        String mfgRaw = Build.MANUFACTURER != null ? Build.MANUFACTURER : "Device";
        String modelRaw = Build.MODEL != null ? Build.MODEL : "";
        String androidVer = Build.VERSION.RELEASE != null ? Build.VERSION.RELEASE : "";
        String mfg = mfgRaw.toLowerCase();

        // Device Model Detection Header Chip
        LinearLayout chipRow = new LinearLayout(this);
        chipRow.setOrientation(LinearLayout.HORIZONTAL);
        chipRow.setGravity(Gravity.CENTER_VERTICAL);

        TextView tvDetectedChip = new TextView(this);
        tvDetectedChip.setText("📱 YOUR PHONE: " + mfgRaw.toUpperCase() + " " + modelRaw + " (Android " + androidVer + ")");
        tvDetectedChip.setTextSize(12f);
        tvDetectedChip.setTypeface(null, Typeface.BOLD);
        tvDetectedChip.setTextColor(Color.parseColor("#0F172A"));
        chipRow.addView(tvDetectedChip);
        guideCard.addView(chipRow);

        TextView tvGuideDesc = new TextView(this);
        tvGuideDesc.setTextSize(11.5f);
        tvGuideDesc.setTextColor(Color.parseColor("#334155"));
        tvGuideDesc.setLineSpacing(0, 1.25f);
        tvGuideDesc.setPadding(0, (int)(8 * density), 0, (int)(10 * density));

        LinearLayout actionButtonsRow = new LinearLayout(this);
        actionButtonsRow.setOrientation(LinearLayout.VERTICAL);

        if (mfg.contains("vivo") || mfg.contains("iqoo")) {
            tvGuideDesc.setText("✨ Vivo / iQOO High-Definition Recording:\n"
                    + "1. Dial *#*#5566888#*#* to enable Vivo's official dialer.\n"
                    + "2. Open Vivo Phone App > Settings > Record settings > Select 'Record all calls automatically'.\n"
                    + "⚡ Zero-Touch Auto Discovery is active. Recordings sync automatically!");

            // Button 1: Copy Vivo Code
            TextView btnCopyVivo = new TextView(this);
            btnCopyVivo.setText("📋 Copy Vivo Enabler Code (*#*#5566888#*#*)");
            btnCopyVivo.setGravity(Gravity.CENTER);
            btnCopyVivo.setTextSize(12f);
            btnCopyVivo.setTypeface(null, Typeface.BOLD);
            btnCopyVivo.setTextColor(Color.WHITE);
            btnCopyVivo.setPadding((int)(12 * density), (int)(8 * density), (int)(12 * density), (int)(8 * density));
            GradientDrawable b1 = new GradientDrawable();
            b1.setCornerRadius(8 * density);
            b1.setColor(Color.parseColor("#2563EB"));
            btnCopyVivo.setBackground(b1);
            btnCopyVivo.setOnClickListener(v -> {
                ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                if (cm != null) {
                    cm.setPrimaryClip(ClipData.newPlainText("Vivo Code", "*#*#5566888#*#*"));
                    Toast.makeText(MainActivity.this, "✅ Copied *#*#5566888#*#* to clipboard! Open dialer and paste.", Toast.LENGTH_LONG).show();
                }
            });
            actionButtonsRow.addView(btnCopyVivo);

        } else if (mfg.contains("samsung")) {
            tvGuideDesc.setText("✨ Samsung Galaxy Studio HD Recording:\n"
                    + "1. Open Samsung Phone App > 3 dots (⋮) > Settings > Record calls.\n"
                    + "2. Turn ON 'Auto record calls' > Choose 'All calls'.\n"
                    + "⚡ Zero-Touch Auto Discovery is active. Recordings sync automatically!");

            TextView btnOpenPhone = new TextView(this);
            btnOpenPhone.setText("📞 Open Samsung Phone Dialer");
            btnOpenPhone.setGravity(Gravity.CENTER);
            btnOpenPhone.setTextSize(12f);
            btnOpenPhone.setTypeface(null, Typeface.BOLD);
            btnOpenPhone.setTextColor(Color.WHITE);
            btnOpenPhone.setPadding((int)(12 * density), (int)(8 * density), (int)(12 * density), (int)(8 * density));
            GradientDrawable bPhone = new GradientDrawable();
            bPhone.setCornerRadius(8 * density);
            bPhone.setColor(Color.parseColor("#059669"));
            btnOpenPhone.setBackground(bPhone);
            btnOpenPhone.setOnClickListener(v -> {
                try {
                    Intent it = new Intent(Intent.ACTION_DIAL);
                    startActivity(it);
                } catch (Exception ignored) {}
            });
            actionButtonsRow.addView(btnOpenPhone);

        } else if (mfg.contains("oppo") || mfg.contains("realme") || mfg.contains("oneplus")) {
            tvGuideDesc.setText("✨ OnePlus / OPPO / Realme 100% HD Recording:\n"
                    + "1. Install official 'ODialer by ColorOS' from Google Play Store.\n"
                    + "2. Set ODialer as default phone app > Settings > Call recording > Record all calls.\n"
                    + "⚡ Zero-Touch Auto Discovery is active. Recordings sync automatically!");

            TextView btnInstallOdialer = new TextView(this);
            btnInstallOdialer.setText("📥 Install Official ODialer from Play Store");
            btnInstallOdialer.setGravity(Gravity.CENTER);
            btnInstallOdialer.setTextSize(12f);
            btnInstallOdialer.setTypeface(null, Typeface.BOLD);
            btnInstallOdialer.setTextColor(Color.WHITE);
            btnInstallOdialer.setPadding((int)(12 * density), (int)(8 * density), (int)(12 * density), (int)(8 * density));
            GradientDrawable bOdialer = new GradientDrawable();
            bOdialer.setCornerRadius(8 * density);
            bOdialer.setColor(Color.parseColor("#EA580C"));
            btnInstallOdialer.setBackground(bOdialer);
            btnInstallOdialer.setOnClickListener(v -> {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.oplus.dialer")));
                } catch (Exception e) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.oplus.dialer")));
                    } catch (Exception ignored) {}
                }
            });
            actionButtonsRow.addView(btnInstallOdialer);

        } else if (mfg.contains("xiaomi") || mfg.contains("redmi") || mfg.contains("poco")) {
            tvGuideDesc.setText("✨ Xiaomi / Redmi / POCO Recording:\n"
                    + "1. Open Phone app > Settings (⚙️) > Call recording.\n"
                    + "2. Turn ON 'Record calls automatically' (All numbers).\n"
                    + "⚡ Zero-Touch Auto Discovery is active. Recordings sync automatically!");

            TextView btnOpenPhone = new TextView(this);
            btnOpenPhone.setText("📞 Open Phone App");
            btnOpenPhone.setGravity(Gravity.CENTER);
            btnOpenPhone.setTextSize(12f);
            btnOpenPhone.setTypeface(null, Typeface.BOLD);
            btnOpenPhone.setTextColor(Color.WHITE);
            btnOpenPhone.setPadding((int)(12 * density), (int)(8 * density), (int)(12 * density), (int)(8 * density));
            GradientDrawable bPhone = new GradientDrawable();
            bPhone.setCornerRadius(8 * density);
            bPhone.setColor(Color.parseColor("#059669"));
            btnOpenPhone.setBackground(bPhone);
            btnOpenPhone.setOnClickListener(v -> {
                try {
                    Intent it = new Intent(Intent.ACTION_DIAL);
                    startActivity(it);
                } catch (Exception ignored) {}
            });
            actionButtonsRow.addView(btnOpenPhone);

        } else {
            tvGuideDesc.setText("✨ Auto Call Recording Setup:\n"
                    + "1. Open your default Phone app > Settings > Call Recording.\n"
                    + "2. Turn ON 'Auto record calls' for all calls.\n"
                    + "⚡ Zero-Touch Auto Discovery is active. Recordings sync automatically!");
        }

        guideCard.addView(tvGuideDesc);
        guideCard.addView(actionButtonsRow);

        // Secondary Button: View Full Multi-Brand Guide
        TextView btnAllGuides = new TextView(this);
        btnAllGuides.setText("📚 View Setup Guides for All Phone Brands");
        btnAllGuides.setGravity(Gravity.CENTER);
        btnAllGuides.setTextSize(11.5f);
        btnAllGuides.setTypeface(null, Typeface.BOLD);
        btnAllGuides.setTextColor(Color.parseColor("#065F46"));
        btnAllGuides.setPadding((int)(10 * density), (int)(8 * density), (int)(10 * density), (int)(8 * density));
        GradientDrawable bgAll = new GradientDrawable();
        bgAll.setCornerRadius(8 * density);
        bgAll.setColor(Color.parseColor("#E6FFFA"));
        bgAll.setStroke((int)(1 * density), Color.parseColor("#99F6E4"));
        btnAllGuides.setBackground(bgAll);
        LinearLayout.LayoutParams allParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        allParams.setMargins(0, (int)(8 * density), 0, 0);
        btnAllGuides.setLayoutParams(allParams);
        btnAllGuides.setOnClickListener(v -> showAllPhoneGuidesDialog());
        guideCard.addView(btnAllGuides);

        layout.addView(guideCard);

        // App Version & In-App Update Check Button
        TextView btnCheckUpdate = new TextView(this);
        String verName = "1.0.0";
        try { verName = getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception ignored) {}
        btnCheckUpdate.setText("🔄 Check for App Updates (Current v" + verName + ")");
        btnCheckUpdate.setGravity(Gravity.CENTER);
        btnCheckUpdate.setTextSize(12f);
        btnCheckUpdate.setTypeface(null, Typeface.BOLD);
        btnCheckUpdate.setTextColor(Color.parseColor("#064E43"));
        btnCheckUpdate.setPadding((int)(10 * density), (int)(10 * density), (int)(10 * density), (int)(10 * density));
        GradientDrawable btnUpBg = new GradientDrawable();
        btnUpBg.setCornerRadius(8 * density);
        btnUpBg.setColor(Color.parseColor("#F0FDFA"));
        btnUpBg.setStroke((int)(1 * density), Color.parseColor("#99F6E4"));
        btnCheckUpdate.setBackground(btnUpBg);
        LinearLayout.LayoutParams btnUpParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        btnUpParams.setMargins(0, (int)(10 * density), 0, 0);
        btnCheckUpdate.setLayoutParams(btnUpParams);
        layout.addView(btnCheckUpdate);

        // Optional Custom Folder Selection (Advanced)
        TextView tvCustomFolder = new TextView(this);
        tvCustomFolder.setText("⚙️ Custom Folder (Advanced / SD Card)");
        tvCustomFolder.setGravity(Gravity.CENTER);
        tvCustomFolder.setTextSize(11f);
        tvCustomFolder.setTextColor(Color.parseColor("#64748B"));
        tvCustomFolder.setPadding((int)(8 * density), (int)(10 * density), (int)(8 * density), (int)(6 * density));
        layout.addView(tvCustomFolder);

        scroll.addView(layout);
        builder.setView(scroll);

        builder.setNegativeButton("Close", (d, w) -> d.dismiss());
        android.app.AlertDialog dialog = builder.create();

        tvCustomFolder.setOnClickListener(v -> {
            dialog.dismiss();
            requestFolderSelection();
        });

        btnCheckUpdate.setOnClickListener(v -> {
            dialog.dismiss();
            AppUpdateEngine.checkForUpdate(MainActivity.this, true);
        });

        dialog.show();
    }

    private void showAllPhoneGuidesDialog() {
        float density = getResources().getDisplayMetrics().density;
        android.app.AlertDialog.Builder builder = new android.app.AlertDialog.Builder(this);

        ScrollView scroll = new ScrollView(this);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding((int)(20 * density), (int)(16 * density), (int)(20 * density), (int)(16 * density));

        TextView tvTitle = new TextView(this);
        tvTitle.setText("📚 All Phone Setup Guides");
        tvTitle.setTextSize(18f);
        tvTitle.setTypeface(null, Typeface.BOLD);
        tvTitle.setTextColor(Color.parseColor("#0F172A"));
        tvTitle.setPadding(0, 0, 0, (int)(12 * density));
        layout.addView(tvTitle);

        // 1. Samsung
        layout.addView(createBrandGuideCard("📱 Samsung Galaxy (S, A, M, F Series)",
                "1. Open Samsung Phone App.\n"
                + "2. Tap 3 dots (⋮) > Settings > Record calls.\n"
                + "3. Turn ON 'Auto record calls' > Select 'All calls'.\n"
                + "⚡ Studio HD audio will automatically sync to CRM.",
                "📞 Open Dialer", () -> {
                    try { startActivity(new Intent(Intent.ACTION_DIAL)); } catch (Exception ignored) {}
                }, density));

        // 2. Vivo & iQOO
        layout.addView(createBrandGuideCard("📱 Vivo & iQOO (V, Y, T, X Series)",
                "If phone has Google dialer, restore Vivo's official dialer:\n"
                + "1. Dial *#*#5566888#*#* on your keypad.\n"
                + "2. Enable 'Alternate Phone and Contacts' > Set as default.\n"
                + "3. Open Vivo Phone app > Settings > Record settings > 'Record all calls automatically'.",
                "📋 Copy Vivo Code (*#*#5566888#*#*)", () -> {
                    ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    if (cm != null) {
                        cm.setPrimaryClip(ClipData.newPlainText("Vivo Code", "*#*#5566888#*#*"));
                        Toast.makeText(MainActivity.this, "✅ Copied *#*#5566888#*#*! Open dialer & paste.", Toast.LENGTH_SHORT).show();
                    }
                }, density));

        // 3. OnePlus / Oppo / Realme
        layout.addView(createBrandGuideCard("📱 OnePlus / OPPO / Realme",
                "To get 100% silent HD recording without announcements:\n"
                + "1. Install official 'ODialer by ColorOS' from Play Store.\n"
                + "2. Set ODialer as default dialer.\n"
                + "3. In ODialer > Settings > Call recording > Turn ON 'Record all calls'.",
                "📥 Open ODialer on Play Store", () -> {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.oplus.dialer")));
                    } catch (Exception e) {
                        try {
                            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.oplus.dialer")));
                        } catch (Exception ignored) {}
                    }
                }, density));

        // 4. Xiaomi / Redmi / POCO
        layout.addView(createBrandGuideCard("📱 Xiaomi / Redmi / POCO (MIUI / HyperOS)",
                "1. Open Phone app > Tap Settings (gear icon) > Call recording.\n"
                + "2. Turn ON 'Record calls automatically'.\n"
                + "3. Under Selected numbers, ensure 'All numbers' is selected.",
                "📞 Open Dialer", () -> {
                    try { startActivity(new Intent(Intent.ACTION_DIAL)); } catch (Exception ignored) {}
                }, density));

        // 5. Tecno / Infinix / itel
        layout.addView(createBrandGuideCard("📱 Tecno / Infinix / itel (HiOS / XOS)",
                "1. Open default Phone app.\n"
                + "2. Tap Settings (⚙️) > Turn ON 'Auto call recording'.\n"
                + "⚡ Recordings are automatically detected and synced.",
                "📞 Open Dialer", () -> {
                    try { startActivity(new Intent(Intent.ACTION_DIAL)); } catch (Exception ignored) {}
                }, density));

        // 6. Motorola & Google Pixel
        layout.addView(createBrandGuideCard("📱 Motorola & Google Pixel",
                "1. Open Phone by Google app > 3 dots > Settings > Call recording.\n"
                + "2. Enable 'Numbers not in your contacts'.\n"
                + "💡 Note: Commercial teams making high volume calls are recommended to use Samsung, Vivo or OnePlus.",
                null, null, density));

        scroll.addView(layout);
        builder.setView(scroll);
        builder.setPositiveButton("Done", (d, w) -> d.dismiss());
        builder.show();
    }

    private LinearLayout createBrandGuideCard(String title, String desc, String btnText, Runnable btnAction, float density) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding((int)(12 * density), (int)(12 * density), (int)(12 * density), (int)(12 * density));
        GradientDrawable bg = new GradientDrawable();
        bg.setCornerRadius(10 * density);
        bg.setColor(Color.parseColor("#F8FAFC"));
        bg.setStroke((int)(1 * density), Color.parseColor("#E2E8F0"));
        card.setBackground(bg);

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 0, 0, (int)(12 * density));
        card.setLayoutParams(lp);

        TextView tvT = new TextView(this);
        tvT.setText(title);
        tvT.setTextSize(13f);
        tvT.setTypeface(null, Typeface.BOLD);
        tvT.setTextColor(Color.parseColor("#1E293B"));
        card.addView(tvT);

        TextView tvD = new TextView(this);
        tvD.setText(desc);
        tvD.setTextSize(11.5f);
        tvD.setTextColor(Color.parseColor("#475569"));
        tvD.setLineSpacing(0, 1.25f);
        tvD.setPadding(0, (int)(4 * density), 0, (int)(8 * density));
        card.addView(tvD);

        if (btnText != null && btnAction != null) {
            TextView btn = new TextView(this);
            btn.setText(btnText);
            btn.setGravity(Gravity.CENTER);
            btn.setTextSize(11.5f);
            btn.setTypeface(null, Typeface.BOLD);
            btn.setTextColor(Color.WHITE);
            btn.setPadding((int)(10 * density), (int)(6 * density), (int)(10 * density), (int)(6 * density));
            GradientDrawable bgb = new GradientDrawable();
            bgb.setCornerRadius(6 * density);
            bgb.setColor(Color.parseColor("#065F46"));
            btn.setBackground(bgb);
            btn.setOnClickListener(v -> btnAction.run());
            card.addView(btn);
        }

        return card;
    }

    @Override
    public void onBackPressed() {
        if (crmLayout.getVisibility() == View.VISIBLE && webView != null && webView.canGoBack()) {
            webView.goBack();
        } else if (crmLayout.getVisibility() == View.GONE) {
            switchTab(0);
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        synchronized (toneGeneratorLock) {
            if (toneGenerator != null) {
                try {
                    toneGenerator.release();
                } catch (Exception ignored) {}
                toneGenerator = null;
            }
        }
        if (webView != null) {
            webView.destroy();
        }
    }
}
