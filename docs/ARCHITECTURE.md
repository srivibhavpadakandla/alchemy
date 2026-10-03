# Architecture and trust boundaries

```mermaid
flowchart LR
  UI[Next.js town and founder review] --> D[Typed domain commands]
  D --> M[Deterministic capacity and readiness]
  D --> Demo[Isolated IndexedDB demo transaction]
  D --> API[Same-origin authenticated APIs]
  API --> Auth[Supabase verified user and membership]
  Auth --> DB[Normalized Postgres collections and RLS]
  DB --> CAS[Program row lock and version CAS]
  API --> Jobs[Inngest pinned role jobs]
  Jobs --> Budget[Transactional token reservation]
  Budget --> OpenAI[OpenAI Responses]
  API --> Gemma[Google Gemma reviewer]
  API --> Voice[ElevenLabs signed voice session]
  Voice --> Tools[Scoped read and proposal tools]
  Tools --> API
  CAS --> History[Immutable source and decision lineage]
```

Source notes are untrusted data. Model output cannot authorize a commitment or fabricate a measured event. AI writes validated proposals; founder commands own state transitions. Three call slots and bounded packets limit provider admission. Version mismatch quarantines stale results. Current result/event APIs support snapshot plus sequence-cursor recovery.

Database migrations store separate programs, memberships, partners, sources, requests, work, agreements, promises, observations, scenarios, decisions, runs, reviews, proposals and history collections. Core lookup IDs and version columns are relational; entity payloads are strictly validated by shared Zod schemas before server writes. There is no generic unvalidated entity bucket and no direct authenticated write policy.

The only service-role access is in server modules. Membership is rechecked for provider, export/share and voice access. Public shares are random-token, hashed-at-rest, redacted snapshots with expiry/revocation. Invitation acceptance checks the current verified email and consumes a token under a lock.

The local PGlite migration tests validate SQL behavior in an embedded PostgreSQL engine; they do not establish a deployed Supabase configuration or multi-browser OAuth acceptance.
