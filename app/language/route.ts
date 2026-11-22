import {NextRequest,NextResponse} from "next/server";
import {isLocale,languageDestination} from "@/lib/i18n";
export function GET(request:NextRequest){
 const language=request.nextUrl.searchParams.get('lang');if(!isLocale(language))return new NextResponse('Invalid language',{status:400});
 const path=languageDestination(request.nextUrl.searchParams.get('returnTo')||'/',language);
 const response=new NextResponse(null,{status:303,headers:{Location:path,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'}});
 response.cookies.set('wedding_language',language,{httpOnly:true,sameSite:'lax',secure:request.nextUrl.protocol==='https:',path:'/',maxAge:31536000});return response;
}
