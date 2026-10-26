import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import WebSocket from "ws";
import {
  tokenHash,
  validSessionToken,
  verifyPlivo,
  voiceConfiguration,
  streamXml,
  transferXml,
  wavToMulaw,
  replySchema,
  voiceWindowsSchema,
  type VoiceConfig,
} from "../src/lib/voice";
import {
  cartesiaSpeech,
  plivoRequest,
  sarvamReply,
  VoiceProviderError,
} from "../services/voice/providers";
import {
  attachVoiceSession,
  type VoiceSessionDependencies,
} from "../services/voice/session";
import type { CallRecord } from "../services/voice/store";
const config: VoiceConfig = {
  publicUrl: "https://voice.example.com",
  authId: "MAfake",
  authToken: "private-test-token",
  sarvamKey: "sarvam-test-key",
  cartesiaKey: "cartesia-test-key",
  englishVoice: "11111111-1111-4111-8111-111111111111",
  hindiVoice: "22222222-2222-4222-8222-222222222222",
};
const call: CallRecord = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  workspace_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  contact_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  provider_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  request_uuid: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  session_hash: "",
  session_expires_at: "",
  caller_id: "+12025550123",
  destination: "+919876543210",
  transfer_number: "+12025550124",
  status: "in_progress",
  started_at: new Date().toISOString(),
  ended_at: null,
  outcome: null,
  agent_snapshot: {
    name: "Test",
    language: "hi",
    instructions: "Qualify politely and stop when asked.",
    knowledge: "Business hours 9 to 5.",
    greeting: "Hello, I am your AI assistant.",
    max_duration_seconds: 60,
    max_concurrency: 1,
    status: "ready",
  },
};
function wav() {
  const value = Buffer.alloc(52);
  value.write("RIFF");
  value.writeUInt32LE(44, 4);
  value.write("WAVEfmt ", 8);
  value.writeUInt32LE(16, 16);
  value.writeUInt16LE(1, 20);
  value.writeUInt16LE(1, 22);
  value.writeUInt32LE(8000, 24);
  value.writeUInt32LE(16000, 28);
  value.writeUInt16LE(2, 32);
  value.writeUInt16LE(16, 34);
  value.write("data", 36);
  value.writeUInt32LE(8, 40);
  value.writeInt16LE(0, 44);
  value.writeInt16LE(1000, 46);
  value.writeInt16LE(-1000, 48);
  value.writeInt16LE(32767, 50);
  return value;
}
test("voice gates reject missing configuration and malformed public origins", () => {
  assert.equal(voiceConfiguration({}).configured, false);
  const env = {
    VOICE_PUBLIC_URL: "https://voice.example.com",
    AWS_REGION: "ap-south-1",
    AWS_KMS_KEY_ID: "test-key",
    SARVAM_API_KEY: "c",
    CARTESIA_API_KEY: "d",
    CARTESIA_VOICE_EN: config.englishVoice,
    CARTESIA_VOICE_HI: config.hindiVoice,
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "e",
  };
  assert.equal(voiceConfiguration(env).configured, true);
  assert.equal(voiceConfiguration(env).enabled, false);
  for (const url of [
    "http://voice.example.com",
    "https://voice.example.com/path",
    "https://user:pass@voice.example.com",
    "https://voice.example.com?token=x",
  ])
    assert.equal(
      voiceConfiguration({ ...env, VOICE_PUBLIC_URL: url }).configured,
      false,
    );
});
test("Plivo V3 SDK verifies official canonical form and rejects body/URL changes", () => {
  const url = "https://voice.example.com/plivo/answer",
    nonce = "123456789",
    params = { CallUUID: call.provider_id, To: call.destination };
  // SDK's published V3 POST construction: URL + '?' + sorted key/value pairs + '.' + nonce.
  const base = `${url}?CallUUID${params.CallUUID}To${params.To}.${nonce}`;
  const signature = createHmac("sha256", config.authToken)
    .update(base)
    .digest("base64");
  assert.equal(
    verifyPlivo("POST", url, { nonce, signature }, config.authToken, params),
    true,
  );
  assert.equal(
    verifyPlivo("POST", url, { nonce, signature }, config.authToken, {
      ...params,
      To: "+12025550999",
    }),
    false,
  );
  assert.equal(
    verifyPlivo(
      "POST",
      url + "/other",
      { nonce, signature },
      config.authToken,
      params,
    ),
    false,
  );
  assert.equal(
    verifyPlivo("POST", url, { nonce }, config.authToken, params),
    false,
  );
  const getSignature = createHmac("sha256", config.authToken)
    .update(`${url}?a=1&b=2.${nonce}`)
    .digest("base64");
  assert.equal(
    verifyPlivo(
      "GET",
      `${url}?b=2&a=1`,
      { nonce, signature: getSignature },
      config.authToken,
    ),
    true,
  );
});
test("voice capabilities and XML cannot inject a destination or arbitrary stream", () => {
  const token = randomBytes(32).toString("base64url");
  assert.equal(validSessionToken(token, tokenHash(token)), true);
  assert.equal(validSessionToken(token + "x", tokenHash(token)), false);
  assert.equal(validSessionToken(token, "a".repeat(64)), false);
  assert.match(
    streamXml(config.publicUrl, call.id, token),
    /wss:\/\/voice.example.com\/stream/,
  );
  assert.match(
    streamXml(config.publicUrl, call.id, token),
    /keepCallAlive="true"/,
  );
  assert.match(
    streamXml(config.publicUrl, call.id, token),
    /<Wait length="30"\/><Hangup\/>/,
  );
  assert.throws(() => transferXml(call.caller_id, "<Number>evil</Number>", 60));
  assert.throws(() => transferXml(call.caller_id, call.destination, -1));
  assert.equal(
    replySchema.safeParse({
      speech: "ok",
      action: "transfer",
      phone: call.destination,
    }).success,
    false,
  );
});
test("Cartesia WAV is validated and converted to correct G.711 samples", () => {
  assert.deepEqual([...wavToMulaw(wav())], [255, 206, 78, 128]);
  const stereo = wav();
  stereo.writeUInt16LE(2, 22);
  assert.throws(() => wavToMulaw(stereo));
  const wrongRate = wav();
  wrongRate.writeUInt32LE(16000, 24);
  assert.throws(() => wavToMulaw(wrongRate));
  assert.throws(() => wavToMulaw(wav().subarray(0, 48)));
});
test("voice providers use fixed endpoints, pinned models and bounded structured responses", async () => {
  let body: Record<string, unknown> = {};
  const transport = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    body = JSON.parse(init!.body as string);
    if (String(url).includes("cartesia")) {
      assert.equal(
        new Headers(init?.headers).get("cartesia-version"),
        "2026-08-14",
      );
      return new Response(wav());
    }
    assert.equal(String(url), "https://api.sarvam.ai/v1/chat/completions");
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              speech: "How can I help?",
              action: "continue",
            }),
          },
        },
      ],
    });
  }) as typeof fetch;
  await cartesiaSpeech(
    config,
    "hi",
    "Hello",
    new AbortController().signal,
    transport,
  );
  assert.equal(body.voice, config.hindiVoice);
  const reply = await sarvamReply(
    config,
    call.agent_snapshot,
    [{ role: "user", content: "hello" }],
    new AbortController().signal,
    transport,
  );
  assert.equal(reply.action, "continue");
  assert.equal(body.model, "sarvam-105b-conversations");
  await assert.rejects(() =>
    sarvamReply(
      config,
      call.agent_snapshot,
      [],
      new AbortController().signal,
      (async () =>
        Response.json({
          choices: [
            { message: { content: '{"speech":"bad","action":"charge_card"}' } },
          ],
        })) as typeof fetch,
    ),
  );
});
test("dial timeouts are uncertain and never automatically retried", async () => {
  let attempts = 0;
  await assert.rejects(
    () =>
      plivoRequest(config, "Call/", "POST", {}, (async () => {
        attempts++;
        throw Error("timeout");
      }) as typeof fetch),
    (e: unknown) => e instanceof VoiceProviderError && e.uncertain,
  );
  assert.equal(attempts, 1);
  let cancelUrl = "";
  await plivoRequest(
    config,
    `Request/${call.request_uuid}/`,
    "DELETE",
    undefined,
    (async (url) => {
      cancelUrl = String(url);
      return new Response(null, { status: 204 });
    }) as typeof fetch,
  );
  assert.ok(cancelUrl.endsWith(`/Request/${call.request_uuid}/`));
  await assert.rejects(() => plivoRequest(config, "Request/", "DELETE"));
  await assert.rejects(
    () =>
      plivoRequest(
        config,
        "Call/",
        "POST",
        {},
        (async () => new Response("rejected", { status: 401 })) as typeof fetch,
      ),
    (e: unknown) => e instanceof VoiceProviderError && !e.uncertain,
  );
});
test("account calling hours require seven distinct days and valid, ordered times", () => {
  const windows = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    start: "09:00",
    end: "18:00",
    enabled: true,
  }));
  assert.equal(voiceWindowsSchema.safeParse(windows).success, true);
  assert.equal(voiceWindowsSchema.safeParse(windows.slice(1)).success, false);
  assert.equal(
    voiceWindowsSchema.safeParse(windows.map((w) => ({ ...w, weekday: 1 })))
      .success,
    false,
  );
  assert.equal(
    voiceWindowsSchema.safeParse(
      windows.map((w) => ({ ...w, start: "19:00", end: "09:00" })),
    ).success,
    false,
  );
});
class Socket extends EventEmitter {
  readyState: number = WebSocket.OPEN;
  bufferedAmount = 0;
  sent: Record<string, any>[] = [];
  send(raw: string) {
    this.sent.push(JSON.parse(raw));
  }
  close() {
    if (this.readyState === WebSocket.CLOSED) return;
    this.readyState = WebSocket.CLOSED;
    this.emit("close");
  }
  receive(value: object) {
    this.emit("message", Buffer.from(JSON.stringify(value)), false);
  }
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
function harness(overrides: Partial<VoiceSessionDependencies> = {}) {
  const socket = new Socket(),
    stt = new Socket(),
    turns: { role: string; content: string }[] = [],
    commands: string[] = [],
    rpcs: string[] = [],
    errors: string[] = [],
    interrupted: string[] = [];
  const deps: VoiceSessionDependencies = {
    speech: async () => Buffer.alloc(1600),
    reply: async () => ({ speech: "Happy to help", action: "continue" }),
    record: async (_call, _key, role, content) => {
      turns.push({ role, content });
    },
    command: async (_config, path, method) => {
      commands.push(`${method} ${path}`);
      return {};
    },
    stt: () => stt as unknown as WebSocket,
    rpc: async (name) => {
      rpcs.push(name);
    },
    healthy: async () => true,
    markError: async (_call, code) => {
      errors.push(code);
    },
    interrupted: async (_call, key) => {
      interrupted.push(key);
    },
    transferRequested: async () => {},
    finalizeUsage: async () => {},
    ...overrides,
  };
  const session = attachVoiceSession(
    socket as unknown as WebSocket,
    { ...call, started_at: new Date().toISOString() },
    config,
    deps,
  );
  const start = () => {
    socket.receive({
      event: "start",
      start: {
        callId: call.provider_id,
        streamId: call.request_uuid,
        accountId: config.authId,
        mediaFormat: { encoding: "audio/x-mulaw", sampleRate: 8000 },
      },
    });
    stt.receive({ event: "session.begin" });
  };
  return {
    socket,
    stt,
    turns,
    commands,
    rpcs,
    errors,
    interrupted,
    session,
    start,
  };
}
test("audio session greets, forwards audio, recognizes speech and persists responses", async () => {
  const h = harness();
  h.start();
  await tick();
  h.socket.receive({
    event: "media",
    streamId: call.request_uuid,
    media: { track: "inbound", payload: Buffer.alloc(160).toString("base64") },
  });
  assert.equal(h.stt.sent.at(-1)?.event, "audio_input");
  h.stt.receive({ event: "vad.speech_start" });
  h.stt.receive({ event: "transcript.final", text: "Tell me more" });
  await tick();
  await tick();
  assert.ok(
    h.turns.some((t) => t.role === "user" && t.content === "Tell me more"),
  );
  assert.ok(
    h.turns.some(
      (t) => t.role === "assistant" && t.content === "Happy to help",
    ),
  );
  assert.ok(h.socket.sent.some((e) => e.event === "clearAudio"));
  assert.equal(h.interrupted.length, 1);
  await h.session.stop();
});
test("barge-in cancels an in-flight response without ending the call or playing stale speech", async () => {
  let resolveSpeech: (audio: Buffer) => void = () => {};
  const h = harness({
    speech: async () =>
      new Promise<Buffer>((resolve) => {
        resolveSpeech = resolve;
      }),
  });
  h.start();
  h.stt.receive({ event: "vad.speech_start" });
  resolveSpeech(Buffer.alloc(1600));
  await tick();
  assert.equal(h.socket.sent.filter((e) => e.event === "playAudio").length, 0);
  assert.equal(h.session.closed, false);
  await h.session.stop();
});
test("opt-out suppresses immediately and ends after playback; malformed events fail closed", async () => {
  const h = harness({
    reply: async () => ({ speech: "We will stop calling.", action: "opt_out" }),
  });
  h.start();
  await tick();
  h.stt.receive({ event: "vad.speech_start" });
  h.stt.receive({ event: "transcript.final", text: "Stop calling me" });
  await tick();
  await tick();
  assert.ok(h.rpcs.includes("voice_opt_out"));
  const checkpoint = h.socket.sent
    .filter((e) => e.event === "checkpoint")
    .at(-1)!;
  h.socket.receive({
    event: "playedStream",
    streamId: call.request_uuid,
    name: checkpoint.name,
  });
  await tick();
  assert.ok(h.commands.some((c) => c.startsWith("DELETE")));
  assert.equal(h.session.closed, true);
  const bad = harness();
  bad.socket.receive({ event: "media", media: { payload: "invalid" } });
  await tick();
  assert.ok(bad.errors.includes("invalid_plivo_event"));
  assert.equal(bad.session.closed, true);
});
test("human handoff uses only the configured server callback after playback", async () => {
  let transferSaved = false;
  const h = harness({
    reply: async () => ({
      speech: "Connecting you to our team.",
      action: "handoff",
    }),
    transferRequested: async () => {
      transferSaved = true;
    },
  });
  h.start();
  await tick();
  h.stt.receive({ event: "vad.speech_start" });
  h.stt.receive({ event: "transcript.final", text: "Can I speak to someone?" });
  await tick();
  await tick();
  assert.equal(transferSaved, false);
  const checkpoint = h.socket.sent
    .filter((e) => e.event === "checkpoint")
    .at(-1)!;
  h.socket.receive({
    event: "playedStream",
    streamId: call.request_uuid,
    name: checkpoint.name,
  });
  await tick();
  assert.equal(transferSaved, true);
  assert.ok(h.commands.some((c) => c.startsWith("POST Call/")));
  assert.equal(h.session.closed, true);
  assert.equal(h.socket.readyState, WebSocket.CLOSED);
  assert.equal(
    h.commands.some((c) => c.startsWith("DELETE")),
    false,
  );
});
test("caller silence ends the stream and requests provider hangup", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  const h = harness();
  h.start();
  await tick();
  t.mock.timers.tick(30001);
  await tick();
  assert.equal(h.session.closed, true);
  assert.ok(h.errors.includes("caller_silence_timeout"));
  assert.ok(h.commands.some((c) => c.startsWith("DELETE")));
});
test("a speech provider disconnect ends the call rather than continuing without recognition", async () => {
  const h = harness();
  h.start();
  await tick();
  h.stt.close();
  await tick();
  assert.equal(h.session.closed, true);
  assert.ok(h.errors.includes("sarvam_disconnected"));
  assert.ok(h.commands.some((c) => c.startsWith("DELETE")));
});

test("runtime usage is finalized once before provider hangup, including unexpected disconnect", async () => {
  let release: () => void = () => {};
  let meters = 0;
  const h = harness({
    finalizeUsage: async () => {
      meters++;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    },
  });
  h.start();
  const stopping = h.session.stop();
  await tick();
  assert.equal(h.commands.length, 0);
  assert.equal(h.session.closed, true);
  h.socket.close();
  release();
  await stopping;
  assert.equal(meters, 1);
  assert.equal(h.commands.filter((c) => c.startsWith("DELETE")).length, 1);
  let disconnectedMeter = 0;
  const other = harness({
    finalizeUsage: async () => {
      disconnectedMeter++;
    },
  });
  other.socket.close();
  await tick();
  assert.equal(disconnectedMeter, 1);
});
test("meter persistence failure holds settlement but still terminates audio and provider call", async () => {
  const h = harness({
    finalizeUsage: async () => {
      throw Error("db offline");
    },
  });
  h.start();
  await h.session.stop();
  assert.ok(h.errors.includes("voice_runtime_usage_requires_reconciliation"));
  assert.ok(h.commands.some((c) => c.startsWith("DELETE")));
  assert.equal(h.socket.readyState, WebSocket.CLOSED);
});
