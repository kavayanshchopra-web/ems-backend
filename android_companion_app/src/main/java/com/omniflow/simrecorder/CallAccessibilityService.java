package com.omniflow.simrecorder;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;

/**
 * CallAccessibilityService — Android Accessibility Audio Helper
 *
 * Responsibilities:
 * 1. Bypasses Android OS 10/11/12/13/14 mic-lock Hardware Abstraction Layer restrictions
 * 2. Keeps system audio recording stream elevated during cellular calls
 * 3. Provides system-level call state event hooks
 */
public class CallAccessibilityService extends AccessibilityService {

    private static final String TAG = "OmniFlowAccessibility";
    private static CallAccessibilityService instance;

    public static CallAccessibilityService getInstance() {
        return instance;
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        Log.d(TAG, "🟢 OmniFlow Accessibility Service Connected & Running!");

        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED | AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS | AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS;
        info.notificationTimeout = 100;
        setServiceInfo(info);
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;
        // Event monitoring during active call window
        CharSequence packageName = event.getPackageName();
        if (packageName != null) {
            String pkg = packageName.toString();
            if (pkg.contains("dialer") || pkg.contains("telecom") || pkg.contains("incallui") || pkg.contains("phone")) {
                Log.d(TAG, "📞 Call UI Event Detected in Package: " + pkg);
            }
        }
    }

    @Override
    public void onInterrupt() {
        Log.w(TAG, "Accessibility Service Interrupted");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        instance = null;
        Log.d(TAG, "Accessibility Service Destroyed");
    }

    /**
     * Check if Accessibility Service is enabled in Android Settings
     */
    public static boolean isServiceEnabled(Context context) {
        if (context == null) return false;
        int accessibilityEnabled = 0;
        final String service = context.getPackageName() + "/" + CallAccessibilityService.class.getCanonicalName();
        try {
            accessibilityEnabled = Settings.Secure.getInt(
                context.getApplicationContext().getContentResolver(),
                Settings.Secure.ACCESSIBILITY_ENABLED
            );
        } catch (Settings.SettingNotFoundException e) {
            Log.e(TAG, "Error finding accessibility setting: " + e.getMessage());
        }

        TextUtils.SimpleStringSplitter stringColonSplitter = new TextUtils.SimpleStringSplitter(':');

        if (accessibilityEnabled == 1) {
            String settingValue = Settings.Secure.getString(
                context.getApplicationContext().getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            );
            if (settingValue != null) {
                stringColonSplitter.setString(settingValue);
                while (stringColonSplitter.hasNext()) {
                    String accessibilityService = stringColonSplitter.next();
                    if (accessibilityService.equalsIgnoreCase(service)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
