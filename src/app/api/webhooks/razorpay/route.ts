import { NextResponse } from "next/server";
import { verifyHmac } from "@/lib/signatures";
import { adminDb } from "@/lib/supabase";
export async function POST(request: Request) {
  const body = await request.text();
  if (body.length > 1_000_000)
    return new Response("Payload too large", { status: 413 });
  if (
    !verifyHmac(
      body,
      request.headers.get("x-razorpay-signature"),
      process.env.RAZORPAY_WEBHOOK_SECRET,
    )
  )
    return new Response("Invalid signature", { status: 401 });
  try {
    const event = JSON.parse(body);
    const id = request.headers.get("x-razorpay-event-id");
    if (!id) return new Response("Missing event ID", { status: 400 });
    const db = adminDb();
    const { error } = await db
      .from("provider_events")
      .upsert(
        { provider: "razorpay", event_id: id, payload: event },
        { onConflict: "provider,event_id", ignoreDuplicates: true },
      );
    if (error) throw error;
    if (event.event === "payment.captured") {
      const p = event.payload?.payment?.entity;
      if (
        !p ||
        p.currency !== "INR" ||
        !Number.isSafeInteger(p.amount) ||
        p.status !== "captured"
      )
        return new Response("Invalid payment", { status: 400 });
      const { error: captureError } = await db.rpc("capture_payment", {
        order_id: p.order_id,
        payment_id: p.id,
        paid_paise: p.amount,
      });
      if (captureError) throw captureError;
    }
    await db
      .from("provider_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("provider", "razorpay")
      .eq("event_id", id);
    return NextResponse.json({ received: true });
  } catch {
    return new Response("Processing failed; retry supported", { status: 500 });
  }
}
