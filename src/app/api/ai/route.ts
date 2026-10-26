import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, apiError, requireSameOrigin, ApiError } from "@/lib/auth";
import {
  isBedrockConfigured,
  generateCampaignCopy,
  runWhatsAppAgentReply,
  invokeBedrockClaude,
} from "@/lib/bedrock";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("campaign_copy"),
    channel: z.enum(["WhatsApp", "Email", "Voice"]).default("WhatsApp"),
    topic: z.string().trim().min(2).max(500),
    audience: z.string().trim().max(300).optional(),
    goal: z.string().trim().max(300).optional(),
    language: z.string().trim().max(100).optional(),
  }),
  z.object({
    action: z.literal("chat_agent_reply"),
    inboundMessage: z.string().trim().min(1).max(2000).optional(),
    userMessage: z.string().trim().min(1).max(2000).optional(),
    agentName: z.string().trim().max(120).optional(),
    instructions: z.string().trim().max(5000).optional(),
    knowledge: z.string().trim().max(10000).optional(),
    handoff: z.string().trim().max(2000).optional(),
    handoffInstruction: z.string().trim().max(2000).optional(),
    conversationHistory: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().max(2000),
        }),
      )
      .max(20)
      .optional(),
  }),
  z.object({
    action: z.literal("generate_prompt"),
    context: z.string().trim().min(2).max(2000),
    task: z.string().trim().min(2).max(1000),
  }),
]);

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await authorize(request);

    const json = await request.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(422, "Invalid AI request parameters.");
    }

    const data = parsed.data;

    if (data.action === "campaign_copy") {
      const result = await generateCampaignCopy({
        channel: data.channel,
        topic: data.topic,
        audience: data.audience,
        goal: data.goal,
        language: data.language,
      });
      return NextResponse.json({
        ok: true,
        success: true,
        data: {
          ...result,
          body: result.body || result.text,
        },
        model: isBedrockConfigured()
          ? "Claude (AWS Bedrock)"
          : "Local AI Fallback",
      });
    }

    if (data.action === "chat_agent_reply") {
      const msg = data.inboundMessage || data.userMessage;
      if (!msg) {
        throw new ApiError(422, "Message is required.");
      }
      const result = await runWhatsAppAgentReply({
        inboundMessage: msg,
        agentName: data.agentName,
        instructions: data.instructions,
        knowledge: data.knowledge,
        handoff: data.handoff || data.handoffInstruction,
        conversationHistory: data.conversationHistory,
      });
      return NextResponse.json({
        ok: true,
        success: true,
        data: {
          ...result,
          requiresHandoff: result.requiresHandoff ?? result.handoff,
        },
        model: isBedrockConfigured()
          ? "Claude (AWS Bedrock)"
          : "Local AI Fallback",
      });
    }

    if (!isBedrockConfigured()) {
      throw new ApiError(
        503,
        "AI engine is not configured. Add BEDROCK_BEARER_TOKEN to your environment settings.",
      );
    }

    if (data.action === "generate_prompt") {
      const result = await invokeBedrockClaude({
        prompt: `Context: ${data.context}\nTask: ${data.task}\nGenerate concise, actionable instructions:`,
        maxTokens: 500,
      });
      return NextResponse.json({ success: true, data: { text: result } });
    }

    throw new ApiError(400, "Unknown AI action.");
  } catch (error) {
    return apiError(error);
  }
}
