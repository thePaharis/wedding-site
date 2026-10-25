# Household invitations and per-event RSVPs

## Install

This update builds on the working admin dashboard. Keep your existing `.env.local` and database. Copy the update files into the project, then run:

```bash
npm install
npm run dev
```

No new migration or AWS setup is needed. This milestone uses the existing household token hash, guest-event invitations, RSVP rows and event deadlines. There is no automatic email or text delivery yet.

## Try the full flow locally

1. Open http://localhost:3000/admin/guests and sign in.
2. Create a test household with two guests. Give one guest Wedding and Reception, and the other only Reception.
3. Under that household, choose **Create invitation link**.
4. Copy the generated link immediately, or choose **Preview invitation**. Only the hash is stored, so the full link cannot be retrieved after leaving the page.
5. Open the link in a private browser window. Only the household's invited events and the appropriate guests should appear.
6. Answer each guest/event and save. Add dietary needs if attending.
7. Return to **Admin → RSVPs** and **Overview**. Refresh to see the responses and counts.
8. Reopen the same invitation, change a response and save. Existing records update rather than duplicate.
9. Create a replacement link after checking the confirmation box. The old link should stop working; existing RSVPs remain intact.

Generated links use the origin you are viewing: localhost links work only on your computer. Once the site is deployed, generate links from the live domain before sending them to guests. Anyone holding a household link can view and update that household's invitation, so share it only with the intended household.

## Behavior

- Server-side checks limit every read and write to the household identified by the token.
- Each guest sees only their event assignments; the household sees the union of its guests' events.
- Responses are required for all currently open guest-event pairs. An invitation change while a form is open requires refreshing before retrying.
- Dietary requirements are optional and are cleared when a guest declines an event.
- Expired event RSVP deadlines and archived events cannot receive new responses. Deadline editing remains a later admin feature; the schema's existing deadline field is enforced.
- Saving responses is transactional. Invalid or incomplete submissions do not partially save.
- Concurrent RSVP saves, guest additions, invitation changes and link replacement are coordinated through a household row lock. Concurrent valid saves use the latest completed submission.
- Removing an invitation through the existing admin form removes its dependent RSVP, as the interface explains.
- No-index and no-referrer metadata/headers are set on invitation routes, which use dynamic rendering and private, non-cacheable responses.

## Validation

```bash
npm run test:invitations
npm run build
```

The tests use temporary PostgreSQL-compatible PGlite instances. They do not connect to or alter your database. They exercise the same invitation store used by the application: household privacy, hashed token rotation, invalid links, idempotent saves, edits, cross-household tampering, uninvited events, invalid or missing values, oversized dietary notes, closed/archived/revoked events and transaction rollback.

Browser testing and connection to your local PostgreSQL instance must be verified on your computer. AWS deployment and email/SMS delivery remain future milestones.
