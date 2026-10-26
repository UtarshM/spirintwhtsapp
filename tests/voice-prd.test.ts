import { test } from "node:test";
import assert from "node:assert/strict";
import { sarvamSpeechStream } from "../services/voice/providers";
import {
  voiceAgentSchema,
  voicePrompt,
  transferXml,
  handoffWhisperXml,
  voiceConfiguration,
  voiceSpeechReady,
  type VoiceConfig,
} from "../src/lib/voice";
import { analyzeTranscript } from "../services/voice/analyze-provider";
import {
  processVoiceAnalyses,
  type AnalysisDependencies,
} from "../services/voice/analysis";
const agent = voiceAgentSchema.parse({
  name: "Test",
  language: "hi",
  tts_provider: "sarvam",
  speaker: "ritu",
  speech_pace: 1.2,
  instructions: "Help with product information.",
  knowledge: "",
  greeting: "Hello, I am the AI assistant.",
  max_duration_seconds: 60,
  max_concurrency: 1,
  status: "ready",
  qualification_questions: ["What is your budget?"],
  end_call_rules: "End after the caller says goodbye.",
});
const config: VoiceConfig = {
  publicUrl: "https://voice.example.com",
  authId: "MACUSTOMERTEST",
  authToken: "fake-test-token",
  sarvamKey: "test-sarvam",
  cartesiaKey: "",
  englishVoice: "",
  hindiVoice: "",
};
test("Bulbul streams raw 8 kHz audio with the saved voice/speed and cancels on barge-in", async () => {
  const abort = new AbortController();
  let cancelled = false;
  let audio: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      audio = controller;
    },
    cancel() {
      cancelled = true;
    },
  });
  const transport: typeof fetch = async (url, init) => {
    assert.equal(String(url), "https://api.sarvam.ai/text-to-speech/stream");
    assert.equal(
      (init?.headers as Record<string, string>)["api-subscription-key"],
      "test-sarvam",
    );
    assert.deepEqual(JSON.parse(String(init?.body)), {
      text: "Hello",
      model: "bulbul:v3",
      language_code: "hi-IN",
      speaker: "ritu",
      pace: 1.2,
      speech_sample_rate: 8000,
      output_audio_codec: "mulaw",
    });
    return new Response(stream, { headers: { "content-type": "audio/mulaw" } });
  };
  const speech = sarvamSpeechStream(
    config,
    agent,
    "Hello",
    abort.signal,
    transport,
  );
  const first = speech.next();
  audio!.enqueue(new Uint8Array(160));
  assert.equal((await first).value?.length, 160);
  abort.abort();
  await assert.rejects(() => speech.next());
  assert.equal(cancelled, true);
});
test("Bulbul rejects wrong formats, oversized audio and invalid voice controls", async () => {
  await assert.rejects(
    async () => {
      for await (const _ of sarvamSpeechStream(
        config,
        agent,
        "Hello",
        new AbortController().signal,
        async () =>
          new Response("secret response", {
            headers: { "content-type": "application/json" },
          }),
      ))
        void _;
    },
    { message: "sarvam_speech_failed" },
  );
  await assert.rejects(
    async () => {
      for await (const _ of sarvamSpeechStream(
        config,
        agent,
        "Hello",
        new AbortController().signal,
        async () =>
          new Response(Buffer.alloc(720001), {
            headers: { "content-type": "audio/mulaw" },
          }),
      ))
        void _;
    },
    { message: "speech_audio_too_large" },
  );
  assert.equal(
    voiceAgentSchema.safeParse({ ...agent, speaker: "unknown" }).success,
    false,
  );
  assert.equal(
    voiceAgentSchema.safeParse({ ...agent, speech_pace: 3 }).success,
    false,
  );
  assert.equal(
    voiceAgentSchema.safeParse({
      ...agent,
      qualification_questions: Array(11).fill("A question?"),
    }).success,
    false,
  );
  assert.ok(voicePrompt(agent).includes("What is your budget?"));
  assert.ok(voicePrompt(agent).includes(agent.end_call_rules));
  assert.equal(voiceSpeechReady(config, agent), true);
  assert.equal(
    voiceSpeechReady(config, {
      ...agent,
      tts_provider: "cartesia",
      speech_pace: 1,
    }),
    false,
  );
  assert.equal(
    voiceConfiguration({
      VOICE_PUBLIC_URL: "https://voice.example.com",
      AWS_REGION: "ap-south-1",
      AWS_KMS_KEY_ID: "test",
      SARVAM_API_KEY: "test",
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test",
    }).configured,
    true,
  );
});
test("warm transfer requires human confirmation and escapes summary content", () => {
  const xml = transferXml(
    "+12025550123",
    "+12025550124",
    60,
    "https://voice.example.com/plivo/handoff-whisper/test?handoff=secret&x=1",
  );
  assert.ok(xml.includes('confirmKey="1"'));
  assert.ok(xml.includes('confirmTimeout="20"'));
  assert.ok(xml.includes("&amp;x=1"));
  assert.ok(
    !handoffWhisperXml("Caller said <Hangup/> & hello").includes("<Hangup/>"),
  );
  assert.ok(
    handoffWhisperXml("Caller wants product information.").includes("Press 1"),
  );
  assert.throws(() =>
    transferXml("+12025550123", "+12025550124", 60, "http://unsafe.example"),
  );
});
const result = {
  summary: "The caller asked about pricing.",
  outcome: "interested",
  answers: [{ question: "What is your budget?", answer: null }],
};
const api = (value: unknown) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(value) } }],
    }),
  );
