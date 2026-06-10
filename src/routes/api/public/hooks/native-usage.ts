// POST /api/public/hooks/native-usage
// Called from the Android SyncWorker every hour with: { entries: [{ packageName, minutes }] }
// Auth: Authorization: Bearer <user access token>  (so we act as that user via RLS)
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const Body = z.object({
  entries: z
    .array(
      z.object({
        packageName: z.string().min(1).max(255),
        minutes: z.number().int().min(0).max(1440),
      }),
    )
    .max(500),
});

export const Route = createFileRoute("/api/public/hooks/native-usage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        const token = auth?.replace(/^Bearer\s+/i, "");
        if (!token) {
          return new Response(JSON.stringify({ error: "Missing token" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch (e: any) {
          return new Response(JSON.stringify({ error: "Invalid body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: `Bearer ${token}` } },
          },
        );

        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        const userId = userData.user.id;
        const today = new Date().toISOString().slice(0, 10);

        // Map by package name (tracked_apps.app_key stores the Android package).
        const { data: tracked } = await supabase
          .from("tracked_apps")
          .select("app_key")
          .eq("user_id", userId)
          .eq("enabled", true);
        const trackedKeys = new Set((tracked ?? []).map((t: any) => t.app_key));

        const upserts = parsed.entries
          .filter((e) => trackedKeys.has(e.packageName))
          .map((e) => ({
            user_id: userId,
            day: today,
            app_key: e.packageName,
            minutes_used: e.minutes,
          }));

        if (upserts.length) {
          await supabase
            .from("usage_logs")
            .upsert(upserts, { onConflict: "user_id,day,app_key" });
        }

        return new Response(
          JSON.stringify({ ok: true, written: upserts.length }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
