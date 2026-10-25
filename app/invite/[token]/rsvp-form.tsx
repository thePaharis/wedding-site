"use client";
import { useActionState, useState } from "react";
import { submitRsvp } from "./actions";
import type { InvitationRow } from "@/lib/invitation-store";
const responseKey = (guest: string, event: string) => `${guest}:${event}`;

function timeLabel(row: InvitationRow) {
  const format = (time: string) => {const [h,m]=time.split(":").map(Number);return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`;};
  return row.start_time ? `${format(row.start_time)}${row.end_time ? `–${format(row.end_time)}` : ""}` : row.time_note || "Time to be announced";
}
export default function RsvpForm({ token, rows }: { token: string; rows: InvitationRow[] }) {
  const [state, action, pending] = useActionState(submitRsvp.bind(null, token), {});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [diets, setDiets] = useState<Record<string, string>>({});
  const events = Array.from(new Set(rows.map(row => row.event_id)));
  return <form action={action} className="rsvp-form">
    {state.error && <div className="rsvp-notice error" role="alert">{state.error}</div>}
    {state.saved && <div className="rsvp-notice" role="status">Your responses have been saved. Thank you! You can return to this link to make changes.</div>}
    {events.map(id => {
      const guests = rows.filter(row => row.event_id === id); const event = guests[0];
      return <section className="rsvp-event" key={id} aria-labelledby={`event-${id}`}>
        <div className="rsvp-event-heading"><time dateTime={event.event_date}>{new Intl.DateTimeFormat("en",{weekday:"long",month:"long",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(`${event.event_date}T00:00:00Z`))}</time><h2 id={`event-${id}`}>{event.event_name}</h2><p>{timeLabel(event)} · Pokhara, Nepal</p><p>{event.venue || "Venue to be announced"}</p>{event.address && <p>{event.address}</p>}</div>
        {event.description && <p>{event.description}</p>}{event.dress_code && <p>Dress code: {event.dress_code}</p>}{event.instructions && <p>{event.instructions}</p>}
        {event.closed && <p className="rsvp-notice">RSVPs for this event are closed. Contact Nischal or Bhumika for changes.</p>}
        {guests.map(guest => {const key=responseKey(guest.guest_id,id);return <fieldset className="guest-response" key={key} disabled={pending || event.closed}><legend>{guest.first_name} {guest.last_name}</legend><div className="response-options"><label><input type="radio" name={`response:${key}`} value="yes" required checked={(answers[key] ?? (guest.attending === null ? "" : guest.attending ? "yes" : "no")) === "yes"} onChange={() => setAnswers(previous => ({...previous, [key]:"yes"}))}/> Attending</label><label><input type="radio" name={`response:${key}`} value="no" required checked={(answers[key] ?? (guest.attending === null ? "" : guest.attending ? "yes" : "no")) === "no"} onChange={() => setAnswers(previous => ({...previous, [key]:"no"}))}/> Not attending</label></div><label className="diet-label">Dietary requirements, if attending <span>(optional)</span><textarea name={`diet:${key}`} maxLength={1000} rows={2} value={diets[key] ?? guest.dietary_requirements ?? ""} onChange={event => setDiets(previous => ({...previous, [key]: event.target.value}))} placeholder="Allergies or dietary needs"/></label></fieldset>;})}
      </section>;
    })}
    {rows.some(row=>!row.closed) && <div className="rsvp-submit"><button disabled={pending}>{pending ? "Saving your responses…" : "Save RSVP"}</button><p>Respond separately for each person and event. Your latest saved choices will replace your earlier responses.</p></div>}
  </form>;
}
