"use server";
import type {Locale} from "@/lib/i18n";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/auth";
import {db} from "@/lib/db";
import {prepareManualInvitation,recordManualShare,SharingError,saveContact} from "@/lib/manual-sharing";
const validId=(id:unknown):id is string=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export type SharingState={path?:string;url?:string;message?:string;tokenHash?:string;local?:boolean;language?:Locale;error?:string};
export async function prepareShare(_previous:SharingState,form:FormData):Promise<SharingState> {
 await requireAdmin();const id=form.get('household');if(!validId(id))return {error:'Choose a valid household.'};
 try{return await prepareManualInvitation(db(),id);}catch(error){return {error:error instanceof SharingError?error.message:'Could not prepare the invitation. Please try again.'};}
}
export async function markShared(_previous:{error?:string;saved?:boolean},form:FormData):Promise<{error?:string;saved?:boolean}> {
 const actor=await requireAdmin();const id=form.get('household');
 if(!validId(id)||form.get('confirm')!=='on')return {error:'Confirm that you already shared this invitation yourself.'};
 try {await recordManualShare(db(),id,String(form.get('hash')||''),String(form.get('channel')||''),actor.email,String(form.get('language')||''));}
 catch(error){return {error:error instanceof SharingError?error.message:'Could not save the sharing record. Please try again.'};}
 revalidatePath('/admin/guests');return {saved:true};
}
export async function updateContact(_previous:{error?:string;saved?:boolean},form:FormData):Promise<{error?:string;saved?:boolean}> {
 await requireAdmin();const id=form.get('household');if(!validId(id))return {error:'Choose a valid household.'};
 try{await saveContact(db(),id,{name:String(form.get('name')||''),email:String(form.get('email')||''),phone:String(form.get('phone')||''),method:String(form.get('method')||''),language:String(form.get('language')||'en'),nameNe:String(form.get('name_ne')||'')});}
 catch(error){return {error:error instanceof SharingError?error.message:'Could not save contact details.'};}
 revalidatePath('/admin/guests');return {saved:true};
}
