# Outreach feature gap audit — 25 October 2026

The local UI/workflow implementation below has since progressed. See the **Channel-console milestone** in RELEASE_STATUS.md for implemented local behavior and remaining live-provider work. The table in this document is the baseline gap inventory, not a claim that these new local screens are still absent.

## Scope and evidence

The product follows RapidSales for WhatsApp/email/voice outreach and AiSensy for WhatsApp operations. A standalone sales CRM, deal board, sales opportunity stages, and revenue pipeline are outside the requested scope. Contacts, audience segments, lead qualification, and handoff context remain relevant.

Reviewed RapidSales' public home, features, and channel detail pages today, plus the logged-in account navigation and Automation Reports screen. Confirmed AI Calling submenu: Dashboard, Agent Builder, Call Center, Call Logs, Transfer Requests, IVR Menus. Opening Agent Builder redirected to billing; its full editor was not accessible in this review. The prior 24 October account audit contains additional screen observations; those are dated historical observations, not newly verified runtime results.

Reviewed AiSensy's public features/pricing today and the logged-in dashboard earlier in this chat. Observed API status, quality rating, messaging quota, KYC/business verification, profile setup, a disabled blue tick application, live chat/history, campaigns, AI agent, flows, Ads Manager, payments, links/QR and website-button entries. We did not send, call, pay, submit KYC, or test either provider's actual service. An advertised feature or visible navigation entry is not proof of runtime correctness.

## Current product truth (before the channel-console milestone)

The broad `/dashboard` is a local sample interface, not the authenticated production product. Many screens are drafts or illustrative views. `/account` has a smaller authenticated database-backed surface. `src/lib/local-workspace.ts` contains richer local-model scaffolding that is not fully wired into the visible dashboard. Existing backend foundations do not establish end-to-end feature completion. All live sending, calls, and checkout remain disabled.

## Pre-milestone missing and partial capabilities

Reference: R = RapidSales; A = AiSensy. “Partial” means some UI or foundation exists; it does not mean a working production integration.

