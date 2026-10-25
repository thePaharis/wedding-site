"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { RsvpError, saveResponses } from "@/lib/invitation-store";
export type RsvpState = { error?: string; saved?: boolean };
export async function submitRsvp(token: string, _previous: RsvpState, form: FormData): Promise<RsvpState> {
  try { await saveResponses(db(), token, form); }
  catch (error) { return { error: error instanceof RsvpError ? error.message : "We couldn’t save your response. Please try again in a moment." }; }
  revalidatePath("/admin");
  revalidatePath("/admin/rsvps");
  revalidatePath(`/invite/${token}`);
  return { saved: true };
}
