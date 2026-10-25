import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({
    status: "ok",
    mode: "prelaunch",
    liveSending: false,
    checkout: false,
  });
}
