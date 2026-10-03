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

Server-side Supabase adapters implement scoped membership, invitations, immutable trial records, private attachments and transactional customer updates. Inngest adapters implement durable in-app reminders, trial-end result review and reviewed automatic customer emails. The separate Alchemy Supabase project has migrations 001–009 applied, with hosted schema/RLS/grant checks and a private evidence bucket verified. Application credentials, authenticated app sessions, private file transfers and scheduled provider actions still require end-to-end verification.

## Frontdesk onboarding and provider actions

`/demo/frontdesk` recreates the requested website-and-document onboarding flow inside Alchemy. It reads bounded public website content and text/Markdown/text-PDF documents, runs genuine AI fact extraction, and presents editable facts with exact source citations. Owner corrections retain the extracted value and original citation. The onboarding asks about missing information and requires each fact to be verified before saving the operating knowledge base. A real local Codex run extracted ten cited facts from fictional business input; this is model execution proof, not proof of a real business's accuracy or connected phone service.

Live booking adapters check the approved knowledge brief, configured business hours and Google Calendar availability, reserve a durable booking key, create a confirmed event and optionally submit an explicitly consented Twilio SMS. Receipt refresh distinguishes delivery from submission and never repeats the action. Customer email automation includes recipient/template/schedule review, previews, pause controls, durable deduplication and provider delivery history. Send-only Resend keys use signed delivery webhooks matched to the saved message, sender and recipient; API receipt polling is used only without a configured webhook and requires read access. Real email, SMS and calendar tests are authorized by the user but still need configured accounts and exact test recipients/appointment details. See [Frontdesk](docs/FRONTDESK.md), [email automation](docs/EMAIL-AUTOMATION.md) and [provider test plan](docs/PROVIDER-TEST-PLAN.md).

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

October 3, 2026 verification: 157 unit/SQL/mocked-provider tests across 13 files passed, with a successful production build and typecheck. The final production regression run passed all 24 browser tests, including seven focused Frontdesk checks. Browser checks include the complete notes-to-plan-to-results journey, Frontdesk onboarding, export inspection, persistence, mobile layout, reduced motion and accessibility checks. Hosted Supabase structural checks are recorded separately; embedded PostgreSQL and mocked provider tests do not establish application connectivity or external delivery.

## Handoff

- [Product direction](docs/ALCHEMY-DIRECTION.md)
- [Current verification](docs/PROGRESS.md) and [machine-readable readiness](docs/READINESS-REPORT.json)
- [Account setup](docs/SETUP.md) and [known limits](docs/KNOWN-LIMITS.md)
- [Architecture](docs/ARCHITECTURE.md) and [original V5 brief](docs/BUILD-SPEC-V5.md)

The earlier LaunchGuild capacity, evidence and partner tools remain available as supporting tools. Original recordings and exports stay local; they show an earlier interface and do not prove the current design or hosted integrations. Configured live email, SMS and calendar adapters are implemented, but no external send or booking receipt has been verified. Automatic telemetry, payment collection and customer environment provisioning are not implemented.
