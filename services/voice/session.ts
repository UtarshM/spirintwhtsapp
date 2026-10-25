import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import { z } from "zod";
import {
  sarvamSttUrl,
  type VoiceConfig,
  type VoiceReply,
} from "../../src/lib/voice";
import {
  cartesiaSpeech,
  sarvamReply,
  plivoRequest,
  type ChatTurn,
} from "./providers";
import {
  loadCall,
  parseAgent,
  saveTurn,
  voiceDb,
  voiceRpc,
  type CallRecord,
} from "./store";

export type VoiceSessionDependencies = {
  speech: typeof cartesiaSpeech;
  reply: typeof sarvamReply;
  record: typeof saveTurn;
  command: typeof plivoRequest;
  stt: (url: string, key: string) => WebSocket;
  rpc: typeof voiceRpc;
  healthy: (call: CallRecord) => Promise<boolean>;
  markError: (call: CallRecord, code: string) => Promise<void>;
  interrupted: (call: CallRecord, key: string) => Promise<void>;
  transferRequested: (call: CallRecord) => Promise<void>;
};
const defaults: VoiceSessionDependencies = {
  speech: cartesiaSpeech,
  reply: sarvamReply,
  record: saveTurn,
  command: plivoRequest,
  stt: (url, key) =>
    new WebSocket(url, {
      headers: { "api-subscription-key": key },
      maxPayload: 32000,
      handshakeTimeout: 5000,
    }),
  rpc: voiceRpc,
  healthy: async (call) => {
    const current = await loadCall(call.id);
    const { data: contact, error } = await voiceDb()
      .from("contacts")
      .select("consent,opted_out_at")
      .eq("workspace_id", call.workspace_id)
      .eq("id", call.contact_id)
      .single();
    if (error || !contact) throw Error("voice_contact_check_failed");
    return (
      !current.ended_at &&
      !current.stop_requested_at &&
      contact.consent &&
      !contact.opted_out_at
    );
  },
  markError: async (call, code) => {
    const { error } = await voiceDb()
      .from("calls")
      .update({ last_error: code })
      .eq("id", call.id);
    if (error) console.error("voice_persistence_failed");
  },
  interrupted: async (call, key) => {
    const { error } = await voiceDb()
      .from("call_turns")
      .update({ interrupted: true })
      .eq("call_id", call.id)
      .eq("turn_key", key);
    if (error) throw Error("voice_transcript_save_failed");
  },
  transferRequested: async (call) => {
    const { error } = await voiceDb()
      .from("calls")
      .update({ outcome: "transfer_requested" })
      .eq("id", call.id);
    if (error) throw Error("handoff_save_failed");
  },
};
const startSchema = z.object({
  event: z.literal("start"),
  start: z.object({
    callId: z.uuid(),
    streamId: z.uuid(),
    accountId: z.string(),
    mediaFormat: z.object({
      encoding: z.literal("audio/x-mulaw"),
      sampleRate: z.literal(8000),
    }),
  }),
});
const mediaSchema = z.object({
  event: z.literal("media"),
  streamId: z.string(),
  media: z.object({
    track: z.literal("inbound"),
    payload: z
      .string()
      .min(4)
      .max(16000)
      .regex(/^[A-Za-z0-9+/]+={0,2}$/),
  }),
});

