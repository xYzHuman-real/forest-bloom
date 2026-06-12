package com.treerise.app.usage;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

public class SyncWorker extends Worker {

    public SyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        String endpoint = getInputData().getString("endpoint");
        String bearer = getInputData().getString("bearer");
        if (endpoint == null || bearer == null) return Result.failure();
        if (!UsageStatsPlugin.isUsageAccessGranted(getApplicationContext())) return Result.success();

        Map<String, Long> usage = UsageStatsPlugin.readTodayUsage(getApplicationContext());
        JSONArray arr = new JSONArray();
        try {
            for (Map.Entry<String, Long> e : usage.entrySet()) {
                JSONObject o = new JSONObject();
                o.put("packageName", e.getKey());
                o.put("minutes", e.getValue());
                arr.put(o);
            }
            JSONObject body = new JSONObject();
            body.put("entries", arr);

            URL url = new URL(endpoint);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + bearer);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);
            conn.getOutputStream().write(body.toString().getBytes());
            conn.getOutputStream().close();
            int code = conn.getResponseCode();
            conn.disconnect();
            return (code >= 200 && code < 300) ? Result.success() : Result.retry();
        } catch (Exception e) {
            return Result.retry();
        }
    }
}
