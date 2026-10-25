# Voice runtime — not activated

Deploy a persistent WebSocket service to ECS Fargate; Vercel handles control-plane requests only. Plivo media streaming must be tested with the selected account and destinations before activation. No real-time audio implementation is claimed in this milestone.

Required runtime sequence:

1. Verify Plivo request signatures and a one-time, expiring call session token. Load tenant and agent from the server-created call record, never caller-supplied workspace data.
2. Reserve maximum call credits atomically before dialing. Enforce consent, timezone, destination allowlist, concurrency, and duration.
3. Stream Hindi audio through Sarvam, English audio through Cartesia; run the selected conversational LLM behind a bounded tool interface. Pin models after compatibility tests.
4. Handle interruption, silence, provider timeouts, disconnect, recording disclosure, and human transfer. Do not allow agent instructions to override authorization or billing checks.
5. Persist normalized outcomes and private S3 recording keys. Settle actual duration from verified Plivo events and release unused reservation. Uncertain outcomes require reconciliation, never blind redial.

Production blockers: real Plivo credentials and number, approved destination requirements, speech accounts, conversational LLM selection/credentials, live latency and transfer acceptance tests.
