import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorize,
  apiError,
  ApiError,
  requireSameOrigin,
  checkDb,
} from "@/lib/auth";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new ApiError(400, "Invalid contact ID");
    const { service, workspaceId } = await authorize(request);
    const parsed = z
      .object({
        stage: z
          .enum(["New", "Contacted", "Qualified", "Proposal", "Won"])
          .optional(),
        name: z.string().trim().min(1).max(120).optional(),
        company: z.string().max(150).optional(),
        tags: z.array(z.string().max(40)).max(20).optional(),
        consent: z.boolean().optional(),
        opted_out: z.boolean().optional(),
      })
      .strict()
      .safeParse(await request.json());
    if (!parsed.success) throw new ApiError(422, "Invalid contact fields");
    const { opted_out, ...updates } = parsed.data;
    const { data, error } = await service
      .from("contacts")
      .update({
        ...updates,
        ...(opted_out !== undefined
          ? { opted_out_at: opted_out ? new Date().toISOString() : null }
          : {}),
      })
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .select()
      .single();
    checkDb(error);
    return NextResponse.json({ data });
  } catch (e) {
    return apiError(e);
  }
}
