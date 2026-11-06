"use client";
import { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  LayoutDashboard,
  Users,
  Megaphone,
  Phone,
  MessageSquare,
  Mail,
  CheckCircle,
  FileText,
  BarChart3,
  Settings,
  Key,
  Wallet,
  Sparkles,
  ArrowRight,
  GitBranch,
  Calendar,
  Link,
} from "lucide-react";

interface PaletteItem {
  id: string;
  title: string;
  category: string;
  icon: typeof Search;
  shortcut?: string;
  description?: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { id: "overview", title: "Dashboard", category: "Core", icon: LayoutDashboard, description: "Your outreach at a glance" },
  { id: "contacts", title: "Contacts & Audience", category: "Audience", icon: Users, description: "Manage customer directory and tags" },
  { id: "segments", title: "Saved Segments", category: "Audience", icon: Users, description: "Targeted audience segments" },
  { id: "campaigns", title: "Campaigns", category: "Audience", icon: Megaphone, description: "Create and manage outreach blasts" },
  { id: "wa-broadcast", title: "WhatsApp Broadcast", category: "WhatsApp", icon: MessageSquare, description: "Send bulk WhatsApp notifications" },
  { id: "wa-templates", title: "WhatsApp Templates", category: "WhatsApp", icon: MessageSquare, description: "Manage official Meta templates" },
  { id: "wa-onboarding", title: "Connect WhatsApp API", category: "WhatsApp", icon: MessageSquare, description: "Meta Cloud API configuration" },
  { id: "wa-inbox", title: "WhatsApp Inbox", category: "WhatsApp", icon: MessageSquare, description: "Chat with leads in real-time" },
  { id: "voice-overview", title: "AI Calling Dashboard", category: "AI Calling", icon: Phone, description: "Speech metrics and telephony" },
  { id: "agents", title: "Voice Agent Builder", category: "AI Calling", icon: Phone, description: "Prompt scripts & conversational flows" },
  { id: "call-center", title: "Call Center & Simulator", category: "AI Calling", icon: Phone, description: "Live call simulations & outbound dialer" },
  { id: "call-logs", title: "Call Logs & Transcripts", category: "AI Calling", icon: Phone, description: "Full call audio logs and recordings" },
  { id: "email-overview", title: "Email Dashboard", category: "Email", icon: Mail, description: "Outreach performance & bounce rates" },
  { id: "email-setup", title: "Mailbox Setup (Gmail/Zoho)", category: "Email", icon: Mail, description: "Configure SMTP, Gmail, or Zoho" },
  { id: "email-templates", title: "Email Templates", category: "Email", icon: Mail, description: "Personalized cold email templates" },
  { id: "sequences", title: "Outreach Sequences", category: "Automation", icon: GitBranch, description: "Tri-channel automated workflows" },
  { id: "bots", title: "Chatbot Flow Builder", category: "Automation", icon: Sparkles, description: "Automated WhatsApp conversation trees" },
  { id: "qualified", title: "Qualified Leads", category: "Leads", icon: CheckCircle, description: "High-intent prospects ready for closing" },
  { id: "automation", title: "Automation Reports", category: "Reports", icon: FileText, description: "Execution history and trigger logs" },
  { id: "analytics", title: "Analytics & ROI", category: "Reports", icon: BarChart3, description: "Conversion funnels & response rates" },
  { id: "settings", title: "Workspace Configuration", category: "Setup", icon: Settings, description: "Company profile, timezone & preferences" },
  { id: "integrations", title: "API Keys & Integrations", category: "Setup", icon: Key, description: "Manage API credentials and webhooks" },
  { id: "billing", title: "Billing & Credits", category: "Setup", icon: Wallet, description: "Plans, invoices and credit balance" },
  { id: "availability", title: "Meeting Availability", category: "Tools", icon: Calendar, description: "Google Calendar & appointment booking" },
  { id: "links", title: "WhatsApp Click-to-Chat Links", category: "Tools", icon: Link, description: "Generate QR codes and chat links" },
];

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = PALETTE_ITEMS.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      onNavigate(filtered[selectedIndex].id);
      onClose();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose} role="presentation">
      <div
        className="command-palette-modal"
        role="dialog"
        aria-label="Find a page or action"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="command-palette-search-box">
          <Search size={18} className="command-palette-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Search pages, channels, actions, settings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-autocomplete="list"
          />
          {query && (
            <button
              className="command-palette-clear"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <kbd className="command-palette-esc">ESC</kbd>
        </div>

        <div className="command-palette-results" role="listbox">
          {filtered.length === 0 ? (
            <div className="command-palette-empty">
              <Search size={24} className="text-slate-400 mb-2" />
              <p>No results found for &ldquo;{query}&rdquo;</p>
              <small>Try searching for WhatsApp, AI Calling, Contacts, or Billing</small>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  className={`command-palette-item ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    onNavigate(item.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="command-palette-item-icon">
                    <Icon size={16} />
                  </div>
                  <div className="command-palette-item-content">
                    <div className="command-palette-item-title">
                      <strong>{item.title}</strong>
                      <span className="command-palette-item-cat">{item.category}</span>
                    </div>
                    {item.description && (
                      <p className="command-palette-item-desc">{item.description}</p>
                    )}
                  </div>
                  <ArrowRight size={14} className="command-palette-item-arrow" />
                </div>
              );
            })
          )}
        </div>

        <footer className="command-palette-footer">
          <div className="command-palette-shortcuts">
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> select</span>
            <span><kbd>esc</kbd> close</span>
          </div>
          <span className="command-palette-brand">Sprint</span>
        </footer>
      </div>
    </div>
  );
}

