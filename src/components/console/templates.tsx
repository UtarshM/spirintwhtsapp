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
  channel?: Channel;
  notify: (s: string) => void;
}) {
  const { state: s, update } = useWorkspace();
  const [activeChannelTab, setActiveChannelTab] = useState<Channel | "All">(channel || "All");
  const [modalChannel, setModalChannel] = useState<Channel>(channel || "WhatsApp");
  const [edit, setEdit] = useState<LocalTemplate | null | undefined>(),
    [body, setBody] = useState(""),
    [subject, setSubject] = useState(""),
    [mediaUrl, setMediaUrl] = useState(""),
    [buttons, setButtons] = useState<Buttons>([]),
    [cards, setCards] = useState<Card[]>([]),
    [previewId, setPreviewId] = useState(""),
    [query, setQuery] = useState(""),
    [aiPrompt, setAiPrompt] = useState(""),
    [aiGenerating, setAiGenerating] = useState(false);

  const effectiveChannel = edit?.channel || modalChannel;

  const handleGenerateAiCopy = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "campaign_copy",
          channel: effectiveChannel,
          topic: aiPrompt.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to generate AI copy");
      }
      if (json.data?.body) {
        setBody(json.data.body);
      }
      if (json.data?.subject && effectiveChannel === "Email") {
        setSubject(json.data.subject);
      }
      if (
        Array.isArray(json.data?.suggestedButtons) &&
        json.data.suggestedButtons.length > 0
      ) {
        setButtons(
          json.data.suggestedButtons.slice(0, 3).map((text: string) => ({
            text: text.slice(0, 25),
            kind: "Quick reply" as const,
            url: "",
          }))
        );
      }
      notify(`Generated with Claude (${json.model || "AWS Bedrock"})`);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "AI copy generation error");
    } finally {
      setAiGenerating(false);
    }
  };

  const open = (template: LocalTemplate | null) => {
    setModalChannel(template?.channel || (activeChannelTab === "All" ? "WhatsApp" : activeChannelTab));
    setBody(template?.body || "");
    setSubject(template?.subject || "");
    setMediaUrl(template?.mediaUrl || "");
    setButtons(structuredClone(template?.buttons || []));
    setCards(structuredClone(template?.cards || []));
    setAiPrompt("");
    setEdit(template);
  };

  const person = s.contacts.find((c) => c.id === previewId) || s.contacts[0];
  const draft: LocalTemplate = {
    id: edit?.id || "preview",
    name: edit?.name || "Preview",
    channel: effectiveChannel,
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

  const totalTemplates = s.templates.length;
  const waTemplates = s.templates.filter((t) => t.channel === "WhatsApp").length;
  const emailTemplates = s.templates.filter((t) => t.channel === "Email").length;
  const readyTemplates = s.templates.filter((t) => t.status === "Ready").length;

  const filteredTemplates = s.templates.filter(
    (t) =>
      (activeChannelTab === "All" || t.channel === activeChannelTab) &&
      t.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Panel
      title={activeChannelTab === "All" ? "Omnichannel Templates" : `${activeChannelTab} Templates`}
      description="Design, preview, and manage multi-channel message and email templates with AI copy generation."
      action={
        <button className="primary" onClick={() => open(null)}>
          Create Template
        </button>
      }
    >
      {/* Top Stat Cards */}
      <div className="rapid-stat-cards-grid" style={{ marginBottom: 20 }}>
        <div className="rapid-stat-card">
          <span className="rapid-stat-label">TOTAL TEMPLATES</span>
          <div className="rapid-stat-value">{totalTemplates}</div>
          <span className="rapid-stat-sub">Across all outreach channels</span>
        </div>
        <div className="rapid-stat-card">
          <span className="rapid-stat-label">WHATSAPP TEMPLATES</span>
          <div className="rapid-stat-value" style={{ color: "#059669" }}>{waTemplates}</div>
          <span className="rapid-stat-sub">HSM marketing & utilities</span>
        </div>
        <div className="rapid-stat-card">
          <span className="rapid-stat-label">EMAIL TEMPLATES</span>
          <div className="rapid-stat-value" style={{ color: "#2563eb" }}>{emailTemplates}</div>
          <span className="rapid-stat-sub">HTML newsletters & cold outreach</span>
        </div>
        <div className="rapid-stat-card">
          <span className="rapid-stat-label">READY / APPROVED</span>
          <div className="rapid-stat-value" style={{ color: "#7c3aed" }}>{readyTemplates}</div>
          <span className="rapid-stat-sub">Validated for live dispatch</span>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { id: "All", label: `All (${totalTemplates})` },
            { id: "WhatsApp", label: `WhatsApp (${waTemplates})` },
            { id: "Email", label: `Email (${emailTemplates})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeChannelTab === tab.id ? "primary" : "secondary"}
              style={{ padding: "6px 14px", fontSize: 13, borderRadius: 20 }}
              onClick={() => setActiveChannelTab(tab.id as Channel | "All")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder="Search templates..."
        />
      </div>

      <div className="console-card-grid">
        {filteredTemplates.map((template) => (
          <article className="console-mini-card" key={template.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: template.channel === "WhatsApp" ? "#ecfdf5" : "#eff6ff",
                  color: template.channel === "WhatsApp" ? "#059669" : "#2563eb",
                }}
              >
                {template.channel}
              </span>
              <Badge>
                {template.status} · Local{" "}
                {template.channel === "WhatsApp" ? `· ${template.category}` : ""}
              </Badge>
            </div>
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
      {!filteredTemplates.length && (
        <Empty>No templates found for this channel. Click &quot;Create Template&quot; to build one.</Empty>
      )}
      {edit !== undefined && (
        <Modal
          title={`${effectiveChannel} template editor`}
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
                channel: effectiveChannel,
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
                    ? state.templates.map((x) =>
                        x.id === template.id ? template : x,
                      )
                    : [...state.templates, template],
                }))
              ) {
                notify("Template saved");
                setEdit(undefined);
              }
            }}
          >
            {!edit && (
              <label>
                Channel
                <select
                  value={modalChannel}
                  onChange={(e) => setModalChannel(e.target.value as Channel)}
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Email">Email</option>
                </select>
              </label>
            )}
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
            <div className="console-ai-box">
              <div className="console-ai-header">
                <span className="console-ai-title">
                  ✨ Claude AI Copywriter (AWS Bedrock)
                </span>
                <span className="console-ai-hint">
                  Auto-generates high-converting {channel} copy & buttons
                </span>
              </div>
              <div className="console-ai-row">
                <input
                  type="text"
                  placeholder="e.g. Flash 50% weekend sale on premium electronics with free delivery"
                  value={aiPrompt}
                  maxLength={500}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleGenerateAiCopy();
                    }
                  }}
                />
                <button
                  type="button"
                  className="secondary"
                  disabled={aiGenerating || !aiPrompt.trim()}
                  onClick={handleGenerateAiCopy}
                >
                  {aiGenerating ? "Generating..." : "Generate with Claude"}
                </button>
              </div>
            </div>
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
