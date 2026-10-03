# Cloudflare deployment

Alchemy runs as a full Next.js application on Cloudflare Workers through OpenNext. The worker is named `alchemy`, serves `.open-next/assets`, and keeps server-rendered pages and API routes. It is not a static export.

The adapter is pinned to `@opennextjs/cloudflare` 1.20.8 and Wrangler to 4.147.0. Its build imports require top-level `esbuild`, pinned to 0.28.2. The adapter's current peer range includes Next.js 16.3.8. Configuration uses the 2026-10-03 compatibility date and `global_fetch_strictly_public` so outbound fetches use the public Cloudflare front door. The self-reference service binding points to the same `alchemy` worker. The public origin is `https://alchemy.srivibhavp.workers.dev`.

## Build and preview

```sh
npm ci
npm run typecheck
npm run build:cloudflare
npm run dry-run:cloudflare
npm run preview:cloudflare
```

`npm run build` remains the normal Next.js build. The Cloudflare build invokes it before producing `.open-next/worker.js`. Preview runs the actual Workers runtime locally; it does not replace the original loopback app server. Build output, Wrangler state and local `.dev.vars` are ignored by Git.

Do not copy the development `.env.local`, `.launchguild-local`, private agent receipts, or credentials into the deploy checkout or static assets. Build only with the intended hosted public configuration. Next.js inlines `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` at build time; setting them only after deployment cannot repair an already built browser bundle.

## Hosted configuration

Set `APP_ORIGIN` to the exact HTTPS Workers URL before enabling links, booking or email. Keep `LOCAL_CODEX_ENABLED=0` and `ALCHEMY_RUNTIME=cloudflare`. The local Codex CLI is intentionally unavailable from public hosts and is not a hosted AI substitute.

Configure the Supabase public URL and publishable key for both build and runtime. Store `SUPABASE_SERVICE_ROLE_KEY`, model keys, Inngest signing/event keys, Resend credentials and other provider secrets as Cloudflare secret bindings, never committed `vars`. Configure only Alchemy's approved Supabase project. Set its Site URL and exact redirect allowlist to the deployed origin and `/auth/callback`; do not add wildcard callbacks.

Inngest requires its hosted app to synchronize the deployed `/api/inngest` endpoint. A route deployment alone does not start scheduled jobs. Resend receipt webhooks use `/api/email-delivery` and require the configured webhook signature secret. Email, SMS and calendar actions still require the applicable provider configuration, reviewed scopes and real destinations.

## Runtime differences

The Node development scraper pins DNS results in its HTTPS connection. Workers does not implement `dns.lookup` or custom HTTPS `lookup`. The Workers scraper instead screens public DNS records and uses native fetch with Cloudflare's public egress restriction, rejected redirects, a 10-second deadline and a 250 KB streamed response limit. This is a platform-enforced network boundary; it is not DNS pinning.

PDF parsing uses pinned `unpdf` 1.8.1 and its embedded serverless PDF.js worker to avoid native canvas modules and dynamic external worker files. A standalone local Workers runtime check passed a real fictional text PDF and rejected blank, oversized and invalid PDFs. A successful Next.js build alone does not prove hosted authenticated upload. Cloudflare's Free plan allows 10 ms CPU per request and 128 MB per isolate; SSR and document parsing require production verification under that limit. Deployment must not silently upgrade a paid plan.

## Local deployment validation

On 2026-10-03, the OpenNext build and Wrangler dry run succeeded with all SSR pages and API routes included. Wrangler reported 146 static assets and a 2,926.77 KiB compressed Worker upload. A real local Workers preview returned HTTP 200 for the home page, Frontdesk demo, login, gallery image and provider status. It rejected local agent execution with HTTP 403 because the public deployment configuration disables the CLI runner. Without hosted Supabase keys, the program route correctly reported configuration missing; this is not an authenticated workspace acceptance test. No deployment or external provider send is inferred from these local checks.

## Publish and verify

After a successful build, dry run and preview, the authorized operator can run:

```sh
npm run deploy:cloudflare
```

The deployment script preserves dashboard variables. Verify the returned HTTPS URL, artwork, login, authenticated workspace persistence, API authorization and provider status. Verify the exact published version instead of treating the uploaded artifact as proof of working app authentication or external delivery.

## Official references

- [OpenNext setup and scripts](https://opennext.js.org/cloudflare/get-started)
- [OpenNext supported Next.js versions](https://opennext.js.org/cloudflare)
- [Build and runtime environment variables](https://opennext.js.org/cloudflare/howtos/env-vars)
- [Cloudflare DNS compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/dns/)
- [Cloudflare network security model](https://developers.cloudflare.com/workers/reference/security-model/)
- [Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/)
- [UnPDF serverless PDF.js worker](https://github.com/unjs/unpdf)
