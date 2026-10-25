# Local database and admin setup

This update adds a PostgreSQL connection and password-protected admin pages. No AWS setup is required yet. Use this locally; Cognito/MFA and production deployment checks remain a later milestone.

## Install the update

Copy the archive's files into your existing wedding-site project, keeping your `.env.local` and your photos. Install the updated dependencies:

```bash
npm install
```

Your `.env.local` needs the existing DATABASE_URL. Never upload it or paste its contents in chat. Passwords within a URL need percent encoding.

## Create tables

With PostgreSQL running and the new wedding_site database empty, run:

```bash
npm run db:migrate
```

This creates the schema and six events using Asia/Kathmandu time. Completed migrations are tracked, so rerunning this command skips them. If you already manually ran 001_initial.sql, stop and reconcile migration history before running the command; do not delete your tables.

## Create your admin account

Add these two lines to `.env.local`, using your real email and a unique password of at least 14 characters:

```env
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=your-unique-password-at-least-14-characters
```

Run:

```bash
npm run admin:create
```

Remove ADMIN_PASSWORD from `.env.local` afterward. The account has a salted scrypt password hash in PostgreSQL. Running the setup again updates the password and invalidates that account's existing sessions.

## Open the dashboard

```bash
npm run dev
```

Visit http://localhost:3000/admin and sign in with the account you created.

- Events: open an event, edit its details and save. Refresh the homepage to see updated times, venue, address, description, dress code and instructions.
- Guests: create a household, add people, and choose their invited events. Open an existing guest to change their invitations.
- Overview: see household/guest totals and response counts per event. Event invitation totals count guest-event combinations, not distinct guests.

Removing an event invitation deletes its dependent RSVP; the interface warns about this. There is no invitation sending or guest-facing RSVP submission yet. Saving events sends no messages. Admin event edits are recorded in event_changes.

## Security and limits

Every protected page and mutation checks the database session. Session tokens are randomly generated, stored as SHA-256 hashes and expire after eight hours. Cookies are HttpOnly and SameSite=Strict, with Secure enabled in production. Next.js Server Actions perform same-origin validation. Password checks use salted scrypt and constant-time comparison.

Login attempts are limited to five globally in a 15-minute window, including successful attempts. This simple limit is appropriate for local setup with a small number of admins; public deployment needs a more robust authentication/abuse strategy and Cognito/MFA as planned.

Database queries are parameterized. Keep PostgreSQL credentials server-side. This milestone does not configure RDS, Cognito, email/SMS, invitation tokens, public RSVPs, uploads, add/archive events, or production infrastructure.

## Validation completed

Production build and TypeScript checks. PostgreSQL-compatible PGlite checks of both migrations, six Nepal-time seed events, foreign-key rejection of uninvited RSVPs, duplicate RSVP protection, and event change history. These checks use a temporary database; your local PostgreSQL connection and sign-in still need verification on your computer.
