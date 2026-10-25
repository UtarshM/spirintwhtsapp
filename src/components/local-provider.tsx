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
import {
  createEmptyWorkspace,
  type AccountIdentity,
} from "@/lib/workspace-document";
type Context = {
  state: LocalWorkspace;
  ready: boolean;
  error: string;
  update: (fn: (s: LocalWorkspace) => LocalWorkspace) => boolean;
  replace: (s: LocalWorkspace) => boolean;
  storage: "browser" | "account";
  saveStatus: string;
  canEdit: boolean;
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
    <WorkspaceContext.Provider
      value={{
        state,
        ready,
        error,
        update,
        replace,
        storage: "browser",
        saveStatus: "Saved in this browser",
        canEdit: true,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
export function AccountProvider({
  account,
  children,
}: {
  account: AccountIdentity;
  children: ReactNode;
}) {
  const [state, setState] = useState(() => createEmptyWorkspace(account.name));
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [saveStatus, setSaveStatus] = useState("Loading workspace…");
  const ref = useRef(state),
    revision = useRef(0),
    blocked = useRef(true),
    pending = useRef<LocalWorkspace | null>(null),
    saving = useRef(false),
    mounted = useRef(false);
  const request = (method: string, body?: unknown) =>
    fetch("/api/workspace-draft", {
      method,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-workspace-id": account.workspaceId,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void fetch("/api/workspace-draft", {
      cache: "no-store",
      headers: { "x-workspace-id": account.workspaceId },
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw Error(data.error?.message || "Workspace could not be loaded.");
        const valid = validateBackup(data.state);
        if (!Number.isSafeInteger(data.revision) || data.revision < 0)
          throw Error("Invalid workspace revision.");
        if (!mounted.current) return;
        ref.current = valid;
        revision.current = data.revision;
        blocked.current = false;
        setState(valid);
        setSaveStatus(
          data.revision === 0
            ? "Ready · First change saves your workspace draft"
            : "Saved to workspace",
        );
      })
      .catch((err) => {
        if (mounted.current && !controller.signal.aborted) {
          setError(err.message);
          setSaveStatus("Storage unavailable");
        }
      })
      .finally(() => {
        if (mounted.current && !controller.signal.aborted) setReady(true);
      });
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (saving.current || pending.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      mounted.current = false;
      controller.abort();
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [account.workspaceId]);
  async function persist() {
    if (saving.current || blocked.current) return;
    saving.current = true;
    try {
      while (pending.current) {
        const snapshot = pending.current;
        pending.current = null;
        const response = await request("PUT", {
          revision: revision.current,
          state: snapshot,
        });
        const result = await response.json();
        if (!response.ok)
          throw Error(result.error?.message || "Workspace save failed.");
        if (
          !Number.isSafeInteger(result.revision) ||
          result.revision !== revision.current + 1
        )
          throw Error("Workspace revision could not be confirmed.");
        revision.current = result.revision;
      }
      if (mounted.current) setSaveStatus("Saved to workspace");
    } catch (err) {
      blocked.current = true;
      // Keep the complete optimistic document in memory for export. Never silently roll it back or retry a stale revision.
      pending.current = ref.current;
      if (mounted.current) {
        setError(
          (err as Error).message +
            " Export your current backup before reloading.",
        );
        setSaveStatus("Unsaved changes — export backup");
      }
    } finally {
      saving.current = false;
    }
  }
  function replace(next: LocalWorkspace) {
    if (!account.canEdit) {
      setError(
        "This workspace is read-only. Owners and administrators must verify their authenticator in Account & security before editing.",
      );
      return false;
    }
    if (!ready || blocked.current) return false;
    try {
      const valid = validateBackup(next);
      ref.current = valid;
      pending.current = valid;
      setState(valid);
      setSaveStatus("Saving changes…");
      void persist();
      return true;
    } catch {
      setError(
        "Invalid draft changes. The last saved workspace was preserved.",
      );
      return false;
    }
  }
  function update(fn: (s: LocalWorkspace) => LocalWorkspace) {
    return replace(fn(ref.current));
  }
  return (
    <WorkspaceContext.Provider
      value={{
        state,
        ready,
        error,
        update,
        replace,
        storage: "account",
        saveStatus,
        canEdit: account.canEdit,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("Workspace provider missing");
  return context;
}
