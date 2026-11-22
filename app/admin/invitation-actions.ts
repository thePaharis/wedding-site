"use server";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/auth";
import {db} from "@/lib/db";
import {InvitationLinkError,issueInvitation} from "@/lib/invitation-store";
import {getHouseholdEvents,prepareManualInvitation,sharingOrigin,SharingError} from "@/lib/manual-sharing";
import type {SharingState} from "./sharing-actions";
export type LinkState=SharingState;
export async function generateHouseholdLink(_previous:LinkState,form:FormData):Promise<LinkState> {
 await requireAdmin();const id=form.get('household');
 if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return {error:'Please select a valid household.'};
 try {
  sharingOrigin();await getHouseholdEvents(db(),id);
  const token=await issueInvitation(db(),id,form.get('confirm')==='on');
  const state=await prepareManualInvitation(db(),id,token);
  revalidatePath('/admin/guests');return state;
 }catch(error){return {error:error instanceof InvitationLinkError||error instanceof SharingError?error.message:'Could not prepare the invitation. Please try again.'};}
}
