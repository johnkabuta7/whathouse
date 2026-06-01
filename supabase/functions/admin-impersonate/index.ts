// Admin-only "Login as user" — generates a magic link via service role
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData?.user;
    if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const admin = createClient(url, service);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });

    const { target_user_id } = await req.json();
    if (!target_user_id) return new Response(JSON.stringify({ error: "Missing target_user_id" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    // Fetch target email
    const { data: targetUser, error: gErr } = await admin.auth.admin.getUserById(target_user_id);
    if (gErr || !targetUser?.user?.email) return new Response(JSON.stringify({ error: "Target has no email" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const { data: linkData, error: lErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: targetUser.user.email,
    });
    if (lErr) return new Response(JSON.stringify({ error: lErr.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({
      email: targetUser.user.email,
      token_hash: (linkData as any)?.properties?.hashed_token,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
