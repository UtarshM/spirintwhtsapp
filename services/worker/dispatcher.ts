/** Durable outbox dispatcher. Run as a scheduled AWS task with service credentials.
 * Duplicate queue delivery is expected: the consumer must claim the outbox ID.
 */
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { createClient } from "@supabase/supabase-js";
const sqs = new SQSClient({ region: process.env.AWS_REGION });
export async function dispatch() {
  if (
    !process.env.AWS_OUTBOX_QUEUE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL
  )
    throw new Error("worker_not_configured");
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const { data: jobs, error } = await db
    .from("outbox")
    .select("id,workspace_id")
    .eq("status", "pending")
    .lte("available_at", new Date().toISOString())
    .limit(100);
  if (error) throw error;
  for (const job of jobs || []) {
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.AWS_OUTBOX_QUEUE_URL,
        MessageBody: JSON.stringify({
          outboxId: job.id,
          workspaceId: job.workspace_id,
        }),
      }),
    );
    const { error: updateError } = await db
      .from("outbox")
      .update({ status: "queued" })
      .eq("id", job.id)
      .eq("status", "pending");
    if (updateError) throw updateError;
  }
}
