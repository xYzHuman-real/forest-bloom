package com.treerise.app.usage

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.os.Process
import android.provider.Settings
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.Calendar
import java.util.concurrent.TimeUnit

@CapacitorPlugin(name = "UsageStats")
class UsageStatsPlugin : Plugin() {

    @PluginMethod
    fun hasUsageAccess(call: PluginCall) {
        val granted = isUsageAccessGranted(context)
        val ret = JSObject()
        ret.put("granted", granted)
        call.resolve(ret)
    }

    @PluginMethod
    fun requestUsageAccess(call: PluginCall) {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        call.resolve()
    }

    @PluginMethod
    fun listInstalledApps(call: PluginCall) {
        val pm = context.packageManager
        val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
        val arr = JSArray()
        for (info in apps) {
            // Skip system apps unless they are user-launchable
            val isSystem = (info.flags and ApplicationInfo.FLAG_SYSTEM) != 0
            val launchable = pm.getLaunchIntentForPackage(info.packageName) != null
            if (isSystem && !launchable) continue
            val obj = JSObject()
            obj.put("packageName", info.packageName)
            obj.put("appName", pm.getApplicationLabel(info).toString())
            arr.put(obj)
        }
        val ret = JSObject()
        ret.put("apps", arr)
        call.resolve(ret)
    }

    @PluginMethod
    fun getTodayUsage(call: PluginCall) {
        if (!isUsageAccessGranted(context)) {
            call.reject("Usage access not granted")
            return
        }
        val entries = readTodayUsage(context)
        val arr = JSArray()
        for ((pkg, mins) in entries) {
            val obj = JSObject()
            obj.put("packageName", pkg)
            obj.put("minutes", mins)
            arr.put(obj)
        }
        val ret = JSObject()
        ret.put("entries", arr)
        call.resolve(ret)
    }

    @PluginMethod
    fun scheduleHourlySync(call: PluginCall) {
        val endpoint = call.getString("endpoint") ?: run {
            call.reject("endpoint required"); return
        }
        val bearer = call.getString("bearer") ?: run {
            call.reject("bearer required"); return
        }
        val data = Data.Builder()
            .putString("endpoint", endpoint)
            .putString("bearer", bearer)
            .build()
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val req = PeriodicWorkRequestBuilder<SyncWorker>(1, TimeUnit.HOURS)
            .setConstraints(constraints)
            .setInputData(data)
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "treerise-hourly-sync",
            ExistingPeriodicWorkPolicy.UPDATE,
            req,
        )
        call.resolve()
    }

    @PluginMethod
    fun cancelHourlySync(call: PluginCall) {
        WorkManager.getInstance(context).cancelUniqueWork("treerise-hourly-sync")
        call.resolve()
    }

    @PluginMethod
    fun isIgnoringBatteryOptimizations(call: PluginCall) {
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val ignoring = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pm.isIgnoringBatteryOptimizations(context.packageName)
        } else true
        val ret = JSObject()
        ret.put("ignoring", ignoring)
        call.resolve(ret)
    }

    @PluginMethod
    fun requestIgnoreBatteryOptimizations(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
            intent.data = Uri.parse("package:" + context.packageName)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }
        call.resolve()
    }

    companion object {
        fun isUsageAccessGranted(context: Context): Boolean {
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    context.packageName,
                )
            } else {
                @Suppress("DEPRECATION")
                appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    context.packageName,
                )
            }
            return mode == AppOpsManager.MODE_ALLOWED
        }

        fun readTodayUsage(context: Context): Map<String, Long> {
            val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val cal = Calendar.getInstance()
            cal.set(Calendar.HOUR_OF_DAY, 0)
            cal.set(Calendar.MINUTE, 0)
            cal.set(Calendar.SECOND, 0)
            cal.set(Calendar.MILLISECOND, 0)
            val start = cal.timeInMillis
            val end = System.currentTimeMillis()
            val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end)
            val result = HashMap<String, Long>()
            if (stats != null) {
                for (s in stats) {
                    val mins = s.totalTimeInForeground / 60000L
                    if (mins <= 0) continue
                    result[s.packageName] = (result[s.packageName] ?: 0L) + mins
                }
            }
            return result
        }
    }
}
