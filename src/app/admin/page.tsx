"use client";
import { useState, useEffect } from "react";
import { LocalProvider } from "@/components/local-provider";
import SaaSAdmin from "@/components/console/saas-admin";
import RapidSalesLogo from "@/components/console/rapid-logo";
import { ShieldCheck, ArrowLeft, ExternalLink, LogOut } from "lucide-react";
import "@/app/dashboard/console.css";

export default function AdminPage() {
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  return (
    <LocalProvider>
      <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a" }}>
        {/* Top Super Admin Navbar */}
        <header
          style={{
            background: "#0f172a",
            color: "#fff",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #1e293b",
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a
              href="/dashboard#overview"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "#94a3b8",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.06)",
              }}
              title="Return to client workspace view"
            >
              <ArrowLeft size={14} />
              <span>Client Dashboard</span>
            </a>

            <div style={{ width: 1, height: 20, background: "#334155" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <RapidSalesLogo size={22} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: "#fff", letterSpacing: "-0.3px" }}>
                  Scalezix Super Admin
                </span>
                <span
                  style={{
                    background: "rgba(79, 70, 229, 0.3)",
                    border: "1px solid #6366f1",
                    color: "#a5b4fc",
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  FOUNDER PORTAL
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Utkarsh Makwana</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Platform Owner · um18218@gmail.com</div>
            </div>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "#4f46e5",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              UM
            </div>
          </div>
        </header>

        {/* Admin Content Area */}
        <main style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px" }}>
          <SaaSAdmin notify={showToast} />
        </main>

        {/* Toast Notification */}
        {toast && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              background: "#0f172a",
              color: "#fff",
              padding: "12px 20px",
              borderRadius: 8,
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              fontWeight: 500,
              zIndex: 100,
              border: "1px solid #334155",
            }}
          >
            <ShieldCheck size={18} style={{ color: "#34d399" }} />
            <span>{toast}</span>
          </div>
        )}
      </div>
    </LocalProvider>
  );
}

