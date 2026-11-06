"use client";
import { useState } from "react";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Phone,
  MessageSquare,
  Target,
} from "lucide-react";
import RapidSalesLogo from "./console/rapid-logo";

export default function AuthForm({
  mode,
}: {
  mode: "login" | "signup" | "recover";
}) {
  const [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="login-layout">
      {/* Leadpilot Left Story Hero */}
      <aside className="login-story">
        <div>
          <a href="/" className="login-symbol" aria-label="Leadpilot Home">
            <RapidSalesLogo size={32} />
          </a>

          <div className="login-story-copy">
            <h2>Sales outreach that runs itself.</h2>
            <p>AI agents that call, message and qualify your leads around the clock.</p>
          </div>

          <div className="rapid-login-cards-list">
            <div className="rapid-login-card">
              <div className="rapid-login-card-icon">
                <Phone size={18} />
              </div>
              <div>
                <strong>1,000+ AI calls a day</strong>
                <p>Natural-sounding agents in English and Indian languages.</p>
              </div>
            </div>

            <div className="rapid-login-card">
              <div className="rapid-login-card-icon">
                <MessageSquare size={18} />
              </div>
              <div>
                <strong>Email, WhatsApp and calling together</strong>
                <p>One sequence across every channel your leads use.</p>
              </div>
            </div>

            <div className="rapid-login-card">
              <div className="rapid-login-card-icon">
                <Target size={18} />
              </div>
              <div>
                <strong>Qualified leads, automatically</strong>
                <p>Every reply is classified and routed to the right next step.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="login-story-footer-bar">
          <span>Trusted by 500+ businesses</span>
          <span>© {new Date().getFullYear()} Leadpilot</span>
        </div>
      </aside>

      {/* Right Form Side */}
      <section className="login-form-side">
        <div className="login-signup-prompt">
          {mode === "signup" ? (
            <>
              Already have an account? <a href="/login">Sign in</a>
            </>
          ) : mode === "recover" ? (
            <>
              Remembered your password? <a href="/login">Sign in</a>
            </>
          ) : (
            <>
              No account? <a href="/signup">Sign up</a>
            </>
          )}
        </div>

        <div className="login-form-inner">
          <h1>
            {mode === "login"
              ? "Welcome back"
              : mode === "signup"
                ? "Create your workspace"
                : "Reset your password"}
          </h1>

          <p>
            {mode === "login"
              ? "Sign in to your Leadpilot workspace."
              : mode === "signup"
                ? "Start automating your outreach across WhatsApp, Email & AI Calls."
                : "We'll email you a secure link to reset your password."}
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setStatus("");
              try {
                const d = new FormData(e.currentTarget);
                const fullName = (d.get("fullName") as string) || "";
                const companyName = (d.get("companyName") as string) || "";

                if (companyName && typeof window !== "undefined") {
                  try {
                    const raw = localStorage.getItem("relay-scalezix-workspace");
                    if (raw) {
                      const ws = JSON.parse(raw);
                      ws.settings = { ...ws.settings, name: companyName };
                      localStorage.setItem("relay-scalezix-workspace", JSON.stringify(ws));
                    }
                  } catch {}
                }

                const res = await fetch("/api/auth", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    mode,
                    email: d.get("email"),
                    password: d.get("password"),
                    fullName,
                    companyName,
                  }),
                });
                const data = await res.json();
                if (!res.ok) {
                  setStatus(data.error?.message || "Could not complete request");
                  return;
                }
                if (mode === "login" || mode === "signup") {
                  location.href = "/dashboard#overview";
                } else {
                  setStatus("Check your email for the confirmation link.");
                }
              } catch {
                setStatus("Connection failed. Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {mode === "signup" && (
              <>
                <label>
                  Full name
                  <input
                    name="fullName"
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. Rahul Verma"
                  />
                </label>
                <label>
                  Company / Startup name
                  <input
                    name="companyName"
                    type="text"
                    required
                    maxLength={120}
                    placeholder="e.g. Apex Logistics Pvt Ltd"
                  />
                </label>
              </>
            )}

            <label>
              Work email
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
              />
            </label>

            {mode !== "recover" && (
              <label>
                <div className="login-password-header">
                  <span>Password</span>
                  {mode === "login" && (
                    <a href="/recover" className="login-forgot-link">
                      Forgot password?
                    </a>
                  )}
                </div>
                <span className="login-password">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    minLength={mode === "signup" ? 8 : undefined}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
                {mode === "signup" && (
                  <small style={{ color: "#64748b", marginTop: "4px" }}>
                    Use at least 8 characters with numbers & symbols.
                  </small>
                )}
              </label>
            )}

            {mode === "login" && (
              <label className="login-checkbox-row">
                <input type="checkbox" defaultChecked name="remember" />
                <span>Keep me signed in</span>
              </label>
            )}

            <button type="submit" className="login-submit-btn" disabled={busy}>
              {busy
                ? "Connecting…"
                : mode === "login"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create Workspace"
                    : "Send Recovery Link"}
            </button>
          </form>

          {status && (
            <div className="notice" role="status" style={{ marginTop: 16 }}>
              <ShieldCheck size={17} />
              {status}
            </div>
          )}

          <div className="login-terms-notice">
            By signing in you agree to our{" "}
            <a href="/terms-and-conditions">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy-policy">
              Privacy Policy
            </a>
            .
          </div>
        </div>
      </section>
    </div>
  );
}
