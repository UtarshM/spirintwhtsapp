"use client";
import {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  createLocalWorkspace,
  validateBackup,
  storageKey,
  type LocalWorkspace,
  localContactSchema,
  now,
} from "@/lib/local-workspace";
type Context = {
  state: LocalWorkspace;
  ready: boolean;
  error: string;
  update: (fn: (s: LocalWorkspace) => LocalWorkspace) => boolean;
  replace: (s: LocalWorkspace) => boolean;
};
const WorkspaceContext = createContext<Context | null>(null);
export function LocalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(createLocalWorkspace),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const ref = useRef(state);
  const blocked = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = validateBackup(JSON.parse(raw));
        ref.current = parsed;
        setState(parsed);
      } else {
        const legacy = localStorage.getItem("relay-contacts");
        if (legacy) {
          const contacts = JSON.parse(legacy);
          if (!Array.isArray(contacts))
            throw new Error("Invalid legacy contacts");
          const migrated = validateBackup({
            ...ref.current,
            contacts: contacts.map((c) =>
              localContactSchema.parse({
                ...c,
                createdAt: c.createdAt || now(),
              }),
            ),
          });
          ref.current = migrated;
          setState(migrated);
        }
      }
    } catch {
      blocked.current = true;
      setError(
        "Saved workspace could not be loaded. Your existing data was preserved. Use Settings → Data to import a valid backup or reset sample data.",
      );
    }
    setReady(true);
  }, []);
  function replace(next: LocalWorkspace) {
    try {
      const valid = validateBackup(next);
      localStorage.setItem(storageKey, JSON.stringify(valid));
      ref.current = valid;
      setState(valid);
      setError("");
      blocked.current = false;
      return true;
    } catch {
      setError(
        "Changes could not be saved. Browser storage may be full or the workspace data is invalid. Export a backup before resetting.",
      );
      return false;
    }
  }
  function update(fn: (s: LocalWorkspace) => LocalWorkspace) {
    if (!ready || blocked.current) return false;
    return replace(fn(ref.current));
  }
  return (
    <WorkspaceContext.Provider value={{ state, ready, error, update, replace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("Workspace provider missing");
  return context;
}
