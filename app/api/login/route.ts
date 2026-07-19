import { NextResponse } from "next/server";
import { SESSION_COOKIE, signSession } from "@/lib/auth";

export async function POST(request: Request) {
  const { password } = await request
    .json()
    .catch(() => ({ password: "" }));

  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await signSession(process.env.SESSION_SECRET!), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
