import https from "node:https";

export interface BedrockConfig {
  token?: string;
  region?: string;
  fastModel?: string;
  reasoningModel?: string;
}

export function getBedrockConfig(): BedrockConfig {
  return {
    token: process.env.BEDROCK_BEARER_TOKEN,
    region: process.env.BEDROCK_REGION || "ap-south-1",
    fastModel:
      process.env.BEDROCK_FAST_MODEL ||
      "global.anthropic.claude-haiku-4-5-20251001-v1:0",
    reasoningModel:
      process.env.BEDROCK_REASONING_MODEL ||
      "global.anthropic.claude-sonnet-4-6",
  };
}

export function isBedrockConfigured(): boolean {
  const cfg = getBedrockConfig();
  return Boolean(cfg.token && cfg.token.trim().length > 10);
}

export interface BedrockInvokeOptions {
  prompt: string;
  system?: string;
  model?: string;
  maxTokens?: number;
}

export async function invokeBedrockClaude(
  options: BedrockInvokeOptions,
): Promise<string> {
  const cfg = getBedrockConfig();
  if (!cfg.token) {
    throw new Error("Bedrock is not configured. Set BEDROCK_BEARER_TOKEN.");
  }

  const modelId = options.model || cfg.fastModel;
  const maxTokens = options.maxTokens || 1024;

  const payload: Record<string, unknown> = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: options.prompt }],
  };

  if (options.system) {
    payload.system = options.system;
  }

  return new Promise((resolve, reject) => {
    const requestOptions = {
      hostname: `bedrock-runtime.${cfg.region}.amazonaws.com`,
      path: `/model/${encodeURIComponent(modelId!)}/invoke`,
      method: "POST",
      headers: {
        Authorization: "Bearer " + cfg.token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000,
    };

    const req = https.request(requestOptions, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            const content = data.content;
            if (Array.isArray(content) && content[0]?.text) {
              resolve(content[0].text.trim());
            } else if (typeof data.completion === "string") {
              resolve(data.completion.trim());
            } else {
              resolve(body);
            }
          } catch {
            resolve(body);
          }
        } else {
          try {
            const err = JSON.parse(body);
            reject(
              new Error(
                err.message ||
                  `Bedrock API error (${res.statusCode}): ${body.slice(0, 200)}`,
              ),
            );
          } catch {
            reject(
              new Error(
                `Bedrock API request failed with status ${res.statusCode}: ${body.slice(0, 200)}`,
              ),
            );
          }
        }
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Bedrock API request timed out"));
    });

    req.on("error", (err) => {
      reject(new Error(`Bedrock network error: ${err.message}`));
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

export interface CampaignCopyRequest {
  channel: "WhatsApp" | "Email" | "Voice";
  topic: string;
  audience?: string;
  goal?: string;
  language?: string;
}

export interface CampaignCopyResponse {
  text: string;
  body?: string;
  subject?: string;
  buttons?: { text: string; kind: "URL" | "Quick reply" | "Phone"; url?: string }[];
  suggestedButtons?: string[];
}

export async function generateCampaignCopy(
  req: CampaignCopyRequest,
): Promise<CampaignCopyResponse> {
  if (!isBedrockConfigured()) {
    const isWa = req.channel === "WhatsApp";
    const bodyText = isWa
      ? `Hi {{first_name}}, discover how ${req.topic} can accelerate your pipeline! Reply or click below for early access.`
      : `Hi {{first_name}},\n\nWe are pleased to introduce ${req.topic}. Let us know if you'd like a quick 10-minute walkthrough.\n\nBest regards,\nSprint Team`;
    return {
      text: bodyText,
      body: bodyText,
      subject: req.channel === "Email" ? `Special Invitation: ${req.topic}` : undefined,
      buttons: isWa
        ? [
            { text: "Book Walkthrough", kind: "Quick reply" },
            { text: "Learn More", kind: "URL", url: "https://scalezix.com" },
          ]
        : [],
      suggestedButtons: isWa ? ["Book Walkthrough", "Learn More"] : [],
    };
  }

  const systemPrompt = `You are an elite B2B sales copywriter specializing in Indian and global B2B outreach across WhatsApp, cold email, and AI voice calls.
Your goal is to write high-converting, personalized, concise, and professional copy with clear call-to-actions.
Follow formatting standards:
- WhatsApp messages must be punchy, friendly, professional, and max 150 words. Support {{name}} and {{company}} variables where relevant.
- Return response strictly as a JSON object with:
  {
    "text": "the message body copy",
    "subject": "optional subject line for email",
    "buttons": [
      { "text": "Button Label", "kind": "Quick reply" or "URL" or "Phone", "url": "https://..." }
    ]
  }
Do not enclose in markdown code blocks; return valid raw JSON only.`;

  const userPrompt = `Channel: ${req.channel}
Topic / Product: ${req.topic}
Audience: ${req.audience || "B2B decision makers / founders / executives"}
Primary Goal: ${req.goal || "Schedule a demo walkthrough"}
Language: ${req.language || "English (with natural Indian B2B tone)"}

Write an outreach template with 1-2 recommended interactive buttons.`;

  const raw = await invokeBedrockClaude({
    prompt: userPrompt,
    system: systemPrompt,
    maxTokens: 1000,
  });

  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    const textContent = typeof parsed.text === "string" ? parsed.text : raw;
    const buttonList = Array.isArray(parsed.buttons) ? parsed.buttons : [];
    return {
      text: textContent,
      body: textContent,
      subject: parsed.subject,
      buttons: buttonList,
      suggestedButtons: buttonList.map((b: { text?: string } | string) =>
        typeof b === "string" ? b : b.text || "",
      ),
    };
  } catch {
    return {
      text: raw,
      body: raw,
      buttons: [{ text: "Book Walkthrough", kind: "Quick reply" }],
      suggestedButtons: ["Book Walkthrough"],
    };
  }
}

export interface WhatsAppAgentReplyRequest {
  inboundMessage: string;
  agentName?: string;
  instructions?: string;
  knowledge?: string;
  handoff?: string;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
}

export interface WhatsAppAgentReplyResponse {
  reply: string;
  handoff: boolean;
  requiresHandoff?: boolean;
  reason?: string;
}

export async function runWhatsAppAgentReply(
  req: WhatsAppAgentReplyRequest,
): Promise<WhatsAppAgentReplyResponse> {
  if (!isBedrockConfigured()) {
    const words = req.inboundMessage
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3);
    const knowledgeLines = (req.knowledge || "").split("\n");
    const match = knowledgeLines.find((line) =>
      words.some((w) => line.toLowerCase().includes(w)),
    );
    const isEscalation =
      /human|agent|manager|speak|call|support|refund|complaint|emergency/i.test(
        req.inboundMessage,
      );

    if (isEscalation) {
      return {
        reply: `I understand. I am escalating your request: ${req.handoff || "Connecting you to our team."}`,
        handoff: true,
        requiresHandoff: true,
        reason: "User requested human agent",
      };
    }

    if (match) {
      return {
        reply: match.trim(),
        handoff: false,
        requiresHandoff: false,
      };
    }

    return {
      reply: `Thanks for your inquiry! Here is guidance from our team: ${req.handoff || "A team member will assist you shortly."}`,
      handoff: true,
      requiresHandoff: true,
      reason: "Knowledge base did not match query",
    };
  }

  const systemPrompt = `You are "${req.agentName || "Sprint AI Agent"}", a knowledgeable, courteous, and proactive business assistant for WhatsApp.
Business Instructions:
${req.instructions || "Help customer with inquiries, qualify lead interest, and offer product walkthroughs."}

Knowledge Base:
${req.knowledge || "Sprint by Scalezix provides tri-channel sales automation (WhatsApp, Email, AI Calling) starting at ₹3,000/month."}

Handoff Protocol:
${req.handoff || "If customer asks for enterprise custom pricing or specifically asks to speak with a human agent, set handoff to true."}

Output format: Return strictly raw JSON:
{
  "reply": "Your WhatsApp response message (keep it concise, friendly, under 100 words)",
  "handoff": boolean,
  "reason": "optional reason if handoff is true"
}`;

  const history = (req.conversationHistory || [])
    .map((m) => `${m.role === "user" ? "Customer" : "Agent"}: ${m.content}`)
    .join("\n");

  const prompt = `${history ? "Previous Messages:\n" + history + "\n\n" : ""}Latest Inbound Customer Message:
"${req.inboundMessage}"`;

  const raw = await invokeBedrockClaude({
    prompt,
    system: systemPrompt,
    maxTokens: 500,
  });

  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    const handoffFlag = Boolean(parsed.handoff);
    return {
      reply: parsed.reply || raw,
      handoff: handoffFlag,
      requiresHandoff: handoffFlag,
      reason: parsed.reason,
    };
  } catch {
    return {
      reply: raw,
      handoff: false,
      requiresHandoff: false,
    };
  }
}
