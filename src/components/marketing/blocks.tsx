import Link from "next/link";
import SalesMark from "@/components/sales-mark";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  MessageCircle,
  Mail,
  Phone,
  GitBranch,
  ShieldCheck,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { ProductIcon } from "./site-shell";
import { faqs, type Feature } from "@/lib/marketing/content";
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-eyebrow">
      <i />
      {children}
    </div>
  );
}
export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="site-page-hero site-container">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </section>
  );
}
export function CTA({
  title = "Your next great conversation starts here.",
  description = "Explore a calmer, more connected way to build customer relationships.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="site-cta site-container">
      <div className="site-cta-orbit" aria-hidden="true" />
      <div>
        <Eyebrow>LET’S MAKE A CONNECTION</Eyebrow>
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="site-button-row">
          <Link className="site-button white" href="/book-a-demo">
            Plan a walkthrough <ArrowUpRight size={16} />
          </Link>
          <Link className="site-text-link white-text" href="/dashboard">
            Explore the product preview <ArrowRight size={15} />
          </Link>
        </div>
      </div>
      <div className="site-cta-symbol" aria-hidden="true">
        <SalesMark size={65} />
      </div>
    </section>
  );
}
export function FAQ({ items = faqs }: { items?: string[][] }) {
  return (
    <section className="site-faq site-container">
      <div>
        <Eyebrow>A LITTLE MORE CLARITY</Eyebrow>
        <h2>
          Good questions.
          <br />
          Clear answers.
        </h2>
        <p>
          Still curious about something?
          <br />
          <Link className="site-text-link" href="/contact">
            Let’s talk it through <ArrowUpRight size={14} />
          </Link>
        </p>
      </div>
      <div>
        {items.map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <span>+</span>
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
export function FeatureCards({ items }: { items: Feature[] }) {
  return (
    <div className="site-feature-grid">
      {items.map((f) => (
        <Link
          className="site-feature-card"
          key={f.slug}
          href={"/features/" + f.slug}
        >
          <span className={"site-icon " + f.icon}>
            <ProductIcon kind={f.icon} />
          </span>
          <span className="site-card-arrow">
            <ArrowUpRight size={20} />
          </span>
          <h3>{f.label}</h3>
          <p>{f.description}</p>
          <span className="site-small-link">
            Explore {f.label.toLowerCase()} <ArrowRight size={14} />
          </span>
        </Link>
      ))}
    </div>
  );
}
export function ProductPreview({ variant = "overview" }: { variant?: string }) {
  return (
    <div className={"site-product-preview " + variant}>
      <div className="preview-window-bar">
        <span />
        <span />
        <span />
        <div>
          Sprint workspace <ShieldCheck size={10} />
        </div>
        <em>Illustrative preview</em>
      </div>
      <div className="preview-product-body">
        <aside>
          <div className="preview-wordmark">
            <SalesMark size={17} />
            sprint.
          </div>
          {[
            "Overview",
            "Contacts",
            "Campaigns",
            "Sequences",
            "Inbox",
            "AI calling",
          ].map((n, i) => (
            <div
              className={
                i === (variant === "sequence" ? 3 : 0) ? "selected" : ""
              }
              key={n}
            >
              <span>
                {i === 0
                  ? "◫"
                  : i === 1
                    ? "◉"
                    : i === 2
                      ? "↗"
                      : i === 3
                        ? "⑂"
                        : i === 4
                          ? "▱"
                          : "≋"}
              </span>
              {n}
            </div>
          ))}
          <small>BY SCALEZIX</small>
        </aside>
        <div className="preview-product-main">
          <div className="preview-product-title">
            <div>
              <small>YOUR WORKSPACE, CONNECTED</small>
              <h3>
                {variant === "sequence"
                  ? "A thoughtful follow-up."
                  : "A good day to grow."}
              </h3>
            </div>
            <span>＋ Create campaign</span>
          </div>
          {variant === "sequence" ? (
            <div className="preview-workflow">
              <div>
                <span className="workflow-circle">
                  <UsersIcon />
                </span>
                New lead joins your audience
              </div>
              <i />
              <div>
                <span className="site-icon whatsapp">
                  <MessageCircle size={17} />
                </span>
                <span>
                  <small>STEP 01</small>A warm WhatsApp welcome
                </span>
                <Check size={14} />
              </div>
              <i />
              <div className="workflow-delay">
                ◷ Give the conversation a little space
              </div>
              <i />
              <div>
                <span className="site-icon email">
                  <Mail size={17} />
                </span>
                <span>
                  <small>STEP 02</small>A personal email follow-up
                </span>
                <Check size={14} />
              </div>
            </div>
          ) : (
            <>
              <div className="preview-metrics">
                {[
                  ["Contacts", "1,284"],
                  ["Conversations", "248"],
                  ["Opportunities", "36"],
                ].map(([label, n]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{n}</strong>
                    <small>Illustrative sample</small>
                  </div>
                ))}
              </div>
              <div className="preview-chart">
                <div>
                  <h4>Every channel. One view.</h4>
                  <span>
                    WhatsApp <i /> Email <i /> AI calls
                  </span>
                </div>
                <svg
                  viewBox="0 0 600 150"
                  role="img"
                  aria-label="Illustrative activity chart"
                >
                  <defs>
                    <linearGradient
                      id={"preview-gradient-" + variant}
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop stopColor="#4178f3" stopOpacity=".16" />
                      <stop offset="1" stopColor="#4178f3" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[25, 65, 105, 145].map((y) => (
                    <path
                      key={y}
                      d={`M0 ${y}H600`}
                      stroke="#e8edf6"
                      strokeDasharray="4 5"
                    />
                  ))}
                  <path
                    d="M0 130 Q35 130 70 95 T140 105 T210 75 T280 80 T350 45 T420 55 T490 20 T600 10V150H0Z"
                    fill={`url(#preview-gradient-${variant})`}
                  />
                  <path
                    d="M0 130 Q35 130 70 95 T140 105 T210 75 T280 80 T350 45 T420 55 T490 20 T600 10"
                    fill="none"
                    stroke="#5480ec"
                    strokeWidth="3"
                  />
                  <path
                    d="M0 145 Q35 140 70 123 T140 130 T210 110 T280 115 T350 90 T420 95 T490 75 T600 70"
                    fill="none"
                    stroke="#79c1b2"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div className="preview-conversation">
                <span className="preview-contact">AM</span>
                <div>
                  <strong>Aarav Mehta</strong>
                  <small>Ready for the next conversation</small>
                </div>
                <span className="preview-ready">
                  A clear next step <ArrowUpRight size={12} />
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
function UsersIcon() {
  return <GitBranch size={17} />;
}
export function AvailabilityNote() {
  return (
    <div className="site-availability">
      <span />
      Product preview · Live integrations are part of the next development
      phase.
    </div>
  );
}
