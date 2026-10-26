import type { VoiceAgent, VoiceConfig } from "../../src/lib/voice";
import {
  replySchema,
  voicePrompt,
  wavToMulaw,
  voiceAgentSchema,
} from "../../src/lib/voice";

export class VoiceProviderError extends Error {
  constructor(
    public code: string,
    public uncertain = false,
  ) {
    super(code);
  }
}
async function boundedBody(response: Response, limit: number) {
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  if (!response.body) throw new VoiceProviderError("provider_empty_response");
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > limit)
        throw new VoiceProviderError("provider_response_too_large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks);
}
export async function plivoRequest(
  config: VoiceConfig,
  path: string,
  method: "POST" | "GET" | "DELETE",
  payload?: object,
  transport: typeof fetch = fetch,
) {
  if (!/^(?:Call\/(?:[0-9a-f-]{36}\/)?|Request\/[0-9a-f-]{36}\/)$/i.test(path))
    throw new VoiceProviderError("invalid_plivo_path");
  let response: Response;
  try {
    response = await transport(
      `https://api.plivo.com/v1/Account/${encodeURIComponent(config.authId)}/${path}`,
      {
        method,
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.authId}:${config.authToken}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: payload ? JSON.stringify(payload) : undefined,
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      },
    );
  } catch {
    throw new VoiceProviderError("plivo_outcome_unknown", true);
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new VoiceProviderError(
      "plivo_request_rejected",
      response.status >= 500 || [408, 409, 429].includes(response.status),
    );
  }
  if (response.status === 204) return {} as Record<string, unknown>;
  try {
    return JSON.parse(
      (await boundedBody(response, 32000)).toString(),
    ) as Record<string, unknown>;
  } catch {
    throw new VoiceProviderError("plivo_response_unknown", true);
  }
}
export type ChatTurn = { role: "user" | "assistant"; content: string };
export async function sarvamReply(
  config: VoiceConfig,
  agent: VoiceAgent,
  history: ChatTurn[],
  signal: AbortSignal,
  transport: typeof fetch = fetch,
) {
  const response = await transport(
    "https://api.sarvam.ai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "api-subscription-key": config.sarvamKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sarvam-105b-conversations",
        messages: [
          { role: "system", content: voicePrompt(agent) },
          ...history.slice(-20),
        ],
        max_tokens: 250,
        temperature: 0.3,
        reasoning_effort: null,
        response_format: { type: "json_object" },
      }),
      redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
    },
  );
  if (!response.ok) {
    await response.body?.cancel();
    throw new VoiceProviderError("sarvam_reply_failed");
  }
  const data = JSON.parse((await boundedBody(response, 32000)).toString());
  return replySchema.parse(JSON.parse(data.choices?.[0]?.message?.content));
}
export async function cartesiaSpeech(
  config: VoiceConfig,
  language: "en" | "hi",
  text: string,
  signal: AbortSignal,
  transport: typeof fetch = fetch,
): Promise<Buffer> {
  if (!text.trim() || text.length > 350)
    throw new VoiceProviderError("speech_length_invalid");
  if (!config.cartesiaKey || !config.englishVoice || !config.hindiVoice)
    throw new VoiceProviderError("cartesia_not_configured");
  const response = await transport("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.cartesiaKey}`,
      "Cartesia-Version": "2026-08-14",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_id: "sonic-3.6",
      transcript: text,
      voice: language === "hi" ? config.hindiVoice : config.englishVoice,
      language,
      output_format: {
        container: "wav",
        encoding: "pcm_s16le",
        sample_rate: 8000,
      },
    }),
    redirect: "error",
    signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new VoiceProviderError("cartesia_speech_failed");
  }
  return wavToMulaw(await boundedBody(response, 1_000_000));
}

/** Bulbul v3 raw 8 kHz mu-law: forward chunks without waiting for full synthesis. */
export async function* sarvamSpeechStream(
  config: VoiceConfig,
  agent: VoiceAgent,
  text: string,
  signal: AbortSignal,
  transport: typeof fetch = fetch,
): AsyncGenerator<Buffer> {
  if (!text.trim() || text.length > 350)
    throw new VoiceProviderError("speech_length_invalid");
  const parsed = voiceAgentSchema.parse(agent);
  const response = await transport(
    "https://api.sarvam.ai/text-to-speech/stream",
    {
      method: "POST",
      headers: {
        "api-subscription-key": config.sarvamKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model: "bulbul:v3",
        language_code: parsed.language === "hi" ? "hi-IN" : "en-IN",
        speaker: parsed.speaker,
        pace: parsed.speech_pace,
        speech_sample_rate: 8000,
        output_audio_codec: "mulaw",
      }),
      redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    },
  );
  const codec = response.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (
    !response.ok ||
    !response.body ||
    ![
      "audio/mulaw",
      "audio/x-mulaw",
      "audio/basic",
      "application/octet-stream",
    ].includes(codec || "")
  ) {
    await response.body?.cancel();
    throw new VoiceProviderError("sarvam_speech_failed");
  }
  const reader = response.body.getReader();
  let size = 0;
  try {
    for (;;) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 720000) throw new VoiceProviderError("speech_audio_too_large");
      if (!size) continue;
      const buffer = Buffer.from(value);
      for (let offset = 0; offset < buffer.length; offset += 8000) {
        signal.throwIfAborted();
        yield buffer.subarray(offset, offset + 8000);
      }
    }
    if (!size) throw new VoiceProviderError("speech_audio_empty");
  } finally {
    await reader.cancel().catch(() => {});
  }
}
export async function voiceSpeech(
  config: VoiceConfig,
  language: "en" | "hi",
  text: string,
  signal: AbortSignal,
  agent: VoiceAgent,
): Promise<Buffer | AsyncIterable<Buffer>> {
  if (agent.tts_provider === "sarvam")
    return sarvamSpeechStream(config, agent, text, signal);
  return cartesiaSpeech(config, language, text, signal);
}
