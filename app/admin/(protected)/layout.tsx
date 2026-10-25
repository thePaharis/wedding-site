import Link from "next/link";
import {requireAdmin} from "@/lib/auth";
import {logout} from "../actions";
import "../admin.css";
export const metadata={title:"Wedding admin | Nischal & Bhumika",robots:{index:false,follow:false}};
export default async function AdminLayout({children}:{children:React.ReactNode}){
 const admin=await requireAdmin();
 return <div className="admin"><header className="admin-header"><Link href="/admin">N & B · Wedding admin</Link><nav aria-label="Admin navigation"><Link href="/admin">Overview</Link><Link href="/admin/events">Events</Link><Link href="/admin/guests">Guests</Link><Link href="/admin/rsvps">RSVPs</Link><Link href="/">View website</Link></nav><form action={logout}><button className="secondary">Sign out</button></form></header><main className="admin-content">{children}</main><div className="admin-footer">Signed in as {admin.email} · All event times are local to Pokhara, Nepal.</div></div>;
}
