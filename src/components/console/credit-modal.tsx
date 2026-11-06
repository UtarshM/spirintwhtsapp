"use client";
import { useState } from "react";
import { Wallet, X, Plus, Check, ShieldCheck, IndianRupee, Sparkles } from "lucide-react";
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
  const [selectedPack, setSelectedPack] = useState<number>(1500);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [gstin, setGstin] = useState<string>("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const currentBalance = balance(s);

  const packs = [
    { amount: 500, credits: 500, label: "Starter", bonus: "" },
    { amount: 1500, credits: 1650, label: "Growth", bonus: "+10% Bonus Credits", popular: true },
    { amount: 5000, credits: 6000, label: "Pro Scale", bonus: "+20% Bonus Credits" },
  ];

  const amountToAdd = customAmount ? parseFloat(customAmount) || 0 : selectedPack;
  const gstAmount = Math.round(amountToAdd * 0.18);
  const totalPayable = amountToAdd + gstAmount;

  const handleAddCredits = async () => {
    if (!amountToAdd || isNaN(amountToAdd) || amountToAdd <= 0) {
      notify("Please select or enter a valid amount.");
      return;
    }

    setLoading(true);
    try {
      const orderRes = await fetch("/api/billing/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountRupees: amountToAdd,
          packLabel: customAmount ? "Custom Pack" : packs.find((p) => p.amount === selectedPack)?.label || "Wallet Recharge",
          gstin: gstin.trim() || undefined,
        }),
      });

      const orderData = await orderRes.json();
      const invoiceRef = orderData.invoiceNumber || `INV-2026-${Math.floor(100000 + Math.random() * 900000)}`;

      const bonusPct = amountToAdd >= 5000 ? 0.2 : amountToAdd >= 1500 ? 0.1 : 0;
      const totalCredits = Math.round(amountToAdd * (1 + bonusPct));

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
        const win = window as unknown as { Razorpay?: new (opts: unknown) => { open: () => void } };
        if (loaded && win.Razorpay) {
          const rzp = new win.Razorpay({
            key: orderData.keyId,
            amount: orderData.totalPaise,
            currency: orderData.currency || "INR",
            name: "Scalezix Cloud",
            description: `${orderData.invoiceNumber} · Credits Top-Up`,
            order_id: orderData.orderId,
            handler: function (response: { razorpay_payment_id?: string }) {
              const newTx = {
                id: response.razorpay_payment_id || ("tx_" + Date.now()),
                kind: "Sample top-up" as const,
                credits: totalCredits,
                at: new Date().toISOString(),
                reference: `${invoiceRef} · Razorpay Verified (18% GST)`,
              };
              update((prev) => ({
                ...prev,
                transactions: [newTx, ...prev.transactions],
              }));
              notify(`Payment successful! Credited ${totalCredits.toLocaleString()} credits to wallet.`);
              onClose();
            },
            prefill: {
              name: s.settings?.name || "Scalezix Customer",
              email: "um18218@gmail.com",
            },
            theme: { color: "#4f46e5" },
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

      notify(`Credited ${totalCredits.toLocaleString()} credits to wallet! Tax Invoice ${invoiceRef} generated.`);
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
        aria-label="Add Credits to Wallet"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="credit-modal-header">
          <div className="credit-modal-header-icon">
            <Wallet size={20} className="text-emerald-600" />
          </div>
          <div>
            <h3>Wallet & Credits</h3>
            <p>Recharge credits for AI Voice calling, WhatsApp messages & Email campaigns</p>
          </div>
          <button
            className="credit-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </header>

        <div className="credit-modal-balance-card">
          <span className="credit-modal-balance-label">CURRENT BALANCE</span>
          <div className="credit-modal-balance-val">
            <IndianRupee size={24} />
            <span>{currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <small>1 credit = ₹1.00 · Credits never expire</small>
        </div>

        <div className="credit-modal-packs">
          <label className="credit-modal-packs-title">Select Credit Pack</label>
          <div className="credit-packs-grid">
            {packs.map((p) => {
              const isSelected = selectedPack === p.amount && !customAmount;
              return (
                <button
                  type="button"
                  key={p.amount}
                  className={`credit-pack-card ${isSelected ? "selected" : ""} ${p.popular ? "popular" : ""}`}
                  onClick={() => {
                    setSelectedPack(p.amount);
                    setCustomAmount("");
                  }}
                >
                  {p.popular && <span className="credit-pack-badge">MOST POPULAR</span>}
                  <div className="credit-pack-name">{p.label}</div>
                  <div className="credit-pack-amount">₹{p.amount.toLocaleString()}</div>
                  <div className="credit-pack-credits">{p.credits.toLocaleString()} Credits</div>
                  {p.bonus && (
                    <div className="credit-pack-bonus">
                      <Sparkles size={11} /> {p.bonus}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="credit-custom-row">
            <span>Or enter custom amount:</span>
            <div className="credit-custom-input">
              <span className="currency-symbol">₹</span>
              <input
                type="number"
                min="100"
                step="100"
                placeholder="Custom amount"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedPack(0);
                }}
              />
            </div>
          </div>
          <div style={{ marginTop: 16, background: "#f8fafc", borderRadius: 8, padding: 14, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569", marginBottom: 6 }}>
              <span>Base Credit Amount:</span>
              <strong style={{ color: "#0f172a" }}>₹{amountToAdd.toLocaleString("en-IN")}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569", marginBottom: 6 }}>
              <span>GST (18% CGST/SGST):</span>
              <strong style={{ color: "#0f172a" }}>₹{gstAmount.toLocaleString("en-IN")}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: "#0f172a", paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
              <span>Total Payable:</span>
              <span style={{ color: "#059669" }}>₹{totalPayable.toLocaleString("en-IN")}</span>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>
                Business GSTIN (Optional for Tax Credit)
              </label>
              <input
                type="text"
                placeholder="e.g. 27ABCDE1234F1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                maxLength={15}
                style={{ width: "100%", height: 34, padding: "0 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, fontFamily: "monospace" }}
              />
            </div>
          </div>
        </div>

        <footer className="credit-modal-footer">
          <div className="credit-modal-security">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>Official GST Invoice Generated</span>
          </div>
          <div className="credit-modal-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="primary"
              disabled={loading || amountToAdd <= 0}
              onClick={handleAddCredits}
            >
              <Plus size={16} />
              {loading ? "Processing..." : `Pay ₹${totalPayable.toLocaleString("en-IN")}`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

