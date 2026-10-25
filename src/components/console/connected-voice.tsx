"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AccountIdentity } from "@/lib/workspace-document";
import type { VoiceAgent } from "@/lib/voice";
import { Badge, Empty, Panel, date, download } from "./ui";
type Call = {
  id: string;
  contact_id: string;
  agent_id: string;
  status: string;
  duration_seconds: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  last_error: string | null;
  outcome: string | null;
};
type Turn = {
  id: string;
  role: string;
  content: string;
  interrupted: boolean;
  created_at: string;
};
type Data = {
  timezone: string;
  agents: (VoiceAgent & { id: string })[];
  calls: Call[];
  contacts: {
    id: string;
    name: string;
    phone: string | null;
    consent: boolean;
    opted_out_at: string | null;
  }[];
  settings: {
    caller_id: string;
    transfer_number: string | null;
    enabled: boolean;
  } | null;
  windows: {
    weekday: number;
    start_time: string;
    end_time: string;
    enabled: boolean;
  }[];
  readiness: {
    configured: boolean;
    enabled: boolean;
    accepted: boolean;
    canCall: boolean;
  };
  canManage: boolean;
};
const initial: VoiceAgent = {
  name: "",
  language: "en",
  instructions: "",
  knowledge: "",
  greeting: "Hello, I am your AI assistant. Is now a good time to talk?",
  max_duration_seconds: 300,
  max_concurrency: 1,
  status: "draft",
};
export default function ConnectedVoice({
  account,
  view = "setup",
}: {
  account?: AccountIdentity;
  view?: "setup" | "agents" | "calls" | "logs" | "overview";
}) {
  const [data, setData] = useState<Data>(),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  const [agent, setAgent] = useState<VoiceAgent>(initial),
    [agentId, setAgentId] = useState(""),
    [contactId, setContactId] = useState("");
  const [turns, setTurns] = useState<Turn[]>(),
    [selectedCall, setSelectedCall] = useState("");
  const intent = useRef<{ key: string; agent: string; contact: string } | null>(
    null,
  );
  const [uncertain, setUncertain] = useState(false);
  const [windows, setWindows] = useState(
    Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      start: "09:00",
      end: "18:00",
      enabled: false,
    })),
  );
  const identity = useRef(account?.workspaceId);
  const transcriptRequest = useRef(0);
  identity.current = account?.workspaceId;
  useEffect(() => {
    if (!account) return;
    const controller = new AbortController();
    setError("");
    void fetch("/api/voice", {
      cache: "no-store",
      headers: { "x-workspace-id": account.workspaceId },
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw Error(body.error?.message || "Calling records unavailable.");
        if (!controller.signal.aborted) {
          setData(body);
          setWindows(
            Array.from({ length: 7 }, (_, weekday) => {
              const saved = body.windows.find(
                (w: Data["windows"][number]) => w.weekday === weekday,
              );
              return saved
                ? {
                    weekday,
                    start: saved.start_time.slice(0, 5),
                    end: saved.end_time.slice(0, 5),
                    enabled: saved.enabled,
                  }
                : { weekday, start: "09:00", end: "18:00", enabled: false };
            }),
          );
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [account?.workspaceId, revision]);
  async function post(path: string, body?: object) {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-workspace-id": account!.workspaceId,
      },
      body: JSON.stringify(body || {}),
    });
    const result = await response.json();
    if (!response.ok)
      throw Error(result.error?.message || "Operation could not be completed.");
    return result;
  }
  async function saveAgent(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await post("/api/voice", { action: "agent", agent });
      setAgent(initial);
      setMessage("Agent saved to this account.");
      setRevision((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function call() {
    if (uncertain) return;
    if (
      !intent.current ||
      intent.current.agent !== agentId ||
      intent.current.contact !== contactId
    )
      intent.current = {
        key: crypto.randomUUID(),
        agent: agentId,
        contact: contactId,
      };
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await post("/api/voice", {
        action: "call",
        agentId,
        contactId,
        requestKey: intent.current.key,
      });
      setMessage(
        `Call ${result.replay ? "already recorded" : "requested"}: ${result.status}.`,
      );
      intent.current = null;
      setRevision((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
      setUncertain(true);
    } finally {
      setBusy(false);
    }
  }
  async function transcript(id: string) {
    const generation = ++transcriptRequest.current;
    const workspace = account!.workspaceId;
    setError("");
    setTurns(undefined);
    setSelectedCall(id);
    try {
      const response = await fetch(`/api/voice/${id}`, {
        headers: { "x-workspace-id": workspace },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error?.message || "Transcript unavailable.");
      if (
        identity.current === workspace &&
        generation === transcriptRequest.current
      )
        setTurns(result.turns);
    } catch (e) {
      if (
        identity.current === workspace &&
        generation === transcriptRequest.current
      )
        setError((e as Error).message);
    }
  }
  if (!account)
    return (
      <Panel title="Connected AI calling">
        <Empty>
          Sign in to create account agents, connect an approved number and view
          provider call records.
        </Empty>
        <a className="primary" href="/login">
          Sign in
        </a>
        <p>
          The Agent builder and Call center previews remain available in the
          other menu entries.
        </p>
      </Panel>
    );
  return (
    <>
      {error && (
        <div className="console-error" role="alert">
          {error}
        </div>
      )}
      {message && <p role="status">{message}</p>}
      <Panel
        title="Connected AI calling"
        description="Create voice agents, place account calls and review conversations."
        action={
          <button
            className="secondary"
            disabled={busy}
            onClick={() => setRevision((v) => v + 1)}
          >
            Refresh records
          </button>
        }
      >
        {!data && !error && <p>Loading account records…</p>}
        {data && (
          <>
            <Badge>
              {data.readiness.canCall
                ? "Calling enabled"
                : "Setup required · calling disabled"}
            </Badge>
            <div className="console-card-grid">
              <article className="console-mini-card">
                <h3>Calling service</h3>
                <p>
                  {data.readiness.configured
                    ? "Service settings are saved. Live calling still needs acceptance checks."
                    : "The calling service and voice settings are not ready yet."}
                </p>
              </article>
              <article className="console-mini-card">
                <h3>Business number</h3>
                <p>
                  {data.settings
                    ? data.settings.caller_id
                    : "No approved caller number assigned."}
                </p>
                <p>
                  {data.settings?.transfer_number
                    ? `Human transfer: ${data.settings.transfer_number}`
                    : "No human transfer destination assigned."}
                </p>
              </article>
              <article className="console-mini-card">
                <h3>Launch checks</h3>
                <p>
                  {data.readiness.accepted
                    ? "Provider acceptance recorded."
                    : "Live conversation, interruption, transfer and billing tests pending."}
                </p>
                <p>
                  {data.windows.some((w) => w.enabled)
                    ? "Account calling hours configured."
                    : "Account calling hours need configuration."}
                </p>
              </article>
            </div>
            <p>
              Only account contacts with consent, an approved destination,
              available credits and an active calling window can be called.
              Preview contacts and agents are separate.
            </p>
          </>
        )}
      </Panel>
      {data && view === "overview" && (
        <Panel
          title="Recent calling activity"
          description="Metrics cover the latest 100 account call records, including unresolved requests."
        >
          <div className="console-card-grid">
            <article className="console-mini-card">
              <h3>Calls reviewed</h3>
              <strong>{data.calls.length}</strong>
            </article>
            <article className="console-mini-card">
              <h3>Answered</h3>
              <strong>{data.calls.filter((c) => c.started_at).length}</strong>
            </article>
            <article className="console-mini-card">
              <h3>Average billed duration</h3>
              <strong>
                {(() => {
                  const ended = data.calls.filter((c) => c.ended_at);
                  return ended.length
                    ? Math.round(
                        ended.reduce((sum, c) => sum + c.duration_seconds, 0) /
                          ended.length,
                      )
                    : 0;
                })()}
                s
              </strong>
            </article>
            <article className="console-mini-card">
              <h3>Awaiting completion</h3>
              <strong>{data.calls.filter((c) => !c.ended_at).length}</strong>
            </article>
          </div>
        </Panel>
      )}
      {data && view === "setup" && (
        <Panel
          title="Account calling hours"
          description={`These hours control real calls in ${data.timezone}.`}
        >
          <form
            className="console-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await post("/api/voice", { action: "windows", windows });
                setMessage("Account calling hours saved.");
                setRevision((v) => v + 1);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {windows.map((w, i) => (
              <div className="console-actions" key={w.weekday}>
                <label>
                  <input
                    type="checkbox"
                    checked={w.enabled}
                    onChange={(e) =>
                      setWindows((items) =>
                        items.map((item, n) =>
                          n === i
                            ? { ...item, enabled: e.target.checked }
                            : item,
                        ),
                      )
                    }
                  />
                  {
                    [
                      "Sunday",
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                    ][w.weekday]
                  }
                </label>
                <label>
                  From
                  <input
                    required
                    type="time"
                    value={w.start}
                    onChange={(e) =>
                      setWindows((items) =>
                        items.map((item, n) =>
                          n === i ? { ...item, start: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Until
                  <input
                    required
                    type="time"
                    value={w.end}
                    onChange={(e) =>
                      setWindows((items) =>
                        items.map((item, n) =>
                          n === i ? { ...item, end: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </label>
              </div>
            ))}
            <button className="primary" disabled={busy || !data.canManage}>
              Save calling hours
            </button>
          </form>
        </Panel>
      )}
      {data && (view === "agents" || view === "setup") && (
        <Panel
          title="Account agents"
          description="Saved to the database. Ready agents still require the launch checks above."
        >
          <div className="console-card-grid">
            {data.agents.map((a) => (
              <article className="console-mini-card" key={a.id}>
                <Badge>{a.status}</Badge>
                <h3>{a.name}</h3>
                <p>
                  {a.language === "hi" ? "Hindi" : "English"} · Up to{" "}
                  {a.max_duration_seconds}s · {a.max_concurrency} concurrent
                </p>
                <button
                  className="secondary"
                  disabled={!data.canManage || busy}
                  onClick={() => setAgent(a)}
                >
                  Edit agent
                </button>
              </article>
            ))}
          </div>
          {!data.agents.length && <Empty>No account agents yet.</Empty>}
          <form className="console-form" onSubmit={saveAgent}>
            <h3>{agent.id ? "Edit agent" : "Create an agent"}</h3>
            <label>
              Name
              <input
                required
                maxLength={120}
                value={agent.name}
                onChange={(e) => setAgent({ ...agent, name: e.target.value })}
              />
            </label>
            <label>
              Language
              <select
                value={agent.language}
                onChange={(e) =>
                  setAgent({
                    ...agent,
                    language: e.target.value as "en" | "hi",
                  })
                }
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </label>
            <label>
              Opening message
              <textarea
                required
                minLength={10}
                maxLength={350}
                value={agent.greeting}
                onChange={(e) =>
                  setAgent({ ...agent, greeting: e.target.value })
                }
              />
              <small>
                Identify the assistant as AI and explain the reason for calling.
              </small>
            </label>
            <label>
              Instructions
              <textarea
                required
                minLength={10}
                maxLength={6000}
                value={agent.instructions}
                onChange={(e) =>
                  setAgent({ ...agent, instructions: e.target.value })
                }
              />
            </label>
            <label>
              Business knowledge
              <textarea
                maxLength={12000}
                value={agent.knowledge}
                onChange={(e) =>
                  setAgent({ ...agent, knowledge: e.target.value })
                }
              />
            </label>
            <label>
              Maximum duration (seconds)
              <input
                type="number"
                min={30}
                max={900}
                required
                value={agent.max_duration_seconds}
                onChange={(e) =>
                  setAgent({
                    ...agent,
                    max_duration_seconds: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Concurrent calls
              <input
                type="number"
                min={1}
                max={20}
                required
                value={agent.max_concurrency}
                onChange={(e) =>
                  setAgent({
                    ...agent,
                    max_concurrency: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Status
              <select
                value={agent.status}
                onChange={(e) =>
                  setAgent({
                    ...agent,
                    status: e.target.value as "draft" | "ready",
                  })
                }
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
              </select>
            </label>
            <div className="console-actions">
              <button className="primary" disabled={busy || !data.canManage}>
                Save account agent
              </button>
              {agent.id && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setAgent(initial)}
                >
                  Cancel editing
                </button>
              )}
            </div>
            {!data.canManage && (
              <p>An administrator with MFA must manage calling.</p>
            )}
          </form>
        </Panel>
      )}
      {data && (view === "calls" || view === "setup") && (
        <Panel
          title="Place an account call"
          description="This action places a real telephone call when calling is enabled."
        >
          <div className="console-form">
            <label>
              Ready agent
              <select
                disabled={busy || uncertain}
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
              >
                <option value="">Select an agent</option>
                {data.agents
                  .filter((a) => a.status === "ready")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Account contact
              <select
                disabled={busy || uncertain}
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
              >
                <option value="">Select a contact</option>
                {data.contacts
                  .filter((c) => c.consent && !c.opted_out_at && c.phone)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.phone}
                    </option>
                  ))}
              </select>
            </label>
            <button
              className="primary"
              disabled={
                !data.readiness.canCall ||
                !data.canManage ||
                !agentId ||
                !contactId ||
                busy ||
                uncertain
              }
              onClick={() => void call()}
            >
              Place call
            </button>
            {uncertain && (
              <p>
                A request failed. Review the call records and provider outcome
                before placing another call. This screen will not retry
                automatically.
              </p>
            )}
          </div>
        </Panel>
      )}
      {data && (
        <Panel
          title="Provider call history"
          description="Actual account records. Transcripts contain recognized speech and generated responses; interrupted responses are marked."
        >
          {!data.calls.length ? (
            <Empty>No provider calls recorded.</Empty>
          ) : (
            <div className="console-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Started</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.calls.map((c) => (
                    <tr key={c.id}>
                      <td>
                        {data.contacts.find((p) => p.id === c.contact_id)
                          ?.name || "Account contact"}
                      </td>
                      <td>{date(c.created_at)}</td>
                      <td>
                        <Badge>{c.status}</Badge>
                        {c.outcome && <p>{c.outcome.replaceAll("_", " ")}</p>}
                        {c.last_error && <p>Review required</p>}
                      </td>
                      <td>{c.duration_seconds}s</td>
                      <td>
                        <button
                          className="secondary"
                          onClick={() => void transcript(c.id)}
                        >
                          Transcript
                        </button>
                        {!c.ended_at && data.canManage && (
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                await post(`/api/voice/${c.id}`);
                                setMessage(
                                  "Stop requested. Awaiting provider completion.",
                                );
                              } catch (e) {
                                setError((e as Error).message);
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            Stop call
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {selectedCall && turns && (
            <div>
              <h3>Call transcript</h3>
              {!turns.length && <p>No transcript turns recorded.</p>}
              {turns.map((t) => (
                <p key={t.id}>
                  <strong>
                    {t.role}
                    {t.interrupted ? " (interrupted)" : ""}:
                  </strong>{" "}
                  {t.content}
                </p>
              ))}
              <button
                className="secondary"
                onClick={() =>
                  download(
                    `call-${selectedCall}.txt`,
                    turns
                      .map(
                        (t) =>
                          `${t.role}${t.interrupted ? " (interrupted)" : ""}: ${t.content}`,
                      )
                      .join("\n"),
                  )
                }
              >
                Download transcript
              </button>
            </div>
          )}
        </Panel>
      )}
    </>
  );
}
