"use client";

import { useState, useTransition } from "react";
import { rebuildAllLive } from "./actions";

export default function RebuildAllButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition();
  const [results, setResults] = useState<{ nombre: string; ok: boolean; error?: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!confirm(`Rebuild ${count} sitio(s) en Netlify. ¿Confirmar?`)) return;
    setError(null);
    setResults(null);
    startTransition(async () => {
      const r = await rebuildAllLive();
      if (r.ok) setResults(r.results);
      else setError(r.error);
    });
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={onClick}
        disabled={pending || count === 0}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Rebuild en curso…" : `Rebuild masivo (${count})`}
      </button>
      {error && (
        <div className="mt-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {results && (
        <div className="mt-2 max-w-md rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-left">
          <div className="font-semibold mb-1">
            {results.filter((r) => r.ok).length} OK · {results.filter((r) => !r.ok).length} error(es)
          </div>
          <ul className="space-y-0.5 max-h-48 overflow-auto">
            {results.map((r, i) => (
              <li key={i} className={r.ok ? "text-emerald-700" : "text-red-700"}>
                {r.ok ? "✓" : "✗"} {r.nombre}
                {r.error && <span className="text-slate-500"> — {r.error}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
