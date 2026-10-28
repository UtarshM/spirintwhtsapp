import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, apiError, ApiError, requireSameOrigin } from "@/lib/auth";
import {
  encryptPlivoCredentials,
  plivoCredentialsSchema,
  plivoStorageConfigured,
  verifyPlivoAccount,
  PlivoConnectionError,
} from "@/lib/plivo-connection";
import { phoneSchema } from "@/lib/voice";
import { loadWorkspacePlivoCredentials } from "../../../../../services/voice/credentials";
import { getAppUrl } from "@/lib/app-url";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { service, workspaceId, role } = await authorize(request);
    const { data, error } = await service
      .from("plivo_connections")
      .select("id,auth_id,status,last_verified_at,phone_numbers")
      .eq("workspace_id", workspaceId)
      .eq("status", "connected")
      .maybeSingle();
    const settings = await service
      .from("voice_settings")
      .select("caller_id,transfer_number,plivo_connection_id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error || settings.error)
      throw new ApiError(503, "Plivo connection records are unavailable.");
    const connection =
      data && settings.data && settings.data.plivo_connection_id === data.id
        ? {
            id: data.id,
            authIdMasked: `${data.auth_id.slice(0, 2)}••••••${data.auth_id.slice(-4)}`,
            status: "connected",
            verifiedAt: data.last_verified_at,
            numbers: (
              data.phone_numbers as { number: string; label: string }[]
            ).map((n) => ({ number: n.number, label: n.label })),
            callerId: settings.data.caller_id,
            transferNumber: settings.data.transfer_number,
          }
        : null;
    return NextResponse.json(
      {
        connection,
        canManage: role !== "agent",
        encryptionConfigured: plivoStorageConfigured(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
const changeSchema = z.discriminatedUnion("action", [
  plivoCredentialsSchema.extend({ action: z.literal("connect") }).strict(),
  z
    .object({
      action: z.literal("settings"),
      callerId: phoneSchema,
      transferNumber: phoneSchema.nullable(),
    })
    .strict(),
  z.object({ action: z.literal("disconnect") }).strict(),
]);
function databaseFailure(error: { message: string } | null) {
  if (!error) return;
  if (error.message.includes("plivo_calls_active"))
    throw new ApiError(
      409,
      "Resolve active or unconfirmed calls before changing this connection.",
    );
  if (error.message.includes("plivo_auth_already_connected"))
    throw new ApiError(
      409,
      "This Plivo account is already connected to another workspace.",
    );
  if (error.message.includes("plivo_connection_changed"))
    throw new ApiError(409, "The connection changed. Refresh and try again.");
  throw new ApiError(400, "The Plivo connection could not be saved.");
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { service, workspaceId, user } = await authorize(request, true);
    const chunks: Uint8Array[] = [];
    let length = 0;
    const reader = request.body?.getReader();
    if (!reader) throw new ApiError(400, "Connection request is empty.");
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 4096)
          throw new ApiError(413, "Connection request is too large.");
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    const parsed = changeSchema.safeParse(
      JSON.parse(Buffer.concat(chunks).toString("utf8")),
    );
    if (!parsed.success)
      throw new ApiError(
        400,
        "Check the Plivo credentials or calling numbers.",
      );
    const input = parsed.data;
    if (input.action === "disconnect") {
      const { error } = await service.rpc("disconnect_plivo_account", {
        w: workspaceId,
        actor: user.id,
      });
      databaseFailure(error);
      return NextResponse.json(
        { saved: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (!plivoStorageConfigured())
      throw new ApiError(503, "Secure credential storage is not configured.");
    const app = new URL(getAppUrl());
    if (
      app.protocol !== "https:" &&
      !["localhost", "127.0.0.1"].includes(app.hostname)
    )
      throw new ApiError(503, "Secure account connection requires HTTPS.");
    if (input.action === "connect") {
      const credentials = { authId: input.authId, authToken: input.authToken };
      try {
        const numbers = await verifyPlivoAccount(credentials),
          id = randomUUID();
        const encrypted = await encryptPlivoCredentials(
          credentials,
          workspaceId,
          id,
        );
        const { error } = await service.rpc("connect_plivo_account", {
          w: workspaceId,
          actor: user.id,
          connection_id: id,
          auth_id: credentials.authId,
          encrypted_token: encrypted,
          numbers,
          selected_caller: numbers[0].number,
        });
        databaseFailure(error);
      } finally {
        credentials.authToken = "";
        input.authToken = "";
      }
    } else {
      const { data: connection, error } = await service
        .from("plivo_connections")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("status", "connected")
        .single();
      if (error || !connection)
        throw new ApiError(409, "Connect a Plivo account first.");
      const credentials = await loadWorkspacePlivoCredentials(workspaceId);
      try {
        const numbers = await verifyPlivoAccount(credentials);
        if (!numbers.some((n) => n.number === input.callerId))
          throw new ApiError(
            400,
            "Choose a voice-enabled number from your Plivo account.",
          );
        const { error: saveError } = await service.rpc(
          "update_plivo_settings",
          {
            w: workspaceId,
            actor: user.id,
            connection_id: connection.id,
            caller: input.callerId,
            transfer: input.transferNumber,
            numbers,
          },
        );
        databaseFailure(saveError);
      } finally {
        credentials.authToken = "";
      }
    }
    return NextResponse.json(
      { saved: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof PlivoConnectionError)
      return apiError(
        new ApiError(
          error.code.includes("storage") ||
            error.code.includes("encryption") ||
            error.code.includes("decryption")
            ? 503
            : 400,
          "Plivo verification failed. Check your credentials and voice-enabled numbers, then try again.",
        ),
      );
    return apiError(error);
  }
}
