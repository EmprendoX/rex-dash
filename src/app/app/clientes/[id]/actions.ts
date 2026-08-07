"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function invitarBroker(
  clienteId: string,
  email: string,
  password: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.rpc("invite_broker", {
    p_cliente_id: clienteId,
    p_email: email,
    p_password: password,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/app/clientes/${clienteId}`);
  return { ok: true, userId: data as string };
}

/**
 * Genera un token único de onboarding para que el cliente canjee en /setup.
 * Contraparte self-service de `invitarBroker`: en vez de crear la cuenta
 * el operador con email+password, el cliente completa un form público con
 * su branding mínimo y elige su propio password.
 *
 * Falla si el cliente ya tiene broker vinculado (user_id != null).
 * Regenerable — cada llamada invalida el token anterior.
 */
export async function generateOnboardingToken(
  clienteId: string,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.rpc("generate_onboarding_token", {
    p_cliente_id: clienteId,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/app/clientes/${clienteId}`);
  return { ok: true, token: data as string };
}
