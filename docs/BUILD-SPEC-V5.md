LaunchGuild: Design Partner Tycoon — complete Codex build prompt (V5)

Build LaunchGuild: a pixel-art command center that helps a B2B founder with an existing MVP recruit, operate and convert the first few design partners while protecting the product from excessive customization.

Implement the application, its verified demonstration and presentation materials. This is a build request when handed to Codex, not a request for another planning document. This document itself is a specification; it does not assert an implemented app, real customers or revenue.

V5 is the current authority. It incorporates the user's October 3, 2026 pasted concept and explicitly changes the target from broad idea validation to the first five serious B2B customers. The user's six-part prototype scope supersedes V4's mandatory launch-kit feature set. Preserve V2–V4 as history; do not bring their generic business plans, landing-page A/B engine, investor sourcing or ten-slide artifact generator back into the critical path. Preserve the requested pixel-forest aesthetic, polished login, actual visible agent work, useful ElevenLabs/Gemma integrations, verification and video deliverables. No deadline is assumed.

Follow repository AGENTS.md, inspect existing work and preserve user changes. If the checkout is unrelated, create a dedicated project directory. Choose sensible implementation details, complete each phase and continue useful independent work when an account integration is blocked. Ask only for genuinely necessary account actions or unresolved decisions. Do not create new chats, change the user's configured model, purchase services or publish private material merely because this prompt mentions them.

## 1. Product promise and exact prototype scope

Pitch: **"Turn your first design partners into customers without building five different products."**

A design partner is an early customer collaborating on an unfinished product and supplying feedback under an agreed pilot. LaunchGuild helps the founder decide who fits, what was promised, whether the pilot produced its agreed outcome, what engineering work is reusable and what remains before a purchase decision. It operates the relationship; it does not build the founder's MVP or guarantee sales.

The working prototype must include these six complete capabilities:

1. Three clearly fictional demo partners, plus create/edit and supported import of the founder's own partner records.
2. One shared customer record with evidence, people, agreed pilot, requests, promises, usage and next decision.
3. Actual AI request classification, evidence links, cross-partner reuse and incompatible-requirement detection, with founder review.
4. Engineering-capacity planning with deterministic scenario calculations and a reviewable committed plan.
5. Pilot-to-paid readiness scoring with inspectable checks, unknowns, critical blockers and evidence.
6. A pixel town driven by the real persisted relationships and planning state, with clearly separated scenario previews.

Keep the five role agents visible and genuinely useful. Deliver full routes, real auth/persistence, responsive design, source/export, failure states and sponsor proof around this prototype. Manual notes, CSV import and manual evidence-backed status updates are valid first inputs. Live Salesforce/SAP/Slack/Stripe synchronization, meeting bots, customer tenant provisioning, production telemetry and sending email are later capabilities unless a configured integration is explicitly available and verified. Do not fake their operation or make them prerequisites for the six-part prototype.

Intended user: a small B2B startup with a working MVP and roughly three to five design partners. This target and its willingness to pay are hypotheses until observed with real users. Do not assert that startups generally fail for the reasons in the pitch without evidence.

The central decision is: **"Do we spend scarce engineering capacity on the largest partner's custom workflow, or on a smaller feature shared by two partners?"**

## 2. Make the product sharper than a themed CRM

The core object is a linked decision graph:

```text
source note / usage record
→ partner problem and exact request
→ reviewed promise and pilot-success / purchase gate
→ reusable work item with estimated effort and dependencies
→ capacity-plan scenario
→ founder decision and committed work
→ observed delivery / pilot outcome
→ next commercial action and evidenced conversion
```

Every recommendation must open this chain. A generic chat response, lead list or unexplained score fails the product contract. AI proposes interpretations; the founder controls commitments and plans. Deterministic code calculates effort, sums, ratios and scenario comparisons. Evidence establishes observed facts. An AI sentence is not a customer agreement, completed integration, measured outcome or payment.

Relevant precedents exist: Productboard documents feedback-to-feature linkage, prioritization and current-customer revenue associations; Vitally documents account success metrics and timed goals; Dock and Aligned document shared pilot/action plans and purchase milestones. Do not call these individual features new. The proposed differentiation to demonstrate is a compact design-partner workflow joining commitments, limited engineering capacity, product reuse and purchase blockers in an understandable original town. This documentation review does not prove exclusivity or customer preference. See DESIGN-PARTNER-RESEARCH.md.

## 3. Five guild members and one shared record

These names replace Radar/Ledger/Maker/Story/Signal. There are exactly five roles, not five disconnected chats.

