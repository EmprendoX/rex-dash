"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BatchResult =
  | { ok: true; updated: number }
  | { ok: false; error: string };

export async function marcarPorPagar(ids: string[]): Promise<BatchResult> {
  if (!ids.length) return { ok: false, error: "No hay comisiones seleccionadas." };

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("comisiones")
    .update({ estatus: "por_pagar" })
    .in("id", ids)
    .eq("estatus", "devengada") // guard: no regressing from 'pagada'
    .select("id");

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/comisiones");
  return { ok: true, updated: data?.length ?? 0 };
}

export async function marcarPagadas(
  ids: string[],
  referencia: string,
  fecha_pago: string,
): Promise<BatchResult> {
  if (!ids.length) return { ok: false, error: "No hay comisiones seleccionadas." };
  if (!referencia.trim()) return { ok: false, error: "Referencia de pago requerida." };

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("comisiones")
    .update({
      estatus: "pagada",
      referencia_pago: referencia.trim(),
      fecha_pago: fecha_pago || new Date().toISOString().slice(0, 10),
    })
    .in("id", ids)
    .neq("estatus", "pagada") // idempotent: skip already-paid
    .select("id");

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/comisiones");
  return { ok: true, updated: data?.length ?? 0 };
}
