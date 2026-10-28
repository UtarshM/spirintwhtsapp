import { NextResponse } from "next/server";
import { z } from "zod";
import { userDb } from "@/lib/supabase";
import { apiError, requireSameOrigin, ApiError } from "@/lib/auth";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const db = await userDb();
    const { data: authData, error: authError } = await db.auth.getUser();
    const user = authData?.user;
    if (authError || !user) throw new ApiError(401, "Sign in required");
    const { name } = z
      .object({ name: z.string().trim().min(1).max(120) })
      .parse(await request.json());
    const { data, error } = await db.rpc("create_workspace", {
      workspace_name: name,
    });
    if (error)
      throw new ApiError(
        409,
        "Workspace could not be created or already exists",
      );
    return NextResponse.json({ workspaceId: data }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
