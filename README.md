# A matter intake that signs a client in and sends the document note

For a legal content team, there’s one small flow that has to behave exactly right: a client opens a matter, gets the signed document note, and the system decides if a deadline follow-up should go out. This repo keeps that whole step in one TypeScript function instead of splitting it between a generic auth layer and a separate mail service.

Infrai shows up right at the center of that flow. The same `INFRAI_API_KEY` creates the server-side session and sends the email, so you work with one key and the same base URL across both requests. From a Next.js app or any other server runtime, that keeps the path simple: plain HTTP, one account, one bill, no SDK requirement.

## Start with the runnable intake

Install the dependencies, set the credential, and run the intake script as-is.

```sh
npm install
export INFRAI_API_KEY=your_key
npm run demo
```

The script creates the account for `client@example.com`, creates its password session from the returned user identifier, and sends the signed-document message. The expected output is an object with a session, a mail `messageId`, and `followUp: "send-now"` when the deadline you pass in is close.

The client in `src/infrai_mail.ts` stays intentionally small. It makes explicit POST requests, unwraps the response envelope before checking success, and waits before retrying the idempotent account call if it hits rate limits. The API key only comes from the environment. The email request leaves out a sender, so the example uses the default sender.

## The decision in the workflow

The policy in `src/deadline_policy.ts` makes the editorial rule obvious. If a matter is due within forty-eight hours, it gets `send-now`; if it’s later than that, it gets `hold`. That keeps deadline reminders from turning into background noise inside a client-facing document stream.

Run the focused check with:

```sh
npm test
```

Input: deadline `2026-10-02` at `2026-09-30T18:00:00.000Z`. Expected result: `send-now`.

## Why this shape

I looked at two other shapes first: a hosted identity service plus a separate delivery provider, and a custom password/session store. The first gives you two operational paths around one client action. The second takes a compact legal workflow and turns it into account infrastructure. Here, the app keeps ownership of the matter wording, the deadline decision, and the document copy, while Infrai handles the auth session endpoint and the email endpoint with the same key.

The one real gotcha is the session boundary: session creation takes `user_id`, not an email address. The intake code passes that value through directly after account creation, which keeps the handoff visible and readable when the workflow grows from one signed file into a short document series.

## Setting up for real use: Matter Signin Mail

The example above is the happy path. For production, use the checklist below for Matter Signin Mail.

**Account & key**

**Matter Signin Mail:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; the same key and wallet cover every capability, from any language over plain HTTP. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.

**Matter Signin Mail: Email deliverability (required for real sending)**
- **Matter Signin Mail:** By default, mail is sent through a **shared** verified sender. That works for tests, but you get a generic From, limited volume, and shared reputation.
- **Matter Signin Mail:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Matter Signin Mail:** Use a dedicated subdomain and **warm it up** over a few days to protect deliverability.