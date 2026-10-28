import type { Metadata } from "next";
import { getMetadataBaseUrl } from "@/lib/app-url";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: getMetadataBaseUrl(),
  title: "Sprint — Your next conversation, connected.",
  description: "WhatsApp, email and AI calling. One workspace, by Scalezix.",
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
