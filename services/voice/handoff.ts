import { randomBytes } from "node:crypto";
import {
  tokenHash,
  type VoiceConfig,
  type VoiceAgent,
} from "../../src/lib/voice";
import { analyzeTranscript } from "./analyze-provider";
import { voiceDb, type CallRecord } from "./store";
export async function prepareHandoff(call: CallRecord, config: VoiceConfig) {
  const warm = (call.agent_snapshot as VoiceAgent).transfer_mode !== "cold";
  let summary: string | null = null;
  let token: string | undefined;
  if (warm) {
    const { data, error } = await voiceDb()
      .from("call_turns")
      .select("role,content")
      .eq("workspace_id", call.workspace_id)
      .eq("call_id", call.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(20);
    if (error) throw Error("handoff_transcript_unavailable");
    const transcript = (data || [])
      .reverse()
      .map((t) => `${t.role}: ${t.content}`)
      .join("\n");
    summary =
      data?.some((t) => t.role === "user") && transcript.trim()
        ? (await analyzeTranscript(config, transcript, [])).summary.slice(
            0,
            500,
          )
        : "The caller requested a human teammate. No conversation details are available.";
    token = randomBytes(32).toString("base64url");
  }
  const { data, error } = await voiceDb()
    .from("calls")
    .update({
      outcome: "transfer_requested",
      handoff_summary: summary,
      handoff_token_hash: token ? tokenHash(token) : null,
      handoff_expires_at: token
        ? new Date(Date.now() + 120000).toISOString()
        : null,
    })
    .eq("workspace_id", call.workspace_id)
    .eq("id", call.id)
    .is("ended_at", null)
    .is("stop_requested_at", null)
    .select("id")
    .single();
  if (error || !data) throw Error("handoff_save_failed");
  return token;
}
