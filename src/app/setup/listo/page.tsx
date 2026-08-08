interface Props {
  searchParams: { agencia?: string };
}

export default function SetupListoPage({ searchParams }: Props) {
  const agencia = searchParams.agencia?.trim() || "tu agencia";
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <h1 className="text-lg font-semibold text-emerald-900">
          Listo, recibimos tus datos
        </h1>
        <p className="mt-3 text-sm text-emerald-800">
          Ya guardamos la información de <strong>{agencia}</strong>. Nuestro equipo
          está armando tu sitio ahora.
        </p>
        <p className="mt-3 text-sm text-emerald-800">
          Cuando esté online (normalmente el mismo día) te vamos a mandar por
          WhatsApp el link a tu sitio y las instrucciones para editarlo desde
          tu panel.
        </p>
        <p className="mt-4 text-sm text-emerald-900">
          Ya podés cerrar esta ventana.
        </p>
      </div>
    </div>
  );
}
