import { describe, expect, it } from "vitest";
import { extractFrontdeskPdf } from "../src/lib/frontdesk-pdf";

function fictionalPdf(text: string, pageCount = 1) {
  const lines = text.match(/.{1,70}/g) || [];
  const stream = text
    ? `BT /F1 8 Tf 40 740 Td ${lines.map((line, index) => `${index ? "0 -7 Td " : ""}(${line}) Tj`).join("\n")} ET`
    : "";
  const pages = Array.from(
    { length: pageCount },
    (_, index) => `${5 + index} 0 R`,
  );
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.join(" ")}] /Count ${pageCount} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    ...pages.map(
      () =>
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents 4 0 R >>",
    ),
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

describe("real serverless PDF text extraction", () => {
  it("extracts a fictional text PDF without a separate worker or native canvas", async () => {
    const text =
      "Fictional Acme Plumbing. Open Monday to Friday from 9am to 5pm.";
    const parsed = await extractFrontdeskPdf(fictionalPdf(text));
    expect(parsed).toMatchObject({
      text,
      pages: 1,
      parser: "unpdf",
      status: "extracted",
    });
  });

  it("rejects image-only or empty PDFs without creating training text", async () => {
    await expect(extractFrontdeskPdf(fictionalPdf(""))).rejects.toThrow(
      "Scanned documents require OCR",
    );
  });

  it("rejects complete documents beyond the page limit", async () => {
    await expect(
      extractFrontdeskPdf(fictionalPdf("Fictional training note.", 21)),
    ).rejects.toThrow("no partial file was accepted");
  });

  it("rejects oversized extracted text instead of silently truncating", async () => {
    await expect(
      extractFrontdeskPdf(fictionalPdf("fictional ".repeat(601))),
    ).rejects.toThrow("6,000 extracted characters");
  });

  it("rejects invalid PDF data through the genuine parser", async () => {
    await expect(
      extractFrontdeskPdf(new TextEncoder().encode("%PDF-invalid")),
    ).rejects.toThrow();
  });
});
