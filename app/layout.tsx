import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Entry / 26 | Event Pass Registration",
  description: "Register for your event entry pass.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
