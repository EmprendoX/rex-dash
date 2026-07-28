import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// CSV export of comisiones for a given date range + optional estatus filter.
// Auth: middleware gates /app; API routes are separate — check session here.

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const estatus = url.searchParams.get("estatus");

  let q = supabase
    .from("comisiones")
    .select(
      "fecha_devengo, fecha_pago, tipo, estatus, base_mxn, porcentaje, monto_mxn, referencia_pago, afiliados(nombre, codigo), clientes(nombre)",
    )
    .order("fecha_devengo", { ascending: false });

  if (from) q = q.gte("fecha_devengo", from);
  if (to) q = q.lte("fecha_devengo", to);
  if (estatus && estatus !== "todos") q = q.eq("estatus", estatus as never);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = [
    "fecha_devengo",
    "fecha_pago",
    "afiliado",
    "afiliado_codigo",
    "cliente",
    "tipo",
    "estatus",
    "base_mxn",
    "porcentaje",
    "monto_mxn",
    "referencia_pago",
  ];

  const rows = (data ?? []).map((c) => {
    const af = Array.isArray(c.afiliados) ? c.afiliados[0] : c.afiliados;
    const cl = Array.isArray(c.clientes) ? c.clientes[0] : c.clientes;
    return [
      c.fecha_devengo,
      c.fecha_pago ?? "",
      af?.nombre ?? "",
      af?.codigo ?? "",
      cl?.nombre ?? "",
      c.tipo,
      c.estatus,
      c.base_mxn,
      c.porcentaje,
      c.monto_mxn,
      c.referencia_pago ?? "",
    ].map(csvCell).join(",");
  });

  const csv = [header.join(","), ...rows].join("\n") + "\n";
  const filename = `comisiones_${from ?? "inicio"}_${to ?? "hoy"}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
