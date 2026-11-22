import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createHash} from 'node:crypto';
import {createCampaign,selectContacts,partitionContacts,approveCampaign,dispatchOne,renderEmail} from '../lib/messaging-store.ts';
import {encryptInvitation,decryptInvitation} from '../lib/email-crypto.mjs';
process.env.INVITATION_ENCRYPTION_KEY='a'.repeat(64);
process.env.SITE_URL='https://example.com';
process.env.EMAIL_SENDING_ENABLED='true';
async function setup(){
 const database=new PGlite();
 for(const file of ['001_initial.sql','002_admin.sql','003_email_messages.sql','004_manual_invitation_sharing.sql'])await database.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
 const query=async(sql,params)=>{const result=await database.query(sql,params);return {...result,rowCount:Math.max(result.rows.length,result.affectedRows||0)}};
 const pool={query,connect:async()=>({query,release(){}})};
 const add=async(name,email,attending)=>{
  const token='b'.repeat(64);
  const h=(await query('INSERT INTO households(name,primary_email,invitation_token_hash,invitation_token_encrypted) VALUES($1,$2,$3,$4) RETURNING id',[name,email,createHash('sha256').update(token+name).digest('hex'),encryptInvitation(token)])).rows[0].id;
  // Only the first recipient needs a decryptable, matching link in dispatch tests.
  const g=(await query('INSERT INTO guests(household_id,first_name) VALUES($1,$2) RETURNING id',[h,name])).rows[0].id;
  const event=(await query("SELECT id FROM events WHERE slug='wedding'")).rows[0].id;
  await query('INSERT INTO guest_event_invitations(guest_id,event_id) VALUES($1,$2)',[g,event]);
  if(attending!==null)await query('INSERT INTO rsvps(guest_id,event_id,attending) VALUES($1,$2,$3)',[g,event,attending]);
  return {h,g,event,token};
 };
 const first=await add('First family','first@example.com',true);
 await query('UPDATE households SET invitation_token_hash=$2 WHERE id=$1',[first.h,createHash('sha256').update(first.token).digest('hex')]);
 const second=await add('Second family','second@example.com',null);
 const third=await add('Third family',null,false);
 const draft={kind:'update',audience:'all',eventId:null,subject:'Wedding update',body:'See you soon!'};
 return {database,pool,query,first,second,third,draft};
}
test('audiences are event-specific; missing and shared emails are excluded',async()=>{
 const s=await setup();try{
  const all=await selectContacts(s.pool,s.draft);assert.equal(all.length,3);assert.equal(partitionContacts(all).included.length,2);
  assert.equal((await selectContacts(s.pool,{...s.draft,audience:'attending',eventId:s.first.event})).length,1);
  assert.equal((await selectContacts(s.pool,{...s.draft,audience:'pending',eventId:s.first.event})).length,1);
  const mehendi=(await s.query("SELECT id FROM events WHERE slug='mehendi'")).rows[0].id;
  assert.equal((await selectContacts(s.pool,{...s.draft,audience:'invited',eventId:mehendi})).length,0);
  await s.query("UPDATE households SET primary_email='first@example.com' WHERE id=$1",[s.second.h]);
  const split=partitionContacts(await selectContacts(s.pool,s.draft));assert.equal(split.included.length,0);assert.equal(split.excluded.length,3);
 }finally{await s.database.close();}
});
test('encrypted invitation links authenticate ciphertext; rendered HTML escapes user input',()=>{
 const encrypted=encryptInvitation('a'.repeat(64));assert.equal(decryptInvitation(encrypted),'a'.repeat(64));assert(!encrypted.includes('a'.repeat(64)));
 assert.throws(()=>decryptInvitation(encrypted.slice(0,-2)+'ff'));
 const output=renderEmail({name:'<script>',body:'<img src=x onerror=alert(1)>',subject:'A & B',link:'https://example.com',kind:'update'});
 assert(!output.html.includes('<script>'));assert(!output.html.includes('<img'));assert(output.html.includes('A &amp; B'));
});
test('drafts do not send; approval and repeated processing cannot duplicate emails',async()=>{
 const s=await setup();try{
  const id=await createCampaign(s.pool,s.draft,'admin@example.com');let calls=0;
  const provider=async()=>{calls++;return 'mock-'+calls};
  assert.equal(await dispatchOne(s.pool,provider),false);assert.equal(calls,0);
  await approveCampaign(s.pool,id,'admin@example.com');await assert.rejects(()=>approveCampaign(s.pool,id,'admin@example.com'),/draft/);
  while(await dispatchOne(s.pool,provider)){}
  assert.equal(calls,2);assert.equal((await s.query("SELECT count(*)::int n FROM email_recipients WHERE status='accepted'")).rows[0].n,2);
  assert.equal(await dispatchOne(s.pool,provider),false);assert.equal(calls,2);
 }finally{await s.database.close();}
});
test('unknown send outcomes are not retried and changed recipient eligibility is skipped',async()=>{
 const s=await setup();try{
  const id=await createCampaign(s.pool,s.draft,'admin@example.com');await approveCampaign(s.pool,id,'admin@example.com');
  await s.query("UPDATE households SET primary_email='new@example.com' WHERE id=$1",[s.second.h]);let calls=0;
  while(await dispatchOne(s.pool,async()=>{calls++;throw Error('Simulated timeout')})){}
  assert.equal(calls,1);
  const rows=(await s.query('SELECT status FROM email_recipients')).rows;assert(rows.some(r=>r.status==='unknown'));assert(rows.some(r=>r.status==='skipped'));
  assert.equal(await dispatchOne(s.pool,async()=>{calls++;return 'duplicate'}),false);assert.equal(calls,1);
 }finally{await s.database.close();}
});
test('personal invitations use the same household token; disabled sending refuses approval',async()=>{
 const s=await setup();try{
  await s.query('UPDATE households SET primary_email=NULL WHERE id=$1',[s.second.h]);
  const id=await createCampaign(s.pool,{...s.draft,kind:'invitation'},'admin@example.com');
  process.env.EMAIL_SENDING_ENABLED='false';await assert.rejects(()=>approveCampaign(s.pool,id,'admin@example.com'),/disabled/);process.env.EMAIL_SENDING_ENABLED='true';
  await approveCampaign(s.pool,id,'admin@example.com');let sent;
  await dispatchOne(s.pool,async mail=>{sent=mail;return 'mock-private'});
  assert(sent.text.includes('/invite/'+s.first.token));assert.equal(sent.to,'first@example.com');
 }finally{process.env.EMAIL_SENDING_ENABLED='true';await s.database.close();}
});
test('approval blocks legacy links, empty drafts and changed reviewed counts',async()=>{
 const s=await setup();try{
  const id=await createCampaign(s.pool,{...s.draft,kind:'invitation'},'admin@example.com');
  await s.query('UPDATE households SET invitation_token_encrypted=NULL WHERE id=$1',[s.second.h]);
  await assert.rejects(()=>approveCampaign(s.pool,id,'admin@example.com'),/email-ready/);
  const update=await createCampaign(s.pool,s.draft,'admin@example.com');
  await assert.rejects(()=>approveCampaign(s.pool,update,'admin@example.com',1),/changed/);
  await s.query('DELETE FROM email_recipients WHERE campaign_id=$1',[update]);
  await assert.rejects(()=>approveCampaign(s.pool,update,'admin@example.com'),/no recipients/);
  process.env.SITE_URL='http://localhost:3000';await assert.rejects(()=>approveCampaign(s.pool,id,'admin@example.com'),/HTTPS/);
 }finally{process.env.SITE_URL='https://example.com';await s.database.close();}
});
