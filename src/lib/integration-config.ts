export type IntegrationConfig = {
  provider: string;
  configured: boolean;
  implemented: boolean;
  missing: string[];
  action: "oauth" | "calling" | "review";
  callbackPath?: string;
};
export function integrationConfiguration(
  env: Record<string, string | undefined>,
): IntegrationConfig[] {
  const present = (key: string) => Boolean(env[key]?.trim());
  const database = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const entry = (
    provider: string,
    keys: string[],
    implemented: boolean,
    action: IntegrationConfig["action"] = "review",
  ): IntegrationConfig => {
    const missing = keys.filter((k) => !present(k));
    return {
      provider,
      configured: missing.length === 0,
      implemented,
      missing,
      action,
      ...(action === "oauth"
        ? { callbackPath: `/api/integrations/${provider}/callback` }
        : {}),
    };
  };
  return [
    entry(
      "meta",
      [
        ...database,
        "META_APP_ID",
        "META_APP_SECRET",
        "META_WEBHOOK_VERIFY_TOKEN",
        "AWS_KMS_KEY_ID",
      ],
      false,
    ),
    entry(
      "gmail",
      [
        ...database,
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "AWS_KMS_KEY_ID",
      ],
      true,
      "oauth",
    ),
    entry(
      "zoho",
      [...database, "ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "AWS_KMS_KEY_ID"],
      true,
      "oauth",
    ),
    entry("plivo", [...database, "AWS_KMS_KEY_ID"], true, "calling"),
    entry(
      "razorpay",
      [
        ...database,
        "RAZORPAY_KEY_ID",
        "RAZORPAY_KEY_SECRET",
        "RAZORPAY_WEBHOOK_SECRET",
      ],
      false,
    ),
    entry("calendar", [], false),
    entry("leads", [], false),
    entry("shopify", [], false),
  ];
}
export function aiConfiguration(env: Record<string, string | undefined>) {
  return {
    configured: Boolean(env.BEDROCK_BEARER_TOKEN?.trim()),
    verified: false,
    provider: "AWS Bedrock",
  };
}
