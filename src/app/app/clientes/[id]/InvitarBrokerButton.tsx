"use client";

import { useState, useTransition } from "react";
import { invitarBroker } from "./actions";

interface Props {
  clienteId: string;
  hasLinkedBroker: boolean;
  suggestedEmail: string;
}

function generateTempPassword(): string {
  // 12 char temp password: 3 blocks of alphanumeric separated by dash.
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const block = () => {
    let s = "";
    for (let i = 0; i < 4; i++) {
      s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
  };
  return `${block()}-${block()}-${block()}`;
}

export default function InvitarBrokerButton({ clienteId, hasLinkedBroker, suggestedEmail }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(suggestedEmail);
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (hasLinkedBroker) {
    return (
      <div className="mt-2 text-sm text-emerald-700">
        ✓ Broker vinculado. Ver email/password en Supabase Auth.
      </div>
    );
  }

  function openModal() {
    setEmail(suggestedEmail);
    setPassword(generateTempPassword());
    setError(null);
    setResult(null);
    setOpen(true);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await invitarBroker(clienteId, email, password);
      if (r.ok) setResult({ email, password });
      else setError(r.error);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openModal}
        className="mt-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
      >
        Invitar broker (crear acceso)
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
      <div className="max-w-md w-full rounded-lg bg-white p-6 shadow-lg">
        {!result ? (
          <>
            <h2 className="text-lg font-semibold text-slate-900">Invitar broker</h2>
            <p className="mt-1 text-sm text-slate-600">
              Se le crea una cuenta para que edite su propio sitio desde este dashboard. Después le pasás
              email + password por WhatsApp o el canal que prefieras.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="block text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700">Password temporal</span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setPassword(generateTempPassword())}
                    className="text-xs text-slate-500 hover:text-slate-900"
                  >
                    Regenerar
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">Mínimo 8 caracteres.</p>
              </label>
            </div>

            {error && (
              <div className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || !email || password.length < 8}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {pending ? "Creando…" : "Crear acceso"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-emerald-800">Acceso creado</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pasále estos datos al broker. El password no se puede volver a ver — copialo ahora.
            </p>
            <div className="mt-4 space-y-2">
              <CopyRow label="Email" value={result.email} />
              <CopyRow label="Password" value={result.password} />
              <CopyRow label="URL de login" value="https://realex-dashboard.netlify.app/login" />
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setResult(null);
                  location.reload();
                }}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Listo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 flex items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-slate-500 w-16 shrink-0">{label}</span>
      <code className="flex-1 font-mono text-xs text-slate-900 break-all">{value}</code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="text-xs text-slate-600 hover:text-slate-900"
      >
        {copied ? "✓" : "Copiar"}
      </button>
    </div>
  );
}
