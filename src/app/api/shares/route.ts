import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { loadProgram, checkOrigin, readBody, apiError } from "@/lib/repository";
import { adminClient } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/commands";
import { redactedShare } from "@/lib/sharing";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const b = z
      .object({
        programId: z.string(),
        action: z.enum(["create", "revoke"]),
        tokenHash: z.string().optional(),
      })
      .parse(await readBody(req));
    const { state, user, client } = await loadProgram(b.programId);
    const { data } = await client
      .from("memberships")
      .select("role")
      .eq("program_id", state.id)
      .eq("user_id", user.id)
      .single();
    if (data?.role !== "owner")
      throw new DomainError(
        "Only the program owner can manage public sharing",
        403,
      );
    const admin = adminClient();
    if (b.action === "revoke") {
      const { error } = await admin
        .from("share_links")
        .update({ revoked_at: new Date().toISOString() })
        .eq("program_id", state.id)
        .eq("token_hash", b.tokenHash);
      if (error) throw error;
      return Response.json({ revoked: true });
    }
    const token = randomBytes(32).toString("base64url"),
      tokenHash = createHash("sha256").update(token).digest("hex");
    const { error } = await admin
      .from("share_links")
      .insert({
        token_hash: tokenHash,
        program_id: state.id,
        payload: redactedShare(state),
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
    if (error) throw error;
    return Response.json({
      url: `${new URL(req.url).origin}/share/${token}`,
      tokenHash,
    });
  } catch (e) {
    return apiError(e);
  }
}
