import { NextResponse } from "next/server";
import { authorize, apiError, requireSameOrigin, ApiError } from "@/lib/auth";
export async function GET(request: Request) {
  try {
    const { db, workspaceId } = await authorize(request);
    const [{ data: wallet }, { data: ledger }] = await Promise.all([
      db.from("wallets").select("*").eq("workspace_id", workspaceId).single(),
      db
        .from("credit_ledger")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    return NextResponse.json({ wallet, ledger, checkoutEnabled: false });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await authorize(request, true);
    throw new ApiError(
      503,
      "Checkout is disabled until approved pricing and production payment verification are complete",
    );
  } catch (e) {
    return apiError(e);
  }
}
