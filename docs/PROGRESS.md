# Alchemy implementation and verification

Verified October 3, 2026 in the local application. Current visual reference: [Cosmos](https://www.cosmos.so/). Source migration is maintained separately from generated recordings, credentials, model session files and browser exports.

## Delivered locally

The landing page, customer gallery, trial workspace and login use a shared light photographic visual system. Original generated images have documented provenance; examples do not imply actual adoption or measured impact. Motion cleans up on unmount and respects reduced motion. Search and route links lead to usable customer trial pages.

A browser journey creates a customer from conversation notes, defines a baseline and trial, records both plan reviews, enters a compatible measurement, checks the pinned report and next-action task, exports and inspects the report, reloads it, and records an inconclusive commercial decision without inferring payment.

The domain and SQL layer include immutable plan versions and evidence, scoped customer acknowledgment, customer-owned task updates, private attachment metadata, reminder deduplication and atomic measurement/report/action receipts. Hosted storage, authentication and scheduled execution remain unverified.

Six real local Codex analyses have source-validated receipts across the five roles. The latest Treasurer run completed with the new Alchemy-aware prompt. Output correctly distinguishes fictional legacy observations from current trial plans and does not infer acceptance or payment. Provider authentication, execution, validation and persisted output were visible in the app. Local record files remain excluded from Git.

## Verification

- TypeScript check and production build passed.
- 63 unit, embedded PostgreSQL and mocked-provider tests passed.
- 17 browser tests passed, including the complete trial journey and downloaded JSON report inspection.
- Zero reported axe violations across six general routes and five populated trial pages; this is bounded automated evidence.
- Desktop and 390px mobile screenshots were inspected; horizontal overflow and reduced-motion checks passed.
- Production dependency audit reported zero vulnerabilities.

Current screenshots are in local `media/screenshots/`; generated test outputs are excluded from source control. Earlier video recordings show the previous interface and are historical evidence only.

## Remaining external gates

Supabase project configuration, Google/email authentication, two independent real accounts, customer invitation/revocation, private file upload/download and Inngest hosted recovery still require live verification. Application OpenAI API access, Gemma and ElevenLabs also require account credentials and real receipts. No public application deployment or real customer outcome is claimed.

Computer use reached Supabase sign-in, which displays Terms acceptance. The user must complete that account step before the integration can be configured. The setup guide lists all six migrations and the exact remaining checks.
