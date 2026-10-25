# Release status

## Verified locally

- TypeScript strict checks and optimized Next.js build.
- Seven unit tests: quoted CSV handling/validation/deduplication, webhook signatures, sending windows/DST, suppression, reservation accounting, MIME header injection prevention.
- Real PostgreSQL migration application and regression checks: cross-tenant reads, forbidden writes/RPC access, capture replay, settlement replay/conflicts, immutable ledger, inbound-reply cancellation.
- Two concurrent PostgreSQL credit reservations: exactly one succeeds when their combined amount exceeds balance.
- Browser: overview rendering, contact dialog and local persistence, sample-only messaging boundaries.

## Not verified

- Hosted Supabase auth, OAuth approvals/refresh, provider delivery, email reply synchronization, live calls or transfers, production payments, AWS resources, load/restore tests, mobile device testing, or Terraform validation. No external credentials or deployment were available.

## Next implementation gates, in order

1. Finish the authenticated dashboard using the existing tenant APIs; add server-persisted UI for inbox, sequence editor, settings, agent management and team invitations. Add database integration CI.
2. Add resource updates, campaign recipient snapshots, transactional enrollment/outbox creation, safe worker leasing/recovery, provider-specific rate enforcement, reconciliation, and stop-on-reply race tests. The current consumer is fail-closed and sends nothing.
3. Complete Meta embedded onboarding, media authorization, template APIs, normalized inbound-contact creation, monotonic status processing, and official webhook acceptance tests.
4. Complete Gmail and Zoho mailbox discovery, send/reply synchronization with pagination/checkpoints, webhook/polling renewal, refresh locking, threading and reconnection tests. Verify Zoho datacenter and scopes.
5. Build the persistent voice service and authenticate Plivo streams. Validate speech/LLM compatibility, interruptions, silence, failure closure, transcripts, private recordings, human transfer and duration-based settlement.
6. Approve commercial prices. Implement a versioned credit catalog, Razorpay orders/subscriptions/top-ups, status reconciliation, audited refunds/adjustments and checkout acceptance tests. Keep checkout disabled until all pass.
7. Complete least-privilege AWS IAM, ECS networking/tasks, EventBridge scheduling, alarm destinations, retention policies and deployment automation. Validate Terraform and staging restore.
8. Add approved legal/help/pricing content, restricted operations tooling, production runbooks, load tests and external security review before public paid launch.

## Defaults

Working name Relay is configurable conceptually and not trademark/domain cleared. Primary timezone Asia/Kolkata, INR billing, business-owned WhatsApp assets, platform-managed voice, Hindi/English launch languages. No Shopify or agencies in this milestone. No automatic wallet top-ups.

## Marketing milestone update

The home route is now the public marketing landing page; the sample application is `/dashboard`. The public site includes feature/solution/integration detail pages, pricing controls and an illustrative usage calculator, contact/walkthrough local drafts, blog and help content, comparison guides, about/security/roadmap pages, illustrative use cases, and legal drafts. `/website` redirects to `/`.

A production-build crawl verified 52 linked pages return 200, with titles and a single h1; invalid feature, solution and blog slugs return 404. Browser checks verified annual pricing updates, calculator changes, FAQ expansion, plan-prefilled enquiry routing, and local enquiry-draft saving. Pricing remains indicative, legal content remains draft, and forms do not transmit externally.

Dashboard completion is the next priority. See RAPIDSALES_FEATURE_AUDIT.md for observed reference gaps. The local workspace store scaffolding in this milestone is not yet wired into the dashboard; do not present it as completed product functionality.

Final marketing verification: clean production build and its TypeScript check passed, all seven unit tests passed, and the built site was opened in the browser. The local production preview is served on port 3000. The original dependency/cache directories were retained as ignored local backups after resolving stalled reads.

## WhatsApp verification assistance

Added a public `/whatsapp-verification` preparation guide and interactive checklist, linked from dashboard Integrations, the footer, and pricing feature copy. The checklist is transient and never reports eligibility, approval, or submission. Official Meta links explain separate account routes; no verification documents or credentials are collected. Meta decides badge approval; Meta Verified subscriptions are separate from Sprint pricing. Live account eligibility checks, provider-backed status tracking, and assisted submissions remain deferred until official onboarding and acceptance tests.

## AiSensy verification flow review — 25 October 2026

Read-only review of the logged-in dashboard showed API setup, business verification/KYC, profile setup, and a separately gated blue tick application. The application action was disabled while prerequisites were pending; no application form or submission was accessible. AiSensy pricing describes an application on behalf of the customer, subject to Meta approval: https://aisensy.com/pricing/. No account changes or external submissions were performed.

Sprint now provides a four-stage setup preview and validated, restorable local application drafts containing public business information and up to three public reference URLs. Manual navigation/checklists cannot change provider statuses or enable submission. No KYC documents, identity numbers, passwords, or provider keys are requested. This is UI preparation, not a working Meta application service. Future authenticated implementation needs tenant-scoped storage, official account onboarding, provider-confirmed prerequisite statuses, authorized application/support routing and audited status updates.

Verification access correction: interactive setup and drafts now live at `/account/whatsapp-verification`, guarded server-side by a verified Supabase user and workspace membership. Public verification page contains explanation and a sign-in link only. Local draft keys are scoped to user/workspace; prior anonymous sample drafts are not imported. No live Meta submission is enabled by signing in.

## Outreach-only scope correction — 25 October 2026

