"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

export type CreateClienteResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const ORIGEN_VALUES: Enums<"cliente_origen">[] = ["meta_ads", "afiliado", "directo", "referido"];

export async function createCliente(formData: FormData): Promise<CreateClienteResult> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const inmobiliaria = String(formData.get("inmobiliaria") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const whatsapp = String(formData.get("whatsapp") ?? "").trim() || null;
  const origenRaw = String(formData.get("origen") ?? "directo");
  const afiliado_id = String(formData.get("afiliado_id") ?? "").trim() || null;
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!nombre) return { ok: false, error: "Nombre es requerido." };

  const origen = (ORIGEN_VALUES.includes(origenRaw as Enums<"cliente_origen">)
    ? origenRaw
    : "directo") as Enums<"cliente_origen">;

  // Consistencia: si el origen es "afiliado", exigir afiliado_id.
  if (origen === "afiliado" && !afiliado_id) {
    return { ok: false, error: "Si el origen es 'afiliado', elegí un afiliado." };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clientes")
    .insert({ nombre, inmobiliaria, email, whatsapp, origen, afiliado_id, notas })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/clientes");
  return { ok: true, id: data.id };
}
