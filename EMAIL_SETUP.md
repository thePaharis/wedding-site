# Email invitations and updates

This milestone adds Admin → Messages, personalized email previews, recipient review, SES sending and per-recipient request status. It does not send anything automatically. SMS and automatic RSVP confirmation emails are not implemented yet.

## 1. Install and preview locally

Copy the update files into your existing project. Keep `.env.local`, photos and all existing data.

```bash
npm install
npm run db:migrate
npm run dev
```

The migration adds email campaign tables and an encrypted invitation-link column. It preserves existing invitations and RSVPs.

Open http://localhost:3000/admin/messages. Create a preview, inspect its recipients and remove any households you do not want included. Missing/invalid addresses and addresses shared by multiple selected households are excluded and listed for review. Only household primary email addresses are used.

Audiences include all households with invited guests, households invited to a selected event, households with someone attending it, and households with at least one unanswered open RSVP for it. A household receives one email, even if multiple family members match. Updates link to the public website; invitations link to the household's private RSVP page.

Do not enable sending yet. Previews require no AWS credentials.

## 2. Prepare invitation links for email

Earlier invitation links were stored only as hashes, so their original secret cannot be retrieved. To reuse links in emails, new links are also stored using authenticated AES-256-GCM encryption with a separate key.

Generate the key locally:

```bash
npm run email:key
```

Copy the generated INVITATION_ENCRYPTION_KEY line into `.env.local`. Back up the key securely. Do not send it in chat, commit it or replace an existing key casually. Restart your development server after adding it.

Under Admin → Guests, create a link for a new household. For existing links, explicitly choose Replace invitation link after confirming. This invalidates the predecessor, so do not replace links already shared without coordinating with the household. New encrypted links can be reused by email without further replacement. Existing RSVP responses are preserved.

## 3. AWS SES setup

No RDS or other paid infrastructure is required just to create previews.

For sending, use one AWS Region consistently, for example us-east-1:

1. Open Amazon SES in that Region.
2. Create an email identity for your own email address and follow its verification email. For the first sandbox test, verify the intended recipient address too.
3. Later, verify nischalandbhumika.com as a domain identity, adding the DNS/DKIM records SES supplies at your DNS provider. This allows a sender such as invitations@nischalandbhumika.com; domain verification does not create an inbox for that address.
4. Configure local AWS credentials using an IAM Identity Center profile or a dedicated least-privilege identity with ses:SendEmail permission for your verified SES identity. Do not use root credentials. AWS SDK v3 reads standard AWS profiles and IAM role credentials; no keys belong in source code.
5. Before invitations go to unverified guest addresses, request production access in SES. Configure and monitor bounce/complaint handling and account-level suppression before production sending.

Example least-privilege policy (replace Region, account ID and identity with your verified identity):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "ses:SendEmail",
    "Resource": "arn:aws:ses:us-east-1:YOUR_ACCOUNT_ID:identity/YOUR_VERIFIED_EMAIL_OR_DOMAIN"
  }]
}
```

Official AWS references:
- https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html
- https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
- https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_ses_code_examples.html

SES sandbox restrictions apply per Region: verified recipients only, 200 emails per 24 hours and one message per second. This sender spaces messages by 1.1 seconds. Run only one sender process at a time and stay within your account's daily quota.

## 4. Live sending configuration

Send invitations only after your website is live and its database contains the matching household tokens. Localhost URLs will not work for your guests. Sending is intentionally blocked for a localhost SITE_URL.

Add the following to your private `.env.local` when ready:

```env
SITE_URL=https://nischalandbhumika.com
EMAIL_SENDING_ENABLED=true
AWS_REGION=us-east-1
SES_FROM_EMAIL=YOUR_VERIFIED_SENDER_EMAIL
AWS_PROFILE=YOUR_LOCAL_AWS_PROFILE
```

Keep the existing DATABASE_URL and INVITATION_ENCRYPTION_KEY. Never paste real credentials into this guide. Use IAM roles in AWS rather than a local profile once deployed.

## 5. Send a reviewed message

1. Start with a household whose verified email belongs to you. Preview the message and remove all other recipients.
2. Check the message and every recipient, confirm the review checkbox and choose Approve for sending.
3. In a separate project terminal, run:

```bash
npm run emails:send
```

This command sends queued, approved emails. Viewing previews or approving a draft alone does not send. The development server does not run the sender automatically. Keep the terminal open until the queue is processed.

Refresh Admin → Messages to see outcomes:
- pending: waiting for the sender;
- sending: a request is being processed;
- accepted: SES returned a message ID; inbox delivery is NOT confirmed;
- skipped: contact or event eligibility changed since the preview;
- unknown: a send attempt was interrupted or failed without a confirmed outcome. Check SES before creating another campaign for that recipient.

The sender rechecks contact email and event membership before each email. Request attempts are claimed before calling SES; duplicate workers cannot claim the same pending row. Ambiguous outcomes are never automatically retried. Interrupted attempts are marked unknown after 15 minutes on the next sender run. A queued campaign completes when no pending or active attempts remain, even if some outcomes are unknown. Cancellation stops remaining pending emails, but an in-progress request may finish.

This uses a manually started sender process. A managed background worker, SES delivery/bounce webhooks and hosted scheduling are later deployment tasks. Avoid multiple sender processes because account sending-rate limits are shared.

## Validation

```bash
npm run test:messages
npm run test:invitations
npm run build
```

Tests use temporary PostgreSQL-compatible databases and simulated mail providers. They never contact AWS or send messages. Live SES credentials, domain DNS, browser UI and the local PostgreSQL installation still need verification on your computer.
