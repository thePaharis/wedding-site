"use client";
import {useActionState,useState} from "react";
import {generateHouseholdLink} from "./invitation-actions";
import {markShared,prepareShare,type SharingState} from "./sharing-actions";

function PreparedMessage({state,householdId,preferredMethod}:{state:SharingState;householdId:string;preferredMethod:string}) {
 const [copied,setCopied]=useState('');const [copyError,setCopyError]=useState(false);
 const [record,recordAction,pending]=useActionState(markShared,{});
 async function copy(value:string){try{await navigator.clipboard.writeText(value);setCopied(value);setCopyError(false);}catch{setCopyError(true);}}
 if(!state.path||!state.message||!state.url)return null;
 return <div className="generated-link">
  {state.local?<p className="notice">Local preview only. This link will not open on guests’ devices. Set SITE_URL to your live wedding website before sharing.</p>:<p>Copy this message and send it in the household’s Messenger conversation. Check that you have the intended family before pasting.</p>}
  <p>Message language: {state.language==='ne'?'नेपाली':'English'}</p><label>{state.local?'Preview invitation message':'Invitation message'}<textarea className="share-message" value={state.message} readOnly rows={12} onFocus={event=>event.target.select()}/></label>
  <div className="admin-links"><button type="button" onClick={()=>copy(state.message!)}>{copied===state.message?'Message copied':state.local?'Copy preview message':'Copy invitation message'}</button><button type="button" onClick={()=>copy(state.url!)}>{copied===state.url?'Link copied':'Copy link'}</button><a href={state.path} target="_blank" rel="noopener noreferrer">Preview invitation here</a></div>
  {copyError&&<p role="status">Select the message above, then copy it manually.</p>}
  {!state.local&&<form className="share-record" action={recordAction}><input type="hidden" name="household" value={householdId}/><input type="hidden" name="hash" value={state.tokenHash}/><input type="hidden" name="language" value={state.language}/><label>How did you share it?<select name="channel" defaultValue={['messenger','sms','email'].includes(preferredMethod)?preferredMethod:'messenger'}><option value="messenger">Messenger</option><option value="sms">SMS (sent personally)</option><option value="email">Email (sent personally)</option></select></label><label className="check-label"><input name="confirm" type="checkbox" required/>I already sent this invitation myself.</label><button disabled={pending}>{pending?'Recording…':'Mark as sent'}</button>{record.error&&<p role="alert">{record.error}</p>}{record.saved&&<p role="status">Sharing recorded. This records your action; it does not confirm delivery or that the invitation was read.</p>}</form>}
  <p>Anyone with this link can view and change the household’s RSVPs. Only invited events appear in this message; each guest’s exact invitations are shown inside.</p>
 </div>;
}
export default function InvitationLink({householdId,hasLink,preferredMethod}:{householdId:string;hasLink:boolean;preferredMethod:string}) {
 const [generated,generateAction,generating]=useActionState(generateHouseholdLink,{});
 const [prepared,prepareAction,preparing]=useActionState(prepareShare,{});
 // A newly generated link supersedes any previously prepared message.
 const [showPrepared,setShowPrepared]=useState(false);
 const state=showPrepared?prepared:generated;
 return <div className="household-invitation"><h3>Private invitation</h3>
 {(hasLink||generated.path)&&<form action={prepareAction} onSubmit={()=>setShowPrepared(true)}><input type="hidden" name="household" value={householdId}/><button disabled={preparing||generating}>{preparing?'Preparing…':'Prepare message with current link'}</button><p>Reuse the current invitation link without replacing it.</p></form>}
 <form action={generateAction} onSubmit={()=>setShowPrepared(false)}><input type="hidden" name="household" value={householdId}/>{(hasLink||generated.path)&&<label className="check-label"><input type="checkbox" name="confirm" required/>Replace the existing link. The old link will stop working.</label>}<button disabled={generating||preparing}>{generating?'Creating…':hasLink||generated.path?'Replace invitation link':'Create invitation link & message'}</button></form>
 {state.error&&<p role="alert">{state.error}</p>}
 {!generating&&!preparing&&<PreparedMessage key={state.tokenHash||'empty'} state={state} householdId={householdId} preferredMethod={preferredMethod}/>}
 </div>;
}
