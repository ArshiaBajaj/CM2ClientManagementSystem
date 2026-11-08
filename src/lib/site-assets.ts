import downloaded from "@/content/site-assets.json";

/**
 * Photos and illustrations for the public site.
 *
 * `npm run site:assets` copies them from the old site into /public/site and records each file in
 * src/content/site-assets.json. Files in that list are served from this app; anything not copied yet
 * still loads from the old site, so nothing shows up broken in the meantime.
 */
const FALLBACK_ORIGIN = process.env.SITE_ASSET_ORIGIN || "https://coachme2-world.vercel.app";
const LOCAL = new Set<string>(downloaded.files);

export function siteAsset(file: string | undefined | null): string | null {
  if (!file) return null;
  const clean = file.startsWith("/") ? file : `/${file}`;
  return LOCAL.has(clean) ? `/site${clean}` : `${FALLBACK_ORIGIN}${clean}`;
}
