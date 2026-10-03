import { DomainError } from "@/lib/commands";
import {
  applyEmailWebhook,
  emailWebhookBody,
  emailWebhookConfigured,
  verifyEmailWebhook,
} from "@/lib/trial-email-webhook";

export const runtime = "nodejs";
export async function POST(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    if (!emailWebhookConfigured())
      return Response.json(
        { error: "Webhook verification is not configured." },
        { status: 503, headers },
      );
    const receipt = verifyEmailWebhook(
      await emailWebhookBody(req),
      req.headers,
    );
    if (receipt) await applyEmailWebhook(receipt);
    return Response.json({ received: true }, { headers });
  } catch (e) {
    // No request body, recipients, credentials or database diagnostics are returned or logged.
    const status = e instanceof DomainError ? e.status : 503;
    return Response.json(
      {
        error:
          status >= 500
            ? "Delivery receipt could not be processed; retry."
            : "Invalid webhook.",
      },
      { status, headers },
    );
  }
}
