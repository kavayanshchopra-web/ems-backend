package com.omniflow.simrecorder;

import android.os.Build;
import android.telecom.Call;
import android.telecom.InCallService;
import android.util.Log;
import androidx.annotation.RequiresApi;

/**
 * OmniFlowInCallService
 * Enables the Android OS to recognize OmniFlow as an official Default Phone / Dialer application.
 */
@RequiresApi(api = Build.VERSION_CODES.M)
public class OmniFlowInCallService extends InCallService {

    private static final String TAG = "OmniFlowInCall";

    @Override
    public void onCallAdded(Call call) {
        super.onCallAdded(call);
        Log.d(TAG, "Call added: " + call);
    }

    @Override
    public void onCallRemoved(Call call) {
        super.onCallRemoved(call);
        Log.d(TAG, "Call removed: " + call);
    }
}
