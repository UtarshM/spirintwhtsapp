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
| AI voice | Workspace-owned Plivo connection/verified caller selection and KMS-encrypted token storage; normalized account agents/hours/calls/transcripts API and UI; migrations 0005/0006 atomic preparation/credit reservation and immutable connection binding; signed Plivo callbacks and one-time media claims; persistent Sarvam STT/LLM → Cartesia TTS, interruption/silence/opt-out controls, cold-transfer code, independent AI-runtime metering and direct-CDR reconciliation | Public HTTPS/WSS domain, AWS/container deployment, credentials/approved numbers/rates/destinations and live acceptance. Private recordings, bulk/sequence calling, separate scripts, voice selection/preview, advanced outcomes, real booking tools and full inbound routing remain missing. Cold transfer is not warm transfer. |
| Automation | Local sequence snapshots/waits/exits and SQL enrollments/outbox; reply and takeover suppression | Durable scheduler, published normalized steps, atomic enrollment and jobs, leasing/recovery, cross-channel frequency caps and race/reconciliation tests. No unattended sequence execution is available. |
| Lead capture | CSV field mapping/errors/deduplication, audience rules, source/form drafts and explicit sample payload ingestion; inbound WhatsApp contact creation | Authenticated/signed Lead Ads/Sheets/forms/public ingestion; consent source/time; checkpoints, deduplication across sources and durable segment-entry triggers. Incoming WhatsApp contact creation does not imply marketing permission. |
| Booking | Workspace availability/timezone rules, overlap checks, appointments, reminder drafts and one-time review tasks | Google/Outlook OAuth, remote busy slots, natural-language slot tools, confirmed external bookings, delivered confirmations/reminders and rescheduling. |
| Billing | Approved-rate/order reads; credit reservation/settlement and capture replay tests; indicative platform prices | Server-owned catalog, checkout/subscriptions/top-ups, reconciliation, audited refunds, taxes/GST invoices and live test-mode acceptance before activation. No sample balance creates money or invoices. |
| Reporting | Local activity/usage reports; normalized WhatsApp events and receipt timeline | Unified production campaign attribution, delivery/reply/conversion/team response metrics, provider cost reconciliation and real metering. No sample chart is a live metric. |
| Shopify | No app, webhook or order-update implementation | Scope deferred: OAuth, webhook verification, order/checkout ingestion, COD decisions, cart timers, store updates and merchant acceptance. No Shopify parity claimed. |
| Operations/trust | App/database CI including voice regressions; ECS Fargate/ALB voice module, server-only secret injection and container definition; partial shared AWS definitions; legal draft pages | Build/test image, existing VPC/private networking/outbound access, DNS/ACM/secrets/alarm configuration, actual service/scheduler deployment, staging restore/load tests, support operations, incident process and legal review. |

## Changes in this integration pass

1. Replaced non-transactional Meta event processing, which could fail on an unknown contact or regress a message status. All actions in one stored event commit together or roll back.
2. Added durable receipts keyed independently of the outbound message row; insertion of that row reconciles earlier receipts. Status history is retained even when its latest state stays read/delivered.
3. Preserved explicit consent and signed-event mapping boundaries. Incoming user activity stops pending normalized outreach; unsupported system/provider fields are reported without pretending they were integrated.
4. Added retries/backoff without logging message text or tokens. Individual bad events do not prevent later batch items from running. No provider send path was activated.
5. Added a genuine provider conversation read/assignment API and UI, separate from draft/localStorage history. Agents can claim unassigned conversations/manage their own; administrator assignment changes require MFA. Cross-workspace assignees and stealing another agent's conversation are denied.
6. Added an integration completion view which reads authorization records and lists missing capabilities. OAuth authorization is not labelled as a passed health/delivery test.
7. Rewrote stale README claims and added PostgreSQL regression checks to CI.

## AI calling implementation and reference review

