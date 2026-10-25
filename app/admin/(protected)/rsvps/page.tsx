import {db} from "@/lib/db";
import {requireAdmin} from "@/lib/auth";
export default async function Responses(){
 await requireAdmin();
 const result=await db().query(`SELECT h.name household,g.first_name,g.last_name,e.name event,
  r.attending,r.dietary_requirements,to_char(r.updated_at AT TIME ZONE 'Asia/Kathmandu','YYYY-MM-DD HH24:MI') updated
  FROM guest_event_invitations i JOIN guests g ON g.id=i.guest_id
  JOIN households h ON h.id=g.household_id JOIN events e ON e.id=i.event_id
  LEFT JOIN rsvps r ON r.guest_id=i.guest_id AND r.event_id=i.event_id
  WHERE e.archived_at IS NULL ORDER BY e.event_date,e.name,h.name,g.first_name,g.last_name`);
 return <><p className="eyebrow">Every guest, every event</p><h1>Your RSVP responses.</h1><p>Guest responses appear here after they save their invitation. Refresh to see the latest changes. Update times are shown in Nepal time.</p><section className="admin-card">{!result.rowCount?<p>No event invitations yet. Add guests and select their events first.</p>:<div className="table-scroll"><table><thead><tr><th>Household</th><th>Guest</th><th>Event</th><th>Response</th><th>Dietary requirements</th><th>Last updated (Nepal)</th></tr></thead><tbody>{result.rows.map((r,index)=><tr key={index}><td>{r.household}</td><td>{r.first_name} {r.last_name}</td><td>{r.event}</td><td>{r.attending===null?"No response":r.attending?"Attending":"Not attending"}</td><td>{r.dietary_requirements||"—"}</td><td>{r.updated||"—"}</td></tr>)}</tbody></table></div>}</section></>;
}
