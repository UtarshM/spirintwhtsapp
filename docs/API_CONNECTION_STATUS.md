# API connection status — 4 November 2026

## Scope

Rapid Sales is the reference product. Its private dashboard has not been inspected in this session; only public pages and user-provided screenshots have been reviewed. Sprint does not use or require private Rapid Sales API credentials.

## Local configuration audit

Checked whether settings exist in .env.local, without printing values. Supabase URL/publishable/service settings and a Bedrock token are present; provider reachability and permission validity are not established by presence. KMS, Meta app/webhook settings, Gmail/Zoho OAuth, Sarvam, public voice-service URL, and Razorpay credentials are absent.

## Implemented in this pass

- Authenticated integration status now returns configuration readiness without credentials.
- Gmail and Zoho authorization controls use the existing authenticated POST connect endpoints and validate the returned provider origin before navigating.
- Both the integration directory and email setup cards expose the same authorization flow.
- Controls require an account administrator and server-side configuration; credentials are never requested in sample UI.
- OAuth callbacks record a pending connection until encrypted tokens are saved; only then is the connection marked connected.
- Removed the unconditional claim that the central AI service is active. A configured token is explicitly not a verified provider connection.

## Required operator setup

Configure credentials through the project's server environment, never in chat or public sample controls. Supply KMS encryption first, then Google/Zoho app credentials and exact deployed callback URLs. Authorize the intended mailboxes after signing in. Meta requires an implemented official onboarding flow and business assets. Calling requires customer-owned Plivo authorization, KMS, Sarvam and a deployed persistent voice-service HTTPS endpoint. Billing requires approved pricing, Razorpay configuration and payment acceptance. Calendar, Shopify and external lead capture still require implementation.

## Limits

No external account was authorized, no message or call was sent, and no payment was made. Existing release gates remain in place. Email sending/reply sync, Meta onboarding, calendar/commerce and production acceptance are not completed by this wiring. All-provider connectivity must not be claimed until each connection is verified.
