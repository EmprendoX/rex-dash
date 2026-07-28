"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { siteConfigSchema } from "@/lib/validators/siteConfig";
import {
  triggerBuild,
  getLatestDeploy,
  rebuildBatch,
} from "@/lib/netlify/sites";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Default sitios.config used when a new sitio is first created.
 *
 * IMPORTANT: every field the template renders must be present with a
 * non-null placeholder value — otherwise the template's `renderTemplate()`
 * and `.replace()` calls crash during static generation with
 * `Cannot read properties of undefined`. Fields left as empty strings are
 * fine (empty.replace works), but fields left as `undefined` are not.
 */
const EMPTY_CONFIG = {
  branding: {
    siteName: "Nuevo sitio",
    siteUrl: "https://placeholder.example.com",
    logoText: "Nuevo sitio",
    primaryColor: "#008cb4",
    secondaryColor: "#004d65",
    businessType: "broker" as const,
    brokerName: "Nuevo broker",
    phone: "+52 55 0000 0000",
    whatsapp: "5215500000000",
    email: "placeholder@example.com",
    city: "Ciudad de México",
    address: "Dirección pendiente",
    slogan: "Slogan pendiente",
  },
  properties: [],
  about: {
    es: {
      brokerPhoto: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1600&q=80",
      role: "Broker Inmobiliario",
      homeIntro: {
        heading: "Bienvenidos a {{brokerName}}",
        paragraphs: ["Editá este texto desde el dashboard RealEX para personalizarlo."],
      },
      bio: {
        heading: "Sobre {{brokerName}}",
        paragraphs: ["Editá este texto desde el dashboard RealEX."],
      },
      howIWork: {
        heading: "Cómo trabajamos",
        intro: "Pilares que definen nuestra operación:",
        pillars: [
          { title: "Pilar 1", description: "Editá desde el dashboard." },
        ],
        outro: "Contactanos para más información.",
      },
      whyMe: {
        heading: "Por qué elegirnos",
        items: [{ title: "Razón 1", description: "Editá desde el dashboard." }],
      },
    },
    en: {
      brokerPhoto: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1600&q=80",
      role: "Real Estate Broker",
      homeIntro: {
        heading: "Welcome to {{brokerName}}",
        paragraphs: ["Edit this text from the RealEX dashboard."],
      },
      bio: {
        heading: "About {{brokerName}}",
        paragraphs: ["Edit this text from the RealEX dashboard."],
      },
      howIWork: {
        heading: "How we work",
        intro: "Principles that define our operation:",
        pillars: [{ title: "Pillar 1", description: "Edit from dashboard." }],
        outro: "Contact us for more information.",
      },
      whyMe: {
        heading: "Why choose us",
        items: [{ title: "Reason 1", description: "Edit from dashboard." }],
      },
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
 * Link an already-created Netlify site to this sitios row.
 *
 * Fase 1: la creación del sitio Netlify se hace manualmente vía UI
 * (Netlify no permite auto-linkeo confiable de repos vía API sin conocer
 * el installation_id del GitHub App). El operador crea el sitio en Netlify
 * con el flow "New site from Git", copia el Site ID desde Site settings, y
 * lo pega acá. A partir de ese momento el dashboard puede triggerear rebuild,
 * refrescar estatus y suspender vía API.
 */
export async function linkNetlifySite(
  sitioId: string,
  netlifySiteId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = netlifySiteId.trim();
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) {
    return { ok: false, error: "Netlify Site ID debe ser un UUID (36 chars con guiones)." };
  }

  const supabase = createSupabaseServerClient();
  const { data: sitio } = await supabase
    .from("sitios")
    .select("cliente_id")
    .eq("id", sitioId)
    .maybeSingle();
  if (!sitio) return { ok: false, error: "Sitio no encontrado." };

  const { error } = await supabase
    .from("sitios")
    .update({ netlify_site_id: id, estatus: "creado" })
    .eq("id", sitioId);
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ese Netlify Site ID ya está linkeado a otro sitio." };
    }
    return { ok: false, error: error.message };
  }

  // Cliente 'pagado' → 'generado' cuando se termina de provisionar.
  await supabase
    .from("clientes")
    .update({ estatus: "generado" })
    .eq("id", sitio.cliente_id)
    .eq("estatus", "pagado");

  revalidatePath("/app/sitios");
  revalidatePath(`/app/sitios/${sitioId}`);
  revalidatePath(`/app/clientes/${sitio.cliente_id}`);
  return { ok: true };
}

export async function unlinkNetlifySite(
  sitioId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("sitios")
    .update({ netlify_site_id: null, estatus: "creado", ultimo_deploy_at: null })
    .eq("id", sitioId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/sitios/${sitioId}`);
  return { ok: true };
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
