"use client";
import { useState } from "react";
import { useWorkspace } from "../local-provider";
import {
  now,
  uid,
  personalize,
  type Channel,
  type LocalTemplate,
} from "@/lib/local-workspace";
import { validatePublicUrl } from "@/lib/outreach";
import { Panel, Empty, Modal, Badge, formValue } from "./ui";
export default function Templates({
  channel,
  notify,
}: {
  channel: Channel;
  notify: (s: string) => void;
}) {
  const { state: s, update } = useWorkspace();
  const [edit, setEdit] = useState<LocalTemplate | null | undefined>(),
    [body, setBody] = useState(""),
    [subject, setSubject] = useState("");
  const open = (t: LocalTemplate | null) => {
    setBody(t?.body || "");
    setSubject(t?.subject || "");
    setEdit(t);
  };
  return (
    <Panel
      title={`${channel} templates`}
      description="Ready means ready for a local simulation. Meta/provider approval is not connected."
      action={
        <button className="primary" onClick={() => open(null)}>
          Create template
        </button>
      }
    >
      <div className="console-card-grid">
        {s.templates
          .filter((t) => t.channel === channel)
          .map((t) => (
            <article className="console-mini-card" key={t.id}>
              <Badge>
                {t.status} · Local{" "}
                {channel === "WhatsApp" ? `· ${t.category}` : ""}
              </Badge>
              <h3>{t.name}</h3>
              {t.subject && <strong>{t.subject}</strong>}
              <p className="console-prewrap">
                {s.contacts[0] ? personalize(t.body, s.contacts[0]) : t.body}
              </p>
              {t.mediaUrl && <p>Media reference: {t.mediaUrl}</p>}
              {t.buttons.map((b, i) => (
                <Badge key={i}>{b.text}</Badge>
              ))}
              <div className="console-actions">
                <button className="secondary" onClick={() => open(t)}>
                  Edit & preview
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    if (
                      update((current) => ({
                        ...current,
                        templates: [
                          ...current.templates,
                          {
                            ...t,
                            id: uid(),
                            name: t.name + " copy",
                            status: "Draft",
                            updatedAt: now(),
                          },
                        ],
                      }))
                    )
                      notify("Template duplicated");
                  }}
                >
                  Duplicate
                </button>
              </div>
            </article>
          ))}
      </div>
      {!s.templates.some((t) => t.channel === channel) && (
        <Empty>Create your first local template.</Empty>
      )}
      {edit !== undefined && (
        <Modal
          title={`${channel} template editor`}
          close={() => setEdit(undefined)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const f = new FormData(e.currentTarget),
                  mediaUrl = formValue(f, "mediaUrl"),
                  buttonText = formValue(f, "buttonText"),
                  buttonUrl = formValue(f, "buttonUrl");
                if (mediaUrl) validatePublicUrl(mediaUrl);
                if (buttonText && !buttonUrl)
                  throw Error("A CTA button needs a URL");
                if (buttonUrl) {
                  validatePublicUrl(buttonUrl);
                  if (!buttonText) throw Error("A CTA button needs a label");
                }
                const template: LocalTemplate = {
                  id: edit?.id || uid(),
                  name: formValue(f, "name"),
                  channel,
                  subject,
                  body,
                  status: formValue(f, "status") as "Draft" | "Ready",
                  category: (formValue(f, "category") ||
                    "Marketing") as LocalTemplate["category"],
                  mediaUrl,
                  buttons: buttonText
                    ? [{ text: buttonText, url: buttonUrl }]
                    : [],
                  updatedAt: now(),
                };
                if (
                  update((current) => ({
                    ...current,
                    templates: edit
                      ? current.templates.map((t) =>
                          t.id === edit.id ? template : t,
                        )
                      : [...current.templates, template],
                  }))
                ) {
                  notify("Local template saved");
                  setEdit(undefined);
                }
              } catch (err) {
                notify((err as Error).message);
              }
            }}
          >
            <label>
              Name
              <input
                name="name"
                required
                maxLength={200}
                defaultValue={edit?.name}
              />
            </label>
            {channel === "WhatsApp" && (
              <label>
                Category draft
                <select
                  name="category"
                  defaultValue={edit?.category || "Marketing"}
                >
                  <option>Marketing</option>
                  <option>Utility</option>
                  <option>Authentication</option>
                </select>
              </label>
            )}
            {channel === "Email" && (
              <label>
                Subject
                <input
                  required
                  maxLength={200}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>
            )}
            <label>
              Message
              <textarea
                required
                rows={6}
                maxLength={10000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            <div className="console-actions">
              {["first_name", "name", "company", "email"].map((variable) => (
                <button
                  type="button"
                  className="secondary"
                  key={variable}
                  onClick={() =>
                    setBody((current) => current + `{{${variable}}}`)
                  }
                >
                  + {variable}
                </button>
              ))}
            </div>
            <div className="console-transcript">
              <strong>Personalized sample preview</strong>
              <p className="console-prewrap">
                {s.contacts[0]
                  ? personalize(body, s.contacts[0])
                  : body || "Your template preview will appear here."}
              </p>
            </div>
            <label>
              Optional public media reference URL
              <input
                name="mediaUrl"
                type="url"
                maxLength={2000}
                defaultValue={edit?.mediaUrl}
              />
            </label>
            <div className="console-form-grid">
              <label>
                Optional CTA label
                <input
                  name="buttonText"
                  maxLength={80}
                  defaultValue={edit?.buttons[0]?.text}
                />
              </label>
              <label>
                CTA URL
                <input
                  name="buttonUrl"
                  type="url"
                  maxLength={2000}
                  defaultValue={edit?.buttons[0]?.url}
                />
              </label>
            </div>
            <label>
              Local readiness
              <select name="status" defaultValue={edit?.status || "Draft"}>
                <option>Draft</option>
                <option>Ready</option>
              </select>
            </label>
            <button className="primary">Save template</button>
          </form>
          <div className="console-notice">
            Provider status: Not submitted. A local Ready label is not WhatsApp
            template approval. Media and buttons are draft metadata; local
            campaign simulations currently render text only.
          </div>
        </Modal>
      )}
    </Panel>
  );
}
