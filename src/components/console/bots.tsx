"use client";
import { useState } from "react";
import { useWorkspace } from "../local-provider";
import { uid, now } from "@/lib/local-workspace";
import { Panel, Empty, Modal, formValue, Badge } from "./ui";
import { addActivity, type Resource } from "@/lib/outreach";
type Node = {
  id: string;
  type: "Reply" | "Contains" | "Handoff";
  text: string;
};
function readNodes(r: Resource): Node[] {
  try {
    const nodes = JSON.parse(r.data.nodes || "[]");
    return Array.isArray(nodes)
      ? nodes.filter(
          (n) =>
            n &&
            typeof n.id === "string" &&
            ["Reply", "Contains", "Handoff"].includes(n.type) &&
            typeof n.text === "string",
        )
      : [];
  } catch {
    return [];
  }
}
export default function Bots({ notify }: { notify: (s: string) => void }) {
  const { state: s, update } = useWorkspace();
  const [edit, setEdit] = useState<Resource | null | undefined>(),
    [nodes, setNodes] = useState<Node[]>([]),
    [test, setTest] = useState(""),
    [result, setResult] = useState<string[]>([]),
    [handoff, setHandoff] = useState(false),
    [person, setPerson] = useState("");
  const item = s.resources.find((r) => r.id === test);
  return (
    <Panel
      title="WhatsApp chatbot flows"
      description="Design keyword-triggered replies, conditions and human handoffs. Tests are deterministic and never send messages."
      action={
        <button
          className="primary"
          onClick={() => {
            setNodes([]);
            setEdit(null);
          }}
        >
          Create flow
        </button>
      }
    >
      <div className="console-card-grid">
        {s.resources
          .filter((r) => r.kind === "bot")
          .map((r) => (
            <article className="console-mini-card" key={r.id}>
              <Badge>Local flow draft</Badge>
              <h3>{r.name}</h3>
              <p>
                Trigger: {r.data.keyword || "Any message"} ·{" "}
                {readNodes(r).length} nodes
              </p>
              <div className="console-actions">
                <button
                  className="secondary"
                  onClick={() => {
                    setNodes(readNodes(r));
                    setEdit(r);
                  }}
                >
                  Edit flow
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setTest(r.id);
                    setResult([]);
                    setHandoff(false);
                  }}
                >
                  Test flow
                </button>
              </div>
            </article>
          ))}
      </div>
      {!s.resources.some((r) => r.kind === "bot") && (
        <Empty>
          Create a flow to preview how a customer conversation branches and
          reaches your team.
        </Empty>
      )}
      {edit !== undefined && (
        <Modal title="Chatbot flow builder" close={() => setEdit(undefined)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!nodes.length || nodes.some((n) => !n.text.trim())) {
                notify("Add nodes and complete every node");
                return;
              }
              const f = new FormData(e.currentTarget);
              const resource: Resource = {
                id: edit?.id || uid(),
                kind: "bot",
                name: formValue(f, "name"),
                data: {
                  keyword: formValue(f, "keyword"),
                  nodes: JSON.stringify(nodes),
                },
                updatedAt: now(),
              };
              if (
                update((state) => ({
                  ...state,
                  resources: edit
                    ? state.resources.map((r) =>
                        r.id === resource.id ? resource : r,
                      )
                    : [...state.resources, resource],
                }))
              ) {
                setEdit(undefined);
                notify("Flow saved locally");
              }
            }}
          >
            <label>
              Flow name
              <input
                name="name"
                required
                maxLength={120}
                defaultValue={edit?.name}
              />
            </label>
            <label>
              Trigger keyword (empty means any message)
              <input
                name="keyword"
                maxLength={100}
                defaultValue={edit?.data.keyword}
              />
            </label>
            <p>
              A Contains condition stops the flow when the incoming message does
              not contain its text. A Handoff stops all further bot replies.
            </p>
            <div className="console-node-list">
              {nodes.map((n, i) => (
                <article key={n.id}>
                  <header>
                    <strong>
                      {i + 1} · {n.type}
                    </strong>
                    <div className="console-actions">
                      <button
                        type="button"
                        className="text-button"
                        disabled={!i}
                        onClick={() =>
                          setNodes((current) => {
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
                          setNodes((current) =>
                            current.filter((x) => x.id !== n.id),
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </header>
                  <label>
                    {n.type === "Reply"
                      ? "Response"
                      : n.type === "Contains"
                        ? "Incoming message contains"
                        : "Handoff instructions"}
                    <textarea
                      required
                      rows={2}
                      maxLength={1000}
                      value={n.text}
                      onChange={(e) =>
                        setNodes((current) =>
                          current.map((x) =>
                            x.id === n.id ? { ...x, text: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                </article>
              ))}
            </div>
            <div className="console-actions">
              {(["Reply", "Contains", "Handoff"] as const).map((type) => (
                <button
                  type="button"
                  key={type}
                  className="secondary"
                  disabled={nodes.length >= 30}
                  onClick={() =>
                    setNodes((current) => [
                      ...current,
                      { id: uid(), type, text: "" },
                    ])
                  }
                >
                  + {type}
                </button>
              ))}
            </div>
            <button className="primary">Save flow</button>
          </form>
        </Modal>
      )}
      {item && (
        <Modal title={`Test flow · ${item.name}`} close={() => setTest("")}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                input = formValue(f, "input").toLowerCase();
              setHandoff(false);
              if (
                item.data.keyword &&
                !input.includes(item.data.keyword.toLowerCase())
              ) {
                setResult(["Trigger did not match. No response."]);
                return;
              }
              const output: string[] = [];
              for (const n of readNodes(item)) {
                if (
                  n.type === "Contains" &&
                  !input.includes(n.text.toLowerCase())
                ) {
                  output.push(`Condition not met: ${n.text}. Flow stopped.`);
                  break;
                }
                if (n.type === "Reply") output.push(`Bot preview: ${n.text}`);
                if (n.type === "Handoff") {
                  output.push(`Human handoff: ${n.text}`);
                  setHandoff(true);
                  break;
                }
              }
              setResult(output);
            }}
          >
            <label>
              Incoming sample message
              <input name="input" required maxLength={1000} />
            </label>
            <button className="primary">Run local flow test</button>
          </form>
          <div role="status">
            {result.map((line, i) => (
              <p className="console-transcript" key={i}>
                {line}
              </p>
            ))}
          </div>
          {handoff && (
            <>
              <label>
                Contact for a local handoff task
                <select
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                >
                  <option value="">Choose sample contact</option>
                  {s.contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="secondary"
                disabled={!person}
                onClick={() => {
                  if (
                    update((state) =>
                      addActivity(
                        {
                          ...state,
                          tasks: [
                            ...state.tasks,
                            {
                              id: uid(),
                              contactId: person,
                              title: `Chatbot handoff · ${item.name}`,
                              dueAt: now(),
                              done: false,
                            },
                          ],
                        },
                        person,
                        "Chatbot human handoff: pending outreach suppressed",
                        "handoff",
                      ),
                    )
                  ) {
                    notify("Handoff task created locally");
                    setHandoff(false);
                  }
                }}
              >
                Create sample handoff task
              </button>
            </>
          )}
        </Modal>
      )}
    </Panel>
  );
}
