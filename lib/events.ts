export type WeddingEvent = {
  id: string;
  name: string;
  date: string;
  timeLabel: string;
};

// Initial schedule only. The database becomes the source of truth when connected.
export const weddingEvents: WeddingEvent[] = [
  { id: "kasar", name: "Kasar", date: "2027-02-01", timeLabel: "Morning · exact time to be announced" },
  { id: "mehendi", name: "Mehendi", date: "2027-02-01", timeLabel: "Time to be announced" },
  { id: "vajan", name: "Vajan", date: "2027-02-02", timeLabel: "Time to be announced" },
  { id: "wedding", name: "Wedding", date: "2027-02-03", timeLabel: "Time to be announced" },
  { id: "reception", name: "Reception", date: "2027-02-05", timeLabel: "Time to be announced" },
  { id: "helping", name: "Helping the Less Fortunate", date: "2027-02-06", timeLabel: "Time to be announced" },
];

export async function getWeddingEvents() {
  if (!process.env.DATABASE_URL) return weddingEvents.map(event => ({...event,venue:null as string|null,address:null as string|null,description:null as string|null,dressCode:null as string|null,instructions:null as string|null}));
  const {db} = await import("./db");
  const {rows}=await db().query("SELECT slug,name,to_char(event_date,'YYYY-MM-DD') date_text,to_char(start_time,'HH24:MI') start_text,to_char(end_time,'HH24:MI') end_text,venue,address,description,dress_code,instructions,time_note FROM events WHERE archived_at IS NULL ORDER BY event_date,CASE slug WHEN 'kasar' THEN 0 WHEN 'mehendi' THEN 1 ELSE 2 END,name");
  return rows.map(row=>({id:row.slug as string,name:row.name as string,date:row.date_text as string,timeLabel:row.start_text ? `${formatTime(row.start_text)}${row.end_text ? `–${formatTime(row.end_text)}` : ""} · Nepal time` : row.time_note ? `${row.time_note} · exact time to be announced` : "Time to be announced",venue:row.venue as string|null,address:row.address as string|null,description:row.description as string|null,dressCode:row.dress_code as string|null,instructions:row.instructions as string|null}));
}
function formatTime(time:string) {
 const [hour,minute]=time.split(":").map(Number);
 return `${hour%12||12}:${String(minute).padStart(2,"0")} ${hour>=12?"PM":"AM"}`;
}