| Role | Real responsibility | Minimum genuine task and output |
|---|---|---|
| Scout | Identify partner fit and missing information | Evaluate a supplied company/source packet against the approved target profile; return sourced signals, inferred pain, fit reasons, exclusions and questions |
| Diplomat | Draft a clear partnership and expose promises | Extract proposed commitments from notes and draft an editable partner proposal with reciprocal responsibilities, success criteria and conversion conditions |
| Quartermaster | Prepare a feasible pilot | Generate onboarding/checklist/configuration/data-access/milestone tasks from the agreed pilot; identify missing access and prerequisites |
| Smith | Protect product coherence | Classify requests, link equivalent work across accounts, identify contradictions, estimate only when scoped inputs exist and propose reuse / configuration / customization choices |
| Treasurer | Explain commercial readiness | Retrieve current metric and agreement versions, expose product and commercial blockers, show the deterministic readiness breakdown and propose a dated next action |

Scouting is not a promise of exhaustive research. Public hiring signals are observations; inferred pain remains a hypothesis. Do not invent contacts or private addresses. A supported search adapter can fetch public evidence; when unavailable, supplied URLs/notes still permit a real bounded analysis. A seed company name is a fixture, not a real researched company.

The Diplomat's proposal contains startup deliverables, partner deliverables, scope and exclusions, owner/champion/buyer, start/end/review dates, weekly participation, baseline and success measure, agreed decision date, proposed price/paid plan, conversion conditions, data/access requirements and exit/extension conditions. Draft, internally approved, sent, partner acknowledged and mutually agreed are distinct. Imported founder-reported agreement is labeled reported; a customer acknowledgment has its own source. Do not claim an automatically generated document is executed or legally reviewed.

The Quartermaster creates an operational plan and sample-data fixture, not an imaginary external test workspace. Label steps: planned, configuration recorded, access verified, tested, blocked or complete with receipt. Provisioning a real customer environment requires a specific configured adapter and scoped proof. Keep each partner's data/config separate and use synthetic sample data by default.

The Smith assigns one proposed primary class: core product, reusable configuration, one-customer customization, integration, support issue or distraction; allow unclassified when evidence is insufficient. Secondary tags can describe overlapping aspects. Founder approval/override records the reason. Classification never determines authorization or acceptance automatically. "Distraction" is an internal strategic assessment with evidence, not a customer-facing insult.

The Treasurer distinguishes product success, commercial readiness, agreement and payment. Strong usage with no buyer, agreed price or procurement path can produce "Product outcome achieved; commercial blockers remain." Do not turn usage into intent or an index into conversion probability.

All roles read pinned versions of the same partner/product/pilot records and write reviewable structured proposals. Persist one genuine task per role with input versions, tool receipts, output version and status. Several roles may use one model; they need not run five concurrent calls.

## 4. Shared record, promises and pilot lifecycle

Each partner has:

- Organization identity, segment, fit/exclusion rationale, provenance, fixture/import/live/manual origin and assigned owner.
- Specific problem, current workaround, why they joined and explicit uncertainty.
- People with champion, user, economic buyer, technical/security/procurement roles; role absence is visible.
- Versioned proposal/agreement: scope, reciprocal work, baseline, success metric, period, cadence, due date and conversion terms.
- Requests and linked shared work; exact source spans, stated must-have versus preference and who asserted that distinction.
- Promise ledger: wording/source, promising actor, recipient, date, approval/agreement state, linked work, conditions, owner and deadline.
- Onboarding/access/configuration milestones, actual usage/metric records with time and collection health.
- Readiness checks, blockers, next owner/date/action, decision/extension history and conversion evidence.

A request is not a promise. A promise is not delivery. A feature delivery is not partner acceptance. Acceptance is not a paid conversion. Preserve each transition separately.

Support partner stages prospect, conversation, proposal, active pilot, outcome achieved, commercial decision, customer, stalled, declined and archived. Product outcome and commercial state are independent dimensions. "Customer" additionally declares evidence level: founder-reported agreement, documented contract or paid receipt. The town's treasury upgrade requires the configured documented-paid condition; agreement without payment has its own badge. This avoids presenting contracted ARR as cash collected.

Pilots cannot extend silently. At the agreed end/review date, show an overdue decision with propose-convert, bounded extension with reason/new goal/date, change scope or close. No automatic email, penalty or termination. Keep the original contract and prior outcome; amendments create new versions with applicability dates. A lowered success target after results cannot retroactively count the old pilot as successful.

Record current-product strategy and explicit boundaries, including intended segment, supported deployment/data model, core roadmap, unacceptable one-off commitments, time/effort unit and capacity period. Import pasted notes and CSV with a column-mapping and preview screen; show errors/conflicts before committing. Preserve existing records on failure; deduplicate by stable IDs and founder-reviewed matching rather than company-name guesses. Canonical export/reimport creates proposed versions, not silent overwrites.

