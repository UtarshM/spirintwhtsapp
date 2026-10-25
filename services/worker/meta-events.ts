import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeMetaPayload } from "../../src/lib/meta-events";

/** No provider requests occur here. Each signed, stored event is normalized atomically. */
export async function processMetaEvents(client?: SupabaseClient) {
  const db =
    client ||
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  const { data: events, error } = await db
    .from("provider_events")
    .select("id,payload")
    .eq("provider", "meta")
    .is("processed_at", null)
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at")
    .limit(50);
  if (error) throw error;
  const summary = { processed: 0, failed: 0 };
  for (const event of events || []) {
    try {
      const normalized = normalizeMetaPayload(event.payload);
      const { error } = await db.rpc("normalize_meta_event", {
        event_uuid: event.id,
        actions: normalized.actions,
        ignored_fields: normalized.ignoredFields,
      });
      if (error) throw error;
      summary.processed++;
    } catch (error) {
      // Store only a bounded diagnostic code, never payloads, message text or tokens.
      const message =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "";
      const code =
        message.match(/\bmeta_[a-z_]+\b/)?.[0] ||
        (error instanceof Error && error.name === "ZodError"
          ? "meta_invalid_payload"
          : "meta_normalization_failed");
      const { error: saveError } = await db.rpc("fail_meta_event", {
        event_uuid: event.id,
        failure_code: code,
      });
      if (saveError) throw saveError;
      summary.failed++;
    }
  }
  return summary;
}
