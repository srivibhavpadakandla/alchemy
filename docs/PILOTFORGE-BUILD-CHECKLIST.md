# PilotForge build checklist

## Product outcome

PilotForge turns a customer conversation into a reviewed, measurable execution plan for every objective discussed, tracks the work and evidence during the pilot, and produces an objective-by-object impact report.

The hackathon proof is one continuous flow:

> Paste the food-bank call -> review the extracted facts -> approve two measurable objective plans and one blocking requirement -> track progress and missing evidence -> generate the final impact report.

This checklist is based on the repository as inspected on October 3, 2026. A checked item is implemented in the current LaunchGuild/Alchemy baseline. It does not imply that the feature has been renamed, deployed, or verified with real accounts.

## What the repository already has

- [x] Next.js 16 App Router application with local demo and authenticated app routes.
- [x] Typed Zod domain model and validated command layer (`src/lib/domain.ts`, `src/lib/commands.ts`).
- [x] Customer/partner records with problems, workarounds, people, opportunity signals, and lifecycle stages.
- [x] Immutable source records with provenance, hashes, dates, authors, and exact source text.
- [x] Customer requests linked to work items and exact source passages.
- [x] Separate promise ledger with actor, recipient, owner, deadline, state, conditions, and evidence.
- [x] Versioned pilot agreements with scope, exclusions, dates, reciprocal deliverables, cadence, one baseline, one target, one metric, measurement method, access, and exit terms.
- [x] Human review states for agreements; AI output cannot silently become a commitment.
- [x] Metric observations with source evidence and healthy/stale/unavailable states.
- [x] Product and commercial readiness checks, including champion, buyer, pricing, security, and purchase decision.
- [x] Deterministic calculations for the existing capacity/readiness workflows.
- [x] AI job infrastructure with bounded inputs, structured output validation, citations, stale-result quarantine, durable hosted jobs, and local Codex execution.
- [x] Demo persistence, Supabase persistence adapters, RLS migrations, memberships, invitations, redacted share links, history, and idempotent/version-checked writes.
- [x] Unit, database, provider-contract, browser, and accessibility test suites exist.
- [x] JSON export, redacted plan export, and correction-based reimport.

## Important gaps in the current baseline

- [ ] Replace the one-agreement/one-metric shape with a pilot containing multiple independently tracked objectives.
- [ ] Add transcript-to-structured-extraction as a first-class workflow. Source text can be entered today, but it is not transformed into a reviewable extraction packet.
- [ ] Add objective-level tasks, milestones, risks, check-ins, evidence requirements, owners, and deadlines. Existing work items and AI-generated next actions are not a shared task tracker.
- [ ] Add separate founder and customer approvals for extracted facts and the complete plan version.
- [ ] Add deterministic objective templates and calculations for time, cost, revenue, error/risk, and social/community impact.
- [ ] Add objective health and overall pilot health derived from tasks, evidence, deadlines, and metric progress.
- [ ] Add operational replanning when evidence is missing; today the app can label an observation unavailable but does not create and assign recovery work.
- [ ] Add an objective-based final impact report. The current share/export views are record snapshots, not a calculated before/after report.
- [ ] Replace the current LaunchGuild/Alchemy product language, guild-agent navigation, capacity-planning emphasis, and fictional fixtures with the PilotForge workflow.
- [ ] Verify the hosted system with real founder and customer accounts. Current provider and Supabase integrations are implemented but not proven in production.

## P0 — hackathon-critical build

### 1. Lock the PilotForge product contract

- [ ] Confirm `PilotForge` as the product name and update package metadata, page metadata, navigation, headings, exports, prompt names, and schema labels.
- [ ] Make the primary navigation: Calls, Plan, Tasks, Metrics, Report.
- [ ] Treat a technical constraint such as “preserve the existing system” as a launch requirement, not a fake measurable outcome.
- [ ] Define the rule that AI creates proposals only; a founder and customer must explicitly accept commitments.
- [ ] Keep commercial agreement and payment evidence separate from pilot success.
- [ ] Move capacity planning and the five guild personas out of the primary demo path; retain reusable job infrastructure behind the new workflow.

### 2. Introduce the multi-objective domain model

