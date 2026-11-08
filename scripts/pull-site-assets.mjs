// Copies the photos and illustrations the public site uses from the old CoachMe2.world site
// into public/site, then records them in src/content/site-assets.json so pages serve the local copies.
//
//   npm run site:assets
//
// Safe to run again: it re-downloads and rewrites the list.
import fs from "node:fs/promises";
import path from "node:path";

const ORIGIN = process.env.SITE_ASSET_ORIGIN || "https://coachme2-world.vercel.app";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const contentFile = await fs.readFile(path.join(root, "src/content/site.ts"), "utf8");
const files = [...new Set([...contentFile.matchAll(/"(\/(?:photos|illustrations)\/[^"]+)"/g)].map((m) => m[1]))];

const done = [];
for (const file of files) {
  const response = await fetch(`${ORIGIN}${file}`);
  if (!response.ok) {
    console.warn(`skip ${file} (${response.status})`);
    continue;
  }
  const target = path.join(root, "public/site", file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, Buffer.from(await response.arrayBuffer()));
  done.push(file);
  console.log(`saved ${file}`);
}

await fs.writeFile(
  path.join(root, "src/content/site-assets.json"),
  `${JSON.stringify({ files: done.sort() }, null, 2)}\n`,
);
console.log(`\n${done.length} of ${files.length} files copied into public/site.`);
