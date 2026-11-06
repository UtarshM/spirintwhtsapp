"use client";
import { useState } from "react";
import {
  Sparkles,
  Zap,
  Bot,
  ArrowRight,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Radio,
  CheckCircle2,
} from "lucide-react";
import LeadpilotLogo from "./console/rapid-logo";

export default function AuthForm({
  mode,
}: {
  mode: "login" | "signup" | "recover";
}) {
  const [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="leadpilot-auth-layout">
      {/* Left Pilot Mission Control Visual */}
      <aside className="leadpilot-hero-panel">
        <div className="leadpilot-hero-content">
          <div className="leadpilot-hero-top">
            <a href="/" className="leadpilot-hero-logo" aria-label="Leadpilot Home">
              <LeadpilotLogo size={34} />
            </a>
            <div className="leadpilot-status-badge">
              <span className="leadpilot-status-dot" />
              <span>PILOT ENGINE 2.4 LIVE</span>
            </div>
          </div>

          <div className="leadpilot-hero-headline">
            <span className="leadpilot-overline">
              <Sparkles size={13} className="inline mr-1" />
              AUTONOMOUS B2B REVENUE SYSTEM
            </span>
            <h2>Put your outreach on autopilot.</h2>
            <p>
              Multilingual AI voice callers, official WhatsApp Cloud API, and smart tri-channel sequences working around the clock to qualify your pipeline.
            </p>
          </div>

          {/* Live Mission Card (Unique to Leadpilot) */}
          <div className="leadpilot-mission-card">
            <div className="leadpilot-mission-header">
              <div className="leadpilot-mission-agent">
                <div className="leadpilot-agent-avatar">
                  <Bot size={18} />
                </div>
                <div>
                  <strong>Aarav · Senior AI Calling Specialist</strong>
                  <span>Auto-qualifying inbound & cold leads</span>
                </div>
              </div>
              <span className="leadpilot-live-tag">
                <Radio size={12} className="leadpilot-live-pulse" />
                Live Call
              </span>
            </div>

            <div className="leadpilot-metrics-strip">
              <div className="leadpilot-metric-col">
                <span className="leadpilot-metric-num">1,500+</span>
                <span className="leadpilot-metric-lbl">Daily AI Waves</span>
              </div>
              <div className="leadpilot-metric-col">
                <span className="leadpilot-metric-num">&lt; 1.2s</span>
                <span className="leadpilot-metric-lbl">Voice Latency</span>
              </div>
              <div className="leadpilot-metric-col">
                <span className="leadpilot-metric-num">82%</span>
                <span className="leadpilot-metric-lbl">Qualified Match</span>
              </div>
            </div>

            <div className="leadpilot-live-event">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <span>Real Estate Lead qualified in 42s · WhatsApp dossier dispatched instantly</span>
            </div>
          </div>
        </div>

        <div className="leadpilot-hero-footer">
          <div className="leadpilot-trust-points">
            <span>🛡️ Meta Cloud API Verified</span>
            <span>⚡ Multi-Tenant Quarantine</span>
            <span>🇮🇳 Built for Indian MSMEs & Global SaaS</span>
          </div>
          <span className="leadpilot-copy-notice">© {new Date().getFullYear()} Leadpilot</span>
        </div>
      </aside>

      {/* Right Modern Form Panel */}
      <section className="leadpilot-form-panel">
        <div className="leadpilot-form-topbar">
          <span className="leadpilot-form-switch-text">
            {mode === "signup" ? "Already have a Leadpilot workspace?" : mode === "recover" ? "Remember your credentials?" : "New to Leadpilot?"}
          </span>
          <a
            href={mode === "signup" || mode === "recover" ? "/login" : "/signup"}
            className="leadpilot-form-switch-btn"
          >
            {mode === "signup" || mode === "recover" ? "Sign in" : "Create Workspace"}
          </a>
        </div>

        <div className="leadpilot-form-container">
          <div className="leadpilot-form-header">
            <span className="leadpilot-form-badge">
              <Zap size={12} />
              WORKSPACE CONSOLE ACCESS
            </span>
            <h1>
              {mode === "login"
                ? "Welcome back"
                : mode === "signup"
                  ? "Launch your workspace"
                  : "Reset access"}
            </h1>
            <p>
              {mode === "login"
                ? "Enter your verified business credentials to access your sales console."
                : mode === "signup"
                  ? "Spin up your autonomous sales workspace in 60 seconds with 500 trial credits."
                  : "We'll send you an encrypted recovery link to restore workspace access."}
            </p>
          </div>

          <form
            className="leadpilot-auth-form"
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
                  setStatus(data.error?.message || "Authentication failed");
                  return;
                }
                if (mode === "login" || mode === "signup") {
                  location.href = "/dashboard#overview";
                } else {
                  setStatus("Password reset instructions sent to your email.");
                }
              } catch {
                setStatus("Connection error. Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {mode === "signup" && (
              <div className="leadpilot-input-grid">
                <label className="leadpilot-field">
                  <span className="leadpilot-field-label">Full Name</span>
                  <input
                    name="fullName"
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. Rahul Verma"
                    className="leadpilot-text-input"
                  />
                </label>
                <label className="leadpilot-field">
                  <span className="leadpilot-field-label">Company / Startup Name</span>
                  <input
                    name="companyName"
                    type="text"
                    required
                    maxLength={120}
                    placeholder="e.g. Apex Technologies Pvt Ltd"
                    className="leadpilot-text-input"
                  />
                </label>
              </div>
            )}

            <label className="leadpilot-field">
              <span className="leadpilot-field-label">Business Work Email</span>
              <div className="leadpilot-input-wrapper">
                <Mail size={16} className="leadpilot-input-icon" />
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  className="leadpilot-text-input has-icon"
                />
              </div>
            </label>

            {mode !== "recover" && (
              <label className="leadpilot-field">
                <div className="leadpilot-field-header">
                  <span className="leadpilot-field-label">Secure Password</span>
                  {mode === "login" && (
                    <a href="/recover" className="leadpilot-forgot-link">
                      Forgot password?
                    </a>
                  )}
                </div>
                <div className="leadpilot-input-wrapper">
                  <Lock size={16} className="leadpilot-input-icon" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    required
                    minLength={mode === "signup" ? 8 : undefined}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="leadpilot-text-input has-icon has-trailing"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="leadpilot-toggle-password"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {mode === "signup" && (
                  <span className="leadpilot-field-hint">
                    Minimum 8 characters with numbers & special symbols.
                  </span>
                )}
              </label>
            )}

            {mode === "login" && (
              <label className="leadpilot-checkbox-label">
                <input type="checkbox" defaultChecked name="remember" />
                <span>Keep workspace session active on this browser</span>
              </label>
            )}

            <button type="submit" className="leadpilot-primary-btn" disabled={busy}>
              <span>
                {busy
                  ? "Authenticating…"
                  : mode === "login"
                    ? "Sign in to Console"
                    : mode === "signup"
                      ? "Create Free Workspace"
                      : "Send Reset Link"}
              </span>
              <ArrowRight size={16} />
            </button>
          </form>

          {status && (
            <div className="leadpilot-alert-banner" role="status">
              <ShieldCheck size={17} />
              <span>{status}</span>
            </div>
          )}

          <div className="leadpilot-security-badge">
            <span>🔒 256-Bit SSL Encrypted · Multi-Tenant Quarantine</span>
          </div>

          <p className="leadpilot-legal-footer">
            By accessing Leadpilot, you agree to our{" "}
            <a href="/terms-and-conditions">Terms of Service</a> and{" "}
            <a href="/privacy-policy">Privacy Policy</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
