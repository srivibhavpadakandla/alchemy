# Alchemy implementation and verification

Verified October 3, 2026 in the local application. Current visual reference: [Cosmos](https://www.cosmos.so/). Source migration is maintained separately from generated recordings, credentials, model session files and browser exports.

## Delivered locally

The landing page, customer gallery, trial workspace and login use a shared light photographic visual system. Original generated images have documented provenance; examples do not imply actual adoption or measured impact. Motion cleans up on unmount and respects reduced motion. Search and route links lead to usable customer trial pages.

A browser journey creates a customer from conversation notes, defines a baseline and trial, records both plan reviews, enters a compatible measurement, checks the pinned report and next-action task, exports and inspects the report, reloads it, and records an inconclusive commercial decision without inferring payment.

The domain and SQL layer include immutable plan versions and evidence, scoped customer acknowledgment, customer-owned task updates, private attachment metadata, reminder deduplication and atomic measurement/report/action receipts. The separate Alchemy Supabase project has reviewed migrations 001–009 applied in a transaction. Hosted read-only catalog checks verified RLS and expected API grants on 32 tables, 32 read policies and grants on 13 functions; no anonymous table access or direct authenticated writes were granted. Booking lease/service sequencing and the two email retry/closure indexes were present. The `alchemy-evidence` bucket was verified private with a 5 MiB limit and PDF/PNG/JPEG allowlist. These structural checks do not establish an authenticated application session, scoped two-account behavior, private file transfer or scheduled execution.

Six real local Codex analyses have source-validated receipts across the five roles. The latest Treasurer run completed with the new Alchemy-aware prompt. Output correctly distinguishes fictional legacy observations from current trial plans and does not infer acceptance or payment. Provider authentication, execution, validation and persisted output were visible in the app. Local record files remain excluded from Git.

Frontdesk now supports public website intake, real-parser-verified text-PDF intake, text/Markdown parsing, genuine AI extraction with exact source IDs and quotations, draft knowledge versions, missing-information questions and verified owner corrections with provenance. A real local Codex extraction returned ten cited facts from fictional business sources; its private execution receipt recorded 29,851 tokens. All ten source quotations were checked in the app. The owner review corrected a descriptive appointment duration to 30 minutes while preserving its extracted wording and original citation, confirmed the facts, saved the brief and reloaded it; all ten confirmed facts and the business-specific booking purpose persisted. This demonstrates actual model execution rather than fabricated findings, but does not establish hosted API access, real business accuracy or a connected voice number.

Calendar booking, opt-in SMS and reviewed customer email adapters are implemented. Bookings require the exact latest owner-approved knowledge brief and its server-side fingerprint, validate agreed appointment duration/time zone/business hours and provider availability, reserve an immutable key, protect overlapping local reservations and reconcile saved receipts without repeating events or SMS. Email rules include reviewed previews, per-pilot recipients and schedules, customer-only tasks, pause controls, durable event/recipient deduplication and provider delivery receipts. Send-only Resend credentials can use `/api/email-delivery` with an official Svix-verified signature and timestamp; receipts must match the already saved provider ID, sender and recipient. Duplicate or out-of-order events do not regress terminal outcomes, and negative receipts can override earlier delivery receipts. Webhook configuration disables API polling; polling otherwise requires read access. These signed-event tests are local validation, not actual email delivery proof. External sending and booking remain unverified because provider credentials and exact test destinations are not configured. The user has now authorized these live test actions; authorization and successful execution remain separate.

## Verification

- TypeScript check and production build passed.
- 157 unit, embedded PostgreSQL, signed-webhook and mocked-provider tests across 13 files passed.
- The final production regression run passed all 24 browser tests, including seven focused Frontdesk checks.
- Zero reported axe violations across six general routes and five populated trial pages; this is bounded automated evidence.
- Desktop and 390px mobile screenshots were inspected; horizontal overflow and reduced-motion checks passed.
- Production dependency audit reported zero vulnerabilities.

Current screenshots are in local `media/screenshots/`; generated test outputs are excluded from source control. Earlier video recordings show the previous interface and are historical evidence only.

## Remaining external gates

Supabase application credentials, Google/email application authentication, two independent real accounts, customer invitation/revocation, private file upload/download and Inngest hosted recovery still require live verification. Application OpenAI API access, Gemma, ElevenLabs inbound voice, Google Calendar, Twilio SMS and Resend email also require account credentials and real receipts. No public application deployment or real customer outcome is claimed.

After the user's explicit Terms approval, Supabase sign-in completed and the user created the separate healthy Alchemy project. The user authorized configuration of Alchemy only; unrelated projects were left untouched. Hosted schema and bucket structure were verified as described above. Local application key transfer remains pending because computer-use restrictions blocked typing secrets into Terminal; the user must save them directly into local configuration. The [provider test plan](PROVIDER-TEST-PLAN.md) distinguishes completed hosted structure from remaining app/auth/provider checks. No secret values are included in public source or this report.

## Supabase auth configuration

Provider redirect URLs now use the exact `/auth/callback` path with no return-path query. A sanitized local return path is kept in a ten-minute `SameSite=Lax` cookie scoped to that callback, marked Secure on HTTPS and cleared on callback success or failure and successful code verification. Failed exchanges preserve the sanitized return path in the retry URL without forwarding the provider code. Existing PKCE exchange and code verification remain unchanged; safe legacy query returns remain supported. Four routing regressions are included in the passing 157-test suite; typecheck and the final production build passed. The final 24-test browser regression also passed.

The Alchemy project now has Site URL `http://localhost:3210` and one exact allowlisted redirect, `http://localhost:3210/auth/callback`, saved and visibly verified. No wildcard or new login provider was added. The default authentication template currently sends a magic link. The existing PKCE callback exchanges its authorization code for a session, and login copy now explains both links and optional codes; actual authenticated app execution is still pending keys. Editing the template to include `{{ .Token }}` is blocked by the dashboard until custom SMTP is configured; the displayed alternatives are a paid upgrade or a Send Email hook. Neither was activated. Local project URL presence is verified, but publishable/service keys remain absent. Application login and email-code delivery are still unverified.
