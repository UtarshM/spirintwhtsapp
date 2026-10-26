"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AccountIdentity } from "@/lib/workspace-document";
import { Badge, Empty, Panel, date } from "./ui";

type Connection = {
  id: string;
  authIdMasked: string;
  status: "connected";
  verifiedAt: string;
  numbers: { number: string; label: string }[];
  callerId: string;
  transferNumber: string | null;
};
type ConnectionData = {
  connection: Connection | null;
  canManage: boolean;
  encryptionConfigured: boolean;
};
type Change =
  | { action: "connect"; authId: string; authToken: string }
  | { action: "settings"; callerId: string; transferNumber: string | null }
  | { action: "disconnect" };

export default function PlivoConnection({
  account,
  onChanged,
}: {
  account?: AccountIdentity;
  onChanged?: () => void;
}) {
  if (!account)
    return (
      <Panel title="Your Plivo account">
        <Empty>Sign in to connect your own Plivo account.</Empty>
        <a className="primary" href="/login">
          Sign in
        </a>
      </Panel>
    );
  return (
    <AccountPlivoConnection
      key={`${account.workspaceId}:${account.userId}`}
      account={account}
      onChanged={onChanged}
    />
  );
}

function AccountPlivoConnection({
  account,
  onChanged,
}: {
  account: AccountIdentity;
  onChanged?: () => void;
}) {
  const [data, setData] = useState<ConnectionData>(),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [authId, setAuthId] = useState(""),
    [callerId, setCallerId] = useState(""),
    [transferNumber, setTransferNumber] = useState(""),
    [replace, setReplace] = useState(false);
  const tokenInput = useRef<HTMLInputElement>(null),
    mutation = useRef<AbortController | null>(null),
    mounted = useRef(true),
    changed = useRef(onChanged);
  changed.current = onChanged;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      mutation.current?.abort();
      if (tokenInput.current) tokenInput.current.value = "";
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void fetch("/api/integrations/plivo", {
      cache: "no-store",
      headers: { "x-workspace-id": account.workspaceId },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw Error(
            response.status === 401
              ? "Sign in again to review your Plivo connection."
              : "Your Plivo connection could not be loaded. Try refreshing.",
          );
        const body = (await response.json()) as ConnectionData;
        if (controller.signal.aborted) return;
        setData(body);
        setCallerId(body.connection?.callerId || "");
        setTransferNumber(body.connection?.transferNumber || "");
        setError("");
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "Your Plivo connection could not be loaded. Try refreshing.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [account.workspaceId, revision]);

  async function save(change: Change) {
    if (mutation.current || !data?.canManage) return;
    const controller = new AbortController();
    mutation.current = controller;
    setBusy(true);
    setError("");
    setMessage("");
    let failure =
      "The request could not be confirmed. Refresh your connection before trying again.";
    try {
      const response = await fetch("/api/integrations/plivo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-id": account.workspaceId,
        },
        body: JSON.stringify(change),
        signal: controller.signal,
      });
      // Never reflect provider errors or credential-bearing response bodies.
      if (!response.ok) {
        failure =
          response.status === 403
            ? "An owner or administrator must verify MFA in Account controls before changing this connection."
            : response.status === 409 && change.action === "disconnect"
              ? "Resolve active or unconfirmed calls before disconnecting your Plivo account."
              : response.status === 503
                ? "Secure connection setup is not ready. Try again after server configuration is complete."
                : change.action === "connect"
                  ? "Your Plivo account could not be connected. Check your Auth ID, Auth Token and voice-enabled numbers."
                  : "This change could not be saved. Refresh the connection and try again.";
        throw Error("connection_change_rejected");
      }
      if (!mounted.current) return;
      setAuthId("");
      setReplace(false);
      setMessage(
        change.action === "connect"
          ? "Plivo account verified and connected. Calling remains subject to the launch checks."
          : change.action === "disconnect"
            ? "Plivo account disconnected. Its stored token was removed and calling was disabled."
            : "Calling number settings saved. This does not enable calling.",
      );
      setRevision((v) => v + 1);
      changed.current?.();
    } catch {
      if (mounted.current && !controller.signal.aborted) setError(failure);
    } finally {
      if (change.action === "connect") change.authToken = "";
      if (tokenInput.current) tokenInput.current.value = "";
      mutation.current = null;
      if (mounted.current) setBusy(false);
    }
  }

  function connect(event: FormEvent) {
    event.preventDefault();
    const authToken = tokenInput.current?.value || "";
    if (tokenInput.current) tokenInput.current.value = "";
    if (!authId.trim() || !authToken || !data?.encryptionConfigured) return;
    void save({ action: "connect", authId: authId.trim(), authToken });
  }

  const connection = data?.connection,
    editable = Boolean(data?.canManage && data.encryptionConfigured && !busy),
    showConnect = Boolean(data?.canManage && (!connection || replace));

  return (
    <Panel
      title="Your Plivo account"
      description="Connect your own account and choose a voice-enabled number for AI calls."
      action={
        <button
          className="secondary"
          type="button"
          disabled={busy || loading}
          onClick={() => setRevision((v) => v + 1)}
        >
          Refresh connection
        </button>
      }
    >
      <p>
        Plivo bills phone usage to your Plivo account. Platform AI usage is
        charged separately. Connecting an account does not enable calling.
      </p>
      {loading && <p role="status">Checking your connection…</p>}
      {error && (
        <div className="console-error" role="alert">
          {error}
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {data && !loading && (
        <>
          <Badge>{connection ? "Account verified" : "Not connected"}</Badge>
          {!data.encryptionConfigured && (
            <p>
              Secure credential storage is not configured yet. Connection
              changes are unavailable until setup is complete.
            </p>
          )}
          {!data.canManage && (
            <p>
              An owner or administrator with MFA must manage this connection.
            </p>
          )}
          {connection && (
            <>
              <p>
                Auth ID: <strong>{connection.authIdMasked}</strong>
                <br />
                Last verified: {date(connection.verifiedAt)}
              </p>
              <form
                className="console-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void save({
                    action: "settings",
                    callerId,
                    transferNumber: transferNumber.trim() || null,
                  });
                }}
              >
                <label>
                  Calling number
                  <select
                    required
                    value={callerId}
                    disabled={!editable}
                    onChange={(event) => setCallerId(event.target.value)}
                  >
                    <option value="">Choose your number</option>
                    {connection.numbers.map(({ number, label }) => (
                      <option key={number} value={number}>
                        {number}
                        {label ? ` · ${label}` : ""}
                      </option>
                    ))}
                  </select>
                  <small>
                    Only verified voice-enabled numbers from your account.
                  </small>
                </label>
                <label>
                  Human transfer number (optional)
                  <input
                    type="tel"
                    autoComplete="off"
                    placeholder="+919876543210"
                    pattern="\+[1-9][0-9]{7,14}"
                    maxLength={16}
                    value={transferNumber}
                    disabled={!editable}
                    onChange={(event) => setTransferNumber(event.target.value)}
                  />
                  <small>
                    Include the country code. Leave empty to remove it.
                  </small>
                </label>
                {data.canManage && (
                  <div className="console-actions">
                    <button
                      className="primary"
                      disabled={!editable || !callerId}
                    >
                      Save number settings
                    </button>
                    <button
                      className="secondary"
                      type="button"
                      disabled={!editable}
                      onClick={() => {
                        setReplace((v) => !v);
                        if (tokenInput.current) tokenInput.current.value = "";
                      }}
                    >
                      {replace ? "Cancel reconnection" : "Reconnect account"}
                    </button>
                    <button
                      className="secondary"
                      type="button"
                      disabled={busy || !data.canManage}
                      onClick={() => void save({ action: "disconnect" })}
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </form>
              {data.canManage && (
                <p>
                  Disconnect removes the stored token and disables calling.
                  Active or unresolved calls must be resolved first.
                </p>
              )}
            </>
          )}
          {showConnect && data.encryptionConfigured && (
            <form
              className="console-form"
              onSubmit={connect}
              autoComplete="off"
            >
              <label>
                Plivo Auth ID
                <input
                  name="plivo-auth-id"
                  required
                  maxLength={100}
                  autoComplete="off"
                  spellCheck={false}
                  autoCapitalize="none"
                  value={authId}
                  disabled={!editable}
                  onChange={(event) => setAuthId(event.target.value)}
                />
              </label>
              <label>
                Plivo Auth Token
                <input
                  ref={tokenInput}
                  name="plivo-auth-token"
                  type="password"
                  required
                  maxLength={256}
                  autoComplete="off"
                  spellCheck={false}
                  autoCapitalize="none"
                  data-1p-ignore
                  data-lpignore="true"
                  disabled={!editable}
                />
                <small>
                  Find these in your Plivo console. The token is encrypted on
                  the server and cleared from this form after each attempt.
                </small>
              </label>
              <button
                className="primary"
                disabled={!editable || !authId.trim()}
              >
                {busy ? "Verifying account…" : "Verify & connect Plivo"}
              </button>
            </form>
          )}
        </>
      )}
    </Panel>
  );
}
