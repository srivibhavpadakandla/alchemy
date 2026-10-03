# Run and connect LaunchGuild

## Local app

Node 22+ is used in this checkout. Run `npm ci`, then `npm run dev`. Open http://localhost:3210. Production: `npm run build`, then `npm start`. Port 3210 avoids the unrelated Atelier Nove server. No existing project was overwritten.

`/demo` works without accounts and persists only to the `launchguild-fictional-v1` IndexedDB database. Its seed, sources, opportunities and events are fictional. The separate `/app` never falls back to fixture records.

## Accounts required for real integrations

Copy `.env.example` to `.env.local` and populate locally, never in chat or Git. Public Supabase URL/publishable key may appear in the client; all other keys are server-only.

1. Supabase: choose/create the intended project. Apply `supabase/migrations/001_launchguild.sql`, then 002, 003 and 004 in order. Set the URL, publishable key and service role key. Configure Google OAuth in Supabase and the Google console, set the site URL, and allow `http://localhost:3210/auth/callback` plus the eventual HTTPS callback. For email-code login, the template must include `{{ .Token }}`. The server calls `getUser()` rather than trusting a browser session. Members are owner/editor/viewer; all writes run through the server, validated domain commands, and a row-locked compare-and-swap function. Direct authenticated SQL writes are not granted.
2. OpenAI: set an application API key and explicit supported `OPENAI_MODEL_REASONING` / `OPENAI_MODEL_FAST`. Codex subscription and model setting do not establish API access. The role adapter checks the actual models endpoint and validates Responses structured output. Unsupported models fail visibly. No automatic fallback.
3. Google/Gemma: set `GOOGLE_API_KEY`, and confirm `GEMMA_MODEL=gemma-4-26b-a4b-it` in this account. The adapter checks the models endpoint, reviews only the selected source packet, validates IDs and refuses malformed output. See `reviewer/README.md`.
4. Inngest: set event and signing keys, register `/api/inngest`, and connect the deployment or local Inngest development server. Live role tasks persist pinned inputs, status and event cursors. Provider concurrency is three, bounded output 4,000 tokens, source packet 48,000 characters and two transient retries. Daily conservative reservation ceiling is 200,000 tokens; it is not a monetary billing claim. Actual provider bills remain unknown. Demo role calls use authenticated, bounded synchronous requests and do not claim hosted job proof.
5. ElevenLabs: configure a private agent, set its API key/agent ID, and configure blocking client tools `read_partner` with `partnerId`, `compare_capacity` with no arguments, and `propose_plan` with `workIds`. Tool endpoints verify membership on every call. Keep the agent read/propose-only and teach it to defer commitments to the visual review flow. Signed WebSocket setup is server-side. Microphone is opt-in and stops on close. Voice must be tested with real permission/connection/disconnection; narration does not establish voice integration.

Restart the server after environment changes. Settings reports configuration separately from successful provider receipts.

## Deployed acceptance still required

Use two independent authenticated users to verify OAuth/code callback, membership, cross-account API reads/writes, event cursors, revoked membership, share expiry/revocation and sign-out. Then run one real task per role, one real Gemma review on the intentionally unsupported claim, and one ElevenLabs retrieval/plan proposal. Save redacted request IDs and logs in `docs/provider-proof/`. Do not label configured adapters as verified integrations.

## Demo reset

Settings → Export program if needed → Reset demo town → confirm. Refresh. Three fictional partners and zero decisions/queued work return. Live records are unaffected. A browser-storage reset has the same local effect, but the application reset is preferred for demonstrations.

## Import and portability

CSV import requires stable `id`, `name`, `segment`, `annual_usd`, `problem` mapping; preview exposes errors before commit. Imports into live programs begin as unverified prospects. Canonical JSON reimport creates scoped correction proposals for matching stable IDs, never overwrites silently. Non-text source files, full historical archive restoration and billing connectors are not supported by this build.

## Accounts observed

The existing Chrome session reached Supabase's sign-in screen on October 3, 2026. Continuing requires the user's account authentication and displayed Terms acceptance. No project was created or altered, no credentials were generated, and no provider API call was claimed as verified.
