import { createServer, type IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import { z } from "zod";
import {
  streamXml,
  tokenHash,
  transferXml,
  validSessionToken,
  verifyPlivo,
  voiceConfig,
  voiceConfiguration,
} from "../../src/lib/voice";
import { attachVoiceSession } from "./session";
import { plivoFinalStatus } from "../../src/lib/voice-outcomes";
import {
  loadCall,
  parseAgent,
  voiceDb,
  voiceRpc,
  type CallRecord,
} from "./store";

async function formBody(request: IncomingMessage) {
  const contentType = request.headers["content-type"]?.split(";")[0];
  if (contentType !== "application/x-www-form-urlencoded")
    throw Error("unsupported_callback_format");
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 16000) throw Error("callback_too_large");
    chunks.push(chunk);
  }
  const form = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
  const result: Record<string, string> = Object.create(null);
  for (const [key, value] of form) {
    if (key in result) throw Error("duplicate_callback_field");
    result[key] = value;
  }
  return result;
}
function signed(
  request: IncomingMessage,
  method: "POST" | "GET",
  publicUrl: string,
  authToken: string,
  params = {},
) {
  return verifyPlivo(
    method,
    `${publicUrl}${request.url}`,
    {
      signature:
        typeof request.headers["x-plivo-signature-v3"] === "string"
          ? request.headers["x-plivo-signature-v3"]
          : undefined,
      nonce:
        typeof request.headers["x-plivo-signature-v3-nonce"] === "string"
          ? request.headers["x-plivo-signature-v3-nonce"]
          : undefined,
    },
    authToken,
    params,
  );
}
export function createVoiceServer() {
  const sockets = new WebSocketServer({
    noServer: true,
    maxPayload: 64000,
    perMessageDeflate: false,
  });
  const sessions = new Set<ReturnType<typeof attachVoiceSession>>();
  let draining = false,
    upgrading = 0;
  const server = createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    let path: URL;
    try {
      path = new URL(request.url || "/", "http://internal");
    } catch {
      response.writeHead(400).end();
      return;
    }
    if (request.method === "GET" && path.pathname === "/healthz") {
      const ready = voiceConfiguration().configured && !draining;
      response.writeHead(ready ? 200 : 503, {
        "Content-Type": "application/json",
      });
      response.end(
        JSON.stringify({
          service: "voice",
          ready,
          activeSessions: sessions.size,
        }),
      );
      return;
    }
    const match = /^\/plivo\/(answer|hangup|transfer)\/([a-f0-9-]{36})$/.exec(
      path.pathname,
    );
    if (
      !match ||
      request.method !== "POST" ||
      !z.uuid().safeParse(match[2]).success
    ) {
      response.writeHead(404).end();
      return;
    }
    try {
      const config = voiceConfig(),
        params = await formBody(request);
      if (
        !signed(request, "POST", config.publicUrl, config.authToken, params)
      ) {
        response.writeHead(401).end();
        return;
      }
      const id = match[2];
      z.uuid().parse(params.CallUUID);
      if (match[1] === "answer") {
        if (draining || !voiceConfiguration().enabled)
          throw Error("voice_not_enabled");
        const token = path.searchParams.get("token") || "",
          call = await loadCall(id);
        if (!validSessionToken(token, call.session_hash))
          throw Error("invalid_voice_session");
        if (
          params.To?.replace(/^\+?/, "+") !== call.destination ||
          params.From?.replace(/^\+?/, "+") !== call.caller_id
        )
          throw Error("call_number_mismatch");
        z.uuid().parse(params.RequestUUID);
        await voiceRpc("bind_voice_call", {
          call_id: id,
          secret_hash: tokenHash(token),
          provider_uuid: params.CallUUID,
          request_id: params.RequestUUID,
        });
        response
          .writeHead(200, { "Content-Type": "application/xml" })
          .end(streamXml(config.publicUrl, id, token));
      } else if (match[1] === "transfer") {
        const call = await loadCall(id),
          agent = parseAgent(call.agent_snapshot);
        if (
          call.provider_id !== params.CallUUID ||
          call.outcome !== "transfer_requested" ||
          call.ended_at ||
          !call.transfer_number
        )
          throw Error("transfer_not_authorized");
        const { data: contact, error } = await voiceDb()
          .from("contacts")
          .select("consent,opted_out_at")
          .eq("workspace_id", call.workspace_id)
          .eq("id", call.contact_id)
          .single();
        if (error || !contact?.consent || contact.opted_out_at)
          throw Error("contact_not_callable");
        const remaining =
          agent.max_duration_seconds -
          Math.ceil((Date.now() - Date.parse(call.started_at)) / 1000);
        response
          .writeHead(200, { "Content-Type": "application/xml" })
          .end(transferXml(call.caller_id, call.transfer_number, remaining));
      } else {
        const call = await loadCall(id);
        if (call.provider_id && call.provider_id !== params.CallUUID)
          throw Error("call_binding_conflict");
        // A never-answered call has no answer callback to bind its CallUUID.
        // Require our private callback URL capability plus the RequestUUID and signed numbers.
        const token = path.searchParams.get("token") || "";
        if (!call.provider_id) {
          if (
            !validSessionToken(token, call.session_hash) ||
            call.request_uuid !== params.RequestUUID ||
            params.To?.replace(/^\+?/, "+") !== call.destination ||
            params.From?.replace(/^\+?/, "+") !== call.caller_id
          )
            throw Error("call_binding_conflict");
          const { error } = await voiceDb()
            .from("calls")
            .update({ provider_id: params.CallUUID })
            .eq("id", id)
            .is("provider_id", null);
          if (error) throw Error("voice_callback_save_failed");
        }
        const seconds = params.BillDuration;
        if (!seconds || !/^\d{1,4}$/.test(seconds))
          throw Error("billed_duration_required");
        const status = plivoFinalStatus(params);
        if (!status) throw Error("call_outcome_requires_reconciliation");
        await voiceRpc("finish_voice_call", {
          call_id: id,
          provider_uuid: params.CallUUID,
          billed_seconds: Number(seconds),
          final_status: status,
        });
        response.writeHead(200).end("OK");
      }
    } catch {
      // Trigger provider retry on persistence failures. Answer failures end the call.
      if (match[1] === "hangup")
        response.writeHead(503).end("Callback requires reconciliation");
      else
        response
          .writeHead(200, { "Content-Type": "application/xml" })
          .end("<Response><Hangup/></Response>");
    }
  });
  const reject = (socket: Duplex) => {
    socket.end("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
  };
  server.on("upgrade", (request, socket, head) => {
    if (
      draining ||
      !voiceConfiguration().enabled ||
      sessions.size + upgrading >=
        Number(process.env.VOICE_SERVICE_MAX_SESSIONS || 20)
    ) {
      reject(socket);
      return;
    }
    upgrading++;
    const timeout = setTimeout(() => socket.destroy(), 8000);
    void (async () => {
      const config = voiceConfig(),
        path = new URL(request.url || "/", config.publicUrl);
      const match = /^\/stream\/([a-f0-9-]{36})$/.exec(path.pathname);
      if (
        !match ||
        !z.uuid().safeParse(match[1]).success ||
        !signed(request, "GET", config.publicUrl, config.authToken)
      )
        throw Error("invalid_voice_upgrade");
      const token = path.searchParams.get("token") || "",
        call = await loadCall(match[1]);
      if (!validSessionToken(token, call.session_hash))
        throw Error("invalid_voice_session");
      const claimed = (await voiceRpc("claim_voice_stream", {
        call_id: call.id,
        secret_hash: tokenHash(token),
      })) as CallRecord;
      if (socket.destroyed) throw Error("socket_closed");
      sockets.handleUpgrade(request, socket, head, (ws) => {
        const session = attachVoiceSession(ws, claimed, config);
        sessions.add(session);
        ws.on("close", () => sessions.delete(session));
      });
    })()
      .catch(() => reject(socket))
      .finally(() => {
        clearTimeout(timeout);
        upgrading--;
      });
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  return {
    server,
    async shutdown() {
      draining = true;
      await Promise.allSettled([...sessions].map((s) => s.stop()));
      sockets.close();
      server.close();
    },
  };
}
