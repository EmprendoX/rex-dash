// Edge function: site-config
// Called by the RealEstateX template at build time to fetch its config from
// Supabase, keyed by CLIENT_ID (== sitios.id UUID).
//
// GET /functions/v1/site-config?client_id=<uuid>
//   200 → { config: {...} }         config JSONB from sitios.config
//   400 → { error: "..." }          missing/invalid client_id
//   404 → { error: "..." }          no matching sitio
//
// verify_jwt = false: template has no user session at build time.
// Auth model: client_id UUID serves as capability token. The config it returns
// is the same content the deployed site renders publicly, so no privilege
// escalation is possible.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "GET") {
    return json({ error: "method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const clientId = url.searchParams.get("client_id");

  if (!clientId) {
    return json({ error: "missing client_id" }, 400);
  }
  if (!UUID_RE.test(clientId)) {
    return json({ error: "client_id must be a UUID" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase
    .from("sitios")
    .select("config, estatus")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    return json({ error: error.message }, 500);
  }
  if (!data) {
    return json({ error: "sitio not found" }, 404);
  }
  if (data.estatus === "suspendido") {
    return json({ error: "sitio suspended" }, 410);
  }

  return json(
    { config: data.config },
    200,
    {
      // 5 min shared cache, revalidate for 1 h. Rebuilds are triggered
      // explicitly from the dashboard, so a short TTL is fine.
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  );
});