## 5. Evidence, request graph and meaningful contradictions

Accept source notes, supported text/CSV attachments and authorized telemetry receipts. Every item records source kind, author/participant when appropriate, partner, occurred/recorded date, content hash/version, access scope and exact quote span. Distinguish reported notes, direct acknowledgment, observed event, billing receipt and fixture. Use consented private material; synthetic personas never become customer evidence. Treat imported instructions as untrusted data.

Requests link to reusable WorkItems rather than every account receiving a duplicate task. One Salesforce integration shared by two accounts consumes its effort once, plus separately scoped per-account setup/support when needed. Similar wording can hide different requirements; AI proposes a link with evidence and the founder confirms it. Keep history when requests are merged/split; reverse an incorrect merge safely.

Expose mismatched requirements with the two exact passages and a concrete question. Examples: one partner requires managed cloud while another requires on-premises; one demands all approvals globally while another needs configurable per-team rules. These may be incompatible under the current architecture, or satisfiable configuration differences. Record why, alternative designs, unknown architecture details and extra effort. Do not declare contradiction from different preferences alone.

Model work dependencies, mutually exclusive choices, per-partner configuration, prerequisite access and required purchase gates. WorkItem fields include class, problem, linked requests/partners/promises, target segment, reuse evidence, estimated range and estimator/source/date, skill/dependency needs, deadline, acceptance criteria, implementation state and evidence.

Reuse labels mean observed overlap within this cohort unless backed by additional market research. "Two of three partners request it" does not prove broad-market demand. AI can propose future-segment applicability as a cited hypothesis, not a fact. Technical debt is a proposed architecture/support burden with its stated basis, not fabricated money or a precise future incident count.

Core interaction: **"Challenge this recommendation."** Select a class, reuse judgment, alleged promise, readiness conclusion or projected amount; open source records, computation, assumptions, conflicting evidence and Gemma review. Create a scoped proposed correction. Preserve unrelated edits and manual locks; same-field concurrent changes need keep/accept/manual-merge disposition. Apply with expected-current version atomically; declining changes nothing. Update dependent draft scenarios/checks, mark affected approved plans/proposals stale and never send, publish, change a customer promise or mark delivery automatically. Undo creates a new version and restores no external side effect.

## 6. Engineering-capacity planning and calculation contracts

Use the team's actual planning unit and explicit period. Points are founder/team estimates, not measured hours. Default demo unit is engineering points in one named month. Record working capacity, already committed work, mandatory core maintenance/onboarding and support reserve. Show total, reserved, discretionary, allocated and remaining. Keep point estimates distinct from model/API usage budgets.

The planning board supports keyboard-accessible add/remove as well as drag/drop, effort edits, dependency display, saved scenarios, side-by-side comparison and a reviewed commit. Prevent overbooking by default; an authorized founder can deliberately approve an over-capacity plan with an explicit exception/reason. Never silently reduce mandatory reserves. Detect changed input versions before commit and recompute a fresh diff. A scenario is draft; committing creates internal assignments, not completed product work or new customer promises.

Calculate in deterministic tested code, using exact currency amounts and explicit annual/monthly/one-time bases:

1. **Effort:** unique selected WorkItem effort plus explicitly modeled setup/dependencies; use estimate ranges and expose unknowns. Dependencies cannot be silently omitted or charged twice.
2. **Partner coverage:** distinct linked organizations, with must-have versus optional requests shown.
3. **Associated opportunity value:** unique included partner opportunities in a stated currency/time basis. Do not sum the same company's deal across multiple features.
4. **Product gates addressed:** conditions a proposed delivery would address. An unbuilt feature only addresses a gate in a scenario, not in the live readiness record.
5. **Commercially unblocked opportunity:** only accounts whose required conditions would be satisfied under all declared scenario assumptions; show unresolved buyer/pricing/security/acceptance conditions. Do not call this actual revenue or predict their probability of purchase.
6. **Capacity share:** selected work effort / total period capacity; also show selected effort / discretionary capacity where informative. Unknown/zero denominator has a meaningful state, never an invented percentage.
7. **Current revenue concentration:** largest included customer ARR / total current included customer ARR on the same basis. With zero current ARR, show no current revenue, not 0% or a fabricated concentration.
8. **Projected concentration:** explicit included opportunities, existing ARR, conversion assumptions, currency and time basis. Recompute per scenario. Conditional ARR is neither actual income nor cash. Do not mix signed opportunity, collected invoice, ARR and one-time fees.

The app can show estimated scenario tradeoffs and sensitivities; it cannot infer expected conversions from three fixture accounts or produce statistically calibrated probabilities without suitable observed data. Unknown future reusability, debt and purchase intent remain qualitative/evidence-backed or explicitly assumed. A high-priced custom request can be strategically justified by real learning, profitable services or a chosen enterprise segment; the app presents tradeoffs rather than always declaring the smaller feature correct.

