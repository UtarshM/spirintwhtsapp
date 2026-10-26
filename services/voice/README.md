# Voice runtime — implemented, not activated

The selected stack is **customer-owned Plivo + platform-managed Sarvam/Cartesia**. Each workspace connects its own Plivo account after login and selects a verified number from that account. There is no shared platform Plivo fallback. The user plans to buy a domain and host on AWS. There is no configured `.env.local`, provider credential, public voice domain or deployed service in this workspace. No real account connection, call, speech latency, transfer or provider charge has been verified.

This directory now contains an executable persistent WebSocket service. It is separate from the Next.js control plane and from the deterministic sample call previews. `VOICE_CALLING_ENABLED` defaults to false; changing that flag alone cannot authorize a call.

## Implemented path

1. `/api/voice` reads normalized workspace agents, contacts, calling hours, readiness and the latest 100 calls. Owners/administrators with verified MFA can save agents/hours or request a single-contact call. `/api/voice/[id]` reads transcript turns and requests call stop. Stop is recorded durably before contacting Plivo: an active call uses its Call UUID; queued/ringing launch cancellation uses its Request UUID. Answer binding and media claims honor the recorded stop even if the launch response is still in flight. Unknown dial/stop outcomes retain reserved credit for reconciliation. The account's **Connected calling** screen uses these APIs; the anonymous sample remains a simulation. Draft contacts/agents are not silently copied into execution tables.
2. Migrations `0005_voice_runtime.sql` and `0006_customer_plivo.sql` prepare a call transactionally. Preparation checks membership, an unexpired workspace voice acceptance record, enabled server-owned settings, a ready agent, explicit consent, opt-out, destination allowlist, timezone-aware calling hours, workspace/agent concurrency, an approved per-minute rate and available wallet credit. It reserves the maximum rounded-minute platform AI amount and snapshots the agent/caller/destination plus the immutable workspace Plivo connection. The caller must be a verified, voice-enabled number owned by that connection. Plivo telephony is billed directly to the customer by Plivo; the approved platform AI-credit rate is a separate catalog entry, not an assumed Plivo tariff. Repeated request keys return the original call and never redial it.
3. The server loads only the prepared call’s workspace connection, decrypts its token with the matching KMS context and requests Plivo dialing with answer/hangup callbacks and a duration limit. Callback signature validation, stop/transfer requests and CDR reconciliation use that same connection’s credentials, never another tenant’s or shared environment credentials. Signed answer callbacks bind provider and request UUIDs to the prepared call. Media upgrade requires a Plivo V3 signature and an expiring secret whose hash belongs to the call; an atomic database claim permits only one media session. Workspace identity and telephone destinations come from server records.
4. Plivo streams inbound 8 kHz G.711 mu-law audio. Sarvam realtime STT produces English/Hindi transcripts; `sarvam-105b-conversations` returns a validated short response and one of `continue`, `end`, `handoff` or `opt_out`. Cartesia `sonic-3.6`, using the pinned API version, synthesizes speech. WAV PCM is checked and converted to Plivo mu-law playback. The model cannot choose transfer numbers, change billing or create bookings.
5. Speech-start detection aborts the previous response and clears queued playback. Transcript turns mark interrupted assistant speech. Bounded buffers, start/provider timeouts, a silence timeout, duration limits, periodic consent checks and failed persistence/provider handling end the call instead of continuing without a functioning recognizer or authorization check. Opt-out updates normalized contact suppression immediately.
6. A human request or DTMF `0` uses a configured server-owned transfer destination. The service requests a Plivo call redirect, then closes its media socket; signed transfer XML dials the destination within the remaining duration. This is **cold transfer to a telephone number**, not warm transfer, conference supervision or a staffed contact-center integration. DTMF `9` opts out. Real transfer behavior still needs acceptance.
7. Hangup events trigger a direct, authenticated Plivo CDR lookup; callback duration is never billing authority because customers know their own signing token. The CDR must match the call UUID, caller and destination and show a supported terminal outcome. Platform AI usage is measured independently from the one-time stream claim until trusted runtime closure, capped by the agent limit and rounded to started minutes. No stream means zero AI usage. The meter closes before hangup or cold transfer; transferred human time is not AI runtime. A claimed stream without a persisted runtime closure keeps its reservation held for reconciliation, including service crashes. Duplicate completion is idempotent; conflicting or unexpectedly large provider duration stays unresolved. Ambiguous dialing never automatically redials or releases credit. The reconciliation command also requires the completed CDR and finalized AI meter; records without a confirmed UUID or recoverable meter require manual review.

