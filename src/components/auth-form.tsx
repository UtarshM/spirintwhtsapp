"use client";
import { useState } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Phone,
  MessageSquare,
  Sparkles,
  Users,
  CheckCircle,
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
      {/* Sprint Left Story Hero */}
      <aside className="login-story">
        <a href="/" className="login-symbol" aria-label="Sprint Home">
          <RapidSalesLogo size={32} />
        </a>

        <div className="login-story-copy">
          <span className="login-overline">AI SALES OUTREACH</span>
          <h2>Sales outreach that runs itself.</h2>
          <p>AI agents that call, message and qualify your leads around the clock.</p>
        </div>

        <div className="rapid-login-cards-list">
          <div className="rapid-login-card">
            <div className="rapid-login-card-icon phone">
              <Phone size={18} />
            </div>
            <div>
              <strong>1,000+ AI calls a day</strong>
              <p>Natural-sounding agents in English, Hindi, and Indian languages.</p>
            </div>
          </div>

          <div className="rapid-login-card">
            <div className="rapid-login-card-icon whatsapp">
              <MessageSquare size={18} />
            </div>
            <div>
              <strong>Email, WhatsApp and calling together</strong>
              <p>One unified sequence across every channel your leads use.</p>
            </div>
          </div>

          <div className="rapid-login-card">
            <div className="rapid-login-card-icon leads">
              <Sparkles size={18} />
            </div>
            <div>
              <strong>Qualified leads, automatically</strong>
              <p>Every reply is classified and routed to your closers instantly.</p>
            </div>
          </div>
        </div>

        <div className="rapid-login-trust">
          <CheckCircle size={15} className="text-emerald-400" />
          <span>Trusted by 500+ businesses & agencies</span>
        </div>

        <div className="login-story-footer">
          <span>© {new Date().getFullYear()} Sprint by Scalezix</span>
          <i />
          <span>Privacy</span>
          <i />
          <span>Terms</span>
        </div>
      </aside>

      {/* Right Form Side */}
      <section className="login-form-side">
        <div className="login-signup-prompt">
          {mode === "signup" ? "Already have an account?" : "No account?"}{" "}
          <a href={mode === "signup" ? "/login" : "/signup"}>
            {mode === "signup" ? "Sign in" : "Sign up"}
          </a>
        </div>

        <div className="login-form-inner">
          <span className="login-overline">
            {mode === "login"
              ? "WORKSPACE ACCESS"
              : mode === "signup"
                ? "GET STARTED"
                : "ACCOUNT RECOVERY"}
          </span>

          <h1>
            {mode === "login"
              ? "Welcome back"
              : mode === "signup"
                ? "Create your workspace"
                : "Reset your password"}
          </h1>

          <p>
            {mode === "login"
              ? "Sign in to your Sprint workspace."
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
                <div className="flex justify-between items-center mb-1">
                  <span>Password</span>
                  {mode === "login" && (
                    <a href="/recover" className="text-xs text-orange-600 hover:underline">
                      Forgot password?
                    </a>
                  )}
                </div>
                <span className="login-password">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
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
                  <small>Use at least 8 characters with numbers & symbols.</small>
                )}
              </label>
            )}

            {mode === "login" && (
              <label className="flex items-center gap-2 cursor-pointer mt-1 text-xs text-slate-600">
                <input type="checkbox" defaultChecked name="remember" />
                <span>Keep me signed in</span>
              </label>
            )}

            <button className="primary mt-3" disabled={busy}>
              {busy
                ? "Connecting…"
                : mode === "login"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create Workspace"
                    : "Send Recovery Link"}
              <ArrowRight size={16} />
            </button>
          </form>

          {status && (
            <div className="notice" role="status">
              <ShieldCheck size={17} />
              {status}
            </div>
          )}

          <div className="login-terms-notice text-xs text-slate-500 mt-6 text-center">
            By signing in you agree to our{" "}
            <a href="/terms-and-conditions" className="underline hover:text-slate-700">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy-policy" className="underline hover:text-slate-700">
              Privacy Policy
            </a>
            .
          </div>

          <a className="login-home-link" href="/">
            ← Back to website
          </a>
        </div>
      </section>
    </div>
  );
}
