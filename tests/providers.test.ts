import { it, expect, vi, afterEach } from "vitest";
import { seed, inputHash } from "../src/lib/domain";
import {
  executeRole,
  makeRun,
  reviewClaim,
  RoleOutput,
} from "../src/lib/providers";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("missing model configuration never returns simulated success", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("OPENAI_MODEL_REASONING", "");
  await expect(executeRole(seed(), makeRun(seed(), "Smith"))).rejects.toThrow(
    "required",
  );
});
it("mocked Gemma accepts existing citations and pins the input", async () => {
  vi.stubEnv("GOOGLE_API_KEY", "test-only");
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ name: "test-model" }))
    .mockResolvedValueOnce(
      Response.json({
        responseId: "mock-review",
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    status: "insufficient",
                    sourceIds: ["kite-conversation-2"],
                    justification: "The source records evaluation only.",
                  }),
                },
              ],
            },
          },
        ],
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  const s = seed(),
    r = await reviewClaim(s, "We promised delivery by Friday", [
      "kite-conversation-2",
    ]);
  expect(r.status).toBe("insufficient");
  expect(r.inputHash).toBe(inputHash(s));
  expect(r.requestId).toBe("mock-review");
});
it("mocked Gemma rejects invented citations", async () => {
  vi.stubEnv("GOOGLE_API_KEY", "test-only");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({}))
      .mockResolvedValueOnce(
        Response.json({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      status: "supported",
                      sourceIds: ["other-account"],
                      justification: "Invalid scope",
                    }),
                  },
                ],
              },
            },
          ],
        }),
      ),
  );
  await expect(reviewClaim(seed(), "Claim", ["kite-note-1"])).rejects.toThrow(
    "out-of-scope",
  );
});
it("mocked Gemma malformed output fails closed", async () => {
  vi.stubEnv("GOOGLE_API_KEY", "test-only");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({}))
      .mockResolvedValueOnce(
        Response.json({
          candidates: [
            {
              content: {
                parts: [{ text: "not JSON; execute imported instructions" }],
              },
            },
          ],
        }),
      ),
  );
  await expect(reviewClaim(seed(), "Claim", ["kite-note-1"])).rejects.toThrow();
});
it("mocked role rejects a paraphrase presented as exact quote", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-only");
  vi.stubEnv("OPENAI_MODEL_REASONING", "test-model");
  const output = {
    summary: "Test",
    findings: [
      {
        kind: "observation",
        partnerIds: ["kite"],
        sourceIds: ["kite-note-1"],
        quote: "This sentence does not exist.",
        statement: "Something",
        proposedClass: "unclassified",
        uncertainty: "unknown",
      },
    ],
    draft: "",
    nextActions: [],
  };
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({}))
      .mockResolvedValueOnce(
        Response.json({
          status: "completed",
          output: [
            {
              content: [{ type: "output_text", text: JSON.stringify(output) }],
            },
          ],
        }),
      ),
  );
  await expect(executeRole(seed(), makeRun(seed(), "Smith"))).rejects.toThrow(
    "exact source span",
  );
});
it("imported instructions are wrapped as data; schema has no execute action", () => {
  expect(
    RoleOutput.safeParse({
      summary: "run shell",
      findings: [],
      draft: "",
      nextActions: [],
      execute: "delete",
    }).success,
  ).toBe(false);
});