Removed the extra sales pipeline board/navigation and CRM/pipeline marketing positioning at the user's request. Contacts, segmentation, qualification and handoff remain in scope. Shared sales-growth branding replaces waveform logo marks. See OUTREACH_FEATURE_GAP_AUDIT.md for current reference evidence, limitations and prioritized missing work. Existing storage/database fields are retained; no destructive schema changes were made.

## Channel-console milestone — 25 October 2026

The `/dashboard` route now uses `src/components/console` with expandable Contacts, Campaigns, AI Calling, WhatsApp and Email groups. It is still explicitly a local sample workspace, separate from authenticated `/account`; no live capabilities have been enabled.

Implemented local workflows:

- Unified, validated workspace persistence; compatible default fields for prior workspace backups, legacy contact migration, export/import review, raw recovery export and explicit reset. Invalid stored workspaces block ordinary writes instead of silently overwriting the stored file.
- Contact create/edit/details, consent/opt-out, CSV validation/import review and safe filtered export; rule-based saved segments, qualified-lead view, owner/notes and activity timeline; follow-up task creation/editing/completion.
- Campaign drafts and recipient snapshots, channel content selection, eligibility and cost review, local schedule intent, pause/resume/cancel, duplication, one-time simulation, linked messages/activity/credits. Schedules never run in the background.
- Template editing, personalization preview, variables, category and media/CTA draft metadata. Ready is local readiness, never Meta approval. Campaign text simulations do not deliver rich content.
- Separate WhatsApp/email inboxes, persisted composer drafts, local reply records, assignment, open/closed states, bounded sample attachments, explicit incoming-reply simulations and opt-out. Incoming replies reopen local threads and suppress pending simulation outreach.
- Sequence step editor, reorder/remove, saved step snapshots, per-contact local runs, explicit delays/preview-clock advancement, consent/qualification conditions, human handoff and replay-safe channel simulation.
- Voice agent instructions/knowledge/qualification/language/voice/limits, deterministic scripted preview, selected qualification outcomes, minute-rounded sample-credit usage, logs and transcript export. These are not LLM conversations or real calls.
- IVR routing drafts and digit tests, transfer-request drafts, local appointments with overlap checks. No phone transfer or external calendar booking occurs.
- Chatbot node editor (reply/contains/handoff), deterministic flow testing and local handoff tasks; WhatsApp AI-agent instruction/knowledge drafts with explicitly labelled keyword retrieval rather than simulated AI claims.
- Form drafts and local lead capture tests, lead-source/ad configuration drafts and sample JSON ingestion with duplicate/consent validation; local product catalog drafts. No external ads, Meta Flows, catalog synchronization, payments or lead sync are active.
- Working WhatsApp chat-link/QR generation and downloadable website-button HTML, using local qrcode encoding (no external QR service).
- Channel-specific sender/identity drafts, sending-window preferences, sample team/invitation roster, sample-credit ledger/top-ups/exports, disabled subscription checkout, current-activity analytics and sequence reports. Team drafts do not grant real access or send invitations.
- Verification remains server-gated behind account login and workspace membership. The public sample only links to that protected route.

Validation: 21 unit tests cover existing CSV/security/accounting plus campaign replay/suppression, sequence waits/snapshots/handoffs, call-credit rounding, booking conflicts, audience rules, backup references/windows, QR link encoding, template-subject validation and attachment backup validation. TypeScript and optimized build passed. Browser exercised dropdown navigation, agent creation and reload persistence, a scripted preview/credit change, campaign consent filtering and simulation-to-inbox activity, local/incoming replies, and link/QR generation.

Still deferred: live provider delivery, hosted auth/database acceptance, real bot/LLM execution, external integrations and DNS checks, background scheduling, phone/media streaming, private recordings, real calendar sync, actual ads/commerce/payment execution, native mobile apps, production role enforcement throughout the new modules, and production deployment. Rich carousel/media template APIs and full sender-specific mailbox threading also need provider work. Do not describe local screens or draft records as completed production parity.

## Rich templates, email conversations and imports — 25 October 2026

- WhatsApp template drafts now support media references, URL/quick-reply/phone button types and up to ten local carousel preview cards. Personalization covers card content and action labels. URL, phone and supported-variable validation runs before saving or simulating. Media is displayed as a reference without fetching external assets; preview actions are inert. Provider limits and approval still require integration acceptance.
- Campaign simulations preserve a personalized rich-content snapshot per recipient. Later edits to the source template do not change historical inbox content. Campaign review shows the saved simulation content after completion.
- Email conversations now have independent subject and sender-draft context, mailbox and status filters, local thread creation and replies. Legacy unthreaded sample messages stay in their original conversation. Incoming-reply simulations reopen only the selected conversation. Email campaign and sequence drafts can select an available local sender draft; no mailbox is connected or synchronized.
- CSV imports now offer source-column mapping, a three-row preview, required/duplicate mapping checks and the existing validation/deduplication review. Consent still requires an explicit true value. Saved audience segment rules can be edited without changing existing campaign recipient snapshots.

Validation: all 34 unit tests passed, including rich snapshot immutability, unsafe actions/variables, archived senders, email conversation isolation and backup references, long-subject replies, WhatsApp conversation reuse, reordered/quoted CSV columns and explicit consent. TypeScript and optimized Next.js build passed. Browser checks created and saved a personalized carousel, created a second email subject for an existing contact, saved a local reply, and confirmed the original conversation retained only its own history.

This milestone remains local preview functionality. Hosted authentication/database integration, real provider sends and reply sync, background processing, live AI/calls and checkout are unchanged and disabled pending the release gates above.
