"use client";
import { useEffect, useState } from "react";
import type { AccountIdentity } from "@/lib/workspace-document";
import type { IntegrationConfig } from "@/lib/integration-config";
export default function ConnectionControls({
  account,
  config,
}: {
  account: AccountIdentity;
  config: IntegrationConfig;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function connect() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/integrations/${config.provider}/connect`,
        { method: "POST", headers: { "x-workspace-id": account.workspaceId } },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.error?.message || "Authorization could not start.",
        );
      const url = new URL(payload.url);
      const allowed =
        config.provider === "gmail"
          ? ["https://accounts.google.com"]
          : [
              "https://accounts.zoho.com",
              "https://accounts.zoho.in",
              "https://accounts.zoho.eu",
              "https://accounts.zoho.com.au",
            ];
      if (!allowed.includes(url.origin))
        throw new Error(
          "Authorization returned an unexpected provider address.",
        );
      window.location.assign(url.toString());
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Authorization could not start.",
      );
      setBusy(false);
    }
  }
  return (
    <div>
      {config.missing.length > 0 && (
        <p className="integration-config-note">
          Administrator setup required: {config.missing.join(", ")}.
        </p>
      )}
      {config.action === "oauth" && (
        <>
          <button
            className="secondary"
            disabled={busy || !config.configured || !account.canEdit}
            onClick={connect}
          >
            {busy
              ? "Opening authorization…"
              : `Authorize ${config.provider === "gmail" ? "Gmail" : "Zoho Mail"}`}
          </button>
          <p className="integration-config-note">
            {account.canEdit
              ? "You will review permissions on the provider’s sign-in page."
              : "An owner or administrator must authorize this account."}{" "}
            Sending remains separate from authorization.
          </p>
        </>
      )}
      {config.callbackPath && (
        <details className="integration-config-note">
          <summary>OAuth callback path</summary>
          <code>{config.callbackPath}</code>
          <p>
            Register this path under your deployed app’s origin in the provider
            console.
          </p>
        </details>
      )}
      {error && (
        <p role="alert" className="console-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function EmailConnection({
  account,
  provider,
}: {
  account?: AccountIdentity;
  provider: "gmail" | "zoho";
}) {
  const [config, setConfig] = useState<IntegrationConfig | null>(null),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  useEffect(() => {
    setConfig(null);
    setError("");
    setStatus("");
    if (!account) return;
    const abort = new AbortController();
    fetch("/api/integrations/status", {
      cache: "no-store",
      headers: { "x-workspace-id": account.workspaceId },
      signal: abort.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.error?.message || "Account configuration unavailable.",
          );
        setConfig(
          result.configuration?.find(
            (c: IntegrationConfig) => c.provider === provider,
          ) || null,
        );
        setStatus(
          result.integrations?.find(
            (r: { provider: string; status: string }) =>
              r.provider === provider,
          )?.status || "not_connected",
        );
      })
      .catch((error) => {
        if (!abort.signal.aborted) setError(error.message);
      });
    return () => abort.abort();
  }, [account?.workspaceId, provider]);
  if (!account)
    return (
      <a className="secondary" href="/account#email-setup">
        Sign in to authorize
      </a>
    );
  return (
    <div>
      {status && <p>Authorization: {status.replaceAll("_", " ")}</p>}
      {error && (
        <p role="alert" className="console-error">
          {error}
        </p>
      )}
      {config ? (
        <ConnectionControls account={account} config={config} />
      ) : (
        !error && <p>Loading connection settings…</p>
      )}
    </div>
  );
}
