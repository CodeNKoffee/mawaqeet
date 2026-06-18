// Builds a 1200x630 Open Graph / social-share card (build/og.svg) with the app
// icon embedded, for rendering to PNG via qlmanage.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const icon = await readFile(join(here, "..", "build", "icon.png"));
const b64 = icon.toString("base64");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#21406f"/>
      <stop offset="0.55" stop-color="#1b3a63"/>
      <stop offset="1" stop-color="#2c4e57"/>
    </linearGradient>
    <pattern id="lattice" width="58" height="58" patternUnits="userSpaceOnUse">
      <g fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.06">
        <rect x="0" y="0" width="58" height="58"/>
        <path d="M29 0 L58 29 L29 58 L0 29 Z"/>
      </g>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#lattice)"/>
  <rect width="1200" height="630" fill="none"/>

  <!-- app icon -->
  <image x="812" y="175" width="280" height="280" xlink:href="data:image/png;base64,${b64}"/>

  <!-- wordmark + tagline (system serif; qlmanage has no web fonts) -->
  <text x="96" y="250" font-family="Georgia, 'Times New Roman', serif" font-size="92" font-weight="800" fill="#ffffff">Mawaqeet</text>
  <text x="96" y="250" font-family="Georgia, serif" font-size="92" fill="#f6d79b" dx="500">·</text>
  <text x="96" y="330" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="44" fill="rgba(255,255,255,0.92)">Prayer that work can't push aside.</text>
  <text x="96" y="400" font-family="Georgia, serif" font-size="30" fill="#f6d79b">Free · macOS Universal · Windows &amp; Linux</text>
  <text x="96" y="540" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="26" fill="rgba(255,255,255,0.7)">A focus-mode screen blocker, so work never delays your salah.</text>
</svg>`;

await writeFile(join(here, "..", "build", "og.svg"), svg, "utf8");
console.log("wrote build/og.svg");
