// Pure reference model used by unit tests. Production authority is PostgreSQL RPC.
export type WalletState = {
  balance: bigint;
  reserved: bigint;
  requests: Map<string, { amount: bigint; settled?: bigint }>;
};
export function reserve(w: WalletState, key: string, amount: bigint) {
  const old = w.requests.get(key);
  if (old) {
    if (old.amount !== amount) throw new Error("idempotency_conflict");
    return;
  }
  if (amount <= 0n) throw new Error("invalid_amount");
  if (w.balance - w.reserved < amount) throw new Error("insufficient_credits");
  w.reserved += amount;
  w.requests.set(key, { amount });
}
export function settle(w: WalletState, key: string, actual: bigint) {
  const r = w.requests.get(key);
  if (!r) throw new Error("reservation_not_found");
  if (r.settled !== undefined) {
    if (r.settled !== actual) throw new Error("settlement_conflict");
    return;
  }
  if (actual < 0n || actual > r.amount) throw new Error("invalid_settlement");
  w.balance -= actual;
  w.reserved -= r.amount;
  r.settled = actual;
}
