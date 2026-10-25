import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { userDb } from "@/lib/supabase";
import { apiError, ApiError, requireSameOrigin } from "@/lib/auth";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const parsed = z
      .object({ token: z.string().min(40).max(100) })
      .safeParse(await request.json());
    if (!parsed.success) throw new ApiError(422, "Invalid invitation token");
    const db = await userDb();
    const { data, error } = await db.rpc("accept_invitation", {
      invite_token_hash: createHash("sha256")
        .update(parsed.data.token)
        .digest("hex"),
    });
    if (error)
      throw new ApiError(
        403,
        "Invitation is expired, already used, or belongs to a different verified email",
      );
    return NextResponse.json({ workspaceId: data });
  } catch (e) {
    return apiError(e);
  }
}
