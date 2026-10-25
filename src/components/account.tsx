"use client";
import SalesMark from "@/components/sales-mark";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { ShieldCheck, ArrowRight } from "lucide-react";
export default function Account({
  email,
  workspaceId,
  role,
}: {
  email: string;
  workspaceId?: string;
  role?: string;
}) {
  const [status, setStatus] = useState(""),
    [data, setData] = useState<Record<string, unknown>[]>([]),
    [view, setView] = useState("contacts"),
    [qr, setQr] = useState(""),
    [factor, setFactor] = useState(""),
    [mfaCode, setMfaCode] = useState("");
  const db = () =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  async function api(path: string, method = "GET", body?: unknown) {
    const response = await fetch("/api/" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-workspace-id": workspaceId || "",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error?.message || "Request failed");
    return result;
  }
  async function load() {
    try {
      if (view === "contacts" || view === "campaigns") {
        const result = await api(view);
        setData(result.data || []);
      }
    } catch (e) {
      setStatus((e as Error).message);
    }
  }
  useEffect(() => {
    if (workspaceId) void load();
  }, [view, workspaceId]);
  return (
    <div className="marketing">
      <header>
        <a className="brand" href="/">
          <span className="brand-icon">
            <SalesMark size={25} />
          </span>
          sprint.
        </a>
        <div>
          {workspaceId && (
            <a
              className="secondary"
              href="/account"
              style={{ marginRight: 15 }}
            >
              Open full workspace
            </a>
          )}
          <span>
            {email} · {role || "New account"}
          </span>
          <button
            className="secondary"
            style={{ marginLeft: 15 }}
            onClick={async () => {
              await db().auth.signOut();
              location.href = "/login";
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <section style={{ marginTop: 40 }}>
        <div className="page-heading">
          <div>
            <h1>Your secure workspace.</h1>
            <p>
              Connected account · Live sending and payments remain disabled.
            </p>
          </div>
        </div>
        {workspaceId && (
          <a
            className="secondary"
            style={{ marginBottom: 24 }}
            href="/account/whatsapp-verification"
          >
            WhatsApp verification setup
          </a>
        )}
        {status && (
          <div className="notice" role="status">
            <ShieldCheck size={18} />
            {status}
          </div>
        )}
        {!workspaceId ? (
          <form
            className="panel settings-body"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const f = new FormData(e.currentTarget);
                await api("workspaces", "POST", { name: f.get("name") });
                location.reload();
              } catch (e) {
                setStatus((e as Error).message);
              }
            }}
          >
            <h3>Create your business workspace</h3>
            <label>
              Workspace name
              <input name="name" required maxLength={120} />
            </label>
            <button className="primary">Create workspace</button>
          </form>
        ) : (
          <>
            <div className="tabs">
              {["contacts", "campaigns", "integrations", "security"].map(
                (v) => (
                  <button
                    className={view === v ? "selected" : ""}
                    key={v}
                    onClick={() => {
                      setView(v);
                      setStatus("");
                    }}
                  >
                    {v[0].toUpperCase() + v.slice(1)}
                  </button>
                ),
              )}
            </div>
            {view === "security" ? (
              <div className="panel settings-body">
                <h3>Administrator verification</h3>
                <p>
                  Enroll an authenticator and verify MFA before sensitive
                  administrator actions.
                </p>
                <button
                  className="secondary"
                  onClick={async () => {
                    try {
                      const client = db();
                      const { data: listed, error: listError } =
                        await client.auth.mfa.listFactors();
                      if (listError) throw listError;
                      const existing = listed.totp.find(
                        (f) => f.status === "verified",
                      );
                      if (existing) {
                        setFactor(existing.id);
                        setQr("");
                        setStatus(
                          "Enter the code from your existing authenticator.",
                        );
                        return;
                      }
                      const { data, error } = await client.auth.mfa.enroll({
                        factorType: "totp",
                        friendlyName: "Sprint administrator",
                      });
                      if (error) throw error;
                      setFactor(data.id);
                      setQr(data.totp.qr_code);
                    } catch (e) {
                      setStatus((e as Error).message);
                    }
                  }}
                >
                  Set up or verify authenticator
                </button>
                {qr && (
                  <img
                    src={qr}
                    alt="Scan this authenticator enrollment QR code"
                    width={200}
                    height={200}
                  />
                )}
                {factor && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const { error } = await db().auth.mfa.challengeAndVerify({
                        factorId: factor,
                        code: mfaCode,
                      });
                      setStatus(
                        error
                          ? "Verification failed"
                          : "Administrator MFA verified",
                      );
                      if (!error) {
                        setQr("");
                        setFactor("");
                      }
                    }}
                  >
                    <label>
                      Authenticator code
                      <input
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value)}
                        pattern="[0-9]{6}"
                        required
                        autoComplete="one-time-code"
                      />
                    </label>
                    <button className="primary">Verify</button>
                  </form>
                )}
                <h3 style={{ marginTop: 30 }}>Update password</h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const password = String(
                      new FormData(e.currentTarget).get("password"),
                    );
                    const { error } = await db().auth.updateUser({ password });
                    setStatus(
                      error ? "Could not update password" : "Password updated",
                    );
                  }}
                >
                  <label>
                    New password
                    <input
                      name="password"
                      type="password"
                      minLength={12}
                      required
                      autoComplete="new-password"
                    />
                  </label>
                  <button className="secondary">Update password</button>
                </form>
              </div>
            ) : view === "integrations" ? (
              <div className="integration-grid" style={{ marginTop: 25 }}>
                {["gmail", "zoho"].map((p) => (
                  <section className="panel integration-card" key={p}>
                    <h2>{p === "gmail" ? "Gmail" : "Zoho Mail"}</h2>
                    <p>OAuth connection · Administrator MFA required.</p>
                    <button
                      className="primary"
                      onClick={async () => {
                        try {
                          const result = await api(
                            "integrations/" + p + "/connect",
                            "POST",
                            {},
                          );
                          location.href = result.url;
                        } catch (e) {
                          setStatus((e as Error).message);
                        }
                      }}
                    >
                      Connect <ArrowRight size={15} />
                    </button>
                  </section>
                ))}
              </div>
            ) : (
              <div className="panel" style={{ marginTop: 25 }}>
                <form
                  className="settings-body"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    try {
                      await api(
                        view,
                        "POST",
                        view === "contacts"
                          ? {
                              name: f.get("name"),
                              email: f.get("email"),
                              consent: f.get("consent") === "on",
                            }
                          : { name: f.get("name"), channel: f.get("channel") },
                      );
                      e.currentTarget?.reset();
                      await load();
                      setStatus("Saved to your workspace");
                    } catch (e) {
                      setStatus((e as Error).message);
                    }
                  }}
                >
                  <h3>
                    {view === "contacts"
                      ? "Add a contact"
                      : "Create a campaign draft"}
                  </h3>
                  <label>
                    Name
                    <input name="name" required maxLength={120} />
                  </label>
                  {view === "contacts" ? (
                    <>
                      <label>
                        Email
                        <input name="email" type="email" required />
                      </label>
                      <label className="checkbox-label">
                        <input name="consent" type="checkbox" />
                        Outreach consent recorded
                      </label>
                    </>
                  ) : (
                    <label>
                      Channel
                      <select name="channel">
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">Email</option>
                        <option value="voice">AI calling</option>
                      </select>
                    </label>
                  )}
                  <button className="primary">Save</button>
                </form>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>{view === "contacts" ? "Email" : "Channel"}</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((r) => (
                        <tr key={String(r.id)}>
                          <td>{String(r.name)}</td>
                          <td>{String(r.email || r.channel || "")}</td>
                          <td>
                            {new Date(
                              String(r.created_at),
                            ).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!data.length && (
                    <div className="empty">
                      No records yet in this workspace.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
