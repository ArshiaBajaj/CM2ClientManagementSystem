import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_STATE_COOKIE, googleEnabled, googleRedirectUri } from "@/lib/google";
import { loginError } from "@/lib/sign-in";

/** Sends the person to Google's account picker. */
export async function GET(request: NextRequest) {
  if (!googleEnabled()) return loginError(request, "Google sign-in isn't set up yet. Use your email and password.");
  const state = randomBytes(24).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", googleRedirectUri(request.url));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return response;
}
