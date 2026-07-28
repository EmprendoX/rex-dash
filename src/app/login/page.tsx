import LoginForm from "./LoginForm";

interface Props {
  searchParams: { next?: string };
}

export default function LoginPage({ searchParams }: Props) {
  const next = searchParams?.next ?? "/app";

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-slate-900">RealEX Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Ingresá con tu cuenta de operador.</p>

        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
