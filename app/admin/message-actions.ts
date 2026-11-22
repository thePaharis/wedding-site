"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/auth";
import {db} from "@/lib/db";
import {approveCampaign,createCampaign,MessageError,type MessageDraft} from "@/lib/messaging-store";
export async function draftMessage(form:FormData) {
 const actor=await requireAdmin();let id;
 try {
  const input={subject:String(form.get('subject')||''),body:String(form.get('body')||''),subjectNe:String(form.get('subject_ne')||''),bodyNe:String(form.get('body_ne')||''),kind:String(form.get('kind')||''),audience:String(form.get('audience')||''),eventId:String(form.get('event')||'')||null} as MessageDraft;
  id=await createCampaign(db(),input,actor.email);
 }catch(error){redirect('/admin/messages?error='+encodeURIComponent(error instanceof MessageError?error.message:'Could not create the preview. Please try again.'));}
 redirect(`/admin/messages/${id}`);
}
export async function queueMessage(form:FormData) {
 const actor=await requireAdmin();const id=String(form.get('id')||'');
 if(!/^[a-f0-9-]{36}$/i.test(id))redirect('/admin/messages');
 if(form.get('confirm')!=='on')redirect(`/admin/messages/${id}?error=Confirm+the+message+and+recipient+list+first.`);
 const count=Number(form.get("count"));if(!Number.isInteger(count)||count<1)redirect(`/admin/messages/${id}?error=No+recipients+to+approve.`);
 try {await approveCampaign(db(),id,actor.email,count);}catch(error){redirect(`/admin/messages/${id}?error=`+encodeURIComponent(error instanceof MessageError?error.message:'Could not approve. Check your email configuration and invitation encryption key.'));}
 revalidatePath('/admin/messages');redirect(`/admin/messages/${id}?queued=1`);
}
export async function excludeRecipient(form:FormData) {
 await requireAdmin();const id=String(form.get('campaign')||'');const recipient=String(form.get('recipient')||'');
 if(!/^[a-f0-9-]{36}$/i.test(id)||!/^[a-f0-9-]{36}$/i.test(recipient))redirect('/admin/messages');
 const client=await db().connect();
 try {
  await client.query('BEGIN');
  const campaign=await client.query('SELECT status FROM email_campaigns WHERE id=$1 FOR UPDATE',[id]);
  if(campaign.rows[0]?.status==='draft')await client.query('DELETE FROM email_recipients WHERE id=$1 AND campaign_id=$2',[recipient,id]);
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 revalidatePath(`/admin/messages/${id}`);redirect(`/admin/messages/${id}`);
}
export async function cancelMessage(form:FormData) {
 await requireAdmin();const id=String(form.get('id')||'');if(!/^[a-f0-9-]{36}$/i.test(id))redirect('/admin/messages');
 await db().query("UPDATE email_campaigns SET status='cancelled' WHERE id=$1 AND status IN ('draft','queued')",[id]);
 revalidatePath('/admin/messages');redirect(`/admin/messages/${id}`);
}
