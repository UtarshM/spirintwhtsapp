# Sprint by Scalezix

A blue sales workspace for WhatsApp, email, and AI calling. **This is an initial implementation, not a production-ready release of the full plan.**

## Run locally

Node 24 is recommended.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000 for the interactive sample workspace, `/website` for the marketing page, and `/account` for the authenticated database-backed account area. Sample workspace changes stay in browser localStorage and never send messages or create payments. Do not import production customer data into sample mode.

```sh
npm run typecheck
npm test
npm run build
```

## Connect Supabase

Use a separate Supabase project for each environment. Apply both migrations in `supabase/migrations` through the Supabase CLI. Configure the public URL/publishable key and server-only service key, auth callback allowlists, verified SMTP/SES, confirmation emails, password policy, and TOTP MFA. Do not expose a service-role key to the browser.

New accounts verify email and create a workspace at `/account`. Administrators enroll/verify MFA there before campaign, integration, invitation, or export operations. Server routes validate membership independently of the supplied workspace header. Browser writes have no database policies; server routes authorize before using the service client.

## Current implementation

- Original responsive blue dashboard with local contact creation/search/CSV validation and preview, pipeline stage changes, campaign drafts, shared-inbox drafts, sequence steps, template/agent drafts, sending schedules, billing setup states, and a marketing page.
- Supabase sign-in/signup/recovery callback, workspace creation, MFA enrollment/verification, basic persistent contacts/campaigns account UI, invitation acceptance, and role checks.
- Tenant-scoped draft APIs for deals, tasks, templates, sequences and voice agents; contact updates and administrator-only CSV export.
- Tenant-isolated schema, durable outbox/event tables, encrypted OAuth state/token storage, credit reservations/settlement and captured-payment ledger RPCs.
- Gmail/Zoho OAuth routes and email transport adapters; Meta signed webhook persistence and a replayable event normalizer; Razorpay signed capture handler.
- AWS queue/KMS/private S3 infrastructure definitions and background worker skeletons.

## Intentionally not activated or complete

Live channel sending, production campaign launch, complete inbox synchronization, Meta embedded onboarding/template administration, the streaming voice runtime, human telephony transfer, appointment scheduling, real-time account dashboard integration, self-service subscription checkout, top-up catalog, refund reconciliation, signed media downloads, operations console, production legal pages, deployment automation, and restore/load acceptance tests still require implementation and/or provider validation. Merely adding credentials does **not** complete these features.

The sample dashboard is not the authenticated account application. Its illustrative charts are labelled as samples. Authenticated `/account` currently supports a smaller set of real persistent actions. No certification, production readiness, or delivery success is claimed.

## Provider configuration

- **Gmail:** Google OAuth web app, exact callback `/api/integrations/gmail/callback`, Gmail send/read scopes, production consent verification as required by Google. Test send and reply history under the selected account before activating workers.
- **Zoho:** OAuth server app and exact callback `/api/integrations/zoho/callback`. Match `ZOHO_ACCOUNTS_URL` and `ZOHO_MAIL_API_URL` to the customer's datacenter; `.com`, `.in`, `.eu`, and `.com.au` are explicitly allowlisted. Validate requested scopes with the actual Zoho app.
- **AWS KMS:** grant the server narrowly scoped Encrypt/Decrypt access to the configured key. Encryption context is bound to the workspace. No tokens belong in logs, source, or localStorage.
- **WhatsApp:** business-owned Meta assets, app secret and verify token. Embedded onboarding and outbound template management are pending. Configure verified integration mappings before running event normalization.
- **Plivo:** number/destination approval, credentials, speech accounts, and persistent audio service. See `services/voice/README.md`.
- **Razorpay:** configure the webhook secret. Payment capture only credits orders already registered by the server; no client-provided conversion is trusted. Catalog, checkout, subscriptions, refunds and reconciliation are pending. Checkout is hard-disabled even if an environment flag is changed.

## Database verification

Tests were run against a disposable local PostgreSQL instance using a minimal Supabase auth schema shim. This checks SQL behavior, not hosted Supabase Auth/Realtime integration. See `tests/database-bootstrap.sql`, `tests/database.test.sql`, and `tests/database-concurrency.py`. Never run the bootstrap against an existing or production database.

## Deployment

Vercel hosts the Next.js application. Use environment-specific Supabase/AWS resources and callback origins. `infra/main.tf` defines private storage, KMS, a queue/DLQ, and logs; it is not a complete deployable ECS/EventBridge architecture. No cloud resources were created and no production data was accessed.

See `docs/RELEASE_STATUS.md` for the remaining production gates.

## Marketing-first update

`/` now serves the public landing page. Open `/dashboard` for the existing local sample app; `/website` redirects to the public home. All marketing page links are implemented, including the pricing preview. Forms save local drafts only, prices are indicative, and legal pages are unapproved drafts. See `docs/RAPIDSALES_FEATURE_AUDIT.md` for the signed-in reference review and next dashboard work.

## Channel console preview

Visit `/dashboard` for the expanded outreach console. Contacts/Campaigns and AI Calling/WhatsApp/Email have collapsible submenus. Local workflows share a validated browser workspace: campaigns, inbox drafts, sequences, agents, call previews, segments, bot/form/setup drafts, reports, QR tools and sample credits. Use Settings to export/import local backups. No providers send, call, charge, publish or submit applications from the preview. `/account/whatsapp-verification` remains protected by account login and workspace membership. See `docs/RELEASE_STATUS.md` for the exact current boundaries.
