"use client";
import { useState, useEffect } from "react";
import { useWorkspace } from "../local-provider";
import { uid, now, recordIncoming, type Channel } from "@/lib/local-workspace";
import { addActivity } from "@/lib/outreach";
import { Panel, Empty, Badge, SearchBox, date, Modal, formValue } from "./ui";
import {
  messagesForThread,
  createEmailThread,
  saveThreadReply,
} from "@/lib/local-email";
import TemplatePreview from "./template-preview";
export default function Inbox({
  channel,
  notify,
}: {
  channel: Channel;
  notify: (s: string) => void;
}) {
  const { state: s, update } = useWorkspace();
  const [selected, setSelected] = useState(""),
    [query, setQuery] = useState(""),
    [mailbox, setMailbox] = useState("all"),
    [status, setStatus] = useState("all"),
    [compose, setCompose] = useState(false);
  const senders = s.resources.filter((r) => r.kind === "sender");
  const threads = s.threads.filter(
    (t) =>
      t.channel === channel &&
      (status === "all" || t.status === status) &&
      (channel !== "Email" ||
        mailbox === "all" ||
        (mailbox === "unassigned" ? !t.mailboxId : t.mailboxId === mailbox)) &&
      `${s.contacts.find((c) => c.id === t.contactId)?.name || ""} ${t.subject || ""} ${senders.find((r) => r.id === t.mailboxId)?.data.address || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const thread = threads.find((t) => t.id === selected) || threads[0],
    contact = s.contacts.find((c) => c.id === thread?.contactId);
  useEffect(() => {
    setSelected("");
    setMailbox("all");
    setStatus("all");
    setCompose(false);
  }, [channel]);
  return (
    <Panel
      title={`${channel} inbox`}
      description="All replies here are local drafts or explicitly simulated incoming messages."
    >
      <div className="console-toolbar">
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder="Search conversations"
        />
        {channel === "Email" && (
          <>
            <select
              aria-label="Email mailbox"
              value={mailbox}
              onChange={(e) => setMailbox(e.target.value)}
            >
              <option value="all">All local mailboxes</option>
              <option value="unassigned">Unassigned sample mailbox</option>
              {senders.map((sender) => (
                <option key={sender.id} value={sender.id}>
                  {sender.name}
                  {sender.data.archived === "true" ? " (archived)" : ""} ·{" "}
                  {sender.data.address}
                </option>
              ))}
            </select>
            <button className="primary" onClick={() => setCompose(true)}>
              New email thread
            </button>
          </>
        )}
        <select
          aria-label="Conversation status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All conversations</option>
          <option>Open</option>
          <option>Closed</option>
        </select>
        {channel !== "Email" && (
          <select
            aria-label="Start local conversation"
            value=""
            onChange={(e) => {
              const contactId = e.target.value;
              if (!contactId) return;
              const existing = s.threads.find(
                (t) => t.channel === channel && t.contactId === contactId,
              );
              if (existing) {
                setSelected(existing.id);
                return;
              }
              const id = uid();
              if (
                update((state) => ({
                  ...state,
                  threads: [
                    ...state.threads,
                    {
                      id,
                      contactId,
                      channel,
                      assignee: state.team[0]?.name || "Unassigned",
                      status: "Open",
                      draft: "",
                    },
                  ],
                }))
              )
                setSelected(id);
            }}
          >
            <option value="">Start local conversation</option>
            {s.contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="console-inbox">
        <aside aria-label="Conversations">
          {threads.map((t) => (
            <button
              key={t.id}
              className={thread?.id === t.id ? "selected" : ""}
              onClick={() => setSelected(t.id)}
            >
              <strong>
                {s.contacts.find((c) => c.id === t.contactId)?.name}
              </strong>
              {channel === "Email" && (
                <span className="console-thread-subject">
                  {t.subject || "Earlier sample conversation"}
                </span>
              )}
              <small>
                {t.status} · {t.assignee}
                {channel === "Email"
                  ? ` · ${senders.find((r) => r.id === t.mailboxId)?.name || "Unassigned"}`
                  : ""}
              </small>
            </button>
          ))}
        </aside>
        <div className="console-conversation">
          {thread && contact ? (
            <>
              <div className="console-conversation-heading">
                <div>
                  <h3>{contact.name}</h3>
                  {channel === "Email" && (
                    <>
                      <p>{thread.subject || "Earlier sample conversation"}</p>
                      <small>
                        From:{" "}
                        {senders.find((r) => r.id === thread.mailboxId)?.data
                          .address || "Unassigned sample sender"}{" "}
                        · Not connected
                      </small>
                    </>
                  )}
                  <Badge>
                    {thread.status} ·{" "}
                    {contact.optedOut
                      ? "Opted out"
                      : contact.consent
                        ? "Consent recorded"
                        : "No consent"}
                  </Badge>
                </div>
                <select
                  aria-label="Conversation owner"
                  value={thread.assignee}
                  onChange={(e) =>
                    update((state) => ({
                      ...state,
                      threads: state.threads.map((t) =>
                        t.id === thread.id
                          ? { ...t, assignee: e.target.value }
                          : t,
                      ),
                    }))
                  }
                >
                  {[
                    ...new Set([thread.assignee, ...s.team.map((t) => t.name)]),
                  ].map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
                <button
                  className="secondary"
                  onClick={() =>
                    update((state) => ({
                      ...state,
                      threads: state.threads.map((t) =>
                        t.id === thread.id
                          ? {
                              ...t,
                              status: t.status === "Open" ? "Closed" : "Open",
                            }
                          : t,
                      ),
                    }))
                  }
                >
                  {thread.status === "Open" ? "Close" : "Reopen"}
                </button>
              </div>
              <div className="console-messages">
                {messagesForThread(s, thread).map((m) => (
                  <article
                    key={m.id}
                    className={m.direction === "outbound" ? "outbound" : ""}
                  >
                    <Badge>
                      {m.kind} · {m.direction}
                    </Badge>
                    {m.template ? (
                      <TemplatePreview content={m.template} />
                    ) : (
                      <>
                        {m.subject && <strong>{m.subject}</strong>}
                        <p>{m.body}</p>
                      </>
                    )}
                    {m.attachments?.map((file) => (
                      <a
                        className="secondary"
                        key={file.id}
                        href={file.dataUrl}
                        download={file.name}
                      >
                        Download local attachment: {file.name} (
                        {Math.ceil(file.size / 1024)} KB)
                      </a>
                    ))}
                    <small>{date(m.at)}</small>
                  </article>
                ))}
              </div>
              <label>
                Reply draft
                <textarea
                  aria-label="Reply draft"
                  rows={3}
                  maxLength={10000}
                  value={thread.draft}
                  onChange={(e) =>
                    update((state) => ({
                      ...state,
                      threads: state.threads.map((t) =>
                        t.id === thread.id
                          ? { ...t, draft: e.target.value }
                          : t,
                      ),
                    }))
                  }
                />
              </label>
              <div className="console-attachments">
                <label className="secondary console-file">
                  Attach sample file
                  <input
                    type="file"
                    accept="image/png,image/jpeg,application/pdf,text/plain"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      try {
                        if (
                          ![
                            "image/png",
                            "image/jpeg",
                            "application/pdf",
                            "text/plain",
                          ].includes(file.type)
                        )
                          throw Error("Use a PNG, JPEG, PDF or text sample.");
                        if (file.size > 1000000)
                          throw Error(
                            "Maximum sample attachment size is 1 MB.",
                          );
                        const dataUrl = await new Promise<string>(
                          (resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () =>
                              resolve(String(reader.result));
                            reader.onerror = () =>
                              reject(Error("File could not be read"));
                            reader.readAsDataURL(file);
                          },
                        );
                        update((state) => {
                          const current = state.threads.find(
                            (t) => t.id === thread.id,
                          );
                          const files = current?.attachments || [];
                          if (
                            files.length >= 3 ||
                            files.reduce((sum, a) => sum + a.size, 0) +
                              file.size >
                              1000000
                          )
                            throw Error(
                              "Maximum three sample files, totaling 1 MB.",
                            );
                          return {
                            ...state,
                            threads: state.threads.map((t) =>
                              t.id === thread.id
                                ? {
                                    ...t,
                                    attachments: [
                                      ...files,
                                      {
                                        id: uid(),
                                        name: file.name,
                                        type: file.type as
                                          | "image/png"
                                          | "image/jpeg"
                                          | "application/pdf"
                                          | "text/plain",
                                        size: file.size,
                                        dataUrl,
                                      },
                                    ],
                                  }
                                : t,
                            ),
                          };
                        });
                      } catch (err) {
                        notify((err as Error).message);
                      }
                    }}
                  />
                </label>
                {thread.attachments?.map((file) => (
                  <div key={file.id}>
                    <span>
                      {file.name} · {Math.ceil(file.size / 1024)} KB · Local
                      only
                    </span>
                    <button
                      className="text-button"
                      onClick={() =>
                        update((state) => ({
                          ...state,
                          threads: state.threads.map((t) =>
                            t.id === thread.id
                              ? {
                                  ...t,
                                  attachments: t.attachments?.filter(
                                    (f) => f.id !== file.id,
                                  ),
                                }
                              : t,
                          ),
                        }))
                      }
                    >
                      Remove attachment
                    </button>
                  </div>
                ))}
              </div>
              <div className="console-actions">
                <button
                  className="primary"
                  disabled={
                    (!thread.draft.trim() && !thread.attachments?.length) ||
                    thread.status === "Closed"
                  }
                  onClick={() => {
                    try {
                      if (update((state) => saveThreadReply(state, thread.id)))
                        notify(
                          "Reply saved in this local conversation. No message sent.",
                        );
                    } catch (err) {
                      notify((err as Error).message);
                    }
                  }}
                >
                  Save reply locally
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    if (
                      update((state) =>
                        recordIncoming(
                          state,
                          contact.id,
                          channel,
                          "Sample incoming reply: I am interested. Please have your team follow up.",
                          thread.id,
                        ),
                      )
                    )
                      notify(
                        "Incoming reply simulated; future outreach is suppressed when stop-on-reply is enabled.",
                      );
                  }}
                >
                  Simulate incoming reply
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    if (
                      update((state) =>
                        addActivity(
                          {
                            ...state,
                            contacts: state.contacts.map((c) =>
                              c.id === contact.id
                                ? { ...c, optedOut: true }
                                : c,
                            ),
                          },
                          contact.id,
                          "Contact opted out locally",
                          "opt_out",
                        ),
                      )
                    )
                      notify("Contact opted out of further simulations");
                  }}
                >
                  Record opt-out
                </button>
              </div>
              <button className="secondary" disabled>
                Send live — provider not connected
              </button>
              <p>
                Sample attachments stay in this browser. Live synchronization
                requires the provider integration phase.
              </p>
            </>
          ) : (
            <Empty>Start a local conversation to review this inbox.</Empty>
          )}
        </div>
      </div>
      {compose && (
        <Modal title="New local email thread" close={() => setCompose(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                let id = "";
                if (
                  update((state) => {
                    const created = createEmailThread(
                      state,
                      formValue(f, "contactId"),
                      formValue(f, "senderId"),
                      formValue(f, "subject"),
                    );
                    id = created.threadId;
                    return created.state;
                  })
                ) {
                  setSelected(id);
                  setMailbox("all");
                  setStatus("all");
                  setQuery("");
                  setCompose(false);
                  notify("Local email conversation created");
                }
              } catch (err) {
                notify((err as Error).message);
              }
            }}
          >
            <label>
              Contact
              <select name="contactId" required>
                <option value="">Choose contact with email</option>
                {s.contacts
                  .filter((c) => c.email)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.email}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Local sender draft
              <select
                name="senderId"
                defaultValue={
                  mailbox === "all" || mailbox === "unassigned" ? "" : mailbox
                }
              >
                <option value="">Unassigned sample sender</option>
                {senders
                  .filter((r) => r.data.archived !== "true")
                  .map((sender) => (
                    <option key={sender.id} value={sender.id}>
                      {sender.name} · {sender.data.address}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Subject
              <input name="subject" required maxLength={190} />
            </label>
            <p>
              Creating a local thread does not send an email or connect a
              mailbox.
            </p>
            <button className="primary">Create local thread</button>
          </form>
        </Modal>
      )}
    </Panel>
  );
}
