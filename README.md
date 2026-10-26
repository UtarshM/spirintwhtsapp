# Sprint by Scalezix

WhatsApp, email and AI calling outreach workspace. **Development build: useful draft workflows and tested backend foundations, not a production-ready multichannel service.** No live messages, calls or checkout are enabled.

## Current status

| Area | Implemented | Still required for live use |
| --- | --- | --- |
| Website | Home, channel/features/solutions, pricing, blog, comparisons, help/FAQ, contact and legal draft pages | Delivered enquiries, real customer case studies, approved legal content |
| Account & navigation | Supabase auth/MFA/roles; full after-login console with 12 area dropdowns | Hosted auth/session acceptance and production permissions across normalized operations |
| Contacts & campaigns | Details, timeline, CSV mapping/deduplication, advanced filters, saved segments, audience review, scheduling intent, pause/cancel/history | Production recipient snapshots, scheduling, leasing, rate limits and campaign execution |
| Shared workspace | Validated server-backed planning document with revision conflicts and tenant checks | Apply migrations; hosted acceptance; normalized provider execution does not consume this document |
| WhatsApp incoming | Signed event storage; atomic contact/conversation/message normalization; opt-in preservation; reply suppression; idempotent delivery receipts; late-receipt reconciliation | Official onboarding, ownership/token checks, template API, outbound worker, quality limits, media download and real Meta acceptance |
| Provider inbox | Tenant-backed WhatsApp history/timeline, pagination, assignments, close/reopen and audited takeover that suppresses pending outreach | Real provider events in staging, reply sending, private attachments, internal notes and realtime acceptance |
| Email | Gmail/Zoho OAuth routes, encrypted tokens and transport adapters; mailbox/template draft UI | Provider acceptance, refresh locking, mailbox discovery, caps, replies/checkpoints, bounce/unsubscribe and tracking |
| Sequences & AI | Sequence/bot editors, explicit simulations, saved runs and reply/opt-out/handoff exits | Durable scheduler, normalized execution, cross-channel frequency caps and live WhatsApp AI; sequences do not launch calls |
| AI calling | Normalized account agents/hours/calls/transcripts; workspace-owned Plivo connection/number selection, gated launch and signed callbacks; persistent Sarvam STT/LLM → Cartesia TTS runtime, interruptions, opt-out and cold-transfer code | Domain/AWS deployment, credentials, provider/latency/transfer acceptance, private recordings, bulk/sequence launch, separate scripts, voice selection/preview, advanced outcomes and calendar tools |
| Lead capture & booking | CSV/forms/source tests, segments/qualification, calendar rules, conflict checks, appointment/reminder drafts | Lead Ads/Sheets/authenticated ingestion, automatic triggers, calendar OAuth, confirmed invites and reminder delivery |
| Billing | Reservation/settlement/capture RPCs and regression tests; plans ₹2,999/₹3,999/₹9,999 per month + GST; read-only account orders/rates | Approved usage catalog, orders/subscriptions/top-ups, checkout, refunds, reconciliation and GST invoices |
| Operations | App/database CI; voice container definition and ECS Fargate/ALB infrastructure module; partial shared AWS infrastructure | Build/test container, configure existing network/secrets/certificate/DNS, deploy services/scheduler, restore/load tests and support operations |
| Shopify | Not implemented | OAuth, signed order/checkout events, COD/cart workflows and store updates; deferred scope |

See [the integration audit](docs/INTEGRATION_AUDIT.md) for code evidence, acceptance tests and the remaining build order. Menus, configuration drafts, OAuth callbacks and successful unit tests are not proof of provider delivery.

## Run locally

Node 24 is recommended.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

- `/` — marketing site; `/website` redirects here.
- `/dashboard` — anonymous local sample console. Data stays in browser storage; do not use production customer data here.
- `/account` — verified login/workspace membership, then the complete console using shared draft storage. New accounts receive no fake contacts, messages or opening credit.
- `/account/manage` — workspace creation, MFA/account controls and earlier normalized contacts/campaign records.
- `/account/whatsapp-verification` — protected verification preparation; no badge application is submitted.
- Account console → WhatsApp → Provider conversations — normalized database messages, kept separate from simulations.
- Account console → AI Calling → Connection & live calls — connect your own Plivo account, select an owned voice-enabled number, manage normalized agents/hours, single-contact launch, call logs and transcripts. Provider configuration/acceptance gates remain closed.

```sh
npm run typecheck
npm test
npm run build
```

## Supabase and draft storage