- [ ] Add a `Pilot` entity for one customer engagement, dates, status, participants, and current approved plan version.
- [ ] Add an `Extraction` entity pinned to a source version and model/prompt version.
- [ ] Add extracted fact categories: problems, importance, affected people, baselines, desired results, deadlines, budget signals, technical requirements, concerns, founder promises, customer promises, and purchase approvers.
- [ ] Store source citations and confidence/uncertainty on every extracted fact.
- [ ] Add an `Objective` entity with type, statement, baseline, target, unit, direction, measurement window, success threshold, status, and source citations.
- [ ] Support objective types: `time_saved`, `cost_reduction`, `revenue_increase`, `risk_reduction`, `social_impact`, and `custom`.
- [ ] Add a `Requirement` entity with pass/fail verification and a `blocksLaunch` flag.
- [ ] Add objective-scoped `Milestone`, `Task`, `Risk`, `CheckIn`, `EvidenceRequirement`, and `MetricObservation` entities.
- [ ] Give tasks a party (`startup` or `customer`), named owner, due date, state, dependency list, and completion evidence.
- [ ] Give evidence requirements expected period, source type, status (`pending`, `received`, `missing`, `stale`, `disputed`, `insufficient`), and linked observations.
- [ ] Add `PlanVersion` and per-party `Approval` records so edits never rewrite an accepted plan in place.
- [ ] Add objective supersession/amendment links; a new mid-pilot objective must not mutate historical scope.
- [ ] Add `ReportSnapshot` pinned to an approved plan version and observation/evidence versions.
- [ ] Update the state schema identifier and write an explicit migration from `launchguild-v1` rather than silently coercing old records.

### 3. Build call/notes ingestion and extraction review

- [ ] Create a “New customer call” flow with customer name, call date, participants, and pasted transcript/meeting notes.
- [ ] Preserve the submitted transcript as an immutable private source before any AI call.
- [ ] Add `.txt` upload for the hackathon; leave audio transcription and document parsing as post-hackathon work unless time remains.
- [ ] Create a strict structured-output schema for the twelve extraction categories and objective candidates.
- [ ] Require exact transcript spans for extracted claims and reject unknown or invalid citations.
- [ ] Detect contradictions, missing baselines, vague targets, missing owners, and statements that could be either requests or promises.
- [ ] Render a side-by-side review: transcript on one side, extracted facts/objectives on the other.
- [ ] Let the founder edit, accept, reject, or mark unknown each extracted item.
- [ ] Record reviewer, time, source version, and final disposition.
- [ ] Prevent plan generation until the founder completes extraction review.
- [ ] Show that customer approval is still pending; founder review alone must not imply customer agreement.

Acceptance check: the food-bank transcript produces two measurable objective candidates and one blocking integration requirement, each with the correct quote and without inventing budget, buyer, or commitments.

### 4. Generate an objective-specific plan

- [ ] Create one plan card per accepted objective and one gate card per accepted requirement.
- [ ] Generate Objective, Baseline, Target, Actions, and Evidence for every objective.
- [ ] Generate milestones, startup tasks, customer tasks, owners, deadlines, required data, risks, check-in dates, success metrics, and final proof requirements.
- [ ] Keep unknown values visibly unresolved instead of filling them with plausible numbers.
- [ ] Allow the founder to edit every generated field before sharing.
- [ ] Validate that target units match baseline and observation units.
- [ ] Validate that measurement windows are comparable and record exposure/normalization where needed.
- [ ] Block pilot launch when a blocking requirement is not verified or an objective lacks a measurable target/evidence plan.

Objective template calculations:

- [ ] Time: before/after time, people affected, hours saved, optional hourly value, total value.
- [ ] Cost: current cost, implementation cost, new cost, savings, ROI.
- [ ] Revenue: baseline conversion/revenue, opportunities affected, pilot revenue, annualized impact with assumptions.
- [ ] Error/risk: baseline error rate, severity/cost, pilot error rate, prevented events, impact.
- [ ] Social impact: people reached, access/resources, wait-time improvement, cost per person, comparison period.
- [ ] Custom: explicit formula definition, inputs, units, direction, and rounding policy.

Acceptance check: the generated food-bank plan contains food-waste reduction, volunteer-time savings, and existing-system integration as three distinct records with the actions and proof described in the product brief.

### 5. Add mutual plan review and approval

- [ ] Create a founder preview of the exact plan version that will be shared.
- [ ] Create a customer-safe plan view containing objectives, responsibilities, dates, evidence requests, requirements, and limitations.
- [ ] Let the customer accept, request changes, or dispute individual facts/objectives.
- [ ] Record who approved exactly which plan hash/version and when.
- [ ] Require both parties’ approval before status can become `active`.
- [ ] Invalidate approval when a material plan field changes and require fresh approval.
- [ ] Keep the previous approved version readable after an amendment.
- [ ] Do not expose internal notes, model reasoning, credentials, or unrelated customers in the shared view.

### 6. Build the live execution dashboard

- [ ] Show overall pilot health: `on track`, `at risk`, `blocked`, `complete`, or `insufficient evidence`.
- [ ] Show progress toward every objective target with baseline, current value, target, unit, and measurement period.
- [ ] Show requirement verification separately from metric progress.
- [ ] Show startup and customer task completion separately.
- [ ] Show days remaining, next check-in, overdue work, open risks, and missing evidence.
- [ ] Add task completion with notes and evidence attachment/source linkage.
- [ ] Add metric entry with source, period, collection method, health, and reviewer.
- [ ] Calculate progress and health in deterministic domain functions, not in AI-generated prose.
- [ ] Make unsupported results impossible to display as achieved.

