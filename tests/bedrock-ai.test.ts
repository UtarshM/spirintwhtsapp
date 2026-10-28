import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isBedrockConfigured,
  generateCampaignCopy,
  runWhatsAppAgentReply,
} from "../src/lib/bedrock";

test("Bedrock config check reflects token presence", () => {
  const orig = process.env.BEDROCK_BEARER_TOKEN;
  try {
    delete process.env.BEDROCK_BEARER_TOKEN;
    assert.equal(isBedrockConfigured(), false);
    process.env.BEDROCK_BEARER_TOKEN = "dummy-token";
    assert.equal(isBedrockConfigured(), true);
  } finally {
    if (orig !== undefined) {
      process.env.BEDROCK_BEARER_TOKEN = orig;
    } else {
      delete process.env.BEDROCK_BEARER_TOKEN;
    }
  }
});

test("generateCampaignCopy falls back gracefully when unconfigured", async () => {
  const orig = process.env.BEDROCK_BEARER_TOKEN;
  try {
    delete process.env.BEDROCK_BEARER_TOKEN;
    const res = await generateCampaignCopy({
      channel: "WhatsApp",
      topic: "Festive Sale",
    });
    assert.ok(res.text.includes("Festive Sale"));
    assert.ok((res.suggestedButtons?.length ?? 0) > 0);
  } finally {
    if (orig !== undefined) {
      process.env.BEDROCK_BEARER_TOKEN = orig;
    } else {
      delete process.env.BEDROCK_BEARER_TOKEN;
    }
  }
});

test("runWhatsAppAgentReply falls back gracefully to knowledge base when unconfigured", async () => {
  const orig = process.env.BEDROCK_BEARER_TOKEN;
  try {
    delete process.env.BEDROCK_BEARER_TOKEN;
    const res = await runWhatsAppAgentReply({
      inboundMessage: "What is your pricing?",
      instructions: "Be polite.",
      knowledge: "Pricing starts at $29/mo with full WhatsApp integration.",
      handoff: "Transfer if angry.",
    });
    assert.ok(res.reply.includes("Pricing starts at $29/mo"));
    assert.equal(res.requiresHandoff, false);
  } finally {
    if (orig !== undefined) {
      process.env.BEDROCK_BEARER_TOKEN = orig;
    } else {
      delete process.env.BEDROCK_BEARER_TOKEN;
    }
  }
});

test("runWhatsAppAgentReply triggers handoff when knowledge is empty and unconfigured", async () => {
  const orig = process.env.BEDROCK_BEARER_TOKEN;
  try {
    delete process.env.BEDROCK_BEARER_TOKEN;
    const res = await runWhatsAppAgentReply({
      inboundMessage: "I demand to speak to a manager immediately!",
      instructions: "Be polite.",
      knowledge: "We sell software.",
      handoff: "Escalate to support team.",
    });
    assert.ok(res.reply.includes("Escalate to support team."));
    assert.equal(res.requiresHandoff, true);
  } finally {
    if (orig !== undefined) {
      process.env.BEDROCK_BEARER_TOKEN = orig;
    } else {
      delete process.env.BEDROCK_BEARER_TOKEN;
    }
  }
});

test("generateCampaignCopy falls back gracefully when Bedrock throws an error", async () => {
  const orig = process.env.BEDROCK_BEARER_TOKEN;
  try {
    // Set an invalid token so Bedrock API call will fail (e.g. 403 or network failure)
    process.env.BEDROCK_BEARER_TOKEN = "invalid-token-to-trigger-fallback";
    const res = await generateCampaignCopy({
      channel: "WhatsApp",
      topic: "Automated Outreach",
    });
    assert.ok(res.text.includes("Automated Outreach"));
    assert.ok((res.suggestedButtons?.length ?? 0) > 0);
  } finally {
    if (orig !== undefined) {
      process.env.BEDROCK_BEARER_TOKEN = orig;
    } else {
      delete process.env.BEDROCK_BEARER_TOKEN;
    }
  }
});

test("runWhatsAppAgentReply falls back gracefully when Bedrock throws an error", async () => {
  const orig = process.env.BEDROCK_BEARER_TOKEN;
  try {
    process.env.BEDROCK_BEARER_TOKEN = "invalid-token-to-trigger-fallback";
    const res = await runWhatsAppAgentReply({
      inboundMessage: "Tell me about pricing details please",
      knowledge: "Pricing details: Standard is ₹3,999/mo.",
    });
    assert.ok(res.reply.includes("Standard is ₹3,999/mo"));
    assert.equal(res.requiresHandoff, false);
  } finally {
    if (orig !== undefined) {
      process.env.BEDROCK_BEARER_TOKEN = orig;
    } else {
      delete process.env.BEDROCK_BEARER_TOKEN;
    }
  }
});