Store plan input/version hashes, selected work and dependency closure, capacity/reserves, assumptions, formula version, per-account attribution, result explanations, review/disposition and founder decision. Export enough inputs to reproduce every displayed number. Changed costs, agreements or opportunities make related comparisons stale. No LLM computes the displayed financial totals.

## 7. Correct and reproducible flagship demo

Seed an isolated, resettable **Demo town — fictional companies, amounts and evidence**. Fictional notes can be processed by real AI calls; their outputs are genuine analyses of fixtures, not real customer research. Imported/live records never enter this demo implicitly. Dates are relative to a pinned demo start and stored consistently.

| Fictional partner | Conditional annual opportunity | Required product request | Additional context |
|---|---:|---|---|
| Northstar Logistics | USD 30,000 | Shared Salesforce integration | Target segment fit; actual buyer/pricing/security conditions are explicit checks |
| Juniper Operations | USD 8,000 | The same Salesforce integration | Also requests bulk CSV import as an optional improvement, not a second deal |
| Kite Enterprise | USD 50,000 | One-off approval workflow | Different workflow/segment; portability and long-term support are open concerns |

This fixes the pasted example's ambiguity: the first two accounts explicitly share Salesforce; Juniper's CSV request does not create another USD 8,000 opportunity.

Monthly capacity = **100 points**; mandatory core onboarding/maintenance = **35**; support reserve = **15**; discretionary capacity = **50**. Shared Salesforce = **20**; optional CSV = **8**; custom approval = **46**. These are labeled fixture estimates. All use the same period and scale.

Expected reproducible displays:

- Salesforce scenario: 20 discretionary points; 70 total including reserves; 30 remaining; two linked partners; USD 38,000 associated conditional annual opportunity counted once per partner. Commercial gates still matter.
- Salesforce + CSV: 28 discretionary; 78 total; 22 remaining; still USD 38,000 associated value. CSV has USD 8,000 linked account value, **zero additional deal value** in this selected combination.
- Custom scenario: 46 discretionary; 96 total; 4 remaining; 46% of total monthly capacity and 92% of discretionary capacity; USD 50,000 conditional opportunity.
- Salesforce + custom: 66 discretionary; 116 total; exceeds capacity by 16. Offer a clear conflict, never pretend both fit.
- All-three future-conversion illustration: USD 88,000 conditional annual total, with Kite share 50,000 / 88,000 = **56.82%**, rounded to **57%**. This assumes all three eventually convert and existing ARR is zero; it is a longer-horizon illustration, not income achieved by the current month's plan.
- Custom-only conversion illustration with zero existing ARR: concentration would be **100%**, not 57%. Adding real existing ARR or different included deals changes the calculation.

Compare both routes. In **Scenario preview**, a large translucent custom fortress and highlighted construction path can show the selected custom allocation; two other partner paths show deferred shared work. Selecting Salesforce previews progress on two partner plots with explicit "planned / conditional" treatment. Mandatory core work continues according to its reserve; do not imply the entire company stops if only two requests are deferred.

Committing either choice stores a real founder decision and queued work, removes the scenario overlay and leaves actual partner milestones unchanged. Only recording actual delivery/acceptance/outcome evidence can upgrade live pilot stages. The demo may show a separately labeled fixture milestone receipt to demonstrate an upgrade, without pretending the click built Salesforce or produced sales. Clicking the same action twice must not duplicate work, decisions or upgrades.

Do not hardcode the recommendation. Changing ICP, effort, an actual commitment, or existing ARR must change the comparison. Include an example where custom work is the founder's justified choice and the app records it correctly.

## 8. Explainable pilot-to-paid readiness

Implement the requested scoring as **evidence-backed checklist completion**, separate from product outcome and payment. Default ten checks:

1. Target problem and partner fit confirmed.
2. Pilot scope, responsible owners, start/end and review date agreed.
3. Required data/access/onboarding ready.
4. Baseline, success metric, collection method and evaluation window agreed.
5. Observed outcome meets the agreed metric under valid collection.
6. Champion and reciprocal participation confirmed.
7. Economic buyer identified and involved.
8. Price and paid terms acknowledged.
9. Applicable security/procurement requirements cleared.
10. Purchase decision date and next commercial action agreed.

Each check is met, blocked, unknown, stale or not applicable with explicit reason; show source/time/reviewer/version. Formula = met applicable checks / required applicable checks. Example **6/10 checks confirmed, 2 blocked, 2 unknown**; percentage, if shown, means checklist completion only. Not-applicable removal requires a reason and policy version. Unknowns do not quietly disappear from the denominator. Critical requirements override any "ready" label, regardless of percentage. Do not show a conversion probability, startup score or calibrated health claim.

