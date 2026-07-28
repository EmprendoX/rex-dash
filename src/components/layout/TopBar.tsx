import type { Enums } from "@/lib/supabase/database.types";

export default function TopBar({
  userEmail,
  role,
}: {
  userEmail: string;
  role: Enums<"user_role">;
}) {
  return (
    <header className="h-14 shrink-0 border-b border-slate-200 bg-white">
      <div className="h-full mx-auto max-w-7xl px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">{userEmail}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              role === "operator"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {role}
          </span>
        </div>
        <form action="/logout" method="post">
          <button
            type="submit"
            className="text-sm text-slate-700 hover:text-slate-900"
          >
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
