import { createHash, randomBytes } from "node:crypto";
import { KMSClient, EncryptCommand } from "@aws-sdk/client-kms";
import { getAppUrl } from "./app-url";
export type MailProvider = "gmail" | "zoho";
export function oauthConfig(provider: MailProvider) {
  const google = provider === "gmail";
  const zohoBase = process.env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.com";
  if (
    ![
      "https://accounts.zoho.com",
      "https://accounts.zoho.in",
      "https://accounts.zoho.eu",
      "https://accounts.zoho.com.au",
    ].includes(zohoBase)
  )
    throw new Error("invalid_zoho_region");
  return {
    id: process.env[google ? "GOOGLE_CLIENT_ID" : "ZOHO_CLIENT_ID"],
    secret: process.env[google ? "GOOGLE_CLIENT_SECRET" : "ZOHO_CLIENT_SECRET"],
    authorize: google
      ? "https://accounts.google.com/o/oauth2/v2/auth"
      : zohoBase + "/oauth/v2/auth",
    token: google
      ? "https://oauth2.googleapis.com/token"
      : zohoBase + "/oauth/v2/token",
    scopes: google
      ? "openid email https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly"
      : "ZohoMail.accounts.READ,ZohoMail.messages.ALL",
    callback: `${getAppUrl()}/api/integrations/${provider}/callback`,
  };
}
export function oauthState() {
  const state = randomBytes(32).toString("base64url"),
    verifier = randomBytes(48).toString("base64url");
  return {
    state,
    hash: createHash("sha256").update(state).digest("hex"),
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
}
export async function encryptSecret(value: unknown, workspaceId: string) {
  if (!process.env.AWS_KMS_KEY_ID) throw new Error("kms_not_configured");
  const kms = new KMSClient({ region: process.env.AWS_REGION });
  const result = await kms.send(
    new EncryptCommand({
      KeyId: process.env.AWS_KMS_KEY_ID,
      Plaintext: Buffer.from(JSON.stringify(value)),
      EncryptionContext: { workspaceId },
    }),
  );
  if (!result.CiphertextBlob) throw new Error("encryption_failed");
  return Buffer.from(result.CiphertextBlob).toString("base64");
}
