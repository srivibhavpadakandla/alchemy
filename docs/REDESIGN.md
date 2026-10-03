# LaunchGuild interface redesign — 2026-10-03

The interface now gives the town, current evidence, and actual agent work distinct places. A restrained green/ivory workspace surrounds the original pixel village. The partner ledger and capacity comparison sit below it. Mobile keeps the map horizontally scrollable rather than shrinking labels into unreadable text.

Reference study (official pages, inspected October 3):
- [Productboard](https://www.productboard.com/customer-feedback-tool/): keep feedback/source material close to product decisions.
- [Linear agents](https://linear.app/docs/agents-in-linear): inspectable agent work with clear status and results.
- [Gather](https://www.gather.town/): a legible spatial environment for people and presence.

These patterns informed the hierarchy; no company artwork, branding, or interface was copied.

## Artwork

`public/art/guild-world.png` was generated with the built-in `image_gen.imagegen` tool. It is a new original raster asset, separate from the earlier CC0 procedural SVG assets. Prompt direction: detailed 16-bit RPG pixel village in an oblique top-down view, forest boundary, stone guild hall, observatory, diplomat pavilion, quartermaster depot, forge, treasurer archive, three distinct partner cottages, pond, connected stone paths; no text, UI, logos, or people. Warm natural palette and crisp stepped pixel edges. Interactive labels and working indicators are separate accessible HTML controls.

The illustration is decorative; labels reflect actual saved relationship state. It does not claim a painted building proves a milestone, payment, or provisioned integration.

## Real local agent execution

The optional local runner uses the installed Codex CLI's existing authentication. It does not extract credentials. Enable `LOCAL_CODEX_ENABLED=1` in `.env.local`, sign in with `codex login`, and use `npm run start` after building. The server binds to 127.0.0.1.

Open `/demo/agents`, select a specialist, and run it. Each task pins a bounded source packet, starts an actual Codex process, records public session/turn events, parses a structured result, checks cited IDs and exact quotes, then saves it for founder review. Results and session IDs remain after refresh. Source chips open the original evidence. Changed source inputs quarantine old results; tasks cannot change records or send messages themselves.

The CLI runs read-only in a temporary empty directory, with shell, plugins, apps, browser, computer, image, memory, and multi-agent features disabled. A same-origin loopback endpoint and an HttpOnly session cookie scope task receipts. Limits: two concurrent tasks, 20 starts per UTC day, 48,000 source characters, 180 seconds per task. Cancellation terminates the process. Records in `.launchguild-local/` are private local receipts, excluded from Git and packages. Local demo records are transmitted to the configured Codex model when Run is clicked; they are fictional but browser edits may change their contents.

This proves local Codex execution only. Supabase multi-user persistence, the hosted OpenAI API path, Gemma review, ElevenLabs voice, and Inngest deployment remain separate integrations requiring their own configured credentials and live verification. Existing demo video files show the previous interface and are not evidence of the redesign.

## Verification

All five specialists completed actual local Codex tasks and reached `needs-review` after structured-output and citation checks. One earlier Smith response failed exact-quote validation and remains recorded as failed; two Quartermaster runs were explicitly cancelled while checking process termination. The final cancellation check confirmed both wrapper and native CLI processes were gone. No failed or cancelled result was accepted.

Production build and typecheck passed. 45 unit/SQL/mocked-provider tests and 15 browser tests passed. Six routes passed automated accessibility checks; eight surfaces were checked at 1440, 1280, 768 and 390 pixels. Actual result reload, exact-source drawer and mobile overflow checks passed. See `../artifacts/local-agent-proof.json`, `../artifacts/local-cancellation-proof.json` and `../artifacts/redesign-browser-proof.json`.
