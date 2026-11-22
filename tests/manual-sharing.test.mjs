import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {issueInvitation,tokenHash} from '../lib/invitation-store.ts';
import {getHouseholdEvents,prepareManualInvitation,recordManualShare,saveContact,validateContact,sharingOrigin} from '../lib/manual-sharing.ts';
import {selectContacts} from '../lib/messaging-store.ts';
process.env.INVITATION_ENCRYPTION_KEY='c'.repeat(64);
process.env.SITE_URL='https://example.com';
async function setup(){
 const database=new PGlite();
 for(const file of ['001_initial.sql','002_admin.sql','003_email_messages.sql','004_manual_invitation_sharing.sql','005_nepali_language.sql'])await database.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
 const query=async(sql,params)=>{const result=await database.query(sql,params);return {...result,rowCount:Math.max(result.rows.length,result.affectedRows||0)}};
 const pool={query,connect:async()=>({query,release(){}})};
 const add=async(name)=>{
  const h=(await query('INSERT INTO households(name,primary_email) VALUES($1,$2) RETURNING id',[name,name+'@example.com'])).rows[0].id;
  const g=(await query('INSERT INTO guests(household_id,first_name) VALUES($1,$2) RETURNING id',[h,name])).rows[0].id;return {h,g};
 };
 const first=await add('Patel');const other=await add('Other');
 const wedding=(await query("SELECT id FROM events WHERE slug='wedding'")).rows[0].id;
 const mehendi=(await query("SELECT id FROM events WHERE slug='mehendi'")).rows[0].id;
 await query('INSERT INTO guest_event_invitations(guest_id,event_id) VALUES($1,$2)',[first.g,wedding]);
 await query('INSERT INTO guest_event_invitations(guest_id,event_id) VALUES($1,$2)',[other.g,mehendi]);
 const token=await issueInvitation(pool,first.h);
 return {database,pool,query,first,other,wedding,mehendi,token};
}
test('manual message lists only invited events and reuses the current encrypted link',async()=>{
 const s=await setup();try{
  const prepared=await prepareManualInvitation(s.pool,s.first.h);const repeated=await prepareManualInvitation(s.pool,s.first.h);
  assert.equal(prepared.path,repeated.path);assert.equal(prepared.tokenHash,tokenHash(s.token));assert.equal(prepared.local,false);
  assert(prepared.message.includes('Hi Patel!'));assert(prepared.message.includes('Feb 3, 2027 — Wedding'));assert(prepared.message.includes('https://example.com/invite/'+s.token));
  assert(!prepared.message.includes('Mehendi'));assert(!prepared.message.includes('Other'));assert(!prepared.message.includes('Reception'));
  assert.equal((await s.query('SELECT invitation_token_hash FROM households WHERE id=$1',[s.first.h])).rows[0].invitation_token_hash,tokenHash(s.token));
 }finally{await s.database.close();}
});
test('mark as sent is idempotent, stores no raw link and rejects a replaced token',async()=>{
 const s=await setup();try{
  for(let n=0;n<2;n++)await recordManualShare(s.pool,s.first.h,tokenHash(s.token),'messenger','admin@example.com');
  const rows=(await s.query('SELECT * FROM invitation_manual_shares')).rows;assert.equal(rows.length,1);assert.equal(rows[0].invitation_token_hash,tokenHash(s.token));assert(!JSON.stringify(rows).includes(s.token));
  await issueInvitation(s.pool,s.first.h,true);
  await assert.rejects(()=>recordManualShare(s.pool,s.first.h,tokenHash(s.token),'messenger','admin@example.com'),/replaced/);
  assert.equal((await s.query(`SELECT count(*)::int n FROM invitation_manual_shares s JOIN households h ON h.id=s.household_id AND h.invitation_token_hash=s.invitation_token_hash`)).rows[0].n,0);
  await assert.rejects(()=>recordManualShare(s.pool,s.first.h,tokenHash(s.token),'unrecognized','admin@example.com'),/valid sharing/);
 }finally{await s.database.close();}
});
test('local previews cannot be marked as shared, and invalid origins are rejected',async()=>{
 const s=await setup();try{
  process.env.SITE_URL='http://localhost:3000';assert.equal((await prepareManualInvitation(s.pool,s.first.h)).local,true);
  await assert.rejects(()=>recordManualShare(s.pool,s.first.h,tokenHash(s.token),'messenger','admin@example.com'),/localhost/);
  for(const origin of ['javascript:alert(1)','http://example.com','https://example.com/path','https://user:secret@example.com']){process.env.SITE_URL=origin;assert.throws(()=>sharingOrigin(),/SITE_URL/);}
 }finally{process.env.SITE_URL='https://example.com';await s.database.close();}
});
test('Messenger can have no email or phone; explicit phone country codes and preference requirements are validated',async()=>{
 const s=await setup();try{
  const us=validateContact({name:'US family',email:'',phone:'+1 (727) 555-0100',method:'sms'});assert.equal(us.phone,'+17275550100');
  const nepal=validateContact({name:'Nepal family',email:'',phone:'+977 980-000-0000',method:'sms'});assert.equal(nepal.phone,'+9779800000000');
  assert.throws(()=>validateContact({name:'Family',email:'',phone:'9800000000',method:'sms'}),/country code/);
  assert.throws(()=>validateContact({name:'Family',email:'',phone:'',method:'sms'}),/phone/);
  assert.throws(()=>validateContact({name:'Family',email:'',phone:'',method:'email'}),/email/);
  await saveContact(s.pool,s.first.h,{name:'Messenger family',email:'',phone:'',method:'messenger'});
  const row=(await s.query('SELECT * FROM households WHERE id=$1',[s.first.h])).rows[0];assert.equal(row.primary_email,null);assert.equal(row.primary_phone,null);assert.equal(row.preferred_contact_method,'messenger');
 }finally{await s.database.close();}
});
test('Messenger and SMS preferences are excluded from email audiences',async()=>{
 const s=await setup();try{
  const draft={subject:'Hello',body:'Wedding update',kind:'update',audience:'all',eventId:null};
  assert.equal((await selectContacts(s.pool,draft)).length,2);
  await saveContact(s.pool,s.first.h,{name:'Patel',email:'patel@example.com',phone:'',method:'messenger'});
  const recipients=await selectContacts(s.pool,draft);assert.equal(recipients.length,1);assert.equal(recipients[0].id,s.other.h);
  await saveContact(s.pool,s.other.h,{name:'Other',email:'other@example.com',phone:'+17275550100',method:'sms'});assert.equal((await selectContacts(s.pool,draft)).length,0);
 }finally{await s.database.close();}
});
test('legacy links are not silently replaced and households without invited events cannot produce a message',async()=>{
 const s=await setup();try{
  await s.query('UPDATE households SET invitation_token_encrypted=NULL WHERE id=$1',[s.first.h]);
  await assert.rejects(()=>prepareManualInvitation(s.pool,s.first.h),/older link/);
  assert.equal((await s.query('SELECT invitation_token_hash FROM households WHERE id=$1',[s.first.h])).rows[0].invitation_token_hash,tokenHash(s.token));
  const once=await prepareManualInvitation(s.pool,s.first.h,s.token);assert(once.message.includes('/invite/'+s.token));
  await s.query('DELETE FROM guest_event_invitations WHERE guest_id=$1',[s.first.g]);
  await assert.rejects(()=>getHouseholdEvents(s.pool,s.first.h),/Assign events/);
 }finally{await s.database.close();}
});
