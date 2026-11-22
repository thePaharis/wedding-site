"use client";
import {useSearchParams} from 'next/navigation';
import {resolveLocale,text} from '@/lib/i18n';
export default function InvitationError({reset}:{reset:()=>void}) {
 const language=resolveLocale(useSearchParams().get('lang'),undefined,typeof document!=='undefined'?document.documentElement.lang:undefined);const t=text(language);
 return <main lang={language} style={{maxWidth:640,margin:'80px auto',padding:24}}><h1>{t.retry}</h1><p lang="ne">निमन्त्रणा खोल्न समस्या भए कृपया हामीलाई सम्पर्क गर्नुहोस्।</p><button onClick={reset} style={{padding:'12px 20px',border:'1px solid',cursor:'pointer'}}>{language==='ne'?t.tryAgain:'Try again / फेरि प्रयास गर्नुहोस्'}</button></main>;
}
