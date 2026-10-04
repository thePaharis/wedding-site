import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nischalandbhumika.com"),
  title: "Nischal & Bhumika | February 2027",
  description: "Celebrate Nischal and Bhumika’s wedding, February 1–6, 2027. Wedding week details and personalized invitations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
