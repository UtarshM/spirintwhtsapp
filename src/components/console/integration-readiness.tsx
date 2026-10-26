"use client";
import { useEffect, useState } from "react";
import type { AccountIdentity } from "@/lib/workspace-document";
import { Panel, Badge } from "./ui";
const integrations = [
  [
    "meta",
    "WhatsApp",
    "Incoming conversations, message status history and stop-on-reply handling.",
    "Connect your business number, synchronize approved templates and validate broadcast delivery.",
    "wa-provider-inbox",
  ],
  [
    "gmail",
    "Gmail",
    "Secure authorization flow, sender preferences and template drafts.",
    "Verify sender access, synchronize replies, set sending limits and test delivery.",
    "email-setup",
  ],
  [
    "zoho",
    "Zoho Mail",
    "Authorization flow, datacenter selection and sender preferences.",
    "Verify senders and reconnection, synchronize replies and test delivery.",
    "email-setup",
  ],
  [
    "plivo",
    "AI calling",
    "Account agents, secure call controls, speech recognition, AI responses, spoken replies and transcripts.",
    "Deploy the calling service to AWS, configure an approved number and pass live conversation, interruption, transfer and settlement tests.",
    "voice-connected",
  ],
  [
    "razorpay",
    "Billing",
    "Plans, sample credit previews and billing history screens.",
    "Complete subscriptions, top-ups, refunds, tax invoices and payment tests.",
    "billing",
  ],
  [
    "calendar",
    "Calendar",
    "Availability rules, conflict checks, appointment and reminder drafts.",
    "Google/Outlook authorization, slot synchronization, confirmed invites and delivered reminders.",
    "availability",
  ],
  [
    "leads",
    "Lead capture",
    "CSV mapping/deduplication, segments, source drafts and payload tests.",
    "Connect Lead Ads, forms, webhooks and Sheets; validate consent and automatic follow-up.",
    "sources",
  ],
  [
    "shopify",
    "Shopify",
    "No integration is implemented.",
    "Connect a store, verify COD orders and test cart recovery and order updates.",
    "sources",
  ],
];
export default function IntegrationReadiness({
  account,
  navigate,
}: {
  account?: AccountIdentity;
  navigate: (id: string) => void;
}) {
  const [records, setRecords] = useState<
      { provider: string; status: string }[]
    >([]),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!account) return;
    const controller = new AbortController();
    void fetch("/api/integrations/status", {
      cache: "no-store",
      headers: { "x-workspace-id": account.workspaceId },
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw Error(
            result.error?.message || "Integration records unavailable.",
          );
        setRecords(result.integrations);
        setLoaded(true);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [account?.workspaceId]);
  return (
    <Panel
      title="Integrations & completion status"
      description="Review account connections and remaining setup for each channel."
    >
      {error && (
        <div className="console-error" role="alert">
          {error}
        </div>
      )}
      <div className="console-ai-box" style={{ marginBottom: "20px" }}>
        <div className="console-ai-header">
          <span className="console-ai-title">
            🤖 Central AI Engine: Included & Active
          </span>
          <span className="console-ai-hint">
            Powered by AWS Bedrock (Claude) · Zero setup required for tenants
          </span>
        </div>
        <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#334155", lineHeight: 1.6 }}>
          All generative AI intelligence, template copywriting, WhatsApp inbound agent reasoning, and post-call analytics are built-in and operated by Sprint. You only need to connect your three communication channels below (<strong>WhatsApp</strong>, <strong>Plivo Calling</strong>, and <strong>Email</strong>) to manage all sales and support operations from this dashboard.
        </p>
      </div>
      <div className="console-card-grid">
        {integrations.map(([key, title, foundation, missing, target]) => (
          <article className="console-mini-card" key={key}>
            <Badge>
              {account
                ? loaded
                  ? records.some((r) => r.provider === key)
                    ? `Authorization: ${records.find((r) => r.provider === key)?.status}`
                    : "No authorization recorded"
                  : error
                    ? "Status unavailable"
                    : "Checking account records"
                : "Sign in to check account status"}
            </Badge>
            <h3>{title}</h3>
            <p>
              <strong>Available in this build</strong>
              <br />
              {foundation}
            </p>
            <p>
              <strong>Required for live use</strong>
              <br />
              {missing}
            </p>
            <button className="secondary" onClick={() => navigate(target)}>
              Review {title}
            </button>
          </article>
        ))}
      </div>
      <p>
        No live sends, calls or checkout are enabled. Connecting credentials
        alone does not complete the acceptance tests.
      </p>
    </Panel>
  );
}
