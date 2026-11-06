# Sprint dashboard implementation plan

Prepared 4 November 2026. Reference: https://app.rapidsales.ai/dashboard

## Evidence and limits

The current session cannot access the user's authenticated Brave tab. The dashboard URL is not readable with web fetch. No new authenticated screen inspection has occurred. Historical observations in OUTREACH_FEATURE_GAP_AUDIT.md and current source code inform this plan. Public feature pages describe capabilities; they do not prove actual execution. Screenshots or browser access are needed before claiming visual parity.

Implement in the local Sprint repository, not in the third-party Rapid Sales account. Keep the existing release gates and preserve sample-versus-provider data boundaries.

## Phase 1 — Operational overview

- Add an activity period selector (today, 7 days, 30 days, all time, custom dates).
- Keep current contact, qualification, campaign-draft and sample-balance snapshots visibly separate from period metrics.
- Compute sample-credit usage and a seven-day chart from persisted transactions, never invented monetary spend.
- Show separate WhatsApp, email and calling summaries with navigation into the existing channel consoles.
- Filter and chronologically sort recent activity. Include empty states and invalid-range feedback.
- Retain the existing sidebar, workspace persistence and authentication boundaries.

## Phase 2 — Compare the authenticated reference

Review the overview, Contacts, Campaigns, Sequences, AI Calling dashboard/builder/call center/logs/transfers/IVR, WhatsApp templates/inbox, Email, Reports, Configuration and Billing. Record for each: screenshots, fields, validation, state transitions, permissions and plan restrictions. Read-only inspection only; do not send, call, pay or change the reference account.

Produce a screen-by-screen acceptance checklist. Match interaction patterns in Sprint's own branding and do not copy third-party logos, customer data, claimed metrics or credentials.

## Phase 3 — Connect persisted operations

- Contacts: authenticated import review, consent provenance, reusable segments and qualification/handoff history.
- Campaigns: immutable audience/content snapshots, schedule, pause/cancel, execution timeline and errors.
- Sequences: versioned steps, conditions/delays, timezone windows and transactional stop-on-reply/opt-out/handoff.
- Inbox: provider messages, assignment, takeover, unread state, supported attachments and explicit pending/failure states.
- Voice: existing saved agents/Plivo/Sarvam pipeline plus verified logs, transfer status, private recordings, bulk operations and callbacks.
- Configuration: persisted working days, channel connection status and role-appropriate settings.

Each screen must distinguish editable planning records from normalized provider records. Failed requests must remain visible and must not silently succeed using demo data.

## Phase 4 — Provider acceptance and release

Follow RELEASE_STATUS.md and PRD_IMPLEMENTATION.md. Stage official WhatsApp onboarding/templates, durable sending/reconciliation, email send/reply sync, voice media/transfer validation, booking/calendar tools and billing acceptance. Keep sends and checkout gated until the relevant acceptance tests pass. Establish tenant isolation, replay safety, opt-out/stop races, scheduling boundaries and private-media access tests before production rollout.

## Validation for the initial change

Run strict TypeScript checks and the existing unit suite. Validate period filtering, empty activity, custom dates and chart accessibility in browser when browser control is available. Initial dashboard enhancements do not establish provider parity or a complete production product.

## Initial validation results

- Existing unit suite: 97 passed, 0 failed.
- Local GET /dashboard: HTTP 200.
- git diff --check: passed.
- TypeScript validation: unverified. Both incremental and clean checks stalled without diagnostics; the clean process had Next.js declaration file node-environment-baseline.d.ts open. Stopped only these two checks.
- Visual/browser acceptance: pending because this session cannot access the user's Brave tab or inspect the rendered local UI.

## Dashboard flow implementation — 4 November 2026

Implemented all screenshot calendar presets, custom date validation, timezone-aware calendar filtering, deduplicated contact reply rates, persisted simulation usage, period-correct seven-day charts, channel summaries, CSV activity export and workflow links. Shared filtering now drives Analytics and Automation Reports, including filtered sequence runs. Sample and account planning records remain separate from provider delivery and monetary billing. Existing sidebar submenus continue to route into the saved-workspace modules.

Verification: 101 unit tests passed, including four new suites of calendar/aggregation assertions. Authenticated Brave scrolling and inner-screen inspection remain unavailable. Provider-backed acceptance and complete production parity are still outstanding.