## Configuration

Use Node 24. Apply all six Supabase migrations and configure the web app’s Supabase authentication, workspace membership and MFA. Shared Sarvam/Cartesia and database credentials belong in server environment/secrets storage. Customer Plivo credentials are accepted only by the authenticated connection API, not by the sample console, workspace planning document or browser storage. Never put credentials in browser-exposed variables.

| Variable | Purpose |
| --- | --- |
| `VOICE_PUBLIC_URL` | Exact HTTPS origin of the persistent service, such as `https://voice.example.com`; no path, query, credentials or localhost |
| `VOICE_PORT` | Internal listener port; default `8080` |
| `VOICE_SERVICE_MAX_SESSIONS` | Per-process media-session cap; default `20`; database workspace/agent limits also apply |
| `AWS_REGION`, `AWS_KMS_KEY_ID` | Region and KMS key for workspace Plivo connection tokens; the web control plane encrypts/decrypts and the voice service decrypts |
| `SARVAM_API_KEY` | Realtime STT and conversational LLM |
| `CARTESIA_API_KEY` | Speech synthesis |
| `CARTESIA_VOICE_EN`, `CARTESIA_VOICE_HI` | Valid provider voice UUIDs selected and tested for each language |
| `NEXT_PUBLIC_SUPABASE_URL` | Database API origin; this URL itself is public |
| `SUPABASE_SERVICE_ROLE_KEY` | Private server-only database credential |
| `VOICE_CALLING_ENABLED` | Explicit runtime gate; defaults to false in the web app and voice service |

The web control plane needs the same shared voice configuration to request calls. Its normal app URL/auth/mail settings remain separate. Do not set `PLIVO_AUTH_ID` or `PLIVO_AUTH_TOKEN`: they are no longer read for calling. Its AWS role needs `kms:Encrypt` and `kms:Decrypt` on the integration key; the voice service needs only `kms:Decrypt` with `kms:EncryptionContext:provider=plivo`. The encrypted payload is bound to `{workspaceId, connectionId, provider: "plivo"}`. KMS key policy must also permit these restricted role permissions. `LIVE_SENDING_ENABLED` and `PAID_CHECKOUT_ENABLED` do not authorize voice calling and should remain disabled until their own acceptance gates pass.

After the customer connects their account and selects an owned caller number, platform operators must provision `voice_settings` with explicit test/approved destinations, transfer number if used, concurrency and disabled initial state. They must also provision a genuine approved `voice`/`minute` credit rate and expiring `integration_acceptances` evidence for the workspace through trusted server administration. These tables have no browser write policy or self-approval UI. Do not invent acceptance evidence or turn on calling merely to make readiness indicators green.

## Customer account connection

In **Account → AI Calling → Connection & live calls**, a workspace owner/administrator with verified MFA enters their own Plivo Auth ID and Auth Token. `/api/integrations/plivo` performs read-only provider checks of the account and its owned voice-enabled numbers before it stores a KMS-encrypted token. Selecting a caller requires one of those verified numbers. A successful connection does not grant live-call acceptance or enable calling.

The API returns connection status, masked account information and verified number choices; it never returns the token. The browser clears the credential inputs and never writes them to localStorage or the planning document. Runtime loaders decrypt only for the requested workspace/call and do not cache credentials across calls. Do not paste customer credentials into chat, configuration drafts, logs or source control.

Rotation/reconnection and disconnect are blocked while any unfinished call uses the connection, including uncertain calls awaiting reconciliation. This preserves the account/token needed to validate late callbacks and reconcile charges. Finish or manually reconcile those calls first. Disconnect removes the stored encrypted token and disables the connection; historical call identity remains for audit. Do not delete old identity bindings or release held credits merely to permit disconnect.

The platform’s Sarvam/Cartesia credentials remain server-managed. The customer pays Plivo for their account’s telephony; platform AI usage is separately metered using the approved credit catalog. No tested commercial rate or provider invoice reconciliation is implied by a connection.

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

