import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Garba Night | DJSCE Trinity · 9 October 2026",
  description: "Join DJSCE Trinity for Garba Night on 9 October 2026 at Mukesh Patel Hall (Underground). Entry ₹149. Register for your event code.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
