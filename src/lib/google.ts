/**
 * "Sign in with Google". Turned on by two Vercel environment variables: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
 * Google only proves who someone is. They still need an account in the portal (added by a manager) to get in.
 */
export const GOOGLE_STATE_COOKIE = "cm2_google_state";

export function googleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri(requestUrl: string) {
  return new URL("/api/auth/google/callback", requestUrl).toString();
}

/** Reads the signed-in Google account from the ID token Google's token endpoint returns directly to us over TLS. */
export async function googleEmailFromCode(code: string, redirectUri: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const { id_token: idToken } = (await response.json()) as { id_token?: string };
  if (!idToken) return null;
  const [, payload] = idToken.split(".");
  if (!payload) return null;
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    iss?: string;
    aud?: string;
    exp?: number;
    email?: string;
    email_verified?: boolean;
  };
  const issuerOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  const fresh = typeof claims.exp === "number" && claims.exp * 1000 > Date.now();
  if (!issuerOk || claims.aud !== process.env.GOOGLE_CLIENT_ID || !fresh) return null;
  if (!claims.email || claims.email_verified !== true) return null;
  return claims.email.toLowerCase();
}
