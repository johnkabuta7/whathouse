// WordPress proxy: creates WP users on signup, uploads media, and publishes posts
// authored by the actual user account on zwandako.com.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WP_BASE = "https://zwandano.com/wp-json/wp/v2";
const WP_ADMIN_USER = Deno.env.get("WP_ADMIN_USER") || "";
const WP_ADMIN_APP_PASSWORD = Deno.env.get("WP_ADMIN_APP_PASSWORD") || "";

function adminAuthHeader() {
  const raw = `${WP_ADMIN_USER}:${WP_ADMIN_APP_PASSWORD}`;
  return "Basic " + btoa(raw);
}
function userAuthHeader(username: string, appPassword: string) {
  return "Basic " + btoa(`${username}:${appPassword}`);
}

async function ensureWpUser(supabase: any, userId: string) {
  // Get profile
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id, first_name, last_name, phone, wp_user_id, wp_user_password")
    .eq("user_id", userId)
    .single();
  if (error || !profile) throw new Error("Profile not found");

  if (profile.wp_user_id && profile.wp_user_password) {
    return { wp_user_id: profile.wp_user_id, wp_user_password: profile.wp_user_password };
  }

  const phoneDigits = (profile.phone || "").replace(/[^0-9]/g, "");
  if (!phoneDigits) throw new Error("Profile has no phone number");
  const username = `u${phoneDigits}`;
  const email = `${phoneDigits}@zwandano.com`;
  const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || username;
  // Strong random password for the WP account itself (not the app password)
  const accountPassword = crypto.randomUUID() + crypto.randomUUID();

  // Create WP user
  const createRes = await fetch(`${WP_BASE}/users`, {
    method: "POST",
    headers: {
      Authorization: adminAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      email,
      password: accountPassword,
      name: fullName,
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      roles: ["author"],
    }),
  });

  let wpUserId: number | null = null;
  if (createRes.ok) {
    const body = await createRes.json();
    wpUserId = body.id;
  } else {
    // If user already exists, find them
    const errBody = await createRes.text();
    if (createRes.status === 400 && /exists/i.test(errBody)) {
      const lookup = await fetch(`${WP_BASE}/users?search=${encodeURIComponent(username)}&context=edit`, {
        headers: { Authorization: adminAuthHeader() },
      });
      if (lookup.ok) {
        const list = await lookup.json();
        const match = list.find((u: any) => u.slug === username || u.username === username);
        if (match) wpUserId = match.id;
      }
    }
    if (!wpUserId) throw new Error(`WP user create failed [${createRes.status}]: ${errBody}`);
  }

  // Create application password for this user (so we can post on their behalf)
  const appPwRes = await fetch(`https://zwandano.com/wp-json/wp/v2/users/${wpUserId}/application-passwords`, {
    method: "POST",
    headers: {
      Authorization: adminAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "WhatHouse App" }),
  });
  if (!appPwRes.ok) {
    const t = await appPwRes.text();
    throw new Error(`WP app-password create failed [${appPwRes.status}]: ${t}`);
  }
  const appPwBody = await appPwRes.json();
  const appPassword: string = appPwBody.password;

  await supabase
    .from("profiles")
    .update({ wp_user_id: wpUserId, wp_user_password: appPassword })
    .eq("user_id", userId);

  return { wp_user_id: wpUserId!, wp_user_password: appPassword };
}

async function uploadMedia(username: string, appPassword: string, fileUrl: string) {
  // Fetch image bytes from the public URL
  const imgRes = await fetch(fileUrl);
  if (!imgRes.ok) throw new Error(`fetch image failed [${imgRes.status}]`);
  const blob = await imgRes.blob();
  const filename = fileUrl.split("/").pop()?.split("?")[0] || `image-${Date.now()}.jpg`;

  const upRes = await fetch(`${WP_BASE}/media`, {
    method: "POST",
    headers: {
      Authorization: userAuthHeader(username, appPassword),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": blob.type || "image/jpeg",
    },
    body: blob,
  });
  if (!upRes.ok) {
    const t = await upRes.text();
    throw new Error(`WP media upload failed [${upRes.status}]: ${t}`);
  }
  const body = await upRes.json();
  return { id: body.id as number, source_url: body.source_url as string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!WP_ADMIN_USER || !WP_ADMIN_APP_PASSWORD) {
      throw new Error("WordPress credentials not configured");
    }

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    // Identify caller from JWT
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await userClient.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, payload } = await req.json();

    if (action === "ensure_user") {
      const wp = await ensureWpUser(supabase, uid);
      return new Response(JSON.stringify({ ok: true, ...wp }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "publish_listing") {
      const { title, content, image_urls, listing_id } = payload || {};
      if (!title || !content) throw new Error("title and content required");

      const wp = await ensureWpUser(supabase, uid);
      // Profile gives us username
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("user_id", uid)
        .single();
      const username = `u${(profile?.phone || "").replace(/[^0-9]/g, "")}`;

      const mediaIds: number[] = [];
      let featured: number | null = null;
      if (Array.isArray(image_urls)) {
        for (const url of image_urls) {
          try {
            const m = await uploadMedia(username, wp.wp_user_password, url);
            mediaIds.push(m.id);
            if (featured === null) featured = m.id;
          } catch (e) {
            console.error("media upload error:", e);
          }
        }
      }

      const postRes = await fetch(`${WP_BASE}/posts`, {
        method: "POST",
        headers: {
          Authorization: userAuthHeader(username, wp.wp_user_password),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          status: "publish",
          author: wp.wp_user_id,
          ...(featured ? { featured_media: featured } : {}),
        }),
      });
      if (!postRes.ok) {
        const t = await postRes.text();
        throw new Error(`WP post create failed [${postRes.status}]: ${t}`);
      }
      const post = await postRes.json();

      if (listing_id) {
        await supabase
          .from("listings")
          .update({
            wp_post_id: post.id,
            wp_media_ids: mediaIds,
            zwandako_url: post.link,
          })
          .eq("id", listing_id);
      }

      return new Response(
        JSON.stringify({ ok: true, wp_post_id: post.id, link: post.link, media_ids: mediaIds }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list_posts") {
      const page = payload?.page || 1;
      const perPage = payload?.per_page || 20;
      const res = await fetch(`${WP_BASE}/posts?_embed&per_page=${perPage}&page=${page}`, {
        headers: { Authorization: adminAuthHeader() },
      });
      const body = await res.json();
      return new Response(JSON.stringify({ ok: true, posts: body }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("wp-proxy error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
