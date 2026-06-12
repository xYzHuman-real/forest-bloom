package com.treerise.app.usage;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.os.Process;
import android.provider.Settings;

import androidx.work.Constraints;
import androidx.work.Data;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "UsageStats")
public class UsageStatsPlugin extends Plugin {

    @PluginMethod
    public void hasUsageAccess(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", isUsageAccessGranted(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void requestUsageAccess(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void listInstalledApps(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        List<ApplicationInfo> apps = pm.getInstalledApplications(PackageManager.GET_META_DATA);
        JSArray arr = new JSArray();
        for (ApplicationInfo info : apps) {
            boolean isSystem = (info.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
            boolean launchable = pm.getLaunchIntentForPackage(info.packageName) != null;
            if (isSystem && !launchable) continue;
            JSObject obj = new JSObject();
            obj.put("packageName", info.packageName);
            obj.put("appName", pm.getApplicationLabel(info).toString());
            arr.put(obj);
        }
        JSObject ret = new JSObject();
        ret.put("apps", arr);
        call.resolve(ret);
    }

    @PluginMethod
    public void getTodayUsage(PluginCall call) {
        if (!isUsageAccessGranted(getContext())) {
            call.reject("Usage access not granted");
            return;
        }
        Map<String, Long> entries = readTodayUsage(getContext());
        JSArray arr = new JSArray();
        for (Map.Entry<String, Long> e : entries.entrySet()) {
            JSObject obj = new JSObject();
            obj.put("packageName", e.getKey());
            obj.put("minutes", e.getValue());
            arr.put(obj);
        }
        JSObject ret = new JSObject();
        ret.put("entries", arr);
        call.resolve(ret);
    }

    @PluginMethod
    public void scheduleHourlySync(PluginCall call) {
        String endpoint = call.getString("endpoint");
        String bearer = call.getString("bearer");
        if (endpoint == null) { call.reject("endpoint required"); return; }
        if (bearer == null) { call.reject("bearer required"); return; }
        Data data = new Data.Builder()
                .putString("endpoint", endpoint)
                .putString("bearer", bearer)
                .build();
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();
        PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(SyncWorker.class, 1, TimeUnit.HOURS)
                .setConstraints(constraints)
                .setInputData(data)
                .build();
        WorkManager.getInstance(getContext()).enqueueUniquePeriodicWork(
                "treerise-hourly-sync",
                ExistingPeriodicWorkPolicy.UPDATE,
                req);
        call.resolve();
    }

    @PluginMethod
    public void cancelHourlySync(PluginCall call) {
        WorkManager.getInstance(getContext()).cancelUniqueWork("treerise-hourly-sync");
        call.resolve();
    }

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        boolean ignoring = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            ignoring = pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        }
        JSObject ret = new JSObject();
        ret.put("ignoring", ignoring);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    public static boolean isUsageAccessGranted(Context context) {
        AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
        int mode;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            mode = appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    context.getPackageName());
        } else {
            mode = appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    context.getPackageName());
        }
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    public static Map<String, Long> readTodayUsage(Context context) {
        UsageStatsManager usm = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        long start = cal.getTimeInMillis();
        long end = System.currentTimeMillis();
        List<UsageStats> stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end);
        Map<String, Long> result = new HashMap<>();
        if (stats != null) {
            for (UsageStats s : stats) {
                long mins = s.getTotalTimeInForeground() / 60000L;
                if (mins <= 0) continue;
                Long prev = result.get(s.getPackageName());
                result.put(s.getPackageName(), (prev == null ? 0L : prev) + mins);
            }
        }
        return result;
    }
}
