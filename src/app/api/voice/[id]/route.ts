import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, apiError, ApiError, requireSameOrigin } from "@/lib/auth";
import { loadCallVoiceConfig } from "../../../../../services/voice/credentials";
import { plivoRequest } from "../../../../../services/voice/providers";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, service, workspaceId } = await authorize(request),
      { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new ApiError(400, "Invalid call.");
    const { data: call, error } = await service
      .from("calls")
      .select("id,status,duration_seconds,created_at,last_error,outcome")
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .single();
    if (error || !call) throw new ApiError(404, "Call not found.");
    const { data: turns, error: turnsError } = await db
      .from("call_turns")
      .select("id,role,content,interrupted,created_at")
      .eq("workspace_id", workspaceId)
      .eq("call_id", id)
      .order("created_at")
      .order("id")
      .limit(500);
    if (turnsError) throw new ApiError(503, "Transcript could not be loaded.");
    return NextResponse.json(
      { call, turns },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const { service, workspaceId, user } = await authorize(request, true),
      { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new ApiError(400, "Invalid call.");
    const { data: call, error } = await service.rpc("request_voice_stop", {
      w: workspaceId,
      actor: user.id,
      call_id: id,
    });
    if (error || !call) throw new ApiError(404, "Call not found.");
    if (call.ended_at) return NextResponse.json({ stopped: true });
    const config = await loadCallVoiceConfig(id);
    try {
      if (call.provider_id)
        await plivoRequest(config, `Call/${call.provider_id}/`, "DELETE");
      else if (call.request_uuid)
        await plivoRequest(config, `Request/${call.request_uuid}/`, "DELETE");
      // Launch can still be in flight. Its response and any answer callback honor the durable stop.
    } catch {
      throw new ApiError(
        503,
        "Stop recorded; provider confirmation requires reconciliation.",
      );
    }
    return NextResponse.json({ stopRequested: true });
  } catch (error) {
    return apiError(error);
  }
}
