import {createHash} from "node:crypto";
import type {Pool} from "pg";
import {decryptInvitation} from "./email-crypto.mjs";

export class SharingError extends Error {}
export const contactMethods=["unspecified","email","sms","messenger"] as const;
export type ContactMethod=typeof contactMethods[number];
export type ContactInput={name:string;email:string;phone:string;method:string};
export function validateContact(input:ContactInput) {
 const name=input.name.trim();const email=input.email.trim();
 const phone=input.phone.trim().replace(/[\s().-]/g,"");
 if(!name||name.length>150||email.length>254||input.phone.length>50||!contactMethods.includes(input.method as ContactMethod))throw new SharingError("Check the household name and preferred contact method.");
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new SharingError("Enter a valid email address.");
 if(phone&&!/^\+[1-9]\d{7,14}$/.test(phone))throw new SharingError("Include a country code in the phone number, such as +1 or +977.");
 if(input.method==='email'&&!email)throw new SharingError("Add an email address for households that prefer email.");
 if(input.method==='sms'&&!phone)throw new SharingError("Add a phone number for households that prefer SMS.");
 return {name,email:email||null,phone:phone||null,method:input.method as ContactMethod};
}
export async function saveContact(pool:Pool,id:string,input:ContactInput) {
 const contact=validateContact(input);
 const result=await pool.query('UPDATE households SET name=$2,primary_email=$3,primary_phone=$4,preferred_contact_method=$5 WHERE id=$1 RETURNING id',[id,contact.name,contact.email,contact.phone,contact.method]);
 if(!result.rowCount)throw new SharingError("Household not found.");
}
export function sharingOrigin() {
 try {
  const url=new URL(process.env.SITE_URL||'http://localhost:3000');
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error();
  const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if(!local&&url.protocol!=='https:')throw Error();
  return {origin:url.origin,local};
 }catch{throw new SharingError("Set SITE_URL to your website origin, for example https://nischalandbhumika.com.");}
}
export async function getHouseholdEvents(pool:Pool,household:string) {
 const result=await pool.query(`SELECT DISTINCT e.id,e.name,to_char(e.event_date,'YYYY-MM-DD') event_date,e.time_note,e.start_time,e.slug
 FROM guests g JOIN guest_event_invitations i ON i.guest_id=g.id
 JOIN events e ON e.id=i.event_id AND e.archived_at IS NULL
 WHERE g.household_id=$1 ORDER BY event_date,e.slug,e.id`,[household]);
 if(!result.rows.length)throw new SharingError("Assign events to this household’s guests before preparing an invitation.");
 return result.rows as {id:string;name:string;event_date:string;time_note:string|null;start_time:string|null;slug:string}[];
}
export async function prepareManualInvitation(pool:Pool,household:string,knownToken?:string) {
 const target=sharingOrigin();
 const row=(await pool.query('SELECT name,invitation_token_hash,invitation_token_encrypted FROM households WHERE id=$1',[household])).rows[0];
 if(!row)throw new SharingError("Household not found.");
 const events=await getHouseholdEvents(pool,household);
 let token=knownToken;
 if(!token) {
  if(!row.invitation_token_encrypted)throw new SharingError("This older link cannot be retrieved. Configure the invitation encryption key, then explicitly replace the link if needed.");
  try {token=decryptInvitation(row.invitation_token_encrypted);}catch{throw new SharingError("Unable to retrieve the link. Check your invitation encryption key before replacing any links.");}
 }
 const hash=createHash('sha256').update(token).digest('hex');
 if(!/^[a-f0-9]{64}$/.test(token)||hash!==row.invitation_token_hash)throw new SharingError("This invitation link was replaced. Prepare the current link again.");
 const path=`/invite/${token}`;
 const date=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
 const lines=events.map(event=>`${date.format(new Date(`${event.event_date}T00:00:00Z`))} — ${event.name}${event.time_note&&!event.start_time?` (${event.time_note})`:''}`);
 const message=`Hi ${row.name}! ❤️\n\nBhumika and I would love to celebrate with you in Pokhara, Nepal!\n\nYour family’s invited events:\n${lines.join('\n')}\n\nPlease open your private invitation to see each guest’s events, the latest details, and RSVP:\n${target.origin}${path}\n\nWith love,\nNischal & Bhumika`;
 return {path,url:target.origin+path,message,tokenHash:hash,local:target.local};
}
export async function recordManualShare(pool:Pool,household:string,hash:string,channel:string,actor:string) {
 if(!['messenger','sms','email'].includes(channel)||!/^[a-f0-9]{64}$/.test(hash))throw new SharingError("Choose a valid sharing channel and invitation.");
 if(sharingOrigin().local)throw new SharingError("This is a localhost preview. Set SITE_URL to your live website before recording guest sharing.");
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  const current=(await client.query('SELECT invitation_token_hash FROM households WHERE id=$1 FOR UPDATE',[household])).rows[0];
  if(!current||current.invitation_token_hash!==hash)throw new SharingError("The invitation was replaced. Prepare the current message before marking it as sent.");
  await client.query(`INSERT INTO invitation_manual_shares(household_id,invitation_token_hash,channel,shared_by)
  VALUES($1,$2,$3,$4) ON CONFLICT(household_id,invitation_token_hash,channel) DO NOTHING`,[household,hash,channel,actor]);
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
