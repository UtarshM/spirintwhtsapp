"use client";
import { useState } from "react";
import { useWorkspace } from "../local-provider";
import {
  now,
  uid,
  personalizeTemplate,
  validateTemplateContent,
  type Channel,
  type LocalTemplate,
} from "@/lib/local-workspace";
import { Panel, Empty, Modal, Badge, formValue, SearchBox } from "./ui";
import TemplatePreview from "./template-preview";
type Buttons = LocalTemplate["buttons"];
type Card = NonNullable<LocalTemplate["cards"]>[number];
function ButtonEditor({
  value,
  onChange,
  prefix,
}: {
  value: Buttons;
  onChange: (buttons: Buttons) => void;
  prefix: string;
}) {
  return (
    <div className="console-button-editor">
      <strong>{prefix} buttons</strong>
      {value.map((b, i) => (
        <div className="console-button-row" key={i}>
          <label>
            {prefix} button {i + 1} label
            <input
              value={b.text}
              maxLength={80}
              required
              onChange={(e) =>
                onChange(
                  value.map((x, n) =>
                    n === i ? { ...x, text: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <label>
            Action
            <select
              value={b.kind || "URL"}
              onChange={(e) =>
                onChange(
                  value.map((x, n) =>
                    n === i
                      ? {
                          ...x,
                          kind: e.target.value as
                            "URL" | "Quick reply" | "Phone",
                          url: "",
                        }
                      : x,
                  ),
                )
              }
            >
              <option>URL</option>
              <option>Quick reply</option>
              <option>Phone</option>
            </select>
          </label>
          {b.kind !== "Quick reply" && (
            <label>
              {b.kind === "Phone"
                ? "International phone number"
                : "Destination URL"}
              <input
                value={b.url}
                type={b.kind === "Phone" ? "tel" : "url"}
                required
                maxLength={2000}
                placeholder={
                  b.kind === "Phone" ? "+919876543210" : "https://example.com"
                }
                onChange={(e) =>
                  onChange(
                    value.map((x, n) =>
                      n === i ? { ...x, url: e.target.value } : x,
                    ),
                  )
                }
              />
            </label>
          )}
          <button
            className="text-button"
            type="button"
            onClick={() => onChange(value.filter((_, n) => n !== i))}
          >
            Remove button
          </button>
        </div>
      ))}
      <button
        type="button"
        className="secondary"
        disabled={value.length >= 3}
        onClick={() => onChange([...value, { text: "", url: "", kind: "URL" }])}
      >
        + Add button
      </button>
    </div>
  );
}
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
    [subject, setSubject] = useState(""),
    [mediaUrl, setMediaUrl] = useState(""),
    [buttons, setButtons] = useState<Buttons>([]),
    [cards, setCards] = useState<Card[]>([]),
    [previewId, setPreviewId] = useState(""),
    [query, setQuery] = useState("");
  const open = (template: LocalTemplate | null) => {
    setBody(template?.body || "");
    setSubject(template?.subject || "");
    setMediaUrl(template?.mediaUrl || "");
    setButtons(structuredClone(template?.buttons || []));
    setCards(structuredClone(template?.cards || []));
    setEdit(template);
  };
  const person = s.contacts.find((c) => c.id === previewId) || s.contacts[0];
  const draft: LocalTemplate = {
    id: edit?.id || "preview",
    name: edit?.name || "Preview",
    channel,
    subject,
    body,
    mediaUrl,
    buttons,
    cards,
    status: "Draft",
    category: "Marketing",
    updatedAt: now(),
  };
  const preview = person ? personalizeTemplate(draft, person) : draft;
  const cardPatch = (id: string, patch: Partial<Card>) =>
    setCards((current) =>
      current.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  return (
    <Panel
      title={`${channel} templates`}
      description="Reusable content and rich previews. Ready is local readiness; provider approval has not been checked."
      action={
        <button className="primary" onClick={() => open(null)}>
          Create template
        </button>
      }
    >
      <SearchBox
        value={query}
        onChange={setQuery}
        placeholder="Search templates"
      />
      <div className="console-card-grid">
        {s.templates
          .filter(
            (t) =>
              t.channel === channel &&
              t.name.toLowerCase().includes(query.toLowerCase()),
          )
          .map((template) => (
            <article className="console-mini-card" key={template.id}>
              <Badge>
                {template.status} · Local{" "}
                {channel === "WhatsApp" ? `· ${template.category}` : ""}
              </Badge>
              <h3>{template.name}</h3>
              <TemplatePreview
                content={
                  s.contacts[0]
                    ? personalizeTemplate(template, s.contacts[0])
                    : template
                }
              />
              <div className="console-actions">
                <button className="secondary" onClick={() => open(template)}>
                  Edit & preview
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    if (
                      update((state) => ({
                        ...state,
                        templates: [
                          ...state.templates,
                          {
                            ...structuredClone(template),
                            id: uid(),
                            name: template.name + " copy",
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
              const f = new FormData(e.currentTarget);
              const template: LocalTemplate = {
                ...draft,
                id: edit?.id || uid(),
                name: formValue(f, "name"),
                category: (formValue(f, "category") ||
                  "Marketing") as LocalTemplate["category"],
                status: formValue(f, "status") as "Draft" | "Ready",
                updatedAt: now(),
              };
              const errors = validateTemplateContent(template);
              if (errors.length) {
                notify(errors.join(" "));
                return;
              }
              if (cards.some((card) => !card.title.trim())) {
                notify("Give every carousel card a title");
                return;
              }
              if (
                update((state) => ({
                  ...state,
                  templates: edit
                    ? state.templates.map((t) =>
                        t.id === edit.id ? template : t,
                      )
                    : [...state.templates, template],
                }))
              ) {
                setEdit(undefined);
                notify("Rich template saved locally");
              }
            }}
          >
            <div className="console-form-grid">
              <label>
                Template name
                <input
                  name="name"
                  required
                  maxLength={200}
                  defaultValue={edit?.name}
                />
              </label>
              <label>
                Local readiness
                <select name="status" defaultValue={edit?.status || "Draft"}>
                  <option>Draft</option>
                  <option>Ready</option>
                </select>
              </label>
            </div>
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
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  maxLength={200}
                />
              </label>
            )}
            <label>
              Message
              <textarea
                rows={5}
                required
                maxLength={10000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            <div className="console-actions">
              {["first_name", "name", "company", "email"].map((variable) => (
                <button
                  key={variable}
                  type="button"
                  className="secondary"
                  onClick={() => setBody((text) => text + `{{${variable}}}`)}
                >
                  + {variable}
                </button>
              ))}
            </div>
            <label>
              Optional media reference URL
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                maxLength={2000}
                placeholder="https://example.com/image.jpg"
              />
            </label>
            <ButtonEditor
              value={buttons}
              onChange={setButtons}
              prefix="Message"
            />
            {channel === "WhatsApp" && (
              <section className="console-carousel-editor">
                <h3>Carousel cards</h3>
                <p>
                  Build up to 10 preview cards. Exact provider format and limits
                  will be validated during integration.
                </p>
                {cards.map((card, i) => (
                  <article key={card.id}>
                    <header>
                      <strong>Card {i + 1}</strong>
                      <div className="console-actions">
                        <button
                          type="button"
                          className="text-button"
                          disabled={!i}
                          onClick={() =>
                            setCards((current) => {
                              const ordered = [...current];
                              [ordered[i - 1], ordered[i]] = [
                                ordered[i],
                                ordered[i - 1],
                              ];
                              return ordered;
                            })
                          }
                        >
                          Move up
                        </button>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() =>
                            setCards((current) =>
                              current.filter((c) => c.id !== card.id),
                            )
                          }
                        >
                          Remove card
                        </button>
                      </div>
                    </header>
                    <label>
                      Card {i + 1} title
                      <input
                        required
                        value={card.title}
                        maxLength={120}
                        onChange={(e) =>
                          cardPatch(card.id, { title: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Card {i + 1} message
                      <textarea
                        value={card.body}
                        maxLength={1000}
                        onChange={(e) =>
                          cardPatch(card.id, { body: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Card {i + 1} media URL
                      <input
                        type="url"
                        value={card.mediaUrl}
                        maxLength={2000}
                        onChange={(e) =>
                          cardPatch(card.id, { mediaUrl: e.target.value })
                        }
                      />
                    </label>
                    <ButtonEditor
                      prefix={`Card ${i + 1}`}
                      value={card.buttons}
                      onChange={(value) =>
                        cardPatch(card.id, { buttons: value })
                      }
                    />
                  </article>
                ))}
                <button
                  className="secondary"
                  type="button"
                  disabled={cards.length >= 10}
                  onClick={() =>
                    setCards((current) => [
                      ...current,
                      {
                        id: uid(),
                        title: "",
                        body: "",
                        mediaUrl: "",
                        buttons: [],
                      },
                    ])
                  }
                >
                  + Add carousel card
                </button>
              </section>
            )}
            <section className="console-template-review">
              <header>
                <h3>Personalized preview</h3>
                <label>
                  Sample contact
                  <select
                    value={person?.id || ""}
                    onChange={(e) => setPreviewId(e.target.value)}
                  >
                    {s.contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </header>
              <TemplatePreview content={preview} />
            </section>
            <div className="console-notice">
              Preview only · Media references and action labels are shown here
              without fetching assets or opening destinations. Simulations
              preserve a copy of this content in the inbox.
            </div>
            <button className="primary">Save template</button>
          </form>
        </Modal>
      )}
    </Panel>
  );
}
