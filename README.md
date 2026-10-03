# Alchemy

**Manage the customer trial. Prove the value. Support the sale.**

Alchemy is becoming a shared workspace for startup customer pilots: agreed trial plans, tasks, deadlines, measured results and a report supporting the paid-offer decision. See [the product direction and production release gates](docs/ALCHEMY-DIRECTION.md).

This initial repository contains the implemented LaunchGuild baseline. Its screens and internal identifiers are being migrated; the complete Alchemy workflow and hosted production integrations are not yet verified. Recordings and generated handoff archives mentioned below are local-only and excluded from Git, along with credentials, local agent sessions, dependencies and build outputs.

## Existing implementation baseline

**Turn your first design partners into customers without building five different products.**

An implemented local Next.js application with a monochrome editorial workspace, three explicitly fictional design partners, versioned partner/evidence records, deterministic capacity comparisons, reviewed commitments and source-backed readiness checks. See `docs/KNOWN-LIMITS.md` for remaining V5 acceptance gaps.

```sh
npm ci
npm run dev
```

Open **http://localhost:3210/demo**. Login/title screen: **http://localhost:3210**.

## Current design and real local agents

The landing page and workspace use the requested Optiflux/Polsia direction: original monochrome office and robot-team imagery, serif type, an orange signal band, metallic controls and a live execution terminal. See `docs/OPTIFLUX-DIRECTION.md` for the reference study and art provenance. Open `/demo/agents` to inspect actual task events and cited results. With `codex login` already complete, set `LOCAL_CODEX_ENABLED=1` in `.env.local`; the local server binds to loopback only. No API key extraction is used. Source material is sent to the signed-in Codex model only when a task is started. See `docs/REDESIGN.md` for the reference study, execution limits and art provenance.

## What works locally

- Isolated transactional demo persistence, reset, partner editing and evidence entry.
- Exact-source request/work relationships, reviewed class/estimate edits, scoped correction proposals, conflict detection and versioned undo.
- Dependency closure, estimate ranges, reserves, distinct opportunity attribution, concentration illustrations and reviewed idempotent plan commits.
- Pilot drafts/amendments, reciprocal terms, promise ledger, metric observations, readiness review and explicitly evidenced outcome/payment actions.
- CSV mapping/preview (commit requires live program), JSON export, redacted plan export and proposed canonical reimport corrections.
- Editorial workspace and five real local Codex role tasks with public activity receipts, source-checked findings, cancellation and reload persistence. Equivalent text retrieval tools and a microphone-off default.
- Supabase server-auth/RLS/membership/share/invitation adapters and migrations; durable Inngest role-job adapter; actual OpenAI Responses, Gemma and ElevenLabs adapters with server-only credentials and scope checks.

**The last bullet describes implemented adapters, not verified hosted integrations.** There are no fabricated AI runs, customer conversions, revenue, testimonials or provider receipts. The optional local Codex path uses the existing ChatGPT sign-in; see `docs/REDESIGN.md`. Hosted authentication, the application OpenAI API path, Gemma/ElevenLabs sponsor proof and public deployment remain unverified.

## Verify

```sh
npm run typecheck
npm test
npm run build
npm run dev
```

With the server running in another terminal:

```sh
npm run qa
```

Current verification: 45 unit/SQL/provider-contract tests and 15 browser tests passed; typecheck and production build passed.

Tests cover seed arithmetic, duplicate/stale commits, conflict preservation, readiness semantics, SQL account isolation, budget reservation, schema/citation validation and browser journeys. Provider tests are explicitly mocked. Embedded PostgreSQL tests are not proof of a deployed Supabase project.

## Demo arithmetic

| Selection           | Selected / total points | Remaining | Conditional annual opportunity |
| ------------------- | ----------------------: | --------: | -----------------------------: |
| Salesforce          |                 20 / 70 |        30 |                        $38,000 |
| Salesforce + CSV    |                 28 / 78 |        22 |                        $38,000 |
| Custom approval     |                 46 / 96 |         4 |                        $50,000 |
| Salesforce + custom |                66 / 116 |       −16 | $88,000 associated; overbooked |

Reserved capacity is always 35 core + 15 support. Custom-only future conversion concentration is 100% with zero existing ARR. The separate all-three longer-horizon illustration is 50,000 / 88,000 = 56.82%. Neither is actual cash or expected conversion probability.

Northstar also contains a synthetic 98/100 metric receipt against a 95% fixture target. Its six confirmed checks do not clear the buyer, pricing, security or purchase-decision requirements. The fixture's measurement is pinned to demo day 21 (October 24, 2026), not a claimed real observation on the user's current date.

## Artifacts

- `docs/BUILD-SPEC-V5.md`: original user specification.
- `docs/SETUP.md`: account configuration and remaining real-world checks.
- `docs/PROGRESS.md` and `docs/JUDGING-EVIDENCE.md`: current evidence and precise limitations.
- `docs/ARCHITECTURE.md`: data and trust boundaries.
- `docs/DEVPOST-DRAFT.md`: editable, unsubmitted project description.
- `media/launchguild-demo-2min.mp4`, `media/launchguild-teaser-30sec.mp4`: recorded local application, with provider-proof limitations disclosed.
- `media/demo.srt`, `media/demo.vtt`, `media/teaser.srt`, `media/teaser.vtt`, `media/composition.json`, `media/narration-script.md`: captions and editable composition.
- `media/raw/`: genuine browser capture and scene screenshots.
- `media/screenshots/`: landing/login/town/partner/capacity/evidence/settings at requested viewports.
- `public/art/manifest.json`: original artwork and provenance manifest.
- `reviewer/`: separable claim-review component documentation/license; never a grant to publish private data.

The app neither builds RelayOps (the fictional existing MVP) nor sends email, syncs a CRM, provisions customer environments, observes live telemetry or collects payments. Those actions require their own configured connectors and receipts.

Source archive: `artifacts/launchguild-source.zip`. Complete local handoff: `artifacts/launchguild-v5-handoff.zip`. Integrity: `artifacts/SHA256SUMS`.
