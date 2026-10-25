"use client";
import { useState } from "react";
import { useWorkspace } from "../local-provider";
import { uid, now, type LocalWorkspace } from "@/lib/local-workspace";
import { Panel, Modal, Empty, Badge, formValue, date } from "./ui";
type Task = LocalWorkspace["tasks"][number];
export default function Tasks({ notify }: { notify: (s: string) => void }) {
  const { state: s, update } = useWorkspace();
  const [edit, setEdit] = useState<Task | null | undefined>();
  return (
    <Panel
      title="Follow-up tasks"
      description="Local follow-ups from contact details, sequences and chatbot handoffs."
      action={
        <button className="primary" onClick={() => setEdit(null)}>
          Add follow-up
        </button>
      }
    >
      {s.tasks.map((task) => (
        <div className="console-task" key={task.id}>
          <label className="console-check">
            <input
              type="checkbox"
              checked={task.done}
              onChange={(e) =>
                update((state) => ({
                  ...state,
                  tasks: state.tasks.map((t) =>
                    t.id === task.id ? { ...t, done: e.target.checked } : t,
                  ),
                }))
              }
            />
            <span>
              <strong>{task.title}</strong>
              <small>
                {s.contacts.find((c) => c.id === task.contactId)?.name} ·{" "}
                {date(task.dueAt)}
              </small>
            </span>
          </label>
          <Badge>{task.done ? "Completed" : "Pending"}</Badge>
          <button className="secondary" onClick={() => setEdit(task)}>
            Edit
          </button>
        </div>
      ))}
      {!s.tasks.length && (
        <Empty>
          No follow-ups yet. Add a sample follow-up or create a handoff.
        </Empty>
      )}
      {edit !== undefined && (
        <Modal title="Follow-up task" close={() => setEdit(undefined)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const due = formValue(f, "dueAt");
              const task: Task = {
                id: edit?.id || uid(),
                contactId: formValue(f, "contactId"),
                title: formValue(f, "title"),
                dueAt: due ? new Date(due).toISOString() : now(),
                done: edit?.done || false,
              };
              if (
                update((state) => ({
                  ...state,
                  tasks: edit
                    ? state.tasks.map((t) => (t.id === task.id ? task : t))
                    : [...state.tasks, task],
                }))
              ) {
                setEdit(undefined);
                notify("Follow-up saved locally");
              }
            }}
          >
            <label>
              Title
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={edit?.title}
              />
            </label>
            <label>
              Contact
              <select name="contactId" required defaultValue={edit?.contactId}>
                <option value="">Choose contact</option>
                {s.contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due (browser timezone)
              <input
                type="datetime-local"
                name="dueAt"
                defaultValue={
                  edit?.dueAt
                    ? new Date(
                        Date.parse(edit.dueAt) -
                          new Date(edit.dueAt).getTimezoneOffset() * 60000,
                      )
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
              />
            </label>
            <button className="primary">Save follow-up</button>
          </form>
        </Modal>
      )}
    </Panel>
  );
}
