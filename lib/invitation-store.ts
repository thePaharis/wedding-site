import { createHash, randomBytes } from "node:crypto";
import type { Pool } from "pg";

export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const validToken = (token: string) => /^[a-f0-9]{64}$/.test(token);
export const responseKey = (guest: string, event: string) => `${guest}:${event}`;
export type InvitationRow = {
  guest_id: string; first_name: string; last_name: string;
  event_id: string; event_name: string; event_date: string; start_time: string | null;
  end_time: string | null; time_note: string | null; time_zone: string;
  venue: string | null; address: string | null; description: string | null;
  dress_code: string | null; instructions: string | null; closed: boolean;
  attending: boolean | null; dietary_requirements: string | null;
};
export type HouseholdInvitation = { name: string; rows: InvitationRow[] };

export class InvitationLinkError extends Error {}
export async function issueInvitation(pool: Pool, household: string, confirmReplacement = false) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT invitation_token_hash FROM households WHERE id=$1 FOR UPDATE", [household]);
    if (!existing.rowCount) throw new InvitationLinkError("Household not found.");
    if (existing.rows[0].invitation_token_hash && !confirmReplacement) throw new InvitationLinkError("Confirm that you want to replace the old invitation link.");
    const token = randomBytes(32).toString("hex");
    await client.query("UPDATE households SET invitation_token_hash=$1 WHERE id=$2", [tokenHash(token), household]);
    await client.query("COMMIT");
    return token;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function readInvitation(pool: Pool, token: string): Promise<HouseholdInvitation | null> {
  if (!validToken(token)) return null;
  // Only return guests/events authorized by this token. No full guest-list query.
  const result = await pool.query(`
    SELECT h.name, g.id guest_id, g.first_name, g.last_name,
      e.id event_id, e.name event_name, to_char(e.event_date,'YYYY-MM-DD') event_date,
      to_char(e.start_time,'HH24:MI') start_time, to_char(e.end_time,'HH24:MI') end_time,
      e.time_note, e.time_zone, e.venue, e.address, e.description, e.dress_code, e.instructions,
      (e.rsvp_deadline IS NOT NULL AND e.rsvp_deadline<=now()) closed,
      r.attending, r.dietary_requirements
    FROM households h
    LEFT JOIN guests g ON g.household_id=h.id
    LEFT JOIN guest_event_invitations i ON i.guest_id=g.id
    LEFT JOIN events e ON e.id=i.event_id AND e.archived_at IS NULL
    LEFT JOIN rsvps r ON r.guest_id=g.id AND r.event_id=e.id
    WHERE h.invitation_token_hash=$1
    ORDER BY e.event_date, CASE e.slug WHEN 'kasar' THEN 0 WHEN 'mehendi' THEN 1 ELSE 2 END,
      e.name, g.first_name, g.last_name, g.id`, [tokenHash(token)]);
  if (!result.rowCount) return null;
  return { name: result.rows[0].name, rows: result.rows.filter(r => r.event_id !== null) };
}

export class RsvpError extends Error {}

export async function saveResponses(pool: Pool, token: string, form: FormData) {
  if (!validToken(token)) throw new RsvpError("This invitation is no longer available. Please contact Nischal or Bhumika.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Serialize saves and token rotation on the household row.
    const household = await client.query("SELECT id FROM households WHERE invitation_token_hash=$1 FOR UPDATE", [tokenHash(token)]);
    if (!household.rowCount) throw new RsvpError("This invitation is no longer available. Please contact Nischal or Bhumika.");
    const allowed = await client.query(`
      SELECT g.id guest_id, e.id event_id,
        (e.rsvp_deadline IS NOT NULL AND e.rsvp_deadline<=now()) closed
      FROM guests g JOIN guest_event_invitations i ON i.guest_id=g.id
      JOIN events e ON e.id=i.event_id
      WHERE g.household_id=$1 AND e.archived_at IS NULL
      FOR SHARE OF g,i,e`, [household.rows[0].id]);
    const expected = new Map<string, { guest_id: string; event_id: string }>();
    for (const row of allowed.rows) if (!row.closed) expected.set(responseKey(row.guest_id, row.event_id), row);
    if (!expected.size) throw new RsvpError("There are no open RSVPs for this invitation.");
    const responses = new Map<string, string>();
    const diets = new Map<string, string>();
    for (const [field, value] of form.entries()) {
      if (field.startsWith("$ACTION_")) continue;
      if (!field.startsWith("response:") && !field.startsWith("diet:")) throw new RsvpError("Your invitation has changed. Refresh the page and try again.");
      const key = field.slice(field.indexOf(":") + 1);
      if (!expected.has(key) || typeof value !== "string") throw new RsvpError("Your invitation has changed. Refresh the page and try again.");
      const collection = field.startsWith("response:") ? responses : diets;
      if (collection.has(key)) throw new RsvpError("Please choose one response for each guest and event.");
      if (collection === responses && value !== "yes" && value !== "no") throw new RsvpError("Please choose attending or not attending for every guest and event.");
      if (collection === diets && value.length > 1000) throw new RsvpError("Please keep dietary requirements under 1,000 characters.");
      collection.set(key, value);
    }
    if (responses.size !== expected.size) throw new RsvpError("Please answer for every guest and event before saving. If your invitation changed, refresh this page.");
    for (const [key, row] of expected) {
      const attending = responses.get(key) === "yes";
      await client.query(`INSERT INTO rsvps(guest_id,event_id,attending,dietary_requirements)
        VALUES ($1,$2,$3,$4) ON CONFLICT(guest_id,event_id) DO UPDATE
        SET attending=EXCLUDED.attending,dietary_requirements=EXCLUDED.dietary_requirements,updated_at=now()`,
        [row.guest_id, row.event_id, attending, attending ? diets.get(key)?.trim() || null : null]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
