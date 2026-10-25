"use client";
import { useState } from "react";
export default function Invite() {
  const [message, setMessage] = useState(
    "Sign in with the invited email, then accept your workspace invitation.",
  );
  return (
    <div className="auth-shell">
      <section className="auth-card">
        <h1>You’re invited.</h1>
        <p role="status">{message}</p>
        <div className="button-group">
          <a className="secondary" href="/login">
            Sign in
          </a>
          <button
            className="primary"
            onClick={async () => {
              try {
                const token = new URL(location.href).searchParams.get("token");
                const r = await fetch("/api/invitations/accept", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ token }),
                });
                const data = await r.json();
                if (!r.ok) throw new Error(data.error?.message);
                history.replaceState(null, "", "/invite");
                location.href = "/account";
              } catch (e) {
                setMessage(
                  (e as Error).message || "Could not accept invitation",
                );
              }
            }}
          >
            Accept invitation
          </button>
        </div>
      </section>
    </div>
  );
}
