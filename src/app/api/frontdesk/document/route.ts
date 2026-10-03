import { extractFrontdeskPdf } from "@/lib/frontdesk-pdf";
import { apiError, checkOrigin, loadProgram } from "@/lib/repository";
import { DomainError } from "@/lib/commands";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const reader = req.body?.getReader();
    if (!reader) throw new DomainError("Document required.");
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.length;
      if (length > 5_300_000) {
        await reader.cancel();
        throw new DomainError("PDF intake is limited to 5 MB.", 413);
      }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const form = await new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": req.headers.get("content-type") || "" },
      body: bytes,
    }).formData();
    const mode = form.get("mode"),
      programId = String(form.get("programId") || "");
    if (mode === "live") {
      const { state, client, user } = await loadProgram(programId);
      const { data } = await client
        .from("memberships")
        .select("role")
        .eq("program_id", state.id)
        .eq("user_id", user.id)
        .single();
      if (!data || !["owner", "editor"].includes(data.role))
        throw new DomainError("Editor permission required", 403);
    } else if (
      mode !== "demo" ||
      process.env.LOCAL_CODEX_ENABLED !== "1" ||
      !["localhost", "127.0.0.1"].includes(new URL(req.url).hostname)
    )
      throw new DomainError(
        "Document parsing requires a signed-in workspace or enabled loopback sandbox.",
        403,
      );
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size > 5_000_000 ||
      !/\.pdf$/i.test(file.name)
    )
      throw new DomainError("Choose a PDF of at most 5 MB.");
    const data = new Uint8Array(await file.arrayBuffer());
    if (new TextDecoder().decode(data.slice(0, 5)) !== "%PDF-")
      throw new DomainError("The uploaded file is not a PDF.");
    const parsed = await extractFrontdeskPdf(data);
    return Response.json({ name: file.name.slice(0, 200), ...parsed });
  } catch (e) {
    return apiError(e);
  }
}
