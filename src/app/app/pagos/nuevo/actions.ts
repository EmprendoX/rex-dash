"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

export type CreatePagoResult =
  | { ok: true; id: string; cliente_id: string }
  | { ok: false; error: string };

const CONCEPTOS: Enums<"pago_concepto">[] = ["frontend", "mensual", "upsell"];

export async function createPago(formData: FormData): Promise<CreatePagoResult> {
  const cliente_id = String(formData.get("cliente_id") ?? "").trim();
  const conceptoRaw = String(formData.get("concepto") ?? "");
  const montoStr = String(formData.get("monto_mxn") ?? "").trim();
  const metodo = String(formData.get("metodo") ?? "").trim() || null;
  const fecha = String(formData.get("fecha") ?? "").trim();
  const referencia = String(formData.get("referencia") ?? "").trim() || null;

  if (!cliente_id) return { ok: false, error: "Elegí un cliente." };

  const concepto = (CONCEPTOS.includes(conceptoRaw as Enums<"pago_concepto">)
    ? conceptoRaw
    : null) as Enums<"pago_concepto"> | null;
  if (!concepto) return { ok: false, error: "Concepto inválido." };

  const monto_mxn = Number(montoStr);
  if (!Number.isFinite(monto_mxn) || monto_mxn <= 0) {
    return { ok: false, error: "Monto debe ser > 0." };
  }

  const supabase = createSupabaseServerClient();

  // For 'mensual' payments: link the cliente's active subscription if there is one.
  let suscripcion_id: string | null = null;
  if (concepto === "mensual") {
    const { data: sub } = await supabase
      .from("suscripciones")
      .select("id")
      .eq("cliente_id", cliente_id)
      .eq("estatus", "activa")
      .maybeSingle();
    suscripcion_id = sub?.id ?? null;
  }

  const { data, error } = await supabase
    .from("pagos")
    .insert({
      cliente_id,
      concepto,
      monto_mxn,
      metodo,
      fecha: fecha || undefined,
      referencia,
      suscripcion_id,
    })
    .select("id, cliente_id")
    .single();

  if (error) return { ok: false, error: error.message };

  // Frontend payment implies the cliente advanced to 'pagado' (PRD §6).
  // Only move forward, never regress.
  if (concepto === "frontend") {
    const { data: cli } = await supabase
      .from("clientes")
      .select("estatus")
      .eq("id", cliente_id)
      .maybeSingle();
    if (cli?.estatus === "prospecto") {
      await supabase
        .from("clientes")
        .update({ estatus: "pagado" })
        .eq("id", cliente_id);
    }
  }

  revalidatePath("/app/pagos");
  revalidatePath(`/app/clientes/${cliente_id}`);
  return { ok: true, id: data.id, cliente_id: data.cliente_id };
}
