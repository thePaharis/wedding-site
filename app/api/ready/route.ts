import {db} from '@/lib/db';
export const dynamic='force-dynamic';
export async function GET(){
 try{const result=await db().query("SELECT 1 FROM schema_migrations WHERE name=$1",['005_nepali_language.sql']);if(!result.rowCount)throw Error();return Response.json({status:'ready'},{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