export function attachVoiceSession(
  ws: WebSocket,
  call: CallRecord,
  config: VoiceConfig,
  deps: VoiceSessionDependencies = defaults,
) {
  const agent = parseAgent(call.agent_snapshot),
    history: ChatTurn[] = [];
  let stream = "",
    stt: WebSocket | undefined,
    ready = false,
    closed = false,
    transferring = false,
    epoch = 0;
  let speechEpoch = 0,
    lastFinalEpoch = -1,
    controller = new AbortController();
  let queuedAudio: string[] = [],
    queuedBytes = 0,
    pending:
      { name: string; action: VoiceReply["action"]; key: string } | undefined;
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;
  const send = (value: object) => {
    if (ws.readyState !== WebSocket.OPEN || ws.bufferedAmount > 256000)
      throw Error("voice_socket_backpressure");
    ws.send(JSON.stringify(value));
  };
  const resetSilence = () => {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => void fail("caller_silence_timeout"), 30000);
  };
  function cleanup() {
    if (closed) return;
    closed = true;
    epoch++;
    controller.abort();
    clearTimeout(startTimer);
    clearTimeout(durationTimer);
    clearTimeout(silenceTimer);
    clearInterval(healthTimer);
    if (
      stt &&
      (stt.readyState === WebSocket.OPEN ||
        stt.readyState === WebSocket.CONNECTING)
    )
      stt.close();
    queuedAudio = [];
  }
  async function end(action: "end" | "handoff" | "opt_out") {
    if (closed) return;
    if (action === "opt_out")
      await deps.rpc("voice_opt_out", { call_id: call.id });
    if (action === "handoff" && call.transfer_number) {
      transferring = true;
      try {
        await deps.transferRequested(call);
        await deps.command(config, `Call/${call.provider_id}/`, "POST", {
          legs: "aleg",
          aleg_url: `${config.publicUrl}/plivo/transfer/${call.id}`,
          aleg_method: "POST",
        });
        cleanup();
        ws.close(1000, "Transferring to team");
        return;
      } catch {
        transferring = false;
        await markError("voice_transfer_requires_reconciliation");
        await fail("voice_transfer_failed");
        return;
      }
    }
    cleanup();
    try {
      await deps.command(config, `Call/${call.provider_id}/`, "DELETE");
    } catch {
      await markError("hangup_reconciliation_required");
    }
    ws.close();
  }
  async function markError(code: string) {
    // Code only: never log raw speech, numbers or provider responses.
    try {
      await deps.markError(call, code);
    } catch {
      console.error("voice_persistence_failed");
    }
  }
  async function fail(code: string) {
    if (closed) return;
    cleanup();
    await markError(code);
    try {
      await deps.command(config, `Call/${call.provider_id}/`, "DELETE");
    } catch {
      await markError("hangup_reconciliation_required");
    }
    ws.close(1011, "Voice session ended");
  }
  function interrupt() {
    epoch++;
    controller.abort();
    controller = new AbortController();
    if (pending) {
      const interrupted = pending;
      void deps
        .interrupted(call, interrupted.key)
        .catch(() => fail("voice_transcript_save_failed"));
    }
    pending = undefined;
    if (stream) send({ event: "clearAudio", streamId: stream });
  }
  async function speak(
    speech: string,
    action: VoiceReply["action"],
    generation: number,
  ) {
    const signal = controller.signal,
      key = randomUUID();
    const audio = await deps.speech(config, agent.language, speech, signal);
    if (closed || generation !== epoch) return;
    await deps.record(call, key, "assistant", speech);
    if (closed || generation !== epoch) {
      await deps.interrupted(call, key);
      return;
    }
    history.push({ role: "assistant", content: speech });
    for (let i = 0; i < audio.length; i += 8000)
      send({
        event: "playAudio",
        media: {
          contentType: "audio/x-mulaw",
          sampleRate: 8000,
          payload: audio.subarray(i, i + 8000).toString("base64"),
        },
      });
    pending = { name: `turn-${generation}-${key}`, action, key };
    send({ event: "checkpoint", streamId: stream, name: pending.name });
    resetSilence();
  }
  async function respond(text: string) {
    interrupt();
    const generation = epoch,
      signal = controller.signal;
    await deps.record(call, randomUUID(), "user", text);
    if (closed || generation !== epoch) return;
    history.push({ role: "user", content: text });
    if (history.length > 20) history.splice(0, history.length - 20);
    const reply = await deps.reply(config, agent, history, signal);
    if (closed || generation !== epoch) return;
    // Apply suppression immediately, even if the caller interrupts the goodbye.
    if (reply.action === "opt_out")
      await deps.rpc("voice_opt_out", { call_id: call.id });
    await speak(reply.speech, reply.action, generation);
  }
  const startTimer = setTimeout(() => void fail("plivo_start_timeout"), 5000);
  const remaining = Math.max(
    1,
    agent.max_duration_seconds -
      Math.ceil((Date.now() - Date.parse(call.started_at)) / 1000),
  );
  const durationTimer = setTimeout(
    () => void end("end").catch(() => fail("voice_duration_stop_failed")),
    remaining * 1000,
  );
  let checking = false;
  const healthTimer = setInterval(() => {
    if (closed || checking) return;
    checking = true;
    void (async () => {
      if (!(await deps.healthy(call))) await end("end");
    })()
      .catch(() => fail("voice_health_check_failed"))
      .finally(() => {
        checking = false;
      });
  }, 3000);
  ws.on("message", (raw, binary) => {
    if (closed) return;
    try {
      if (binary) throw Error("invalid_voice_event");
      const event = JSON.parse(raw.toString());
      if (event.event === "start") {
        if (stream) throw Error("duplicate_voice_start");
        const parsed = startSchema.parse(event);
        if (
          parsed.start.callId !== call.provider_id ||
          parsed.start.accountId !== config.authId
        )
          throw Error("voice_call_mismatch");
        stream = parsed.start.streamId;
        clearTimeout(startTimer);
        resetSilence();
        stt = deps.stt(sarvamSttUrl(agent.language), config.sarvamKey);
        const connectTimer = setTimeout(
          () => void fail("sarvam_start_timeout"),
          5000,
        );
        stt.on("message", (raw) => {
          if (closed) return;
          try {
            const result = JSON.parse(raw.toString());
            if (result.event === "session.begin") {
              if (ready) throw Error("duplicate_stt_session");
              ready = true;
              clearTimeout(connectTimer);
              for (const audio of queuedAudio)
                stt!.send(JSON.stringify({ event: "audio_input", audio }));
              queuedAudio = [];
              queuedBytes = 0;
              const generation = epoch;
              void speak(agent.greeting, "continue", generation).catch(() => {
                if (!closed && generation === epoch)
                  void fail("voice_greeting_failed");
              });
            } else if (result.event === "vad.speech_start") {
              speechEpoch++;
              interrupt();
              resetSilence();
            } else if (result.event === "transcript.final") {
              if (typeof result.text !== "string" || !result.text.trim())
                return;
              if (lastFinalEpoch === speechEpoch) return;
              lastFinalEpoch = speechEpoch;
              const text = result.text.trim();
              if (text.length > 2000) throw Error("transcript_too_long");
              resetSilence();
              const task = respond(text),
                generation = epoch;
              void task.catch(() => {
                if (!closed && generation === epoch)
                  void fail("voice_response_failed");
              });
            } else if (
              result.event === "error" ||
              result.event === "session.end"
            )
              void fail("sarvam_stream_failed");
          } catch {
            void fail("invalid_sarvam_event");
          }
        });
        stt.on("error", () => void fail("sarvam_connection_failed"));
        stt.on("close", () => {
          clearTimeout(connectTimer);
          if (!closed) void fail("sarvam_disconnected");
        });
      } else if (event.event === "media") {
        if (!stream || !stt) throw Error("media_before_start");
        const parsed = mediaSchema.parse(event);
        if (parsed.streamId !== stream) throw Error("voice_stream_mismatch");
        if (ready && stt.readyState === WebSocket.OPEN) {
          if (stt.bufferedAmount > 64000) throw Error("stt_backpressure");
          stt.send(
            JSON.stringify({
              event: "audio_input",
              audio: parsed.media.payload,
            }),
          );
        } else {
          queuedBytes += parsed.media.payload.length;
          if (queuedBytes > 32000) throw Error("stt_connect_buffer_full");
          queuedAudio.push(parsed.media.payload);
        }
      } else if (
        event.event === "playedStream" &&
        event.streamId === stream &&
        event.name === pending?.name
      ) {
        const action = pending!.action;
        pending = undefined;
        resetSilence();
        if (action !== "continue")
          void end(action).catch(() => fail("voice_action_failed"));
      } else if (
        event.event === "dtmf" &&
        stream &&
        event.streamId === stream
      ) {
        if (event.dtmf?.digit === "0")
          void end("handoff").catch(() => fail("voice_transfer_failed"));
        if (event.dtmf?.digit === "9")
          void end("opt_out").catch(() => fail("voice_opt_out_failed"));
      } else if (event.event === "stop")
        void end("end").catch(() => fail("voice_stop_failed"));
    } catch {
      void fail("invalid_plivo_event");
    }
  });
  ws.on("close", () => {
    if (!closed && !transferring) void fail("plivo_stream_disconnected");
    else cleanup();
  });
  ws.on("error", () => void fail("plivo_stream_failed"));
  return {
    stop: () => end("end"),
    interrupt,
    get closed() {
      return closed;
    },
  };
}
