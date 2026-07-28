import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

export type CurrentUser = {
  id: string;
  email: string;
  role: Enums<"user_role">;
  cliente_id: string | null; // only set when role='broker'
};

/**
 * Resolves the current user's role and — for brokers — the id of the cliente
 * they're linked to. Returns null when there's no session.
 *
 * Server-side only. Callers should already know they're in a protected route.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Role
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  // Default to 'broker' if no role row exists — safer than defaulting to operator.
  const role: Enums<"user_role"> = roleRow?.role ?? "broker";

  // Cliente id for brokers
  let cliente_id: string | null = null;
  if (role === "broker") {
    const { data: cli } = await supabase
      .from("clientes")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    cliente_id = cli?.id ?? null;
  }

  return {
    id: user.id,
    email: user.email ?? "",
    role,
    cliente_id,
  };
}
