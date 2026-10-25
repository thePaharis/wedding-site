# Nischal & Bhumika's wedding

Next.js website for February 1–6, 2027, intended for AWS Amplify hosting at nischalandbhumika.com.

## Development

Install dependencies with `npm ci`, then run `npm run dev` and visit http://localhost:3000.
Run `npm run build` to verify the production build.

## Current milestone

- Responsive wedding homepage with the six confirmed events.
- Times and venues remain unconfirmed, except Kasar is in the morning.
- PostgreSQL foundation in `database/001_initial.sql`: households, guests, events, individual event invitations, RSVPs and event change history.

The website currently reads initial schedule data from `lib/events.ts`. The SQL migration is not connected or applied. Editing events through an admin dashboard is the next milestone, and will replace this initial data source.

## Remaining work

- PostgreSQL connection and authenticated admin event/guest management.
- Server-authorized household invitation links, exposing only invited events; store hashes of cryptographically random tokens.
- Per-guest, per-event RSVP submissions with unique upserts and server-side invitation checks.
- SES email and End User Messaging SMS, with consent, opt-outs, preview, delivery records and deduplication of household contacts.
- Private S3 photo storage, thumbnails, authorized downloads and albums.
- AWS configuration, secrets, database connectivity, backups and end-to-end launch verification.

Do not deploy an unprotected admin route or put credentials in the repository. The public schedule is an overview, not an invitation; private event details should be delivered through the invitation portal.
