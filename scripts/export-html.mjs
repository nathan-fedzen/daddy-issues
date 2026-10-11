// Fetches a rendered issue from a running `next start` and writes a single
// self-contained HTML file (inline CSS, Google-hosted fonts) for sharing.
// Usage: node scripts/export-html.mjs <url> <out.html>
import { writeFileSync } from "node:fs";

const [url, out] = process.argv.slice(2);
if (!url || !out) throw new Error("usage: node scripts/export-html.mjs <url> <out.html>");
const origin = new URL(url).origin;

let html = await (await fetch(url)).text();

const cssLinks = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/g)];
let css = "";
for (const [, href] of cssLinks) {
  css += await (await fetch(new URL(href, origin))).text();
}
css = css.replace(/@font-face\s*\{[^}]*\}/g, "");
css += `
:root{--font-display:"Big Shoulders Display","Arial Narrow",Impact,sans-serif;--font-body:Archivo,system-ui,sans-serif}
`;

const fonts =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@100..900&family=Big+Shoulders+Display:wght@100..900&display=swap" rel="stylesheet">';

html = html
  .replace(/<link[^>]+rel="stylesheet"[^>]*>/g, "")
  .replace(/<link[^>]+rel="preload"[^>]*>/g, "")
  .replace(/<script[\s\S]*?<\/script>/g, "")
  .replace(/<section class="my-6 border-2 border-ink p-4">[\s\S]*?<\/section>/, "")
  .replace("</head>", `${fonts}<style>${css}</style></head>`);

writeFileSync(out, html);
console.log(`wrote ${out} (${html.length} chars)`);
