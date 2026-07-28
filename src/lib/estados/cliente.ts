// Cliente state machine per PRD §6:
//   prospecto → pagado → generado → desplegado → entregado → activo
//                                                          ↘ cancelado
// The dashboard blocks invalid state jumps.

import type { Enums } from "@/lib/supabase/database.types";

export type ClienteEstatus = Enums<"cliente_estatus">;

const TRANSITIONS: Record<ClienteEstatus, ClienteEstatus[]> = {
  prospecto: ["pagado", "cancelado"],
  pagado: ["generado", "cancelado"],
  generado: ["desplegado", "cancelado"],
  desplegado: ["entregado", "cancelado"],
  entregado: ["activo", "cancelado"],
  activo: ["cancelado"],
  cancelado: [],
};

export function canTransition(
  from: ClienteEstatus,
  to: ClienteEstatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextStatesFor(state: ClienteEstatus): ClienteEstatus[] {
  return TRANSITIONS[state];
}
