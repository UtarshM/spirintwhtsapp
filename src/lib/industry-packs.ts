import { uid, now, type LocalTemplate } from "./local-workspace";

export interface IndustryPack {
  id: string;
  name: string;
  tagline: string;
  icon: string; // Emoji
  templates: Omit<LocalTemplate, "id" | "updatedAt">[];
  agentPrompt: {
    name: string;
    voice: string;
    instructions: string;
    qualification: string;
  };
}

export const INDUSTRY_PACKS: IndustryPack[] = [
  {
    id: "ecommerce",
    name: "E-Commerce & D2C Brands",
    tagline: "Boost checkout conversions, confirm COD orders, and recover abandoned carts.",
    icon: "🛍️",
    templates: [
      {
        name: "WhatsApp Cart Recovery with 10% Discount",
        channel: "WhatsApp",
        category: "Marketing",
        subject: "Your cart is waiting",
        body: "Hey {{name}}! 🛒 We noticed you left some items in your cart at {{company}}. Complete your purchase now and get an exclusive 10% OFF using code SAVE10.\n\nClick below to claim your offer before stock runs out!",
        status: "Ready",
        mediaUrl: "",
        buttons: [
          { text: "Complete Order (10% OFF)", kind: "URL", url: "https://example.com/checkout" },
          { text: "Chat with Support", kind: "Quick reply", url: "" },
        ],
      },
      {
        name: "WhatsApp Order Confirmation & Tracking",
        channel: "WhatsApp",
        category: "Utility",
        subject: "Order confirmed",
        body: "Hi {{name}}, great news! 🎉 Your order from {{company}} is confirmed and being packed with care. We'll update you as soon as it ships.\n\nThank you for shopping with us!",
        status: "Ready",
        mediaUrl: "",
        buttons: [
          { text: "Track Order Status", kind: "URL", url: "https://example.com/track" },
        ],
      },
      {
        name: "Cold Email VIP Private Sale Access",
        channel: "Email",
        category: "Marketing",
        subject: "Exclusive VIP Access for {{name}} (48 Hours Only)",
        body: "Hi {{name}},\n\nAs a valued customer, you get early access to {{company}}'s private season drop before it goes public.\n\nEnjoy up to 35% off on our bestsellers.\n\nBest,\nThe {{company}} Team",
        status: "Ready",
        mediaUrl: "",
        buttons: [],
      },
    ],
    agentPrompt: {
      name: "Aria - Order Confirmation Specialist",
      voice: "Aria",
      instructions: "You are a warm, courteous order verification specialist from {{company}}. Confirm customer identity, verify their delivery address, ask if they prefer COD or UPI payment, and thank them warmly for shopping with us.",
      qualification: "Did customer confirm order details and agree to delivery timeline?",
    },
  },
  {
    id: "realestate",
    name: "Real Estate & Builders",
    tagline: "Drive site visit footfalls, share project floorplans, and qualify NRI investors.",
    icon: "🏢",
    templates: [
      {
        name: "WhatsApp New Project Launch & Floorplan PDF",
        channel: "WhatsApp",
        category: "Marketing",
        subject: "Exclusive Project Launch",
        body: "Namaste {{name}} 🙏 Introducing the newest luxury residential landmark by {{company}}.\n\n✨ 3 & 4 BHK Sky Villas\n🏊 Rooftop Infinity Pool & Clubhouse\n📍 Prime Location with 85% Green Open Spaces\n\nWould you like the digital brochure and floor plans?",
        status: "Ready",
        mediaUrl: "",
        buttons: [
          { text: "Download Brochure PDF", kind: "URL", url: "https://example.com/brochure.pdf" },
          { text: "Book VIP Site Visit", kind: "Quick reply", url: "" },
        ],
      },
      {
        name: "WhatsApp Site Visit Appointment Reminder",
        channel: "WhatsApp",
        category: "Utility",
        subject: "Site visit reminder",
        body: "Hi {{name}}, this is a friendly reminder from {{company}} for your upcoming site visit this weekend. Our senior relationship manager will be waiting at the experience center to welcome you.\n\nLocation: https://maps.google.com/?q=experience_center",
        status: "Ready",
        mediaUrl: "",
        buttons: [
          { text: "Confirm Visit Time", kind: "Quick reply", url: "" },
          { text: "Reschedule Date", kind: "Quick reply", url: "" },
        ],
      },
      {
        name: "Cold Email High-ROI Commercial Assets",
        channel: "Email",
        category: "Marketing",
        subject: "Pre-leased Commercial Assets with 8.5% Assured Yield: {{company}}",
        body: "Dear {{name}},\n\nIf you are evaluating Grade-A commercial assets with guaranteed rental yield, {{company}} has released limited pre-leased floors tenanted by Fortune 500 companies.\n\nKey highlights:\n- 8.5% Gross Rental Yield\n- 9-Year Locked-In Lease\n- Prime IT Corridor location\n\nLet me know if you would like the financial model and investment deck.\n\nWarm regards,\nDirector of Acquisitions",
        status: "Ready",
        mediaUrl: "",
        buttons: [],
      },
    ],
    agentPrompt: {
      name: "Vikram - Senior Property Advisor",
      voice: "Vikram",
      instructions: "You are an articulate, professional property advisor representing {{company}}. Inquire about their investment horizon, preferred bedroom configuration (2/3/4 BHK), budget range, and invite them for an exclusive private site visit with our senior director.",
      qualification: "Is the contact actively looking to purchase within 3-6 months and interested in a site visit?",
    },
  },
  {
    id: "saas",
    name: "B2B SaaS & Tech Services",
    tagline: "Qualify inbound signups, book executive demos, and activate dormant trials.",
    icon: "💻",
    templates: [
      {
        name: "WhatsApp Product Walkthrough & Demo Invite",
        channel: "WhatsApp",
        category: "Marketing",
        subject: "Welcome to {{company}}",
        body: "Hi {{name}} 👋 Thanks for checking out {{company}}!\n\nI saw you were exploring our automated sales outreach features. Would you like a quick 10-minute live screen share showing how founders are booking 3x more sales meetings?\n\nChoose a slot that works best for you:",
        status: "Ready",
        mediaUrl: "",
        buttons: [
          { text: "Pick 15-Min Demo Slot", kind: "URL", url: "https://cal.com/demo" },
          { text: "Send Video Walkthrough", kind: "Quick reply", url: "" },
        ],
      },
      {
        name: "Cold Email 3-Step Outbound Playbook",
        channel: "Email",
        category: "Marketing",
        subject: "Question regarding {{company}}'s outbound pipeline",
        body: "Hi {{name}},\n\nNoticed {{company}} is scaling rapidly across the region. Most founders we speak with struggle with fragmented sales tools across email, WhatsApp, and calling.\n\nWe built an all-in-one AI sales machine that automates all three channels with 0 setup hassle.\n\nOpen to a brief 5-minute chat this Thursday?\n\nBest,\nUtkarsh",
        status: "Ready",
        mediaUrl: "",
        buttons: [],
      },
    ],
    agentPrompt: {
      name: "Maya - SaaS SDR & Demo Booker",
      voice: "Maya",
      instructions: "You are a sharp, energetic B2B Sales Development Representative for {{company}}. Understand their current sales tooling, ask how many outbound leads they target monthly, and book a discovery call on our calendar.",
      qualification: "Does the prospective customer have an active sales team and qualify for a live demo?",
    },
  },
  {
    id: "edtech",
    name: "EdTech & Coaching Institutes",
    tagline: "Drive demo class attendance, share scholarship results, and counsel students.",
    icon: "🎓",
    templates: [
      {
        name: "WhatsApp Free Demo Class Pass & Time Slot",
        channel: "WhatsApp",
        category: "Marketing",
        subject: "Free Demo Class Pass",
        body: "Namaste {{name}} 🎓 Your free VIP access pass to {{company}}'s Masterclass is confirmed!\n\n🗓️ Date: This Saturday, 5:00 PM IST\n👨‍🏫 Mentor: Top Industry Rankers\n\nClick below to reserve your seat and receive the Zoom link directly on WhatsApp.",
        status: "Ready",
        mediaUrl: "",
        buttons: [
          { text: "Join Masterclass Group", kind: "URL", url: "https://chat.whatsapp.com/demo" },
          { text: "Talk to Academic Counselor", kind: "Quick reply", url: "" },
        ],
      },
      {
        name: "Cold Email Curriculum & Career Report",
        channel: "Email",
        category: "Marketing",
        subject: "Placement Report & 2026 Batch Curriculum: {{company}}",
        body: "Dear {{name}},\n\nHere is the detailed course curriculum, live project breakdown, and the recent alumni placement audit report for {{company}}.\n\nOur graduates secured an average CTC hike of 62% within 6 months.\n\nFeel free to reply if you would like to schedule a 1-on-1 counseling call.\n\nBest,\nAdmissions Committee",
        status: "Ready",
        mediaUrl: "",
        buttons: [],
      },
    ],
    agentPrompt: {
      name: "Pooja - Academic Counseling Advisor",
      voice: "Pooja",
      instructions: "You are an empathetic, encouraging academic advisor at {{company}}. Understand the student or parent's learning goals, explain the curriculum highlights, and confirm their attendance for Saturday's free demo session.",
      qualification: "Did contact confirm attendance for the demo session or request admission counseling?",
    },
  },
  {
    id: "healthcare",
    name: "Healthcare, Clinics & Diagnostics",
    tagline: "Automate appointment reminders, share test reports, and follow up with patients.",
    icon: "🏥",
    templates: [
      {
        name: "WhatsApp Doctor Consultation Reminder",
        channel: "WhatsApp",
        category: "Utility",
        subject: "Appointment Reminder",
        body: "Dear {{name}}, this is a confirmation from {{company}} for your doctor consultation scheduled for tomorrow at 11:30 AM.\n\nPlease arrive 10 minutes prior for vital checks. Reply 'YES' to confirm or click below to reschedule.",
        status: "Ready",
        mediaUrl: "",
        buttons: [
          { text: "Confirm Appointment", kind: "Quick reply", url: "" },
          { text: "Reschedule Slot", kind: "Quick reply", url: "" },
        ],
      },
      {
        name: "WhatsApp Preventive Health Checkup Camp",
        channel: "WhatsApp",
        category: "Marketing",
        subject: "Annual Health Screening",
        body: "Hello {{name}} 🩺 Prioritize your family's health this month. {{company}} is conducting a comprehensive Full Body Health Checkup (including 65+ blood parameters) at an exclusive 50% community discount.\n\nHome sample collection available.",
        status: "Ready",
        mediaUrl: "",
        buttons: [
          { text: "Book Home Collection", kind: "URL", url: "https://example.com/health-camp" },
        ],
      },
    ],
    agentPrompt: {
      name: "Dr. Ananya - Care Coordinator",
      voice: "Ananya",
      instructions: "You are a polite, caring patient coordinator at {{company}}. Confirm their appointment details, remind them about fasting instructions if bloodwork is involved, and answer any clinic direction questions.",
      qualification: "Did patient confirm their appointment attendance?",
    },
  },
];