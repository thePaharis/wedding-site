"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSession, endSession, requireAdmin, verifyLogin } from "@/lib/auth";
import { db } from "@/lib/db";
import {validateContact} from "@/lib/manual-sharing";
function field(form:FormData,name:string,max=500) {const value=form.get(name);if(typeof value!=="string"||value.trim().length>max)throw Error("Invalid field");return value.trim();}
function uuid(value:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw Error("Invalid identifier");return value;}
export async function login(form:FormData) {
 let id:string|null=null;
 try {const email=field(form,"email",254).toLowerCase();const password=String(form.get("password")??"");if(password.length>256)throw Error("Invalid password");id=await verifyLogin(email,password);if(id)await createSession(id);}catch {redirect("/admin/login?error=unavailable");}
 if(!id)redirect("/admin/login?error=credentials");
 redirect("/admin");
}
export async function logout(){await endSession();redirect("/admin/login");}
export async function saveEvent(form:FormData) {
 const admin=await requireAdmin();
 let client;
 try {
  const id=uuid(field(form,"id"));const name=field(form,"name",100);const date=field(form,"date",10);
  if(!name||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error("Invalid event");
  const start=field(form,"start",5)||null;const end=field(form,"end",5)||null;
  for(const t of [start,end])if(t&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))throw Error("Invalid time");
  const values=[name,date,start,end,field(form,"time_note",100)||null,field(form,"venue",200)||null,field(form,"address",500)||null,field(form,"description",2000)||null,field(form,"dress_code",200)||null,field(form,"instructions",2000)||null,id];
  client=await db().connect();await client.query("BEGIN");
  const previous=await client.query("SELECT * FROM events WHERE id=$1 FOR UPDATE",[id]);if(!previous.rowCount)throw Error("Missing event");
  await client.query("UPDATE events SET name_ne=$2,venue_ne=$3,address_ne=$4,description_ne=$5,dress_code_ne=$6,instructions_ne=$7,time_note_ne=$8 WHERE id=$1",[id,field(form,"name_ne",100)||null,field(form,"venue_ne",200)||null,field(form,"address_ne",500)||null,field(form,"description_ne",2000)||null,field(form,"dress_code_ne",200)||null,field(form,"instructions_ne",2000)||null,field(form,"time_note_ne",100)||null]);
  const next=await client.query("UPDATE events SET name=$1,event_date=$2,start_time=$3,end_time=$4,time_note=$5,venue=$6,address=$7,description=$8,dress_code=$9,instructions=$10,time_zone='Asia/Kathmandu',updated_at=now() WHERE id=$11 RETURNING *",values);
  await client.query("INSERT INTO event_changes(event_id,changed_by,previous_details,new_details) VALUES ($1,$2,$3,$4)",[id,admin.email,JSON.stringify(previous.rows[0]),JSON.stringify(next.rows[0])]);await client.query("COMMIT");
 }catch{if(client)await client.query("ROLLBACK");redirect("/admin/events?error=save");}finally{client?.release();}
 revalidatePath("/");revalidatePath("/admin/events");redirect("/admin/events?saved=1");
}
export async function createHousehold(form:FormData) {
 await requireAdmin();
 try{const contact=validateContact({name:field(form,"name",150),email:field(form,"email",254),phone:field(form,"phone",50),method:field(form,"method",20)||"unspecified",language:String(form.get("language")||"en"),nameNe:String(form.get("name_ne")||"")});await db().query("INSERT INTO households(name,primary_email,primary_phone,preferred_contact_method,preferred_language,name_ne) VALUES ($1,$2,$3,$4,$5,$6)",[contact.name,contact.email,contact.phone,contact.method,contact.language||"en",contact.nameNe]);}catch{redirect("/admin/guests?error=save");}
 revalidatePath("/admin/guests");redirect("/admin/guests?saved=1");
}
export async function createGuest(form:FormData){
 await requireAdmin();let client;
 try{const household=uuid(field(form,"household"));const first=field(form,"first",100);const last=field(form,"last",100);if(!first)throw Error("Missing name");const events=form.getAll("events").map(v=>uuid(String(v)));client=await db().connect();await client.query("BEGIN");await client.query("SELECT id FROM households WHERE id=$1 FOR UPDATE",[household]);const guest=await client.query("INSERT INTO guests(household_id,first_name,last_name,first_name_ne,last_name_ne) VALUES ($1,$2,$3,$4,$5) RETURNING id",[household,first,last,field(form,"first_ne",100)||null,field(form,"last_ne",100)||null]);for(const event of new Set(events))await client.query("INSERT INTO guest_event_invitations(guest_id,event_id) VALUES ($1,$2)",[guest.rows[0].id,event]);await client.query("COMMIT");}catch{if(client)await client.query("ROLLBACK");redirect("/admin/guests?error=save");}finally{client?.release();}
 revalidatePath("/admin/guests");redirect("/admin/guests?saved=1");
}
export async function updateInvitations(form:FormData){
 await requireAdmin();let client;
 try{const guest=uuid(field(form,"guest"));const events=form.getAll("events").map(v=>uuid(String(v)));client=await db().connect();await client.query("BEGIN");
 const owner=await client.query("SELECT h.id FROM households h JOIN guests g ON g.household_id=h.id WHERE g.id=$1 FOR UPDATE OF h",[guest]);if(!owner.rowCount)throw Error("Guest not found");
 await client.query("UPDATE guests SET first_name_ne=$2,last_name_ne=$3 WHERE id=$1",[guest,field(form,"first_ne",100)||null,field(form,"last_ne",100)||null]);
 // Revoking an invitation deletes its dependent RSVP in the same transaction.
 await client.query("DELETE FROM rsvps WHERE guest_id=$1 AND NOT(event_id=ANY($2::uuid[]))",[guest,events]);
 await client.query("DELETE FROM guest_event_invitations WHERE guest_id=$1 AND NOT(event_id=ANY($2::uuid[]))",[guest,events]);
 for(const event of new Set(events))await client.query("INSERT INTO guest_event_invitations(guest_id,event_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",[guest,event]);await client.query("COMMIT");
 }catch{if(client)await client.query("ROLLBACK");redirect("/admin/guests?error=save");}finally{client?.release();}
 revalidatePath("/admin/guests");redirect("/admin/guests?saved=1");
}
