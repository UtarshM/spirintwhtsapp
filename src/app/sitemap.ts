import type { MetadataRoute } from "next";
import {
  features,
  solutions,
  integrationsContent,
  articles,
  helpArticles,
} from "@/lib/marketing/content";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
  const paths = [
    "",
    "/features",
    "/solutions",
    "/integrations",
    "/pricing",
    "/whatsapp-verification",
    "/about",
    "/partners",
    "/careers",
    "/contact",
    "/book-a-demo",
    "/blog",
    "/help",
    "/security",
    "/roadmap",
    "/case-studies",
    "/compare",
    "/privacy-policy",
    "/terms-and-conditions",
    "/refund-policy",
    ...features.map((f) => "/features/" + f.slug),
    ...solutions.map((s) => "/solutions/" + s.slug),
    ...integrationsContent.map((i) => "/integrations/" + i.slug),
    ...articles.map((a) => "/blog/" + a.slug),
    ...helpArticles.map((a) => "/help/" + a.slug),
    ...["rapidsales", "retner", "connected-workspace"].map(
      (s) => "/compare/" + s,
    ),
  ];
  return paths.map((path) => ({
    url: base + path,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : path === "/pricing" ? 0.8 : 0.6,
  }));
}
