"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveSitioConfig,
  saveSitioMeta,
  provisionOnNetlify,
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

  function onProvision() {
    if (!confirm(`Crear sitio en Netlify con subdominio "${sub}". ¿Confirmar?`)) return;
    run(async () => {
      const r = await provisionOnNetlify(sitioId);
      if (r.ok) {
        setNotice(`Sitio creado en Netlify: ${r.url}`);
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

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">Netlify</h2>
        <div className="mt-2 text-xs text-slate-600 space-y-0.5">
          <div>
            Netlify site id:{" "}
            {netlifySiteId ? (
              <span className="font-mono">{netlifySiteId}</span>
            ) : (
              <span className="text-slate-400">no creado todavía</span>
            )}
          </div>
          <div>Estatus interno: <strong>{estatus}</strong></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!netlifySiteId && (
            <button
              type="button"
              onClick={onProvision}
              disabled={pending || !sub}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Crear sitio en Netlify
            </button>
          )}
          {netlifySiteId && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none";
