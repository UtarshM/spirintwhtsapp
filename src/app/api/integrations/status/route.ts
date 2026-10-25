import { NextResponse } from "next/server";
import { authorize, apiError, ApiError } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const { db, workspaceId } = await authorize(request);
    const { data, error } = await db
      .from("integrations")
      .select("provider,status,created_at")
      .eq("workspace_id", workspaceId);
    if (error)
      throw new ApiError(503, "Integration records could not be loaded.");
    return NextResponse.json(
      {
        integrations: data,
        liveSendingEnabled: false,
        checkoutEnabled: false,
        healthVerified: false,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
