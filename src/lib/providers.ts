/** Server-only provider transport adapters. Activation requires end-to-end acceptance tests. */
import { KMSClient, DecryptCommand } from "@aws-sdk/client-kms";
import { adminDb } from "./supabase";
import { oauthConfig, encryptSecret, type MailProvider } from "./oauth";
export class ProviderError extends Error {
  constructor(
    message: string,
    public uncertain = false,
    public retryable = false,
  ) {
    super(message);
  }
}
async function request(url: string, init: RequestInit) {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ProviderError("provider_outcome_uncertain", true);
  }
  if (!response.ok)
    throw new ProviderError(
      `provider_http_${response.status}`,
      response.status >= 500,
      response.status === 429,
    );
  return response.json();
}
async function accessToken(workspaceId: string, provider: MailProvider) {
  const db = adminDb();
  const { data: integration } = await db
    .from("integrations")
    .select("id,status")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .single();
  if (!integration || integration.status !== "connected")
    throw new ProviderError("provider_not_connected");
  const { data: secret } = await db
    .from("integration_secrets")
    .select("ciphertext")
    .eq("integration_id", integration.id)
    .single();
  if (!secret) throw new ProviderError("provider_credentials_missing");
  const result = await new KMSClient({ region: process.env.AWS_REGION }).send(
    new DecryptCommand({
      CiphertextBlob: Buffer.from(secret.ciphertext, "base64"),
      EncryptionContext: { workspaceId },
    }),
  );
  if (!result.Plaintext) throw new ProviderError("provider_decryption_failed");
  const tokens = JSON.parse(Buffer.from(result.Plaintext).toString());
  const config = oauthConfig(provider);
  const response = await fetch(config.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      client_id: config.id!,
      client_secret: config.secret!,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const next = await response.json();
  if (!response.ok || !next.access_token) {
    await db
      .from("integrations")
      .update({ status: "expired" })
      .eq("id", integration.id);
    throw new ProviderError("provider_reconnection_required");
  }
  const combined = {
    ...tokens,
    ...next,
    refresh_token: next.refresh_token || tokens.refresh_token,
  };
  const { error } = await db
    .from("integration_secrets")
    .update({
      ciphertext: await encryptSecret(combined, workspaceId),
      updated_at: new Date().toISOString(),
    })
    .eq("integration_id", integration.id);
  if (error) throw new ProviderError("token_persistence_failed");
  return combined;
}
export function mimeEmail(
  from: string,
  to: string,
  subject: string,
  text: string,
  messageId: string,
) {
  if ([from, to, subject, messageId].some((v) => /[\r\n]/.test(v)))
    throw new ProviderError("invalid_email_header");
  return Buffer.from(
    [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
      `Message-ID: <${messageId}>`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(text).toString("base64"),
    ].join("\r\n"),
  ).toString("base64url");
}
export async function sendGmail(
  workspaceId: string,
  message: {
    from: string;
    to: string;
    subject: string;
    text: string;
    messageId: string;
  },
) {
  const token = await accessToken(workspaceId, "gmail");
  return request(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: mimeEmail(
          message.from,
          message.to,
          message.subject,
          message.text,
          message.messageId,
        ),
      }),
    },
  );
}
export async function gmailHistory(
  workspaceId: string,
  startHistoryId: string,
) {
  if (!/^\d+$/.test(startHistoryId))
    throw new ProviderError("invalid_history_id");
  const token = await accessToken(workspaceId, "gmail");
  return request(
    `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded`,
    { headers: { Authorization: `Bearer ${token.access_token}` } },
  );
}
export async function sendZoho(
  workspaceId: string,
  accountId: string,
  message: { from: string; to: string; subject: string; text: string },
) {
  if (!/^\d+$/.test(accountId)) throw new ProviderError("invalid_zoho_account");
  const token = await accessToken(workspaceId, "zoho");
  const base = process.env.ZOHO_MAIL_API_URL || "https://mail.zoho.com";
  if (
    ![
      "https://mail.zoho.com",
      "https://mail.zoho.in",
      "https://mail.zoho.eu",
      "https://mail.zoho.com.au",
    ].includes(base)
  )
    throw new ProviderError("invalid_zoho_region");
  return request(`${base}/api/accounts/${accountId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fromAddress: message.from,
      toAddress: message.to,
      subject: message.subject,
      content: message.text,
      mailFormat: "plaintext",
    }),
  });
}
export async function sendWhatsAppTemplate(
  config: { accessToken: string; phoneNumberId: string; graphVersion: string },
  to: string,
  template: string,
  language: string,
  parameters: string[],
) {
  if (
    !/^\d+$/.test(config.phoneNumberId) ||
    !/^v\d+\.0$/.test(config.graphVersion) ||
    !/^\+?[1-9]\d{7,14}$/.test(to)
  )
    throw new ProviderError("invalid_whatsapp_destination");
  return request(
    `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace("+", ""),
        type: "template",
        template: {
          name: template,
          language: { code: language },
          ...(parameters.length
            ? {
                components: [
                  {
                    type: "body",
                    parameters: parameters.map((text) => ({
                      type: "text",
                      text,
                    })),
                  },
                ],
              }
            : {}),
        },
      }),
    },
  );
}
