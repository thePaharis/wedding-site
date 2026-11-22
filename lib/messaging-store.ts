import {resolveLocale,text,type Locale} from "./i18n.ts";
import {createHash} from "node:crypto";
import type {Pool} from "pg";
import {decryptInvitation} from "./email-crypto.mjs";
export type MessageDraft={subject:string;body:string;kind:"invitation"|"update";audience:"all"|"invited"|"attending"|"pending";eventId:string|null;subjectNe?:string;bodyNe?:string};
export type Contact={id:string;name:string;email:string|null;invitation_token_encrypted:string|null;preferred_language:Locale;name_ne:string|null};
export class MessageError extends Error {}
export function validateDraft(input:MessageDraft) {
 if((input.subjectNe?.length||0)>150||/[\r\n]/.test(input.subjectNe||'')||(input.bodyNe?.length||0)>5000)throw new MessageError("Check the Nepali subject (150 characters) and message (5,000 characters).");
 if(!input.subject.trim()||input.subject.length>150||/[\r\n]/.test(input.subject)||!input.body.trim()||input.body.length>5000)throw new MessageError("Enter a subject (up to 150 characters) and a message (up to 5,000 characters).");
 if(!['invitation','update'].includes(input.kind)||!['all','invited','attending','pending'].includes(input.audience))throw new MessageError("Choose a valid message type and audience.");
 if(input.audience!=='all'&&(!input.eventId||!/^[a-f0-9-]{36}$/i.test(input.eventId)))throw new MessageError("Choose an event for this audience.");
}
export async function selectContacts(pool:Pool,input:MessageDraft):Promise<Contact[]> {
 validateDraft(input);
 const result=await pool.query(`SELECT h.id,h.name,h.name_ne,h.preferred_language,lower(trim(h.primary_email)) email,h.invitation_token_encrypted
 FROM households h WHERE h.preferred_contact_method IN ('unspecified','email') AND EXISTS (
 SELECT 1 FROM guests g JOIN guest_event_invitations i ON i.guest_id=g.id
 JOIN events e ON e.id=i.event_id AND e.archived_at IS NULL
 LEFT JOIN rsvps r ON r.guest_id=i.guest_id AND r.event_id=i.event_id
 WHERE g.household_id=h.id AND ($1::text='all' OR (i.event_id=$2::uuid AND
 ($1='invited' OR ($1='attending' AND r.attending=true) OR ($1='pending' AND r.guest_id IS NULL AND (e.rsvp_deadline IS NULL OR e.rsvp_deadline>now()))))))
 ORDER BY h.name,h.id`,[input.audience,input.audience==='all'?null:input.eventId]);
 return result.rows;
}
export function partitionContacts(contacts:Contact[]) {
 const counts=new Map<string,number>();
 for(const c of contacts)if(c.email)counts.set(c.email,(counts.get(c.email)||0)+1);
 const included:Contact[]=[];const excluded:{name:string;reason:string}[]=[];
 for(const c of contacts) {
  if(!c.email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))excluded.push({name:c.name,reason:'Missing or invalid household email'});
  else if((counts.get(c.email)||0)>1)excluded.push({name:c.name,reason:'Email shared by multiple selected households; resolve before sending private links'});
  else included.push(c);
 }
 return {included,excluded};
}
export async function createCampaign(pool:Pool,input:MessageDraft,actor:string) {
 validateDraft(input);
 const {included}=partitionContacts(await selectContacts(pool,input));
 if(!included.length)throw new MessageError("No eligible email addresses. Add household emails and invited guests first.");
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  const result=await client.query(`INSERT INTO email_campaigns(subject,body,kind,audience,event_id,created_by,subject_ne,body_ne)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,[input.subject.trim(),input.body.trim(),input.kind,input.audience,input.audience==='all'?null:input.eventId,actor,input.subjectNe?.trim()||null,input.bodyNe?.trim()||null]);
  const id=result.rows[0].id as string;
  for(const contact of included)await client.query('INSERT INTO email_recipients(campaign_id,household_id,household_name,email,language) VALUES($1,$2,$3,$4,$5)',[id,contact.id,contact.preferred_language==='ne'?contact.name_ne||contact.name:contact.name,contact.email,contact.preferred_language]);
  await client.query('COMMIT');return id;
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export function siteOrigin(requireLive=false) {
 const url=new URL(process.env.SITE_URL||'http://localhost:3000');
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||!['https:','http:'].includes(url.protocol))throw new MessageError('SITE_URL must be your website origin, without a path or credentials.');
 if(requireLive&&(url.protocol!=='https:'||['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw new MessageError('Set SITE_URL to your live HTTPS website before sending.');
 return url.origin;
}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function renderEmail(input:{name:string;subject:string;body:string;link:string;kind:string;language?:Locale}) {
 const language=resolveLocale(input.language);const t=text(language);
 const label=input.kind==='invitation'?t.viewInvite:t.viewDetails;
 return {
  text:`${t.dear} ${input.name},\n\n${input.body}\n\n${label}: ${input.link}\n\n${t.withLove}\n${t.couple}`,
  html:`<!doctype html><html lang="${language}"><body style="margin:0;background:#f0e9e1;font-family:Arial,'Nirmala UI','Mangal',sans-serif;color:#39252b"><div style="max-width:600px;margin:30px auto;background:#fffdf9;padding:40px;border:1px solid #d6c4ae"><p style="color:#805b2d;font-size:14px">${escape(t.couple)}</p><h1 style="font-weight:normal;font-size:30px;line-height:1.6">${escape(input.subject)}</h1><p>${t.dear} ${escape(input.name)},</p><p style="line-height:1.9;white-space:pre-line">${escape(input.body)}</p><p style="margin:32px 0"><a style="background:#501c2e;color:#fff;padding:15px 24px;text-decoration:none" href="${escape(input.link)}">${label}</a></p><p style="line-height:1.8">${t.withLove}<br>${escape(t.couple)}</p></div></body></html>`
 };
}
export async function approveCampaign(pool:Pool,id:string,actor:string,reviewedCount?:number) {
 siteOrigin(true);
 if(process.env.EMAIL_SENDING_ENABLED!=='true')throw new MessageError('Live sending is disabled. Configure SES and enable email sending first.');
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  const campaign=(await client.query('SELECT * FROM email_campaigns WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!campaign||campaign.status!=='draft')throw new MessageError('Only a draft can be approved.');
  const recipients=await client.query(`SELECT h.invitation_token_encrypted,r.language FROM email_recipients r JOIN households h ON h.id=r.household_id WHERE r.campaign_id=$1`,[id]);
  if(!recipients.rowCount)throw new MessageError('There are no recipients left in this draft.');
  if(reviewedCount!==undefined&&recipients.rowCount!==reviewedCount)throw new MessageError('The recipient list changed. Refresh and review it before approving.');
  if(recipients.rows.some(row=>row.language==='ne')&&(!campaign.subject_ne?.trim()||!campaign.body_ne?.trim()))throw new MessageError('Add a Nepali subject and message before approving emails for Nepali households. Create a new draft with both language versions.');
  if(campaign.kind==='invitation')for(const row of recipients.rows) {
   if(!row.invitation_token_encrypted)throw new MessageError('Some invitation links are not email-ready. Set the encryption key, replace those links under Guests, then review again.');
   decryptInvitation(row.invitation_token_encrypted);
  }
  await client.query("UPDATE email_campaigns SET status='queued',approved_by=$2,approved_at=now() WHERE id=$1",[id,actor]);
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export type MailProvider=(mail:{to:string;subject:string;text:string;html:string})=>Promise<string>;
export async function dispatchOne(pool:Pool,send:MailProvider):Promise<boolean> {
 const origin=siteOrigin(true);
 if(process.env.EMAIL_SENDING_ENABLED!=='true')throw new MessageError('Live sending is disabled.');
 const client=await pool.connect();let delivery;
 try {
  await client.query('BEGIN');
  await client.query(`UPDATE email_recipients SET status='unknown',status_note='Interrupted attempt; check SES before sending again',finished_at=now()
    WHERE status='sending' AND started_at<now()-interval '15 minutes'`);
  const result=await client.query(`SELECT r.*,c.subject,c.body,c.subject_ne,c.body_ne,c.kind,c.audience,c.event_id
   FROM email_recipients r JOIN email_campaigns c ON c.id=r.campaign_id
   WHERE r.status='pending' AND c.status='queued' ORDER BY c.created_at,r.id FOR UPDATE OF r SKIP LOCKED LIMIT 1`);
  delivery=result.rows[0];
  if(!delivery){await client.query("UPDATE email_campaigns c SET status='complete' WHERE c.status='queued' AND NOT EXISTS(SELECT 1 FROM email_recipients r WHERE r.campaign_id=c.id AND r.status IN ('pending','sending'))");await client.query('COMMIT');return false;}
  await client.query("UPDATE email_recipients SET status='sending',started_at=now() WHERE id=$1",[delivery.id]);
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 // Never automatically resend a claimed attempt, including ambiguous network failures.
 try {
  const matches=await selectContacts(pool,{subject:delivery.subject,body:delivery.body,kind:delivery.kind,audience:delivery.audience,eventId:delivery.event_id});
  const {included}=partitionContacts(matches);
  const contact=included.find(c=>c.id===delivery.household_id&&c.email===delivery.email);
  if(!contact||contact.preferred_language!==delivery.language) {
   await pool.query("UPDATE email_recipients SET status='skipped',status_note='Contact, language or event eligibility changed after review',finished_at=now() WHERE id=$1",[delivery.id]);return true;
  }
  let link=origin;
  if(delivery.kind==='invitation') {
   if(!contact.invitation_token_encrypted)throw Error('Missing encrypted invitation');
   const token=decryptInvitation(contact.invitation_token_encrypted);
   const current=await pool.query('SELECT invitation_token_hash FROM households WHERE id=$1',[contact.id]);
   if(!/^[a-f0-9]{64}$/.test(token)||current.rows[0]?.invitation_token_hash!==createHash('sha256').update(token).digest('hex'))throw Error('Invitation key mismatch');
   link=`${origin}/invite/${token}`;
  }
  const language=resolveLocale(delivery.language);
  const subject=language==='ne'?delivery.subject_ne:delivery.subject;
  const body=language==='ne'?delivery.body_ne:delivery.body;
  if(!subject||!body)throw new MessageError('Missing translated content.');
  if(delivery.kind!=='invitation')link=`${origin}/?lang=${language}`;
  const message=renderEmail({name:language==='ne'?contact.name_ne||contact.name:contact.name,subject,body,link,kind:delivery.kind,language});
  const providerId=await send({to:delivery.email,subject,...message});
  await pool.query("UPDATE email_recipients SET status='accepted',provider_message_id=$2,finished_at=now() WHERE id=$1",[delivery.id,providerId]);
 }catch {
  await pool.query("UPDATE email_recipients SET status='unknown',status_note='Not confirmed; inspect SES before creating another send',finished_at=now() WHERE id=$1",[delivery.id]);
 }
 return true;
}
