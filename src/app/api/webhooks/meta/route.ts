import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { verifyHmac } from "@/lib/signatures";
import { adminDb } from "@/lib/supabase";
export function GET(request: Request) {
  const u = new URL(request.url);
  if (
    process.env.META_WEBHOOK_VERIFY_TOKEN &&
    u.searchParams.get("hub.mode") === "subscribe" &&
    u.searchParams.get("hub.verify_token") ===
      process.env.META_WEBHOOK_VERIFY_TOKEN
  )
    return new Response(u.searchParams.get("hub.challenge"), { status: 200 });
  return new Response("Verification failed", { status: 403 });
}
export async function POST(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return new Response("Missing payload", { status: 400 });
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 1_000_000) {
      await reader.cancel();
      return new Response("Payload too large", { status: 413 });
    }
    chunks.push(value);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  const signature =
    request.headers.get("x-hub-signature-256")?.replace(/^sha256=/, "") || null;
  if (!verifyHmac(raw, signature, process.env.META_APP_SECRET))
    return new Response("Invalid signature", { status: 401 });
  try {
    const payload = JSON.parse(raw);
    const { error } = await adminDb()
      .from("provider_events")
      .upsert(
        {
          provider: "meta",
          event_id: createHash("sha256").update(raw).digest("hex"),
          payload,
        },
        { onConflict: "provider,event_id", ignoreDuplicates: true },
      );
    if (error) throw error;
    return NextResponse.json({ received: true });
  } catch {
    return new Response("Event persistence failed", { status: 500 });
  }
}
