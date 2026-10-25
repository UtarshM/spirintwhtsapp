# Integration audit — 25 October 2026

This checks repository code, not only the README. The supplied comparison contains public marketing claims about Rapid Sales, not verified access to its backend. No relative claim about either product's security or production reliability can be established from public pages.

## Findings corrected from the supplied audit

- Marketing and SEO pages already exist: home, features, solutions, comparisons, blog, help, pricing and legal drafts (`src/app`, `src/lib/marketing/content.ts`). A new homepage is not the missing integration work.
- Sales pipeline navigation was deliberately removed. Do not reintroduce it from the pasted audit.
- The full console now lives behind `/account`; `/dashboard` remains the separate sample. Twelve requested area dropdowns exist (`src/components/console/navigation.ts`).
- Segments, advanced filters, CSV mapping, timelines, inbox drafts, assignment UI, bot/sequence builders, agents, booking availability and reminder drafts exist. They do not establish live provider behavior.
- Stop-on-reply exists both in local simulations and the normalized SQL message trigger (`stop_contact_outreach` in migration 0001). The missing part was reliable real-event ingestion and production job execution, not the absence of an exit rule.
- OAuth, KMS, webhook signatures and payment capture have implementation/tests; hosted/provider acceptance is unverified. Calling them fully working integrations would overstate the evidence.

## Current integration matrix

| Area | Code evidence / current behavior | Remaining integration work / acceptance |
| --- | --- | --- |
| WhatsApp connect | Preparation UI; integration and encrypted-secret schema; unique mapped business numbers | Embedded Signup, app/asset ownership validation, encrypted Meta credentials, subscription and registration acceptance. A local setup draft never creates a connection. |
| WhatsApp templates/send | Rich draft editor; limited template transport adapter in `src/lib/providers.ts`; consumer deliberately fails closed | Tenant template sync/submission/status/rejection; rich payload compatibility; transactional audience/outbox, reservations, rate/quality limits, retry/reconciliation and real approved-template delivery. |
| WhatsApp incoming/status | `src/lib/meta-events.ts`, `services/worker/meta-events.ts`, migration 0004: atomic contacts/conversations/messages, duplicate protection, inbound time, media reference, monotonic and early receipts, safe retries | Run scheduler against a configured staging project; actual signed Meta callbacks; authorized media retrieval; template/quality/limit events and health-driven pauses. Other webhook fields are explicitly recorded as unsupported. |
| Provider inbox/timeline | `/api/channels/whatsapp`: tenant read history, stable message cursors, real assignments and audited takeover; `ProviderInbox` separate from draft inbox | Hosted session/role acceptance, private attachments, sent replies, internal notes/canned replies, realtime and provider-backed health. It does not fabricate events from simulations. |
| Email | OAuth connect/callback, KMS tokens, Gmail/Zoho transport adapters; draft sender/topic isolation | Account/identity discovery, refresh locks, reconnection, send caps/windows, bounce/complaint/unsubscribe state, checkpointed reply ingestion, tracking with privacy controls, end-to-end tests. SMTP/SES customer outreach is not implemented. |
| AI voice | Agent configuration and deterministic call previews; call/transcript model and runtime specification | Number/destination approval, signed telephony events, authenticated media service, STT/LLM/TTS, interruptions, duration settlement, private recordings and live warm transfer. No live speech service exists. |
| Automation | Local sequence snapshots/waits/exits and SQL enrollments/outbox; reply and takeover suppression | Durable scheduler, published normalized steps, atomic enrollment and jobs, leasing/recovery, cross-channel frequency caps and race/reconciliation tests. No unattended sequence execution is available. |
| Lead capture | CSV field mapping/errors/deduplication, audience rules, source/form drafts and explicit sample payload ingestion; inbound WhatsApp contact creation | Authenticated/signed Lead Ads/Sheets/forms/public ingestion; consent source/time; checkpoints, deduplication across sources and durable segment-entry triggers. Incoming WhatsApp contact creation does not imply marketing permission. |
| Booking | Workspace availability/timezone rules, overlap checks, appointments, reminder drafts and one-time review tasks | Google/Outlook OAuth, remote busy slots, natural-language slot tools, confirmed external bookings, delivered confirmations/reminders and rescheduling. |
| Billing | Approved-rate/order reads; credit reservation/settlement and capture replay tests; indicative platform prices | Server-owned catalog, checkout/subscriptions/top-ups, reconciliation, audited refunds, taxes/GST invoices and live test-mode acceptance before activation. No sample balance creates money or invoices. |
| Reporting | Local activity/usage reports; normalized WhatsApp events and receipt timeline | Unified production campaign attribution, delivery/reply/conversion/team response metrics, provider cost reconciliation and real metering. No sample chart is a live metric. |
| Shopify | No app, webhook or order-update implementation | Scope deferred: OAuth, webhook verification, order/checkout ingestion, COD decisions, cart timers, store updates and merchant acceptance. No Shopify parity claimed. |
| Operations/trust | App checks; database migration/regression CI; partial AWS definitions; legal draft pages | Deployable worker/audio/scheduler services, least-privilege runtime roles, alert destinations, staging restore/load tests, support operations, incident process and legal review. |

