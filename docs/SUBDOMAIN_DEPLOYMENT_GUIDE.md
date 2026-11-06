# Scalezix Subdomain Deployment Guide

This guide explains how Scalezix's unified subdomain routing architecture works across production domains and local development.

---

## 1. Subdomain Topology

| Domain | Role | Target Code Folder | Default Path |
| :--- | :--- | :--- | :--- |
| **`scalezix.ai`** (or `www.scalezix.ai`) | Public Marketing, Pricing, Features & Docs | `src/app/(marketing)/` | `/` |
| **`app.scalezix.ai`** | Multi-Tenant Client SaaS Workspace (WhatsApp, AI Calling, Email, CRM) | `src/app/dashboard/`, `src/app/login/`, `src/app/signup/`, `src/app/account/` | `/` (rewrites to `/dashboard`) |
| **`admin.scalezix.ai`** | Super Admin / Platform Owner Control Center | `src/app/admin/` | `/` (rewrites to `/admin`) |
| **`api.scalezix.ai`** | REST APIs, Webhooks (Meta, Razorpay) & Integrations | `src/app/api/` | `/api/*` |

---

## 2. Security & Quarantine Rules (Enforced by `src/proxy.ts`)

1. **Client Workspace Quarantine (`app.scalezix.ai`)**:
   - Client tenants on `app.scalezix.ai` are strictly blocked from accessing `/admin`. Any attempt to request `/admin` on `app.scalezix.ai` is rewritten directly to `404 Not Found`.
2. **Founder Portal Quarantine (`admin.scalezix.ai`)**:
   - `admin.scalezix.ai` directly loads the Founder Control Center. Client workspace routes (`/dashboard`) on `admin.scalezix.ai` redirect to the admin root.
3. **Localhost Development Parity**:
   - Local testing mirrors production with zero config:
     - `http://localhost:3000` → Marketing Site
     - `http://app.localhost:3000` → Client SaaS Workspace
     - `http://admin.localhost:3000` → Super Admin Portal

---

## 3. Production DNS & Deployment Setup

### Step 1: Add DNS Records in Your Domain Registrar (Cloudflare, GoDaddy, Namecheap, Route 53)

Configure a Wildcard CNAME record pointing to your deployment:

```dns
Type: A or CNAME
Host: @                Value: <your-vercel-or-server-ip>
Host: www              Value: <your-vercel-cname>
Host: app              Value: <your-vercel-cname>
Host: admin            Value: <your-vercel-cname>
Host: * (Wildcard)     Value: <your-vercel-cname>
```

### Step 2: Add Domains in Vercel / Cloud Host

1. In your **Vercel Project Settings → Domains**:
   - Add `scalezix.ai` (Apex domain)
   - Add `www.scalezix.ai` (Redirect to `scalezix.ai`)
   - Add `app.scalezix.ai` (Production app)
   - Add `admin.scalezix.ai` (Super admin)
   - *(Or simply add `*.scalezix.ai` with a wildcard certificate)*.

2. In your Environment Variables:
   ```env
   NEXT_PUBLIC_APP_URL=https://scalezix.ai
   ```

### Step 3: Verify Subdomain Isolation
- Visit `https://scalezix.ai`: You see the public marketing landing page.
- Visit `https://app.scalezix.ai`: You see the clean client dashboard with zero platform owner controls.
- Visit `https://admin.scalezix.ai`: You see the Super Admin Platform Founder Portal with MRR, wholesale unit margins, and client tenant provisioning.

