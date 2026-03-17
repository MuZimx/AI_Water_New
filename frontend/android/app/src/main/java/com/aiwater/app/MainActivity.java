package com.aiwater.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
	}

	@Override
	public void onBackPressed() {
		if (bridge != null && bridge.getWebView() != null && bridge.getWebView().canGoBack()) {
			bridge.getWebView().goBack();
			return;
		}

		super.onBackPressed();
	}
}
