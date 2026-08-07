import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate, formatMXN } from "@/lib/format";
import CrearSitioButton from "./CrearSitioButton";
import InvitarBrokerButton from "./InvitarBrokerButton";
import OnboardingLinkButton from "./OnboardingLinkButton";

export default async function ClienteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();

  const [{ data: cliente }, { data: pagos }, { data: sitio }, { data: comisiones }, { data: suscripcion }] =
    await Promise.all([
      supabase
        .from("clientes")
        .select("*, afiliados(id, nombre, codigo)")
        .eq("id", params.id)
        .maybeSingle(),
      supabase
        .from("pagos")
        .select("*")
        .eq("cliente_id", params.id)
        .order("fecha", { ascending: false }),
      supabase
        .from("sitios")
        .select("id, subdominio, dominio_custom, estatus, estado_dns, ultimo_deploy_at")
        .eq("cliente_id", params.id)
        .maybeSingle(),
      supabase
        .from("comisiones")
        .select("id, tipo, monto_mxn, estatus, fecha_devengo")
        .eq("cliente_id", params.id)
        .order("fecha_devengo", { ascending: false }),
      supabase
        .from("suscripciones")
        .select("*")
        .eq("cliente_id", params.id)
        .maybeSingle(),
    ]);

  if (!cliente) notFound();

  const afiliado = Array.isArray(cliente.afiliados) ? cliente.afiliados[0] : cliente.afiliados;

  const suggestedBrokerEmail =
    cliente.email ??
    `broker-${(cliente.inmobiliaria || cliente.nombre).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20)}@example.com`;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/app/clientes" className="text-sm text-slate-500 hover:text-slate-900">
          ← Clientes
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{cliente.nombre}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {cliente.inmobiliaria && <>{cliente.inmobiliaria} · </>}
          estatus <strong>{cliente.estatus}</strong> · origen <strong>{cliente.origen}</strong> ·
          alta {formatDate(cliente.created_at)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Contacto</h2>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 space-y-1">
            <div>Email: {cliente.email ?? "—"}</div>
            <div>WhatsApp: {cliente.whatsapp ?? "—"}</div>
            <div>Fecha compra: {formatDate(cliente.fecha_compra)}</div>
            <div>
              Afiliado:{" "}
              {afiliado ? (
                <Link href={`/app/afiliados/${afiliado.id}`} className="text-slate-900 hover:underline">
                  {afiliado.nombre} <span className="font-mono text-xs text-slate-500">({afiliado.codigo})</span>
                </Link>
              ) : (
                "—"
              )}
            </div>
            <div className="pt-2 mt-2 border-t border-slate-100">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Acceso del broker</div>
              <OnboardingLinkButton
                clienteId={cliente.id}
                hasLinkedBroker={!!cliente.user_id}
                existingToken={cliente.onboarding_token}
                tokenCreatedAt={cliente.onboarding_token_created_at}
                onboardingCompletedAt={cliente.onboarding_completed_at}
              />
              {!cliente.user_id && !cliente.onboarding_completed_at && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500 mb-1">O crear la cuenta manualmente:</div>
                  <InvitarBrokerButton
                    clienteId={cliente.id}
                    hasLinkedBroker={!!cliente.user_id}
                    suggestedEmail={suggestedBrokerEmail}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Sitio</h2>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 space-y-1">
            {sitio ? (
              <>
                <div>
                  Subdominio:{" "}
                  {sitio.subdominio ? (
                    <span className="font-mono">{sitio.subdominio}.netlify.app</span>
                  ) : (
                    "—"
                  )}
                </div>
                <div>Dominio: {sitio.dominio_custom || "—"}</div>
                <div>Estatus deploy: <strong>{sitio.estatus}</strong></div>
                <div>DNS: {sitio.estado_dns}</div>
                <div>Último deploy: {formatDate(sitio.ultimo_deploy_at)}</div>
                <Link
                  href={`/app/sitios/${sitio.id}`}
                  className="mt-2 inline-block text-sm text-slate-900 hover:underline"
                >
                  Ver / editar sitio →
                </Link>
              </>
            ) : (
              <>
                <p className="text-slate-500">Sin sitio todavía.</p>
                <CrearSitioButton clienteId={cliente.id} />
              </>
            )}
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          Pagos ({pagos?.length ?? 0})
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="min-w-full text-sm divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Fecha</th>
                <th className="px-4 py-2 font-medium">Concepto</th>
                <th className="px-4 py-2 font-medium text-right">Monto</th>
                <th className="px-4 py-2 font-medium">Método</th>
                <th className="px-4 py-2 font-medium">Referencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(pagos ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Sin pagos.
                  </td>
                </tr>
              )}
              {(pagos ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-slate-500">{formatDate(p.fecha)}</td>
                  <td className="px-4 py-2 text-slate-700">{p.concepto}</td>
                  <td className="px-4 py-2 text-right text-slate-900">{formatMXN(p.monto_mxn)}</td>
                  <td className="px-4 py-2 text-slate-600">{p.metodo ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-500 font-mono text-xs">{p.referencia ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          Comisiones generadas ({comisiones?.length ?? 0})
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="min-w-full text-sm divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium text-right">Monto</th>
                <th className="px-4 py-2 font-medium">Estatus</th>
                <th className="px-4 py-2 font-medium">Devengo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(comisiones ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    Sin comisiones.
                  </td>
                </tr>
              )}
              {(comisiones ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 text-slate-700">{c.tipo}</td>
                  <td className="px-4 py-2 text-right text-slate-900">{formatMXN(c.monto_mxn)}</td>
                  <td className="px-4 py-2 text-slate-600">{c.estatus}</td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(c.fecha_devengo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {cliente.notas && (
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Notas</h2>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 whitespace-pre-wrap">
            {cliente.notas}
          </div>
        </section>
      )}

      {suscripcion && (
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Suscripción</h2>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 space-y-1">
            <div>Monto: {formatMXN(suscripcion.monto_mxn)} / mes</div>
            <div>Día de cobro: {suscripcion.dia_cobro}</div>
            <div>Estatus: <strong>{suscripcion.estatus}</strong></div>
            <div>Inicio: {formatDate(suscripcion.fecha_inicio)}</div>
            {suscripcion.fecha_cancelacion && (
              <div>Cancelada: {formatDate(suscripcion.fecha_cancelacion)}</div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
