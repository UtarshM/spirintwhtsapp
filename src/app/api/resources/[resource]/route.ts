import { NextResponse } from "next/server";
import {
  authorize,
  apiError,
  ApiError,
  requireSameOrigin,
  checkDb,
} from "@/lib/auth";
import { getResource } from "@/lib/resources";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  try {
    const { resource } = await params;
    if (!getResource(resource)) throw new ApiError(404, "Resource not found");
    const { db, workspaceId } = await authorize(request);
    const page = Math.max(
      1,
      Number(new URL(request.url).searchParams.get("page")) || 1,
    );
    const { data, error, count } = await db
      .from(resource)
      .select("*", { count: "exact" })
      .eq("workspace_id", workspaceId)
      .order("id")
      .range((page - 1) * 25, page * 25 - 1);
    checkDb(error);
    return NextResponse.json({ data, page, pageSize: 25, total: count });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  try {
    requireSameOrigin(request);
    const { resource } = await params;
    const config = getResource(resource);
    if (!config) throw new ApiError(404, "Resource not found");
    const { service, workspaceId } = await authorize(request, config.admin);
    const result = config.schema.safeParse(await request.json());
    if (!result.success) throw new ApiError(422, "Invalid resource fields");
    const { data, error } = await service
      .from(resource)
      .insert({ ...result.data, workspace_id: workspaceId })
      .select()
      .single();
    checkDb(error);
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
