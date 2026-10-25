# Voice runtime — implemented, not activated

The selected stack is **Plivo + Sarvam/Cartesia**. The user plans to buy a domain and host on AWS. There is no configured `.env.local`, provider credential, public voice domain or deployed service in this workspace. No real call, speech latency, transfer or provider charge has been verified.

This directory now contains an executable persistent WebSocket service. It is separate from the Next.js control plane and from the deterministic sample call previews. `VOICE_CALLING_ENABLED` defaults to false; changing that flag alone cannot authorize a call.

## Implemented path

1. `/api/voice` reads normalized workspace agents, contacts, calling hours, readiness and the latest 100 calls. Owners/administrators with verified MFA can save agents/hours or request a single-contact call. `/api/voice/[id]` reads transcript turns and requests call stop. Stop is recorded durably before contacting Plivo: an active call uses its Call UUID; queued/ringing launch cancellation uses its Request UUID. Answer binding and media claims honor the recorded stop even if the launch response is still in flight. Unknown dial/stop outcomes retain reserved credit for reconciliation. The account's **Connected calling** screen uses these APIs; the anonymous sample remains a simulation. Draft contacts/agents are not silently copied into execution tables.
2. Migration `0005_voice_runtime.sql` prepares a call transactionally. It checks membership, an unexpired workspace voice acceptance record, enabled server-owned settings, a ready agent, explicit consent, opt-out, destination allowlist, timezone-aware calling hours, workspace/agent concurrency, an approved per-minute rate and available wallet credit. It reserves the maximum rounded-minute amount and snapshots the agent/caller/destination. Repeated request keys return the original call and never redial it.
3. The server requests Plivo dialing with answer/hangup callbacks and a duration limit. Signed answer callbacks bind provider and request UUIDs to the prepared call. Media upgrade requires a Plivo V3 signature and an expiring secret whose hash belongs to the call; an atomic database claim permits only one media session. Workspace identity and telephone destinations come from server records.
4. Plivo streams inbound 8 kHz G.711 mu-law audio. Sarvam realtime STT produces English/Hindi transcripts; `sarvam-105b-conversations` returns a validated short response and one of `continue`, `end`, `handoff` or `opt_out`. Cartesia `sonic-3.6`, using the pinned API version, synthesizes speech. WAV PCM is checked and converted to Plivo mu-law playback. The model cannot choose transfer numbers, change billing or create bookings.
5. Speech-start detection aborts the previous response and clears queued playback. Transcript turns mark interrupted assistant speech. Bounded buffers, start/provider timeouts, a silence timeout, duration limits, periodic consent checks and failed persistence/provider handling end the call instead of continuing without a functioning recognizer or authorization check. Opt-out updates normalized contact suppression immediately.
6. A human request or DTMF `0` uses a configured server-owned transfer destination. The service requests a Plivo call redirect, then closes its media socket; signed transfer XML dials the destination within the remaining duration. This is **cold transfer to a telephone number**, not warm transfer, conference supervision or a staffed contact-center integration. DTMF `9` opts out. Real transfer behavior still needs acceptance.
7. Signed hangup events settle rounded-minute usage from provider billed duration and release unused reservation. Duplicate completion is idempotent; conflicting or unexpectedly large duration stays unresolved. Callback and CDR outcomes share conservative cause/answer normalization; unresolved outcomes are not labelled completed. Ambiguous dialing never automatically redials or releases credit. The reconciliation command checks completed Plivo CDRs for known call UUIDs; records without a confirmed UUID require manual reconciliation.

## Configuration

Use Node 24. Apply all five Supabase migrations and configure the web app's Supabase authentication, workspace membership and MFA. Put credentials in server environment/secrets storage; never ask customers to enter platform provider keys in the sample console or put keys in browser-exposed variables.

