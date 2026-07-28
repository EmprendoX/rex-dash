"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-red-800">Algo salió mal.</h1>
        <p className="mt-2 text-sm text-slate-600">{error.message}</p>
        {error.digest && (
          <p className="mt-1 text-xs text-slate-400">Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