## Changes in this integration pass

1. Replaced non-transactional Meta event processing, which could fail on an unknown contact or regress a message status. All actions in one stored event commit together or roll back.
2. Added durable receipts keyed independently of the outbound message row; insertion of that row reconciles earlier receipts. Status history is retained even when its latest state stays read/delivered.
3. Preserved explicit consent and signed-event mapping boundaries. Incoming user activity stops pending normalized outreach; unsupported system/provider fields are reported without pretending they were integrated.
4. Added retries/backoff without logging message text or tokens. Individual bad events do not prevent later batch items from running. No provider send path was activated.
5. Added a genuine provider conversation read/assignment API and UI, separate from draft/localStorage history. Agents can claim unassigned conversations/manage their own; administrator assignment changes require MFA. Cross-workspace assignees and stealing another agent's conversation are denied.
6. Added an integration completion view which reads authorization records and lists missing capabilities. OAuth authorization is not labelled as a passed health/delivery test.
7. Rewrote stale README claims and added PostgreSQL regression checks to CI.

## Acceptance plan — remaining order

1. Apply all migrations in staging; verify hosted auth/MFA/tenant APIs and back up/restore the database.
2. Finish Meta Embedded Signup/ownership/token flow and template management. Use a business-owned staging/test number and explicit opt-in contacts.
3. Build transactional campaign launch/outbox/reservations, leasing, limits and the gated send executor. Test replies/opt-outs/handoffs racing a send, provider timeouts, duplicate delivery attempts and reconciliation.
4. Demonstrate connect → approve → send → inbound reply → stop pending steps → delivery/read timeline with real Meta callbacks. Only then approve the channel for activation.
5. Add durable automation/lead-source connectors and production event reporting; implement billing test-mode reconciliation before paid checkout.
6. Finish email identity/delivery/reply synchronization; then voice, external booking and any explicitly selected commerce scope.

## Reference evidence

- Rapid Sales WhatsApp public feature page: https://www.rapidsales.ai/features/whatsapp-automation (read 25 October 2026). Describes campaigns/templates/inbox/official API positioning; does not prove backend behavior.
- Meta-maintained WhatsApp Business Platform collection: https://www.postman.com/meta/whatsapp-business-platform/overview and its webhook payload references (read 25 October 2026). Used for inbound/status payload structure. Official developer pages were rate-limited/unavailable during this pass; no undocumented onboarding behavior was assumed.
- Failed message status example: https://www.postman.com/meta/whatsapp-business-platform/request/ocsmpai/status-message-failed
- Previous UI/reference audit: OUTREACH_FEATURE_GAP_AUDIT.md. Validation history: RELEASE_STATUS.md.
