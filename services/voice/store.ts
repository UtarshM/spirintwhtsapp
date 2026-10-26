import { createClient } from "@supabase/supabase-js";
import {
  tokenHash,
  voiceAgentSchema,
  type VoiceAgent,
} from "../../src/lib/voice";
export function voiceDb() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    throw Error("voice_database_not_configured");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export type CallRecord = {
  id: string;
  workspace_id: string;
  contact_id: string;
  provider_id: string;
  request_uuid: string;
  session_hash: string;
  session_expires_at: string;
  agent_snapshot: VoiceAgent;
  caller_id: string;
  destination: string;
  transfer_number: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  stop_requested_at?: string | null;
  outcome: string | null;
  handoff_summary?: string | null;
  handoff_token_hash?: string | null;
  handoff_expires_at?: string | null;
};
export async function voiceRpc(name: string, args: object) {
  const { data, error } = await voiceDb().rpc(name, args);
  if (error) throw Error("voice_database_operation_failed");
  return data;
}
export function parseAgent(value: unknown) {
  const parsed = voiceAgentSchema.safeParse(value);
  // DB rows contain tenant metadata; explicitly select the runtime fields.
  if (parsed.success) return parsed.data;
  const source = value as Record<string, unknown>;
  return voiceAgentSchema.parse(
    Object.fromEntries(
      Object.keys(voiceAgentSchema.shape).map((k) => [k, source?.[k]]),
    ),
  );
}
export async function loadCall(
  id: string,
  token?: string,
): Promise<CallRecord> {
  const { data, error } = await voiceDb()
    .from("calls")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data || (token && data.session_hash !== tokenHash(token)))
    throw Error("invalid_voice_session");
  return data as CallRecord;
}
export async function saveTurn(
  call: CallRecord,
  key: string,
  role: "user" | "assistant" | "system",
  content: string,
) {
  const { error } = await voiceDb().from("call_turns").upsert(
    {
      call_id: call.id,
      workspace_id: call.workspace_id,
      turn_key: key,
      role,
      content,
    },
    { onConflict: "call_id,turn_key", ignoreDuplicates: true },
  );
  if (error) throw Error("voice_transcript_save_failed");
}
