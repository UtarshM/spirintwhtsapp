import { NextResponse } from "next/server";
import { z } from "zod";
import { userDb, configured } from "@/lib/supabase";
import { requireSameOrigin, apiError, ApiError } from "@/lib/auth";
import { getAppUrl } from "@/lib/app-url";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (!configured())
      throw new ApiError(
        503,
        "Supabase is not configured. Add the environment variables to enable authentication.",
      );
    const parsed = z
      .object({
        mode: z.enum(["login", "signup", "recover"]),
        email: z.email(),
        password: z.string().min(12).max(128).nullable().optional(),
      })
      .safeParse(await request.json());
    if (!parsed.success)
      throw new ApiError(
        422,
        "Enter a valid email and a password of at least 12 characters",
      );
    const { mode, email, password } = parsed.data;
    const db = await userDb();
    const callback = `${getAppUrl()}/auth/callback`;
    if (mode !== "recover" && !password)
      throw new ApiError(422, "Password required");
    let error;
    if (mode === "login")
      ({ error } = await db.auth.signInWithPassword({
        email,
        password: password!,
      }));
    else if (mode === "signup")
      ({ error } = await db.auth.signUp({
        email,
        password: password!,
        options: { emailRedirectTo: callback },
      }));
    else
      ({ error } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: callback + "?next=/account?recovery=1",
      }));
    if (error)
      throw new ApiError(
        400,
        "Authentication request failed. Check your details or try again later.",
      );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
