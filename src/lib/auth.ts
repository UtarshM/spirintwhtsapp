import { NextResponse } from "next/server";
import { userDb, adminDb, configured } from "./supabase";
import { getAppUrl } from "./app-url";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function authorize(request: Request, admin = false) {
  if (!configured())
    throw new ApiError(503, "Workspace authentication is not configured");
  const db = await userDb();
  let user = null;

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const jwt = authHeader.slice(7).trim();
    if (jwt) {
      const { data: jwtData, error: jwtErr } = await db.auth.getUser(jwt);
      if (!jwtErr && jwtData?.user) {
        user = jwtData.user;
      }
    }
  }

  if (!user) {
    const { data: authData, error } = await db.auth.getUser();
    if (!error && authData?.user) {
      user = authData.user;
    }
  }

  if (!user) throw new ApiError(401, "Sign in required");
  const workspaceId = request.headers.get("x-workspace-id");
  if (!workspaceId || !/^[0-9a-f-]{36}$/i.test(workspaceId))
    throw new ApiError(400, "A valid x-workspace-id is required");
  const { data: member } = await db
    .from("memberships")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();
  if (!member) throw new ApiError(403, "Workspace access denied");
  if (admin && !["owner", "administrator"].includes(member.role))
    throw new ApiError(403, "Administrator access required");
  if (admin) {
    const { data } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.nextLevel === "aal2" && data?.currentLevel !== "aal2")
      throw new ApiError(403, "Administrator MFA verification required");
  }
  return { db, service: adminDb(), user, workspaceId, role: member.role };
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    if (
      origin === `${proto}://${host}` ||
      origin === `https://${host}` ||
      origin === `http://${host}`
    ) {
      return;
    }
  }

  const expected = getAppUrl();
  if (
    origin === expected ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:")
  ) {
    return;
  }
  throw new ApiError(403, "Invalid request origin");
}
export function apiError(error: unknown) {
  if (error instanceof ApiError)
    return NextResponse.json(
      { error: { message: error.message } },
      { status: error.status },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { error: { message: "Invalid JSON" } },
      { status: 400 },
    );
  if (error instanceof Error) {
    if (
      error.message === "server_not_configured" ||
      error.message === "supabase_not_configured"
    ) {
      return NextResponse.json(
        {
          error: {
            message:
              "Database service is not configured. Verify SUPABASE_SERVICE_ROLE_KEY.",
          },
        },
        { status: 503 },
      );
    }
  }
  console.error("API operation failed", {
    type: error instanceof Error ? error.name : "unknown",
    message: error instanceof Error ? error.message : "unknown",
  });
  return NextResponse.json(
    { error: { message: "The operation could not be completed" } },
    { status: 500 },
  );
}
export function checkDb(error: { message: string } | null) {
  if (error)
    throw new ApiError(
      400,
      "Could not save this record. Check fields and duplicates.",
    );
}
