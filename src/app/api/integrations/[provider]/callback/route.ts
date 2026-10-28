import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { userDb, adminDb } from "@/lib/supabase";
import { oauthConfig, encryptSecret } from "@/lib/oauth";
import { getAppUrl } from "@/lib/app-url";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const u = new URL(request.url);
  const app = getAppUrl() || u.origin;
  try {
    const { provider } = await params;
    if (provider !== "gmail" && provider !== "zoho") throw new Error();
    const state = u.searchParams.get("state"),
      code = u.searchParams.get("code");
    if (!state || !code) throw new Error();
    const db = await userDb();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) throw new Error();
    const service = adminDb();
    const hash = createHash("sha256").update(state).digest("hex");
    const { data: rows, error } = await service
      .from("oauth_states")
      .delete()
      .eq("state_hash", hash)
      .eq("user_id", user.id)
      .eq("provider", provider)
      .gt("expires_at", new Date().toISOString())
      .select();
    if (error || rows?.length !== 1) throw new Error();
    const stateRow = rows[0];
    const { data: member } = await db
      .from("memberships")
      .select("role")
      .eq("workspace_id", stateRow.workspace_id)
      .eq("user_id", user.id)
      .single();
    const { data: assurance } =
      await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if (
      !member ||
      !["owner", "administrator"].includes(member.role) ||
      (assurance?.nextLevel === "aal2" && assurance?.currentLevel !== "aal2")
    )
      throw new Error();
    const c = oauthConfig(provider);
    if (!c.id || !c.secret) throw new Error();
    const body: Record<string, string> = {
      grant_type: "authorization_code",
      code,
      client_id: c.id,
      client_secret: c.secret,
      redirect_uri: c.callback,
    };
    if (provider === "gmail") body.code_verifier = stateRow.code_verifier;
    const response = await fetch(c.token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
      signal: AbortSignal.timeout(15000),
    });
    const tokens = await response.json();
    if (!response.ok || !tokens.access_token || !tokens.refresh_token)
      throw new Error();
    const ciphertext = await encryptSecret(tokens, stateRow.workspace_id);
    const { data: integration, error: saveError } = await service
      .from("integrations")
      .upsert(
        { workspace_id: stateRow.workspace_id, provider, status: "connected" },
        { onConflict: "workspace_id,provider" },
      )
      .select("id")
      .single();
    if (saveError) throw saveError;
    const { error: secretError } = await service
      .from("integration_secrets")
      .upsert({ integration_id: integration.id, ciphertext });
    if (secretError) throw secretError;
    return NextResponse.redirect(
      new URL("/account?connected=" + provider, app),
    );
  } catch {
    return NextResponse.redirect(new URL("/account?connection=failed", app));
  }
}
