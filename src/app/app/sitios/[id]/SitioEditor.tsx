"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveSitioConfig,
  saveSitioMeta,
  linkNetlifySite,
  unlinkNetlifySite,
  triggerSiteBuild,
  refreshDeployStatus,
  suspendSitio,
} from "../actions";

interface Props {
  sitioId: string;
  initialConfig: string;
  subdominio: string;
  dominioCustom: string;
  netlifySiteId: string | null;
  estatus: string;
}

export default function SitioEditor({
  sitioId,
  initialConfig,
  subdominio,
  dominioCustom,
  netlifySiteId,
  estatus,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[] | null>(null);
  const [config, setConfig] = useState(initialConfig);
  const [sub, setSub] = useState(subdominio);
  const [dom, setDom] = useState(dominioCustom);
  const [pastedSiteId, setPastedSiteId] = useState("");

  function run(fn: () => Promise<void>) {
    setNotice(null);
    setIssues(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (err) {
        setNotice(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }

  function onSaveConfig() {
    run(async () => {
      const r = await saveSitioConfig(sitioId, config);
      if (r.ok) {
        setNotice("Config guardado.");
        router.refresh();
      } else {
        setNotice(r.error);
        if ("issues" in r && r.issues) setIssues(r.issues);
      }
    });
  }

  function onSaveMeta() {
    run(async () => {
      const r = await saveSitioMeta(sitioId, { subdominio: sub, dominio_custom: dom || null });
      setNotice(r.ok ? "Guardado." : `Error: ${r.error}`);
      if (r.ok) router.refresh();
    });
  }

  function onLink() {
    run(async () => {
      const r = await linkNetlifySite(sitioId, pastedSiteId);
      if (r.ok) {
        setNotice("Netlify site linkeado. Ya podés hacer rebuilds desde acá.");
        setPastedSiteId("");
        router.refresh();
      } else {
        setNotice(`Error: ${r.error}`);
      }
    });
  }

  function onUnlink() {
    if (!confirm("Desvincular este Netlify site del dashboard. No borra el sitio en Netlify, solo el link. ¿Confirmar?")) return;
    run(async () => {
      const r = await unlinkNetlifySite(sitioId);
      if (r.ok) {
        setNotice("Netlify site desvinculado.");
        router.refresh();
      } else {
        setNotice(`Error: ${r.error}`);
      }
    });
  }

  function onBuild() {
    run(async () => {
      const r = await triggerSiteBuild(sitioId);
      setNotice(r.ok ? "Build disparado." : `Error: ${r.error}`);
    });
  }

  function onRefresh() {
    run(async () => {
      const r = await refreshDeployStatus(sitioId);
      if (r.ok) {
        setNotice("Estatus actualizado.");
        router.refresh();
      } else {
        setNotice(`Error: ${r.error}`);
      }
    });
  }

  function onSuspend() {
    if (!confirm("Suspender este sitio. La edge function dejará de servir su config. ¿Confirmar?")) return;
    run(async () => {
      const r = await suspendSitio(sitioId);
      if (r.ok) {
        setNotice("Sitio suspendido.");
        router.refresh();
      } else {
        setNotice(`Error: ${r.error}`);
      }
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  return (
    <div className="space-y-6">
      {notice && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {notice}
          {issues && (
            <ul className="mt-2 list-disc list-inside text-xs text-red-700">
              {issues.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">Dominio</h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-medium text-slate-700">Subdominio Netlify</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                value={sub}
                onChange={(e) => setSub(e.target.value)}
                className={inputCls}
              />
              <span className="text-sm text-slate-500">.netlify.app</span>
            </div>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700">Dominio custom</span>
            <input
              value={dom}
              onChange={(e) => setDom(e.target.value)}
              placeholder="ej. juanperez.com"
              className={`${inputCls} mt-1`}
            />
          </label>
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={onSaveMeta}
            disabled={pending}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Guardar dominio
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">Config (JSONB)</h2>
        <p className="mt-1 text-xs text-slate-500">
          Contenido del sitio — se valida contra el Zod schema antes de guardar.
          El template lo consume vía edge function en cada build.
        </p>
        <textarea
          value={config}
          onChange={(e) => setConfig(e.target.value)}
          spellCheck={false}
          className="mt-3 w-full h-96 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono shadow-sm focus:border-slate-500 focus:outline-none"
        />
        <div className="mt-3">
          <button
            type="button"
            onClick={onSaveConfig}
            disabled={pending}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {pending ? "…" : "Guardar config"}
          </button>
        </div>
      </div>

      {!netlifySiteId ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">Crear el sitio en Netlify (paso manual)</h2>
          <p className="mt-2 text-xs text-slate-600">
            Netlify no permite vincular un repo privado de forma confiable vía API. Fase 1: se crea en la UI.
            Después pegás el <strong>Site ID</strong> acá y el dashboard maneja todo lo demás
            (rebuild, estatus, suspender).
          </p>

          <ol className="mt-4 space-y-3 text-sm text-slate-700 list-decimal list-inside">
            <li>
              Abrí{" "}
              <a
                href="https://app.netlify.com/start/deploy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-900 underline hover:no-underline"
              >
                Netlify → New site from Git
              </a>
              , conectá GitHub, elegí <code className="font-mono text-xs">EmprendoX/Real-Estate-X_Engl</code>, branch <code className="font-mono text-xs">main</code>.
            </li>
            <li>
              Subdominio: usá <code className="font-mono text-xs">{sub || "(guardá antes el subdominio arriba)"}</code>.
            </li>
            <li>
              En <strong>Advanced &rarr; Environment variables</strong>, pegá estas tres:
              <div className="mt-2 space-y-1">
                <EnvRow k="CLIENT_ID" v={sitioId} />
                <EnvRow k="SUPABASE_URL" v={supabaseUrl} />
                <EnvRow k="SUPABASE_ANON_KEY" v={supabaseAnonKey} />
              </div>
            </li>
            <li>Click <strong>Deploy site</strong>. Esperá al build (~2 min).</li>
            <li>
              En <strong>Site configuration &rarr; General &rarr; Site details</strong>, copiá el <strong>Site ID</strong>
              (UUID de 36 chars).
            </li>
            <li>Pegalo acá abajo y <strong>Guardar Netlify Site ID</strong>.</li>
          </ol>

          <div className="mt-6 flex items-end gap-2">
            <label className="flex-1">
              <span className="block text-sm font-medium text-slate-700">Netlify Site ID</span>
              <input
                value={pastedSiteId}
                onChange={(e) => setPastedSiteId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
                className={`${inputCls} mt-1 font-mono text-xs`}
              />
            </label>
            <button
              type="button"
              onClick={onLink}
              disabled={pending || !pastedSiteId.trim()}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Guardar Netlify Site ID
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">Netlify</h2>
          <div className="mt-2 text-xs text-slate-600 space-y-0.5">
            <div>
              Site ID:{" "}
              <span className="font-mono">{netlifySiteId}</span>
            </div>
            <div>Estatus interno: <strong>{estatus}</strong></div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBuild}
              disabled={pending}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Rebuild
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={pending}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Refrescar estatus
            </button>
            {estatus !== "suspendido" && (
              <button
                type="button"
                onClick={onSuspend}
                disabled={pending}
                className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
              >
                Suspender
              </button>
            )}
            <button
              type="button"
              onClick={onUnlink}
              disabled={pending}
              className="ml-auto rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              Desvincular
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EnvRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 flex items-center gap-2">
      <code className="font-mono text-xs text-slate-500 w-40 shrink-0">{k}</code>
      <code className="font-mono text-xs text-slate-900 break-all">{v || "(faltante)"}</code>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none";
