"use client";
import {useEffect} from "react";
import type {Locale} from "@/lib/i18n";
export default function LanguageToggle({language,path='/'}:{language:Locale;path?:string}) {
 useEffect(()=>{document.documentElement.lang=language;},[language]);
 return <div className="language-toggle" role="group" aria-label={language==='ne'?'भाषा छान्नुहोस्':'Choose language'}>{(['en','ne'] as const).map(locale=><a key={locale} lang={locale} href={`/language?lang=${locale}&returnTo=${encodeURIComponent(path)}`} aria-current={language===locale?'true':undefined}>{locale==='en'?'English':'नेपाली'}</a>)}</div>;
}
