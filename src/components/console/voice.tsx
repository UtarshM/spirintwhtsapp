"use client";
import { useState } from "react";
import { useWorkspace } from "../local-provider";
import { uid, now, toCsv, type LocalAgent } from "@/lib/local-workspace";
import { simulateCall } from "@/lib/outreach";
import { Panel, Empty, Modal, Badge, formValue, date, download } from "./ui";
export default function Voice({
  view,
  notify,
}: {
  view: string;
  notify: (s: string) => void;
}) {
  const { state: s, update } = useWorkspace();
  const [edit, setEdit] = useState<LocalAgent | null | undefined>(),
    [test, setTest] = useState(false),
    [log, setLog] = useState("");
  const call = s.calls.find((c) => c.id === log);
  return (
    <>
      <Panel
        title={
          view === "Agent Builder"
            ? "Voice agent builder"
            : view === "Call Center"
              ? "Call center preview"
              : "Call logs"
        }
        description="Scripts and call outcomes are local simulations. No speech model or telephony connection is active."
        action={
          <div className="console-actions">
            <button className="secondary" onClick={() => setTest(true)}>
              Scripted call preview
            </button>
            <button className="primary" onClick={() => setEdit(null)}>
              Create voice agent
            </button>
          </div>
        }
      >
        {view === "Agent Builder" && (
          <div className="console-card-grid">
            {s.agents.map((a) => (
              <article className="console-mini-card" key={a.id}>
                <Badge>{a.language} · Draft agent</Badge>
                <h3>{a.name}</h3>
                <p>{a.instructions.slice(0, 200)}</p>
                <small>
                  {a.maxDuration}s maximum · {a.concurrency} concurrency ·{" "}
                  {a.voice || "Voice not selected"}
                </small>
                <button className="secondary" onClick={() => setEdit(a)}>
                  Edit agent
                </button>
              </article>
            ))}
          </div>
        )}
        {!s.agents.length && (
          <Empty>
            Create an agent, then run a scripted preview against a consenting
            sample contact.
          </Empty>
        )}
        {view !== "Agent Builder" && (
          <>
            <div className="console-toolbar">
              <button
                className="secondary"
                onClick={() =>
                  download(
                    "sprint-sample-call-logs.csv",
                    toCsv([
                      ["agent", "contact", "outcome", "seconds", "time"],
                      ...s.calls.map((c) => [
                        s.agents.find((a) => a.id === c.agentId)?.name,
                        s.contacts.find((p) => p.id === c.contactId)?.name,
                        c.outcome,
                        c.duration,
                        c.at,
                      ]),
                    ]),
                    "text/csv",
                  )
                }
              >
                Export sample logs
              </button>
              <Badge>{s.calls.length} simulated calls · 0 live calls</Badge>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Agent</th>
                    <th>Outcome</th>
                    <th>Duration</th>
                    <th>Time</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {s.calls.map((c) => (
                    <tr key={c.id}>
                      <td>
                        {s.contacts.find((p) => p.id === c.contactId)?.name}
                      </td>
                      <td>{s.agents.find((a) => a.id === c.agentId)?.name}</td>
                      <td>
                        <Badge>{c.outcome}</Badge>
                      </td>
                      <td>{c.duration}s</td>
                      <td>{date(c.at)}</td>
                      <td>
                        <button
                          className="secondary"
                          onClick={() => setLog(c.id)}
                        >
                          Transcript
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!s.calls.length && <Empty>No call previews recorded.</Empty>}
            <button className="secondary" disabled>
              Start live calling — telephony acceptance required
            </button>
          </>
        )}
      </Panel>
      {edit !== undefined && (
        <Modal
          title="Voice agent configuration"
          close={() => setEdit(undefined)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const agent: LocalAgent = {
                id: edit?.id || uid(),
                name: formValue(f, "name"),
                language: formValue(f, "language") as "English" | "Hindi",
                voice: formValue(f, "voice"),
                instructions: formValue(f, "instructions"),
                knowledge: formValue(f, "knowledge"),
                qualification: formValue(f, "qualification"),
                maxDuration: Number(f.get("maxDuration")),
                concurrency: Number(f.get("concurrency")),
                handoff: formValue(f, "handoff"),
                updatedAt: now(),
              };
              if (
                update((state) => ({
                  ...state,
                  agents: edit
                    ? state.agents.map((a) => (a.id === agent.id ? agent : a))
                    : [...state.agents, agent],
                }))
              ) {
                setEdit(undefined);
                notify("Voice agent saved locally");
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
            <div className="console-form-grid">
              <label>
                Language
                <select
                  name="language"
                  defaultValue={edit?.language || "English"}
                >
                  <option>English</option>
                  <option>Hindi</option>
                </select>
              </label>
              <label>
                Voice preference (draft)
                <input
                  name="voice"
                  maxLength={200}
                  defaultValue={edit?.voice}
                  placeholder="Natural, conversational"
                />
              </label>
            </div>
            <label>
              Instructions / script
              <textarea
                name="instructions"
                required
                rows={4}
                maxLength={10000}
                defaultValue={edit?.instructions}
              />
            </label>
            <label>
              Knowledge notes
              <textarea
                name="knowledge"
                rows={4}
                maxLength={30000}
                defaultValue={edit?.knowledge}
              />
            </label>
            <label>
              Qualification questions
              <textarea
                name="qualification"
                maxLength={2000}
                defaultValue={edit?.qualification}
              />
            </label>
            <div className="console-form-grid">
              <label>
                Maximum call seconds
                <input
                  name="maxDuration"
                  type="number"
                  min={30}
                  max={900}
                  required
                  defaultValue={edit?.maxDuration || 120}
                />
              </label>
              <label>
                Concurrency limit
                <input
                  name="concurrency"
                  type="number"
                  min={1}
                  max={20}
                  required
                  defaultValue={edit?.concurrency || 1}
                />
              </label>
            </div>
            <label>
              Human handoff instructions
              <input
                name="handoff"
                maxLength={200}
                defaultValue={edit?.handoff}
              />
            </label>
            <button className="primary">Save agent draft</button>
          </form>
        </Modal>
      )}
      {test && (
        <Modal title="Scripted call preview" close={() => setTest(false)}>
          <p>
            This creates a deterministic sample transcript and the outcome you
            choose. It is not an AI conversation. Cost: 5 sample credits per
            started minute.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                if (
                  update((state) =>
                    simulateCall(
                      state,
                      formValue(f, "agent"),
                      formValue(f, "contact"),
                      formValue(f, "outcome") as
                        "Qualified" | "Follow-up" | "Not interested",
                      Number(f.get("duration")),
                    ),
                  )
                ) {
                  setTest(false);
                  notify(
                    "Scripted preview logged; contact status and sample credits updated",
                  );
                }
              } catch (err) {
                notify((err as Error).message);
              }
            }}
          >
            <label>
              Agent
              <select name="agent" required>
                <option value="">Choose agent</option>
                {s.agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sample contact
              <select name="contact" required>
                <option value="">Choose contact</option>
                {s.contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Outcome
              <select name="outcome">
                <option>Qualified</option>
                <option>Follow-up</option>
                <option>Not interested</option>
              </select>
            </label>
            <label>
              Duration (seconds)
              <input
                type="number"
                name="duration"
                min={1}
                max={900}
                required
                defaultValue={60}
              />
            </label>
            <button className="primary">Run scripted preview</button>
          </form>
        </Modal>
      )}
      {call && (
        <Modal title="Sample call transcript" close={() => setLog("")}>
          <Badge>Simulation · {call.outcome}</Badge>
          {call.transcript.map((line, i) => (
            <p className="console-transcript" key={i}>
              <strong>{line.speaker}</strong>
              <br />
              {line.text}
            </p>
          ))}
          <p>
            No recording was created. Live recording requires private storage
            and signed access.
          </p>
          <button
            className="secondary"
            onClick={() =>
              download(
                "sample-transcript.txt",
                call.transcript
                  .map((line) => `${line.speaker}: ${line.text}`)
                  .join("\n\n"),
              )
            }
          >
            Export transcript
          </button>
        </Modal>
      )}
    </>
  );
}
