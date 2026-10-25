import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import {
  authorize,
  apiError,
  ApiError,
  requireSameOrigin,
  checkDb,
} from "@/lib/auth";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { service, workspaceId, user } = await authorize(request, true);
    const p = z
      .object({ email: z.email(), role: z.enum(["administrator", "agent"]) })
      .strict()
      .safeParse(await request.json());
    if (!p.success) throw new ApiError(422, "Invalid invitation");
    const token = randomBytes(32).toString("base64url");
    const { data, error } = await service
      .from("invitations")
      .insert({
        ...p.data,
        workspace_id: workspaceId,
        created_by: user.id,
        token_hash: createHash("sha256").update(token).digest("hex"),
        expires_at: new Date(Date.now() + 86400000 * 3).toISOString(),
      })
      .select("id")
      .single();
    checkDb(error);
    if (!data) throw new ApiError(500, "Invitation could not be created");
    await service
      .from("audit_events")
      .insert({
        workspace_id: workspaceId,
        actor_id: user.id,
        action: "invitation.create",
        resource_id: data.id,
      });
    return NextResponse.json(
      {
        inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite?token=${token}`,
        expiresInHours: 72,
      },
      { status: 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}
