import { NextResponse } from "next/server";
import { userDb } from "@/lib/supabase";
import { getAppUrl } from "@/lib/app-url";
export async function GET(request: Request) {
  const u = new URL(request.url);
  const code = u.searchParams.get("code");
  if (code) {
    const db = await userDb();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      const next = u.searchParams.get("next");
      return NextResponse.redirect(
        new URL(
          next?.startsWith("/account") ? next : "/account",
          getAppUrl() || u.origin,
        ),
      );
    }
  }
  return NextResponse.redirect(
    new URL("/login?error=verification_failed", u.origin),
  );
}
