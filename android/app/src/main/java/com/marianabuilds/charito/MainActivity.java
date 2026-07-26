package com.marianabuilds.charito;

import com.getcapacitor.BridgeActivity;
import com.marianabuilds.charito.UsageStatsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(UsageStatsPlugin.class);
        registerPlugin(AppBlockerPlugin.class);
        registerPlugin(BlockSchedulerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