The user confirmed Plivo + Sarvam/Cartesia and plans to purchase a domain and host on AWS. The repository now contains a real, gated voice runtime, rather than only its previous specification. It has not been activated; no credentials, domain, deployment or real provider call are available. The account connected-calling screen reads normalized records and never treats browser previews as provider transcripts.

`/api/voice`, `/api/voice/[id]`, `services/voice` and migration `0005_voice_runtime.sql` implement agent/hour persistence, single-contact call preparation, idempotent launch, signed callback binding, expiring single-use media claims, English/Hindi transcription, bounded structured LLM replies, synthesized playback, barge-in, silence/duration/provider-failure closure, immediate opt-out, transcript turns, cold-transfer redirect and reserved-credit settlement. Durable Stop requests cancel queued/ringing calls by Request UUID or active calls by Call UUID; answer/bind/claim honor Stop during launch races. An uncertain dial or stop holds credit for reconciliation and is not automatically redialled. Known completed provider calls use conservative answer/cause-normalized CDR settlement, bounded backoff and a six-attempt limit; manual-review records leave the pending batch to prevent starvation. Unknown provider identifiers remain an operator reconciliation task. A recording key in the old schema is not private recording storage/playback.

Rapid Sales' public AI calling page and published product screenshots were inspected. They show a distinct agent builder (identity, voice, language, gender, speed, preview), a separate Call Scripts area, quick/bulk calling and call-log outcomes. That is more specific evidence than a marketing feature list, but it is still **public evidence**, not a logged-in workflow, inspected backend or tested real call. Sprint's normalized agent has instructions/knowledge/greeting/language/limits; it does not yet match their voice controls, reusable scripts, bulk execution or outcome workflow.

Local evidence for this pass: 68 unit tests including 20 simulated voice/runtime/reconciliation tests; all five migrations applied to fresh PostgreSQL; existing and voice SQL regressions plus concurrent call-launch and one-time stream-claim checks passed. Strict TypeScript and an optimized build have passed during development; final post-edit application checks are recorded in the release log. The anonymous calling screen was checked in the browser; unconfigured `/api/voice` and voice `/healthz` return 503. Hosted authenticated calling UI has not been tested. The voice Terraform module validated with AWS provider 6.70.0. Docker is unavailable locally, so neither image execution nor AWS deployment is claimed. Voice Docker-build and Terraform-validation jobs are configured in CI; successful GitHub execution is not yet verified.

The [voice setup and AWS runbook](../services/voice/README.md) documents configuration, secret injection, private-subnet connectivity, ALB HTTPS/WSS, domain/ACM, deployment boundaries and provider acceptance. Live calling requires shared server configuration, an authenticated workspace Plivo connection, enabled platform/workspace settings and unexpired acceptance evidence. The BYO-Plivo correction below supersedes this milestone’s earlier absence of a customer connection screen; customers cannot self-approve live acceptance. Other channel rows above remain open.

## BYO-Plivo correction — 25 October 2026

The user clarified that each customer connects their own Plivo account. The implementation now accepts Auth ID/token only after login, owner/administrator authorization and MFA. It verifies the provider account and owned voice-enabled numbers with read-only requests, encrypts the token using KMS with workspace/connection/provider context, and offers verified caller selection. The token is never returned or copied into sample/draft storage. There is no platform `PLIVO_AUTH_ID`/`PLIVO_AUTH_TOKEN` fallback.

Each launched call binds permanently to its workspace connection. Launch, signature validation, stop, transfer and CDR reconciliation use that connection’s credentials. Rotation/disconnect are blocked by unfinished calls, including uncertain outcomes that still require reconciliation; disconnect removes the stored encrypted token when safe. Plivo charges the customer’s account for telephony, separately from the platform’s approved AI-credit catalog. Connection success is not live acceptance.

This follow-up still needs real credential/owned-number validation, wrong-account callbacks, token rotation/disconnect behavior, speech/call/transfer acceptance and AWS IAM/deployment checks against staging. No actual customer token or provider call was available. Other channel gaps remain open.

