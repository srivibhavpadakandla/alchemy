# Alchemy: customer trials that prove value

Alchemy helps a startup turn an interested customer into a paying customer by managing the trial, recording what happened, and preparing an evidence-backed commercial decision. The core is a shared project manager and results tracker. AI organizes meeting notes and drafts plans/reports; people approve commitments and commercial decisions.

## Founder journey

1. Enter customer needs after a conversation, preserving source notes.
2. Create a short trial plan: startup deliverables, customer responsibilities, owners, deadlines, duration, measurable success criteria, and the paid offer if the trial succeeds.
3. Invite the customer to review and acknowledge the same plan version.
4. Track shared tasks, deadlines, product usage and measured results.
5. Compare results with baseline and targets, exposing incomplete or disputed evidence.
6. Generate a results report, present the paid offer, and record the commercial decision. Record payment evidence separately.

Point A: an interested customer. Point B: a completed, evidenced pilot and explicit commercial decision. Successful results alone do not establish a sale or payment.

Primary navigation: Pilots, Trial Plan, Tasks, Metrics, Results, Paid Offer. Agents remain supporting tools.

## First complete vertical slice

A founder creates a pilot, captures needs, defines baseline/target, assigns tasks, invites a customer, obtains plan acknowledgment, records observations, reviews the result together, exports a report, and records the commercial decision. Complete this with two real accounts in a hosted environment before claiming production readiness.

For a restaurant waste pilot, define consistent units, comparable observation periods and exposure such as covers served. A lower raw waste total during a quieter week is insufficient evidence of improved efficiency. Monetary savings require an explicit cost basis. The illustrative 30-day trial, 20% target and 24% improvement are examples until actual evidence is supplied.

## Production release gates

- **Identity:** configured hosted authentication and persistent database; organization/pilot/customer scoped memberships; tested tenant isolation; invitation expiry and revocation.
- **Shared plan:** versioned deliverables, customer responsibilities, owners, dates, success criteria and paid offer; record who acknowledged which version; amendments require fresh acknowledgment.
- **Measurement:** metric unit, baseline period, target, improvement direction, method and reporting cadence; source-backed manual observations first; explicit distinction between manual, uploaded and instrumented evidence; deterministic calculations; missing/stale/disputed/insufficient states.
- **Execution:** shared task ownership/dependencies, durable reminders, retries, deduplication and visible delivery failures. Send reminders only to agreed recipients.
- **Results:** reports generated from a pinned data version with sources, assumptions and limitations; scoped sharing/revocation; downloadable report.
- **Sale:** explicit accept/decline/extend decision; separate offer acceptance, customer agreement, invoice and confirmed payment states.
- **Operations:** deployed HTTPS, server-only secrets, private attachments, audit history, request/input controls, CI, error/job monitoring, backups and tested restoration.
- **Live verification:** real authentication, database, reminders and any enabled AI provider checked end to end. Mocked tests and implemented adapters do not establish connectivity. Keep local signed-in Codex execution disabled on hosted deployments.

## Community outcome

Start with actual pilots involving local businesses, nonprofits or community organizations. Measure completed trials, partner-confirmed value and repeat use. Do not claim saved money, reduced waste, generated revenue or reach without evidence. A broad matching marketplace is outside this release.

## Design and motion

References researched on October 3, 2026:

- [Linear](https://linear.app/): disciplined hierarchy, generous spacing and a substantial product view explaining the workflow.
- [Dock](https://www.dock.us/): shared buyer workspace, mutual actions and customer-facing business case.
- [WorkOS](https://workos.com/): concise typography, clear section hierarchy and restrained navigation.
- [Anime.js scroll events](https://animejs.com/documentation/events/onscroll/): explanatory timelines triggered or synchronized by scrolling.

Recommended direction: a precise editorial trial notebook with a legible application workspace. Distinctive Alchemy wordmark, warm white paper, charcoal text and one copper/orange accent. Put a usable trial plan and baseline-versus-result view in the hero. Avoid robot teams, generic AI gradients, fabricated terminal activity or decorative dashboards that cannot be used.

Hero: "Turn a promising trial into a clear decision." Supporting copy: "Agree on the plan. Track the work. Prove the value. Give your customer the evidence to buy."

Scroll story: customer need -> mutual trial plan -> weekly evidence -> results report -> paid offer. Show the restaurant scenario as an explicitly labeled example until real evidence exists. Prefer actual application components/captures.

The user requested Animate.js; use Anime.js unless clarified otherwise. Use it for the explanatory landing-page timeline. Keep transform/opacity reveals subtle, stagger restrained and reduced-motion behavior gentler. Keep application data, metric reading and frequent keyboard actions stable. Preserve native scrolling, clean up observers/timelines on unmount, and keep content readable if animation fails or JavaScript is unavailable.

Validate desktop/390px mobile, keyboard navigation, reduced motion, contrast, image/font loading and every CTA destination.

## Repository status

This initial private repository is the current implementation baseline and direction. It excludes real credentials, local agent session/job files, generated exports, recordings, dependencies and build outputs. The main implementation chat owns application migration and production verification. This checklist does not claim those gates are already delivered.

## Latest visual direction

The user's subsequent October 3 instruction chose https://www.cosmos.so/ as the visual reference. The implementation now uses a light photographic canvas, floating original images, centered sans-serif typography and rounded controls across the landing page, customer board, trial pages and login. The product scope and release gates above remain applicable. See `COSMOS-DESIGN.md` for provenance and `PROGRESS.md` for current verification.
