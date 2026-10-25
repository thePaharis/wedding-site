import type { Metadata } from "next";
import { db } from "@/lib/db";
import { readInvitation, validToken } from "@/lib/invitation-store";
import RsvpForm from "./rsvp-form";
import "./invitation.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {title:"Your invitation | Nischal & Bhumika",robots:{index:false,follow:false,noarchive:true},referrer:"no-referrer"};
export default async function InvitationPage({ params }: { params: Promise<{token:string}> }) {
  const {token}=await params;
  const invitation=validToken(token) ? await readInvitation(db(),token) : null;
  if (!invitation) return <main className="invitation-page"><div className="invitation-paper"><p className="eyebrow">Nischal & Bhumika</p><h1>Let’s find your invitation.</h1><p>This link is invalid or has been replaced. Please use the latest link we sent you, or contact Nischal or Bhumika.</p><a href="/">Return to the wedding website</a></div></main>;
  return <main className="invitation-page"><header className="invitation-masthead"><a href="/">N <span>&</span> B</a><span>POKHARA · NEPAL</span></header><div className="invitation-paper"><div className="invitation-welcome"><p className="eyebrow">Together with our families</p><h1>Nischal <span>&</span> Bhumika</h1><p className="household-greeting">With love, to {invitation.name}</p><p>We would love to celebrate with you. Here are your family’s invited events.</p><p className="invitation-time-note">All times are local to Nepal (Asia/Kathmandu).</p></div>{invitation.rows.length ? <RsvpForm token={token} rows={invitation.rows}/> : <div className="rsvp-notice">Your event details are being prepared. Please contact us or check this link again later.</div>}<p className="invitation-privacy">This link is private to your household. Anyone with it can view and update your family’s responses, so please keep it within your household.</p></div><footer className="invitation-signoff">With love, Nischal & Bhumika</footer></main>;
}
