"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import type { AccountIdentity } from "@/lib/workspace-document";
import { Panel, Empty, Badge, date } from "./ui";
type Message = {
  id: string;
  body: string;
  direction: string;
  status: string;
  created_at: string;
  message_type: string | null;
  media_reference: { id: string; mimeType?: string; filename?: string } | null;
};
type Conversation = {
  id: string;
  status: string;
  assigned_to: string | null;
  last_inbound_at: string | null;
  contact?: {
    name: string;
    phone: string;
    consent: boolean;
    opted_out_at: string | null;
  };
};
type Data = {
  conversations: Conversation[];
  total: number;
  page: number;
  messages: Message[];
  timeline: {
    id: string;
    kind: string;
    created_at: string;
    payload: { status?: string; error_code?: string };
  }[];
  hasOlder: boolean;
  integration: { status: string; external_id: string } | null;
  members: { user_id: string; label: string; role: string }[];
  currentUserId: string;
};
export default function ProviderInbox({
  account,
}: {
  account?: AccountIdentity;
}) {
  const generation = useRef(0);
  const [loadedConversation, setLoadedConversation] = useState("");
  const [data, setData] = useState<Data | null>(null),
    [selected, setSelected] = useState(""),
    [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [cursor, setCursor] = useState<{ at: string; id: string } | null>(null);
  const load = useCallback(async () => {
    if (!account) return;
    const requestId = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (selected) params.set("conversation", selected);
      if (cursor) {
        params.set("before", cursor.at);
        params.set("beforeId", cursor.id);
      }
      const response = await fetch("/api/channels/whatsapp?" + params, {
        cache: "no-store",
        headers: { "x-workspace-id": account.workspaceId },
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(
          result.error?.message ||
            "Provider conversations could not be loaded.",
        );
      if (requestId === generation.current) {
        setData(result);
        setLoadedConversation(selected);
      }
    } catch (error) {
      if (requestId === generation.current) setError((error as Error).message);
    } finally {
      if (requestId === generation.current) setBusy(false);
    }
  }, [account?.workspaceId, page, selected, cursor]);
  useEffect(() => {
    void load();
  }, [load]);
  const current =
    loadedConversation === selected
      ? data?.conversations.find((c) => c.id === selected)
      : undefined;
  async function manage(assignedTo: string | null, status: string) {
    if (!account || !current) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/channels/whatsapp", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-id": account.workspaceId,
        },
        body: JSON.stringify({
          conversationId: current.id,
          assignedTo,
          status,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error?.message || "Assignment could not be saved.");
      await load();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel
      title="Provider WhatsApp conversations"
      description="Database records from stored provider events. Preview messages are kept in the draft inbox."
      action={
        account && (
          <button
            className="secondary"
            disabled={busy}
            onClick={() => {
              setCursor(null);
              void load();
            }}
          >
            Refresh records
          </button>
        )
      }
    >
      {!account ? (
        <Empty>
          Sign in to view your workspace’s provider conversations.{" "}
          <a href="/account">Open account workspace</a>
        </Empty>
      ) : (
        <>
          {error && (
            <div className="console-error" role="alert">
              {error}
            </div>
          )}
          {busy && <p role="status">Loading provider records…</p>}
          {data && (
            <>
              <div className="console-actions">
                <Badge>
                  {data.integration
                    ? `Authorization record: ${data.integration.status}`
                    : "No Meta connection recorded"}
                </Badge>
                <span>
                  Live sending remains disabled. Refresh to check for new
                  normalized events.
                </span>
              </div>
              <div className="console-inbox">
                <aside aria-label="Provider conversations">
                  {data.conversations.map((c) => (
                    <button
                      key={c.id}
                      className={c.id === selected ? "active" : ""}
                      onClick={() => {
                        setSelected(c.id);
                        setCursor(null);
                      }}
                    >
                      <strong>
                        {c.contact?.name || c.contact?.phone || "Contact"}
                      </strong>
                      <small>
                        {c.contact?.phone} · {c.status}
                      </small>
                    </button>
                  ))}
                  {!data.conversations.length && (
                    <Empty>No provider conversations in this workspace.</Empty>
                  )}
                  <div className="console-actions">
                    <button
                      className="secondary"
                      disabled={page === 1 || busy}
                      onClick={() => {
                        setPage((p) => p - 1);
                        setSelected("");
                        setCursor(null);
                      }}
                    >
                      Previous
                    </button>
                    <span>Page {page}</span>
                    <button
                      className="secondary"
                      disabled={page * 25 >= data.total || busy}
                      onClick={() => {
                        setPage((p) => p + 1);
                        setSelected("");
                        setCursor(null);
                      }}
                    >
                      Next
                    </button>
                  </div>
                </aside>
                <div>
                  {current ? (
                    <>
                      <div className="console-conversation-heading">
                        <div>
                          <h3>{current.contact?.name}</h3>
                          <p>{current.contact?.phone}</p>
                          <Badge>{current.status}</Badge>
                          <p>
                            Marketing opt-in:{" "}
                            {current.contact?.opted_out_at
                              ? "Opted out"
                              : current.contact?.consent
                                ? "Recorded"
                                : "Not recorded"}
                          </p>
                        </div>
                        <div>
                          <label>
                            Assigned member
                            <select
                              disabled={busy}
                              value={current.assigned_to || ""}
                              onChange={(event) =>
                                void manage(
                                  event.target.value || null,
                                  current.status,
                                )
                              }
                            >
                              <option value="">Unassigned</option>
                              {data.members.map((m) => (
                                <option key={m.user_id} value={m.user_id}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="console-actions">
                            <button
                              className="secondary"
                              disabled={busy}
                              onClick={() =>
                                void manage(data.currentUserId, current.status)
                              }
                            >
                              Take over
                            </button>
                            <button
                              className="secondary"
                              disabled={busy}
                              onClick={() =>
                                void manage(
                                  current.assigned_to,
                                  current.status === "closed"
                                    ? "open"
                                    : "closed",
                                )
                              }
                            >
                              {current.status === "closed" ? "Reopen" : "Close"}
                            </button>
                          </div>
                        </div>
                      </div>
                      <p>
                        Last incoming message:{" "}
                        {current.last_inbound_at
                          ? date(current.last_inbound_at)
                          : "Not recorded"}
                        . Incoming contact creation never grants marketing
                        opt-in.
                      </p>
                      <div className="console-messages">
                        {data.messages.map((m) => (
                          <article
                            key={m.id}
                            className={
                              m.direction === "outbound" ? "outbound" : ""
                            }
                          >
                            <Badge>
                              {m.direction} · {m.status}
                            </Badge>
                            <p>{m.body}</p>
                            {m.media_reference && (
                              <p>
                                Private media reference:{" "}
                                {m.media_reference.filename ||
                                  m.message_type ||
                                  "Attachment"}
                                . Downloads await authorized media integration.
                              </p>
                            )}
                            <small>{date(m.created_at)}</small>
                          </article>
                        ))}
                      </div>
                      <div className="console-actions">
                        {data.hasOlder && (
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={() => {
                              const m = data.messages[0];
                              if (m) setCursor({ at: m.created_at, id: m.id });
                            }}
                          >
                            Older messages
                          </button>
                        )}
                        {cursor && (
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={() => setCursor(null)}
                          >
                            Latest messages
                          </button>
                        )}
                        <button className="secondary" disabled>
                          Send reply — acceptance pending
                        </button>
                      </div>
                      <h3>Recent contact timeline</h3>
                      <p>
                        Up to 100 recent events across this contact’s channels.
                      </p>
                      {data.timeline.map((event) => (
                        <div className="console-activity" key={event.id}>
                          <span>
                            {event.kind}
                            {event.payload.status
                              ? ` · ${event.payload.status}`
                              : ""}
                            {event.payload.error_code
                              ? ` · Code ${event.payload.error_code}`
                              : ""}
                          </span>
                          <small>{date(event.created_at)}</small>
                        </div>
                      ))}
                    </>
                  ) : (
                    <Empty>
                      Select a provider conversation to review messages and its
                      timeline.
                    </Empty>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </Panel>
  );
}
