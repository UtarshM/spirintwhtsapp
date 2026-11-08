"use client";
import { useState } from "react";
import { useWorkspace } from "../local-provider";
import { uid, now, type LocalWorkspace } from "@/lib/local-workspace";
import { Panel, Empty, Modal, Badge, formValue, date } from "./ui";
import {
  PhoneCall,
  Plus,
  Play,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Bot,
  Radio,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShoppingBag,
  Package,
  Building2,
  Hash,
  ListOrdered,
  Volume2,
} from "lucide-react";

type IvrStep = {
  id: string;
  name: string;
  type: "menu" | "number" | "list";
  prompt: string;
  options: { key: string; action: "assistant" | "step" | "transfer" | "hangup"; target?: string }[];
  fallbackAction: "assistant" | "step" | "transfer" | "hangup";
  fallbackTarget?: string;
  retries: number;
};

type IvrMenuData = {
  name: string;
  direction: "Both" | "Incoming" | "Outgoing";
  active: boolean;
  steps: IvrStep[];
};

const STARTER_TEMPLATES: {
  title: string;
  badge: string;
  desc: string;
  icon: typeof ShoppingBag;
  data: IvrMenuData;
}[] = [
  {
    title: "🛍️ COD Order Confirmation",
    badge: "Outgoing",
    desc: "Call the customer to confirm or cancel a cash-on-delivery order before dispatching.",
    icon: ShoppingBag,
    data: {
      name: "COD Order Confirmation",
      direction: "Outgoing",
      active: true,
      steps: [
        {
          id: "step_welcome",
          name: "welcome",
          type: "menu",
          prompt: "Namaste {{name}}! This is an automated verification call for your cash on delivery order of {{amount}} rupees. Press 1 to confirm your order, or press 2 to cancel.",
          options: [
            { key: "1", action: "hangup", target: "Thank you! Your order is confirmed and being prepared." },
            { key: "2", action: "hangup", target: "Your order has been cancelled as requested. Have a great day!" },
          ],
          fallbackAction: "assistant",
          retries: 2,
        },
      ],
    },
  },
  {
    title: "📦 Order Status & Help",
    badge: "Incoming",
    desc: "Callers hear their recent order status and can instantly transfer to an AI specialist.",
    icon: Package,
    data: {
      name: "Order Status & Help",
      direction: "Incoming",
      active: true,
      steps: [
        {
          id: "step_status",
          name: "status_menu",
          type: "menu",
          prompt: "Thanks for calling Leadpilot customer support! Press 1 to check your recent shipment status, press 2 for billing inquiries, or press 0 to talk to our AI assistant.",
          options: [
            { key: "1", action: "step", target: "step_shipment" },
            { key: "2", action: "step", target: "step_billing" },
            { key: "0", action: "assistant" },
          ],
          fallbackAction: "assistant",
          retries: 2,
        },
        {
          id: "step_shipment",
          name: "shipment_info",
          type: "menu",
          prompt: "Your package with Order ID {{orderId}} is out for delivery today. Press 1 to receive a tracking link via WhatsApp, or 0 to speak to support.",
          options: [
            { key: "1", action: "hangup", target: "Tracking link sent to your WhatsApp. Goodbye!" },
            { key: "0", action: "assistant" },
          ],
          fallbackAction: "assistant",
          retries: 1,
        },
        {
          id: "step_billing",
          name: "billing_info",
          type: "menu",
          prompt: "For billing questions, our AI specialist can review your invoices. Connecting you now...",
          options: [],
          fallbackAction: "assistant",
          retries: 1,
        },
      ],
    },
  },
  {
    title: "🏢 Simple Reception",
    badge: "Incoming",
    desc: "Route business callers to Sales, Technical Support, or the Leadpilot AI Assistant.",
    icon: Building2,
    data: {
      name: "Office Reception Menu",
      direction: "Incoming",
      active: true,
      steps: [
        {
          id: "step_reception",
          name: "welcome",
          type: "menu",
          prompt: "Welcome to Leadpilot. Press 1 for Sales, press 2 for Support, or stay on the line to speak with an AI specialist.",
          options: [
            { key: "1", action: "transfer", target: "+918031831100" },
            { key: "2", action: "transfer", target: "+918031831100" },
          ],
          fallbackAction: "assistant",
          retries: 2,
        },
      ],
    },
  },
];