Show two panels: product-pilot evidence and commercial blockers. A missing buyer/security review cannot be offset by many usage events. Strong usage is useful context but cannot substitute for an agreed outcome or explicit intent. Missing/stale collection shows measurement unavailable, not failure or zero usage. Metric edits create an amendment/version and preserve the prior result.

Usage inputs can be a manual reported snapshot, CSV or configured event adapter. Preserve source, period, definition, numerator/denominator when applicable, freshness and collection health. Deduplicate imported events; repeated partner notes do not become new people. A factual conclusion such as "success metric reached" cites a current agreed metric and actual snapshot. Manual values remain labeled reported. Payment/contract receipts stay separate and currency/basis explicit.

Provide next actions with owner/date and linked blocker: introduce buyer, confirm price, obtain required access, review security requirement, schedule closing conversation, extend with a new experiment or close the pilot. Draft communication is editable. Actual sends require exact recipients/content/current approval and a verified connector; copy-only must not say sent. An ambiguous send remains uncertain until reconciled.

## 9. Pixel-forest art direction and town semantics

Use references/pixel-tycoon-aesthetic.png. Closely match its visual language with original art: crisp pixel clusters, cyan sky, layered mountains, saturated forest greens, winding paths, wooden buildings, dark outlines and enormous purple/magenta arcade lettering. It is a startup town, not a logging game. Do not reuse the Timber Tycoon title, lumberjack, axe or exact scene. A pixel headline over a generic SaaS dashboard fails.

Palette starts at sky #53C5E7, pine #153B2C, forest #2A6B3F, grass #78B947, timber #8F4E2C, gold #FFC857, purple #B836EF, deep purple #620E9C, ink #100F18, panel #171C25 and cream #FFF2CB. Measure contrast. No glassmorphism, blur-heavy cards, smooth neon bloom, generic gradient blobs or mismatched asset packs.

Central Guild Hall contains the shared program board. Five small role stations surround it: Scout lookout, Diplomat embassy/mail desk, Quartermaster supply depot, Smith forge and Treasurer counting house. **Partner buildings are separate** and represent customer relationships, not agent personalities. Start with three legible partner plots; support the first five without an unreadable sprawling map.

| Partner visual | Semantic condition |
|---|---|
| Construction plot | Prospect identified |
| Tent | Initial conversation |
| Workshop | Active pilot |
| Upgraded workshop/shop | Agreed product outcome achieved with evidence |
| Commercial banner | Explicit purchase decision / documented agreement, distinguished from payment |
| Treasury shop | Documented paid customer under the configured conversion rule |
| Paused/unlit building | Stalled relationship with reason and next decision |
| Fortress styling + risk badge | Explicit concentration/customization risk under the displayed scenario or evidence; not a label that the customer is bad |

Lifecycle is not a simple ever-increasing level. A paid account can still have customization risk or later churn; a stalled pilot can resume. Risk overlays and relationship stage can coexist. Expose dates and criteria, never invent health from building decoration. Color and animation are never the only status cues.

The north HUD shows product/program, planning period, total/reserved/discretionary capacity, actual/conditional revenue labels and genuine queued work. An always-visible mode control distinguishes **Live records / Demo town / Scenario preview / Recorded run**. Viewing a replay executes nothing. Demo mode has an isolated banner and never contributes to live revenue, readiness or data.

Desktop composition: town as main scene, compact capacity/work tray at the bottom, collapsible partner inspector at the right and accessible navigation. Clicking a building opens overview, people/pilot, requests/promises, readiness, evidence and history. A shared work board shows how requests converge on one feature. The scenario comparator is an intentional readable work surface, not tiny numbers over grass. Mobile uses a town overview plus ordered partner list and full-width detail/plan panels; no forced landscape or map-panning requirement.

Create title-screen landing/login with original forest, purple outlined wordmark and a readable sign-in panel. Clear controls: Continue with Google; email code; Try demo. Demo access is explicitly limited and does not create a fake authenticated user. Normal body font such as IBM Plex Sans at about 16px for tables, sources, forms and editors; pixel font for short labels and display type only. Use opaque panels with crisp wood/stone trim and stepped borders.

Use a consistent asset grid, e.g. 32px tiles and 48×64px sprite frames, integer scaling and nearest-neighbor only on game art. Do not pixelate the entire app or introduce fractional sprite shimmer. Maintain asset/license/frame manifests. Agents have idle, queued, working, waiting, needs-review, complete and failed animations tied to persisted tasks. Decorative clouds may loop; scroll/crate handoffs require a real committed output and recipient task. No fake terminal, progress percentage, revenue coins or simulated backend activity.