Use separate projects for development, staging and production. Apply **all six** migrations in `supabase/migrations` in order. Configure environment variables and auth callback allowlists; never expose the service-role key. Owners/administrators verify TOTP MFA in Account controls before privileged writes. Server routes independently validate workspace membership.

`0003` stores a tenant-scoped planning document with an 8 MB request limit and atomic revision checks. The first draft copies earlier contacts and inactive campaign metadata; originals remain intact. Further draft edits do not update normalized provider tables. Failed saves preserve unsaved work for export; no anonymous sample data is silently imported. Real team membership and wallets are unaffected by draft rosters or sample credits.

`0004` normalizes stored Meta messages and delivery receipts transactionally. A business phone number must have a unique, server-verified integration mapping. Do not mark a configuration draft as connected. Unknown senders become contacts with consent=false; existing consent is preserved. Incoming replies and manual takeover suppress pending outreach. Media identifiers are stored privately; downloads and outbound replies remain disabled.

`0005` adds server-only voice settings and acceptance records, call-session binding, tenant transcript turns, atomic launch/concurrency/credit reservations, and idempotent duration settlement. Account calling uses these normalized records, not the planning document or sample agents. Apply this migration before opening the connected-calling screen.

`0006` adds workspace-owned Plivo connections, verified caller-number selection and immutable call/connection binding. Connection writes require owner/administrator MFA; account and number checks precede KMS-encrypted storage. Unfinished or uncertain calls block rotation/disconnect. It also adds independent server-measured AI runtime; customer-signed callbacks trigger a direct Plivo CDR lookup rather than supplying billable AI duration. Missing runtime finalization holds credits for review. Apply all migrations before using the connection screen.

## Meta event worker

After database setup and a verified integration mapping, process signed, stored events with:

```sh
npm run worker:meta-events
```

It processes up to 50 due events, records bounded failure codes and backoff, and continues past individual failures. A scheduler/worker deployment is still required. The command never sends messages. Unsupported webhook fields are recorded for later reconciliation; template/health events are not implemented by this normalizer. Receipt ordering keeps delivered/read confirmations from regressing, including when a receipt arrives before its outbound database row.

## Provider boundaries

- **Meta:** official asset ownership, Embedded Signup, secure token storage and template/outbound acceptance remain pending. Do not collect access tokens in sample UI.
- **Gmail/Zoho:** OAuth requires provider app configuration, exact callback allowlists, correct Zoho region and KMS-encrypted tokens. Refresh, send and reply synchronization need account-level acceptance.
- **Voice:** Customers connect their own Plivo account after login; Sarvam/Cartesia remain platform-managed. Account/number verification, KMS-encrypted token storage and call-bound credential loading are implemented with no shared Plivo environment fallback. The persistent speech service and cold-transfer path remain unactivated and untested with real providers. Plivo bills the customer’s telephony; approved platform AI credits are separate. Shared server configuration, approved caller/destinations/rates, an unexpired workspace acceptance record and both enablement gates are required. See [voice setup and AWS runbook](services/voice/README.md).
- **Razorpay:** signed captures credit only existing server-registered orders. Checkout stays hard-disabled until the catalog and financial acceptance tests are complete.
- **AWS:** The user plans AWS hosting after buying a domain. `infra/voice` defines the persistent ECS/ALB voice service and expects an existing VPC/subnets, outbound access, certificate, image, secrets and alarm destination. No AWS resources or DNS changes were made. Web control-plane hosting and shared worker deployment remain separate work.

Changing environment flags alone does not activate production delivery or checkout.

## Verification

Unit tests, strict TypeScript and optimized build are configured in CI. The customer-owned Plivo milestone passed 77 tests with simulated transports/sockets, plus fresh application of all six migrations and all SQL/concurrency regressions; detailed verification is tracked in the release log. A separate PostgreSQL CI job applies the migrations and runs tenant, accounting, draft, Meta normalization, takeover and voice tests. Disposable local SQL tests also verify concurrent credit reservations, draft saves, voice launch limits and one-time stream claims. The voice Terraform module passed local format/validation after the BYO-Plivo IAM changes. The Docker image has not been built because Docker is unavailable here. Voice image-build and Terraform-validation CI checks are configured but have not been verified on GitHub. Hosted Supabase, real speech/calls/transfers, provider delivery, cloud deployment and restore/load acceptance are **not** claimed.

Never run `tests/database-bootstrap.sql` against an existing or production database. It creates a minimal auth shim for disposable PostgreSQL testing only.

See [release status](docs/RELEASE_STATUS.md) for chronological validation and remaining release gates.
