import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const WP_BASE = "https://zwandako.com/wp-json/wp/v2";
const WP_ADMIN_USER = (Deno.env.get("WP_ADMIN_USER") || "").trim();
const WP_ADMIN_APP_PASSWORD = (Deno.env.get("WP_ADMIN_APP_PASSWORD") || "")
  .replace(/\s+/g, "");
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
  email?: string | null;
  wp_user_id: number | null;
  wp_user_password: string | null;
};

type WpActor = {
  userId: number;
  username: string;
  authHeader: string;
  mode: "user" | "admin_fallback";
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function profileName(profile: ProfileRow) {
  return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
    buildWpUsername(profile.phone);
}

function withPublisherInfo(content: string, profile: ProfileRow) {
  const name = escapeHtml(profileName(profile));
  const phone = escapeHtml(profile.phone || "Non renseigné");
  return `${content.trim()}\n\n<p><strong>Publié par :</strong> ${name}</p>\n<p><strong>Contact :</strong> ${phone}</p>`;
}

function wpPublicLink(postJson: any) {
  return postJson?.link || (postJson?.id ? `https://zwandako.com/?p=${postJson.id}` : null);
}

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
  return "Basic " + btoa(`${username.trim()}:${appPassword.replace(/\s+/g, "")}`);
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

function wpErrorCode(bodyText: string) {
  try {
    return JSON.parse(bodyText)?.code || "";
  } catch {
    return "";
  }
}

function isWpPermissionError(status: number, bodyText: string) {
  const code = wpErrorCode(bodyText);
  return status === 401 || status === 403 ||
    /rest_cannot_create|rest_cannot_create_user|rest_not_logged_in|not allowed/i.test(code) ||
    /rest_cannot_create|rest_cannot_create_user|rest_not_logged_in|not allowed/i.test(bodyText);
}

async function createPropertyWithFallback(
  postBody: Record<string, unknown>,
  wpActor: WpActor,
) {
  // All listings arrive as "pending" so an admin can review/edit before publishing.
  const attempts = [
    { path: "/properties", authHeader: adminAuthHeader(), status: "pending" },
    { path: "/properties", authHeader: wpActor.authHeader, status: "pending" },
  ];

  let last: { res: Response; json: any; text: string } | null = null;

  for (const attempt of attempts) {
    const result = await fetchWpJson(attempt.path, {
      method: "POST",
      headers: {
        Authorization: attempt.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...postBody, status: attempt.status }),
    });
    last = result;
    if (result.res.ok && result.json?.id) {
      return { ...result, authHeader: attempt.authHeader, path: attempt.path };
    }
    if (!isWpPermissionError(result.res.status, result.text)) break;
    console.warn(`WP create attempt failed ${attempt.path} [${result.res.status}]: ${result.text}`);
  }

  if (!last) throw new Error("WP property create was not attempted");
  return { ...last, authHeader: adminAuthHeader(), path: "" };
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

async function getAdminCapabilities() {
  const { res, json, text } = await fetchWpJson(`/users/me?context=edit`, {
    headers: { Authorization: adminAuthHeader() },
  });

  return {
    ok: res.ok,
    status: res.status,
    code: wpErrorCode(text),
    username: json?.username || WP_ADMIN_USER,
    roles: json?.roles || [],
    canCreatePosts: Boolean(json?.capabilities?.publish_posts),
    canCreateProperties: Boolean(json?.capabilities?.publish_properties),
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

async function lookupExistingWpUserByEmail(email: string) {
  if (!email) return null;
  const { res, json, text } = await fetchWpJson(
    `/users?search=${encodeURIComponent(email)}&context=edit&per_page=20`,
    { headers: { Authorization: adminAuthHeader() } },
  );
  if (!res.ok || !Array.isArray(json)) {
    throw new Error(`WP user email lookup failed [${res.status}]: ${text}`);
  }
  return json.find((u: any) => (u?.email || "").toLowerCase() === email.toLowerCase()) || null;
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

async function promoteWpUserToEditor(wpUserId: number) {
  try {
    const { res, text } = await fetchWpJson(`/users/${wpUserId}`, {
      method: "POST",
      headers: {
        Authorization: adminAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roles: ["editor"] }),
    });
    if (!res.ok) {
      console.warn(`promote user ${wpUserId} failed [${res.status}]: ${text}`);
    }
  } catch (e) {
    console.warn(`promote user ${wpUserId} threw:`, e);
  }
}

async function ensureWpActor(supabase: any, userId: string): Promise<WpActor> {
  // Pull profile + auth email so we can mirror the *real* email/password on WP.
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id, first_name, last_name, phone, email, wp_user_id, wp_user_password",
    )
    .eq("user_id", userId)
    .single();

  const profile = data as ProfileRow | null;
  if (error || !profile) throw new Error("Profile not found");

  // Resolve the user's real auth email (may be the synthetic phone_xxx@whathouse.app).
  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const authEmail = ((authUser?.user?.email || profile.email || "") as string).trim().toLowerCase();
  const isSynthetic = !authEmail || authEmail.startsWith("phone_") ||
    authEmail.endsWith("@whathouse.app");

  if (profile.wp_user_id && profile.wp_user_password) {
    const existingById = await fetchWpJson(`/users/${profile.wp_user_id}?context=edit`, {
      headers: { Authorization: adminAuthHeader() },
    }).catch(() => null);
    const username = existingById?.json?.username || existingById?.json?.slug || buildWpUsername(profile.phone);
    await promoteWpUserToEditor(profile.wp_user_id);
    // Best-effort: keep the WP user's email + phone meta in sync.
    await syncWpUserMeta(profile.wp_user_id, profile, authEmail, isSynthetic);
    return {
      userId: profile.wp_user_id,
      username,
      authHeader: userAuthHeader(username, profile.wp_user_password),
      mode: "user",
    };
  }

  const username = buildWpUsername(profile.phone);
  const phoneDigits = normalizePhoneDigits(profile.phone);
  // Prefer the user's real email over the synthetic phone-based one so they
  // can log into zwandako.com directly with the same credentials.
  const wpEmail = !isSynthetic ? authEmail : `${phoneDigits}@zwandako.com`;
  const fullName =
    `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || username;
  const accountPassword = crypto.randomUUID() + crypto.randomUUID();

  const existingByEmail = !isSynthetic ? await lookupExistingWpUserByEmail(wpEmail).catch(() => null) : null;
  let createRes: Response;
  let createText = "";
  let createJson: any = null;

  if (existingByEmail?.id) {
    createRes = new Response("{}", { status: 400 });
    createText = "exists_by_email";
    createJson = null;
  } else {
    const created =
    await fetchWpJson(`/users`, {
      method: "POST",
      headers: {
        Authorization: adminAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        email: wpEmail,
        password: accountPassword,
        name: fullName,
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        roles: ["author"],
        meta: {
          phone: profile.phone || "",
          fave_author_phone: profile.phone || "",
          fave_author_whatsapp: profile.phone || "",
        },
      }),
    });
    createRes = created.res;
    createText = created.text;
    createJson = created.json;
  }

  let wpUserId: number | null = null;
  let actorUsername = username;

  if (existingByEmail?.id) {
    wpUserId = existingByEmail.id;
    actorUsername = existingByEmail.username || existingByEmail.slug || existingByEmail.email || username;
  } else if (createRes.ok && createJson?.id) {
    wpUserId = createJson.id;
    actorUsername = createJson.username || createJson.slug || username;
  } else if (createRes.status === 400 && /exists/i.test(createText)) {
    const existing = await lookupExistingWpUser(username);
    if (existing?.id) {
      wpUserId = existing.id;
      actorUsername = existing.username || existing.slug || username;
    }
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

  // Make sure phone meta + email are saved (fave_author_phone / whatsapp).
  await syncWpUserMeta(wpUserId, profile, authEmail, isSynthetic);

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
    username: actorUsername,
    authHeader: userAuthHeader(actorUsername, appPassword),
    mode: "user",
  };
}

async function syncWpUserMeta(
  wpUserId: number,
  profile: ProfileRow,
  authEmail: string,
  isSynthetic: boolean,
) {
  try {
    const body: Record<string, unknown> = {
      meta: {
        phone: profile.phone || "",
        fave_author_phone: profile.phone || "",
        fave_author_whatsapp: profile.phone || "",
      },
    };
    if (!isSynthetic && authEmail) body.email = authEmail;
    const { res, text } = await fetchWpJson(`/users/${wpUserId}`, {
      method: "POST",
      headers: {
        Authorization: adminAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.warn(`WP user meta sync non-fatal [${res.status}]: ${text}`);
  } catch (e) {
    console.warn("WP user meta sync threw:", e);
  }
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

    const body = await req.json().catch(() => null);
    const action = body?.action;
    const payload = body?.payload || {};

    if (!action) {
      return jsonResponse({ error: "action required" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Public actions: no Supabase auth required (used during login flow).
    const PUBLIC_ACTIONS = new Set(["wp_login_check"]);

    let uid = "";
    if (!PUBLIC_ACTIONS.has(action)) {
      const authHeader = req.headers.get("Authorization") || "";
      if (!authHeader.startsWith("Bearer ")) {
        return jsonResponse({ error: "unauthorized" }, 401);
      }
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userError } = await userClient.auth.getUser();
      uid = userData?.user?.id || "";
      if (userError || !uid) {
        return jsonResponse({ error: "unauthorized" }, 401);
      }
    }

    if (action === "ensure_user") {
      const wpActor = await ensureWpActor(supabase, uid);
      // Optional: set the user's real WP password so they can log into zwandako.com
      // with the same email + password they use on WhatHouse.
      const realPassword = (payload?.password || "").trim();
      if (realPassword.length >= 6 && wpActor.userId) {
        try {
          const { res, text } = await fetchWpJson(`/users/${wpActor.userId}`, {
            method: "POST",
            headers: {
              Authorization: adminAuthHeader(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ password: realPassword }),
          });
          if (!res.ok) console.warn(`WP user password set non-fatal [${res.status}]: ${text}`);
        } catch (e) {
          console.warn("WP user password set threw:", e);
        }
      }
      return jsonResponse({
        ok: true,
        wp_user_id: wpActor.userId,
        username: wpActor.username,
        mode: wpActor.mode,
      });
    }

    if (action === "wp_login_check") {
      // Validates email + password against WordPress. The WP REST API Basic
      // Auth only accepts Application Passwords, NOT regular login passwords,
      // so we validate the real password by POSTing to wp-login.php (the
      // standard WP login form) and detecting a successful redirect. We then
      // use the admin credentials to look up the user details.
      const email = (payload?.email || "").trim().toLowerCase();
      const password = (payload?.password || "").trim();
      if (!email || !password) {
        return jsonResponse({ ok: false, error: "email and password required" }, 400);
      }

      // 1. Look up the user by email via admin creds to get the username
      //    (wp-login.php needs the username/login, not necessarily the email).
      const lookupUrl = `https://zwandako.com/wp-json/wp/v2/users?search=${encodeURIComponent(email)}&context=edit&per_page=20`;
      const lookupRes = await fetch(lookupUrl, { headers: { Authorization: adminAuthHeader() } });
      const lookupText = await lookupRes.text();
      let lookupJson: any = null;
      try { lookupJson = JSON.parse(lookupText); } catch { /* ignore */ }
      if (!lookupRes.ok || !Array.isArray(lookupJson)) {
        return jsonResponse({ ok: false, error: "user lookup failed", details: lookupText }, 401);
      }
      const wpUser = lookupJson.find((u: any) =>
        (u?.email || "").toLowerCase() === email
      ) || lookupJson[0];
      if (!wpUser?.id) {
        return jsonResponse({ ok: false, error: "no account with this email" }, 401);
      }
      const wpUsername: string = wpUser.username || wpUser.slug || email;

      // 2. Validate the password by POSTing to wp-login.php. WP returns a
      //    302 redirect to wp-admin on success, or a 200 with the login form
      //    (and a "login_error" cookie/body) on failure.
      const formBody = new URLSearchParams({
        log: wpUsername,
        pwd: password,
        "wp-submit": "Log In",
        redirect_to: "https://zwandako.com/wp-admin/",
        testcookie: "1",
      });
      const loginRes = await fetch("https://zwandako.com/wp-login.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          // Send the testcookie WP expects to be set by the form page.
          Cookie: "wordpress_test_cookie=WP%20Cookie%20check",
        },
        body: formBody.toString(),
        redirect: "manual",
      });
      // Drain body to free the connection
      await loginRes.text().catch(() => "");

      const setCookie = loginRes.headers.get("set-cookie") || "";
      const isAuthCookie = /wordpress_logged_in_/i.test(setCookie);
      const isRedirect = loginRes.status >= 300 && loginRes.status < 400;
      if (!isRedirect || !isAuthCookie) {
        return jsonResponse({
          ok: false,
          error: "invalid credentials",
          details: `wp-login.php status=${loginRes.status}`,
        }, 401);
      }

      return jsonResponse({
        ok: true,
        wp_user: {
          id: wpUser.id,
          email: wpUser.email,
          username: wpUsername,
          first_name: wpUser.first_name || "",
          last_name: wpUser.last_name || "",
          phone: wpUser.meta?.phone || wpUser.meta?.fave_author_phone || "",
        },
      });
    }

    if (action === "publish_listing") {
      const { title, content, image_urls, listing_id } = payload;
      if (!title || !content) {
        return jsonResponse({ error: "title and content required" }, 400);
      }
      if (!Array.isArray(image_urls) || image_urls.length === 0) {
        return jsonResponse({ error: "at least one image is required" }, 400);
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, phone, wp_user_id, wp_user_password")
        .eq("user_id", uid)
        .single();
      if (profileError || !profileData) throw new Error("Profile not found");
      const profile = profileData as ProfileRow;
      const wpActor = await ensureWpActor(supabase, uid);
      const mediaIds: number[] = [];
      let featured: number | null = null;

      for (const url of image_urls) {
        try {
          const media = await uploadMedia(wpActor.authHeader, url);
          mediaIds.push(media.id);
          if (featured === null) featured = media.id;
        } catch (userUploadError) {
          console.warn("media upload with user failed, retrying admin:", userUploadError);
          try {
            const media = await uploadMedia(adminAuthHeader(), url);
            mediaIds.push(media.id);
            if (featured === null) featured = media.id;
          } catch (adminUploadError) {
            console.error("media upload error:", adminUploadError);
          }
        }
      }

      if (!featured) {
        throw new Error("WordPress media upload failed: at least one image is required");
      }

      // Build the property payload. We deliberately omit `author` here:
      // the admin REST user may not have the `edit_others_properties` cap
      // required to assign a property to a different user at creation time.
      // We re-assign the author in a follow-up request below (best effort).
      const postBody: Record<string, unknown> = {
        title,
        content: withPublisherInfo(String(content), profile),
        status: "pending",
      };

      // Assign author so the listing appears under the user's name in
      // "À la une" / featured sections on Zwandako, not under "admin".
      if (wpActor.userId) {
        postBody.author = wpActor.userId;
      }

      if (featured) {
        postBody.featured_media = featured;
      }

      const createResult = await createPropertyWithFallback(postBody, wpActor);
      const postAuth = createResult.authHeader;
      const postRes = createResult.res;
      const postJson = createResult.json;
      const postText = createResult.text;

      // Best-effort: re-assign author if the create call dropped it.
      if (postRes.ok && postJson?.id && wpActor.userId && postJson.author !== wpActor.userId) {
        try {
          await fetchWpJson(`/properties/${postJson.id}`, {
            method: "POST",
            headers: {
              Authorization: adminAuthHeader(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ author: wpActor.userId }),
          });
        } catch (e) {
          console.warn("author reassign failed:", e);
        }
      }

      if (!postRes.ok && isWpPermissionError(postRes.status, postText)) {
        const admin = await getAdminCapabilities();
        console.error("WP permission error:", { status: postRes.status, body: postText, admin });

        if (listing_id) {
          await supabase
            .from("listings")
            .update({ zwandako_url: null })
            .eq("id", listing_id);
        }

        return jsonResponse({
          ok: true,
          wp_post_id: null,
          link: null,
          media_ids: mediaIds,
          mode: wpActor.mode,
          wp_sync_failed: true,
          error: "WordPress credentials or property permissions are invalid",
          details: admin,
        });
      }

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
              Authorization: postAuth,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ post: postJson.id }),
          });
        } catch (e) {
          console.error("media attach error:", e);
        }
      }

      // Save the gallery on the property using Houzez's expected meta keys.
      // IMPORTANT: Houzez stores fave_property_images as an ARRAY OF STRINGS
      // (attachment IDs as strings), not integers. Sending integers makes the
      // gallery invisible on the front-end — only the featured image shows up.
      if (mediaIds.length > 0) {
        const mediaIdStrings = mediaIds.map((id) => String(id));
        try {
          const { res: upRes, text: upText } = await fetchWpJson(
            `/properties/${postJson.id}`,
            {
              method: "POST",
              headers: {
                Authorization: postAuth,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                meta: {
                  fave_property_images: mediaIdStrings,
                  fave_attachments: mediaIdStrings,
                },
              }),
            },
          );
          if (!upRes.ok) {
            console.warn(
              `property gallery update non-fatal [${upRes.status}]: ${upText}`,
            );
            // Fallback: try the admin auth header in case the user lacks the
            // edit_property_meta cap.
            await fetchWpJson(`/properties/${postJson.id}`, {
              method: "POST",
              headers: {
                Authorization: adminAuthHeader(),
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                meta: {
                  fave_property_images: mediaIdStrings,
                  fave_attachments: mediaIdStrings,
                },
              }),
            });
          }
        } catch (e) {
          console.error("property update error:", e);
        }
      }

      if (listing_id) {
        const { error: updateError } = await supabase
          .from("listings")
          .update({
            wp_post_id: postJson.id,
            wp_media_ids: mediaIds,
            zwandako_url: wpPublicLink(postJson),
          })
          .eq("id", listing_id);

        if (updateError) {
          throw new Error(`Listing sync failed: ${updateError.message}`);
        }
      }

      return jsonResponse({
        ok: true,
        wp_post_id: postJson.id,
        link: wpPublicLink(postJson),
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

    if (action === "debug_admin") {
      const capabilities = await getAdminCapabilities();
      return jsonResponse({ ...capabilities, request_ok: true });
    }

    return jsonResponse({ error: "unknown action" }, 400);
  } catch (err) {
    console.error("wp-proxy error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ ok: false, error: msg }, 500);
  }
});
