const TUNNEL_SUFFIXES = [
  ".trycloudflare.com",
  ".ngrok.io",
  ".ngrok.app",
  ".ngrok-free.app",
  ".loca.lt",
  ".localtunnel.me",
];

/** Only a stable public https link. Laptop addresses and temporary tunnels must not ship on the hosted site. */
export function httpsUrl(value: string | undefined | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (host === "localhost" || host.endsWith(".localhost") || host === "::1" || host === "0.0.0.0") return null;
    if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) return null;
    if (TUNNEL_SUFFIXES.some((suffix) => host.endsWith(suffix))) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
