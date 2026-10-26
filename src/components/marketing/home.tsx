import SalesMark from '@/components/sales-mark';
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  MessageCircle,
  Mail,
  Phone,
  AudioLines,
  ShieldCheck,
  GitBranch,
  Users,
  Clock,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import { features, solutions } from "@/lib/marketing/content";
import {
  Eyebrow,
  ProductPreview,
  FeatureCards,
  CTA,
  FAQ,
  AvailabilityNote,
} from "./blocks";

export default function Home() {
  return (
    <>
      <section className="site-home-hero site-container">
        <div className="hero-halo" aria-hidden="true" />
        <Eyebrow>TRI-CHANNEL AI SALES WORKSPACE</Eyebrow>
        <h1>
          Automate Email, WhatsApp,
          <br />
          and <span>AI Voice Calls.</span>
        </h1>
        <p className="hero-lead-text">
          Built for Indian SMEs, D2C brands, exporters, and agencies to prospect, follow up,
          and qualify leads automatically from one unified sales dashboard.
        </p>
        <div className="site-button-row">
          <Link href="/dashboard" className="site-button">
            Explore Sprint Console <ArrowUpRight size={17} />
          </Link>
          <Link href="/book-a-demo" className="site-button outline">
            Book a Live Demo <ArrowRight size={16} />
          </Link>
        </div>
        <div className="hero-pricing-badge">
          <span>Plan starts at <strong>₹3,000/month</strong> · Transparent Credit Usage</span>
        </div>
        <AvailabilityNote />

        <div className="hero-feature-pills">
          <div className="feature-pill-card">
            <div className="pill-icon whatsapp">
              <MessageCircle size={20} />
            </div>
            <div>
              <strong>Tri-Channel Outreach</strong>
              <span>Sync Email, WhatsApp & Voice workflows</span>
            </div>
          </div>
          <div className="feature-pill-card">
            <div className="pill-icon voice">
              <Phone size={20} />
            </div>
            <div>
              <strong>Human-Like AI Voice</strong>
              <span>Natural Hindi & Indian English conversations</span>
            </div>
          </div>
          <div className="feature-pill-card">
            <div className="pill-icon handoff">
              <Sparkles size={20} />
            </div>
            <div>
              <strong>Smart Handoff</strong>
              <span>Instantly stops outreach & alerts closers</span>
            </div>
          </div>
          <div className="feature-pill-card">
            <div className="pill-icon timeline">
              <Users size={20} />
            </div>
            <div>
              <strong>Unified Lead Timeline</strong>
              <span>Every chat, email & call transcript in one place</span>
            </div>
          </div>
        </div>

        <div className="hero-product-stage">
          <div className="hero-channel-label left">
            <span className="site-icon whatsapp">
              <MessageCircle size={20} />
            </span>
            Verified WhatsApp API.
          </div>
          <div className="hero-channel-label right">
            <span className="site-icon voice">
              <Phone size={19} />
            </span>
            Real-time AI Calling.
          </div>
          <ProductPreview />
          <div className="hero-preview-caption">
            <span>
              <span className="live-dot" />
              Everything connected. All channels in context.
            </span>
            <Link href="/dashboard">
              Open the interactive preview <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      <section className="site-stat-banner site-container">
        <div className="stat-banner-card">
          <p className="stat-highlight">
            <span>70% of sales time</span> gets lost when teams manage the same lead across separate tools.
          </p>
          <p className="stat-sub">
            Sprint unifies your outreach. Launch verified WhatsApp campaigns, send authenticated emails, run AI-powered voice calls, and track every single touchpoint without switching tabs.
          </p>
        </div>
      </section>

      <section className="site-audience-strip">
        <div className="site-container">
          <span>BUILT FOR FAST-GROWING SALES TEAMS</span>
          <div>
            {[
              "Indian SMEs",
              "D2C Brands",
              "Exporters",
              "Agencies",
              "Real Estate",
              "High-growth Startups",
            ].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="site-feature-showcase site-container">
        <div className="showcase-content">
          <Eyebrow>AI APPOINTMENT BOOKING</Eyebrow>
          <h2>
            Let AI Handle Your
            <br />
            <span>Meeting Bookings.</span>
          </h2>
          <p>
            Your AI Voice Agent automatically qualifies prospects, answers common questions, checks calendar availability, and schedules meetings—delivering instant WhatsApp and email confirmations.
          </p>
          <div className="showcase-grid-badges">
            <div className="badge-item"><Check size={16} /><span>AI Qualifies Leads</span></div>
            <div className="badge-item"><Check size={16} /><span>Books Calendar Slots</span></div>
            <div className="badge-item"><Check size={16} /><span>Meeting Confirmation</span></div>
            <div className="badge-item"><Check size={16} /><span>WhatsApp Reminders</span></div>
            <div className="badge-item"><Check size={16} /><span>Email Reminders</span></div>
            <div className="badge-item"><Check size={16} /><span>24×7 Instant Response</span></div>
          </div>
          <div className="showcase-cta">
            <Link href="/book-a-demo" className="site-button compact">
              See It In Action <ArrowRight size={15} />
            </Link>
          </div>
        </div>
        <div className="showcase-card-visual booking-mockup">
          <div className="mockup-header">
            <CalendarDays size={18} className="text-emerald" />
            <strong>Autonomous Meeting Dispatcher</strong>
            <span className="live-dot" />
          </div>
          <div className="mockup-body">
            <div className="mockup-step">
              <small>INCOMING CALL / PROSPECT QUALIFICATION</small>
              <p>&ldquo;I&apos;d love to see a demo of your WhatsApp bulk campaigns for our export business.&rdquo;</p>
            </div>
            <div className="mockup-arrow">↓</div>
            <div className="mockup-step active">
              <small>SLOT SELECTED &amp; CONFIRMED</small>
              <strong>Tomorrow at 3:30 PM (Asia/Kolkata)</strong>
              <span>Instant calendar invite sent + WhatsApp confirmation dispatched</span>
            </div>
            <div className="mockup-badges-row">
              <span className="tag">Google Calendar</span>
              <span className="tag">Outlook Sync</span>
              <span className="tag">WhatsApp Bot</span>
            </div>
          </div>
        </div>
      </section>

      <section className="site-feature-showcase reverse site-container">
        <div className="showcase-card-visual capture-mockup">
          <div className="mockup-header">
            <Sparkles size={18} className="text-emerald" />
            <strong>Universal Ingestion Engine</strong>
            <span className="live-dot" />
          </div>
          <div className="sources-list">
            <div className="source-row">
              <span className="source-dot meta" />
              <strong>Meta Lead Ads</strong>
              <small>Real-time Webhook</small>
              <span className="source-status">Auto-enrolled</span>
            </div>
            <div className="source-row">
              <span className="source-dot sheets" />
              <strong>Google Sheets</strong>
              <small>Cloud Sync</small>
              <span className="source-status">Auto-enrolled</span>
            </div>
            <div className="source-row">
              <span className="source-dot forms" />
              <strong>Website Forms</strong>
              <small>Direct API</small>
              <span className="source-status">Auto-enrolled</span>
            </div>
            <div className="source-row">
              <span className="source-dot csv" />
              <strong>CSV Lists</strong>
              <small>Validated Upload</small>
              <span className="source-status">Mapped &amp; Ready</span>
            </div>
          </div>
        </div>
        <div className="showcase-content">
          <Eyebrow>PLATFORM LEAD CAPTURE</Eyebrow>
          <h2>
            Capture Leads From
            <br />
            <span>Every Source</span> Automatically.
          </h2>
          <p>
            Connect Meta Lead Ads, Google Sheets, custom web forms, and CSV imports. Every new lead is automatically organized into the right segment and instantly triggers your multi-channel sequence.
          </p>
          <ul className="site-check-list">
            <li><Check size={15} /> Automatically segment new leads by tags and intent</li>
            <li><Check size={15} /> Trigger WhatsApp, Email, or AI Calling workflows in seconds</li>
            <li><Check size={15} /> Strict opt-in preservation and duplicate filtering</li>
            <li><Check size={15} /> Zero manual data entry for your sales reps</li>
          </ul>
          <div className="showcase-cta">
            <Link href="/features/lead-management" className="site-text-link">
              Learn more about Lead Capture <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className="site-section site-container">
        <div className="site-section-heading">
          <div>
            <Eyebrow>LESS SWITCHING. MORE CONNECTING.</Eyebrow>
            <h2>
              Three channels.
              <br />
              One continuous conversation.
            </h2>
          </div>
          <p>
            Your customers don’t think in channels.
            <br />
            Give your team the context to meet them naturally.
          </p>
        </div>
        <FeatureCards items={features.slice(0, 3)} />
      </section>
      <section className="site-story-section">
        <div className="site-container site-story-grid">
          <div>
            <Eyebrow>A LITTLE CONSISTENCY GOES A LONG WAY</Eyebrow>
            <h2>
              The follow-up
              <br />
              shouldn’t be
              <br />
              <span>the hard part.</span>
            </h2>
            <p>
              Build a journey that remembers the next step. A message, a little
              time, a call — with room for a real conversation in between.
            </p>
            <ul className="site-check-list">
              <li>
                <Check size={15} />
                Plan messages and calls in one sequence
              </li>
              <li>
                <Check size={15} />
                Pause outreach when someone replies
              </li>
              <li>
                <Check size={15} />
                Bring your team in with the context intact
              </li>
            </ul>
            <Link href="/features/sales-sequences" className="site-text-link">
              Meet your new follow-up flow <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="story-workflow">
            <div className="workflow-header">
              <span>
                <GitBranch size={15} /> New lead journey
              </span>
              <span>Draft preview</span>
            </div>
            <div className="story-flow-node">
              <span className="workflow-circle">
                <Users size={18} />
              </span>
              <div>
                <small>THE STARTING POINT</small>
                <strong>A new connection</strong>
              </div>
            </div>
            <div className="story-flow-line" />
            <div className="story-flow-node">
              <span className="site-icon whatsapp">
                <MessageCircle size={18} />
              </span>
              <div>
                <small>STEP 01</small>
                <strong>A warm WhatsApp hello</strong>
              </div>
              <Check size={15} />
            </div>
            <div className="story-flow-line" />
            <div className="story-wait">
              <Clock size={14} /> Give them a little time
            </div>
            <div className="story-flow-line" />
            <div className="story-flow-node">
              <span className="site-icon email">
                <Mail size={18} />
              </span>
              <div>
                <small>STEP 02</small>
                <strong>A thoughtful email follow-up</strong>
              </div>
              <Check size={15} />
            </div>
            <div className="story-flow-line" />
            <div className="story-human">
              <span className="live-dot" />A reply? It’s your team’s turn.
            </div>
          </div>
        </div>
      </section>
      <section className="site-section site-container">
        <div className="site-centered-heading">
          <Eyebrow>CONTEXT IS YOUR COMPETITIVE EDGE</Eyebrow>
          <h2>
            A clearer view of every
            <br />
            “let’s talk about it.”
          </h2>
          <p>
            From the first enquiry to the next opportunity, keep people,
            activity,
            <br className="desktop-break" /> and ownership in a workspace that
            makes sense.
          </p>
        </div>
        <div className="site-bento">
          <div className="bento-large">
            <span className="site-icon crm">
              <Users size={24} />
            </span>
            <h3>
              Know who’s next.
              <br />
              And what matters to them.
            </h3>
            <p>Contact lists, audience segments, and conversation history in one place.</p>
            <div className="bento-audiences">
              {[
                ["CONTACTS", "Your audience", "Import & organize"],
                ["SEGMENTS", "Relevant groups", "Tags & filters"],
                ["ACTIVITY", "Every touchpoint", "Messages & calls"],
              ].map(([stage, name, note]) => (
                <div key={stage}>
                  <span>{stage}</span>
                  <strong>{name}</strong>
                  <small>{note}</small>
                  <i />
                </div>
              ))}
            </div>
            <Link href="/features/lead-management" className="site-text-link">
              Explore contact management <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="bento-small">
            <span className="site-icon inbox">
              <MessageCircle size={23} />
            </span>
            <h3>
              One inbox.
              <br />A team on the same page.
            </h3>
            <p>Assign conversations and keep the full story close.</p>
            <Link href="/features/shared-inbox" className="site-text-link">
              A shared view <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="bento-small soft-blue">
            <span className="site-icon analytics">
              <AudioLines size={23} />
            </span>
            <h3>
              Your next move,
              <br />
              with a little more clarity.
            </h3>
            <p>Understand channel outcomes and where your credits go.</p>
            <Link href="/features/analytics" className="site-text-link">
              Look at the bigger picture <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </section>
      <section className="site-integration-band site-container">
        <div>
          <Eyebrow>YOUR TOOLS. BETTER TOGETHER.</Eyebrow>
          <h2>
            A connected foundation.
            <br />
            Built around your business.
          </h2>
          <p>
            Meta Cloud API, Gmail, Zoho, and Plivo are the planned channel
            foundations. Set up and verify connections in the integration phase.
          </p>
          <Link href="/integrations" className="site-text-link">
            Explore planned integrations <ArrowUpRight size={16} />
          </Link>
        </div>
        <div
          className="integration-orbit"
          aria-label="Planned integrations: WhatsApp, Gmail, Zoho and Plivo"
        >
          <span className="orbit-brand">
            <SalesMark size={40} />
          </span>
          <span className="orbit-provider whatsapp">
            <MessageCircle size={26} />
            <small>WhatsApp</small>
          </span>
          <span className="orbit-provider email">
            <Mail size={26} />
            <small>Gmail</small>
          </span>
          <span className="orbit-provider zoho">
            Z<small>Zoho</small>
          </span>
          <span className="orbit-provider voice">
            <Phone size={25} />
            <small>Plivo</small>
          </span>
        </div>
      </section>
      <section className="site-section site-container">
        <div className="site-section-heading">
          <div>
            <Eyebrow>YOUR BUSINESS, YOUR WAY</Eyebrow>
            <h2>
              Built for the team
              <br />
              behind the conversation.
            </h2>
          </div>
          <Link className="site-text-link" href="/solutions">
            Find your fit <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="site-solution-grid">
          {solutions.slice(0, 3).map((s, i) => (
            <Link key={s.slug} href={"/solutions/" + s.slug}>
              <span>0{i + 1}</span>
              <h3>{s.label}</h3>
              <p>{s.description}</p>
              <ArrowUpRight size={20} />
            </Link>
          ))}
        </div>
      </section>
      <FAQ />
      <CTA />
    </>
  );
}
