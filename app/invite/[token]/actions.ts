"use server";
import { revalidatePath } from "next/cache";
import {resolveLocale,rsvpError,type Locale} from "@/lib/i18n";
import { db } from "@/lib/db";
import { RsvpError, saveResponses } from "@/lib/invitation-store";
export type RsvpState = { error?: string; saved?: boolean };
export async function submitRsvp(token: string, language:Locale, _previous: RsvpState, form: FormData): Promise<RsvpState> {
  try { await saveResponses(db(), token, form); }
  catch (error) { return { error: rsvpError(error instanceof RsvpError?error.message:undefined,resolveLocale(language)) }; }
  revalidatePath("/admin");
  revalidatePath("/admin/rsvps");
  revalidatePath(`/invite/${token}`);
  return { saved: true };
}
