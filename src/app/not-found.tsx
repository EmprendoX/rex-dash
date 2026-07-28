import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-slate-900">Página no encontrada.</h1>
        <Link
          href="/app"
          className="mt-4 inline-block text-sm text-slate-600 hover:text-slate-900 underline"
        >
          Ir al dashboard
        </Link>
      </div>
    </main>
  );
}
