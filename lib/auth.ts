import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
const derive = promisify(scrypt);
const cookieName = "wedding_admin_session";
export const sessionHash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function requireAdmin() {
 const token=(await cookies()).get(cookieName)?.value;
 if (!token || !/^[a-f0-9]{64}$/.test(token)) redirect("/admin/login");
 const result=await db().query("SELECT u.id,u.email FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_id WHERE s.token_hash=$1 AND s.expires_at>now()",[sessionHash(token)]);
 if(!result.rowCount) redirect("/admin/login");
 return result.rows[0] as {id:string;email:string};
}
export async function verifyLogin(email: string,password:string) {
 const client=await db().connect();
 try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(2702028)");
  await client.query("DELETE FROM admin_login_attempts WHERE attempted_at < now()-interval '15 minutes'");
  const count=await client.query("SELECT count(*)::int AS total FROM admin_login_attempts");
  if(count.rows[0].total>=5){await client.query("COMMIT");return null;}
  await client.query("INSERT INTO admin_login_attempts DEFAULT VALUES");
  await client.query("COMMIT");
 } catch(e){await client.query("ROLLBACK");throw e;} finally{client.release();}
 const users=await db().query("SELECT id,password_hash FROM admin_users WHERE email=$1",[email]);
 const stored=users.rows[0]?.password_hash as string|undefined;
 const [,salt,hash]=(stored ?? `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`).split(":");
 const actual=await derive(password,salt,64) as Buffer;
 if(!stored || !timingSafeEqual(actual,Buffer.from(hash,"hex"))) return null;
 return users.rows[0].id as string;
}
export async function createSession(adminId:string) {
 const token=randomBytes(32).toString("hex");
 await db().query("DELETE FROM admin_sessions WHERE expires_at<=now()");
 await db().query("INSERT INTO admin_sessions(token_hash,admin_id,expires_at) VALUES ($1,$2,now()+interval '8 hours')",[sessionHash(token),adminId]);
 (await cookies()).set(cookieName,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:8*3600});
}
export async function endSession() {
 const store=await cookies();const token=store.get(cookieName)?.value;
 if(token) await db().query("DELETE FROM admin_sessions WHERE token_hash=$1",[sessionHash(token)]);
 store.delete(cookieName);
}
