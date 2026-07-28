"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";

export type CreateAfiliadoResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createAfiliado(formData: FormData): Promise<CreateAfiliadoResult> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const whatsapp = String(formData.get("whatsapp") ?? "").trim() || null;
  const codigoRaw = String(formData.get("codigo") ?? "").trim();
  const banco = String(formData.get("banco") ?? "").trim();
  const clabe = String(formData.get("clabe") ?? "").trim();
  const titular = String(formData.get("titular") ?? "").trim();

  if (!nombre) return { ok: false, error: "Nombre es requerido." };

  const codigo = slugify(codigoRaw || nombre);
  if (!codigo) return { ok: false, error: "El código no puede quedar vacío." };

  const datos_pago =
    banco || clabe || titular ? { banco, clabe, titular } : null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("afiliados")
    .insert({ nombre, email, whatsapp, codigo, datos_pago })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `El código "${codigo}" ya existe. Elegí otro.` };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/app/afiliados");
  return { ok: true, id: data.id };
}
