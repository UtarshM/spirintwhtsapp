import { createClient } from "@supabase/supabase-js";
/** Replayable normalization of signed, persisted Meta webhook events. */
export async function processMetaEvents() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: events, error } = await db
    .from("provider_events")
    .select("*")
    .eq("provider", "meta")
    .is("processed_at", null)
    .order("created_at")
    .limit(50);
  if (error) throw error;
  for (const event of events || []) {
    for (const entry of event.payload.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        const numberId = value?.metadata?.phone_number_id;
        if (!numberId) continue;
        const { data: integration } = await db
          .from("integrations")
          .select("workspace_id")
          .eq("provider", "meta")
          .eq("external_id", numberId)
          .eq("status", "connected")
          .single();
        if (!integration) throw new Error("unmapped_meta_phone");
        const workspaceId = integration.workspace_id;
        for (const status of value.statuses || []) {
          if (!["sent", "delivered", "read", "failed"].includes(status.status))
            continue;
          const { error: e } = await db
            .from("messages")
            .update({ status: status.status })
            .eq("workspace_id", workspaceId)
            .eq("provider_id", status.id);
          if (e) throw e;
        }
        for (const message of value.messages || []) {
          if (!message.id || !message.from) continue;
          const { data: existing } = await db
            .from("messages")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("provider_id", message.id)
            .maybeSingle();
          if (existing) continue;
          const { data: contact } = await db
            .from("contacts")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("phone", "+" + message.from)
            .maybeSingle();
          if (!contact) throw new Error("inbound_contact_requires_mapping");
          const { data: existingConversation } = await db
            .from("conversations")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("contact_id", contact.id)
            .eq("channel", "whatsapp")
            .limit(1)
            .maybeSingle();
          let conversationId = existingConversation?.id;
          if (!conversationId) {
            const { data: created, error: createError } = await db
              .from("conversations")
              .insert({
                workspace_id: workspaceId,
                contact_id: contact.id,
                channel: "whatsapp",
              })
              .select("id")
              .single();
            if (createError) throw createError;
            conversationId = created.id;
          }
          const { error: insertError } = await db
            .from("messages")
            .insert({
              workspace_id: workspaceId,
              conversation_id: conversationId,
              direction: "inbound",
              body:
                message.text?.body ||
                `[${message.type || "message"} attachment]`,
              status: "received",
              provider_id: message.id,
            });
          if (insertError && insertError.code !== "23505") throw insertError;
        }
      }
    }
    const { error: processedError } = await db
      .from("provider_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", event.id);
    if (processedError) throw processedError;
  }
}
