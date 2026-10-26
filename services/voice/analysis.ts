import { voiceDb, voiceRpc, parseAgent } from "./store";
import { analyzeTranscript } from "./analyze-provider";
import type { CallAnalysis } from "../../src/lib/call-analysis";
export type AnalysisJob = {
  call_id: string;
  workspace_id: string;
  lease_token: string;
};
export type AnalysisInput = {
  transcript: string | null;
  status: string;
  questions: string[];
};
export type AnalysisDependencies = {
  enabled: () => boolean;
  claim: () => Promise<AnalysisJob[]>;
  load: (job: AnalysisJob) => Promise<AnalysisInput>;
  analyze: (input: AnalysisInput) => Promise<CallAnalysis>;
  complete: (job: AnalysisJob, result: CallAnalysis) => Promise<void>;
  fail: (job: AnalysisJob) => Promise<void>;
};
const defaults: AnalysisDependencies = {
  enabled: () =>
    process.env.VOICE_CALLING_ENABLED === "true" &&
    Boolean(process.env.SARVAM_API_KEY),
  claim: () => voiceRpc("claim_voice_analyses", { batch_size: 5 }),
  load: async (job) => {
    const { data, error } = await voiceDb()
      .from("calls")
      .select("transcript,status,agent_snapshot,ended_at")
      .eq("workspace_id", job.workspace_id)
      .eq("id", job.call_id)
      .single();
    if (error || !data?.ended_at) throw Error("analysis_call_unavailable");
    const { data: callerTurns, error: turnsError } = await voiceDb()
      .from("call_turns")
      .select("id")
      .eq("workspace_id", job.workspace_id)
      .eq("call_id", job.call_id)
      .eq("role", "user")
      .limit(1);
    if (turnsError) throw Error("analysis_transcript_unavailable");
    const agent = parseAgent(data.agent_snapshot);
    return {
      transcript: callerTurns?.length ? data.transcript : null,
      status: data.status,
      questions: agent.qualification_questions || [],
    };
  },
  analyze: (input) =>
    analyzeTranscript(
      { sarvamKey: process.env.SARVAM_API_KEY! },
      input.transcript!,
      input.questions,
    ),
  complete: async (job, result) => {
    await voiceRpc("complete_voice_analysis", {
      call_id: job.call_id,
      lease: job.lease_token,
      result,
    });
  },
  fail: async (job) => {
    await voiceRpc("fail_voice_analysis", {
      call_id: job.call_id,
      lease: job.lease_token,
    });
  },
};
export async function processVoiceAnalyses(
  deps: AnalysisDependencies = defaults,
) {
  if (!deps.enabled()) return { disabled: true, complete: 0, failed: 0 };
  let complete = 0,
    failed = 0;
  for (const job of await deps.claim()) {
    try {
      const input = await deps.load(job);
      // Never send an absent transcript to an LLM or invent an answered outcome.
      const result: CallAnalysis = !input.transcript?.trim()
        ? {
            summary: ["no-answer", "busy", "cancel"].includes(input.status)
              ? "The call did not connect to a conversation."
              : "No transcript is available for this call.",
            outcome: ["no-answer", "busy", "cancel"].includes(input.status)
              ? "no_answer"
              : "unclassified",
            answers: input.questions.map((question) => ({
              question,
              answer: null,
            })),
          }
        : await deps.analyze(input);
      await deps.complete(job, result);
      complete++;
    } catch {
      failed++;
      // A persistence error keeps the lease; expiry safely permits another worker.
      await deps
        .fail(job)
        .catch(() => console.error("voice_analysis_retry_save_failed"));
    }
  }
  return { disabled: false, complete, failed };
}
if (typeof require === "function" && require.main === module)
  void processVoiceAnalyses()
    .then((result) => console.log("voice_analysis_complete", result))
    .catch(() => {
      console.error("voice_analysis_failed");
      process.exitCode = 1;
    });
