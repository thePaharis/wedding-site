import {text,timeLabel,type Locale} from './i18n.ts';
export const weddingEvents=[
 {id:'kasar',name:'Kasar',name_ne:'कसार',date:'2027-02-01',note:'Morning',note_ne:'बिहान'},
 {id:'mehendi',name:'Mehendi',name_ne:'मेहन्दी',date:'2027-02-01'},
 {id:'vajan',name:'Vajan',name_ne:'भजन',date:'2027-02-02'},
 {id:'wedding',name:'Wedding',name_ne:'विवाह',date:'2027-02-03'},
 {id:'reception',name:'Reception',name_ne:'स्वागत समारोह',date:'2027-02-05'},
 {id:'helping',name:'Helping the Less Fortunate',name_ne:'सहयोग कार्यक्रम',date:'2027-02-06'},
];
export async function getWeddingEvents(language:Locale='en') {
 if(!process.env.DATABASE_URL)return weddingEvents.map(e=>({id:e.id,name:language==='ne'?e.name_ne:e.name,date:e.date,timeLabel:timeLabel(null,null,language==='ne'?e.note_ne||null:e.note||null,language),venue:null as string|null,address:null as string|null,description:null as string|null,dressCode:null as string|null,instructions:null as string|null,translationMissing:false}));
 const {db}=await import('./db');
 const {rows}=await db().query("SELECT *,to_char(event_date,'YYYY-MM-DD') date_text,to_char(start_time,'HH24:MI') start_text,to_char(end_time,'HH24:MI') end_text FROM events WHERE archived_at IS NULL ORDER BY event_date,CASE slug WHEN 'kasar' THEN 0 WHEN 'mehendi' THEN 1 ELSE 2 END,name");
 return rows.map(row=>({id:row.slug as string,name:(language==='ne'?row.name_ne||row.name:row.name) as string,date:row.date_text as string,timeLabel:timeLabel(row.start_text,row.end_text,language==='ne'?row.time_note_ne:row.time_note,language)+(row.start_text?` · ${text(language).nepalTime}`:''),venue:(language==='ne'?row.venue_ne||row.venue:row.venue) as string|null,address:(language==='ne'?row.address_ne||row.address:row.address) as string|null,description:(language==='ne'?row.description_ne:row.description) as string|null,dressCode:(language==='ne'?row.dress_code_ne:row.dress_code) as string|null,instructions:(language==='ne'?row.instructions_ne:row.instructions) as string|null,translationMissing:language==='ne'&&['description','dress_code','instructions'].some(key=>row[key]&&!row[`${key}_ne`])}));
}
