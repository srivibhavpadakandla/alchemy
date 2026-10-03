# Known limits and unresolved acceptance

Alchemy is a working local customer-trial application with implemented provider adapters. It is not a verified hosted service, and the complete V5 acceptance gate is not met.

## Account-dependent acceptance

Supabase authentication, real independent users and deployed RLS, hosted OpenAI API model access, hosted Inngest recovery, Gemma evidence review, ElevenLabs microphone/voice/disconnect, and deployed share/invite/revocation all remain unverified. Configured code, mocked tests and embedded PostgreSQL are separate evidence. No public deployment is available. Real local Codex task receipts are recorded separately in `artifacts/local-agent-proof.json`; they do not prove the hosted API path.

## Product boundaries in this build

- Private upload/download adapters, scoped customer task updates and scheduled in-app reminders are implemented and SQL-tested, but live hosted storage, customer sessions and job recovery have not been verified.
- Trial results use source-backed manual observations; there is no automatic telemetry or external invoice/payment confirmation. Task completion evidence remains separate from a measured target.
- Full backups and tested restoration, delivery monitoring and a production operational runbook remain release gates.

- Imported text and CSV create editable records. There is no automated web research, CRM/email sync, document parser, telemetry connector, billing connector or customer environment provisioning.
- JSON reimport creates corrections only for supported matching partner fields. It is not a complete historical archive restore; exports retain the full serialized state for inspection.
- Work can represent per-account setup as separate items/dependencies. The application does not automatically decompose a shared integration into per-account deployment tasks.
- The request/work graph is explicit and founder-reviewable. A genuine Smith run produced source-checked reuse and classification findings; proposals remain subject to founder review. No canonical source contradiction was invented.
- Changes conservatively stale all saved plans when the planning input hash changes, including changes outside a selected scenario. Fine-grained per-field dependency invalidation is not implemented.
- Audit history retains action/version/actor/time. Sources, agreement amendments, correction proposals and decision snapshots retain their respective evidence; arbitrary manual field edits do not have a complete before/after event-sourced replay. There is no general replay player.
- The Agents workspace displays stored actual execution states and validated results. Trial pages remain stable while those supporting tasks run.
- No consenting intended-founder study occurred. Demand, willingness to pay, business savings, conversion improvement and judge preference are unknown.
- The original videos are truthful recordings of the earlier local demo interface. Current screenshots show the Cosmos-inspired interface and real local Codex results. The original videos do not show the redesigned UI or verify Gemma/ElevenLabs. Captions use scene/chunk timing rather than forced word alignment. Human listening and subjective delivery polish remain a review step.

These limits are disclosed so the handoff does not confuse implemented local behavior, adapter code, and real external proof.
