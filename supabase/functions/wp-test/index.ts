const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const u = Deno.env.get("WP_ADMIN_USER") || "";
  const p = Deno.env.get("WP_ADMIN_APP_PASSWORD") || "";
  const auth = "Basic " + btoa(`${u}:${p}`);
  const res = await fetch("https://zwandako.com/wp-json/wp/v2/users/me?context=edit", {
    headers: { Authorization: auth },
  });
  const text = await res.text();
  return new Response(JSON.stringify({
    user: u,
    pass_len: p.length,
    pass_preview: p ? p.substring(0, 4) + "..." + p.substring(p.length - 4) : "",
    status: res.status,
    body: text.substring(0, 800),
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
