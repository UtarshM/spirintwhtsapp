# Product PRD implementation tracker

Source: the user-supplied **Rapid Sales: Product Requirements Document**, v1.0, 25 October 2026. This is the requirements baseline for Sprint, not a claim about Rapid Sales' backend. Updated 26 October 2026.

User decisions override unresolved questions in that document: use **Supabase**; customers connect their **own Plivo accounts and owned numbers**; host on **AWS** after the domain is purchased. The PRD's Sarvam speech path is now implemented alongside the earlier Cartesia option. Sales pipeline/CRM boards remain deliberately out of scope.

“Implemented” below means code exists with local tests, not that production/provider acceptance has passed. `/dashboard` is sample data. Many `/account` workflows are saved planning documents; they are not live channel execution.

| PRD section | Current implementation | Remaining requirements |
| --- | --- | --- |
| 6.1 Accounts | Supabase auth, workspace membership, invitations, role checks, administrator MFA, KMS token storage and tenant tests | Hosted auth/RLS acceptance; customer API keys; complete export/deletion and operations audit UI |
| 6.2 Contacts/leads | Normalized contact APIs; draft segmentation, CSV mapping/error review; real inbound WhatsApp contact creation without granting consent | Per-channel consent source/time records; normalized bulk CSV ingestion and rule segments; Lead Ads, Sheets, forms and public authenticated/signed ingestion |
| 6.3 Content | Draft email/WhatsApp templates; normalized per-agent script, knowledge, qualification questions and ending rules | Reusable call-script library; live AI template generation and Meta rejection checks |
| 6.4 WhatsApp | Signed storage and atomic inbound/status normalization, normalized provider inbox read/assignment/takeover, early/monotonic receipts | Embedded Signup and token/asset validation, template submission/approval/rejection, actual outbox sending, 24-hour reply enforcement, media retrieval, quality/limit controls and AI replies |
| 6.5 Email | Gmail/Zoho OAuth and transport adapters; draft mailbox/thread UI | Durable refresh/send/reply ingestion, inbox caps, unsubscribe/bounce/complaint suppression, SMTP/SES outreach, DNS checks and tracking |
| 6.6 Voice | Customer Plivo verification/encrypted connection, saved agents/hours, gated single-contact calls, transcript turns, provider CDR validation, independent AI usage; Sarvam STT/LLM plus streaming Bulbul v3 or Cartesia; voice/speed controls for Sarvam, questions/end rules, interruptions, stop/opt-out; warm handoff XML with summary whisper and human acceptance; durable summary/outcome/answer jobs | Real AWS/provider acceptance; normalized bulk/sequence launch and retry rules; private recordings/retention/playback; reusable scripts and audio preview; inbound routing, additional language/code-mix acceptance, monitoring/contact-center supervision |
| 6.7 Sequences | Local step snapshots/conditions/waits/exits; normalized enrollments/outbox and real incoming-message stop rules. Real caller transcript turns now stop pending outreach and write a reply event transactionally | Durable scheduler/executor, segment/lead enrollment, contact timezone and cross-channel caps, booking/bounce exits, branching and visual published flows |
| 6.8 Inbox/timeline | Normalized WhatsApp messages/receipts/assignment and voice timeline events; call analyses add `voice.analyzed` and `lead.hot` events | Complete email/voice/chat timeline UI, notes/canned replies, private attachments, in-app notification delivery, realtime and channel alerts. A hot-lead event is not an external alert. |
| 6.9 Booking | Availability/overlap/reminder planning | Google/Outlook connections and busy slots, actual booking/reschedule tools, invites and delivered reminders |
| 6.10 Shopify | No live implementation | Merchant OAuth, verified order/checkout webhooks, COD decisions/store updates and abandoned-cart orchestration |
| 6.11 Analytics | Sample activity reports; normalized WhatsApp events; latest-100 normalized voice metrics and separate Plivo/AI runtime | Production campaign attribution, unified channel delivery/reply/booking/team metrics, costs/margins and exports |
| 6.12 Billing | Credit reservations/settlement/capture and replay/concurrency tests; gated pricing/order/rate reads | Approved commercial catalog, working checkout/subscriptions/top-ups, refunds/reconciliation/GST invoices and low-balance notifications |
| 6.13 Admin | Server-side acceptance/configuration, audit events and bounded retry/manual states | Restricted operator console, workspace suspension/restoration, abuse review and failed-job replay |
| 7 Voice pipeline | Direct Plivo → Sarvam realtime STT → structured Sarvam response → progressive Bulbul 8 kHz mu-law playback; barge-in aborts synthesis and clears playback | LLM token streaming/earlier sentence synthesis; measured latency/quality targets, noise/code-mix testing, full recording pipeline. No one-second latency claim. |
| 12–13 Operations/privacy | Voice ECS/ALB/KMS module, CI and local tenant/security tests; production execution gates | Container execution/hosting, scheduled workers, alarms, restore/load tests, retention/deletion, reviewed terms/privacy/consent/calling requirements and provider acceptance |

## This implementation pass

Migration `0007_voice_prd.sql` adds speech and qualification controls, private handoff metadata, summary/outcome fields, a server-only analysis queue with leases/backoff/five-attempt failure states, and transactional stop-on-voice-reply behavior. Old voice acceptance is invalidated because the speech/handoff contract changed.

New agents default to Sarvam in the authenticated builder. Existing agents retain Cartesia. Only Sarvam agents expose the Bulbul voice/speed controls; incompatible Cartesia speed settings are rejected. Sarvam agents do not require Cartesia keys. The AWS module injects optional Cartesia secrets only when `cartesia_enabled=true`.

Warm handoff closes the AI meter, saves an English AI summary, redirects the active call, reads a bounded summary to the teammate and requires **1** to connect. Signed callbacks and an expiring call-specific capability protect the whisper. Caller/transfer numbers come from server snapshots. This is an assisted telephone handoff; it is not a three-party conference with a supervising agent. Busy/no acceptance ends with a fallback message. Real bridging, prompt timing, failover and B-leg charging still need Plivo acceptance. Direct transfer remains an explicit agent option.

Completed/rejected calls queue one analysis job. `npm run voice:analyze` processes a bounded batch only while calling is enabled, Sarvam is configured and the workspace has enabled settings plus unexpired voice acceptance; no scheduler is deployed. Empty/unanswered calls use deterministic results, without an LLM request. Generated outcomes never overwrite consent, provider status, billing or the existing opt-out/handoff outcome. Qualification answers must match the snapshotted questions. AI results are marked for human review in call details. The authenticated Transfers dropdown now shows actual requested handoffs and saved summaries from normalized calls, rather than the planning-only transfer screen. Requested does not mean accepted/bridged.

## Next release work

The first paid release still follows the PRD's WhatsApp-first plan: implement official connection/templates and a durable, gated send engine, then prove send → receipt → reply → stop in staging. Email/scheduler/lead capture, remaining voice/booking features, billing, deployment and acceptance remain required. This pass does not establish complete PRD parity.
