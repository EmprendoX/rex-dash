"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Enums } from "@/lib/supabase/database.types";

type NavItem = { href: string; label: string; exact?: boolean };

const OPERATOR_NAV: NavItem[] = [
  { href: "/app", label: "Inicio", exact: true },
  { href: "/app/clientes", label: "Clientes" },
  { href: "/app/sitios", label: "Sitios" },
  { href: "/app/afiliados", label: "Afiliados" },
  { href: "/app/comisiones", label: "Comisiones" },
  { href: "/app/pagos", label: "Pagos" },
];

const BROKER_NAV: NavItem[] = [
  { href: "/app/mi-sitio", label: "Mi sitio", exact: true },
];

export default function Sidebar({ role }: { role: Enums<"user_role"> }) {
  const pathname = usePathname();
  const nav = role === "operator" ? OPERATOR_NAV : BROKER_NAV;

  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white">
      <div className="px-4 py-5 border-b border-slate-200">
        <Link href={role === "broker" ? "/app/mi-sitio" : "/app"} className="block">
          <div className="text-sm font-semibold text-slate-900">RealEX</div>
          <div className="text-xs text-slate-500">
            {role === "operator" ? "Dashboard" : "Panel del broker"}
          </div>
        </Link>
      </div>
      <nav className="p-2 space-y-0.5">
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm ${
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
