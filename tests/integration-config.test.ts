import test from "node:test";
import assert from "node:assert/strict";
import {
  integrationConfiguration,
  aiConfiguration,
} from "../src/lib/integration-config";
test("API setup reports missing configuration without exposing credential values", () => {
  const env = {
    GOOGLE_CLIENT_ID: "private-client-id",
    GOOGLE_CLIENT_SECRET: "private-client-secret",
  };
  const rows = integrationConfiguration(env);
  const gmail = rows.find((r) => r.provider === "gmail")!;
  assert.equal(gmail.configured, false);
  assert.ok(gmail.missing.includes("AWS_KMS_KEY_ID"));
  assert.equal(JSON.stringify(rows).includes("private-client"), false);
  assert.equal(
    aiConfiguration({ BEDROCK_BEARER_TOKEN: "secret" }).verified,
    false,
  );
});
test("OAuth connects require database, provider credentials and encryption", () => {
  const env = Object.fromEntries(
    [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "AWS_KMS_KEY_ID",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
    ].map((k) => [k, "configured"]),
  );
  const rows = integrationConfiguration(env);
  assert.equal(rows.find((r) => r.provider === "gmail")?.configured, true);
  assert.equal(
    rows.find((r) => r.provider === "gmail")?.callbackPath,
    "/api/integrations/gmail/callback",
  );
  assert.equal(rows.find((r) => r.provider === "zoho")?.configured, false);
  for (const provider of ["meta", "calendar", "leads", "shopify", "razorpay"])
    assert.equal(rows.find((r) => r.provider === provider)?.implemented, false);
});
test("blank credentials are missing and configuration never proves provider access", () => {
  assert.equal(
    aiConfiguration({ BEDROCK_BEARER_TOKEN: "  " }).configured,
    false,
  );
  assert.equal(
    integrationConfiguration({ AWS_KMS_KEY_ID: " " }).find(
      (r) => r.provider === "plivo",
    )?.configured,
    false,
  );
  for (const row of integrationConfiguration({}))
    assert.equal("secret" in row, false);
});
