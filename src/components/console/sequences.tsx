"use client";
import { useState } from "react";
import { useWorkspace } from "../local-provider";
import {
  uid,
  now,
  validateSequence,
  type LocalSequence,
} from "@/lib/local-workspace";
import { startSequence, advanceSequence } from "@/lib/outreach";
import { Panel, Empty, Modal, Badge, formValue, date } from "./ui";
type Step = LocalSequence["steps"][number];
export default function Sequences({ notify }: { notify: (s: string) => void }) {
  const { state: s, update } = useWorkspace();
  const [edit, setEdit] = useState<LocalSequence | null | undefined>(),
    [steps, setSteps] = useState<Step[]>([]),
    [runContact, setRunContact] = useState(""),
    [sequenceId, setSequenceId] = useState("");
  const add = (type: Step["type"]) =>
    setSteps((current) => [
      ...current,
      {
        id: uid(),
        type,
        templateId: "",
        agentId: "",
        minutes: 60,
        condition: "Consent recorded",
      },
    ]);
  const patch = (id: string, value: Partial<Step>) =>
    setSteps((current) =>
      current.map((step) => (step.id === id ? { ...step, ...value } : step)),
    );
  return (
    <>
      <Panel
        title="Outreach sequences"
        description="Arrange channel actions, waits, conditions and handoffs. Execute one explicit local step at a time."
        action={
          <button
            className="primary"
            onClick={() => {
              setSteps([]);
              setEdit(null);
            }}
          >
            Create sequence
          </button>
        }
      >
        <div className="console-card-grid">
          {s.sequences.map((seq) => (
            <article className="console-mini-card" key={seq.id}>
              <h3>{seq.name}</h3>
              <p>{seq.description}</p>
              <p>{seq.steps.map((step) => step.type).join(" → ")}</p>
              <Badge>
                {validateSequence(s, seq).length
                  ? "Needs configuration"
                  : "Ready for simulation"}
              </Badge>
              <button
                className="secondary"
                onClick={() => {
                  setSteps(structuredClone(seq.steps));
                  setEdit(seq);
                }}
              >
                Edit sequence
              </button>
              <button
                className="secondary"
                onClick={() => setSequenceId(seq.id)}
              >
                Start local run
              </button>
            </article>
          ))}
        </div>
        {!s.sequences.length && (
          <Empty>
            Create a sequence that connects your WhatsApp, email and calling
            actions.
          </Empty>
        )}
      </Panel>
      <Panel
        title="Sequence execution history"
        description="A wait never triggers background outreach. Advance the preview clock explicitly to test a delay."
      >
        {s.sequenceRuns.map((run) => (
          <article className="console-mini-card" key={run.id}>
            <h3>
              {s.sequences.find((seq) => seq.id === run.sequenceId)?.name ||
                "Sequence"}{" "}
              · {s.contacts.find((c) => c.id === run.contactId)?.name}
            </h3>
            <Badge>{run.status}</Badge>
            <p>
              Step {Math.min(run.cursor + 1, run.steps.length)} /{" "}
              {run.steps.length}
              {run.nextAt && ` · Waiting until ${date(run.nextAt)}`}
            </p>
            <ol>
              {run.history.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
            {!["Completed", "Stopped"].includes(run.status) && (
              <div className="console-actions">
                <button
                  className="primary"
                  onClick={() => {
                    try {
                      if (update((state) => advanceSequence(state, run.id)))
                        notify("Local run advanced");
                    } catch (err) {
                      notify((err as Error).message);
                    }
                  }}
                >
                  Execute next local step
                </button>
                {run.status === "Waiting" && (
                  <button
                    className="secondary"
                    onClick={() => {
                      try {
                        update((state) => advanceSequence(state, run.id, true));
                      } catch (err) {
                        notify((err as Error).message);
                      }
                    }}
                  >
                    Advance simulated clock
                  </button>
                )}
                <button
                  className="secondary"
                  onClick={() =>
                    update((state) => ({
                      ...state,
                      sequenceRuns: state.sequenceRuns.map((r) =>
                        r.id === run.id
                          ? {
                              ...r,
                              status: "Stopped",
                              history: [...r.history, "Stopped manually."],
                            }
                          : r,
                      ),
                    }))
                  }
                >
                  Stop run
                </button>
              </div>
            )}
          </article>
        ))}
        {!s.sequenceRuns.length && <Empty>No sequence simulations yet.</Empty>}
      </Panel>
      {edit !== undefined && (
        <Modal title="Sequence builder" close={() => setEdit(undefined)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const seq: LocalSequence = {
                id: edit?.id || uid(),
                name: formValue(f, "name"),
                description: formValue(f, "description"),
                steps,
                updatedAt: now(),
              };
              if (!steps.length) {
                notify("Add at least one step");
                return;
              }
              if (
                update((state) => ({
                  ...state,
                  sequences: edit
                    ? state.sequences.map((x) => (x.id === seq.id ? seq : x))
                    : [...state.sequences, seq],
                }))
              ) {
                setEdit(undefined);
                notify(
                  "Sequence saved locally. Existing runs retain their step snapshot.",
                );
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
            <label>
              Description
              <textarea
                name="description"
                maxLength={2000}
                defaultValue={edit?.description}
              />
            </label>
            <div className="console-node-list">
              {steps.map((step, i) => (
                <article key={step.id}>
                  <header>
                    <strong>
                      {i + 1}. {step.type}
                    </strong>
                    <div className="console-actions">
                      <button
                        type="button"
                        className="text-button"
                        disabled={i === 0}
                        onClick={() =>
                          setSteps((current) => {
                            const copy = [...current];
                            [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
                            return copy;
                          })
                        }
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() =>
                          setSteps((current) =>
                            current.filter((x) => x.id !== step.id),
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </header>
                  {["WhatsApp", "Email"].includes(step.type) && (
                    <label>
                      Ready template
                      <select
                        value={step.templateId}
                        onChange={(e) =>
                          patch(step.id, { templateId: e.target.value })
                        }
                      >
                        <option value="">Choose template</option>
                        {s.templates
                          .filter(
                            (t) =>
                              t.channel === step.type && t.status === "Ready",
                          )
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                  {step.type === "Email" && (
                    <label>
                      Local sender draft
                      <select
                        value={step.senderId || ""}
                        onChange={(e) =>
                          patch(step.id, { senderId: e.target.value })
                        }
                      >
                        <option value="">Unassigned sample sender</option>
                        {s.resources
                          .filter(
                            (r) =>
                              r.kind === "sender" && r.data.archived !== "true",
                          )
                          .map((sender) => (
                            <option key={sender.id} value={sender.id}>
                              {sender.name} · {sender.data.address}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                  {step.type === "AI calling" && (
                    <label>
                      Voice agent
                      <select
                        value={step.agentId}
                        onChange={(e) =>
                          patch(step.id, { agentId: e.target.value })
                        }
                      >
                        <option value="">Choose agent</option>
                        {s.agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {step.type === "Delay" && (
                    <label>
                      Wait in minutes
                      <input
                        type="number"
                        min={1}
                        max={43200}
                        value={step.minutes}
                        onChange={(e) =>
                          patch(step.id, { minutes: Number(e.target.value) })
                        }
                      />
                    </label>
                  )}
                  {step.type === "Condition" && (
                    <label>
                      Continue only when
                      <select
                        value={step.condition}
                        onChange={(e) =>
                          patch(step.id, {
                            condition: e.target.value as Step["condition"],
                          })
                        }
                      >
                        <option>Consent recorded</option>
                        <option>Qualified lead</option>
                      </select>
                    </label>
                  )}
                  {step.type === "Handoff" && (
                    <p>
                      Create a local follow-up task and stop subsequent
                      outreach.
                    </p>
                  )}
                </article>
              ))}
            </div>
            <div className="console-actions">
              {(
                [
                  "WhatsApp",
                  "Email",
                  "AI calling",
                  "Delay",
                  "Condition",
                  "Handoff",
                ] as const
              ).map((type) => (
                <button
                  type="button"
                  className="secondary"
                  key={type}
                  disabled={steps.length >= 50}
                  onClick={() => add(type)}
                >
                  + {type}
                </button>
              ))}
            </div>
            <button className="primary">Save sequence</button>
          </form>
        </Modal>
      )}
      {sequenceId && (
        <Modal title="Enroll sample contact" close={() => setSequenceId("")}>
          <label>
            Contact
            <select
              value={runContact}
              onChange={(e) => setRunContact(e.target.value)}
            >
              <option value="">Choose contact</option>
              {s.contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <p>
            Consent, opt-out and stop-on-reply are checked on each step. Channel
            actions deduct sample credits.
          </p>
          <button
            className="primary"
            disabled={!runContact}
            onClick={() => {
              try {
                const seq = s.sequences.find((x) => x.id === sequenceId)!;
                if (update((state) => startSequence(state, seq, runContact))) {
                  setSequenceId("");
                  notify("Local sequence run created");
                }
              } catch (err) {
                notify((err as Error).message);
              }
            }}
          >
            Start local run
          </button>
        </Modal>
      )}
    </>
  );
}
