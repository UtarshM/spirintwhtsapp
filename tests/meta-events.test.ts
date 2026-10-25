import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMetaPayload } from "../src/lib/meta-events";
const wrap = (value: unknown, field = "messages") => ({
  object: "whatsapp_business_account",
  entry: [{ id: "waba-1", changes: [{ field, value }] }],
});
const base = {
  messaging_product: "whatsapp",
  metadata: { phone_number_id: "1234" },
};
test("Meta text normalizes recipient, timestamp and profile without granting consent", () => {
  const result = normalizeMetaPayload(
    wrap({
      ...base,
      contacts: [{ wa_id: "919876543210", profile: { name: "Customer" } }],
      messages: [
        {
          id: "wamid.1",
          from: "919876543210",
          timestamp: "1792886400",
          type: "text",
          text: { body: "Please help" },
        },
      ],
    }),
  );
  assert.equal(result.actions.length, 1);
  assert.equal(result.actions[0].phone, "+919876543210");
  assert.equal(result.actions[0].profileName, "Customer");
  assert.equal(result.actions[0].body, "Please help");
  assert.equal(result.actions[0].at, "2026-10-25T00:00:00.000Z");
  assert.ok(!("consent" in result.actions[0]));
});
test("Meta attachments keep only private provider references and do not trust URLs", () => {
  const result = normalizeMetaPayload(
    wrap({
      ...base,
      messages: [
        {
          id: "wamid.media",
          from: "919876543210",
          timestamp: 1792886400,
          type: "document",
          document: {
            id: "media-1",
            mime_type: "application/pdf",
            filename: "quote.pdf",
            caption: "Quote",
            url: "https://untrusted.example/token",
          },
        },
      ],
    }),
  );
  assert.deepEqual(result.actions[0].media, {
    id: "media-1",
    mimeType: "application/pdf",
    filename: "quote.pdf",
  });
  assert.ok(!JSON.stringify(result).includes("untrusted"));
});
test("Meta payment status is not interpreted as message delivery", () => {
  const result = normalizeMetaPayload(
    wrap({
      ...base,
      statuses: [
        { type: "payment", status: "failed" },
        {
          id: "wamid.1",
          status: "read",
          timestamp: "1792886400",
          recipient_id: "919876543210",
        },
      ],
    }),
  );
  assert.equal(result.actions.length, 1);
  assert.equal(result.actions[0].status, "read");
  assert.ok(result.ignoredFields.includes("statuses.unsupported"));
});
test("Meta malformed identity and timestamp fail instead of partially processing", () => {
  for (const invalid of [
    { from: "+919876543210", timestamp: "1792886400" },
    { from: "919876543210", timestamp: "yesterday" },
  ])
    assert.throws(() =>
      normalizeMetaPayload(
        wrap({
          ...base,
          messages: [
            { id: "m", type: "text", text: { body: "Hi" }, ...invalid },
          ],
        }),
      ),
    );
  assert.throws(() =>
    normalizeMetaPayload(
      wrap({
        ...base,
        messages: [
          {
            id: "m",
            from: "919876543210",
            timestamp: "1792886400",
            type: "text",
          },
        ],
      }),
    ),
  );
});
test("Meta interactive replies and reactions count as incoming activity; system events do not", () => {
  const common = { from: "919876543210", timestamp: "1792886400" };
  const result = normalizeMetaPayload(
    wrap({
      ...base,
      messages: [
        {
          ...common,
          id: "button",
          type: "interactive",
          interactive: {
            type: "button_reply",
            button_reply: { id: "yes", title: "Yes please" },
          },
        },
        {
          ...common,
          id: "reaction",
          type: "reaction",
          reaction: { emoji: "👍" },
        },
        { ...common, id: "system", type: "system" },
      ],
    }),
  );
  assert.equal(result.actions.length, 2);
  assert.equal(result.actions[0].body, "Yes please");
  assert.equal(result.actions[1].messageType, "reaction");
  assert.deepEqual(result.ignoredFields, ["messages.system"]);
});
test("unsupported Meta webhook fields are explicitly reported for later reconciliation", () => {
  assert.deepEqual(
    normalizeMetaPayload(wrap({}, "message_template_status_update")),
    { actions: [], ignoredFields: ["message_template_status_update"] },
  );
  assert.throws(() => normalizeMetaPayload({ object: "page", entry: [] }));
});

test("Meta worker continues after a bad event and stores only a safe failure code", async () => {
  const { processMetaEvents } = await import("../services/worker/meta-events");
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const query = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    is() {
      return this;
    },
    lte() {
      return this;
    },
    order() {
      return this;
    },
    limit: async () => ({
      data: [
        { id: "bad", payload: { object: "wrong" } },
        { id: "good", payload: wrap({ ...base }) },
      ],
      error: null,
    }),
  };
  const client = {
    from: () => query,
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { error: null };
    },
  };
  const result = await processMetaEvents(
    client as unknown as import("@supabase/supabase-js").SupabaseClient,
  );
  assert.deepEqual(result, { processed: 1, failed: 1 });
  assert.equal(calls[0].name, "fail_meta_event");
  assert.equal(calls[0].args.failure_code, "meta_invalid_payload");
  assert.equal(calls[1].name, "normalize_meta_event");
  assert.equal(calls[1].args.event_uuid, "good");
});
