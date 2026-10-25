# Reference feature audit — 24 October 2026

Inspected the user's signed-in RapidSales account through the browser without saving records, changing provider configuration, sending messages, placing calls, or purchasing anything. A blank account cannot prove provider delivery or runtime behavior. Items below distinguish observed screens from implementation work.

## Observed in the account

| Area                  | Observed controls or screens                                                                                                             | Relay dashboard work still needed                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Overview              | Date presets/custom period, credit wallet, costs, contact counts, reply rate, daily spend, channel delivery/engagement, usage and limits | Replace illustrative numbers with coherent local activity first, then verified provider events later       |
| Contacts              | All Contacts, Segments                                                                                                                   | Contact details/editing, segment rules/list, audience review, task and timeline context                    |
| Campaigns             | All Campaigns, Leads, Templates, Sequences                                                                                               | Full campaign details and lifecycle, audience selection, linked content, lead list, sequence configuration |
| AI calling            | Dashboard, Agent Builder, Call Center, Call Logs, Transfer Requests, IVR Menus                                                           | Separate views and local management workflows for each area                                                |
| Agent types           | Conversational, Scripted, IVR Menu selection dialog                                                                                      | Agent-type selection plus appropriate configuration; live execution stays deferred                         |
| WhatsApp              | Dashboard, Inbox, Templates, Broadcast                                                                                                   | Channel-specific navigation, template management and broadcast review                                      |
| Email                 | Dashboard, Inbox, Templates                                                                                                              | Sender-specific email views and persistent local message drafts                                            |
| Mail setup            | Gmail, Zoho, Outlook marked Coming soon, Mail Setup and Identity Setup tabs; sender daily limits and delays described                    | Gmail/Zoho setup states, sender limits, delay settings, identity review; no fake connected accounts        |
| AI call configuration | Plivo, SIP settings, pipeline selection, STT, conversation LLM; Settings, Languages & Voices, Features, Booking & Notifications tabs     | Local non-secret configuration forms and validation; provider credentials later                            |
| Working days          | Per-channel days and sending windows                                                                                                     | Persisted editable schedules with validation and timezone visibility                                       |
| Qualified Leads       | Dedicated navigation entry                                                                                                               | Filtered lead view with clear qualification and handoff context                                            |
| Analytics             | Date filters, total outreach, qualified leads, conversion, total cost, channel outreach/spend/performance, lead sources                  | Report views computed from local activity; verified provider metrics later                                 |
| Billing               | Subscription, upgrade, Orders and Credits views                                                                                          | Local plan/credit history review; real Razorpay purchasing remains disabled                                |
| Automation Reports    | Abandoned Cart, Orders, Lead Automation tabs                                                                                             | Lead automation report first; ecommerce reports deferred with Shopify                                      |

Not every subview was opened. Navigation visibility is evidence of the interface, not proof of every feature's internal behavior. Exact visual cloning is not the goal; Relay uses original branding and a blue design.

## Public marketing review

Reviewed RapidSales home/features/pricing and Retner home/features/pricing. Relay now has its own landing page, feature directory and detail pages, solution guides, planned integration pages, draft pricing, contact/walkthrough drafts, journal, help guides, workflow comparisons, about, security approach, roadmap, illustrative use-case pages, and legal drafts.

References:

- https://www.rapidsales.ai/features
- https://www.rapidsales.ai/pricing
- https://www.retner.ai/features
- https://www.retner.ai/pricing

## Sequence agreed with the user

1. Finish marketing pages first, with a complete internal navigation flow.
2. Complete the dashboard's local UI/workflows against this feature checklist.
3. Configure Supabase, AWS, providers, payments, and production acceptance checks afterward.

No Shopify retention work is pulled into the initial sales scope solely because it appears in a reference product.
