// Business rules for commissions & prices (PRD §5).
// Kept in a plain module so both client and server components can import it —
// server action files ("use server") should only export functions.

export const FRONTEND_PRICE_MXN = 2997;

// Commission percentages. Mirror what the SQL trigger in migration 0005 does.
export const COMISION_FRONTEND_PCT = 0.30;
export const COMISION_MENSUAL_PCT = 0.26;
export const COMISION_UPSELL_PCT = 0.26;
