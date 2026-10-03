# LaunchGuild claim reviewer

The separable reviewer is `src/lib/providers.ts`: `ReviewOutput`, `providerFetch`, and `reviewClaim` use only Zod and the typed source packet. `reviewClaim` returns an existing-ID-cited supported / contradicted / insufficient / explicit-assumption finding. It does not write a customer record. The calling application must verify membership, reserve usage, and compare `inputHash` before accepting it.

Prompt version: `claim-review-v1`. Default configurable model: `gemma-4-26b-a4b-it`. Hosted Google inference, not local inference. A model metadata preflight and a genuine generated response are required. No real call was verified without account credentials.

Export scope: this reviewer code, synthetic fixtures and its tests may be separated under MIT. Do not publish private application sources or partner records by inference from this license. Google model and service terms remain separate.

Tests in `tests/providers.test.ts` use mocked provider responses and explicitly do not establish sponsor proof.
