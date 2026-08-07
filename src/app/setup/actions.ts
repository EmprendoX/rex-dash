"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteConfigSchema } from "@/lib/validators/siteConfig";
import { EMPTY_CONFIG } from "@/lib/sitios/emptyConfig";
import { slugify } from "@/lib/format";
import type { Json } from "@/lib/supabase/database.types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

interface OnboardingFormPayload {
  token: string;
  email: string;
  password: string;
  agencyName: string;
  brokerName: string;
  slogan: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  primaryColor: string;
  secondaryColor: string;
}

/**
 * Called from the public /setup form. Builds the full sitios.config by
 * merging form values on top of EMPTY_CONFIG (never replaces defaults),
 * validates with zod, and calls the token-gated `complete_onboarding` RPC
 * which atomically creates the auth user + user_roles + linkea cliente + upserta sitio.
 *
 * If the RPC fails for any reason (bad token, email in use, etc.), the token
 * is NOT invalidated — the client can fix the input and retry.
 */
export async function completeOnboarding(
  input: OnboardingFormPayload,
): Promise<{ ok: true } | { ok: false; error: string; issues?: string[] }> {
  const token = input.token.trim();
  if (!UUID_RE.test(token)) {
    return { ok: false, error: "Token inválido." };
  }

  const proposed = slugify(input.agencyName);
  if (!proposed || proposed.length < 3) {
    return {
      ok: false,
      error: "El nombre de agencia tiene que tener al menos 3 letras/números.",
    };
  }

  if (!HEX_RE.test(input.primaryColor) || !HEX_RE.test(input.secondaryColor)) {
    return { ok: false, error: "Los colores tienen que estar en formato #RRGGBB." };
  }

  const cleanEmail = input.email.trim().toLowerCase();
  const displaySite = input.agencyName.trim() || input.brokerName.trim();

  const config = {
    ...EMPTY_CONFIG,
    branding: {
      ...EMPTY_CONFIG.branding,
      siteName: displaySite,
      logoText: displaySite,
      siteUrl: `https://${proposed}.netlify.app`,
      brokerName: input.brokerName.trim(),
      slogan: input.slogan.trim(),
      city: input.city.trim(),
      address: input.address.trim(),
      phone: input.phone.trim(),
      whatsapp: input.whatsapp.trim().replace(/[^\d]/g, ""),
      email: cleanEmail,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
    },
  };

  // Validate the full merged config — catches missing/malformed fields before
  // they hit the DB, and keeps the guarantee that whatever lands in sitios.config
  // will not crash the template.
  const parsed = siteConfigSchema.safeParse(config);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Los datos no pasaron la validación. Revisá los campos marcados.",
      issues: parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .slice(0, 8),
    };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("complete_onboarding", {
    p_token: token,
    p_email: cleanEmail,
    p_password: input.password,
    p_subdominio_propuesto: proposed,
    p_config: parsed.data as unknown as Json,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
