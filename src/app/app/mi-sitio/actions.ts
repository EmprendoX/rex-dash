"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteConfigSchema } from "@/lib/validators/siteConfig";
import { triggerBuild } from "@/lib/netlify/sites";
import { getCurrentUser } from "@/lib/auth/role";
import type { Json } from "@/lib/supabase/database.types";

async function requireBrokerSitio(): Promise<
  { ok: true; sitioId: string; netlifySiteId: string | null } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "No hay sesión." };
  if (user.role !== "broker") return { ok: false, error: "Solo brokers pueden usar esta ruta." };
  if (!user.cliente_id) return { ok: false, error: "Tu usuario no está vinculado a ningún cliente." };

  const supabase = createSupabaseServerClient();
  const { data: sitio } = await supabase
    .from("sitios")
    .select("id, netlify_site_id")
    .eq("cliente_id", user.cliente_id)
    .maybeSingle();
  if (!sitio) return { ok: false, error: "Tu cliente aún no tiene un sitio creado." };

  return { ok: true, sitioId: sitio.id, netlifySiteId: sitio.netlify_site_id };
}

export async function saveMiSitioConfig(
  configJson: string,
): Promise<{ ok: true } | { ok: false; error: string; issues?: string[] }> {
  const gate = await requireBrokerSitio();
  if (!gate.ok) return gate;

  let parsed: unknown;
  try {
    parsed = JSON.parse(configJson);
  } catch (err) {
    return { ok: false, error: `JSON inválido: ${err instanceof Error ? err.message : String(err)}` };
  }
  const result = siteConfigSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: "Config no cumple el schema.",
      issues: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).slice(0, 10),
    };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("sitios")
    .update({ config: result.data as Json })
    .eq("id", gate.sitioId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/mi-sitio");
  return { ok: true };
}

export async function publicarMiSitio(): Promise<
  { ok: true; note: string } | { ok: false; error: string }
> {
  const gate = await requireBrokerSitio();
  if (!gate.ok) return gate;

  if (!gate.netlifySiteId) {
    return {
      ok: false,
      error:
        "Tu sitio todavía no está desplegado. Contactá al equipo de RealEX para completar el despliegue inicial.",
    };
  }

  try {
    await triggerBuild(gate.netlifySiteId);
    return {
      ok: true,
      note: "Cambios enviados a Netlify. Suelen estar visibles en 2-3 minutos.",
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
