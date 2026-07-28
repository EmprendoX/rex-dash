"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignInResult =
  | { ok: true; next: string }
  | { ok: false; error: string };

export async function signIn(formData: FormData): Promise<SignInResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "/app");
  const next = nextRaw.startsWith("/") ? nextRaw : "/app";

  if (!email || !password) {
    return { ok: false, error: "Email y contraseña son requeridos." };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, error: error.message };
  }

  // Client-side navigation on success — the session cookie is now set by
  // the server client and the middleware will let us into /app.
  return { ok: true, next };
}
