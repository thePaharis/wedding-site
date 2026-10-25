"use client";
import { useActionState, useState } from "react";
import { generateHouseholdLink } from "./invitation-actions";
export default function InvitationLink({ householdId, hasLink }: {householdId:string;hasLink:boolean}) {
  const [state, action, pending] = useActionState(generateHouseholdLink, {});
  const [copiedPath,setCopiedPath] = useState<string | null>(null);
  const [copyError,setCopyError] = useState(false);
  const [origin] = useState(() => typeof window !== "undefined" ? window.location.origin : "");
  const url=state.path ? `${origin}${state.path}` : "";
  return <div className="household-invitation"><h3>Private invitation</h3><p>{hasLink ? "An invitation link exists. Create a replacement only if you need to invalidate the previous link." : "Create a private link after selecting this household’s guests and events."}</p><form action={action}><input type="hidden" name="household" value={householdId}/>{(hasLink || state.path) && <label className="check-label"><input type="checkbox" name="confirm" required/> Replace the existing link. The old link will stop working.</label>}<button disabled={pending}>{pending?"Creating link…":hasLink||state.path?"Replace invitation link":"Create invitation link"}</button></form>{state.error&&<p role="alert">{state.error}</p>}{state.path&&<div className="generated-link"><p role="status">Link created. Copy it now; it cannot be retrieved after leaving this page.</p><label>Household invitation link<input value={url} readOnly onFocus={event=>event.target.select()}/></label><div className="admin-links"><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(url);setCopiedPath(state.path!);setCopyError(false);}catch{setCopyError(true);}}}>{copiedPath===state.path?"Copied":"Copy link"}</button><a href={state.path} target="_blank" rel="noopener noreferrer">Preview invitation</a></div>{copyError&&<p role="status">Select the link above and copy it manually.</p>}<p>Anyone with this link can view and change this household’s RSVPs.</p></div>}</div>;
}