Acceptance check: the demo dashboard can show 21% of a 25% waste target, 18 of 24 required hours, integration complete, party-specific task counts, nine days remaining, and missing week-three disposal data.

### 7. Implement evidence-aware replanning

- [ ] When expected evidence is overdue, mark the evidence requirement missing.
- [ ] Mark the affected metric/objective as insufficient or unreliable rather than treating missing data as zero.
- [ ] Create a recovery task assigned to the responsible owner.
- [ ] Recalculate whether the measurement window and deadline remain valid.
- [ ] Record the reason, actor/automation, timestamp, and affected plan/report fields.
- [ ] Notify the responsible person in-app for the hackathon; external email can follow later.
- [ ] Prevent the final report from claiming an unsupported outcome.
- [ ] When a new objective appears, add a versioned amendment and a separate objective.
- [ ] Require human approval before any AI-suggested deadline or scope change takes effect.

### 8. Generate the final impact report

- [ ] Build the report from pinned, reviewed records and deterministic calculations.
- [ ] Organize the report by objective: before, after, absolute/percentage change, target, and achieved status.
- [ ] Show requirements as verified/not verified with evidence.
- [ ] Show financial impact only when cost/value assumptions have explicit sources.
- [ ] Calculate ROI using documented cost and benefit inputs.
- [ ] Include evidence links, observation periods, assumptions, missing data, disputes, and limitations.
- [ ] Distinguish achieved, nearly achieved, not achieved, and unsupported.
- [ ] Draft recommendations with AI, but require founder review before publication.
- [ ] Add print/PDF-friendly output and a revocable customer share.
- [ ] Keep product continuation/expansion recommendations separate from an accepted commercial agreement or payment.

Acceptance check: the fixture report produces 600 -> 420 pounds, 30% improvement, 48 -> 25 hours, 23 hours saved, the sourced benefit/cost calculation, and “nearly—one hour below target” without upgrading it to success.

### 9. Create the flagship food-bank demo

- [ ] Add the exact food-bank transcript as an explicitly fictional fixture.
- [ ] Seed the three extracted plan records and all source citations.
- [ ] Seed four weeks of tasks/evidence, including missing week-three disposal data.
- [ ] Seed the dashboard state from the brief.
- [ ] Seed the final results and cost assumptions needed for the impact report.
- [ ] Add a resettable guided flow that starts at raw transcript and ends at report.
- [ ] Ensure the demo shows the transformation rather than starting with an already completed plan.
- [ ] Remove unrelated Salesforce/custom-approval fixture content from the primary path.
- [ ] Add empty, loading, AI failure, citation failure, stale output, and missing-evidence states.

## P1 — reliability and production completion

### Data, security, and operations

- [ ] Add database tables/indexes and RLS policies for pilots, extractions, objectives, requirements, tasks, risks, evidence requirements, approvals, observations, and reports.
- [ ] Preserve server-only writes, membership checks, CAS/version checks, mutation idempotency, and stale AI output quarantine.
- [ ] Add private object storage for transcript/evidence attachments with scoped signed access.
- [ ] Add consent, retention, deletion, and sensitive-transcript handling controls.
- [ ] Add audit before/after payloads for material edits and approvals.
- [ ] Add scheduled check-in/evidence deadline jobs with retry, deduplication, and visible delivery failures.
- [ ] Verify invitation expiry/revocation and role permissions with two real accounts.
- [ ] Verify backup and restoration.
- [ ] Add error monitoring, job monitoring, and provider usage/cost monitoring.

### Integrations

- [ ] Verify hosted OpenAI structured extraction and report drafting end to end.
- [ ] Decide whether local Codex, Gemma, and ElevenLabs remain in product scope; remove them from the hackathon story if they do not support the core flow.
- [ ] Add email notifications only after recipient consent and delivery tracking exist.
- [ ] Add audio transcription, calendar, CRM, document import, product telemetry, and billing as later adapters, not hackathon dependencies.

### Accessibility and responsive quality

- [ ] Verify the new flow at desktop and 390px mobile widths.
- [ ] Verify keyboard-only review, plan editing, task updates, and report access.
- [ ] Announce async extraction/progress/errors and preserve focus when dialogs close.
- [ ] Verify contrast, reduced motion, long transcripts, long customer names, and large objective lists.

## Technical migration map

