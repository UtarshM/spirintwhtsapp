import { NextResponse } from "next/server";
import {
  authorize,
  requireSameOrigin,
  apiError,
  ApiError,
  checkDb,
} from "@/lib/auth";
import { oauthConfig, oauthState } from "@/lib/oauth";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    requireSameOrigin(request);
    const { provider } = await params;
    if (provider !== "gmail" && provider !== "zoho")
      throw new ApiError(400, "Unsupported OAuth provider");
    const { service, workspaceId, user } = await authorize(request, true);
    const c = oauthConfig(provider);
    if (!c.id || !c.secret || !process.env.AWS_KMS_KEY_ID)
      throw new ApiError(
        503,
        "Provider OAuth and encryption credentials are not configured",
      );
    const s = oauthState();
    const { error } = await service
      .from("oauth_states")
      .insert({
        state_hash: s.hash,
        workspace_id: workspaceId,
        user_id: user.id,
        provider,
        expires_at: new Date(Date.now() + 600_000).toISOString(),
        code_verifier: s.verifier,
      });
    checkDb(error);
    const url = new URL(c.authorize);
    const query: Record<string, string> = {
      client_id: c.id,
      redirect_uri: c.callback,
      response_type: "code",
      scope: c.scopes,
      state: s.state,
      access_type: "offline",
      prompt: "consent",
    };
    if (provider === "gmail") {
      query.code_challenge = s.challenge;
      query.code_challenge_method = "S256";
    }
    url.search = new URLSearchParams(query).toString();
    return NextResponse.json({ url: url.toString() });
  } catch (e) {
    return apiError(e);
  }
}
