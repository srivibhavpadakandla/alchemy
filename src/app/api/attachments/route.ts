import { createHash } from "node:crypto";
import { identity } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import {
  loadProgram,
  saveProgram,
  apiError,
  checkOrigin,
} from "@/lib/repository";
import { DomainError, applyCommand } from "@/lib/commands";
import { SourceSchema, hash } from "@/lib/domain";
export const runtime = "nodejs";
export async function GET(req: Request) {
  try {
    const { client } = await identity();
    const url = new URL(req.url),
      id = url.searchParams.get("id");
    if (id) {
      const { data, error } = await client
        .from("trial_attachments")
        .select("object_path,filename")
        .eq("id", id)
        .single();
      if (error || !data)
        throw new DomainError("Attachment not found or access denied", 403);
      const { data: signed, error: signError } = await adminClient()
        .storage.from("alchemy-evidence")
        .createSignedUrl(data.object_path, 60, { download: data.filename });
      if (signError || !signed) throw Error("Private file link unavailable");
      return Response.json(
        { url: signed.signedUrl, expiresIn: 60 },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const programId = url.searchParams.get("programId"),
      partnerId = url.searchParams.get("partnerId");
    if (!programId || !partnerId)
      throw new DomainError("Customer scope required");
    const { data, error } = await client
      .from("trial_attachments")
      .select("id,filename,mime_type,size_bytes,sha256,source_id,created_at")
      .eq("program_id", programId)
      .eq("partner_id", partnerId);
    if (error) throw error;
    return Response.json(
      { attachments: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { user } = await identity();
    const limit = 5 * 1024 * 1024 + 65536;
    if (Number(req.headers.get("content-length") ?? 0) > limit)
      throw new DomainError("File exceeds 5 MB", 413);
    const reader = req.body?.getReader();
    if (!reader) throw Error("File required");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > limit) {
        await reader.cancel();
        throw new DomainError("File exceeds 5 MB", 413);
      }
      chunks.push(part.value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) {
      body.set(c, offset);
      offset += c.length;
    }
    const form = await new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": req.headers.get("Content-Type") ?? "" },
      body,
    }).formData();
    const file = form.get("file"),
      programId = String(form.get("programId") ?? ""),
      partnerId = String(form.get("partnerId") ?? "");
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024)
      throw new DomainError("A PDF, PNG or JPEG up to 5 MB is required");
    const { state, client } = await loadProgram(programId);
    const { data: member } = await client
      .from("memberships")
      .select("role")
      .eq("program_id", state.id)
      .eq("user_id", user.id)
      .single();
    if (
      !member ||
      !["owner", "editor"].includes(member.role) ||
      !state.partners.some((p) => p.id === partnerId)
    )
      throw new DomainError("Customer write access required", 403);
    const bytes = Buffer.from(await file.arrayBuffer());
    const signatures: Record<string, boolean> = {
      "application/pdf": bytes.subarray(0, 5).toString() === "%PDF-",
      "image/png": bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      "image/jpeg": bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    };
    if (!signatures[file.type])
      throw new DomainError("File content does not match an allowed type");
    const id = crypto.randomUUID(),
      objectPath = `${encodeURIComponent(state.id)}/${encodeURIComponent(partnerId)}/${id}`,
      filename = file.name.replace(/[\x00-\x1f/\\]/g, "_").slice(0, 200),
      sha = createHash("sha256").update(bytes).digest("hex"),
      now = new Date().toISOString();
    const content = `Private attachment: ${filename}. Type: ${file.type}. Bytes: ${file.size}. SHA-256: ${sha}. Attachment ID: ${id}. The file content has not been extracted or verified by a model.`;
    const source = SourceSchema.parse({
      id: `attachment-${id}`,
      partnerId,
      version: 1,
      kind: "reported note",
      title: `Attachment receipt · ${filename}`,
      content,
      author: user.id,
      occurredAt: now.slice(0, 10),
      recordedAt: now,
      hash: hash(content),
      scope: "program members",
      quoteStart: 0,
      quoteEnd: content.length,
    });
    const admin = adminClient();
    const { error: uploadError } = await admin.storage
      .from("alchemy-evidence")
      .upload(objectPath, bytes, { contentType: file.type, upsert: false });
    if (uploadError) throw Error("Private upload failed");
    try {
      const next = applyCommand(
        state,
        { type: "source.add", source, key: id, expectedVersion: state.version },
        user.id,
      );
      const { error: metadata } = await admin
        .from("trial_attachments")
        .insert({
          id,
          program_id: state.id,
          partner_id: partnerId,
          source_id: source.id,
          object_path: objectPath,
          filename,
          mime_type: file.type,
          size_bytes: file.size,
          sha256: sha,
          uploaded_by: user.id,
        });
      if (metadata) throw metadata;
      await saveProgram(next, state.version, id);
    } catch (e) {
      const { error: cleanup } = await admin.storage
        .from("alchemy-evidence")
        .remove([objectPath]);
      const { error: metadataCleanup } = await admin
        .from("trial_attachments")
        .delete()
        .eq("id", id);
      if (cleanup || metadataCleanup)
        throw Error(
          "Record save failed. Private orphan-file cleanup requires operator review.",
        );
      throw e;
    }
    return Response.json(
      { id, sourceId: source.id, filename, size: file.size, sha256: sha },
      { status: 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}
