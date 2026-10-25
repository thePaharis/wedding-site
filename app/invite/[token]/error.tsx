"use client";
export default function InvitationError({reset}:{reset:()=>void}) {
 return <main style={{maxWidth:640,margin:"80px auto",padding:24}}><h1>We couldn’t load your invitation.</h1><p>Please try again in a moment, or contact Nischal or Bhumika.</p><button onClick={reset} style={{padding:"12px 20px",border:"1px solid",cursor:"pointer"}}>Try again</button></main>;
}
