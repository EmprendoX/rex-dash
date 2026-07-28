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
