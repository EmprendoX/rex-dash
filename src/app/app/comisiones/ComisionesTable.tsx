"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate, formatMXN } from "@/lib/format";
import { marcarPagadas, marcarPorPagar } from "./actions";

type Row = {
  id: string;
  fecha_devengo: string;
  fecha_pago: string | null;
  tipo: string;
  estatus: "devengada" | "por_pagar" | "pagada";
  base_mxn: number;
  porcentaje: number;
  monto_mxn: number;
  referencia_pago: string | null;
  afiliado: { id: string; nombre: string; codigo: string } | null;
  cliente: { id: string; nombre: string } | null;
};

const ESTATUS_STYLE: Record<string, string> = {
  devengada: "bg-slate-100 text-slate-700",
  por_pagar: "bg-amber-100 text-amber-800",
  pagada: "bg-emerald-100 text-emerald-800",
};

export default function ComisionesTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [pagoRef, setPagoRef] = useState("");
  const [pagoFecha, setPagoFecha] = useState(new Date().toISOString().slice(0, 10));

  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.id)),
    [rows, selected],
  );
  const selectableForPago = selectedRows.filter((r) => r.estatus !== "pagada");
  const selectableForPorPagar = selectedRows.filter((r) => r.estatus === "devengada");
  const totalSeleccionado = selectableForPago.reduce((s, r) => s + Number(r.monto_mxn), 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
    );
  }

  function doMarcarPorPagar() {
    const ids = selectableForPorPagar.map((r) => r.id);
    setNotice(null);
    startTransition(async () => {
      const r = await marcarPorPagar(ids);
      if (r.ok) {
        setNotice(`${r.updated} comisión(es) marcadas como "por pagar".`);
        setSelected(new Set());
        router.refresh();
      } else {
        setNotice(`Error: ${r.error}`);
      }
    });
  }

  function doMarcarPagadas() {
    const ids = selectableForPago.map((r) => r.id);
    if (!ids.length) {
      setNotice("No hay comisiones marcables como pagadas en la selección.");
      return;
    }
    setNotice(null);
    startTransition(async () => {
      const r = await marcarPagadas(ids, pagoRef, pagoFecha);
      if (r.ok) {
        setNotice(`${r.updated} comisión(es) marcadas como pagadas.`);
        setSelected(new Set());
        setShowPagoModal(false);
        setPagoRef("");
        router.refresh();
      } else {
        setNotice(`Error: ${r.error}`);
      }
    });
  }

  return (
    <div className="space-y-4">
      {notice && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {notice}
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">
          {selected.size} seleccionada(s) · {formatMXN(totalSeleccionado)}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          disabled={pending || selectableForPorPagar.length === 0}
          onClick={doMarcarPorPagar}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Marcar {selectableForPorPagar.length ? `${selectableForPorPagar.length} ` : ""}como por pagar
        </button>
        <button
          type="button"
          disabled={pending || selectableForPago.length === 0}
          onClick={() => setShowPagoModal(true)}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Marcar {selectableForPago.length ? `${selectableForPago.length} ` : ""}como pagadas
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3 w-8">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3 font-medium">Devengo</th>
              <th className="px-4 py-3 font-medium">Afiliado</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium text-right">Base</th>
              <th className="px-4 py-3 font-medium text-right">Comisión</th>
              <th className="px-4 py-3 font-medium">Estatus</th>
              <th className="px-4 py-3 font-medium">Pago</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  Sin comisiones para el período.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className={selected.has(r.id) ? "bg-slate-50" : ""}>
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                  />
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(r.fecha_devengo)}</td>
                <td className="px-4 py-3">
                  {r.afiliado ? (
                    <Link
                      href={`/app/afiliados/${r.afiliado.id}`}
                      className="text-slate-900 hover:underline"
                    >
                      {r.afiliado.nombre}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.cliente ? (
                    <Link
                      href={`/app/clientes/${r.cliente.id}`}
                      className="text-slate-700 hover:underline"
                    >
                      {r.cliente.nombre}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.tipo}</td>
                <td className="px-4 py-3 text-right text-slate-500">{formatMXN(r.base_mxn)}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatMXN(r.monto_mxn)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      ESTATUS_STYLE[r.estatus] ?? ""
                    }`}
                  >
                    {r.estatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {r.fecha_pago ? (
                    <>
                      {formatDate(r.fecha_pago)}
                      {r.referencia_pago && (
                        <>
                          <br />
                          <span className="font-mono">{r.referencia_pago}</span>
                        </>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPagoModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">Marcar como pagadas</h2>
            <p className="mt-1 text-sm text-slate-600">
              {selectableForPago.length} comisión(es) · total{" "}
              <strong>{formatMXN(totalSeleccionado)}</strong>
            </p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="block text-sm font-medium text-slate-700">
                  Referencia del pago
                  <span className="text-red-500 ml-0.5">*</span>
                </span>
                <input
                  value={pagoRef}
                  onChange={(e) => setPagoRef(e.target.value)}
                  placeholder="SPEI-2026-07-28 / batch-01"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700">Fecha de pago</span>
                <input
                  type="date"
                  value={pagoFecha}
                  onChange={(e) => setPagoFecha(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                />
              </label>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPagoModal(false)}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending || !pagoRef.trim()}
                onClick={doMarcarPagadas}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {pending ? "Guardando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
