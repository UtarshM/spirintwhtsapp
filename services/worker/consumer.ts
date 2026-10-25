import { createClient } from "@supabase/supabase-js";
import { canSendAt, outreachAllowed } from "../../src/lib/scheduling";
/** Fail-closed consumer. Actual provider sends remain deliberately gated. */
export async function consume(outboxId: string, workspaceId: string) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: job, error } = await db
    .from("outbox")
    .update({ status: "processing" })
    .eq("id", outboxId)
    .eq("workspace_id", workspaceId)
    .in("status", ["pending", "queued"])
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!job) return { duplicate: true };
  try {
    if (process.env.LIVE_SENDING_ENABLED !== "true")
      throw new Error("live_sending_disabled");
    const [
      { data: contact },
      { data: workspace },
      { data: windows },
      { data: enrollment },
    ] = await Promise.all([
      db
        .from("contacts")
        .select("*")
        .eq("id", job.contact_id)
        .eq("workspace_id", workspaceId)
        .single(),
      db.from("workspaces").select("timezone").eq("id", workspaceId).single(),
      db
        .from("sending_windows")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("channel", job.payload.channel),
      db
        .from("enrollments")
        .select("status")
        .eq("workspace_id", workspaceId)
        .eq("contact_id", job.contact_id)
        .eq("id", job.payload.enrollmentId)
        .maybeSingle(),
    ]);
    if (
      !contact ||
      !workspace ||
      !windows ||
      !outreachAllowed({
        consent: contact.consent,
        optedOut: !!contact.opted_out_at,
        enrollmentStatus: enrollment?.status || "cancelled",
      })
    ) {
      await db
        .from("outbox")
        .update({ status: "cancelled" })
        .eq("id", outboxId);
      return { cancelled: true };
    }
    if (
      !canSendAt(
        new Date(),
        workspace.timezone,
        windows.map((w) => ({
          weekday: w.weekday,
          start: w.start_time,
          end: w.end_time,
          enabled: w.enabled,
        })),
      )
    ) {
      await db
        .from("outbox")
        .update({
          status: "pending",
          available_at: new Date(Date.now() + 60_000).toISOString(),
        })
        .eq("id", outboxId);
      return { deferred: true };
    }
    throw new Error("provider_execution_not_activated");
  } catch (error) {
    await db.from("outbox").update({ status: "failed" }).eq("id", outboxId);
    throw error;
  }
}