Keyboard/list equivalents expose all map and drag/drop functions. Respect reduced motion, focus restoration, readable contrast, roughly 44px touch targets and controlled live announcements. Sound off by default. Inspect real screenshots of landing, login, populated town, partner record, capacity comparison, source drawer and errors at 1440×900, 1280×800, 768px and 390px.

## 10. Stack, models, auth and actual agent integration

Recommended Codex implementation setting: **GPT-6.1 Sol / High** where available in the user's Codex app. Keep the current setting unless the user changes it. Application model IDs are separately configured; Codex model availability/subscription does not provide API credentials or establish SDK support.

Use TypeScript, Next.js App Router, React, Tailwind, accessible primitives, Zod, Motion for UI, DOM/CSS/SVG scene layers with sprite assets, Supabase Auth/Postgres/Storage/Realtime and Inngest for durable jobs. Use compatible stable versions, official documentation and a pinned lockfile. Add Canvas/game rendering only for a demonstrated need, retaining semantic controls. No enterprise CRM or additional paid planning SaaS is required.

Provide explicit model adapters and server-only keys. Keep configurable OPENAI_MODEL_REASONING and OPENAI_MODEL_FAST; preserve preferred Sol/Luna choices only when the actual application account/API supports them. Begin medium effort for multi-source synthesis and low/medium for bounded extraction. Use Responses API tool workflows where supported; validate model/structured-output/tool capabilities during preflight. Unsupported identifiers remain a visible setup blocker; do not silently substitute sample output.

Keep required Gemma 4 claim/evidence review through the configured Google endpoint, starting with configurable GEMMA_MODEL=gemma-4-26b-a4b-it only after actual account/model support is checked. The Gemma reviewer tests exact request classifications, purported customer promises, reuse evidence and readiness statements against partner-scoped source chunks. Return supported, contradicted, insufficient or explicit assumption, cited existing IDs and short public justification. Validate IDs/schema; missing support is not proof of falsity. Changed input invalidates the review. Expose current findings inside the source/recommendation inspector. Prepare a separable reviewer component, fixtures, setup, prompt version and license for potential open-source track use; hosted open-weight inference is not local inference or permission to publish private code.

Use opt-in ElevenLabs Agents voice with equivalent text tools. Authenticate signed session/token setup server-side according to its supported transport. Useful requests:

- "What did we actually promise Kite?" opens the exact promise and source.
- "Why does the Salesforce request cover two partners?" retrieves the confirmed request links and limitations.
- "Compare the custom workflow with Salesforce." opens a computed scenario comparison.
- "What stops Juniper becoming a paid customer?" retrieves current product/commercial checks.
- "Reserve twenty points for Salesforce." creates a visible plan proposal, not a silent commit.

Voice may read, navigate or propose. Plan commit, partner acknowledgment, external sends, grants and deletion require the normal explicit application review and role authorization. Spoken "yes" is not blanket permission. Session variables are not membership proof. Stop microphone on exit/sign-out; show permission/connect/disconnect/error states and explain hosted processing accurately. Recorded narration does not count as product integration.

Use real Google and verified email-code login with Supabase SSR/server identity, safe redirect, loading/cancel/invalid/expired/resend/rate-limit/error states. Persist projects/workspaces with owner/editor/viewer, invitations and explicit ownership handling. RLS and server checks isolate records, notes, voice retrieval, exports and streams; partner identity does not grant access to other partners. If a customer-facing portal is added later, its access must be explicitly scoped to that partner. Core prototype can remain founder/team only. Support sign-out, private-state clearing, export/deletion and revocable redacted read-only sharing.

Durable tasks include pinned inputs/memory, role/prompt/tool versions, attempts, request IDs, public summaries, receipts, usage and output commits. Transactional event sequences support snapshot/cursor recovery, duplicate/out-of-order events, refresh/reconnect, cancellation and selected retries. Preserve independent successful work. Quarantine late stale output. Initial configurable bounds: three concurrent provider calls, eight tool actions per task attempt and two transient retries. Enforce unit/token ceilings and transactionally reserve budget before admitting concurrent calls; reconcile failed/retried/voice work without double charges. Dated prices and provider-billed amounts differ; unknown costs stay unknown. Engineering points are never API credits.

Show concise public explanations and tool evidence, not hidden chain-of-thought. Imported source text cannot override system permissions or execute code. Replay/demo events do not send, alter live partners or mark payments. Narrow authenticated mutation schemas, bounded uploads/fetches, URL controls, private storage and signed callbacks apply where used.

## 11. Concrete routes and data/API contracts

Required routes or documented equivalents:

| Route | Purpose |
|---|---|
| `/`, `/login`, `/auth/callback` | Original landing/title-screen auth and safe callback |
| `/demo` | Isolated resettable fictional town, marked throughout |
| `/app`, `/app/programs/[id]/town` | Projects/programs and live town/HUD/work inspector |
| `/app/programs/[id]/partners/[partnerId]` | Unified evidence/pilot/people/requests/promises/readiness/history |
| `/app/programs/[id]/requests` | Request-to-work mapping, classification, contradictions and commitments |
| `/app/programs/[id]/capacity` | Period/reserves, scenarios, deterministic explanation and reviewed plan |
| `/app/programs/[id]/decisions` | Immutable decisions, next actions, extensions and review history |
| `/app/programs/[id]/evidence` | Scoped source spans, current Gemma results and protected correction |
| `/app/programs/[id]/settings`, `/share/[token]` | Product boundaries, membership/readiness/export/delete and redacted revocable share |

Every route has useful empty/loading/partial/permission/error/retry states. No dead primary controls or success toast without a committed record.

Typed entities, each private workspace/program scoped:

- profiles, workspaces, memberships, invitations; program/product_strategy_versions and approved memory.
- partners, people/roles, opportunities (amount/currency/basis/stage/evidence), lifecycle events.
- pilot_agreement_versions, metric_definitions/amendments, metric_observations and collection-health records.
- sources/source_versions/quote_spans, import_batches/proposals, request_versions and confirmed request_work_links.
- promises/acknowledgments, work_items/dependencies/conflicts/estimates, onboarding/configuration tasks.
- capacity_periods/reserves, scenario_versions/formula_versions/results, committed_plans/assignments/decisions.
- readiness_policy_versions/checks/results, next_actions, extensions/closeouts, contracts/payment_receipts.
- agent_runs/tasks/attempts/events/outbox/tool_receipts, review_versions/change_proposals/field_locks.
- exact_action_proposals/approvals, optional connector_configs/callbacks/send ledger, usage reservations/reconciliation.
- exports/manifests/share_links, isolated demo seed/reset state and redacted replay logs.

Use shared Zod contracts. Every mutation checks verified membership/role, expected-current version and idempotency key; conflicting updates return 409 plus current diff. Cross-workspace references are denied. Store actor, source/effective time and version lineage. Do not place every domain object in an unvalidated JSON bucket.

Minimum APIs/tools include create/import/preview/commit partner; propose/approve class or request link; draft/acknowledge pilot/promise; calculate/read scenario; propose/commit plan; record scoped evidence/milestone/payment; compute/open readiness; challenge/review/apply change; read run snapshot/cursor; export/revoke share. Mark observed events only through authorized validated source/record paths, not an AI tool declaring them true.

Plan execution, action approval and external evidence are distinct. An optional actual-send path pins recipients, exact content/attachments, payload hash, sender/grant/input versions, expiry and durable logical key; recheck current authorization/suppression immediately before execution. Connector setup is not send proof; ambiguous delivery remains uncertain. Source import and new notes may create proposed findings/next actions, never a new sales promise automatically.

## 12. Dependency phases and meaningful acceptance

Maintain docs/PROGRESS.md with completed behavior, evidence, blockers and next action. Build this six-part prototype in these phases:

1. Inspect checkout, pin scope/contracts, create canonical seed/math expectations and runnable shell.
2. Create original landing/login/populated town/partner/plan visual shells; pass reference and mobile/keyboard/reduced-motion visual gate.
3. Implement auth, isolation, records/imports and persisted fixture/live mode boundaries; verify cross-account denials.
4. Implement deterministic work/dependency/capacity/readiness engine and editable partner/pilot/promise lifecycle.
5. Connect genuine five-role tasks, source-backed classification/contradictions, protected proposals, Gemma review, usage bounds and real event-driven scene.
6. Connect ElevenLabs to actual sources/scenarios/blockers and reviewable proposals; verify both sponsor integrations.
7. Finish plan commit/history, pilot amendments/next actions, exports/sharing, recovery/error/visual QA and a deployed end-to-end check where authorized.
8. Capture/render/inspect the video and prepare submission materials.

Meaningful acceptance journeys:

- **Arithmetic:** reproduce all seed figures; selecting Salesforce+CSV counts Juniper once; Salesforce+custom overbooks by 16; custom concentration is 100% in custom-only/no-existing-ARR scenario and 56.82% in the explicitly all-three future scenario. Unknown/zero/mixed-currency inputs do not invent totals. Changed inputs invalidate old results.
- **Capacity:** require dependencies; shared work is charged once and per-account setup separately; manual effort overrides preserve provenance; concurrent plan commits cannot spend the same capacity twice; rejected/stale proposals commit nothing. Custom work can be a justified founder choice.
- **Evidence:** one source-backed genuine task each for Scout/Diplomat/Quartermaster/Smith/Treasurer; role output, exact receipt and handoff version appear in the town. Distinguish public signal, inference, customer acknowledgment, reported usage and fixture.
- **Requests and promises:** shared Salesforce link opens both partner sources; proposed promise stays draft; incompatible cloud/on-premises request opens both passages and architecture limitation; configuration differences are not automatically incompatible. Reject/override/undo retains history.
- **Readiness:** strong usage plus no buyer/price/security still exposes blockers; unknowns remain in the denominator; N/A has reason; changed metric preserves prior outcome; paid state requires evidence. Missing telemetry shows unavailable. No selection click creates a sale.
- **Protected correction:** concurrent manual edit on the same field creates a conflict while an unrelated partner note retains its bytes/version; accepted patch stales affected review/plan only. Voice cannot bypass this path.
- **Modes and recovery:** demo is isolated; preview affects ghost/overlay state only; commit creates queued work but no delivered feature; a separately labeled fixture receipt demonstrates a stage change. Replay has no side effects. Refresh mid-task converges; duplicate callback or double-click commits once; late output after cancellation stays quarantined.
- **Auth and export:** real deployed OAuth/email callback where configured; direct cross-account API/storage/stream/voice requests fail; sign-out clears private state; revoked share stops access; exported selected records/formula inputs/source open outside app without credentials/private partner data by default.
- **Sponsor tools:** a real ElevenLabs session retrieves a promise and opens a computed plan proposal; actual configured Gemma review flags an unsupported claim and becomes stale after source change. Test denial/disconnect/malformed/injection/stale cases. Mocked tests are labeled and separate from genuine provider proof.

Run relevant unit/state/API tests and browser checks for these contracts. Inspect required viewports and all key dialogs/error states. Reopen exported files. A build pass is not complete integration proof. If a consenting intended founder is available, observe the task "inspect the large custom request, compare capacity/reuse, find purchase blockers and commit a decision"; record actual friction/results without invented savings or demand.

Judge rubric stays Technical 20%, Innovation 15%, Impact 20%, Completeness 15%, Design 10%, Presentation 10%, Judge preference 10%. Technical/impact/completeness = 55%. Keep docs/JUDGING-EVIDENCE.md with actual behavior/evidence and gaps; subjective judge preference and unobserved customer benefit remain unknown. Do not self-award perfect scores or guarantee prizes.

## 13. Video, operational handoff and completion

Deliver a two-minute 1920×1080 demo, 30-second teaser, SRT/VTT captions, original pixel thumbnail, raw captures, narration script and editable reproducible composition (a pinned Remotion project is suitable). Real app footage and legible numbers/source drawers are essential. Credits/licenses and mode labels remain visible where needed; no secrets or private partner details.

Main story:

- 0–15s: founder has an MVP and three fictional design partners; the biggest deal wants a custom workflow.
- 15–35s: select Kite's building, open exact request/promise and missing commercial gate; show genuinely completed agent work and Gemma source review.
- 35–65s: drag custom work into Scenario preview; show 46% total/92% discretionary capacity and the explicit concentration scenario.
- 65–90s: compare shared Salesforce; open the two source links, show USD 38,000 conditional opportunity, capacity and why CSV adds no extra deal value.
- 90–110s: ask ElevenLabs what blocks conversion; inspect real readiness tools, then review/commit the founder's plan. Queue/work changes are real; projected upgrades stay labeled.
- 110–120s: show saved decision, next owner/date/action and the pitch. If demonstrating a building upgrade, use an explicitly labeled fixture evidence event; no implied instant feature delivery or sale.

Keep a short separate technical proof of reconnect/retry or concurrent-edit preservation. Label recorded runs/time compression, fictional data and scenario projections. Rendering a marketing voiceover is not proof of ElevenLabs inside the app. Inspect the entire finished video for playback, audio, captions, arithmetic, readable UI and truthful wording.

Prepare concise Devpost draft, screenshots, architecture diagram, contributions placeholders, actual integrations, sources/credits, known limits and live-demo reset instructions. Export source/migrations/lockfile/env template, original art manifest, canonical seed, calculation assumptions/tests, selected redacted record/plan/formula bundle and setup/readiness report. Preserve deployment and provider account dependencies explicitly. No automatic private-repo publication, externally sent messages or event submission without existing authorization.

Complete the six-part prototype and retained auth/art/agent/sponsor/media requirements. Report actual implemented behavior and precise blockers; a blocked required integration stays incomplete. Preserve the old V4 vision as an optional future expansion, not another mandatory backlog. Do not trade the coherent design-partner decision for a broad platform tour.
