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
    "Agent drafts, scripted previews and call-data foundations.",
    "Connect an approved number and speech services; test conversations, recordings and transfer.",
    "agents",
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
