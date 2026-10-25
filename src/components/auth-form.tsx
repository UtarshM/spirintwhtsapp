"use client";
import SalesMark from '@/components/sales-mark';
import { useState } from "react";
import { ArrowRight, ShieldCheck, Eye, EyeOff, MessageCircle, Mail, Check, Phone } from "lucide-react";
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
      <aside className="login-story">
        <a href="/" className="login-symbol" aria-label="Home"><SalesMark size={30}/></a>
        <div className="login-story-copy"><span className="login-overline">EVERY CONVERSATION COUNTS</span><h2>More connections.<br/> Better conversations.</h2><p>Bring your campaigns, messages, and next opportunities into one workspace.</p></div>
        <div className="login-illustration" aria-hidden="true">
          <div className="login-orbit"/><div className="login-orbit inner"/>
          <div className="login-message-card"><div className="login-message-top"><span className="login-contact-icon"><MessageCircle size={20}/></span><div><strong>A new conversation</strong><small>Your next opportunity starts here</small></div><i/></div><div className="login-bubble">Hi! I’d love to learn more.</div><div className="login-bubble reply">Let’s find the right fit for you. <Check size={14}/></div><div className="login-message-bottom"><span>Keep the conversation moving</span><ArrowRight size={18}/></div></div>
          <span className="login-floating mail"><Mail size={25}/></span><span className="login-floating phone"><Phone size={24}/></span><span className="login-floating connected"><Check size={16}/> A little closer to your next customer</span>
        </div>
        <div className="login-story-footer"><span>Connect</span><i/><span>Converse</span><i/><span>Grow</span></div>
      </aside>
      <section className="login-form-side">
        <div className="login-signup-prompt">{mode==='signup'?'Already a member?':'New here?'} <a href={mode==='signup'?'/login':'/signup'}>{mode==='signup'?'Log in':'Create an account'}</a></div>
        <div className="login-form-inner">
        <span className="login-overline">{mode==='login'?'WELCOME BACK':mode==='signup'?'LET’S GET STARTED':'ACCOUNT RECOVERY'}</span>
        <h1>
          {mode === "login"
            ? "Log in to your workspace"
            : mode === "signup"
              ? "Your next chapter starts here."
              : "Let’s get you back in."}
        </h1>
        <p>
          {mode === "login"
            ? "Pick up where your last conversation left off."
            : mode === "signup"
              ? "Create your account to start connecting."
              : "We’ll email you a secure recovery link."}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setStatus("");
            try {
              const d = new FormData(e.currentTarget);
              const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  mode,
                  email: d.get("email"),
                  password: d.get("password"),
                }),
              });
              const data = await res.json();
              if (!res.ok) {
                setStatus(data.error?.message || "Could not complete request");
                return;
              }
              if (mode === "login") location.href = "/account";
              else setStatus("Check your email for the next step.");
            } catch {
              setStatus("Connection failed. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
          </label>
          {mode !== "recover" && (
            <label>
              Password
              <span className="login-password"><input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                required
                minLength={mode === "signup" ? 12 : undefined}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={()=>setShowPassword(value=>!value)}>{showPassword?<EyeOff size={20}/>:<Eye size={20}/>}</button></span>
              {mode==='signup'&&<small>Use at least 12 characters.</small>}
            </label>
          )}
          <button className="primary" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send recovery link"}
            <ArrowRight size={16} />
          </button>
        </form>
        {status && (
          <div className="notice" role="status">
            <ShieldCheck size={17} />
            {status}
          </div>
        )}
        <div className="login-bottom-links">
          {mode==='login'?<a href="/recover">Forgot password?</a>:<a href="/login">Back to login</a>}
        </div>
        <a className="login-home-link" href="/">← Back to website</a>
        </div>
      </section>
    </div>
  );
}
