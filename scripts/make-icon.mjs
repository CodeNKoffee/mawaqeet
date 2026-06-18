// Masks a 1024x1024 source PNG into a macOS squircle (transparent corners)
// by embedding it in an SVG clipped to a rounded-rect, ready for qlmanage.
// Usage: node scripts/make-icon.mjs [sourcePng]
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = process.argv[2] || join(here, "..", "build", "cand1.png");
const out = join(here, "..", "build", "icon-rounded.svg");

const png = await readFile(src);
const b64 = png.toString("base64");

// Inset a touch so the source's own edge isn't clipped, radius ~ Apple squircle.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <clipPath id="sq"><rect x="14" y="14" width="996" height="996" rx="220" ry="220"/></clipPath>
  </defs>
  <image clip-path="url(#sq)" x="0" y="0" width="1024" height="1024"
         preserveAspectRatio="xMidYMid slice"
         xlink:href="data:image/png;base64,${b64}"/>
</svg>`;

await writeFile(out, svg, "utf8");
console.log("wrote", out, `(${(svg.length / 1024) | 0} KB)`);
