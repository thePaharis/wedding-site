import Link from "next/link";
import {requireAdmin} from "@/lib/auth";
import {db} from "@/lib/db";
export default async function Dashboard(){
 await requireAdmin();
 const totals=await db().query("SELECT (SELECT count(*) FROM households)::int households,(SELECT count(*) FROM guests)::int guests,(SELECT count(*) FROM guest_event_invitations)::int invitations");
 const events=await db().query("SELECT e.id,e.name,count(i.guest_id)::int invited,count(r.guest_id) FILTER (WHERE r.attending)::int attending,count(r.guest_id) FILTER (WHERE NOT r.attending)::int declined,count(i.guest_id)::int-count(r.guest_id)::int pending FROM events e LEFT JOIN guest_event_invitations i ON i.event_id=e.id LEFT JOIN rsvps r ON r.event_id=i.event_id AND r.guest_id=i.guest_id WHERE e.archived_at IS NULL GROUP BY e.id ORDER BY e.event_date,e.name");
 const t=totals.rows[0];
 return <><p className="eyebrow">February 2027 · Pokhara</p><h1>Your wedding, at a glance.</h1><div className="stats">{[["Households",t.households],["Guests",t.guests],["Event invitations",t.invitations]].map(([label,n])=><div className="admin-card" key={label}><strong>{n}</strong><span>{label}</span></div>)}</div><section className="admin-card"><h2>Event responses</h2><p>Each guest can be invited to a different combination of events.</p><div className="table-scroll"><table><thead><tr><th>Event</th><th>Invited</th><th>Attending</th><th>Declined</th><th>Waiting</th></tr></thead><tbody>{events.rows.map(e=><tr key={e.id}><th>{e.name}</th><td>{e.invited}</td><td>{e.attending}</td><td>{e.declined}</td><td>{e.pending}</td></tr>)}</tbody></table></div></section><div className="admin-links"><Link href="/admin/events">Edit your event details</Link><Link href="/admin/guests">Manage households and guests</Link></div></>;
}
