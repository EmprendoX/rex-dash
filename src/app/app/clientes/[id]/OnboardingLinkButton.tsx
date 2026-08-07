"use client";

import { useState, useTransition } from "react";
import { generateOnboardingToken } from "./actions";

interface Props {
  clienteId: string;
  hasLinkedBroker: boolean;
  existingToken: string | null;
  tokenCreatedAt: string | null;
  onboardingCompletedAt: string | null;
}

const TOKEN_TTL_DAYS = 30;

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default function OnboardingLinkButton({
  clienteId,
  hasLinkedBroker,
  existingToken,
  tokenCreatedAt,
  onboardingCompletedAt,
}: Props) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(existingToken);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (hasLinkedBroker) {
    return (
      <div className="mt-2 text-sm text-emerald-700">
        ✓ Broker vinculado. Cuenta ya activa.
      </div>
    );
  }

  if (onboardingCompletedAt) {
    return (
      <div className="mt-2 text-sm text-emerald-700">
        ✓ Cliente completó el onboarding {daysAgo(onboardingCompletedAt)}d atrás.
      </div>
    );
  }

  function generate() {
    setError(null);
    startTransition(async () => {
      const r = await generateOnboardingToken(clienteId);
      if (r.ok) {
        setToken(r.token);
        setOpen(true);
      } else {
        setError(r.error);
        setOpen(true);
      }
    });
  }

  function showExisting() {
    setError(null);
    setOpen(true);
  }

  const age = daysAgo(tokenCreatedAt);
  const expired = age !== null && age >= TOKEN_TTL_DAYS;
  const link =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/setup?token=${token}`
      : null;

  if (!open) {
    return (
      <div className="mt-2 flex flex-col gap-2">
        {token && !expired ? (
          <>
            <button
              type="button"
              onClick={showExisting}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 self-start"
            >
              Ver link de onboarding {age !== null && `(${TOKEN_TTL_DAYS - age}d restantes)`}
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={pending}
              className="text-xs text-slate-500 hover:text-slate-900 self-start"
            >
              Regenerar link
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={generate}
            disabled={pending}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 self-start"
          >
            {pending
              ? "Generando…"
              : expired
                ? "Regenerar link (el anterior expiró)"
                : "Generar link de onboarding"}
          </button>
        )}
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
      <div className="max-w-md w-full rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900">Link de onboarding</h2>
        <p className="mt-1 text-sm text-slate-600">
          Pasále este link al cliente por WhatsApp o email. Al abrirlo, va a completar
          su información básica y elegir su password. El link vence en {TOKEN_TTL_DAYS} días.
        </p>

        {link && (
          <div className="mt-4">
            <CopyRow label="Link" value={link} />
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 flex items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-slate-500 w-12 shrink-0">{label}</span>
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
