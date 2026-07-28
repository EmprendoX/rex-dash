"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; exact?: boolean };

const NAV: NavItem[] = [
  { href: "/app", label: "Inicio", exact: true },
  { href: "/app/clientes", label: "Clientes" },
  { href: "/app/sitios", label: "Sitios" },
  { href: "/app/afiliados", label: "Afiliados" },
  { href: "/app/comisiones", label: "Comisiones" },
  { href: "/app/pagos", label: "Pagos" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white">
      <div className="px-4 py-5 border-b border-slate-200">
        <Link href="/app" className="block">
          <div className="text-sm font-semibold text-slate-900">RealEX</div>
          <div className="text-xs text-slate-500">Dashboard</div>
        </Link>
      </div>
      <nav className="p-2 space-y-0.5">
        {NAV.map((item) => {
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
