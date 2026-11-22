import {cache} from "react";
import type {Metadata} from "next";
import {cookies} from "next/headers";
import {db} from "@/lib/db";
import {readInvitation,validToken} from "@/lib/invitation-store";
import {resolveLocale,text} from "@/lib/i18n";
import LanguageToggle from "@/components/language-toggle";
import RsvpForm from "./rsvp-form";
import "./invitation.css";
export const dynamic='force-dynamic';
const findInvitation=cache(async(token:string)=>validToken(token)?await readInvitation(db(),token):null);
export async function generateMetadata({params,searchParams}:{params:Promise<{token:string}>;searchParams:Promise<{lang?:string}>}):Promise<Metadata> {const {token}=await params;const invitation=await findInvitation(token);const language=resolveLocale((await searchParams).lang,invitation?.language,(await cookies()).get('wedding_language')?.value);return {title:`${text(language).yourInvitation} | ${text(language).couple}`,robots:{index:false,follow:false,noarchive:true},referrer:'no-referrer'};}
export default async function InvitationPage({params,searchParams}:{params:Promise<{token:string}>;searchParams:Promise<{lang?:string}>}) {
 const {token}=await params;const invitation=await findInvitation(token);
 const language=resolveLocale((await searchParams).lang,invitation?.language,(await cookies()).get('wedding_language')?.value);
 const t=text(language);const path=validToken(token)?`/invite/${token}`:'/';
 if(!invitation)return <main className="invitation-page" lang={language}><div className="invitation-paper"><LanguageToggle language={language} path={path}/><p className="eyebrow">{t.couple}</p><h1>{t.invalidTitle}</h1><p>{t.invalidBody}</p><a href={`/?lang=${language}`}>{t.home}</a></div></main>;
 return <main className="invitation-page" lang={language}><header className="invitation-masthead"><a href={`/?lang=${language}`}>{t.couple}</a><LanguageToggle language={language} path={path}/></header><div className="invitation-paper"><div className="invitation-welcome"><p className="eyebrow">{t.families}</p><h1>{t.nischal} <span>{t.and}</span> {t.bhumika}</h1><p className="household-greeting">{t.greeting} {language==='ne'?invitation.nameNe||invitation.name:invitation.name}</p><p>{t.invitedBody}</p><p className="invitation-time-note">{t.timeNote}</p></div>{invitation.rows.length?<RsvpForm token={token} rows={invitation.rows} language={language}/>:<div className="rsvp-notice">{t.preparing}</div>}<p className="invitation-privacy">{t.privacy}</p></div><footer className="invitation-signoff">{t.signoff}</footer></main>;
}