Run reconciliation as a restricted scheduled task with server credentials. It processes up to 100 due pending calls older than 20 minutes in stable order. It settles only confirmed completed CDRs with matching call identity/numbers, valid billed duration, a supported answer/hangup outcome and finalized AI usage for claimed streams. Retryable failures use bounded exponential backoff, with at most six attempts; records with missing provider identity, unsupported outcomes or exhausted retries enter a separate manual queue so they cannot starve later work. No scheduler or manual-review console is deployed by this repository. Never automatically redial uncertain launches or release their reserved credits without confirming the provider outcome.

## AWS deployment runbook

`infra/voice` defines an internet-facing HTTPS Application Load Balancer, an ECS Fargate cluster/service in private subnets, task/execution roles, Secrets Manager injection, log retention, health checks and an unhealthy-target alarm. It expects infrastructure supplied by the hosting environment; it does not purchase a domain, create the VPC/NAT, issue a certificate, create ECR/secrets/SNS, deploy the Next.js app or configure DNS.

1. Use separate staging and production databases, provider configuration and AWS state. Supply an existing VPC, public ALB subnets and private ECS subnets with DNS and outbound HTTPS access. Private tasks need NAT or suitable endpoints for image/log/secret access plus outbound connectivity to Plivo, Sarvam, Cartesia and Supabase. Tasks receive no public IP; port 8080 accepts traffic only from the ALB security group.
2. After purchasing the domain, choose a voice hostname. Issue and validate an ACM certificate for it in the ALB's region. `VOICE_PUBLIC_URL` and callback verification must use exactly this public origin. Do not derive signature URLs from arbitrary forwarded host headers. DNS will point to the ALB; leave calling disabled during setup.
3. Create a restricted Secrets Manager JSON secret with the six shared keys referenced by `infra/voice/main.tf`: `SARVAM_API_KEY`, `CARTESIA_API_KEY`, `CARTESIA_VOICE_EN`, `CARTESIA_VOICE_HI`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. It contains no Plivo account/token. Supply its ARN and, when customer-encrypted, its Secrets Manager KMS key ARN as `secret_kms_key_arn`. Separately supply the workspace-token encryption key as required `integration_kms_key_arn`; the task receives that public key ARN and `AWS_REGION` in its environment and has only context-restricted `kms:Decrypt` on it. The execution role’s optional Secrets Manager decryption permission is separate. Configure the web control plane’s restricted encrypt/decrypt permissions on the integration key. Do not store secret values in Terraform variables, source control, image layers, task plaintext environment or logs.
4. Build the image from the repository root, scan it and push to your ECR repository. The checked-in Dockerfile exists, but Docker is unavailable in this development environment, so this image has **not** been built or started here.

```sh
docker build -f services/voice/Dockerfile -t sprint-voice:staging .
```

Use your registry's authenticated push flow and pin the resulting ECR image digest (`repository@sha256:...`) in Terraform. The module rejects an unpinned image tag. The runtime runs as a non-root user; ECS mounts its root filesystem read-only and disables the TSX disk cache.

5. Configure module inputs: `environment`, `region`, `vpc_id`, `public_subnet_ids`, `private_subnet_ids`, `certificate_arn`, `domain`, digest-pinned `image`, `secret_arn`, optional `secret_kms_key_arn`, required `integration_kms_key_arn`, and an existing operational `alarm_topic_arn`. Keep `calling_enabled=false`. Configure durable, access-controlled remote Terraform state and locking for the hosting environment.

```sh
terraform -chdir=infra/voice init
terraform -chdir=infra/voice fmt -check
terraform -chdir=infra/voice validate
terraform -chdir=infra/voice plan -var-file=staging.tfvars
```

Inspect the plan before deploying through the hosting workflow. No `apply` has been run. Local format and validation passed with AWS provider 6.70.0 after the BYO-Plivo IAM changes. Validation does not prove IAM, network routing, secrets, TLS or provider connectivity in AWS. GitHub Actions now includes a voice Docker build and Terraform validation, but those hosted checks have not been observed running successfully.

