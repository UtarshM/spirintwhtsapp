import { z } from "zod";
const id = z.string().min(1).max(512);
const phone = z.string().regex(/^[1-9]\d{7,14}$/);
const timestamp = z
  .union([
    z.string().regex(/^\d{1,11}$/),
    z.number().int().nonnegative().max(99_999_999_999),
  ])
  .transform((value) => new Date(Number(value) * 1000).toISOString());
const status = z.object({
  id,
  status: z.enum(["sent", "delivered", "read", "failed"]),
  timestamp,
  recipient_id: phone,
  errors: z
    .array(z.object({ code: z.union([z.string().max(30), z.number().int()]) }))
    .max(50)
    .optional(),
});
const message = z
  .object({
    id,
    from: phone,
    timestamp,
    type: z.string().min(1).max(50),
    text: z.object({ body: z.string().max(20000) }).optional(),
    button: z
      .object({
        text: z.string().max(2000),
        payload: z.string().max(2000).optional(),
      })
      .optional(),
    interactive: z
      .object({
        type: z.string(),
        button_reply: z
          .object({ id: z.string(), title: z.string().max(2000) })
          .optional(),
        list_reply: z
          .object({ id: z.string(), title: z.string().max(2000) })
          .optional(),
      })
      .optional(),
  })
  .passthrough();
export type MetaAction = {
  phoneNumberId: string;
  wabaId: string;
  kind: "inbound" | "status";
  providerId: string;
  phone: string;
  at: string;
  body?: string;
  profileName?: string;
  messageType?: string;
  media?: { id: string; mimeType: string; filename: string };
  status?: string;
  errorCode?: string;
};
export function normalizeMetaPayload(input: unknown): {
  actions: MetaAction[];
  ignoredFields: string[];
} {
  const payload = z
    .object({
      object: z.literal("whatsapp_business_account"),
      entry: z
        .array(
          z.object({
            id: id,
            changes: z
              .array(z.object({ field: z.string(), value: z.unknown() }))
              .max(1000),
          }),
        )
        .max(1000),
    })
    .parse(input);
  const actions: MetaAction[] = [],
    ignoredFields = new Set<string>();
  for (const entry of payload.entry)
    for (const change of entry.changes) {
      if (change.field !== "messages") {
        ignoredFields.add(change.field.slice(0, 100));
        continue;
      }
      const value = z
        .object({
          messaging_product: z.literal("whatsapp"),
          metadata: z.object({
            phone_number_id: z.string().regex(/^\d+$/).max(100),
          }),
          messages: z.array(message).max(1000).default([]),
          statuses: z.array(z.unknown()).max(1000).default([]),
          contacts: z
            .array(
              z.object({
                wa_id: phone,
                profile: z.object({ name: z.string().max(1000) }).optional(),
              }),
            )
            .max(1000)
            .default([]),
        })
        .parse(change.value);
      for (const m of value.messages) {
        if (m.type === "system") {
          ignoredFields.add("messages.system");
          continue;
        }
        const mediaValue = m[m.type];
        const media = [
          "image",
          "audio",
          "video",
          "document",
          "sticker",
        ].includes(m.type)
          ? z
              .object({
                id,
                mime_type: z.string().max(200).optional(),
                filename: z.string().max(300).optional(),
                caption: z.string().max(20000).optional(),
              })
              .parse(mediaValue)
          : undefined;
        const body =
          m.type === "text"
            ? m.text?.body
            : m.type === "button"
              ? m.button?.text
              : m.type === "interactive"
                ? m.interactive?.button_reply?.title ||
                  m.interactive?.list_reply?.title
                : media?.caption;
        if (m.type === "text" && body === undefined)
          throw Error("meta_invalid_text_message");
        actions.push({
          kind: "inbound",
          phoneNumberId: value.metadata.phone_number_id,
          wabaId: entry.id,
          providerId: m.id,
          phone: `+${m.from}`,
          at: m.timestamp,
          body: body || `[${m.type} message]`,
          messageType: m.type,
          profileName: value.contacts
            .find((c) => c.wa_id === m.from)
            ?.profile?.name?.slice(0, 120),
          ...(media
            ? {
                media: {
                  id: media.id,
                  mimeType: media.mime_type || "",
                  filename: media.filename || "",
                },
              }
            : {}),
        });
      }
      for (const raw of value.statuses) {
        const kind = z
          .object({ status: z.string(), type: z.string().optional() })
          .parse(raw);
        if (
          !["sent", "delivered", "read", "failed"].includes(kind.status) ||
          kind.type === "payment"
        ) {
          ignoredFields.add("statuses.unsupported");
          continue;
        }
        const s = status.parse(raw);
        actions.push({
          kind: "status",
          phoneNumberId: value.metadata.phone_number_id,
          wabaId: entry.id,
          providerId: s.id,
          phone: `+${s.recipient_id}`,
          at: s.timestamp,
          status: s.status,
          errorCode: s.errors?.[0] ? String(s.errors[0].code) : "",
        });
      }
      if (actions.length > 2000) throw Error("meta_too_many_actions");
    }
  return { actions, ignoredFields: [...ignoredFields] };
}
