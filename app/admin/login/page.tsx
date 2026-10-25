import { login } from "../actions";
import "../admin.css";
export const metadata={title:"Admin sign in | Nischal & Bhumika",robots:{index:false,follow:false}};
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
 const {error}=await searchParams;
 return <main className="admin login-page"><a href="/">Nischal & Bhumika</a><div className="admin-card"><p className="eyebrow">Wedding management</p><h1>Welcome back.</h1><p>Sign in to manage your events and guests.</p>{error&&<p role="alert" className="notice">{error==="credentials"?"Unable to sign in. Check your details. After five attempts, wait 15 minutes before trying again.":"Unable to connect. Check your database setup and try again."}</p>}<form action={login}><label>Email<input name="email" type="email" autoComplete="username" required maxLength={254}/></label><label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={256}/></label><button>Sign in</button></form></div></main>;
}
