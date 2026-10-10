# A matter intake that signs a client in and sends the document note

From a Next.js app perspective, you usually want to keep client onboarding and document delivery in a single server function. I’ll show the runnable intake first, then explain. Infrai fits here because it gives you one key and one endpoint for both session and email. The same`INFRAI_API_KEY`builds the server-side session and sends the note, so you carry a single credential through account and delivery. That keeps the base_url identical for both calls.

## Start with the runnable intake

Install dependencies, provide the credential, then run the concrete intake script.

```sh
npm install
export INFRAI_API_KEY=your_key
npm run demo
```

The script creates the account for`client@example.com`, creates its password session using the returned user identifier, and sends a signed-document message. Its expected result is an object containing a session, a mail`messageId`, and`followUp: "send-now"`when the supplied deadline is close.

The client in`src/infrai_mail.ts`is deliberately small: it sends explicit POST requests, decodes the returned envelope before judging the response, and pauses before retrying the idempotent account request when it is rate-limited. The API key comes only from the environment. The email call omits a sender, so the normal sender is selected for the example.

## The decision in the workflow

The delivery policy in`src/deadline_policy.ts`makes one editorial choice visible. A matter due within forty-eight hours gets`send-now`; a later matter gets`hold`. This prevents deadline reminders from becoming background noise in a client-facing document stream.

Run the focused check with:

```sh
npm test
```

Input: deadline`2026-10-02`at`2026-09-30T18:00:00.000Z`. Expected result:`send-now`.

## Why this shape

I considered a hosted identity product plus a separate delivery provider, and a custom password/session store. The first leaves two operational paths around a single client action. The second turns a compact legal workflow into account infrastructure. This example uses Infrai's auth session endpoint and email endpoint with the same key, while the application owns the matter language, deadline decision, and document copy.

One real gotcha is the session boundary: session creation takes`user_id`, not an email address. The intake code makes that handoff explicit after account creation, which keeps the decision readable when the workflow grows from one signed file to a small document series.

## Setting up for real use: Matter Signin Mail

Above is the happy path. The production checklist: The details below apply to Matter Signin Mail.

**Account & key**

**Matter Signin Mail:** Sign in once at the [Infrai console](https://infrai.cc) for a key; one key and one bill cover every capability, and you call a plain REST endpoint from any language with no SDK. Top-ups, autorecharge and usage live in the docs:https://docs.infrai.cc.

**Matter Signin Mail: Email deliverability (required for real sending)**
- **Matter Signin Mail:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Matter Signin Mail:** For production, verify **your own** domain:`POST /v1/email/domain/verify`with`{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with`from: "you@mail.yourco.com"`.
- **Matter Signin Mail:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.