"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Info,
  ShieldCheck,
  Bot,
  Radar,
  Mic,
  MessageCircle,
  Mail,
  Phone,
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Flame
} from "lucide-react";
import { Eyebrow, PageHero, CTA, FAQ } from "./blocks";

type BillingCycle = "monthly" | "quarterly" | "annually";

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const annual = billingCycle === "annually";

  // Calculator inputs
  const [wa, setWa] = useState(1500);
  const [emails, setEmails] = useState(2500);
  const [calls, setCalls] = useState(250);

  // Add-ons state
  const [addons, setAddons] = useState({
    chatbot: false,
    visitorId: false,
    voicePack: false,
  });

  const toggleAddon = (key: keyof typeof addons) => {
    setAddons((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const addonPrices = {
    chatbot: 1999,
    visitorId: 1999,
    voicePack: 1499,
  };

  const totalAddonsPrice =
    (addons.chatbot ? addonPrices.chatbot : 0) +
    (addons.visitorId ? addonPrices.visitorId : 0) +
    (addons.voicePack ? addonPrices.voicePack : 0);

  // Discount multipliers: Annually = 20% off (0.8), Quarterly = 10% off (0.9), Monthly = 1.0
  const discountMultiplier =
    billingCycle === "annually" ? 0.8 : billingCycle === "quarterly" ? 0.9 : 1;

  const plans = [
    {
      id: "connect",
      name: "Connect",
      badge: "Starter",
      subtitle: "WhatsApp Outreach & Shared Inbox",
      price: 2999,
      description:
        "A focused start for teams building automated WhatsApp outreach and lead engagement with official API compliance.",
      popular: false,
      items: [
        "Official WhatsApp Business API integration",
        "Verification preparation guide (Meta approval required)",
        "Shared multi-agent team inbox & live chat",
        "Broadcast campaigns & automated scheduling",
        "Contact organization, tags & audience segments",
        "Pre-approved rich templates & quick replies",
        "Working days & sending windows protection",
        "Prepaid credit wallet & balance safeguards",
      ],
      highlightItems: ["Official WhatsApp Cloud API", "Shared Team Inbox"],
    },
    {
      id: "grow",
      name: "Grow",
      badge: "Most Popular",
      subtitle: "WhatsApp + AI Calling & Sequences",
      price: 3999,
      description:
        "A connected omnichannel sales engine. Combine high-intent WhatsApp with autonomous AI voice calls in Hindi and English.",
      popular: true,
      items: [
        "Everything in Connect, plus:",
        "Hindi & English autonomous AI voice calling",
        "Automated outbound calls & lead qualification",
        "Smart multi-channel sequences (WhatsApp + Email + Voice)",
        "Gmail & Zoho email discovery and sequencing",
        "Instant human agent transfer & live call routing",
        "Call recordings & searchable AI transcript storage",
        "Lead qualification & human handoff triggers",
      ],
      highlightItems: [
        "Autonomous AI Calling (Hindi + English)",
        "Multi-Channel Sales Sequences",
        "Gmail & Zoho Integration",
      ],
    },
    {
      id: "scale",
      name: "Scale",
      badge: "Enterprise Ready",
      subtitle: "Full Omnichannel Command & Control",
      price: 9999,
      description:
        "Maximum control, throughput, and dedicated governance for high-growth sales teams running large multi-channel campaigns.",
      popular: false,
      items: [
        "Everything in Grow, plus:",
        "Expanded team seats & daily outreach volume",
        "Advanced behavioral segment rules & filters",
        "Cross-channel cost attribution & ROI analytics",
        "Dedicated onboarding specialist & rollout plan",
        "Priority webhook routing & 99.9% uptime SLA",
        "Role-based permissions & audit activity logs",
      ],
      highlightItems: [
        "Unlimited Advanced Segments",
        "Dedicated Onboarding & Rollout",
        "Priority Webhook & Uptime SLA",
      ],
    },
  ];

  // Feature comparison matrix state
  const [showMatrix, setShowMatrix] = useState(false);

  const matrixCategories = [
    {
      category: "Channel Access & Outreach",
      features: [
        { name: "Official WhatsApp Cloud API", connect: "Included", grow: "Included", scale: "Included" },
        { name: "Shared Team Inbox", connect: "Up to 3 seats", grow: "Up to 8 seats", scale: "Unlimited" },
        { name: "WhatsApp Broadcast Campaigns", connect: "Yes", grow: "Yes", scale: "Yes" },
        { name: "Email Outreach (Gmail & Zoho)", connect: "—", grow: "Up to 5 accounts", scale: "Up to 25 accounts" },
        { name: "Multi-Channel Automated Sequences", connect: "—", grow: "Included", scale: "Advanced logic" },
        { name: "Sending Windows & Timezone Guard", connect: "Yes", grow: "Yes", scale: "Custom per-agent" },
      ],
    },
    {
      category: "AI Voice Calling & Phone Automation",
      features: [
        { name: "Autonomous AI Phone Calling", connect: "—", grow: "Hindi + English", scale: "Hindi, English + Dialects" },
        { name: "Outbound Lead Qualification Calls", connect: "—", grow: "Included", scale: "Included" },
        { name: "Human Agent Call Transfer", connect: "—", grow: "Standard", scale: "Priority failover" },
        { name: "Call Recordings & Transcripts", connect: "—", grow: "30-day retention", scale: "365-day retention" },
        { name: "Custom Voice & Tone Calibration", connect: "—", grow: "Preset library", scale: "Custom cloning" },
      ],
    },
    {
      category: "Contacts, Segmentation & Intelligence",
      features: [
        { name: "Contact Management & Segments", connect: "Up to 10,000", grow: "Up to 50,000", scale: "Unlimited" },
        { name: "Dynamic Audience Segments", connect: "Basic tags", grow: "Multi-rule filters", scale: "Real-time behavioral" },
        { name: "Lead Qualification & Scoring", connect: "Manual", grow: "AI automated", scale: "Custom AI rules" },
        { name: "Prepaid Credit Ledger & Tracking", connect: "Yes", grow: "Yes", scale: "Yes + departmental" },
      ],
    },
    {
      category: "Support & SLA",
      features: [
        { name: "Customer Support", connect: "Email (24-48h)", grow: "Priority Chat & Email", scale: "Dedicated Account Lead" },
        { name: "Custom Workflow Onboarding", connect: "Self-serve guides", grow: "Assisted video session", scale: "Full custom setup" },
        { name: "Uptime SLA", connect: "Standard 99.5%", grow: "99.9%", scale: "99.95% guaranteed" },
      ],
    },
  ];

  return (
    <div className="site-pricing-page-wrapper">
      <PageHero
        eyebrow="PRICING PLANS · SIMPLE & TRANSPARENT"
        title="Good conversations. Clear costs."
        description="Choose the capabilities your team needs. Keep platform access transparent and channel usage completely in your control."
      />

      <section className="site-container" style={{ paddingBottom: 60 }}>
        {/* Transparency note badge */}
        <div className="site-pricing-hero-badge">
          <Info size={18} className="site-pricing-info-icon" />
          <span>
            <strong>Transparent platform fee:</strong> Subscriptions cover platform access and features. WhatsApp, email and AI voice minutes are drawn from your transparent prepaid credit wallet as you send.
          </span>
        </div>

        {/* Billing period switcher */}
        <div className="site-price-controls-modern">
          <div className="site-billing-pills" role="radiogroup" aria-label="Billing cycle selector">
            <button
              type="button"
              role="radio"
              aria-checked={billingCycle === "monthly"}
              className={`site-billing-pill-btn ${billingCycle === "monthly" ? "active" : ""}`}
              onClick={() => setBillingCycle("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={billingCycle === "quarterly"}
              className={`site-billing-pill-btn ${billingCycle === "quarterly" ? "active" : ""}`}
              onClick={() => setBillingCycle("quarterly")}
            >
              Quarterly
              <span className="site-pill-discount-tag">-10%</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={billingCycle === "annually"}
              className={`site-billing-pill-btn ${billingCycle === "annually" ? "active" : ""}`}
              onClick={() => setBillingCycle("annually")}
            >
              Annually
              <span className="site-pill-discount-tag popular-discount">-20%</span>
            </button>
          </div>

          <div className="site-savings-callout">
            <span className="site-savings-badge">
              <Sparkles size={13} />
              Save up to 20% with annual commitment
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="site-pricing-grid-modern">
          {plans.map((p) => {
            const finalPrice = Math.round(p.price * discountMultiplier);
            const annualTotal = Math.round(p.price * 0.8) * 12;

            return (
              <article
                className={`site-plan-card-modern ${p.popular ? "featured" : ""}`}
                key={p.id}
              >
                {p.popular && (
                  <div className="site-plan-featured-ribbon">
                    <Sparkles size={13} />
                    <span>MOST POPULAR — THE CONNECTED WORKSPACE</span>
                  </div>
                )}

                <div className="site-plan-header">
                  <div className="site-plan-badge-row">
                    <span className={`site-plan-tag ${p.popular ? "featured-tag" : ""}`}>
                      {p.badge}
                    </span>
                    <span className="site-plan-slug-label">{p.name}</span>
                  </div>

                  <h3 className="site-plan-title">{p.subtitle}</h3>
                  <p className="site-plan-desc">{p.description}</p>
                </div>

                <div className="site-plan-price-block">
                  <div className="site-plan-price-main">
                    <span className="site-plan-currency">₹</span>
                    <span className="site-plan-amount">
                      {finalPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="site-plan-term">/ month</span>
                  </div>

                  <div className="site-plan-billing-note">
                    {billingCycle === "annually" ? (
                      <>
                        <strong>₹{annualTotal.toLocaleString("en-IN")}</strong> billed annually (20% savings)
                      </>
                    ) : billingCycle === "quarterly" ? (
                      <>
                        <strong>₹{(finalPrice * 3).toLocaleString("en-IN")}</strong> billed quarterly (10% savings)
                      </>
                    ) : (
                      "Billed monthly · No long-term lock-in"
                    )}
                    <span className="site-plan-gst-note"> + applicable GST</span>
                  </div>
                </div>

                <Link
                  className={`site-plan-cta-button ${p.popular ? "primary-cta" : "outline-cta"}`}
                  href={`/contact?plan=${p.id}`}
                >
                  <span>Discuss {p.name}</span>
                  <ArrowUpRight size={17} />
                </Link>

                <div className="site-plan-features-wrapper">
                  <h4 className="site-plan-features-heading">WHAT’S INCLUDED IN {p.name.toUpperCase()}:</h4>
                  <ul className="site-plan-features-list">
                    {p.items.map((item, idx) => (
                      <li key={idx} className="site-plan-feature-item">
                        <span className="site-feature-check-icon">
                          <Check size={14} strokeWidth={2.8} />
                        </span>
                        <span className="site-feature-text">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>

        {/* Indicative Scope Notice */}
        <div className="site-pricing-disclaimer-box">
          <ShieldCheck size={20} className="site-disclaimer-icon" />
          <p>
            <strong>Preview Environment Notice:</strong> Plan capabilities describe the intended production scope. Checkout and provider connections remain disabled during this local review phase. Versioned credit packages, channel settlement rates, and Razorpay subscriptions will activate upon approved production release.
          </p>
        </div>

        {/* Retner-style Interactive Add-ons Section */}
        <section className="site-addons-section">
          <div className="site-addons-header">
            <span className="site-pill-overline">
              <Layers size={13} />
              CUSTOMIZE & EXPAND
            </span>
            <h2 className="site-addons-title">Enhance your workspace with AI add-ons</h2>
            <p className="site-addons-subtitle">
              Scale your sales workflow on your own terms. Plug in intelligent features when you need them.
            </p>
          </div>

          <div className="site-addons-grid">
            {/* Add-on 1: AI Chatbot */}
            <div
              className={`site-addon-card ${addons.chatbot ? "selected" : ""}`}
              onClick={() => toggleAddon("chatbot")}
              role="checkbox"
              aria-checked={addons.chatbot}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  toggleAddon("chatbot");
                }
              }}
            >
              <div className="site-addon-left">
                <div className={`site-addon-checkbox ${addons.chatbot ? "checked" : ""}`}>
                  {addons.chatbot && <Check size={13} strokeWidth={3} />}
                </div>
                <div className="site-addon-icon-box">
                  <Bot size={22} />
                </div>
                <div className="site-addon-info">
                  <div className="site-addon-title-row">
                    <h4>24/7 AI Smart Chatbot</h4>
                    <span className="site-addon-tag">Enterprise</span>
                  </div>
                  <p>
                    Autonomous conversational chatbot with unlimited chats. Handles product FAQs, pre-sales qualification, and continuous learning from historical chats.
                  </p>
                </div>
              </div>
              <div className="site-addon-price">
                <span className="site-addon-amount">+₹1,999</span>
                <span className="site-addon-cadence">/ month</span>
              </div>
            </div>

            {/* Add-on 2: Retner-style High Intent Identification */}
            <div
              className={`site-addon-card ${addons.visitorId ? "selected" : ""}`}
              onClick={() => toggleAddon("visitorId")}
              role="checkbox"
              aria-checked={addons.visitorId}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  toggleAddon("visitorId");
                }
              }}
            >
              <div className="site-addon-left">
                <div className={`site-addon-checkbox ${addons.visitorId ? "checked" : ""}`}>
                  {addons.visitorId && <Check size={13} strokeWidth={3} />}
                </div>
                <div className="site-addon-icon-box">
                  <Radar size={22} />
                </div>
                <div className="site-addon-info">
                  <div className="site-addon-title-row">
                    <h4>High-Intent Lead Identification</h4>
                    <span className="site-addon-tag">Growth</span>
                  </div>
                  <p>
                    Identify anonymous web and store visitors exhibiting high purchase intent. Instantly trigger personalized WhatsApp or email outreach to recover dropped leads.
                  </p>
                </div>
              </div>
              <div className="site-addon-price">
                <span className="site-addon-amount">+₹1,999</span>
                <span className="site-addon-cadence">/ month</span>
              </div>
            </div>

            {/* Add-on 3: Custom Indian Regional Voice Pack */}
            <div
              className={`site-addon-card ${addons.voicePack ? "selected" : ""}`}
              onClick={() => toggleAddon("voicePack")}
              role="checkbox"
              aria-checked={addons.voicePack}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  toggleAddon("voicePack");
                }
              }}
            >
              <div className="site-addon-left">
                <div className={`site-addon-checkbox ${addons.voicePack ? "checked" : ""}`}>
                  {addons.voicePack && <Check size={13} strokeWidth={3} />}
                </div>
                <div className="site-addon-icon-box">
                  <Mic size={22} />
                </div>
                <div className="site-addon-info">
                  <div className="site-addon-title-row">
                    <h4>Regional Voice & Dialect Pack</h4>
                    <span className="site-addon-tag">Voice AI</span>
                  </div>
                  <p>
                    Ultra-realistic Indian accents with conversational Hindi, Hinglish, Marathi, and Gujarati speech nuances for high-trust outbound calling.
                  </p>
                </div>
              </div>
              <div className="site-addon-price">
                <span className="site-addon-amount">+₹1,499</span>
                <span className="site-addon-cadence">/ month</span>
              </div>
            </div>
          </div>

          {totalAddonsPrice > 0 && (
            <div className="site-addons-selected-summary">
              <div className="site-summary-content">
                <Sparkles size={17} className="site-summary-icon" />
                <span>
                  Selected Add-ons Total: <strong>+₹{totalAddonsPrice.toLocaleString("en-IN")}/mo</strong>
                </span>
              </div>
              <Link className="site-summary-cta" href="/contact?addons=selected">
                Configure In Enquiry <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </section>

        {/* Interactive Usage & Credit Calculator */}
        <section className="site-calculator-modern">
          <div className="site-calc-intro">
            <span className="site-pill-overline">
              <SlidersHorizontal size={13} />
              INTERACTIVE USAGE CALCULATOR
            </span>
            <h3 className="site-calc-heading">Estimate your monthly usage</h3>
            <p className="site-calc-desc">
              Test out different outreach volumes across WhatsApp, Email, and AI Calling. Sprint uses a transparent prepaid credit ledger with zero surprise fees.
            </p>

            <div className="site-calc-rate-card">
              <h5 className="site-calc-rate-title">Indicative Reference Conversion:</h5>
              <div className="site-calc-rate-row">
                <span className="site-channel-indicator whatsapp">
                  <MessageCircle size={14} /> WhatsApp
                </span>
                <span className="site-calc-rate-val">1 credit / message</span>
              </div>
              <div className="site-calc-rate-row">
                <span className="site-channel-indicator email">
                  <Mail size={14} /> Email Outreach
                </span>
                <span className="site-calc-rate-val">1 credit / email</span>
              </div>
              <div className="site-calc-rate-row">
                <span className="site-channel-indicator voice">
                  <Phone size={14} /> AI Voice Calling
                </span>
                <span className="site-calc-rate-val">5 credits / minute</span>
              </div>
            </div>

            <p className="site-calc-footnote">
              * Rates shown are illustrative model estimates. Exact provider network charges will be finalized prior to commercial rollout.
            </p>
          </div>

          <div className="site-calc-controls">
            {/* WhatsApp Control */}
            <div className="site-calc-group">
              <div className="site-calc-label-row">
                <label htmlFor="wa-slider" className="site-calc-label">
                  <MessageCircle size={16} className="text-emerald" />
                  <span>WhatsApp Messages</span>
                </label>
                <div className="site-calc-input-wrap">
                  <input
                    id="wa-input"
                    type="number"
                    min={0}
                    max={100000}
                    value={wa}
                    onChange={(e) =>
                      setWa(Math.min(100000, Math.max(0, Number(e.target.value) || 0)))
                    }
                    className="site-calc-num-input"
                    aria-label="WhatsApp messages quantity"
                  />
                  <span className="site-calc-unit">msgs</span>
                </div>
              </div>
              <input
                id="wa-slider"
                type="range"
                min={0}
                max={50000}
                step={250}
                value={wa}
                onChange={(e) => setWa(Number(e.target.value))}
                className="site-calc-slider wa-accent"
                aria-label="WhatsApp messages slider"
              />
              <div className="site-calc-slider-scale">
                <span>0</span>
                <span>25,000</span>
                <span>50,000+</span>
              </div>
            </div>

            {/* Email Control */}
            <div className="site-calc-group">
              <div className="site-calc-label-row">
                <label htmlFor="email-slider" className="site-calc-label">
                  <Mail size={16} className="text-orange" />
                  <span>Email Messages</span>
                </label>
                <div className="site-calc-input-wrap">
                  <input
                    id="email-input"
                    type="number"
                    min={0}
                    max={200000}
                    value={emails}
                    onChange={(e) =>
                      setEmails(Math.min(200000, Math.max(0, Number(e.target.value) || 0)))
                    }
                    className="site-calc-num-input"
                    aria-label="Email messages quantity"
                  />
                  <span className="site-calc-unit">emails</span>
                </div>
              </div>
              <input
                id="email-slider"
                type="range"
                min={0}
                max={50000}
                step={500}
                value={emails}
                onChange={(e) => setEmails(Number(e.target.value))}
                className="site-calc-slider email-accent"
                aria-label="Email messages slider"
              />
              <div className="site-calc-slider-scale">
                <span>0</span>
                <span>25,000</span>
                <span>50,000+</span>
              </div>
            </div>

            {/* AI Calls Control */}
            <div className="site-calc-group">
              <div className="site-calc-label-row">
                <label htmlFor="calls-slider" className="site-calc-label">
                  <Phone size={16} className="text-forest" />
                  <span>AI Calling Minutes</span>
                </label>
                <div className="site-calc-input-wrap">
                  <input
                    id="calls-input"
                    type="number"
                    min={0}
                    max={20000}
                    value={calls}
                    onChange={(e) =>
                      setCalls(Math.min(20000, Math.max(0, Number(e.target.value) || 0)))
                    }
                    className="site-calc-num-input"
                    aria-label="AI calling minutes quantity"
                  />
                  <span className="site-calc-unit">mins</span>
                </div>
              </div>
              <input
                id="calls-slider"
                type="range"
                min={0}
                max={5000}
                step={50}
                value={calls}
                onChange={(e) => setCalls(Number(e.target.value))}
                className="site-calc-slider calls-accent"
                aria-label="AI calling minutes slider"
              />
              <div className="site-calc-slider-scale">
                <span>0</span>
                <span>2,500</span>
                <span>5,000+</span>
              </div>
            </div>

            {/* Total Credits Display */}
            <div className="site-calc-total-card">
              <div className="site-calc-total-left">
                <span className="site-calc-total-label">REQUIRED SAMPLE CREDITS</span>
                <strong className="site-calc-total-value" aria-live="polite">
                  {Math.round(wa + emails + calls * 5).toLocaleString("en-IN")}
                </strong>
                <span className="site-calc-total-sub">
                  Calculated as: {wa.toLocaleString()} WA + {emails.toLocaleString()} Email + {(calls * 5).toLocaleString()} Call credits
                </span>
              </div>
              <Link href="/contact" className="site-calc-discuss-btn">
                <span>Plan This Volume</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Comparison Matrix Toggle & Table */}
        <section className="site-matrix-section">
          <div className="site-matrix-toggle-wrap">
            <button
              type="button"
              className="site-matrix-toggle-btn"
              onClick={() => setShowMatrix(!showMatrix)}
              aria-expanded={showMatrix}
            >
              <span>{showMatrix ? "Hide Detailed Feature Comparison" : "Compare All Features Side-by-Side"}</span>
              {showMatrix ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>

          {showMatrix && (
            <div className="site-matrix-table-container">
              <table className="site-matrix-table">
                <thead>
                  <tr>
                    <th className="site-th-feature">Capabilities & Modules</th>
                    <th className="site-th-plan">Connect</th>
                    <th className="site-th-plan featured-th">Grow (Popular)</th>
                    <th className="site-th-plan">Scale</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixCategories.map((group, gIdx) => (
                    <tr key={gIdx} className="site-matrix-category-group">
                      <td colSpan={4} className="site-matrix-category-header">
                        {group.category}
                      </td>
                    </tr>
                  ))}
                  {matrixCategories.flatMap((group) =>
                    group.features.map((feat, fIdx) => (
                      <tr key={feat.name + fIdx} className="site-matrix-row">
                        <td className="site-td-feature">{feat.name}</td>
                        <td className="site-td-val">{feat.connect}</td>
                        <td className="site-td-val featured-td">{feat.grow}</td>
                        <td className="site-td-val">{feat.scale}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      {/* Expanded FAQ Accordion with Large Crisp Fonts */}
      <FAQ
        items={[
          [
            "Which Sprint plan is right for my team?",
            "The Connect plan is ideal for teams focused on high-touch WhatsApp marketing and customer support with official Cloud API compliance. Grow is our most popular tier, purpose-built for growing businesses wanting both WhatsApp and autonomous AI Voice Calling in Hindi and English with multi-channel sequences. Scale is designed for established businesses requiring high volumes, custom segmentation rules, and dedicated onboarding.",
          ],
          [
            "Do the monthly prices include GST?",
            "No. All plan prices displayed on the website are exclusive of GST. Applicable taxes (18% GST) will be itemized transparently on tax invoices at checkout.",
          ],
          [
            "Are AI calling minutes and WhatsApp conversation charges included?",
            "The subscription fee covers platform access, server infrastructure, sequence builders, and team inbox seats. Usage credits for WhatsApp messages, emails, and AI voice call minutes are drawn on-demand from your prepaid credit wallet. This keeps your costs 100% transparent with zero unexpected overages.",
          ],
          [
            "Can I still use my phone number in the consumer WhatsApp app?",
            "No. Once a phone number is registered with the official WhatsApp Business Cloud API, Meta does not permit the same number to run simultaneously on consumer or regular WhatsApp Business smartphone apps. Instead, you and your entire team manage chats, broadcasts, and automated flows seamlessly through Sprint’s web dashboard or upcoming mobile app with full conversation history and audit logs.",
          ],
          [
            "Can I connect my own domain for email outreach?",
            "Yes. You can connect your existing Gmail, Google Workspace, or Zoho mailboxes using standard secure OAuth/SMTP authentication. All emails send from your verified domain to maintain maximum deliverability and customer trust.",
          ],
          [
            "Can I upgrade or customize capacity later?",
            "Yes, absolutely. You can upgrade from Connect to Grow or Scale at any time. Your settings, contact segments, sequences, and unused prepaid credits roll over automatically.",
          ],
          [
            "Can I purchase a subscription or credits today?",
            "Not yet. Sprint is currently in an interactive preview and qualification phase. Commercial checkout will open as soon as payment gateway approvals, provider acceptance tests, and regulatory clearances are completed.",
          ],
        ]}
      />

      {/* Luxury Dark Forest Emerald CTA */}
      <CTA
        title="Find the right fit for your next chapter."
        description="Start with your team, your channels, and the conversations you want to build. Our product team is here to help you configure the ideal setup."
      />
    </div>
  );
}
