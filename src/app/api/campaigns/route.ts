import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorize,
  apiError,
  requireSameOrigin,
  checkDb,
  ApiError,
} from "@/lib/auth";
const schema = z
  .object({
    name: z.string().trim().min(1).max(120),
    channel: z.enum(["whatsapp", "email", "voice"]),
  })
  .strict();
export async function GET(request: Request) {
  try {
    const { db, workspaceId } = await authorize(request);
    const { data, error } = await db
      .from("campaigns")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(100);
    checkDb(error);
    return NextResponse.json({ data });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { service, workspaceId } = await authorize(request, true);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(422, "Invalid campaign fields");
    const { data, error } = await service
      .from("campaigns")
      .insert({ ...parsed.data, workspace_id: workspaceId, status: "draft" })
      .select()
      .single();
    checkDb(error);
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
