# Messenger and personal invitation sharing

This update adds preferred household contact methods, copyable invitation messages and manual sharing records. It includes the previous email update files, so it can be installed on the working invitation/RSVP version or on the email version.

## Install

Copy the update's files into your existing project. Keep `.env.local`, photos and your database. Then run:

```bash
npm install
npm run db:migrate
npm run dev
```

The migrations add email-support tables if needed, plus household contact preferences and manual sharing history. Existing invitations and RSVPs are preserved. No messages are sent during installation or testing.

## Test locally

1. Open http://localhost:3000/admin/guests.
2. Add or open a household. In Contact details & preferred method, choose Email, SMS or Messenger. “Choose later” keeps the preference unspecified.
3. Messenger households can have no email or phone. Email preference requires an email; SMS preference requires a phone with an explicit country code. Common separators are removed from phone numbers; no country is guessed. For example, use +1 for US numbers and +977 for Nepal numbers.
4. Assign events to the household's individual guests before creating their message.
5. Choose Create invitation link & message for a new link, or Prepare message with current link to reuse an existing encrypted link.
6. The message lists only the household's invited events, with dates from the database. The private page shows each person's exact invitations and their RSVP choices.
7. Copy the preview and check the invitation page. Localhost messages are clearly marked as previews; the Mark as sent form is disabled for localhost configurations.

## Reuse links

Links created after configuring INVITATION_ENCRYPTION_KEY can be retrieved securely for copying. If you have not configured it, run:

```bash
npm run email:key
```

Copy the generated INVITATION_ENCRYPTION_KEY line into `.env.local`, keep a secure backup and restart the development server. This works for Messenger sharing too; SES setup is not needed for copying messages. Do not replace a key you already configured.

An older hash-only link cannot be recovered. It can still be used by anyone who already has it. If you need to retrieve that household's message, explicitly replace the link after configuring the key; the old link will stop working, but existing RSVPs remain. No links are silently replaced. A newly generated link can be copied once even without an encryption key, but cannot be retrieved later without replacement.

## Share after the site is live

Once guests can reach the live website and its matching database, set:

```env
SITE_URL=https://nischalandbhumika.com
```

Restart the app. Prepare the message again so it contains the live domain. Check that the invitation opens from another device, then:

1. Copy the invitation message.
2. Open the intended household's Messenger conversation yourself and send it.
3. Return to the admin page, select Messenger, confirm that you sent it and choose Mark as sent.

You can also record messages you personally sent by SMS or email. Copying does not mark anything as sent. The record is your manual confirmation, not delivery/read verification. Repeated marking for the same link and channel creates one record. Replacing a link resets its current sharing indicator while preserving the older audit record; old messages cannot be marked as the current invitation.

## Email preferences

Email campaigns include households that prefer Email or have no preference. Households marked Messenger or SMS are excluded, even when they have an email address. Already queued emails recheck preference and eligibility before sending. Choosing SMS does not collect SMS consent or enable automated texting.

The email sender remains disabled by default. See EMAIL_SETUP.md for separate SES configuration. This update does not integrate the Messenger API, send messages, purchase phone numbers or automate SMS.

## Validation

```bash
npm run test:sharing
npm run test:invitations
npm run test:messages
npm run build
```

Database tests use temporary PostgreSQL-compatible instances and mock email providers; they do not access your contacts or send messages. They cover per-household event privacy, link reuse, phone validation, contact preferences, old-link rejection, duplicate sharing records and localhost restrictions. Verify the browser workflow against your local PostgreSQL database after installation.
