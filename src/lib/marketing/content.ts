export type Feature = {
  slug: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
  benefits: { title: string; text: string }[];
  steps: string[];
};
export const features: Feature[] = [
  {
    slug: "whatsapp-automation",
    label: "WhatsApp",
    eyebrow: "CONVERSATIONS THAT CONVERT",
    title: "A familiar channel. A better way to connect.",
    description:
      "Plan personal WhatsApp campaigns, organize conversations, and give your team a clear view of every customer interaction.",
    icon: "whatsapp",
    benefits: [
      {
        title: "Campaigns with a personal touch",
        text: "Prepare templates, choose a consented audience, and preview each message before the first send.",
      },
      {
        title: "A shared space for replies",
        text: "Bring conversations, ownership, and contact context together so the next person can pick up naturally.",
      },
      {
        title: "Follow up with care",
        text: "Design follow-ups around sending windows, opt-outs, and replies. Provider enforcement follows with Meta integration.",
      },
    ],
    steps: [
      "Connect your business’s official Meta assets",
      "Prepare an approved template and consented audience",
      "Review timing, budget, and campaign outcomes",
    ],
  },
  {
    slug: "email-outreach",
    label: "Email outreach",
    eyebrow: "MAKE THE FOLLOW-UP COUNT",
    title: "Your inbox. Connected to the bigger picture.",
    description:
      "Bring Gmail and Zoho into a sales workflow that keeps people, follow-ups, and replies in context.",
    icon: "email",
    benefits: [
      {
        title: "Your business identity",
        text: "Plan sender accounts, daily limits, and message spacing without losing the voice of your brand.",
      },
      {
        title: "Messages worth opening",
        text: "Build reusable content with personal fields and a preview that catches missing details.",
      },
      {
        title: "One continuous story",
        text: "Keep a lead’s email history alongside WhatsApp and call activity. Live mailbox synchronization is part of the integration phase.",
      },
    ],
    steps: [
      "Choose Gmail or Zoho and authorize your account",
      "Set sender identity and sensible daily limits",
      "Build a sequence that stops when the conversation starts",
    ],
  },
  {
    slug: "ai-calling",
    label: "AI calling",
    eyebrow: "A VOICE FOR YOUR NEXT OPPORTUNITY",
    title: "Start the conversation. Keep the human connection.",
    description:
      "Design Hindi and English voice agents to qualify interest, capture context, and know when to bring in your team.",
    icon: "voice",
    benefits: [
      {
        title: "Give every agent a purpose",
        text: "Define its introduction, knowledge, qualification questions, and boundaries before testing a conversation.",
      },
      {
        title: "A handoff with context",
        text: "Plan transfer paths, callbacks, and outcomes so your team knows why a customer is interested.",
      },
      {
        title: "Control the conversation",
        text: "Configure language, voice, duration, and calling windows. Plivo and speech connections are scheduled for the integration phase.",
      },
    ],
    steps: [
      "Define the agent’s purpose and approved knowledge",
      "Preview instructions and qualification questions",
      "Connect the voice stack and validate real test calls",
    ],
  },
  {
    slug: "sales-sequences",
    label: "Sales sequences",
    eyebrow: "CONSISTENCY WITHOUT THE CHASING",
    title: "Every follow-up, with a reason and a rhythm.",
    description:
      "Map a thoughtful journey across WhatsApp, email, and calling, with time to listen between each step.",
    icon: "sequence",
    benefits: [
      {
        title: "Build the journey visually",
        text: "Combine messages, calls, delays, conditions, and handoffs in an understandable sequence.",
      },
      {
        title: "Make room for a reply",
        text: "Use a stop-on-reply approach so an active conversation doesn’t compete with pending outreach.",
      },
      {
        title: "See the next step",
        text: "Keep enrollment, progress, and exceptions visible. Live scheduling will be activated after worker validation.",
      },
    ],
    steps: [
      "Choose the right audience and entry point",
      "Arrange steps, delays, and conditions",
      "Review the journey before activating delivery",
    ],
  },
  {
    slug: "lead-management",
    label: "Lead management",
    eyebrow: "CONTACTS WITH CONTEXT",
    title: "Know the person behind the next opportunity.",
    description:
      "Organize contacts, audience segments, qualification outcomes, and conversation history in one workspace.",
    icon: "crm",
    benefits: [
      {
        title: "An organized starting point",
        text: "Import contacts carefully, review duplicates, and keep tags and consent records close to the contact.",
      },
      {
        title: "Relevant audience segments",
        text: "Group contacts by tags, consent, and campaign activity to prepare focused outreach.",
      },
      {
        title: "Context for every teammate",
        text: "Bring notes, tasks, and channel activity into a timeline that supports a useful conversation.",
      },
    ],
    steps: [
      "Import and review your contacts",
      "Organize contacts with tags and segments",
      "Review qualification and handoff context",
    ],
  },
  {
    slug: "shared-inbox",
    label: "Shared inbox",
    eyebrow: "ONE TEAM. ONE CONVERSATION.",
    title: "The right context, whoever replies next.",
    description:
      "Design a shared conversation workflow where messages, ownership, and customer details stay together.",
    icon: "inbox",
    benefits: [
      {
        title: "Less searching, more helping",
        text: "Find conversations by contact and channel without switching between isolated views.",
      },
      {
        title: "Clear responsibility",
        text: "Assign conversations, track open and closed threads, and make ownership visible.",
      },
      {
        title: "Follow-ups that listen",
        text: "Keep inbound replies connected to campaign suppression and human handoff decisions.",
      },
    ],
    steps: [
      "Open the customer’s conversation",
      "Review context and assign the right teammate",
      "Reply thoughtfully and capture the next step",
    ],
  },
  {
    slug: "segmentation",
    label: "Audience segments",
    eyebrow: "RELEVANCE STARTS WITH THE AUDIENCE",
    title: "The right people for the right conversation.",
    description:
      "Shape contact groups around your sales process, so every campaign starts with a more relevant audience.",
    icon: "segments",
    benefits: [
      {
        title: "Useful groups, simple rules",
        text: "Organize around tags, engagement, ownership, and consent instead of managing disconnected lists.",
      },
      {
        title: "Review before outreach",
        text: "Check your audience and remove contacts who are opted out or missing the channel details you need.",
      },
      {
        title: "Ready to grow with you",
        text: "Start with sales segments. Ecommerce behavioral signals will come with a later integration phase.",
      },
    ],
    steps: [
      "Choose audience rules",
      "Review matching contacts and consent",
      "Use the segment in a campaign or sequence",
    ],
  },
  {
    slug: "analytics",
    label: "Analytics & reports",
    eyebrow: "A CLEARER NEXT MOVE",
    title: "See what happened. Decide what happens next.",
    description:
      "Bring campaign outcomes, channel activity, lead sources, and credit usage into a view your team can act on.",
    icon: "analytics",
    benefits: [
      {
        title: "Follow the conversation",
        text: "Separate sends, replies, delivery outcomes, and calls rather than relying on a single activity count.",
      },
      {
        title: "Understand the cost",
        text: "Keep plan access and channel usage separate, with a clear credit history and spending controls.",
      },
      {
        title: "Trust the source",
        text: "Local simulations stay labelled. Production metrics will be based on verified provider events once connected.",
      },
    ],
    steps: [
      "Choose a reporting period",
      "Review channel and campaign outcomes",
      "Use the evidence to improve the next campaign",
    ],
  },
];
export const solutions = [
  {
    slug: "sales-teams",
    label: "Sales teams",
    title: "More context for the people closing the deal.",
    description:
      "Give your team one place to organize leads, plan outreach, and pick up an interested conversation.",
    pain: "When the same lead lives in three tools, the next step is easy to miss.",
    outcome:
      "A connected lead history, clear qualification outcomes, and follow-ups designed around real responses.",
    points: [
      "Keep lead ownership and next steps clear",
      "Combine channels in one sales journey",
      "Hand off interest with the conversation attached",
    ],
  },
  {
    slug: "small-business",
    label: "Small businesses",
    title: "A small team. A more connected way to sell.",
    description:
      "Build consistent outreach without turning your working day into a list of tools to check.",
    pain: "A growing list of customers should not mean a growing list of missed follow-ups.",
    outcome:
      "Start with the channels your customers already use and a workspace your team can understand.",
    points: [
      "Organize contacts without a complicated setup",
      "Prepare reusable messages in your own voice",
      "Track the next step for each opportunity",
    ],
  },
  {
    slug: "d2c-brands",
    label: "D2C brands",
    title: "Keep the conversation going beyond the first hello.",
    description:
      "Plan WhatsApp engagement and customer support with a shared view of each relationship.",
    pain: "Acquiring attention is only the start. Staying relevant takes context and timing.",
    outcome:
      "Organize conversations and audiences now, with store-connected retention workflows planned for later.",
    points: [
      "Prepare consent-based customer campaigns",
      "Give support and sales the same customer context",
      "Explore future cart and order workflows on the roadmap",
    ],
  },
  {
    slug: "education",
    label: "Education teams",
    title: "A thoughtful response to every new enquiry.",
    description:
      "Organize prospective-student enquiries, qualification questions, and follow-up conversations.",
    pain: "A high volume of enquiries can hide the people who need an answer today.",
    outcome:
      "Clear ownership, prepared content, and a visible follow-up journey for your admissions team.",
    points: [
      "Keep enquiry and qualification status visible",
      "Prepare answers from approved information",
      "Bring a person in when the conversation needs one",
    ],
  },
  {
    slug: "real-estate",
    label: "Real estate teams",
    title: "Turn an enquiry into a useful conversation.",
    description:
      "Keep buyer preferences, follow-ups, and team handoffs connected as a lead develops.",
    pain: "An interested prospect needs more than a fast first reply. They need continuity.",
    outcome:
      "A shared lead history and a structured next step, from initial enquiry to a team conversation.",
    points: [
      "Capture and organize enquiry context",
      "Qualify interest with prepared questions",
      "Plan callbacks and human handoffs",
    ],
  },
  {
    slug: "exporters",
    label: "Exporters",
    title: "Stay connected across a longer sales cycle.",
    description:
      "Plan email, WhatsApp, and voice follow-ups for relationships that take more than one conversation.",
    pain: "Long sales cycles become harder when each interaction starts from scratch.",
    outcome:
      "Keep context and ownership visible while respecting destination, timezone, and provider requirements.",
    points: [
      "Build a timeline for each business relationship",
      "Plan timezone-aware outreach windows",
      "Keep proposals and follow-up notes together",
    ],
  },
];
export const integrationsContent = [
  {
    slug: "whatsapp",
    name: "WhatsApp Business",
    provider: "Meta Cloud API",
    kind: "whatsapp",
    description:
      "Business-owned WhatsApp assets, approved templates, and connected conversations.",
    details: [
      "Official business onboarding",
      "Template and account status",
      "Inbound replies and delivery events",
    ],
    status: "Integration phase",
  },
  {
    slug: "gmail",
    name: "Gmail",
    provider: "Google Workspace",
    kind: "email",
    description:
      "Your existing business inbox, connected through Google OAuth.",
    details: [
      "Secure account authorization",
      "Sender limits and identity",
      "Email sending and reply synchronization",
    ],
    status: "Integration phase",
  },
  {
    slug: "zoho",
    name: "Zoho Mail",
    provider: "Zoho OAuth",
    kind: "email",
    description: "Keep Zoho email connected to your wider sales workflow.",
    details: [
      "Region-aware OAuth setup",
      "Sender account controls",
      "Email and conversation context",
    ],
    status: "Integration phase",
  },
  {
    slug: "plivo",
    name: "Plivo",
    provider: "Voice infrastructure",
    kind: "voice",
    description:
      "The telephony foundation for planned Hindi and English AI calls.",
    details: [
      "Business calling configuration",
      "Call status and recording controls",
      "Voice-agent connection and test calls",
    ],
    status: "Integration phase",
  },
];
export const articles = [
  {
    slug: "a-better-first-follow-up",
    category: "Sales playbook",
    title: "A better first follow-up starts with context.",
    summary:
      "A practical framework for following up with a reason, a useful question, and room for a reply.",
    minutes: 4,
    sections: [
      {
        title: "Start with the conversation you already had",
        text: "Before drafting a follow-up, write down what the person asked for and what you promised. A relevant next step is more helpful than a reminder that you exist.",
      },
      {
        title: "Make one thing easy to answer",
        text: "A short message with one clear question gives the recipient a way forward. Explain why you are reaching out and offer a useful next step without stacking multiple requests.",
      },
      {
        title: "Leave room to listen",
        text: "A sequence should pause when the person replies. Check conversation context before the next scheduled touch and hand the exchange to a person when needed.",
      },
      {
        title: "Review quality alongside activity",
        text: "Look at the replies and their content, not only the number of messages prepared. Useful conversations are a better starting point for improving the next campaign.",
      },
    ],
  },
  {
    slug: "whatsapp-campaign-checklist",
    category: "WhatsApp guide",
    title: "Before the broadcast: a thoughtful campaign checklist.",
    summary:
      "Audience, consent, content, timing, and a team ready to pick up the replies.",
    minutes: 5,
    sections: [
      {
        title: "Review who should receive the message",
        text: "Start with an audience that has a reason to hear from your business. Keep a record of consent, remove opt-outs, and check the channel information before scheduling.",
      },
      {
        title: "Preview personal details",
        text: "Test the template with a real-looking sample contact. Missing company names or unresolved variables can make a carefully prepared campaign feel careless.",
      },
      {
        title: "Give replies an owner",
        text: "A campaign is an invitation to a conversation. Decide who will monitor responses and how questions, interest, and opt-out requests will be handled.",
      },
      {
        title: "Verify before going live",
        text: "Official provider setup, template approval, eligibility rules, and a verified test exchange are separate from drafting a campaign. Complete those checks before production sending.",
      },
    ],
  },
  {
    slug: "understanding-sales-credits",
    category: "Product notes",
    title: "Subscriptions and credits: two different parts of the bill.",
    summary:
      "A simple way to think about platform access, channel usage, and spending controls.",
    minutes: 3,
    sections: [
      {
        title: "The subscription is platform access",
        text: "A plan defines which capabilities and limits a workspace has. It should be understandable before the team starts using the product.",
      },
      {
        title: "Credits represent channel usage",
        text: "A prepaid balance can help a team control consumption. Approved unit rates should be visible before buying credits or starting a campaign.",
      },
      {
        title: "Reservations protect the balance",
        text: "A system can reserve a maximum cost before work begins, settle the actual usage later, and release unused reservations. The transaction history should explain each change.",
      },
      {
        title: "Preview numbers are not production prices",
        text: "Sprint’s current pricing and local simulation examples are planning tools. Final commercial rates and real checkout will be published after approval and integration verification.",
      },
    ],
  },
];
export const helpArticles = [
  {
    slug: "getting-started",
    title: "Start with the local workspace",
    description: "Explore the product without connecting a provider.",
    steps: [
      "Open the dashboard preview from the website navigation.",
      "Use sample contacts to review contact management, campaigns, and sequences.",
      "Look for local, sample, or simulation labels. No message, call, or payment leaves the browser.",
      "Provider connections and production activation follow after the application workflows are ready.",
    ],
  },
  {
    slug: "contacts-and-consent",
    title: "Contacts, imports, and consent",
    description: "Prepare an audience that is ready for a conversation.",
    steps: [
      "Use a CSV with name and email columns; add phone, company, and consent where available.",
      "Review validation results and duplicate entries before confirming an import.",
      "Only record consent when the person has actually provided it. Importing a contact does not create consent.",
      "Check local preview labels and do not import sensitive production customer data into the sample workspace.",
    ],
  },
  {
    slug: "credits-and-billing",
    title: "Understand the credit system",
    description: "Platform plans and channel consumption are kept separate.",
    steps: [
      "Review pricing as an indicative draft, not an active subscription offer.",
      "Production credit packs and per-channel rates still require approval.",
      "Local sample credits have no monetary value and cannot be purchased or withdrawn.",
      "Razorpay checkout stays disabled until payment and reconciliation tests are complete.",
    ],
  },
  {
    slug: "channel-connections",
    title: "Prepare your channel connections",
    description: "What will be needed during the integration phase.",
    steps: [
      "WhatsApp will use your business’s Meta assets and official onboarding.",
      "Gmail and Zoho will require OAuth authorization with the correct application and region.",
      "Calling will require approved Plivo destinations and tested speech services.",
      "Never enter API keys in the local sample interface. Provider secrets belong in the secured server environment.",
    ],
  },
];
export const faqs = [
  [
    "Is Sprint available for production use?",
    "Sprint is currently in development. You can explore the local product preview; live channel delivery and payments remain disabled until integrations and acceptance tests are complete.",
  ],
  [
    "Which channels are planned for launch?",
    "The initial scope includes WhatsApp through Meta Cloud API, Gmail and Zoho email, and Plivo-based AI calling in Hindi and English.",
  ],
  [
    "Can I bring my existing WhatsApp number?",
    "Number eligibility, business ownership, and any coexistence or migration requirements will be verified during official Meta onboarding. The preview does not connect or migrate a number.",
  ],
  [
    "Are usage charges included in a subscription?",
    "Platform access and usage credits are separate. Final credit packs, channel rates, taxes, and plan limits will be published after commercial approval.",
  ],
  [
    "Does the preview send messages or make calls?",
    "No. Local drafts and simulations do not send email or WhatsApp messages, place calls, or process payments.",
  ],
  [
    "Will Shopify be included?",
    "Shopify and ecommerce retention workflows are a later phase. They are not part of the current launch scope.",
  ],
];
