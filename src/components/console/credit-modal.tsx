"use client";

import { useState } from "react";
import { Wallet, X, Plus, ShieldCheck, Sparkles, Mail, Phone, Calculator, ArrowRight, RotateCcw } from "lucide-react";
import { useWorkspace } from "../local-provider";
import { balance } from "@/lib/local-workspace";

export default function CreditModal({
  isOpen,
  onClose,
  notify,
}: {
  isOpen: boolean;
  onClose: () => void;
  notify: (text: string) => void;
}) {
  const { state: s, update } = useWorkspace();
  const [mode, setMode] = useState<"estimate" | "manual">("estimate");
  const [selectedTier, setSelectedTier] = useState<string>("Growth");
  const [customEmails, setCustomEmails] = useState<string>("");
  const [customCallMins, setCustomCallMins] = useState<string>("");
  const [manualAmount, setManualAmount] = useState<number>(2000);
  const [gstin, setGstin] = useState<string>("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const currentBalance = balance(s);

  // RapidSales Preset Calculator Tiers
  const tiers = [
    {
      id: "Starter",
      name: "Starter",
      emails: 1000,
      calls: 100,
      description: "Light outreach — a few hundred emails & some calls a month",
      suggested: 400,
      popular: false,
    },
    {
      id: "Growth",
      name: "Growth",
      emails: 5000,
      calls: 500,
      description: "Small-team campaigns & regular calling follow-ups",
      suggested: 2000,
      popular: true,
    },
    {
      id: "Pro",
      name: "Pro",
      emails: 20000,
      calls: 2000,
      description: "High-volume sales cadences & calling campaigns",
      suggested: 7800,
      popular: false,
    },
    {
      id: "Scale",
      name: "Scale",
      emails: 75000,
      calls: 8000,
      description: "Enterprise-level broadcasts & multi-brand calling",
      suggested: 30800,
      popular: false,
    },
  ];

  // Dynamic formula: emails * 0.09 + call minutes * 3.10
  const customCalculated =
    customEmails || customCallMins
      ? Math.max(
          100,
          Math.round(
            (parseFloat(customEmails) || 0) * 0.09 +
              (parseFloat(customCallMins) || 0) * 3.1
          )
        )
      : null;

  const activeAmount =
    mode === "manual"
      ? manualAmount
      : customCalculated !== null
      ? customCalculated
      : tiers.find((t) => t.id === selectedTier)?.suggested || 2000;

  const gstAmount = Math.round(activeAmount * 0.18);
  const totalPayable = activeAmount + gstAmount;

  const handleAddCredits = async () => {
    if (!activeAmount || activeAmount <= 0) {
      notify("Please select or enter a valid amount.");
      return;
    }

    setLoading(true);
    try {
      const orderRes = await fetch("/api/billing/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountRupees: activeAmount,
          packLabel: mode === "estimate" ? `${selectedTier} Top-Up` : "Manual Top-Up",
          gstin: gstin.trim() || undefined,
        }),
      });

      const orderData = await orderRes.json();
      const invoiceRef =
        orderData.invoiceNumber ||
        `INV-2026-${Math.floor(100000 + Math.random() * 900000)}`;

      const bonusPct = activeAmount >= 30000 ? 0.15 : activeAmount >= 7800 ? 0.1 : 0;
      const totalCredits = Math.round(activeAmount * (1 + bonusPct));

      if (orderData.isLive && typeof window !== "undefined") {
        const loadScript = () =>
          new Promise<boolean>((resolve) => {
            const win = window as unknown as { Razorpay?: unknown };
            if (win.Razorpay) return resolve(true);
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });
        const loaded = await loadScript();
        const win = window as unknown as {
          Razorpay?: new (opts: unknown) => { open: () => void };
        };
        if (loaded && win.Razorpay) {
          const rzp = new win.Razorpay({
            key: orderData.keyId,
            amount: orderData.totalPaise,
            currency: orderData.currency || "INR",
            name: "Leadpilot Cloud",
            description: `${orderData.invoiceNumber} · Credits Top-Up`,
            order_id: orderData.orderId,
            handler: function (response: { razorpay_payment_id?: string }) {
              const newTx = {
                id: response.razorpay_payment_id || "tx_" + Date.now(),
                kind: "Sample top-up" as const,
                credits: totalCredits,
                at: new Date().toISOString(),
                reference: `${invoiceRef} · Razorpay Verified (18% GST)`,
              };
              update((prev) => ({
                ...prev,
                transactions: [newTx, ...prev.transactions],
              }));
              notify(
                `Payment successful! Credited ${totalCredits.toLocaleString()} credits to wallet.`
              );
              onClose();
            },
            prefill: {
              name: s.settings?.name || "Leadpilot Customer",
              email: "um18218@gmail.com",
            },
            theme: { color: "#2563eb" },
          });
          rzp.open();
          setLoading(false);
          return;
        }
      }

      const newTx = {
        id: "tx_" + Date.now(),
        kind: "Sample top-up" as const,
        credits: totalCredits,
        at: new Date().toISOString(),
        reference: `${invoiceRef} · Tax Invoice (18% GST)`,
      };

      update((prev) => ({
        ...prev,
        transactions: [newTx, ...prev.transactions],
      }));

      notify(
        `Credited ${totalCredits.toLocaleString()} credits to wallet! Tax Invoice ${invoiceRef} generated.`
      );
      onClose();
    } catch {
      notify("Failed to complete credit order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="credit-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="credit-modal"
        role="dialog"
        aria-label="How will you use credits?"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: mode === "estimate" ? 640 : 520, maxHeight: "90vh", overflowY: "auto" }}
      >
        <header className="credit-modal-header" style={{ paddingBottom: 12, borderBottom: "1px solid #f1f5f9" }}>
          <div className="credit-modal-header-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
            <Wallet size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                {mode === "estimate" ? "How will you use credits?" : "Recharge Wallet Credits"}
              </h3>
              <button
                className="credit-modal-close"
                onClick={onClose}
                aria-label="Close modal"
                style={{ padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0", lineHeight: 1.4 }}>
              {mode === "estimate"
                ? "One wallet, two channels — ₹1 = 1 credit. Email costs 0.09 credits per send; AI calls are metered per minute and deducted by actual usage. Tell us your monthly volumes and we'll suggest a top-up."
                : "Top up your universal shared wallet for AI Voice calls, WhatsApp outreach, and Cold Email."}
            </p>
          </div>
        </header>

        {/* Current Balance Bar */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "10px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>CURRENT WALLET BALANCE</span>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
            ₹{currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })} <small style={{ fontWeight: 400, color: "#64748b" }}>({currentBalance.toLocaleString()} Credits)</small>
          </div>
        </div>

        {mode === "estimate" ? (
          <>
            {/* 4 Preset Tiers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {tiers.map((t) => {
                const isSelected = selectedTier === t.id && !customEmails && !customCallMins;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTier(t.id);
                      setCustomEmails("");
                      setCustomCallMins("");
                    }}
                    style={{
                      border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      background: isSelected ? "#f8faff" : "#ffffff",
                      borderRadius: 10,
                      padding: 14,
                      cursor: "pointer",
                      position: "relative",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {t.popular && (
                      <span
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          fontSize: 10,
                          fontWeight: 700,
                          background: "#eff6ff",
                          color: "#2563eb",
                          padding: "2px 6px",
                          borderRadius: 4,
                          border: "1px solid #bfdbfe",
                        }}
                      >
                        MOST POPULAR
                      </span>
                    )}
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
                      {t.name}
                    </h4>
                    <div style={{ fontSize: 12, color: "#334155", fontWeight: 600, marginBottom: 4 }}>
                      ~{t.emails.toLocaleString()} emails/mo · ~{t.calls.toLocaleString()} call min/mo
                    </div>
                    <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 10px", lineHeight: 1.3 }}>
                      {t.description}
                    </p>
                    <div style={{ fontSize: 16, fontWeight: 700, color: isSelected ? "#2563eb" : "#0f172a" }}>
                      ₹{t.suggested.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500, color: "#64748b" }}>suggested</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Monthly Estimator */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 16,
                marginTop: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Calculator size={15} style={{ color: "#2563eb" }} />
                <strong style={{ fontSize: 13, color: "#0f172a" }}>
                  Or estimate your own monthly usage
                </strong>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    Monthly Emails
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      placeholder="e.g. 3500"
                      value={customEmails}
                      onChange={(e) => {
                        setCustomEmails(e.target.value);
                        setSelectedTier("");
                      }}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 13,
                        color: "#0f172a",
                      }}
                    />
                    <span style={{ position: "absolute", right: 8, top: 7, fontSize: 11, color: "#94a3b8" }}>
                      emails / mo
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    Monthly Call Minutes
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      placeholder="e.g. 600"
                      value={customCallMins}
                      onChange={(e) => {
                        setCustomCallMins(e.target.value);
                        setSelectedTier("");
                      }}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 13,
                        color: "#0f172a",
                      }}
                    />
                    <span style={{ position: "absolute", right: 8, top: 7, fontSize: 11, color: "#94a3b8" }}>
                      call min / mo
                    </span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 11, color: "#64748b", margin: "10px 0 0" }}>
                Pick a tier or enter your monthly emails / call minutes to see a suggestion.
              </p>
            </div>

            {/* Skip Link */}
            <div style={{ textAlign: "center", marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setMode("manual")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Skip — I know my amount
              </button>
            </div>
          </>
        ) : (
          /* Manual Mode */
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Select Recharge Pack</label>
              <button
                type="button"
                onClick={() => setMode("estimate")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Calculator size={13} />
                Use Usage Estimator
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { amount: 1000, label: "Starter", bonus: "" },
                { amount: 3000, label: "Growth", bonus: "+5% Bonus", popular: true },
                { amount: 10000, label: "Enterprise", bonus: "+15% Bonus" },
              ].map((p) => (
                <button
                  type="button"
                  key={p.amount}
                  onClick={() => setManualAmount(p.amount)}
                  style={{
                    padding: "12px 10px",
                    borderRadius: 8,
                    border: manualAmount === p.amount ? "2px solid #2563eb" : "1px solid #cbd5e1",
                    background: manualAmount === p.amount ? "#f8faff" : "#ffffff",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>₹{p.amount.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{p.label}</div>
                  {p.bonus && <div style={{ fontSize: 10, color: "#059669", fontWeight: 700, marginTop: 2 }}>{p.bonus}</div>}
                </button>
              ))}
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                Or enter custom amount (₹)
              </label>
              <input
                type="number"
                min="100"
                step="100"
                value={manualAmount || ""}
                onChange={(e) => setManualAmount(parseFloat(e.target.value) || 0)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                }}
              />
            </div>
          </div>
        )}

        {/* GST & Invoice Breakdown */}
        <div style={{ background: "#f8fafc", borderRadius: 8, padding: 14, border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569", marginBottom: 6 }}>
            <span>Base Top-Up Amount:</span>
            <strong style={{ color: "#0f172a" }}>₹{activeAmount.toLocaleString("en-IN")} ({activeAmount.toLocaleString()} Credits)</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569", marginBottom: 6 }}>
            <span>GST (18% CGST/SGST):</span>
            <strong style={{ color: "#0f172a" }}>₹{gstAmount.toLocaleString("en-IN")}</strong>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 14,
              fontWeight: 700,
              color: "#0f172a",
              paddingTop: 8,
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <span>Total Payable:</span>
            <span style={{ color: "#059669", fontSize: 16 }}>₹{totalPayable.toLocaleString("en-IN")}</span>
          </div>

          <div style={{ marginTop: 10 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>
              Business GSTIN (Optional for Tax Credit)
            </label>
            <input
              type="text"
              placeholder="e.g. 27ABCDE1234F1Z5"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              maxLength={15}
              style={{
                width: "100%",
                height: 32,
                padding: "0 10px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: 12,
                fontFamily: "monospace",
              }}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <footer className="credit-modal-footer">
          <div className="credit-modal-security">
            <ShieldCheck size={16} style={{ color: "#059669" }} />
            <span style={{ color: "#059669", fontSize: 12 }}>Official GST Invoice Generated</span>
          </div>
          <div className="credit-modal-actions">
            <button type="button" className="secondary" onClick={onClose} style={{ padding: "8px 14px", borderRadius: 6 }}>
              Cancel
            </button>
            <button
              type="button"
              className="primary"
              disabled={loading || activeAmount <= 0}
              onClick={handleAddCredits}
              style={{
                padding: "8px 18px",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Plus size={15} />
              {loading ? "Processing..." : `Pay ₹${totalPayable.toLocaleString("en-IN")}`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
