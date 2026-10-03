import { z } from "zod";

export const BRIEF_TITLE = "Frontdesk operating brief";
export const FactSchema = z.object({
  field: z.enum([
    "businessName",
    "services",
    "trade",
    "businessHours",
    "timeZone",
    "appointmentMinutes",
    "escalation",
    "pricing",
    "serviceArea",
    "bookingPurpose",
  ]),
  value: z.string().min(1).max(1000),
  sourceId: z.string().min(1),
  quote: z.string().min(1).max(1200),
  status: z.enum(["draft", "confirmed"]),
  originalValue: z.string().max(1000).default(""),
});
export type Fact = z.infer<typeof FactSchema>;
export const ExtractionSchema = z
  .object({
    facts: z
      .array(FactSchema.omit({ status: true, originalValue: true }))
      .max(16),
  })
  .strict();
export const FrontdeskBrief = z.object({
  schema: z.literal("alchemy-frontdesk-v1"),
  trade: z.string().min(1).max(100),
  website: z.string().max(1000),
  websiteContext: z.string().max(6000),
  documents: z
    .array(z.object({ name: z.string().max(200), text: z.string().max(6000) }))
    .max(3),
  businessHours: z.string().min(1).max(500),
  timeZone: z.string().min(1).max(100),
  bookingPurpose: z.string().trim().min(1).max(500),
  appointmentMinutes: z.number().int().min(15).max(120),
  escalation: z.string().min(5).max(1000),
  pricing: z.string().max(1000),
  facts: z.array(FactSchema).max(16).default([]),
  extractionReceipt: z
    .object({
      provider: z.string(),
      requestId: z.string(),
      tokens: z.number().nullable(),
      at: z.string(),
    })
    .nullable()
    .default(null),
  intakeSourceIds: z.array(z.string()).max(4).default([]),
});
export const DraftBrief = FrontdeskBrief.extend({
  businessHours: z.string().max(500),
  timeZone: z.string().max(100),
});
export type Brief = z.infer<typeof FrontdeskBrief>;
export function usableOperationalFact(fact: Pick<Fact, "field" | "value">) {
  if (fact.field === "appointmentMinutes") {
    return (
      /^\d+$/.test(fact.value.trim()) &&
      FrontdeskBrief.shape.appointmentMinutes.safeParse(Number(fact.value))
        .success
    );
  }
  if (
    [
      "businessHours",
      "timeZone",
      "bookingPurpose",
      "escalation",
      "pricing",
    ].includes(fact.field)
  ) {
    const shape =
      FrontdeskBrief.shape[
        fact.field as
          | "businessHours"
          | "timeZone"
          | "bookingPurpose"
          | "escalation"
          | "pricing"
      ];
    if (!shape.safeParse(fact.value.trim()).success) return false;
    if (fact.field === "timeZone") {
      try {
        new Intl.DateTimeFormat("en", { timeZone: fact.value.trim() }).format();
      } catch {
        return false;
      }
    }
  }
  return !!fact.value.trim();
}
export const blankBrief: Brief = {
  schema: "alchemy-frontdesk-v1",
  trade: "",
  website: "",
  websiteContext: "",
  documents: [],
  businessHours: "",
  timeZone: "",
  bookingPurpose: "Trial kickoff",
  appointmentMinutes: 30,
  escalation:
    "Take a message for the trial owner. Never promise an unverified booking or product outcome.",
  pricing:
    "Do not quote a price or accept payment. Refer commercial questions to the trial owner.",
  facts: [],
  extractionReceipt: null,
  intakeSourceIds: [],
};
export function readDraft(content: string): Brief | null {
  try {
    const parsed = DraftBrief.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export function readBrief(content: string): Brief | null {
  try {
    const parsed = FrontdeskBrief.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
