import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const WP_BASE = "https://zwandako.com/wp-json/wp/v2";
const WP_ADMIN_USER = Deno.env.get("WP_ADMIN_USER") || "";
const WP_ADMIN_APP_PASSWORD = Deno.env.get("WP_ADMIN_APP_PASSWORD") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ||
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

type ProfileRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  wp_user_id: number | null;
  wp_user_password: string | null;
};

type WpActor = {
  userId: number;
  username: string;
  authHeader: string;
  mode: "user" | "admin_fallback";
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function adminAuthHeader() {
  return "Basic " + btoa(`${WP_ADMIN_USER}:${WP_ADMIN_APP_PASSWORD}`);
}

function userAuthHeader(username: string, appPassword: string) {
  return "Basic " + btoa(`${username}:${appPassword}`);
}

function normalizePhoneDigits(phone: string | null | undefined) {
  return (phone || "").replace(/[^0-9]/g, "");
}

function buildWpUsername(phone: string | null | undefined) {
  const digits = normalizePhoneDigits(phone);
  if (!digits) throw new Error("Profile has no phone number");
  return `u${digits}`;
}

function isWpUserCreationBlocked(status: number, bodyText: string) {
  return status === 401 ||
    /rest_cannot_create_user|not allowed to create new users/i.test(bodyText);
}

async function fetchWpJson(path: string, init: RequestInit) {
  const res = await fetch(`${WP_BASE}${path}`, init);
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

async function getAdminActor(): Promise<WpActor> {
  return {
    userId: 0,
    username: WP_ADMIN_USER,
    authHeader: adminAuthHeader(),
    mode: "admin_fallback",
  };
}

async function lookupExistingWpUser(username: string) {
  const { res, json, text } = await fetchWpJson(
    `/users?search=${encodeURIComponent(username)}&context=edit`,
    {
      headers: { Authorization: adminAuthHeader() },
    },
  );

  if (!res.ok || !Array.isArray(json)) {
    throw new Error(`WP user lookup failed [${res.status}]: ${text}`);
  }

  return json.find((u: any) =>
    u.slug === username || u.username === username
  ) || null;
}

async function createWpApplicationPassword(wpUserId: number) {
  const { res, json, text } = await fetchWpJson(
    `/users/${wpUserId}/application-passwords`,
    {
      method: "POST",
      headers: {
        Authorization: adminAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "WhatHouse App" }),
    },
  );

  if (!res.ok || !json?.password) {
    throw new Error(`WP app-password create failed [${res.status}]: ${text}`);
  }

  return json.password as string;
}

async function ensureWpActor(supabase: any, userId: string): Promise<WpActor> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "user_id, first_name, last_name, phone, wp_user_id, wp_user_password",
    )
    .eq("user_id", userId)
    .single<ProfileRow>();

  if (error || !profile) throw new Error("Profile not found");

  if (profile.wp_user_id && profile.wp_user_password) {
    const username = buildWpUsername(profile.phone);
    return {
      userId: profile.wp_user_id,
      username,
      authHeader: userAuthHeader(username, profile.wp_user_password),
      mode: "user",
    };
  }

  const username = buildWpUsername(profile.phone);
  const phoneDigits = normalizePhoneDigits(profile.phone);
  const email = `${phoneDigits}@zwandako.com`;
  const fullName =
    `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || username;
  const accountPassword = crypto.randomUUID() + crypto.randomUUID();

  const { res: createRes, text: createText, json: createJson } =
    await fetchWpJson(`/users`, {
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

  if (createRes.ok && createJson?.id) {
    wpUserId = createJson.id;
  } else if (createRes.status === 400 && /exists/i.test(createText)) {
    const existing = await lookupExistingWpUser(username);
    if (existing?.id) wpUserId = existing.id;
  } else if (isWpUserCreationBlocked(createRes.status, createText)) {
    console.warn(
      "WP user creation blocked, falling back to admin publisher account",
    );
    return await getAdminActor();
  }

  if (!wpUserId) {
    throw new Error(
      `WP user create failed [${createRes.status}]: ${createText}`,
    );
  }

  const appPassword = await createWpApplicationPassword(wpUserId);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ wp_user_id: wpUserId, wp_user_password: appPassword })
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(`Profile update failed: ${updateError.message}`);
  }

  return {
    userId: wpUserId,
    username,
    authHeader: userAuthHeader(username, appPassword),
    mode: "user",
  };
}

async function uploadMedia(authHeader: string, fileUrl: string) {
  const imgRes = await fetch(fileUrl);
  if (!imgRes.ok) throw new Error(`fetch image failed [${imgRes.status}]`);

  const blob = await imgRes.blob();
  const filename = fileUrl.split("/").pop()?.split("?")[0] ||
    `image-${Date.now()}.jpg`;

  const { res, json, text } = await fetchWpJson(`/media`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": blob.type || "image/jpeg",
    },
    body: blob,
  });

  if (!res.ok || !json?.id) {
    throw new Error(`WP media upload failed [${res.status}]: ${text}`);
  }

  return { id: json.id as number, source_url: json.source_url as string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!WP_ADMIN_USER || !WP_ADMIN_APP_PASSWORD) {
      throw new Error("WordPress credentials not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      throw new Error("Backend credentials not configured");
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth
      .getUser();
    const uid = userData?.user?.id;

    if (userError || !uid) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    const action = body?.action;
    const payload = body?.payload || {};

    if (!action) {
      return jsonResponse({ error: "action required" }, 400);
    }

    if (action === "ensure_user") {
      const wpActor = await ensureWpActor(supabase, uid);
      return jsonResponse({
        ok: true,
        wp_user_id: wpActor.userId,
        username: wpActor.username,
        mode: wpActor.mode,
      });
    }

    if (action === "publish_listing") {
      const { title, content, image_urls, listing_id } = payload;
      if (!title || !content) {
        return jsonResponse({ error: "title and content required" }, 400);
      }

      const wpActor = await ensureWpActor(supabase, uid);
      const mediaIds: number[] = [];
      let featured: number | null = null;

      if (Array.isArray(image_urls)) {
        for (const url of image_urls) {
          try {
            const media = await uploadMedia(wpActor.authHeader, url);
            mediaIds.push(media.id);
            if (featured === null) featured = media.id;
          } catch (e) {
            console.error("media upload error:", e);
          }
        }
      }

      const postBody: Record<string, unknown> = {
        title,
        content,
        status: "publish",
      };

      if (wpActor.userId > 0) {
        postBody.author = wpActor.userId;
      }

      if (featured) {
        postBody.featured_media = featured;
      }

      // The Houzez "property" CPT is restricted: subscribers/authors cannot
      // create it via REST. We publish using the admin credentials but pass
      // `author = wpActor.userId` so the listing is attributed to the real
      // WhatHouse user on the WordPress side.
      const adminAuth = adminAuthHeader();

      const { res: postRes, json: postJson, text: postText } =
        await fetchWpJson(`/properties`, {
          method: "POST",
          headers: {
            Authorization: adminAuth,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(postBody),
        });

      if (!postRes.ok || !postJson?.id) {
        throw new Error(
          `WP property create failed [${postRes.status}]: ${postText}`,
        );
      }

      // Attach all uploaded images to this property so the gallery is linked
      // to this specific listing (not orphaned in the media library).
      for (const mediaId of mediaIds) {
        try {
          await fetchWpJson(`/media/${mediaId}`, {
            method: "POST",
            headers: {
              Authorization: adminAuth,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              post: postJson.id,
              author: wpActor.userId > 0 ? wpActor.userId : undefined,
            }),
          });
        } catch (e) {
          console.error("media attach error:", e);
        }
      }

      // Save the gallery on the property using Houzez's expected meta keys.
      if (mediaIds.length > 0) {
        try {
          await fetchWpJson(`/properties/${postJson.id}`, {
            method: "POST",
            headers: {
              Authorization: adminAuth,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              meta: {
                fave_property_images: mediaIds,
                fave_attachments: mediaIds,
              },
            }),
          });
        } catch (e) {
          console.error("property gallery meta error:", e);
        }
      }

      if (listing_id) {
        const { error: updateError } = await supabase
          .from("listings")
          .update({
            wp_post_id: postJson.id,
            wp_media_ids: mediaIds,
            zwandako_url: postJson.link,
          })
          .eq("id", listing_id);

        if (updateError) {
          throw new Error(`Listing sync failed: ${updateError.message}`);
        }
      }

      return jsonResponse({
        ok: true,
        wp_post_id: postJson.id,
        link: postJson.link,
        media_ids: mediaIds,
        mode: wpActor.mode,
      });
    }

    if (action === "list_posts") {
      const page = payload?.page || 1;
      const perPage = payload?.per_page || 20;
      const { res, json, text } = await fetchWpJson(
        `/posts?_embed&per_page=${perPage}&page=${page}`,
        {
          headers: { Authorization: adminAuthHeader() },
        },
      );

      if (!res.ok) {
        throw new Error(`WP post list failed [${res.status}]: ${text}`);
      }

      return jsonResponse({ ok: true, posts: json || [] });
    }

    return jsonResponse({ error: "unknown action" }, 400);
  } catch (err) {
    console.error("wp-proxy error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ ok: false, error: msg }, 500);
  }
});
