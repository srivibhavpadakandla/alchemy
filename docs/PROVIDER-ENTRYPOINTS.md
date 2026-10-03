# Live provider entrypoints

Read-only account-state inspection on October 3, 2026. No credentials, account identifiers, recipient addresses, phone numbers or existing project identifiers are recorded here.

## Email

The official [Resend login](https://resend.com/login) displayed a signed-out form with Google, GitHub and email choices. Its form explicitly states that signing in accepts the Terms of Service and Privacy Policy. The next concrete step is an authorized sign-in; stop at the Terms acceptance action for confirmation. No sign-in was attempted during this inspection.

After sign-in, inspect the intended Alchemy sender and existing keys. A new persistent key or copying a key into Alchemy grants application access and requires confirmation in the browser workflow. Keep all values in the ignored local environment file.

[Resend's API-key documentation](https://resend.com/docs/api-reference/api-keys/create-api-key) distinguishes `sending_access` from `full_access`. A send-only key cannot retrieve delivery receipts through the polling adapter. Alchemy now also implements a signed `/api/email-delivery` webhook; configuring its server-only `RESEND_WEBHOOK_SECRET` selects webhook receipts and disables account-read polling. This permits a send-only key. The HTTPS endpoint must be configured in Resend and live-verified before claiming delivery. Full access permits broader resource operations and must be described accurately before consent if polling is chosen.

For a test to the Resend account owner's own address, the default testing sender can be used within its restrictions. Other recipients require a verified sending domain and a sender on that domain. See [the resend.dev testing restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain). Select the consenting test recipient and review the message before a real send. The current app also needs its durable scheduler connected before enabling recurring automation.

## SMS

The official [Twilio Console](https://console.twilio.com/) redirected to a signed-out email login. The next concrete step is signing into the intended existing account and inspecting its Messaging setup. No login, phone purchase, account creation or SMS was attempted.

The current [Twilio trial guide](https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account) and [Try out SMS guide](https://www.twilio.com/docs/usage/trials/try-out-sms) describe verified recipients and restricted predefined message content in the newer trial experience. Inspect the actual account tier and console before expecting Alchemy's custom booking-confirmation text to work. Legacy and new trial experiences differ. Test credentials or a simulated virtual phone do not prove delivery to the user's device.

An existing SMS-capable sender, eligible account and consenting recipient are needed for the app's real SMS test. Phone verification codes must be completed by the owner when required; do not put codes or credentials into chat. Review any purchase or upgrade separately before it is submitted.

## Calendar

The official [Google Cloud console](https://console.cloud.google.com/) was already signed in. Its project selector search for `Alchemy` returned **No resources to display**. The currently selected project was unrelated and was not changed or modified.

The next concrete step is selecting or creating a dedicated Alchemy Cloud project, then configuring the Calendar API and an Alchemy OAuth client. Credential creation, persistent offline authorization and granting calendar access need explicit confirmation at the browser action. Do not reuse unrelated project credentials by assumption.

For an owner-controlled business calendar, consider `calendar.events.owned` for event operations plus `calendar.freebusy` for availability. For a shared calendar, review the corresponding `calendar.events` and availability scope against the actual ownership/access model. Google's [scope reference](https://developers.google.com/workspace/calendar/api/auth) describes these permissions and recommends the narrowest scope. This scope choice is a setup recommendation; it has not been granted or live-tested.

The server needs the OAuth client ID, secret, authorized refresh token and intended calendar ID stored privately. Google's [web-server OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server) explains the consent and offline-token flow. A connector's existing account access does not supply these credentials to the app.

Before the first live booking, the owner must identify the test date, start/end time and time zone, approve the operating brief/hours and review contact/invitation details. Inspect actual free/busy, create one reviewed event, then reopen that event and its durable receipt. No event was created during this investigation.

## Browser cleanup

Research tabs were opened in a separate browser session. They were not marked as outputs or handoffs because no pending provider action was started. The existing Supabase setup tab was not claimed or changed.
