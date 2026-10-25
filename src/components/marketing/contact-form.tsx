"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Download,
  Copy,
  MessageCircle,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { download } from "@/components/studio-ui";
export default function ContactForm({ demo = false }: { demo?: boolean }) {
  const [feedback, setFeedback] = useState(""),
    [error, setError] = useState(false),
    [draft, setDraft] = useState<Record<string, string> | null>(null),
    [plan, setPlan] = useState("");
  useEffect(() => {
    setPlan(new URL(location.href).searchParams.get("plan") || "");
    try {
      const raw = localStorage.getItem(
        demo ? "relay-walkthrough-draft" : "relay-enquiry-draft",
      );
      if (raw) {
        const saved = JSON.parse(raw);
        if (
          saved &&
          typeof saved.Name === "string" &&
          typeof saved.Email === "string"
        ) {
          setDraft(saved);
          setFeedback(
            "Your saved local draft is restored. It has not been sent.",
          );
        }
      }
    } catch {
      /* A blocked or invalid local draft must not prevent form use. */
    }
  }, []);
  function text(d: Record<string, string>) {
    return Object.entries(d)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
  }
  return (
    <div className="site-contact-grid site-container">
      <div className="site-contact-intro">
        <h2>
          {demo
            ? "A walkthrough around your business."
            : "Tell us what a better sales day looks like."}
        </h2>
        <p>
          {demo
            ? "Start with the channels you use and the follow-ups you want to improve. We’ll shape the walkthrough request around your team."
            : "Your goals are a useful place to start. Prepare a short enquiry about your team, channels, and next steps."}
        </p>
        <div className="site-contact-points">
          <div>
            <MessageCircle size={20} />
            <span>
              <h3>Your business, in context</h3>
              <small>
                A useful conversation starts with what matters to you.
              </small>
            </span>
          </div>
          <div>
            <Clock size={20} />
            <span>
              <h3>A thoughtful next step</h3>
              <small>
                No live booking or external submission in this preview.
              </small>
            </span>
          </div>
          <div>
            <ShieldCheck size={20} />
            <span>
              <h3>You stay in control</h3>
              <small>Save or download your draft. Nothing is sent.</small>
            </span>
          </div>
        </div>
      </div>
      <form
        className="site-contact-form"
        key={draft ? "saved" : "new"}
        onSubmit={(e) => {
          e.preventDefault();
          const data = Object.fromEntries(
            new FormData(e.currentTarget),
          ) as Record<string, string>;
          try {
            localStorage.setItem(
              demo ? "relay-walkthrough-draft" : "relay-enquiry-draft",
              JSON.stringify({
                ...data,
                type: demo ? "Walkthrough request" : "Enquiry",
                savedAt: new Date().toISOString(),
              }),
            );
            setDraft(data);
            setError(false);
            setFeedback(
              "Your draft is saved on this browser. It has not been sent, and no meeting is booked. You can download or copy it below.",
            );
          } catch {
            setError(true);
            setFeedback(
              "Browser storage is unavailable. Copy or download the draft instead.",
            );
            setDraft(data);
          }
        }}
      >
        <div className="site-form-row">
          <label>
            Full name *
            <input
              name="Name"
              defaultValue={draft?.["Name"] || ""}
              required
              maxLength={120}
              autoComplete="name"
              placeholder="Your name"
            />
          </label>
          <label>
            Work email *
            <input
              name="Email"
              defaultValue={draft?.["Email"] || ""}
              type="email"
              required
              maxLength={200}
              autoComplete="email"
              placeholder="you@company.com"
            />
          </label>
        </div>
        <div className="site-form-row">
          <label>
            Company *
            <input
              name="Company"
              defaultValue={draft?.["Company"] || ""}
              required
              maxLength={150}
              autoComplete="organization"
              placeholder="Your company"
            />
          </label>
          <label>
            Team size
            <select
              name="Team size"
              defaultValue={draft?.["Team size"] || "1–5 people"}
            >
              <option>1–5 people</option>
              <option>6–20 people</option>
              <option>21–50 people</option>
              <option>51+ people</option>
            </select>
          </label>
        </div>
        <label>
          What would you like to explore?
          <select
            name="Interest"
            key={plan}
            defaultValue={
              plan
                ? `${plan[0].toUpperCase() + plan.slice(1)} plan`
                : draft?.Interest || "All three channels"
            }
          >
            {[
              "All three channels",
              "WhatsApp outreach",
              "Email workflows",
              "AI calling",
              "Connect plan",
              "Grow plan",
              "Scale plan",
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        {demo && (
          <div className="site-form-row">
            <label>
              Preferred date (not a booking)
              <input
                name="Preferred date"
                defaultValue={draft?.["Preferred date"] || ""}
                type="date"
                min={new Date().toLocaleDateString("en-CA")}
              />
            </label>
            <label>
              Preferred time window
              <select
                name="Preferred time"
                defaultValue={
                  draft?.["Preferred time"] || "Morning · 10 AM–12 PM IST"
                }
              >
                <option>Morning · 10 AM–12 PM IST</option>
                <option>Afternoon · 12 PM–4 PM IST</option>
                <option>Evening · 4 PM–6 PM IST</option>
              </select>
            </label>
          </div>
        )}
        <label>
          Your goals
          <textarea
            name="Goals"
            defaultValue={draft?.["Goals"] || ""}
            rows={4}
            maxLength={4000}
            placeholder="What would you like your outreach to do better?"
          />
        </label>
        <label className="site-checkbox">
          <input type="checkbox" required />
          <span>
            I understand this saves a local draft only. Please avoid
            confidential customer data or credentials.
          </span>
        </label>
        <button className="site-button">
          Save {demo ? "walkthrough request" : "enquiry"} draft{" "}
          <ArrowUpRight size={15} />
        </button>
        <p className="site-form-note">
          Local preview · No form data is transmitted to Scalezix or a third
          party.
        </p>
        {feedback && (
          <div
            className={"site-form-feedback " + (error ? "error" : "")}
            role="status"
          >
            {feedback}
          </div>
        )}
        {draft && (
          <div className="site-contact-draft-actions">
            <button
              type="button"
              className="site-text-link"
              onClick={() => download("relay-enquiry-draft.txt", text(draft))}
            >
              <Download size={13} />
              Download draft
            </button>
            <button
              type="button"
              className="site-text-link"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(text(draft));
                  setFeedback("Draft copied. It has not been sent.");
                } catch {
                  setFeedback(
                    "Copy is unavailable. Download the draft instead.",
                  );
                }
              }}
            >
              <Copy size={13} />
              Copy draft
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
