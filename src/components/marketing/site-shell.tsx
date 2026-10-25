"use client";
import SalesMark from '@/components/sales-mark';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  AudioLines,
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  Menu,
  X,
  MessageCircle,
  Mail,
  Phone,
  GitBranch,
  Users,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { features, solutions } from "@/lib/marketing/content";
export function ProductIcon({
  kind,
  size = 22,
}: {
  kind: string;
  size?: number;
}) {
  const Icon =
    kind === "whatsapp"
      ? MessageCircle
      : kind === "email"
        ? Mail
        : kind === "voice"
          ? Phone
          : kind === "sequence"
            ? GitBranch
            : kind === "crm" || kind === "segments"
              ? Users
              : kind === "analytics"
                ? BarChart3
                : MessageCircle;
  return <Icon size={size} strokeWidth={1.6} />;
}
export function Logo() {
  return (
    <Link href="/" className="site-logo" aria-label="Sprint by Scalezix home">
      <span>
        <SalesMark size={25} />
      </span>
      <strong>
        sprint<span>.</span>
      </strong>
      <small>BY SCALEZIX</small>
    </Link>
  );
}
export default function SiteShell({ children }: { children: React.ReactNode }) {
  const [mobile, setMobile] = useState(false);
  const path = usePathname();
  useEffect(() => {
    setMobile(false);
    document
      .querySelectorAll(".site-header details[open]")
      .forEach((e) => e.removeAttribute("open"));
  }, [path]);
  useEffect(() => {
    function close(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobile(false);
        document
          .querySelectorAll(".site-header details[open]")
          .forEach((d) => d.removeAttribute("open"));
      }
    }
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);
  return (
    <div className="site-wrapper">
      <a className="site-skip" href="#main-content">
        Skip to content
      </a>
      <div className="site-announcement">
        <span>BUILDING BETTER CONVERSATIONS</span>
        <span>Meet Sprint, a new sales workspace by Scalezix.</span>
        <Link href="/roadmap">
          See what’s coming <ArrowRight size={12} />
        </Link>
      </div>
      <header className="site-header">
        <div className="site-header-inner">
          <Logo />
          <button
            className="site-menu-button"
            aria-label={mobile ? "Close navigation" : "Open navigation"}
            aria-expanded={mobile}
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X /> : <Menu />}
          </button>
          <nav
            className={mobile ? "site-nav is-open" : "site-nav"}
            aria-label="Main navigation"
          >
            <details className="site-dropdown">
              <summary>
                Product <ChevronDown size={12} />
              </summary>
              <div className="site-dropdown-panel">
                <div>
                  <span className="site-overline">ONE CONNECTED WORKSPACE</span>
                  {features.slice(0, 4).map((f) => (
                    <Link
                      key={f.slug}
                      href={"/features/" + f.slug}
                      onClick={() => setMobile(false)}
                    >
                      <span className={"site-icon " + f.icon}>
                        <ProductIcon kind={f.icon} size={18} />
                      </span>
                      <span>
                        {f.label}
                        <small>{f.eyebrow.toLowerCase()}</small>
                      </span>
                    </Link>
                  ))}
                </div>
                <div>
                  <span className="site-overline">THE BIGGER PICTURE</span>
                  {features.slice(4).map((f) => (
                    <Link
                      key={f.slug}
                      href={"/features/" + f.slug}
                      onClick={() => setMobile(false)}
                    >
                      <ProductIcon kind={f.icon} size={17} />
                      {f.label}
                    </Link>
                  ))}
                  <Link href="/features" onClick={() => setMobile(false)}>
                    Explore all features <ArrowUpRight size={15} />
                  </Link>
                  <Link href="/integrations" onClick={() => setMobile(false)}>
                    Integrations <ArrowUpRight size={15} />
                  </Link>
                </div>
              </div>
            </details>
            <details className="site-dropdown">
              <summary>
                Solutions <ChevronDown size={12} />
              </summary>
              <div className="site-dropdown-panel solution-menu">
                {solutions.map((s) => (
                  <Link
                    key={s.slug}
                    href={"/solutions/" + s.slug}
                    onClick={() => setMobile(false)}
                  >
                    {s.label}
                    <ArrowUpRight size={14} />
                  </Link>
                ))}
              </div>
            </details>
            <Link
              aria-current={path === "/pricing" ? "page" : undefined}
              href="/pricing"
              onClick={() => setMobile(false)}
            >
              Pricing
            </Link>
            <details className="site-dropdown">
              <summary>
                Resources <ChevronDown size={12} />
              </summary>
              <div className="site-dropdown-panel resource-menu">
                {[
                  ["Blog", "/blog"],
                  ["Guides & help", "/help"],
                  ["Compare approaches", "/compare"],
                  ["Security", "/security"],
                  ["Roadmap", "/roadmap"],
                  ["About Scalezix & Sprint", "/about"],
                ].map(([n, h]) => (
                  <Link key={h} href={h} onClick={() => setMobile(false)}>
                    {n}
                    <ArrowUpRight size={13} />
                  </Link>
                ))}
              </div>
            </details>
            <Link
              className="site-mobile-login"
              href="/login"
              onClick={() => setMobile(false)}
            >
              Sign in <ArrowUpRight size={13} />
            </Link>
          </nav>
          <div className="site-nav-actions">
            <Link href="/login" className="site-login">
              Sign in <ArrowUpRight size={12} />
            </Link>
            <Link href="/contact" className="site-button compact">
              Let’s talk <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </header>
      <main id="main-content" className="site-main">
        {children}
      </main>
      <footer className="site-footer">
        <div className="site-footer-top">
          <div>
            <Logo />
            <p>
              Good conversations.
              <br />
              Stronger connections.
            </p>
            <span className="site-prelaunch">
              <span />
              Product in development
            </span>
          </div>
          {[
            {
              title: "PRODUCT",
              links: [
                ["WhatsApp", "/features/whatsapp-automation"],
                ["Email outreach", "/features/email-outreach"],
                ["AI calling", "/features/ai-calling"],
                ["Sales sequences", "/features/sales-sequences"],
                ["Lead management", "/features/lead-management"],
                ["Pricing", "/pricing"],
              ],
            },
            {
              title: "EXPLORE",
              links: [
                ["Integrations", "/integrations"],
                ["Solutions", "/solutions"],
                ["Product preview", "/dashboard"],
                ["Blog", "/blog"],
                ["Guides & help", "/help"],
                ["Comparisons", "/compare"],
              ],
            },
            {
              title: "SCALEZIX",
              links: [
                ["About Sprint", "/about"],
                ["WhatsApp verification", "/whatsapp-verification"],
                ["Partners", "/partners"],
                ["Careers", "/careers"],
                ["Contact", "/contact"],
                ["Book a walkthrough", "/book-a-demo"],
                ["Security approach", "/security"],
                ["Roadmap", "/roadmap"],
                ["Use-case walkthroughs", "/case-studies"],
              ],
            },
          ].map((col) => (
            <div className="site-footer-col" key={col.title}>
              <h3>{col.title}</h3>
              {col.links.map(([label, href]) => (
                <Link key={href} href={href}>
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="site-footer-bottom">
          <span>© {new Date().getFullYear()} Sprint by Scalezix.</span>
          <div>
            <Link href="/privacy-policy">Privacy draft</Link>
            <Link href="/terms-and-conditions">Terms draft</Link>
            <Link href="/refund-policy">Refund policy draft</Link>
          </div>
          <span>
            Made for thoughtful growth <ArrowUpRight size={12} />
          </span>
        </div>
      </footer>
    </div>
  );
}
