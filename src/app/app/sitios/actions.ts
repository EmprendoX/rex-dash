"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { siteConfigSchema } from "@/lib/validators/siteConfig";
import {
  createNetlifySite,
  triggerBuild,
  getLatestDeploy,
  rebuildBatch,
} from "@/lib/netlify/sites";
import type { Json } from "@/lib/supabase/database.types";

/** Default sitios.config used when a new sitio is first created for a cliente. */
const EMPTY_CONFIG = {
  branding: {
    siteName: "",
    siteUrl: "",
    logoText: "",
    primaryColor: "#008cb4",
    secondaryColor: "#004d65",
    brokerName: "",
    phone: "",
    whatsapp: "",
    email: "",
    city: "",
    address: "",
    slogan: "",
  },
  properties: [],
  about: {
    es: {
      brokerPhoto: "",
      role: "",
      homeIntro: { heading: "", paragraphs: [] },
      bio: { heading: "", paragraphs: [] },
      howIWork: { heading: "", pillars: [] },
      whyMe: { heading: "", items: [] },
    },
  },
};

export async function createSitioForCliente(
  clienteId: string,
): Promise<{ ok: true; sitio_id: string } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();

  const { data: cliente, error: e0 } = await supabase
    .from("clientes")
    .select("id, nombre, inmobiliaria")
    .eq("id", clienteId)
    .maybeSingle();
  if (e0 || !cliente) return { ok: false, error: "Cliente no encontrado." };

  const { data: existing } = await supabase
    .from("sitios")
    .select("id")
    .eq("cliente_id", clienteId)
    .maybeSingle();
  if (existing) return { ok: true, sitio_id: existing.id };

  const subdominio = slugify(cliente.inmobiliaria || cliente.nombre) || `cliente-${clienteId.slice(0, 8)}`;

  const seed = {
    ...EMPTY_CONFIG,
    branding: {
      ...EMPTY_CONFIG.branding,
      siteName: cliente.inmobiliaria || cliente.nombre,
      logoText: cliente.inmobiliaria || cliente.nombre,
      brokerName: cliente.nombre,
    },
  };

  const { data, error } = await supabase
    .from("sitios")
    .insert({
      cliente_id: clienteId,
      subdominio,
      config: seed as Json,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/app/clientes/${clienteId}`);
  revalidatePath("/app/sitios");
  return { ok: true, sitio_id: data.id };
}

export async function saveSitioConfig(
  sitioId: string,
  configJson: string,
): Promise<{ ok: true } | { ok: false; error: string; issues?: string[] }> {
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
    .eq("id", sitioId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/app/sitios/${sitioId}`);
  return { ok: true };
}

export async function saveSitioMeta(
  sitioId: string,
  meta: { subdominio?: string; dominio_custom?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();
  const payload: Record<string, unknown> = {};
  if (meta.subdominio !== undefined) payload.subdominio = slugify(meta.subdominio);
  if (meta.dominio_custom !== undefined)
    payload.dominio_custom = meta.dominio_custom || null;

  const { error } = await supabase.from("sitios").update(payload).eq("id", sitioId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/app/sitios/${sitioId}`);
  return { ok: true };
}

/**
 * Actually create the site in Netlify. Requires the sitios row to already
 * have subdominio set. Idempotent-ish: refuses if netlify_site_id already exists.
 */
export async function provisionOnNetlify(
  sitioId: string,
): Promise<{ ok: true; netlify_site_id: string; url: string } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();
  const { data: sitio, error } = await supabase
    .from("sitios")
    .select("id, subdominio, netlify_site_id, cliente_id")
    .eq("id", sitioId)
    .maybeSingle();
  if (error || !sitio) return { ok: false, error: "Sitio no encontrado." };
  if (sitio.netlify_site_id) {
    return { ok: false, error: "Ya existe un site_id de Netlify para este sitio." };
  }
  if (!sitio.subdominio) {
    return { ok: false, error: "Falta subdominio antes de crear el sitio Netlify." };
  }

  try {
    const created = await createNetlifySite({
      name: sitio.subdominio,
      clientId: sitio.id,
    });
    await supabase
      .from("sitios")
      .update({ netlify_site_id: created.id, estatus: "creado" })
      .eq("id", sitio.id);

    // Advance cliente to 'generado' once we've provisioned.
    await supabase
      .from("clientes")
      .update({ estatus: "generado" })
      .eq("id", sitio.cliente_id)
      .eq("estatus", "pagado");

    revalidatePath("/app/sitios");
    revalidatePath(`/app/sitios/${sitio.id}`);
    revalidatePath(`/app/clientes/${sitio.cliente_id}`);
    return { ok: true, netlify_site_id: created.id, url: created.ssl_url };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function triggerSiteBuild(
  sitioId: string,
): Promise<{ ok: true; deployId?: string } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();
  const { data: sitio } = await supabase
    .from("sitios")
    .select("netlify_site_id")
    .eq("id", sitioId)
    .maybeSingle();
  if (!sitio?.netlify_site_id) return { ok: false, error: "El sitio no tiene netlify_site_id." };

  try {
    const r = await triggerBuild(sitio.netlify_site_id);
    revalidatePath(`/app/sitios/${sitioId}`);
    return { ok: true, deployId: r.deploy_id ?? r.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function refreshDeployStatus(
  sitioId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();
  const { data: sitio } = await supabase
    .from("sitios")
    .select("id, netlify_site_id, cliente_id")
    .eq("id", sitioId)
    .maybeSingle();
  if (!sitio?.netlify_site_id) return { ok: false, error: "El sitio no tiene netlify_site_id." };

  try {
    const dep = await getLatestDeploy(sitio.netlify_site_id);
    if (!dep) {
      revalidatePath(`/app/sitios/${sitioId}`);
      return { ok: true };
    }
    const mapped =
      dep.state === "ready"
        ? "live"
        : dep.state === "error"
          ? "build_error"
          : dep.state === "uploaded" || dep.state === "processed"
            ? "build_ok"
            : "creado";
    await supabase
      .from("sitios")
      .update({ estatus: mapped, ultimo_deploy_at: dep.updated_at })
      .eq("id", sitio.id);
    revalidatePath(`/app/sitios/${sitioId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function suspendSitio(
  sitioId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("sitios")
    .update({ estatus: "suspendido" })
    .eq("id", sitioId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/sitios/${sitioId}`);
  revalidatePath("/app/sitios");
  return { ok: true };
}

export async function rebuildAllLive(): Promise<
  | { ok: true; results: Array<{ nombre: string; ok: boolean; error?: string }> }
  | { ok: false; error: string }
> {
  const supabase = createSupabaseServerClient();
  const { data: sitios, error } = await supabase
    .from("sitios")
    .select("id, netlify_site_id, clientes(nombre)")
    .not("netlify_site_id", "is", null)
    .neq("estatus", "suspendido");
  if (error) return { ok: false, error: error.message };
  if (!sitios || sitios.length === 0) {
    return { ok: true, results: [] };
  }

  const ids = sitios.map((s) => s.netlify_site_id).filter((x): x is string => !!x);
  const batch = await rebuildBatch(ids);

  const results = batch.map((r, i) => {
    const cli = Array.isArray(sitios[i].clientes) ? sitios[i].clientes[0] : sitios[i].clientes;
    const nombre = cli?.nombre ?? sitios[i].netlify_site_id ?? "—";
    return r.ok ? { nombre, ok: true } : { nombre, ok: false, error: r.error };
  });

  revalidatePath("/app/sitios");
  return { ok: true, results };
}
