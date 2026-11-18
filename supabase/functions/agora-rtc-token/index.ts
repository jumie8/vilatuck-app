import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { RtcTokenBuilder, RtcRole } from "npm:agora-access-token@2.0.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Sign in required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appId = Deno.env.get("AGORA_APP_ID");
    const appCertificate = Deno.env.get("AGORA_APP_CERTIFICATE");
    if (!appId || !appCertificate) return json({ error: "Agora server credentials are not configured" }, 503);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Invalid session" }, 401);

    const body = await req.json();
    const streamId = String(body.stream_id ?? "");
    const role = body.role === "host" ? "host" : "audience";
    if (!/^[0-9a-f-]{36}$/i.test(streamId)) return json({ error: "Invalid live stream" }, 400);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: stream, error: streamError } = await admin
      .from("live_streams").select("id,host_id,channel_name,status").eq("id", streamId).maybeSingle();
    if (streamError || !stream || stream.status !== "live") return json({ error: "Live stream is unavailable" }, 404);
    if (role === "host" && stream.host_id !== userData.user.id) return json({ error: "Only the host can publish" }, 403);

    const uid = crypto.getRandomValues(new Uint32Array(1))[0] || 1;
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const rtcRole = role === "host" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, stream.channel_name, uid, rtcRole, expiresAt);
    return json({ token, app_id: appId, channel_name: stream.channel_name, uid, role, expires_at: expiresAt });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected server error" }, 500);
  }
});