test("call analysis validates structured results and exact qualification questions", async () => {
  const analyzed = await analyzeTranscript(
    config,
    "user: Tell me the price.",
    agent.qualification_questions,
    async (url, init) => {
      assert.equal(String(url), "https://api.sarvam.ai/v1/chat/completions");
      const body = JSON.parse(String(init?.body));
      assert.ok(body.messages[0].content.includes("untrusted"));
      return api(result);
    },
  );
  assert.deepEqual(analyzed, result);
  await assert.rejects(
    () =>
      analyzeTranscript(
        config,
        "user: Tell me more.",
        agent.qualification_questions,
        async () =>
          api({
            ...result,
            answers: [{ question: "Invented question?", answer: "Invented" }],
          }),
      ),
    { message: "analysis_question_mismatch" },
  );
  await assert.rejects(() =>
    analyzeTranscript(config, "user: Tell me more.", [], async () =>
      api({ ...result, outcome: "booked", answers: [] }),
    ),
  );
});
test("analysis jobs keep failures isolated, skip empty transcripts, and remain inactive by default", async () => {
  const jobs = ["bad", "good", "no-answer"].map((call_id) => ({
    call_id,
    workspace_id: "workspace",
    lease_token: call_id,
  }));
  const completions: { id: string; outcome: string }[] = [],
    failures: string[] = [];
  let analyzed = 0;
  const deps: AnalysisDependencies = {
    enabled: () => false,
    claim: async () => jobs,
    load: async (job) => ({
      status: job.call_id === "no-answer" ? "no-answer" : "completed",
      transcript: job.call_id === "no-answer" ? null : `user: ${job.call_id}`,
      questions: [],
    }),
    analyze: async (input) => {
      analyzed++;
      if (input.transcript?.includes("bad")) throw Error("private transcript");
      return {
        summary: "Caller wants details.",
        outcome: "interested",
        answers: [],
      };
    },
    complete: async (job, result) => {
      completions.push({ id: job.call_id, outcome: result.outcome });
    },
    fail: async (job) => {
      failures.push(job.call_id);
    },
  };
  assert.deepEqual(await processVoiceAnalyses(deps), {
    disabled: true,
    complete: 0,
    failed: 0,
  });
  assert.equal(analyzed, 0);
  deps.enabled = () => true;
  assert.deepEqual(await processVoiceAnalyses(deps), {
    disabled: false,
    complete: 2,
    failed: 1,
  });
  assert.equal(analyzed, 2);
  assert.deepEqual(failures, ["bad"]);
  assert.deepEqual(completions, [
    { id: "good", outcome: "interested" },
    { id: "no-answer", outcome: "no_answer" },
  ]);
});
