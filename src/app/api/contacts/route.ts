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
    company: z.string().max(150).default(""),
    email: z.email().nullable().optional(),
    phone: z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/)
      .nullable()
      .optional(),
    consent: z.boolean().default(false),
    tags: z.array(z.string().max(40)).max(20).default([]),
  })
  .strict();
export async function GET(request: Request) {
  try {
    const { db, workspaceId } = await authorize(request);
    const u = new URL(request.url),
      page = Math.max(1, Number(u.searchParams.get("page")) || 1);
    const q = (u.searchParams.get("q") || "")
      .slice(0, 100)
      .replace(/[%_\\]/g, "");
    let query = db
      .from("contacts")
      .select("*", { count: "exact" })
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .range((page - 1) * 25, page * 25 - 1);
    if (q) query = query.ilike("name", `%${q}%`);
    const { data, error, count } = await query;
    checkDb(error);
    return NextResponse.json({ data, page, pageSize: 25, total: count });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { service, workspaceId, user } = await authorize(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(422, "Invalid contact fields");
    const { data, error } = await service
      .from("contacts")
      .insert({ ...parsed.data, workspace_id: workspaceId, owner_id: user.id })
      .select()
      .single();
    checkDb(error);
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