| Variable | Purpose |
| --- | --- |
| `VOICE_PUBLIC_URL` | Exact HTTPS origin of the persistent service, such as `https://voice.example.com`; no path, query, credentials or localhost |
| `VOICE_PORT` | Internal listener port; default `8080` |
| `VOICE_SERVICE_MAX_SESSIONS` | Per-process media-session cap; default `20`; database workspace/agent limits also apply |
| `PLIVO_AUTH_ID`, `PLIVO_AUTH_TOKEN` | Server-managed Plivo account and V3 callback verification |
| `SARVAM_API_KEY` | Realtime STT and conversational LLM |
| `CARTESIA_API_KEY` | Speech synthesis |
| `CARTESIA_VOICE_EN`, `CARTESIA_VOICE_HI` | Valid provider voice UUIDs selected and tested for each language |
| `NEXT_PUBLIC_SUPABASE_URL` | Database API origin; this URL itself is public |
| `SUPABASE_SERVICE_ROLE_KEY` | Private server-only database credential |
| `VOICE_CALLING_ENABLED` | Explicit runtime gate; defaults to false in the web app and voice service |

The web control plane needs the same voice configuration to request calls. Its normal app URL/auth/KMS/mail settings remain separate. `LIVE_SENDING_ENABLED` and `PAID_CHECKOUT_ENABLED` do not authorize voice calling and should remain disabled until their own acceptance gates pass.

Platform operators must provision `voice_settings` with an approved caller number, explicit test/approved destinations, transfer number if used, concurrency and disabled initial state. They must also provision a genuine approved `voice`/`minute` credit rate and expiring `integration_acceptances` evidence for the workspace through trusted server administration. These tables have no browser write policy or self-approval UI. Do not invent acceptance evidence or turn on calling merely to make readiness indicators green.

Local commands:

```sh
npm ci
npm run typecheck
npm test
npm run voice:start
```

`GET /healthz` returns 503 while required configuration is absent and 200 when configured and not draining. It reports configuration readiness, not provider connectivity or acceptance. Without a public HTTPS/WSS endpoint, Plivo cannot reach this local listener. Unconfigured local startup is useful for verifying the disabled boundary, not for proving a call works.

```sh
npm run voice:reconcile
```

Run reconciliation as a restricted scheduled task with server credentials. It processes up to 100 due pending calls older than 20 minutes in stable order. It settles only confirmed completed CDRs with matching call identity, valid billed duration and a supported answer/hangup outcome. Retryable failures use bounded exponential backoff, with at most six attempts; records with missing provider identity, unsupported outcomes or exhausted retries enter a separate manual queue so they cannot starve later work. No scheduler or manual-review console is deployed by this repository. Never automatically redial uncertain launches or release their reserved credits without confirming the provider outcome.

## AWS deployment runbook

`infra/voice` defines an internet-facing HTTPS Application Load Balancer, an ECS Fargate cluster/service in private subnets, task/execution roles, Secrets Manager injection, log retention, health checks and an unhealthy-target alarm. It expects infrastructure supplied by the hosting environment; it does not purchase a domain, create the VPC/NAT, issue a certificate, create ECR/secrets/SNS, deploy the Next.js app or configure DNS.

1. Use separate staging and production databases, provider configuration and AWS state. Supply an existing VPC, public ALB subnets and private ECS subnets with DNS and outbound HTTPS access. Private tasks need NAT or suitable endpoints for image/log/secret access plus outbound connectivity to Plivo, Sarvam, Cartesia and Supabase. Tasks receive no public IP; port 8080 accepts traffic only from the ALB security group.
2. After purchasing the domain, choose a voice hostname. Issue and validate an ACM certificate for it in the ALB's region. `VOICE_PUBLIC_URL` and callback verification must use exactly this public origin. Do not derive signature URLs from arbitrary forwarded host headers. DNS will point to the ALB; leave calling disabled during setup.
3. Create a restricted Secrets Manager JSON secret with the eight credential/configuration keys referenced by `infra/voice/main.tf`. Supply its ARN and, when customer-encrypted, its KMS key ARN. Do not store secret values in Terraform variables, source control, image layers, task plaintext environment or logs. The execution role reads the specified secret; the runtime uses the injected values.
4. Build the image from the repository root, scan it and push to your ECR repository. The checked-in Dockerfile exists, but Docker is unavailable in this development environment, so this image has **not** been built or started here.

```sh
docker build -f services/voice/Dockerfile -t sprint-voice:staging .
```

Use your registry's authenticated push flow and pin the resulting ECR image digest (`repository@sha256:...`) in Terraform. The module rejects an unpinned image tag. The runtime runs as a non-root user; ECS mounts its root filesystem read-only and disables the TSX disk cache.

