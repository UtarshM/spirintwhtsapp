import { NextResponse } from "next/server";
import { authorize, apiError, requireSameOrigin, ApiError } from "@/lib/auth";
export async function GET(request: Request) {
  try {
    const { db, service, workspaceId } = await authorize(request);
    const [walletResult, ledgerResult, ordersResult, ratesResult] =
      await Promise.all([
        db.from("wallets").select("*").eq("workspace_id", workspaceId).single(),
        db
          .from("credit_ledger")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(50),
        db
          .from("payments")
          .select("id,provider_order_id,status,amount_paise,created_at")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(100),
        service
          .from("credit_rates")
          .select("id,channel,unit,rate_microcredits,effective_at")
          .eq("approved", true)
          .lte("effective_at", new Date().toISOString())
          .order("effective_at", { ascending: false })
          .limit(100),
      ]);
    if (
      [walletResult, ledgerResult, ordersResult, ratesResult].some(
        (result) => result.error,
      )
    )
      throw new ApiError(
        503,
        "Billing records could not be loaded. No purchase or rate can be confirmed.",
      );
    return NextResponse.json(
      {
        wallet: walletResult.data,
        ledger: ledgerResult.data,
        orders: ordersResult.data,
        rates: ratesResult.data,
        checkoutEnabled: false,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
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
