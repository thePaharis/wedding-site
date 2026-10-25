import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {issueInvitation,readInvitation,saveResponses,tokenHash,responseKey} from '../lib/invitation-store.ts';

async function setup() {
 const database=new PGlite();
 for (const file of ['001_initial.sql','002_admin.sql']) await database.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
 const query=async(sql,params)=>{const result=await database.query(sql,params);return {...result,rowCount:Math.max(result.affectedRows??0,result.rows.length)};};
 const pool={query,connect:async()=>({query,release(){}})};
 const insert=async(sql,params)=>(await query(sql,params)).rows[0].id;
 const a=await insert("INSERT INTO households(name) VALUES ('Patel family') RETURNING id");
 const b=await insert("INSERT INTO households(name) VALUES ('Other family') RETURNING id");
 const guest=await insert("INSERT INTO guests(household_id,first_name) VALUES ($1,'Priya') RETURNING id",[a]);
 const other=await insert("INSERT INTO guests(household_id,first_name) VALUES ($1,'Private guest') RETURNING id",[b]);
 const event=(await query("SELECT id FROM events WHERE slug='wedding'")).rows[0].id;
 const uninvited=(await query("SELECT id FROM events WHERE slug='mehendi'")).rows[0].id;
 for(const id of [guest,other])await query('INSERT INTO guest_event_invitations(guest_id,event_id) VALUES ($1,$2)',[id,event]);
 const token=await issueInvitation(pool,a);
 const form=(attending='yes')=>{const f=new FormData();f.set('response:'+responseKey(guest,event),attending);f.set('diet:'+responseKey(guest,event),'Vegetarian');return f;};
 return {database,pool,query,a,b,guest,other,event,uninvited,token,form};
}

test('household-scoped reading; tokens are hashed and old links stop working',async()=>{
 const s=await setup();try {
  const invitation=await readInvitation(s.pool,s.token);assert.equal(invitation.name,'Patel family');assert.equal(invitation.rows.length,1);assert.equal(invitation.rows[0].first_name,'Priya');
  const stored=(await s.query('SELECT invitation_token_hash FROM households WHERE id=$1',[s.a])).rows[0].invitation_token_hash;assert.equal(stored,tokenHash(s.token));assert.notEqual(stored,s.token);
  assert.equal(await readInvitation(s.pool,'invalid'),null);assert.equal(await readInvitation(s.pool,'0'.repeat(64)),null);
  await assert.rejects(()=>issueInvitation(s.pool,s.a),/Confirm/);
  const replacement=await issueInvitation(s.pool,s.a,true);assert.equal(await readInvitation(s.pool,s.token),null);assert(await readInvitation(s.pool,replacement));await assert.rejects(()=>saveResponses(s.pool,s.token,s.form()),/no longer/);
 }finally{await s.database.close();}
});

test('RSVP saves are idempotent, editable, and clear dietary needs when declining',async()=>{
 const s=await setup();try {
  await saveResponses(s.pool,s.token,s.form());await saveResponses(s.pool,s.token,s.form());
  assert.equal((await s.query('SELECT count(*)::int n FROM rsvps')).rows[0].n,1);
  let row=(await s.query('SELECT * FROM rsvps')).rows[0];assert.equal(row.attending,true);assert.equal(row.dietary_requirements,'Vegetarian');
  await saveResponses(s.pool,s.token,s.form('no'));row=(await s.query('SELECT * FROM rsvps')).rows[0];assert.equal(row.attending,false);assert.equal(row.dietary_requirements,null);
 }finally{await s.database.close();}
});

test('tampered guest/event ids, missing answers and duplicates cannot change any responses',async()=>{
 const s=await setup();try {
  await saveResponses(s.pool,s.token,s.form());
  const foreign=s.form();foreign.set('response:'+responseKey(s.other,s.event),'no');await assert.rejects(()=>saveResponses(s.pool,s.token,foreign),/changed/);
  const uninvited=s.form();uninvited.set('response:'+responseKey(s.guest,s.uninvited),'yes');await assert.rejects(()=>saveResponses(s.pool,s.token,uninvited),/changed/);
  await assert.rejects(()=>saveResponses(s.pool,s.token,new FormData()),/answer/);
  const duplicate=s.form();duplicate.append('response:'+responseKey(s.guest,s.event),'no');await assert.rejects(()=>saveResponses(s.pool,s.token,duplicate),/one response/);
  const invalid=s.form('maybe');await assert.rejects(()=>saveResponses(s.pool,s.token,invalid),/attending/);
  const large=s.form();large.set('diet:'+responseKey(s.guest,s.event),'x'.repeat(1001));await assert.rejects(()=>saveResponses(s.pool,s.token,large),/1,000/);
  const rows=(await s.query('SELECT * FROM rsvps')).rows;assert.equal(rows.length,1);assert.equal(rows[0].attending,true);assert.equal(rows[0].guest_id,s.guest);
 }finally{await s.database.close();}
});

test('revoked, archived and closed events cannot receive RSVP changes',async()=>{
 const s=await setup();try {
  await s.query("UPDATE events SET rsvp_deadline=now()-interval '1 day' WHERE id=$1",[s.event]);
  assert.equal((await readInvitation(s.pool,s.token)).rows[0].closed,true);
  await assert.rejects(()=>saveResponses(s.pool,s.token,s.form()),/no open/);
  await s.query('UPDATE events SET rsvp_deadline=NULL,archived_at=now() WHERE id=$1',[s.event]);assert.equal((await readInvitation(s.pool,s.token)).rows.length,0);await assert.rejects(()=>saveResponses(s.pool,s.token,s.form()),/no open/);
  await s.query('UPDATE events SET archived_at=NULL WHERE id=$1',[s.event]);await s.query('DELETE FROM guest_event_invitations WHERE guest_id=$1',[s.guest]);assert.equal((await readInvitation(s.pool,s.token)).rows.length,0);await assert.rejects(()=>saveResponses(s.pool,s.token,s.form()),/no open/);
 }finally{await s.database.close();}
});

test('a missing answer for one event rolls back the whole household submission',async()=>{
 const s=await setup();try {
  await s.query('INSERT INTO guest_event_invitations(guest_id,event_id) VALUES ($1,$2)',[s.guest,s.uninvited]);
  await assert.rejects(()=>saveResponses(s.pool,s.token,s.form()),/answer/);
  assert.equal((await s.query('SELECT count(*)::int n FROM rsvps')).rows[0].n,0);
  const full=s.form();full.set('response:'+responseKey(s.guest,s.uninvited),'no');await saveResponses(s.pool,s.token,full);
  assert.equal((await s.query('SELECT count(*)::int n FROM rsvps')).rows[0].n,2);
 }finally{await s.database.close();}
});
