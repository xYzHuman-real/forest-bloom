package com.treerise.app.usage

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class SyncWorker(appContext: Context, params: WorkerParameters) :
    CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val endpoint = inputData.getString("endpoint") ?: return Result.failure()
        val bearer = inputData.getString("bearer") ?: return Result.failure()
        if (!UsageStatsPlugin.isUsageAccessGranted(applicationContext)) return Result.success()

        val usage = UsageStatsPlugin.readTodayUsage(applicationContext)
        val arr = JSONArray()
        for ((pkg, mins) in usage) {
            val o = JSONObject()
            o.put("packageName", pkg)
            o.put("minutes", mins)
            arr.put(o)
        }
        val body = JSONObject()
        body.put("entries", arr)

        return try {
            val url = URL(endpoint)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Authorization", "Bearer $bearer")
            conn.connectTimeout = 15000
            conn.readTimeout = 15000
            conn.outputStream.use { it.write(body.toString().toByteArray()) }
            val code = conn.responseCode
            conn.disconnect()
            if (code in 200..299) Result.success() else Result.retry()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