| Area | Reference direction | Current app | Missing work |
| --- | --- | --- | --- |
| Navigation | R: dedicated channel modules; A: WhatsApp operations | Flat sample navigation | Group WhatsApp, Email and AI Calling views; separate account setup from public marketing. |
| Overview | R/A: operational metrics | Illustrative cards/charts | Consistent local counts first; later verified balance, quality, quota, delivery, reply and cost data. |
| Contacts | R/A: imports and organization | Local create/search/CSV preview; limited account persistence | Contact details/editing, pagination, field mapping, import error report and complete authenticated flows. |
| Segments | R/A: reusable audiences | Tags exist; no full segment workflow | Rule builder, counts, preview, saved segments, campaign audience snapshots. |
| Qualified leads | R: dedicated module | No dedicated module | Outcome list, filters, owner, source, transcript/message context and human handoff. |
| Activity timeline | R: cross-channel context | Fragmented samples/local-model scaffolding | One per-contact timeline, campaign attribution and verified events later. |
| Campaigns | R/A: broadcasts and outreach | Draft dialogs and samples | Audience/content review, detail views, schedule/pause/cancel/history, validation and local simulations; live execution later. |
| Sequences | R: multi-channel steps | Basic local step UI | Saved sequences, branching, validation, execution history, suppression on reply/opt-out/handoff and schedule enforcement. |
| WhatsApp onboarding | A: API and profile setup | Disabled connection dialog | Official business-owned onboarding, asset selection, connection health, display name, quality and messaging limits. |
| Blue tick assistance | A: gated application | Authenticated preparation flow and local draft | Provider-confirmed prerequisites, authorized application route, durable requests, review/status tracking. Approval remains Meta's. |
| WhatsApp templates | R/A: managed templates | Sample content/copy | Rich media, buttons/carousels, variables, categories, previews, approval/rejection status, template sync and supported AI drafting. |
| Shared inbox | R/A: conversations | Sample thread and unsent composer | Persistent threads/replies, assignment, search, unread/closed states, attachments, team permissions and incoming-event sync. |
| Chatbot flows | A: visual bot builder | Not implemented; outreach sequences are different | Keyword/event triggers, reply/button nodes, conditions, forms, bot testing and human takeover. |
| WhatsApp AI agent | A: knowledge-driven chat | Marketing add-on copy only | Knowledge inputs, instructions, answer preview, tool configuration, usage controls and safe human transfer. |
| Ads and lead capture | R: lead sources; A: ad tools | No functional module | Meta Lead Ads/CTWA setup, source attribution, form/Sheets/webhook ingestion, deduplication and workflow triggers. |
| Forms/catalog/payments | A: in-chat commerce tools | Not implemented | Separate module design, catalogs, forms/webviews, payment states and provider acceptance. No new checkout enabled. |
| Links/QR/widgets | A: acquisition tools | Not implemented | Prefilled chat-link generator, QR export and website chat button builder. |
| Email setup | R: sender/account configuration | Gmail/Zoho route/adaptor foundations | OAuth acceptance, sender health, identities/domain setup, limits/delays and reconnection. |
| Email inbox/templates | R: channel tools | Shared samples only | Sender-specific mailboxes, draft/preview templates, threading, attachments, reply sync, and labelled approximate tracking. |
| Agent builder | R: voice configuration | Basic agent draft modal | Conversational/scripted/IVR modes, instructions/knowledge, language/voice, test preview, limits, booking and notification settings. |
| Call operations | R: call center/logs/transfer/IVR | No full operational views | Queues, inbound/outbound handling, outcome filters, recordings/transcripts, transfers, callback scheduling and IVR routing. |
| Appointment booking | R: calendar scheduling | Not implemented | Calendar availability, booking conflicts, confirmations/reminders, timezone handling and failure paths. |
| Working days | R: channel schedules | Local schedule editor | Strong validation, consistent persistence, timezone clarity; production workers later. |
| Analytics/reports | R: channel and automation reports; A: campaign performance | Illustrative analytics | Date ranges, channel/campaign costs, delivery/read/reply/failure funnels, filters and exports from real local events first. |
| Subscription/credits | R/A: plan and usage accounting | Prices and sample balance; ledger foundation | Orders/invoices, approved rate catalog, reconciliation and full account billing UI; Razorpay tests before checkout. |
| Team/permissions | R/A: team operation | Backend role foundations, limited UI | Invitations, roles, assignment rules, audit history and tenant checks across every account module. |
| APIs/integrations | R/A: external workflow connections | Partial routes/webhooks/workers | Customer-facing integration health, documented APIs, auth scopes, retry/replay tools and staging acceptance. |
| Mobile operations | A: mobile apps | Responsive web only | Mobile usability validation; native applications are a separate project, not implied by a web preview. |

## Build order

1. Complete authenticated navigation, contacts/segments, campaign lifecycle, templates and inbox workflows, using coherent sample behavior where provider integration is deferred.
2. Add WhatsApp-specific bot/AI agent, lead capture, qualified leads and human handoff, links/QR/widget tools.
3. Expand voice configuration and call operations; finish email channel views, reporting and billing review.
4. Connect Supabase/AWS/providers as previously agreed, verify permissions and tenant isolation, then run real provider acceptance tests before activating sends/calls/payments.

Ecommerce features found in the references (catalogs, carts, orders, Shopify) are recorded as gaps, not silently promoted into the first milestone. A full deal CRM stays excluded. No unrelated modules should be added solely to fill a sidebar.

## Changes made in this review

- Replaced the waveform product identity with a shared rising sales-growth mark across website, dashboard, login, account, previews, CTA art, 404 page and favicon. Voice-channel icons remain distinct.
- Removed the Sales pipeline sidebar entry and Kanban view.
- Replaced public pipeline/CRM positioning with contact, audience segmentation and lead context; updated feature links and pricing copy.
- Changed sample contact options from deal stages to outreach statuses. Historical backend/storage fields were retained to avoid destructive data/schema changes; no deal board is exposed.

## Sources

- RapidSales home: https://www.rapidsales.ai/
- RapidSales features: https://www.rapidsales.ai/features
- Voice: https://www.rapidsales.ai/features/ai-calling-agent
- WhatsApp: https://www.rapidsales.ai/features/whatsapp-automation
- Email: https://www.rapidsales.ai/features/email-outreach
- AiSensy features: https://aisensy.com/features/
- AiSensy pricing: https://aisensy.com/pricing/
- Earlier account audit: RAPIDSALES_FEATURE_AUDIT.md
