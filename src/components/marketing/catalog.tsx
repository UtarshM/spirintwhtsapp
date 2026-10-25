"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
import { features, articles, helpArticles } from "@/lib/marketing/content";
import { FeatureCards } from "./blocks";
export function FeatureCatalog() {
  const [filter, setFilter] = useState("All capabilities");
  const values = ["All capabilities", "Channels", "Workspace & insights"];
  return (
    <>
      <div className="site-feature-filter">
        {values.map((v) => (
          <button
            key={v}
            aria-pressed={v === filter}
            onClick={() => setFilter(v)}
          >
            {v}
          </button>
        ))}
      </div>
      <FeatureCards
        items={
          filter === "Channels"
            ? features.slice(0, 3)
            : filter === "Workspace & insights"
              ? features.slice(3)
              : features
        }
      />
    </>
  );
}
export function ResourceCatalog({ help = false }: { help?: boolean }) {
  const [search, setSearch] = useState("");
  const items = help ? helpArticles : articles;
  const filtered = items.filter((a) =>
    (a.title + " " + ("summary" in a ? a.summary : a.description))
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="site-filter-search">
        <Search size={16} />
        <input
          aria-label={help ? "Search guides" : "Search articles"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            help
              ? "What would you like to understand?"
              : "Find a guide or idea…"
          }
        />
      </div>
      <div className="site-card-grid">
        {filtered.map((a) => (
          <Link
            className="site-editorial-card"
            href={(help ? "/help/" : "/blog/") + a.slug}
            key={a.slug}
          >
            <span>
              {"category" in a ? a.category : "GETTING TO KNOW SPRINT"}
            </span>
            <h2>{a.title}</h2>
            <p>{"summary" in a ? a.summary : a.description}</p>
            <span className="site-text-link">
              {"minutes" in a ? `${a.minutes} min read` : "Read the guide"}{" "}
              <ArrowUpRight size={14} />
            </span>
          </Link>
        ))}
      </div>
      {!filtered.length && (
        <div className="site-empty-state">
          <h3>No matches just yet.</h3>
          <p>Try a different word or browse the full collection.</p>
          <button
            className="site-text-link"
            style={{ marginTop: 20 }}
            onClick={() => setSearch("")}
          >
            Clear search <ArrowUpRight size={14} />
          </button>
        </div>
      )}
    </>
  );
}