## Acceptance plan — remaining order

1. Apply all migrations in staging; verify hosted auth/MFA/tenant APIs and back up/restore the database.
2. Finish Meta Embedded Signup/ownership/token flow and template management. Use a business-owned staging/test number and explicit opt-in contacts.
3. Build transactional campaign launch/outbox/reservations, leasing, limits and the gated send executor. Test replies/opt-outs/handoffs racing a send, provider timeouts, duplicate delivery attempts and reconciliation.
4. Demonstrate connect → approve → send → inbound reply → stop pending steps → delivery/read timeline with real Meta callbacks. Only then approve the channel for activation.
5. Add durable automation/lead-source connectors and production event reporting; implement billing test-mode reconciliation before paid checkout.
6. Finish email identity/delivery/reply synchronization. Deploy and acceptance-test the implemented voice path with approved staging destinations; then add remaining scripts/bulk/outcomes, external booking and any explicitly selected commerce scope. Voice development in this pass does not mean WhatsApp/email execution has passed acceptance.

## Reference evidence

- Rapid Sales WhatsApp public feature page: https://www.rapidsales.ai/features/whatsapp-automation (read 25 October 2026). Describes campaigns/templates/inbox/official API positioning; does not prove backend behavior.
- Rapid Sales AI calling public feature page: https://www.rapidsales.ai/features/ai-calling-agent and published screenshots https://www.rapidsales.ai/images/ai-calling/agent-builder.png, https://www.rapidsales.ai/images/ai-calling/quick-call.png, https://www.rapidsales.ai/images/ai-calling/call-logs.png (read 25 October 2026). Public interface evidence only; no authenticated provider call or backend was verified.
- Meta-maintained WhatsApp Business Platform collection: https://www.postman.com/meta/whatsapp-business-platform/overview and its webhook payload references (read 25 October 2026). Used for inbound/status payload structure. Official developer pages were rate-limited/unavailable during this pass; no undocumented onboarding behavior was assumed.
- Failed message status example: https://www.postman.com/meta/whatsapp-business-platform/request/ocsmpai/status-message-failed
- Previous UI/reference audit: OUTREACH_FEATURE_GAP_AUDIT.md. Validation history: RELEASE_STATUS.md.


Platform AI billing now uses a service-finalized stream meter, independent of customer-signed callback durations. Hangup and reconciliation read terminal CDRs directly from Plivo and validate call identity/numbers. Missing runtime finalization holds the reservation for manual review; unclaimed calls incur zero AI credits. Local tests cover these boundaries, but deployed restart recovery, real provider invoices and commercial acceptance remain unverified.


## Product PRD alignment — 26 October 2026

The user confirmed the supplied PRD is the product requirements, including its missing features. [PRD_IMPLEMENTATION.md](PRD_IMPLEMENTATION.md) tracks the full scope without confusing saved planning screens with live integrations. This pass adds direct progressive Sarvam Bulbul v3 output, per-agent Sarvam voice/speed and questions/end rules, assisted warm handoff with an English summary whisper plus press-1 confirmation, durable post-call summaries/outcomes/answers, and immediate transactional suppression when real caller speech is saved. Existing Cartesia agents and explicit direct transfer remain supported. The previous voice row's absence of these features is superseded; recordings, reusable scripts, voice preview, bulk/sequence execution, additional language acceptance, calendar tools and live provider acceptance remain open.

Analysis uses a private Supabase queue with leases, bounded retries and failed states. An empty/no-caller transcript gets a deterministic result without an LLM request; AI classifications do not change provider status, opt-out, billing or consent. Analysis writes `voice.analyzed`/`lead.hot` activity, not delivered external notifications. A scheduled analysis task is still required. Migration 0007 invalidates prior voice acceptance because streaming and handoff behavior changed. The other channel rows remain open; complete PRD parity is not claimed.
