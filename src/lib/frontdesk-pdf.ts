import { extractText, getDocumentProxy } from "unpdf";
import { DomainError } from "./commands";

export async function extractFrontdeskPdf(data: Uint8Array) {
  const document = await getDocumentProxy(data, {
    disableFontFace: true,
    useSystemFonts: true,
    standardFontDataUrl: undefined,
    cMapUrl: undefined,
    verbosity: 0,
  });
  try {
    if (document.numPages > 20) throw oversizedPdf();
    const parsed = await extractText(document, { mergePages: true });
    const text = parsed.text.trim();
    if (text.replace(/[^\p{L}\p{N}]/gu, "").length < 10)
      throw new DomainError(
        "No usable PDF text found. Scanned documents require OCR or an approved text version. No training text was created.",
      );
    if (text.length > 6000) throw oversizedPdf();
    return {
      text,
      pages: parsed.totalPages,
      parser: "unpdf",
      status: "extracted",
    };
  } finally {
    await document.loadingTask.destroy();
  }
}

function oversizedPdf() {
  return new DomainError(
    "PDF training intake supports up to 20 pages and 6,000 extracted characters. Provide a smaller document or approved text excerpt; no partial file was accepted.",
  );
}
