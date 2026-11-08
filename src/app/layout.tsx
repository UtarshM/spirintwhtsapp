import type { Metadata } from "next";
import { getMetadataBaseUrl } from "@/lib/app-url";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: getMetadataBaseUrl(),
  title: "Leadpilot — Your next conversation, connected.",
  description: "WhatsApp, email and AI calling. One autonomous workspace, by Leadpilot.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
