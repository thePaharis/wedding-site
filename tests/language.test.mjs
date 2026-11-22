import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {issueInvitation,readInvitation,saveResponses,tokenHash,responseKey} from '../lib/invitation-store.ts';
import {prepareManualInvitation,recordManualShare,saveContact} from '../lib/manual-sharing.ts';
import {createCampaign,approveCampaign,dispatchOne} from '../lib/messaging-store.ts';
import {resolveLocale,text,formatDate,formatTime,rsvpError,languageDestination} from '../lib/i18n.ts';
process.env.INVITATION_ENCRYPTION_KEY='d'.repeat(64);
process.env.SITE_URL='https://example.com';
process.env.EMAIL_SENDING_ENABLED='true';
async function setup(){
 const database=new PGlite();
 for(const file of ['001_initial.sql','002_admin.sql','003_email_messages.sql','004_manual_invitation_sharing.sql','005_nepali_language.sql'])await database.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
 const query=async(sql,params)=>{const result=await database.query(sql,params);return {...result,rowCount:Math.max(result.rows.length,result.affectedRows||0)}};
 const pool={query,connect:async()=>({query,release(){}})};
 const h=(await query("INSERT INTO households(name,name_ne,primary_email,preferred_language) VALUES('Patel Family','पटेल परिवार','test@example.com','ne') RETURNING id")).rows[0].id;
 const g=(await query("INSERT INTO guests(household_id,first_name,first_name_ne) VALUES($1,'Priya','प्रिया') RETURNING id",[h])).rows[0].id;
 const e=(await query("SELECT id FROM events WHERE slug='wedding'")).rows[0].id;
 await query('INSERT INTO guest_event_invitations(guest_id,event_id) VALUES($1,$2)',[g,e]);
 const token=await issueInvitation(pool,h);return {database,pool,query,h,g,e,token};
}
test('household default beats an English browser preference; explicit toggles can override it',()=>{
 assert.equal(resolveLocale(undefined,'ne','en'),'ne');assert.equal(resolveLocale('en','ne','ne'),'en');assert.equal(resolveLocale('ne','en','en'),'ne');assert.equal(resolveLocale(undefined,undefined,undefined),'en');assert.equal(resolveLocale(undefined,undefined,'ne'),'ne');assert.equal(resolveLocale('invalid','ne'),'ne');
 const path='/invite/'+'a'.repeat(64);assert.equal(languageDestination(path,'ne'),path+'?lang=ne');assert.equal(languageDestination('https://evil.example','ne'),'/?lang=ne');assert.equal(languageDestination('//evil.example','en'),'/?lang=en');
});
test('Nepali dates keep the Gregorian date and localized RSVP failures remain readable',()=>{
 const date=formatDate('2027-02-03','ne');assert(date.includes('२०२७'));assert(date.includes('३'));assert(!date.includes('२०८३'));assert.equal(formatTime('09:30','ne'),'बिहान ९:३०');assert.equal(formatTime('21:00','ne'),'राति ९:००');assert.equal(rsvpError(text('en').rsvpMissing,'ne'),text('ne').rsvpMissing);assert.equal(rsvpError(undefined,'ne'),text('ne').rsvpGeneric);
});
test('Nepali invitation opens with household language and translated event and guest names',async()=>{
 const s=await setup();try{
  const invitation=await readInvitation(s.pool,s.token);assert.equal(invitation.language,'ne');assert.equal(invitation.nameNe,'पटेल परिवार');assert.equal(invitation.rows[0].name_ne,'विवाह');assert.equal(invitation.rows[0].first_name_ne,'प्रिया');
  assert.equal(resolveLocale(undefined,invitation.language,'en'),'ne');
  const form=new FormData();form.set('response:'+responseKey(s.g,s.e),'yes');form.set('diet:'+responseKey(s.g,s.e),'शाकाहारी');await saveResponses(s.pool,s.token,form);
  assert.equal((await s.query('SELECT dietary_requirements FROM rsvps')).rows[0].dietary_requirements,'शाकाहारी');
 }finally{await s.database.close();}
});
test('copied message follows household language, without rotating tokens or leaking other events',async()=>{
 const s=await setup();try{
  const prepared=await prepareManualInvitation(s.pool,s.h);assert.equal(prepared.language,'ne');assert(prepared.message.includes('नमस्कार पटेल परिवार'));assert(prepared.message.includes('विवाह'));assert(!prepared.message.includes('Wedding'));assert(!prepared.message.includes('मेहन्दी'));
  assert.equal(prepared.path,'/invite/'+s.token);assert.equal((await s.query('SELECT invitation_token_hash FROM households WHERE id=$1',[s.h])).rows[0].invitation_token_hash,tokenHash(s.token));
  await recordManualShare(s.pool,s.h,tokenHash(s.token),'messenger','admin@example.com','ne');
  await saveContact(s.pool,s.h,{name:'Patel Family',nameNe:'पटेल परिवार',email:'test@example.com',phone:'',method:'email',language:'en'});
  await assert.rejects(()=>recordManualShare(s.pool,s.h,tokenHash(s.token),'messenger','admin@example.com','ne'),/language changed/);
  const english=await prepareManualInvitation(s.pool,s.h);assert(english.message.includes('Wedding'));assert.equal(english.path,prepared.path);
  await recordManualShare(s.pool,s.h,tokenHash(s.token),'messenger','admin@example.com','en');assert.equal((await s.query('SELECT count(*)::int n FROM invitation_manual_shares')).rows[0].n,2);
 }finally{await s.database.close();}
});
test('email refuses missing Nepali content and dispatches only the approved Nepali subject and body',async()=>{
 const s=await setup();try{
  const draft={kind:'invitation',audience:'all',eventId:null,subject:'English subject',body:'English body'};
  const missing=await createCampaign(s.pool,draft,'admin@example.com');await assert.rejects(()=>approveCampaign(s.pool,missing,'admin@example.com'),/Nepali subject/);
  const id=await createCampaign(s.pool,{...draft,subjectNe:'विवाहको निमन्त्रणा',bodyNe:'हाम्रो विवाहमा हार्दिक निमन्त्रणा।'},'admin@example.com');await approveCampaign(s.pool,id,'admin@example.com');let mail;
  await dispatchOne(s.pool,async input=>{mail=input;return 'fake-nepali'});assert.equal(mail.subject,'विवाहको निमन्त्रणा');assert(mail.text.includes('हाम्रो विवाहमा'));assert(!mail.text.includes('English body'));assert(mail.html.includes('lang="ne"'));assert(mail.html.includes('आफ्नो निमन्त्रणा हेर्नुहोस्'));assert(mail.text.includes('/invite/'+s.token));
 }finally{await s.database.close();}
});
test('changing household language after email review skips that recipient rather than sending the wrong language',async()=>{
 const s=await setup();try{
  const id=await createCampaign(s.pool,{kind:'update',audience:'all',eventId:null,subject:'Hello',body:'English body',subjectNe:'नमस्कार',bodyNe:'नेपाली सन्देश'},'admin@example.com');await approveCampaign(s.pool,id,'admin@example.com');
  await s.query("UPDATE households SET preferred_language='en' WHERE id=$1",[s.h]);let calls=0;await dispatchOne(s.pool,async()=>{calls++;return 'should-not-send'});assert.equal(calls,0);assert.equal((await s.query('SELECT status FROM email_recipients WHERE campaign_id=$1',[id])).rows[0].status,'skipped');
 }finally{await s.database.close();}
});
