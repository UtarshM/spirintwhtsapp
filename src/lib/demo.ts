export type Contact = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  stage: string;
  tags: string[];
  consent: boolean;
};
export const initialContacts: Contact[] = [
  {
    id: "1",
    name: "Aarav Mehta",
    company: "Bloom & Co.",
    email: "aarav@example.com",
    phone: "+919876540001",
    stage: "Qualified",
    tags: ["D2C", "Warm lead"],
    consent: true,
  },
  {
    id: "2",
    name: "Priya Shah",
    company: "Studio North",
    email: "priya@example.com",
    phone: "+919876540002",
    stage: "Contacted",
    tags: ["Agency"],
    consent: true,
  },
  {
    id: "3",
    name: "Rohan Kapoor",
    company: "Earthkind",
    email: "rohan@example.com",
    phone: "+919876540003",
    stage: "New",
    tags: ["D2C"],
    consent: false,
  },
  {
    id: "4",
    name: "Ananya Rao",
    company: "The Good Store",
    email: "ananya@example.com",
    phone: "+919876540004",
    stage: "Contacted",
    tags: ["Retail"],
    consent: true,
  },
  {
    id: "5",
    name: "Kabir Sethi",
    company: "Forma Living",
    email: "kabir@example.com",
    phone: "+919876540005",
    stage: "Qualified",
    tags: ["Warm lead"],
    consent: true,
  },
  {
    id: "6",
    name: "Isha Patel",
    company: "Little Rituals",
    email: "isha@example.com",
    phone: "+919876540006",
    stage: "Contacted",
    tags: ["D2C"],
    consent: true,
  },
];
export const stages = ["New", "Contacted", "Replied", "Qualified", "Not interested"];
export const integrations = [
  {
    name: "WhatsApp",
    provider: "Meta Cloud API",
    description: "Meet customers where conversations happen.",
    kind: "whatsapp",
  },
  {
    name: "Gmail",
    provider: "Google Workspace",
    description: "Connect your inbox. Keep every reply in sync.",
    kind: "email",
  },
  {
    name: "Zoho Mail",
    provider: "Zoho OAuth",
    description: "Bring your business email into the conversation.",
    kind: "email",
  },
  {
    name: "AI Calling",
    provider: "Plivo · Sarvam · Cartesia",
    description: "Make every first conversation feel personal.",
    kind: "voice",
  },
];
