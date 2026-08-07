import { createSupabaseServerClient } from "@/lib/supabase/server";
import SetupForm from "./SetupForm";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SetupPageProps {
  searchParams: { token?: string };
}

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const rawToken = (searchParams.token ?? "").trim();

  if (!rawToken || !UUID_RE.test(rawToken)) {
    return <SetupError title="Link inválido" body="El link que abriste no tiene un token válido. Verificá que hayas usado el link completo que te enviamos por WhatsApp." />;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_cliente_by_onboarding_token", {
    p_token: rawToken,
  });

  if (error) {
    return <SetupError title="Error" body={`No pudimos verificar el token: ${error.message}`} />;
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    return (
      <SetupError
        title="Link vencido o ya usado"
        body="Este link no es válido — puede que ya lo hayas usado o que haya vencido. Escribinos a RealEX y te generamos uno nuevo."
      />
    );
  }

  // TTL check (30 días) — la RPC de submit lo va a rechazar de nuevo pero
  // damos un mensaje más claro acá.
  const ageDays = Math.floor(
    (Date.now() - new Date(row.token_created_at).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (ageDays >= 30) {
    return (
      <SetupError
        title="Link vencido"
        body="Este link tiene más de 30 días. Escribinos a RealEX para que te generemos uno nuevo."
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Bienvenido a RealEX, {row.nombre.split(" ")[0]}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Completá estos datos para que preparemos tu sitio. Todo se puede editar
          después desde tu panel.
        </p>
      </header>
      <SetupForm
        token={rawToken}
        prefill={{
          nombre: row.nombre,
          inmobiliaria: row.inmobiliaria ?? "",
          email: row.email ?? "",
          whatsapp: row.whatsapp ?? "",
        }}
      />
    </div>
  );
}

function SetupError({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-semibold text-amber-900">{title}</h1>
        <p className="mt-2 text-sm text-amber-800">{body}</p>
      </div>
    </div>
  );
}
