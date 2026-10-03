# Reviewed trial email automation

The user requested automatic email messages in the customer-trial workflow. This feature authorizes configured automation for reviewed pilot recipients; it does not authorize sending arbitrary real messages during development.

## Enable a pilot

Apply `008_trial_email.sql`, configure `RESEND_API_KEY` and an approved `EMAIL_FROM` address from a verified sending domain, and connect the Inngest endpoint. Both sides must first review the current trial plan. On the trial's Tasks page, review recipients, triggers, actual message preview, schedule and time zone before enabling. Pause or cancel future unsent messages from the same panel. A server-validated digest binds the reviewed preview to the current program, plan and normalized settings. A changed plan or settings requires another preview and review.

The daily schedule is checked by a durable job every 15 minutes. Only customer-owned tasks appear in customer emails. Enabled triggers cover kickoff, customer task assignment, due reminders, missing weekly measurements and trial-end review. Completed work, submitted measurement evidence and paused/stopped trials suppress the corresponding messages. Report links lead to the authenticated, customer-scoped portal rather than exposing internal notes.

## Receipts and recovery

A durable event/recipient key prevents duplicate submissions. Provider retries retain the original message and the same key, allow at most three attempts within one hour, and stop when the current pilot state no longer permits the message. Pending, accepted, delivered, failed, uncertain and cancelled remain distinct. Provider acceptance is not delivery; a delivered state requires the provider's own receipt. Reply detection is not implemented.

For a send-only Resend API key, configure an HTTPS webhook at `/api/email-delivery`, subscribe to `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.failed`, and `email.suppressed`, and save its signing secret as `RESEND_WEBHOOK_SECRET` in the ignored local environment. `email.delivery_delayed` is also accepted but does not prove delivery. Configuring the webhook disables API receipt polling. Without it, receipt polling requires a key with read access.

The webhook verifies the exact request body and timestamp with the official Svix SDK, then matches the saved provider ID, sender and single recipient. Duplicate or out-of-order events cannot regress a terminal outcome; negative receipts can override an earlier delivery receipt. Unrelated signed account events are acknowledged without changing records. A signed Alchemy tag only triggers a retry when its already-submitted record is awaiting the send response; it cannot bind an unknown provider ID. Delivered means acceptance by the recipient mail server, not inbox placement or an opened message.

The adapter uses [Resend send email](https://resend.com/docs/api-reference/emails/send-email), [provider idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [signed webhooks](https://resend.com/docs/webhooks/verify-webhooks-requests) and [delivery retrieval](https://resend.com/docs/api-reference/emails/retrieve-email). Durable application records persist beyond the provider's retry window. Unknown outcomes require reconciliation; do not erase receipts and send again.

## Live acceptance still required

Use one consenting test recipient on a reviewed real pilot. Cause one due customer task, verify one actual message and its provider ID, then verify delivery separately. Retry the job and confirm no duplicate. Complete the task and confirm future reminders are suppressed. Test paused automation, changed plan, revoked editor, provider rejection, timeout and recovery. No real email send is claimed from local tests, fixture records or missing credentials.
