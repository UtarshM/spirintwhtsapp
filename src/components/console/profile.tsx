"use client";

import { useState } from "react";
import { User, Lock, Mail, Phone, Building2, Check, ShieldCheck, Eye, EyeOff, KeyRound } from "lucide-react";
import { Panel } from "./ui";

interface ProfileProps {
  userName?: string;
  userEmail?: string;
  notify: (msg: string) => void;
  onNavigate?: (page: string) => void;
}

export default function Profile({
  userName = "Utkarsh Makwana",
  userEmail = "um18218@gmail.com",
  notify,
  onNavigate,
}: ProfileProps) {
  // Parse first and last name from userName
  const parts = userName.trim().split(" ");
  const initialFirst = parts[0] || "Utkarsh";
  const initialLast = parts.slice(1).join(" ") || "Makwana";

  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [email, setEmail] = useState(userEmail);
  const [phone, setPhone] = useState("+91 8200010241");
  const [isSaving, setIsSaving] = useState(false);

  // Change Password Modal State
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Workspace Switcher State
  const [activeWorkspace, setActiveWorkspace] = useState("Scalezix / Primary");
  const workspaces = [
    { id: "ws-1", name: "Scalezix / Primary", role: "Owner", tier: "Advance" },
    { id: "ws-2", name: "D2C Brand Alpha", role: "Admin", tier: "Basic" },
  ];

  const initials = `${firstName[0] || "U"}${lastName[0] || "M"}`.toUpperCase();

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      try {
        localStorage.setItem(
          "leadpilot_user_profile",
          JSON.stringify({ firstName, lastName, email, phone })
        );
      } catch {}
      notify("Profile details updated successfully.");
    }, 400);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      notify("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      notify("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      notify("New password and confirm password do not match.");
      return;
    }
    setIsChangingPass(true);
    setTimeout(() => {
      setIsChangingPass(false);
      setPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notify("Account password changed successfully.");
    }, 500);
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
          Edit Profile
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
          Update the name, contact details, and security credentials on your account.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 700,
            boxShadow: "0 4px 10px rgba(37,99,235,0.25)",
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 }}>
              {firstName} {lastName}
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#1d4ed8",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              Advance Plan
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#059669",
                background: "#ecfdf5",
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              Verified Account
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{email}</p>
        </div>
      </div>

      <form onSubmit={handleSaveProfile}>
        {/* PERSONAL DETAILS SECTION */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 24,
            marginBottom: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <User size={18} style={{ color: "#2563eb" }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "0.5px", margin: 0 }}>
              PERSONAL DETAILS
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                First name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  color: "#0f172a",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Last name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  color: "#0f172a",
                  outline: "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* CONTACT DETAILS SECTION */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 24,
            marginBottom: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <Mail size={18} style={{ color: "#2563eb" }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "0.5px", margin: 0 }}>
              CONTACT DETAILS
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  color: "#0f172a",
                  outline: "none",
                }}
              />
              <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 4 }}>
                Used to sign in and for account notifications.
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Phone number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 8200010241"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  color: "#0f172a",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ paddingTop: 8, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ fontSize: 13, color: "#0f172a", display: "block" }}>Password & Security</strong>
                <span style={{ fontSize: 12, color: "#64748b" }}>Manage your authentication password and session locks.</span>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(true)}
                style={{
                  background: "transparent",
                  border: "1px solid #cbd5e1",
                  color: "#2563eb",
                  fontWeight: 600,
                  fontSize: 13,
                  padding: "7px 14px",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <KeyRound size={14} />
                Change password
              </button>
            </div>
          </div>
        </div>

        {/* WORKSPACE & ORGANIZATION SECTION */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <Building2 size={18} style={{ color: "#2563eb" }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "0.5px", margin: 0 }}>
              ORGANIZATION & WORKSPACES
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                onClick={() => {
                  setActiveWorkspace(ws.name);
                  notify(`Switched workspace to ${ws.name}`);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  border: activeWorkspace === ws.name ? "2px solid #2563eb" : "1px solid #e2e8f0",
                  borderRadius: 8,
                  background: activeWorkspace === ws.name ? "#f8faff" : "#ffffff",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      background: activeWorkspace === ws.name ? "#2563eb" : "#f1f5f9",
                      color: activeWorkspace === ws.name ? "#ffffff" : "#475569",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {ws.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <strong style={{ fontSize: 13, color: "#0f172a" }}>{ws.name}</strong>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Role: {ws.role} · Plan: {ws.tier}</div>
                  </div>
                </div>
                {activeWorkspace === ws.name && (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#2563eb",
                    }}
                  >
                    <Check size={14} /> Active
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            type="button"
            onClick={() => onNavigate?.("overview")}
            style={{
              padding: "9px 18px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              color: "#475569",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            style={{
              padding: "9px 22px",
              background: "#2563eb",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              color: "#ffffff",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
            }}
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>

      {/* CHANGE PASSWORD MODAL */}
      {passwordModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setPasswordModalOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              maxWidth: 480,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Lock size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Change Password
                </h3>
                <span style={{ fontSize: 12, color: "#64748b" }}>Update your account security password</span>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "#475569", background: "#f8fafc", padding: "10px 12px", borderRadius: 6, margin: "14px 0 18px", border: "1px solid #e2e8f0" }}>
              For your security, please enter your current password and choose a strong new password with at least 8 characters.
            </p>

            <form onSubmit={handleChangePassword}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                    Current Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      required
                      style={{
                        width: "100%",
                        padding: "8px 36px 8px 12px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      style={{
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                      }}
                    >
                      {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                    New Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      style={{
                        width: "100%",
                        padding: "8px 36px 8px 12px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      style={{
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                      }}
                    >
                      {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                    Confirm New Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      style={{
                        width: "100%",
                        padding: "8px 36px 8px 12px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      style={{
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                      }}
                    >
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  style={{
                    padding: "8px 16px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPass}
                  style={{
                    padding: "8px 18px",
                    background: "#2563eb",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  {isChangingPass ? "Updating..." : "Change Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
