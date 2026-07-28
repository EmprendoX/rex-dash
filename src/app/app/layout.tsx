import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { getCurrentUser } from "@/lib/auth/role";

const OPERATOR_ONLY_PATHS = [
  "/app/afiliados",
  "/app/clientes",
  "/app/pagos",
  "/app/comisiones",
  "/app/sitios",
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Broker: solo puede estar en /app/mi-sitio (o /app que redirige).
  if (user.role === "broker") {
    const pathname = headers().get("x-invoke-path") || headers().get("referer") || "";
    // Best-effort read of the requested path. If it's an operator-only route,
    // bounce to the broker's own site editor.
    const isOperatorOnly = OPERATOR_ONLY_PATHS.some((p) => pathname.includes(p));
    if (isOperatorOnly) redirect("/app/mi-sitio");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar userEmail={user.email} role={user.role} />
        <main className="flex-1 overflow-x-hidden bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