5. Configure module inputs: `environment`, `region`, `vpc_id`, `public_subnet_ids`, `private_subnet_ids`, `certificate_arn`, `domain`, digest-pinned `image`, `secret_arn`, optional `secret_kms_key_arn`, and an existing operational `alarm_topic_arn`. Keep `calling_enabled=false`. Configure durable, access-controlled remote Terraform state and locking for the hosting environment.

```sh
terraform -chdir=infra/voice init
terraform -chdir=infra/voice fmt -check
terraform -chdir=infra/voice validate
terraform -chdir=infra/voice plan -var-file=staging.tfvars
```

Inspect the plan before deploying through the hosting workflow. No `apply` has been run. Local `validate` passed with AWS provider 6.70.0; that does not prove IAM, network routing, secrets, TLS or provider connectivity in AWS. GitHub Actions now includes a voice Docker build and Terraform validation, but those hosted checks have not been observed running successfully.

6. Point DNS at the ALB. Verify certificate, `/healthz`, HTTPS form callbacks and WSS upgrades through the actual load balancer. The module's idle timeout accommodates the supported call duration; no proxy/CDN may buffer media or strip signature headers. Keep query-token URLs out of access logs/traces. Configure the web app with the same voice public origin and credentials through its own secret mechanism.
7. Complete controlled staging acceptance using approved test destinations and documented evidence. Confirm hosted auth/MFA/RLS, one-time sessions, actual speech/audio, interruption latency, silence/disconnect behavior, opt-out, duration enforcement, call stop, cold transfer including failure/busy, duplicate callbacks, ambiguous dial recovery and wallet reconciliation against provider records. Validate deployment draining and container restart behavior before production. Production calling requires its own accepted evidence and enabled workspace/runtime settings; a healthy container is insufficient.
8. Schedule reconciliation, route alarms to the operations team, verify secret rotation/redeployment, and test database backup/restore and expected concurrency. Watch provider latency/errors and reserved credits requiring reconciliation without logging telephone numbers, raw speech or tokens. No load/restore or operational response test has been completed here.

To disable new calls, close workspace and runtime gates in the web app and voice service. Gate changes do not constitute an emergency stop of every existing call; use the authenticated stop path/provider controls and reconcile each active call. Deployments drain connections by requesting hangup; uninterrupted rolling migration of an active conversation is not implemented.

## Reference comparison and remaining gaps

Rapid Sales' [public AI calling page](https://www.rapidsales.ai/features/ai-calling-agent) and published [agent-builder](https://www.rapidsales.ai/images/ai-calling/agent-builder.png), [quick-call](https://www.rapidsales.ai/images/ai-calling/quick-call.png) and [call-log](https://www.rapidsales.ai/images/ai-calling/call-logs.png) screenshots show agent identity, language/voice/gender/speed and preview, separate Call Scripts, quick/bulk calling and outcomes. These are public product evidence, not a logged-in backend inspection or a verified real call.

Still missing here: live provider acceptance; private recordings/storage/playback and related disclosure controls; bulk and sequence-driven call execution; separate reusable call scripts; per-agent voice selection/speed/voice previews; advanced qualification/outcome extraction and summaries; calendar booking tools; full inbound routing/IVR/contact-center behavior; warm transfer; production metrics, restore/load tests and operations. The implemented runtime does not close WhatsApp, email, lead-source, booking or checkout gaps documented in [the integration audit](../../docs/INTEGRATION_AUDIT.md).

## Official protocol references

- [Plivo audio-streaming guide](https://docs.plivo.com/docs/voice-agents/audio-streaming/concepts/audio-streaming-guide): bidirectional stream events, playback/clear/checkpoints and `keepCallAlive="true"`. With this setting, close the media socket when redirecting to transfer XML so the stream does not hold the call indefinitely. The response includes a bounded wait/hangup fallback.
- [Plivo signature validation](https://docs.plivo.com/docs/voice/concepts/signature-validation): HTTP and media upgrades use the official Node SDK's V3 verification.
- [Sarvam realtime STT](https://docs.sarvam.ai/api/api-guides-tutorials/speech-to-text/realtime-streaming) and [chat completion](https://docs.sarvam.ai/api/api-guides-tutorials/chat-completion/overview): realtime mulaw input/VAD and conversational LLM.
- [Cartesia TTS bytes](https://docs.cartesia.ai/api-reference/tts/bytes): pinned speech request format and audio output. Provider model/API compatibility remains an explicit staging acceptance requirement.
