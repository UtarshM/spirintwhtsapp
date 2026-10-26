import type { VoiceConfig } from "../../src/lib/voice";
import {
  parsePlivoCdr,
  type VoiceFinalStatus,
} from "../../src/lib/voice-outcomes";
import { plivoRequest } from "./providers";
import { voiceDb, voiceRpc } from "./store";

export type ReconciliationCall = {
  id: string;
  provider_id: string | null;
  reconcile_attempts: number;
  caller_id: string;
  destination: string;
};
export type ReconciliationUpdate = {
  reconciliation_state: "pending" | "manual";
  reconcile_after: string;
  reconcile_attempts: number;
  last_error: string;
};
export type ReconciliationDependencies = {
  now: () => Date;
  config: (call: ReconciliationCall) => VoiceConfig | Promise<VoiceConfig>;
  due: (now: string, createdBefore: string) => Promise<ReconciliationCall[]>;
  cdr: (config: VoiceConfig, providerId: string) => Promise<unknown>;
  finish: (
    call: ReconciliationCall,
    seconds: number,
    status: VoiceFinalStatus,
  ) => Promise<void>;
  update: (
    call: ReconciliationCall,
    patch: ReconciliationUpdate,
  ) => Promise<void>;
};
const defaults: ReconciliationDependencies = {
  now: () => new Date(),
  config: async (call) => {
    const { loadCallVoiceConfig } = await import("./credentials");
    return loadCallVoiceConfig(call.id);
  },
  due: async (now, createdBefore) => {
    const { data, error } = await voiceDb()
      .from("calls")
      .select("id,provider_id,reconcile_attempts,caller_id,destination")
      .not("request_key", "is", null)
      .is("ended_at", null)
      .eq("reconciliation_state", "pending")
      .lte("reconcile_after", now)
      .lt("created_at", createdBefore)
      .order("created_at")
      .order("id")
      .limit(100);
    if (error) throw Error("voice_reconciliation_query_failed");
    return data || [];
  },
  cdr: (config, providerId) =>
    plivoRequest(config, `Call/${providerId}/`, "GET"),
  finish: async (call, seconds, status) => {
    // RPC atomically settles credits, ends the call, and marks it settled.
    await voiceRpc("finish_voice_call", {
      call_id: call.id,
      provider_uuid: call.provider_id,
      billed_seconds: seconds,
      final_status: status,
    });
  },
  update: async (call, patch) => {
    const { error } = await voiceDb()
      .from("calls")
      .update(patch)
      .eq("id", call.id)
      .is("ended_at", null)
      .eq("reconciliation_state", "pending")
      .eq("reconcile_attempts", call.reconcile_attempts);
    if (error) throw Error("voice_reconciliation_save_failed");
  },
};
export const MAX_RECONCILIATION_ATTEMPTS = 6;
export function reconciliationDelayMs(attempt: number) {
  return Math.min(
    30 * 60000,
    60000 * 2 ** Math.min(Math.max(attempt - 1, 0), 5),
  );
}
export async function reconcileVoiceCalls(
  deps: ReconciliationDependencies = defaults,
) {
  const now = deps.now(),
    calls = await deps.due(
      now.toISOString(),
      new Date(now.getTime() - 20 * 60000).toISOString(),
    );
  let settled = 0,
    manual = 0,
    retry = 0;
  async function defer(
    call: ReconciliationCall,
    code: string,
    manualRequired = false,
  ) {
    const attempts = call.reconcile_attempts + 1,
      needsManual = manualRequired || attempts >= MAX_RECONCILIATION_ATTEMPTS;
    await deps.update(call, {
      reconciliation_state: needsManual ? "manual" : "pending",
      reconcile_after: new Date(
        deps.now().getTime() + reconciliationDelayMs(attempts),
      ).toISOString(),
      reconcile_attempts: attempts,
      last_error: needsManual ? "manual_reconciliation_required" : code,
    });
    if (needsManual) manual++;
    else retry++;
  }
  for (const call of calls) {
    // Never redial or release a wallet reservation for an unknown create outcome.
    if (!call.provider_id) {
      await defer(call, "voice_provider_call_id_required", true);
      continue;
    }
    let cdr: unknown;
    try {
      // Resolve the immutable customer connection for this call only. A missing
      // or mismatched connection must never fall back to platform/previous-call
      // credentials, and cannot prevent other workspaces from being processed.
      const config = await deps.config(call);
      cdr = await deps.cdr(config, call.provider_id);
    } catch {
      await defer(call, "voice_cdr_fetch_failed");
      continue;
    }
    const parsed = parsePlivoCdr(cdr, call.provider_id, {
      caller_id: call.caller_id,
      destination: call.destination,
    });
    if (parsed.state !== "complete") {
      await defer(call, parsed.code, parsed.state === "manual");
      continue;
    }
    try {
      await deps.finish(call, parsed.billedSeconds, parsed.finalStatus);
      settled++;
    } catch {
      // Includes duration/rate conflicts; keep credits reserved for reconciliation.
      await defer(call, "voice_settlement_requires_reconciliation");
    }
  }
  return { settled, manual, retry };
}
// tsx executes this repository's command as CommonJS. Test imports must not run
// a provider job or require service credentials.
if (typeof require === "function" && require.main === module)
  void reconcileVoiceCalls()
    .then((result) => console.log("voice_reconciliation_complete", result))
    .catch(() => {
      console.error("voice_reconciliation_failed");
      process.exitCode = 1;
    });
