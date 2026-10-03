import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { identity } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { loadProgram, checkOrigin, readBody, apiError } from "@/lib/repository";
import { DomainError } from "@/lib/commands";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const b = z
      .object({
        action: z.enum(["invite", "accept", "revoke", "delete"]),
        programId: z.string().optional(),
        email: z.email().optional(),
        role: z.enum(["editor", "viewer", "customer"]).optional(),
        partnerId: z.string().optional(),
        token: z.string().optional(),
        userId: z.string().optional(),
        confirmation: z.string().optional(),
      })
      .parse(await readBody(req));
    const { user } = await identity(),
      admin = adminClient();
    if (b.action === "accept") {
      if (!user.email_confirmed_at || !user.email)
        throw new DomainError("Verified email required", 403);
      const tokenHash = createHash("sha256")
        .update(b.token ?? "")
        .digest("hex");
      const { data: invitation } = await admin
        .from("invitations")
        .select("role,partner_id")
        .eq("token_hash", tokenHash)
        .single();
      const { data, error } = await admin.rpc("accept_invitation", {
        p_hash: createHash("sha256")
          .update(b.token ?? "")
          .digest("hex"),
        p_user: user.id,
        p_email: user.email,
      });
      if (error) throw error;
      return Response.json({
        programId: data,
        partnerId:
          invitation?.role === "customer" ? invitation.partner_id : null,
      });
    }
    const { state, client } = await loadProgram(b.programId ?? "default");
    const { data } = await client
      .from("memberships")
      .select("role")
      .eq("program_id", state.id)
      .eq("user_id", user.id)
      .single();
    if (data?.role !== "owner")
      throw new DomainError("Owner permission required", 403);
    if (b.action === "delete") {
      if (b.confirmation !== state.name)
        throw Error("Type the exact program name before deleting");
      const { error } = await admin
        .from("programs")
        .delete()
        .eq("id", state.id)
        .eq("owner_id", user.id);
      if (error) throw error;
      return Response.json({ deleted: true });
    }
    if (b.action === "revoke") {
      if (b.userId === user.id)
        throw Error("The owner cannot remove their own ownership");
      const { error } = await admin
        .from("memberships")
        .delete()
        .eq("program_id", state.id)
        .eq("user_id", b.userId);
      if (error) throw error;
      return Response.json({ revoked: true });
    }
    if (!b.email || !b.role) throw Error("Email and role required");
    if (
      b.role === "customer" &&
      !state.partners.some((p) => p.id === b.partnerId)
    )
      throw new DomainError("Select a customer in this workspace", 400);
    const token = randomBytes(32).toString("base64url");
    const { error } = await admin.from("invitations").insert({
      id: crypto.randomUUID(),
      program_id: state.id,
      invited_email: b.email.toLowerCase(),
      role: b.role,
      partner_id: b.role === "customer" ? b.partnerId : null,
      token_hash: createHash("sha256").update(token).digest("hex"),
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      created_by: user.id,
    });
    if (error) throw error;
    return Response.json({
      url: `${new URL(req.url).origin}/invite/${token}`,
      sent: false,
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function GET(req: Request) {
  try {
    const { state, client, user } = await loadProgram(
      new URL(req.url).searchParams.get("programId") ?? "default",
    );
    const { data } = await client
      .from("memberships")
      .select("role")
      .eq("program_id", state.id)
      .eq("user_id", user.id)
      .single();
    if (data?.role !== "owner")
      throw new DomainError("Owner permission required", 403);
    const { data: members, error } = await adminClient()
      .from("memberships")
      .select("user_id,role")
      .eq("program_id", state.id);
    if (error) throw error;
    return Response.json({ members });
  } catch (e) {
    return apiError(e);
  }
}