- [ ] `src/lib/domain.ts`: add PilotForge schemas, types, migrations, deterministic metrics, objective health, and report calculations.
- [ ] `src/lib/commands.ts`: add reviewed extraction, objective/requirement, task, approval, observation, amendment, replanning, and report-snapshot commands with invariants.
- [ ] `src/lib/providers.ts`: replace generic role output for the primary flow with strict extraction and plan-draft schemas; retain citation validation and bounded inputs.
- [ ] `src/lib/jobs.ts` and API job routes: add extraction/plan/report job kinds and keep pinned inputs, retries, cancellation, and quarantine behavior.
- [ ] `src/lib/sharing.ts`: create purpose-specific customer plan/report projections instead of a generic redacted state snapshot.
- [ ] `src/components/Workspace.tsx`: replace guild navigation/routing with the PilotForge workflow.
- [ ] Split `src/components/PartnerPanel.tsx` into focused call review, plan, task, metric, approval, and report components instead of extending the existing 1,100-line component.
- [ ] Replace the current landing page and CSS theme copy with the transcript-to-plan story and a real product view.
- [ ] Add a new Supabase migration; do not rewrite already-applied migrations.
- [ ] Update demo store, repository serialization, imports/exports, and seeds to the new schema version.
- [ ] Update README, setup, architecture, limits, product direction, judging evidence, and demo script so names and claims agree.

## Verification checklist

### Environment first

- [ ] Upgrade and pin Node to a version accepted by all installed tools. The current environment is Node 20.2.0; Next 16.3.8 requires at least 20.9.0 and Rolldown 1.2.12 requires `^20.19.0` or `>=22.12.0`.
- [ ] Add `.nvmrc` or `.node-version` and a matching `package.json` `engines.node` entry.
- [ ] Re-run the existing baseline after the Node upgrade. On inspection, `npm run typecheck`, `npm test`, and `npm run build` could not start because of the Node/runtime mismatch; this is an environment failure, not a verified product-test failure.

### Domain and AI tests

- [ ] Extraction returns all supported fact categories with valid exact-source spans.
- [ ] Invalid citations, unknown source IDs, malformed structured output, and prompt-injection text are rejected.
- [ ] AI output cannot approve a fact, plan, commitment, task completion, observation, or report.
- [ ] One call can create multiple objective candidates plus non-metric requirements.
- [ ] Unit/direction/window validation catches incompatible metrics.
- [ ] Each objective template produces correct deterministic results, including division-by-zero and missing-input behavior.
- [ ] Missing evidence degrades health and blocks unsupported report claims.
- [ ] New objectives create amendments; approved historical objectives do not mutate.
- [ ] Material plan changes invalidate both parties’ prior approvals.
- [ ] Report snapshots remain unchanged when later source data changes.

### Database/API tests

- [ ] Tenant isolation covers every new table and attachment path.
- [ ] Founder, customer, viewer, and revoked/expired invitation permissions are tested.
- [ ] Concurrent edits produce version conflicts instead of lost updates.
- [ ] Duplicate jobs/commands are idempotent.
- [ ] Late AI output is quarantined after transcript or plan changes.
- [ ] Shared plan/report endpoints expose only their explicit projections.

### Browser acceptance tests

- [ ] Paste transcript -> extract -> review -> generate plan.
- [ ] Edit and approve plan as founder -> review and approve as customer.
- [ ] Launch is blocked until the integration requirement and approvals pass.
- [ ] Complete tasks and enter weekly observations -> dashboard updates correctly.
- [ ] Miss an evidence deadline -> recovery task appears and report claim is blocked.
- [ ] Add a mid-pilot objective -> amendment/version flow is used.
- [ ] Generate and share the final report -> figures and limitations match source records.
- [ ] Refresh/reload at every major step without losing state.
- [ ] Run accessibility checks over call review, plan, dashboard, and report routes.

## Recommended implementation order

1. Fix/pin the Node environment and establish a green baseline.
2. Add the multi-objective schema, deterministic calculations, commands, and migration tests.
3. Build the food-bank fixture directly against the new domain model.
4. Build the extraction review and objective-plan UI.
5. Add founder/customer approvals and the shared plan view.
6. Add task/evidence tracking, health, and missing-evidence replanning.
7. Add the final report and revocable share.
8. Replace branding/navigation and polish the single end-to-end demo.
9. Run browser, accessibility, production-build, and two-account hosted verification.

## Hackathon definition of done

- [ ] A judge can paste the provided unstructured call and watch PilotForge propose two objectives plus one requirement with exact citations.
- [ ] The judge can see and change the proposed baseline, target, actions, owners, deadlines, and proof before anything is accepted.
- [ ] The founder and customer can approve the same pinned plan version.
- [ ] The active dashboard is driven by stored tasks and observations, not decorative or AI-invented progress.
- [ ] Missing week-three evidence creates operational follow-up and blocks an unsupported conclusion.
- [ ] The final report explains what changed, whether each target was met, how the result was calculated, and what evidence supports it.
- [ ] No screen confuses AI interpretation with customer commitment, a successful pilot with a sale, or an agreement with payment.
