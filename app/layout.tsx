import type { Metadata } from "next";
import "./globals.css";
import {cookies} from "next/headers";
import {resolveLocale} from "@/lib/i18n";

export const metadata: Metadata = {
  metadataBase: new URL("https://nischalandbhumika.com"),
  title: "Nischal & Bhumika | February 2027",
  description: "Celebrate Nischal and Bhumika’s wedding, February 1–6, 2027. Wedding week details and personalized invitations.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const language=resolveLocale((await cookies()).get("wedding_language")?.value);
  return <html lang={language}><body>{children}</body></html>;
}
