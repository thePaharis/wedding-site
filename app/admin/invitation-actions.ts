"use server";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/auth";
import {db} from "@/lib/db";
import {InvitationLinkError,issueInvitation} from "@/lib/invitation-store";
export type LinkState={path?:string;error?:string};
export async function generateHouseholdLink(_previous:LinkState,form:FormData):Promise<LinkState> {
 await requireAdmin();
 const id=form.get("household");
 if(typeof id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return {error:"Please select a valid household."};
 try {
  const token=await issueInvitation(db(),id,form.get("confirm")==="on");
  revalidatePath("/admin/guests");
  return {path:`/invite/${token}`};
 }catch(error){return {error:error instanceof InvitationLinkError?error.message:"Could not create a link. Please try again."};}
}