6. Point DNS at the ALB. Verify certificate, `/healthz`, HTTPS form callbacks and WSS upgrades through the actual load balancer. The module's idle timeout accommodates the supported call duration; no proxy/CDN may buffer media or strip signature headers. Keep query-token URLs out of access logs/traces. Configure the web app with the same voice public origin, integration KMS key and shared speech credentials through its own secret mechanism. Connect a dedicated customer-owned staging Plivo account through the authenticated screen.
7. Complete controlled staging acceptance using approved test destinations and documented evidence. Confirm hosted auth/MFA/RLS, read-only Plivo account/number verification, cross-workspace credential isolation, wrong-account callback rejection, token rotation/disconnect blocking, one-time sessions, actual speech/audio, interruption latency, silence/disconnect behavior, opt-out, duration enforcement, call stop, cold transfer including failure/busy, duplicate callbacks, ambiguous dial recovery and wallet reconciliation against provider records. Validate deployment draining and container restart behavior before production. Production calling requires its own accepted evidence and enabled workspace/runtime settings; a healthy container is insufficient.
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


## PRD voice update — 26 October 2026

Apply all **seven** migrations, including `0007_voice_prd.sql`. The authenticated builder now saves Sarvam Bulbul v3 voice/speed, qualification questions, end rules and warm/direct handoff mode. New builder agents default to Sarvam; existing agents keep Cartesia. Sarvam speech uses the direct HTTP streaming endpoint with `output_audio_codec=mulaw`, 8000 Hz and progressive Plivo playback; no complete-utterance buffering is required. Buffers, per-utterance audio and timeouts remain bounded. The LLM still returns a complete short JSON response before speech starts, so a one-second end-to-end target is not proven.

The common voice configuration no longer requires Cartesia secrets. If an agent chooses Cartesia, call-bound configuration must validate its key and both language voice UUIDs before dialing. For ECS, the required shared secret keys are `SARVAM_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Set `cartesia_enabled=true` and include the three `CARTESIA_*` keys only for Cartesia agents. Web environment configuration must follow the same choice. Existing earlier tables describing six mandatory keys are superseded by this section.

Warm handoff now uses Plivo `Dial` confirmation: the AI meter closes, a bounded English summary is prepared, the stream redirects, and the teammate hears the summary and must press 1 before bridging. The service saves only a hash of the expiring whisper capability. Whisper callbacks accept signed GET/POST, validate the call/capability/expiry/stop/consent state and return escaped XML. Summary preparation or persistence failure ends the call; it does not silently downgrade to a direct transfer. Busy/no acceptance has a spoken fallback. This is an assisted telephone handoff, not a supervised three-party conference. Existing direct transfer remains selectable. Validate prompt/DTMF timing, both call legs, busy/rejection and carrier billing with the real provider before activation.

Completed calls queue durable analysis jobs. Schedule `npm run voice:analyze` as a separate restricted task after deployment. The command is a bounded one-shot batch of five, disabled unless calling is enabled and Sarvam is configured. The database also requires enabled workspace settings and unexpired voice acceptance before leasing a job; revoked/expired workspaces remain queued without provider requests. Each job has a two-minute lease, bounded backoff and five attempts; an expired final lease becomes failed rather than vanishing. Only the current lease may complete/fail a job. Model output is schema-checked and answers must match the original questions. No-caller-speech calls produce deterministic results without an LLM request. Summaries/outcomes appear in account call details and write analysis/hot-lead activity events. External notifications are not sent. Real caller speech transactionally stops active enrollments and pending/queued outreach; no unattended send executor is activated.

The SQL migration removes old acceptance records and disables workspace calling because these behavior changes require fresh staging acceptance. Test streaming codec/rate, voice/speed, interruption mid-synthesis, transfer summary/confirmation/expiry/stop races, worker lease expiry/retry/crash behavior, classification quality and AI-credit reconciliation. Private recordings, reusable scripts, preview, bulk/sequence execution and inbound routing remain missing. See [the full PRD tracker](../../docs/PRD_IMPLEMENTATION.md).

Provider references checked in this pass: [Sarvam HTTP streaming](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/streaming-api/http-stream), [Bulbul voices/parameters](https://docs.sarvam.ai/api-reference/text-to-speech/convert), [Plivo Dial confirmation](https://docs.plivo.com/docs/voice/xml/routing). Model/speaker combinations are pinned to Bulbul v3 rather than silently switching to the newer voice catalog.