export default function IvrBuilder({ notify }: { notify: (s: string) => void }) {
  const { state: s, update } = useWorkspace();
  const [showStarterModal, setShowStarterModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editorData, setEditorData] = useState<IvrMenuData | null>(null);
  const [testModal, setTestModal] = useState<IvrMenuData | null>(null);
  const [testCurrentStep, setTestCurrentStep] = useState<string>("");
  const [testKeyHistory, setTestKeyHistory] = useState<string[]>([]);

  // Filter IVR resources
  const ivrResources = s.resources.filter((r) => r.kind === "ivr");

  const handleCreateNew = (preset?: IvrMenuData) => {
    const initial: IvrMenuData = preset || {
      name: "New Phone Menu",
      direction: "Both",
      active: true,
      steps: [
        {
          id: uid(),
          name: "welcome",
          type: "menu",
          prompt: "Namaste! Welcome to Leadpilot. Press 1 to speak with sales, or press 2 for support.",
          options: [
            { key: "1", action: "assistant" },
            { key: "2", action: "assistant" },
          ],
          fallbackAction: "assistant",
          retries: 2,
        },
      ],
    };
    setEditorData(initial);
    setEditId(null);
    setShowStarterModal(false);
  };

  const handleEdit = (r: (typeof ivrResources)[number]) => {
    try {
      const parsed: IvrMenuData = JSON.parse(r.data.json || "{}");
      setEditorData(parsed);
      setEditId(r.id);
    } catch {
      notify("Could not parse IVR configuration");
    }
  };

  const handleSave = () => {
    if (!editorData || !editorData.name.trim()) {
      notify("Please provide a valid menu name");
      return;
    }

    const payload = {
      id: editId || uid(),
      kind: "ivr" as const,
      name: editorData.name.trim(),
      data: {
        json: JSON.stringify(editorData),
        direction: editorData.direction,
        active: editorData.active ? "true" : "false",
        stepsCount: String(editorData.steps.length),
      },
      updatedAt: now(),
    };

    const ok = update((state) => {
      const existing = state.resources.filter((r) => r.id !== payload.id);
      return {
        ...state,
        resources: [...existing, payload],
      };
    });

    if (ok) {
      notify(`IVR Menu "${editorData.name}" saved successfully`);
      setEditorData(null);
      setEditId(null);
    }
  };

  const handleDelete = (id: string) => {
    const ok = update((state) => ({
      ...state,
      resources: state.resources.filter((r) => r.id !== id),
    }));
    if (ok) {
      notify("IVR menu removed");
      if (editId === id) {
        setEditorData(null);
        setEditId(null);
      }
    }
  };

  // Step operations
  const addStep = () => {
    if (!editorData) return;
    const newStep: IvrStep = {
      id: uid(),
      name: `step_${editorData.steps.length + 1}`,
      type: "menu",
      prompt: "Please press 1 to continue, or 0 to speak to our assistant.",
      options: [{ key: "1", action: "assistant" }],
      fallbackAction: "assistant",
      retries: 2,
    };
    setEditorData({
      ...editorData,
      steps: [...editorData.steps, newStep],
    });
  };

  const updateStep = (index: number, patch: Partial<IvrStep>) => {
    if (!editorData) return;
    const updated = [...editorData.steps];
    updated[index] = { ...updated[index], ...patch };
    setEditorData({ ...editorData, steps: updated });
  };

  const removeStep = (index: number) => {
    if (!editorData || editorData.steps.length <= 1) {
      notify("An IVR menu must contain at least one step");
      return;
    }
    const updated = editorData.steps.filter((_, i) => i !== index);
    setEditorData({ ...editorData, steps: updated });
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    if (!editorData) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= editorData.steps.length) return;
    const updated = [...editorData.steps];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setEditorData({ ...editorData, steps: updated });
  };

  return (
    <Panel
      title="IVR Phone Menus"
      description="Create multi-branch keypad menus — callers press 1, 2, 3 and Leadpilot AI handles routing, confirmation, or live escalation."
    >
      {/* Top Banner and Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#475569" }}>
          💡 <strong>Tip:</strong> Attach any active flow to a voice specialist under{" "}
          <span style={{ color: "#2563eb", fontWeight: 600 }}>Agent Builder → IVR Flow</span> to run it on outbound campaigns.
        </div>
        <button className="primary" onClick={() => setShowStarterModal(true)}>
          <Plus size={14} style={{ marginRight: 6 }} />
          Create IVR
        </button>
      </div>

      {/* EDITOR VIEW */}
      {editorData ? (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button className="secondary" onClick={() => setEditorData(null)} style={{ padding: "6px 12px", fontSize: 12 }}>
                ← Back to Menus
              </button>
              <input
                type="text"
                value={editorData.name}
                onChange={(e) => setEditorData({ ...editorData, name: e.target.value })}
                placeholder="Menu name (e.g. COD Confirmation)"
                style={{ fontSize: 16, fontWeight: 700, padding: "6px 12px", borderRadius: 8, border: "1px solid #cbd5e1", minWidth: 260 }}
              />
              <select
                value={editorData.direction}
                onChange={(e) => setEditorData({ ...editorData, direction: e.target.value as any })}
                style={{ height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 10px", fontSize: 13 }}
              >
                <option value="Both">Both (Incoming & Outgoing)</option>
                <option value="Incoming">Incoming Only</option>
                <option value="Outgoing">Outgoing Only</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={editorData.active}
                  onChange={(e) => setEditorData({ ...editorData, active: e.target.checked })}
                />
                {editorData.active ? <span style={{ color: "#16a34a" }}>● Active & Live</span> : <span style={{ color: "#64748b" }}>○ Inactive</span>}
              </label>

              <button
                className="secondary"
                onClick={() => {
                  setTestModal(editorData);
                  setTestCurrentStep(editorData.steps[0]?.id || "");
                  setTestKeyHistory([]);
                }}
              >
                <Play size={13} style={{ marginRight: 6 }} />
                Test Simulator
              </button>

              <button className="primary" onClick={handleSave}>
                <CheckCircle2 size={13} style={{ marginRight: 6 }} />
                Save Menu
              </button>
            </div>
          </div>

          {/* Variables Strip */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
              Available Dynamic Variables (Click to copy into prompts):
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["{{name}}", "{{amount}}", "{{orderId}}", "{{caller.phone}}", "{{company}}"].map((variable) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(variable);
                    notify(`Copied ${variable} to clipboard`);
                  }}
                  style={{
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    border: "1px solid #bfdbfe",
                    padding: "3px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: "monospace",
                    cursor: "pointer",
                  }}
                >
                  {variable}
                </button>
              ))}
            </div>
          </div>

          {/* Steps List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {editorData.steps.map((step, idx) => (
              <div
                key={step.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  padding: 16,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                {/* Step Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        background: "#2563eb",
                        color: "#ffffff",
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={step.name}
                      onChange={(e) => updateStep(idx, { name: e.target.value })}
                      placeholder="Step name"
                      style={{ fontWeight: 600, fontSize: 14, padding: "4px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
                    />
                    {idx === 0 && (
                      <span style={{ fontSize: 11, background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                        Entry Step
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      className="secondary"
                      disabled={idx === 0}
                      onClick={() => moveStep(idx, "up")}
                      style={{ padding: "4px 8px" }}
                      title="Move up"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      className="secondary"
                      disabled={idx === editorData.steps.length - 1}
                      onClick={() => moveStep(idx, "down")}
                      style={{ padding: "4px 8px" }}
                      title="Move down"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      className="secondary"
                      onClick={() => removeStep(idx)}
                      style={{ padding: "4px 8px", color: "#dc2626" }}
                      title="Delete step"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Step Prompt Textarea */}
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                  🗣️ What the caller hears (Synthesized by Leadpilot Voice Engine):
                </label>
                <textarea
                  rows={3}
                  value={step.prompt}
                  onChange={(e) => updateStep(idx, { prompt: e.target.value })}
                  placeholder="Enter message spoken by AI voice..."
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, marginBottom: 12 }}
                />

                {/* Keypad Options */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                    When the caller presses a number:
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {step.options.map((opt, optIdx) => (
                      <div key={optIdx} style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", padding: 8, borderRadius: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, background: "#0f172a", color: "#ffffff", padding: "2px 8px", borderRadius: 4 }}>
                          Key {opt.key}
                        </span>
                        <span style={{ fontSize: 12, color: "#64748b" }}>→</span>
                        <select
                          value={opt.action}
                          onChange={(e) => {
                            const newOptions = [...step.options];
                            newOptions[optIdx].action = e.target.value as any;
                            updateStep(idx, { options: newOptions });
                          }}
                          style={{ height: 32, borderRadius: 6, border: "1px solid #cbd5e1", padding: "0 8px", fontSize: 12 }}
                        >
                          <option value="assistant">Talk to Leadpilot AI Specialist</option>
                          <option value="step">Jump to another Step</option>
                          <option value="transfer">Transfer to Human Phone Number</option>
                          <option value="hangup">Hang up with closing message</option>
                        </select>

                        {opt.action === "step" && (
                          <select
                            value={opt.target || ""}
                            onChange={(e) => {
                              const newOptions = [...step.options];
                              newOptions[optIdx].target = e.target.value;
                              updateStep(idx, { options: newOptions });
                            }}
                            style={{ height: 32, borderRadius: 6, border: "1px solid #cbd5e1", padding: "0 8px", fontSize: 12 }}
                          >
                            <option value="">Select target step...</option>
                            {editorData.steps
                              .filter((_, sIdx) => sIdx !== idx)
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                          </select>
                        )}

                        {opt.action === "transfer" && (
                          <input
                            type="text"
                            placeholder="+918031831100"
                            value={opt.target || ""}
                            onChange={(e) => {
                              const newOptions = [...step.options];
                              newOptions[optIdx].target = e.target.value;
                              updateStep(idx, { options: newOptions });
                            }}
                            style={{ height: 32, borderRadius: 6, border: "1px solid #cbd5e1", padding: "0 8px", fontSize: 12, width: 160 }}
                          />
                        )}

                        {opt.action === "hangup" && (
                          <input
                            type="text"
                            placeholder="Closing message"
                            value={opt.target || ""}
                            onChange={(e) => {
                              const newOptions = [...step.options];
                              newOptions[optIdx].target = e.target.value;
                              updateStep(idx, { options: newOptions });
                            }}
                            style={{ height: 32, borderRadius: 6, border: "1px solid #cbd5e1", padding: "0 8px", fontSize: 12, flex: 1 }}
                          />
                        )}

                        <button
                          type="button"
                          className="secondary"
                          onClick={() => {
                            const newOptions = step.options.filter((_, i) => i !== optIdx);
                            updateStep(idx, { options: newOptions });
                          }}
                          style={{ padding: "4px 8px", color: "#dc2626" }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        const nextKey = String(step.options.length + 1);
                        updateStep(idx, {
                          options: [...step.options, { key: nextKey, action: "assistant" }],
                        });
                      }}
                      style={{ alignSelf: "flex-start", padding: "4px 10px", fontSize: 12 }}
                    >
                      + Add Key Option
                    </button>
                  </div>
                </div>

                {/* Fallback Action */}
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, background: "#f1f5f9", padding: "8px 12px", borderRadius: 6, fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: "#334155" }}>If caller presses nothing / wrong key:</span>
                  <select
                    value={step.fallbackAction}
                    onChange={(e) => updateStep(idx, { fallbackAction: e.target.value as any })}
                    style={{ height: 30, borderRadius: 6, border: "1px solid #cbd5e1", padding: "0 8px", fontSize: 12 }}
                  >
                    <option value="assistant">Talk to Leadpilot AI Specialist (Recommended)</option>
                    <option value="hangup">Hang up politely</option>
                  </select>
                  <span style={{ color: "#64748b" }}>Max Retries:</span>
                  <select
                    value={step.retries}
                    onChange={(e) => updateStep(idx, { retries: Number(e.target.value) })}
                    style={{ height: 30, borderRadius: 6, border: "1px solid #cbd5e1", padding: "0 8px", fontSize: 12 }}
                  >
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>
              </div>
            ))}

            <button type="button" className="secondary" onClick={addStep} style={{ padding: "10px 14px", fontWeight: 600 }}>
              + Add Menu Step
            </button>
          </div>
        </div>
      ) : (
        /* LIST OF IVR MENUS */
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {ivrResources.map((r) => {
              let parsed: IvrMenuData = { name: r.name, direction: "Both", active: true, steps: [] };
              try {
                parsed = JSON.parse(r.data.json || "{}");
              } catch {}

              return (
                <div
                  key={r.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{r.name}</h3>
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          Direction: {parsed.direction} · {parsed.steps.length} steps
                        </span>
                      </div>
                      <Badge>{parsed.active ? "Active" : "Inactive"}</Badge>
                    </div>

                    <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#334155", marginBottom: 14 }}>
                      <strong>Entry Greeting:</strong> &quot;{parsed.steps[0]?.prompt?.slice(0, 90) || "Welcome"}&hellip;&quot;
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                    <button className="secondary" style={{ flex: 1 }} onClick={() => handleEdit(r)}>
                      Edit Menu
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        setTestModal(parsed);
                        setTestCurrentStep(parsed.steps[0]?.id || "");
                        setTestKeyHistory([]);
                      }}
                      title="Test simulator"
                    >
                      <Play size={13} />
                    </button>
                    <button className="secondary" onClick={() => handleDelete(r.id)} style={{ color: "#dc2626" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!ivrResources.length && (
            <Empty>
              No IVR phone menus created yet. Click &quot;Create IVR&quot; above or pick a starter template to launch automated DTMF routing.
            </Empty>
          )}
        </div>
      )}

      {/* STARTER PRESETS MODAL */}
      {showStarterModal && (
        <Modal title="Create a Phone Menu" close={() => setShowStarterModal(false)}>
          <div style={{ padding: "8px 0" }}>
            <p style={{ fontSize: 13, color: "#475569", marginBottom: 16 }}>
              Choose a starter flow or create an empty welcome step. Nothing goes live until you toggle it ON.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {STARTER_TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                return (
                  <div
                    key={tmpl.title}
                    onClick={() => handleCreateNew(tmpl.data)}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: 10,
                      padding: 14,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "border-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#cbd5e1")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: "#eff6ff",
                          color: "#2563eb",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Icon size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{tmpl.title}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{tmpl.desc}</div>
                      </div>
                    </div>
                    <Badge>{tmpl.badge}</Badge>
                  </div>
                );
              })}

              <div
                onClick={() => handleCreateNew()}
                style={{
                  border: "1px dashed #94a3b8",
                  borderRadius: 10,
                  padding: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: "#f1f5f9",
                    color: "#475569",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Plus size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>➕ Start from scratch</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>One empty welcome step — build it your way.</div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* INTERACTIVE CALL SIMULATOR MODAL */}
      {testModal && (
        <Modal
          title={`IVR Dialpad Simulator: ${testModal.name}`}
          close={() => {
            setTestModal(null);
            setTestKeyHistory([]);
          }}
        >
          {(() => {
            const currentStep = testModal.steps.find((s) => s.id === testCurrentStep) || testModal.steps[0];
            return (
              <div style={{ padding: "8px 0" }}>
                <div style={{ background: "#0f172a", color: "#ffffff", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                    AI Voice Prompt (Step: {currentStep?.name})
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.5, color: "#f8fafc" }}>
                    &quot;{currentStep?.prompt.replace("{{name}}", "Rahul").replace("{{amount}}", "2,499").replace("{{orderId}}", "LP-8842")}&quot;
                  </div>
                </div>

                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8, textAlign: "center" }}>
                  Keypad Input: {testKeyHistory.join(" → ") || "Awaiting caller digit..."}
                </div>

                {/* Dialpad Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, maxWidth: 240, margin: "0 auto 16px" }}>
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      className="secondary"
                      style={{ height: 48, fontSize: 18, fontWeight: 700, borderRadius: 8 }}
                      onClick={() => {
                        setTestKeyHistory([...testKeyHistory, digit]);
                        const match = currentStep?.options.find((o) => o.key === digit);
                        if (match) {
                          if (match.action === "step" && match.target) {
                            setTestCurrentStep(match.target);
                            notify(`Digit ${digit} pressed → Branching to step ${match.target}`);
                          } else if (match.action === "assistant") {
                            notify(`Digit ${digit} pressed → Escalating to Leadpilot AI Specialist`);
                          } else if (match.action === "hangup") {
                            notify(`Call ended: "${match.target || 'Goodbye'}"`);
                          } else if (match.action === "transfer") {
                            notify(`Transferring call to phone number: ${match.target}`);
                          }
                        } else {
                          notify(`Key ${digit} is unmapped. Fallback: ${currentStep?.fallbackAction}`);
                        }
                      }}
                    >
                      {digit}
                    </button>
                  ))}
                </div>

                <div style={{ textAlign: "center" }}>
                  <button
                    className="secondary"
                    onClick={() => {
                      setTestCurrentStep(testModal.steps[0]?.id || "");
                      setTestKeyHistory([]);
                    }}
                    style={{ fontSize: 12 }}
                  >
                    Reset Call Simulator
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </Panel>
  );
}
