import Link from "next/link";

interface Props {
  searchParams: { agencia?: string };
}

export default function SetupListoPage({ searchParams }: Props) {
  const agencia = searchParams.agencia?.trim() || "tu agencia";
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <h1 className="text-lg font-semibold text-emerald-900">
          Listo — tu cuenta está creada
        </h1>
        <p className="mt-2 text-sm text-emerald-800">
          Ya guardamos los datos de <strong>{agencia}</strong>. Nuestro equipo va a
          terminar de armar tu sitio y te vamos a avisar por WhatsApp cuando esté
          online (normalmente el mismo día).
        </p>
        <p className="mt-3 text-sm text-emerald-800">
          Mientras tanto, ya podés entrar al panel con el email y password que
          elegiste.
        </p>
        <div className="mt-6">
          <Link
            href="/login"
            className="inline-block rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Ir al panel
          </Link>
        </div>
      </div>
    </div>
  );
}
