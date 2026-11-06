"use client";
import { useEffect, useState } from "react";
import type { AccountIdentity } from "@/lib/workspace-document";
import { Panel, Badge } from "./ui";
import ConnectionControls from "./connection-controls";
import type { IntegrationConfig } from "@/lib/integration-config";
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
    [loaded, setLoaded] = useState(false),
    [configuration, setConfiguration] = useState<IntegrationConfig[]>([]),
    [aiConfigured, setAiConfigured] = useState(false),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!account) return;
    setLoaded(false);
    setError("");
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
        setConfiguration(result.configuration || []);
        setAiConfigured(Boolean(result.ai?.configured));
        setLoaded(true);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [account?.workspaceId, refresh]);
  return (
    <Panel
      title="Integrations & completion status"
      description="Review account connections and remaining setup for each channel."
      action={
        account ? (
          <button
            className="secondary"
            onClick={() => setRefresh((v) => v + 1)}
          >
            Refresh status
          </button>
        ) : (
          <a className="secondary" href="/account#integrations">
            Sign in to connect accounts
          </a>
        )
      }
    >
      {error && (
        <div className="console-error" role="alert">
          {error}
        </div>
      )}
      <div className="console-ai-box" style={{ marginBottom: "20px" }}>
        <div className="console-ai-header">
          <span className="console-ai-title">Central AI service</span>
          <Badge>
            {loaded
              ? aiConfigured
                ? "Configured · Provider access unverified"
                : "Server setup required"
              : account
                ? "Status unavailable until loaded"
                : "Sign in to check configuration"}
          </Badge>
        </div>
        <p>
          AI configuration is managed by Sprint. Configuration does not
          establish that model access, usage limits or provider acceptance
          checks have passed.
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
            {account && configuration.find((c) => c.provider === key) && (
              <ConnectionControls
                account={account}
                config={configuration.find((c) => c.provider === key)!}
              />
            )}
            {loaded &&
              configuration.find((c) => c.provider === key)?.implemented ===
                false && (
                <p className="integration-config-note">
                  Live account connection is not implemented for this module
                  yet.
                </p>
              )}
            <button className="secondary" onClick={() => navigate(target)}>
              Review {title}
            </button>
          </article>
        ))}
      </div>
      <p>
        Authorization does not enable live sends, calls or checkout. Connecting
        credentials alone does not complete the acceptance tests.
      </p>
    </Panel>
  );
}
