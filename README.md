# Alchemy

A shared workspace for customer trials: agree on the plan, track the work, compare sourced results, and record an explicit commercial decision. AI analysis supports this workflow; people approve commitments and sales decisions.

The current website follows the requested [Cosmos](https://www.cosmos.so/) direction: floating original photography, a light canvas, centered sans-serif type, rounded controls and spacious galleries. The customer board, trial pages and sign-in share the visual system. See [design notes and image prompt](docs/COSMOS-DESIGN.md).

## Run locally

```sh
npm ci
npm run dev
```

Open http://localhost:3210. `/demo` uses fictional records stored in this browser. `/app` requires configured authentication and never falls back to demo data. Account setup is in [SETUP.md](docs/SETUP.md).

## Working trial flow

- Create a customer and preserve conversation notes as a source.
- Define a versioned trial with deliverables, responsibilities, dates, baseline, success target, observation method, normalization and a separate paid offer. Changed terms require fresh reviews.
- Review the exact plan version. The implemented live customer portal supports scoped acknowledgment and customer-owned task updates.
- Assign tasks, record completion evidence and missing inputs, and enter sourced measurements.
- Compare only compatible observations. Missing, stale or disputed evidence stays visible; a result does not establish acceptance or payment.
- Export a pinned results report with sources and action receipts, then record accept, decline, extend, pause, stop or inconclusive decisions. Payment evidence remains separate.

Server-side Supabase adapters implement scoped membership, invitations, immutable trial records, private attachments and transactional customer updates. Inngest adapters implement durable in-app reminders and trial-end result review. These hosted paths require configuration and live verification.

## Real local agents

`/demo/agents` shows actual queued/working events, source-validated output, execution receipts, cancellation and reload persistence. Five roles have completed real local Codex runs; six analyses were validated locally, including a fresh Treasurer run with the Alchemy trial packet. The analyzed records are fictional.

With an existing `codex login` session, set `LOCAL_CODEX_ENABLED=1` in `.env.local`. The app binds to loopback. This optional local provider must remain disabled on hosted deployments. Hosted OpenAI, Gemma and ElevenLabs integrations are implemented but unverified; no keys or session records are committed.

## Verify

```sh
npm run typecheck
npm test
npm run build
npm start
```

In a separate terminal:

```sh
npm run qa
```

October 3, 2026 verification: 63 unit/SQL/mocked-provider tests and 17 browser tests passed, with a successful production build and typecheck. Browser tests include the complete notes-to-plan-to-results journey, export inspection, persistence, mobile layout, reduced motion and accessibility checks. Embedded PostgreSQL and mocked provider tests do not establish hosted connectivity.

## Handoff

- [Product direction](docs/ALCHEMY-DIRECTION.md)
- [Current verification](docs/PROGRESS.md) and [machine-readable readiness](docs/READINESS-REPORT.json)
- [Account setup](docs/SETUP.md) and [known limits](docs/KNOWN-LIMITS.md)
- [Architecture](docs/ARCHITECTURE.md) and [original V5 brief](docs/BUILD-SPEC-V5.md)

The earlier LaunchGuild capacity, evidence and partner tools remain available as supporting tools. Original recordings and exports stay local; they show an earlier interface and do not prove the current design or hosted integrations. The app does not send email, observe live telemetry, collect payments or provision customer environments.
