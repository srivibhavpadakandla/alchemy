# Alchemy Frontdesk

Reference: the user's [Frontdesk video at 1:03](https://www.youtube.com/watch?v=8Snasswt39Y&t=63s) and supplied product description. The feature belongs inside Alchemy's customer-trial workspace. It uses original branding and UI code.

## Intended flow

Read a public business website and training documents, extract facts with exact source citations, review and edit the facts, ask only about remaining gaps, and save an approved operating knowledge base. Calendar, phone and messaging connections follow owner review.

The external booking path uses verified live identity, a customer scoped to the configured program, checked calendar availability, caller-confirmed details and a durable booking key. SMS requires separate opt-in. The provider receipt distinguishes calendar confirmation, SMS submission and uncertain outcomes.

## Source extraction

Website intake validates and pins public DNS, rejects redirects and restricted addresses, and bounds response size and time. Text, Markdown and text PDFs are supported; scanned PDFs fail with an explicit error. Intake is saved before a genuine OpenAI or enabled loopback Codex task runs. Exact original source IDs and quote matches are validated before draft facts are accepted. Owner edits preserve the extracted value and original citation; each fact must be verified before saving the operating brief. Draft knowledge is versioned separately. No model findings are fabricated when credentials or execution fail.

## Calendar and SMS setup

Apply all numbered Supabase migrations, including `007_frontdesk_bookings.sql`. Populate the server-only calendar variables in `.env.local`. The refresh token must belong to the intended business calendar; do not paste it into chat or a business knowledge document. The current server adapter binds it to `FRONTDESK_PROGRAM_ID`.

Review operating time zone, open/close hours and days with the business owner, then set the corresponding server variables. Days use Sunday=0 through Saturday=6. Free text in the onboarding brief is not automatically applied to server-side scheduling rules. Appointment windows are bounded to 5–240 minutes and the next 180 days.

After reviewing the saved brief against those server hours, copy its displayed fingerprint into `FRONTDESK_APPROVED_BRIEF_HASH`. Availability and booking require that exact latest scoped brief, confirmed facts, matching time zone and its approved appointment duration. Changes to the brief require applying the updated rules and fingerprint. Provider receipt refresh respects a persisted execution lease and never frees an uncertain reservation merely because a calendar lookup is missing or cancelled; its operator action explains reconciliation and unsent SMS.

Set the Twilio account credentials and approved sender for optional SMS. A successful API submission is not a delivered message. Receipt refresh uses read-only Google and Twilio lookups; it never rebooks or resends. Never automatically repeat an SMS whose outcome is uncertain.

The implementation uses the official [Google free/busy endpoint](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query), [calendar event insertion](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert), and [Twilio message API](https://www.twilio.com/docs/messaging/api/message-resource). A deterministic event ID, durable reservation and overlapping-window protection bound repeated booking requests. Availability can still change when another application writes to the business calendar.

## Inbound voice configuration

Provision or connect the intended phone number in the provider's own account. Configure the private ElevenLabs agent with the approved knowledge base and two webhook tools to the deployed HTTPS `/api/frontdesk/tools` endpoint: `availability` and `book`. Set `x-alchemy-frontdesk-key` as a secret header matching a random server secret of at least 32 characters. Bind the server's program and customer record with `FRONTDESK_PROGRAM_ID` and `FRONTDESK_PARTNER_ID`. The caller must not choose the tool's tenant or customer scope.

The agent must check availability first, repeat the proposed date/time/zone and contact details, obtain explicit caller confirmation, and only then call `book` with `confirmed:true` and a stable UUID key. Ask for SMS consent separately. An uncertain calendar/SMS outcome requires reconciliation rather than another booking key. Follow [ElevenLabs webhook-tool configuration](https://elevenlabs.io/docs/eleven-agents/customization/tools/webhook-tools).

An environment variable containing a phone number does not establish that the number is connected or dialable. Imported knowledge is not automatically pushed into a provider agent until that integration is actually configured and verified.

## Live acceptance

Use an authorized test caller and recipient. Verify website and document ingestion, exact citations, owner edits and missing-information questions. Confirm approved business hours match the calendar integration. Place one actual inbound call, book a free window, reopen the calendar event, inspect the durable receipt and verify the recipient's SMS. Retry the same booking key and confirm no duplicate event/message. Test an occupied slot, revoked member, foreign customer, failed provider and uncertain timeout. Hosted identity, phone provisioning and external delivery remain unverified until those checks are completed.
