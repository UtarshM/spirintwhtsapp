import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { authorize, apiError, ApiError, requireSameOrigin } from "@/lib/auth";
import {
  tokenHash,
  voiceAgentSchema,
  voiceConfiguration,
  voiceWindowsSchema,
} from "@/lib/voice";
import {
  plivoRequest,
  VoiceProviderError,
} from "../../../../services/voice/providers";
import { loadCallVoiceConfig } from "../../../../services/voice/credentials";
import { verifyPlivoCaller } from "@/lib/plivo-connection";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const fields =
  "id,contact_id,agent_id,status,duration_seconds,ai_runtime_seconds,runtime_usage_finalized,created_at,started_at,ended_at,last_error,outcome";
export async function GET(request: Request) {
  try {
    const { db, service, workspaceId, role } = await authorize(request);
    const [agents, calls, contacts, settings, acceptance, windows, workspace] =
      await Promise.all([
        db
          .from("voice_agents")
          .select(
            "id,name,language,instructions,knowledge,greeting,max_duration_seconds,max_concurrency,status",
          )
          .eq("workspace_id", workspaceId)
          .order("name"),
        service
          .from("calls")
          .select(fields)
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(100),
        db
          .from("contacts")
          .select("id,name,phone,consent,opted_out_at")
          .eq("workspace_id", workspaceId)
          .order("name")
          .limit(500),
        service
          .from("voice_settings")
          .select(
            "caller_id,transfer_number,enabled,max_concurrency,plivo_connection_id",
          )
          .eq("workspace_id", workspaceId)
          .maybeSingle(),
        service
          .from("integration_acceptances")
          .select("accepted_at,expires_at")
          .eq("workspace_id", workspaceId)
          .eq("channel", "voice")
          .maybeSingle(),
        db
          .from("sending_windows")
          .select("weekday,start_time,end_time,enabled")
          .eq("workspace_id", workspaceId)
          .eq("channel", "voice"),
        db.from("workspaces").select("timezone").eq("id", workspaceId).single(),
      ]);
    if (
      [agents, calls, contacts, settings, acceptance, windows, workspace].some(
        (r) => r.error,
      )
    )
      throw new ApiError(
        503,
        "Calling records could not be loaded. Check the database migrations.",
      );
    const config = voiceConfiguration(),
      accepted = Boolean(
        acceptance.data && Date.parse(acceptance.data.expires_at) > Date.now(),
      );
    return NextResponse.json(
      {
        agents: agents.data,
        calls: calls.data,
        contacts: contacts.data,
        settings: settings.data,
        windows: windows.data,
        timezone: workspace.data!.timezone,
        readiness: {
          configured: config.configured,
          missing: role === "agent" ? [] : config.missing,
          enabled: config.enabled,
          accepted,
          canCall:
            config.configured &&
            config.enabled &&
            accepted &&
            settings.data?.enabled === true &&
            Boolean(settings.data.plivo_connection_id),
        },
        canManage: role !== "agent",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
const launchSchema = z
  .object({
    action: z.literal("call"),
    agentId: z.uuid(),
    contactId: z.uuid(),
    requestKey: z.uuid(),
  })
  .strict();
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { service, workspaceId, user } = await authorize(request, true);
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    const reader = request.body?.getReader();
    if (!reader) throw new ApiError(400, "Calling request is empty.");
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        if (bytes > 64000)
          throw new ApiError(413, "Calling request is too large.");
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    const input = JSON.parse(raw);
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new ApiError(400, "Invalid calling request.");
    if (input.action === "windows") {
      const parsed = voiceWindowsSchema.safeParse(input.windows);
      if (!parsed.success)
        throw new ApiError(
          400,
          "Choose valid calling hours for all seven days.",
        );
      const { error } = await service.from("sending_windows").upsert(
        parsed.data.map((w) => ({
          workspace_id: workspaceId,
          channel: "voice",
          weekday: w.weekday,
          start_time: w.start,
          end_time: w.end,
          enabled: w.enabled,
        })),
        { onConflict: "workspace_id,channel,weekday" },
      );
      if (error) throw new ApiError(400, "Calling hours could not be saved.");
      return NextResponse.json({ saved: true });
    }
    if (input.action === "agent") {
      const parsed = voiceAgentSchema.safeParse(input.agent);
      if (!parsed.success)
        throw new ApiError(
          400,
          "Check agent name, instructions, greeting, language and limits.",
        );
      const { id, ...agent } = parsed.data;
      const query = id
        ? service
            .from("voice_agents")
            .update(agent)
            .eq("workspace_id", workspaceId)
            .eq("id", id)
        : service
            .from("voice_agents")
            .insert({ ...agent, workspace_id: workspaceId });
      const { data, error } = await query.select("id").single();
      if (error || !data) throw new ApiError(400, "Agent could not be saved.");
      return NextResponse.json({ id: data.id });
    }
    const parsed = launchSchema.safeParse(input);
    if (!parsed.success)
      throw new ApiError(400, "Select an account agent and contact.");
    if (!voiceConfiguration().configured || !voiceConfiguration().enabled)
      throw new ApiError(
        503,
        "Calling is disabled until the AWS service, provider settings and acceptance tests are complete.",
      );
    const token = randomBytes(32).toString("base64url"),
      hash = tokenHash(token);
    const { data: call, error } = await service.rpc("prepare_voice_call", {
      w: workspaceId,
      actor: user.id,
      a: parsed.data.agentId,
      c: parsed.data.contactId,
      k: parsed.data.requestKey,
      secret_hash: hash,
    });
    if (error || !call) {
      const allowed = [
        "voice_acceptance_required",
        "voice_settings_required",
        "agent_not_ready",
        "contact_not_callable",
        "destination_not_allowed",
        "outside_calling_window",
        "workspace_call_limit",
        "agent_call_limit",
        "approved_voice_rate_required",
        "insufficient_credits",
        "idempotency_conflict",
        "plivo_connection_required",
        "plivo_caller_not_owned",
      ];
      const code = allowed.find((c) => error?.message.includes(c));
      throw new ApiError(
        409,
        code
          ? code.replaceAll("_", " ")
          : "Call preparation could not be completed.",
      );
    }
    // A repeated request can only observe the original call; never dial it again.
    if (call.session_hash !== hash)
      return NextResponse.json({
        callId: call.id,
        status: call.status,
        replay: true,
      });
    let config;
    try {
      config = await loadCallVoiceConfig(call.id);
      await verifyPlivoCaller(config, call.caller_id);
    } catch {
      const { error: releaseError } = await service.rpc("reject_voice_call", {
        call_id: call.id,
        safe_code: "plivo_caller_verification_failed",
      });
      if (releaseError)
        throw new ApiError(
          503,
          "Calling setup needs reconciliation. No automatic retry will occur.",
        );
      throw new ApiError(
        502,
        "Your Plivo connection or calling number could not be verified. No call was placed.",
      );
    }
    try {
      const result = await plivoRequest(config, "Call/", "POST", {
        from: call.caller_id,
        to: call.destination,
        answer_url: `${config.publicUrl}/plivo/answer/${call.id}?token=${token}`,
        answer_method: "POST",
        hangup_url: `${config.publicUrl}/plivo/hangup/${call.id}?token=${token}`,
        hangup_method: "POST",
        time_limit: call.agent_snapshot.max_duration_seconds,
        hangup_on_ring: 30,
      });
      const requestId = z.uuid().safeParse(result.request_uuid);
      if (!requestId.success)
        throw new VoiceProviderError("plivo_response_unknown", true);
      const { data: saved, error: saveError } = await service
        .from("calls")
        .update({ request_uuid: requestId.data })
        .eq("id", call.id)
        .or(`request_uuid.is.null,request_uuid.eq.${requestId.data}`)
        .select("id,stop_requested_at")
        .single();
      if (saveError)
        throw new VoiceProviderError("call_save_requires_reconciliation", true);
      if (saved?.stop_requested_at) {
        await plivoRequest(config, `Request/${requestId.data}/`, "DELETE");
        return NextResponse.json({ callId: call.id, status: "stop_requested" });
      }
      return NextResponse.json(
        { callId: call.id, status: "initiated" },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof VoiceProviderError && !error.uncertain) {
        const { error: rejectError } = await service.rpc("reject_voice_call", {
          call_id: call.id,
          safe_code: error.code,
        });
        if (rejectError)
          throw new ApiError(
            503,
            "Call outcome needs reconciliation. Do not redial.",
          );
        throw new ApiError(
          502,
          "Plivo rejected this call. Reserved credits were released.",
        );
      }
      await service
        .from("calls")
        .update({ last_error: "dial_requires_reconciliation" })
        .eq("id", call.id);
      throw new ApiError(
        503,
        "Call outcome needs reconciliation. Do not redial; reserved credits are held until confirmed.",
      );
    }
  } catch (error) {
    return apiError(error);
  }
}
