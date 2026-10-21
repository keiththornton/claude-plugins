#!/usr/bin/env node
// Screenshot URLs at several viewports and record console errors + failed requests.
// Usage: node snap.mjs [--out DIR] [--full] [--wait MS] [--viewports phone,tablet,desktop] URL [URL...]

import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const VIEWPORTS = {
  phone: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablet: { width: 834, height: 1194, deviceScaleFactor: 2 },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
};

function parseArgs(argv) {
  const opts = { out: ".webdev-pro/shots", full: false, wait: 500, viewports: ["phone", "desktop"], urls: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") opts.out = argv[++i];
    else if (a === "--full") opts.full = true;
    else if (a === "--wait") opts.wait = Number(argv[++i]) || 0;
    else if (a === "--viewports") opts.viewports = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith("--")) {
      console.error(`Unknown flag ${a}`);
      process.exit(2);
    } else opts.urls.push(a);
  }
  if (!opts.urls.length) {
    console.error("Usage: node snap.mjs [--out DIR] [--full] [--wait MS] [--viewports phone,tablet,desktop] URL [URL...]");
    process.exit(2);
  }
  for (const v of opts.viewports) {
    if (!VIEWPORTS[v]) {
      console.error(`Unknown viewport "${v}". Known: ${Object.keys(VIEWPORTS).join(", ")}`);
      process.exit(2);
    }
  }
  return opts;
}

async function loadPlaywright() {
  // Prefer the project's own install, then a global one, then playwright-core with a system browser.
  const req = createRequire(join(process.cwd(), "package.json"));
  const candidates = [
    () => req("playwright"),
    () => req("playwright-core"),
    () => createRequire(import.meta.url)("playwright"),
    () => createRequire(import.meta.url)("playwright-core"),
  ];
  for (const c of candidates) {
    try {
      const mod = c();
      return mod.chromium ? mod : mod.default;
    } catch {
      /* try next */
    }
  }
  console.error(
    [
      "Playwright is not installed in this project.",
      "Run one of these in the project directory, then retry:",
      "  npm i -D playwright && npx playwright install chromium",
      "  (or) pnpm add -D playwright && pnpm exec playwright install chromium",
    ].join("\n"),
  );
  process.exit(3);
}

function slug(url) {
  const u = new URL(url);
  const p = u.pathname.replace(/\/+$/, "") || "/";
  const s = (p === "/" ? "home" : p.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-")).slice(0, 60);
  return u.search ? `${s}-${u.search.replace(/[^a-z0-9]+/gi, "-").slice(0, 20)}` : s;
}

async function launch(pw) {
  try {
    return await pw.chromium.launch();
  } catch (e) {
    const msg = String(e?.message || e);
    if (/Executable doesn't exist|browserType.launch/i.test(msg)) {
      try {
        return await pw.chromium.launch({ channel: "chrome" });
      } catch {
        /* fallthrough */
      }
      console.error("Chromium is not installed for Playwright. Run: npx playwright install chromium");
      process.exit(3);
    }
    throw e;
  }
}

const opts = parseArgs(process.argv.slice(2));
const outDir = resolve(opts.out);
mkdirSync(outDir, { recursive: true });

const pw = await loadPlaywright();
const browser = await launch(pw);
const report = { generatedAt: new Date().toISOString(), pages: [] };

try {
  for (const url of opts.urls) {
    for (const vpName of opts.viewports) {
      const vp = VIEWPORTS[vpName];
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.deviceScaleFactor,
        isMobile: !!vp.isMobile,
        hasTouch: !!vp.hasTouch,
      });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      const failedRequests = [];
      page.on("console", (m) => {
        if (m.type() === "error" || m.type() === "warning") consoleErrors.push(`[${m.type()}] ${m.text()}`);
      });
      page.on("pageerror", (e) => pageErrors.push(String(e?.message || e)));
      page.on("response", (r) => {
        if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`);
      });
      page.on("requestfailed", (r) => failedRequests.push(`FAILED ${r.url()} ${r.failure()?.errorText || ""}`.trim()));

      const entry = { url, viewport: vpName, width: vp.width, height: vp.height, screenshot: null, status: null };
      try {
        const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        entry.status = resp ? resp.status() : null;
        if (opts.wait) await page.waitForTimeout(opts.wait);
        const metrics = await page.evaluate(() => ({
          title: document.title,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          viewportWidth: window.innerWidth,
          bodyTextLength: (document.body?.innerText || "").trim().length,
          suspiciousText: (document.body?.innerText || "").match(/\b(undefined|NaN|\[object Object\])\b/g)?.slice(0, 5) || [],
          brokenImages: Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src).slice(0, 10),
          h1Count: document.querySelectorAll("h1").length,
          hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
        }));
        Object.assign(entry, metrics);
        // Compare against the device width, not window.innerWidth: in mobile emulation a page
        // without a responsive <meta viewport> inflates its layout viewport to fit the content.
        entry.horizontalOverflow = metrics.scrollWidth > vp.width + 1;
        entry.missingViewportMeta = !!vp.isMobile && !metrics.hasViewportMeta;
        const file = join(outDir, `${slug(url)}-${vpName}.png`);
        await page.screenshot({ path: file, fullPage: opts.full });
        entry.screenshot = file;
      } catch (e) {
        entry.error = String(e?.message || e);
      }
      entry.consoleErrors = consoleErrors.slice(0, 25);
      entry.pageErrors = pageErrors.slice(0, 25);
      entry.failedRequests = failedRequests.slice(0, 25);
      report.pages.push(entry);
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const reportPath = join(outDir, "report.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2));

// Human summary
let defects = 0;
for (const p of report.pages) {
  const flags = [];
  if (p.error) flags.push(`ERROR ${p.error}`);
  if (p.status && p.status >= 400) flags.push(`HTTP ${p.status}`);
  if (p.horizontalOverflow) flags.push(`horizontal overflow (content ${p.scrollWidth}px > ${p.width}px ${p.viewport})`);
  if (p.missingViewportMeta) flags.push(`no <meta name="viewport"> tag: page will render desktop-sized on phones`);
  if (p.suspiciousText?.length) flags.push(`suspicious text: ${p.suspiciousText.join(", ")}`);
  if (p.brokenImages?.length) flags.push(`${p.brokenImages.length} broken image(s)`);
  if (p.pageErrors?.length) flags.push(`${p.pageErrors.length} page error(s)`);
  if (p.consoleErrors?.length) flags.push(`${p.consoleErrors.length} console error/warning(s)`);
  if (p.failedRequests?.length) flags.push(`${p.failedRequests.length} failed request(s)`);
  if (p.bodyTextLength === 0 && !p.error) flags.push("page has no visible text");
  defects += flags.length;
  console.log(`${p.url} @${p.viewport}: ${p.screenshot ? p.screenshot : "(no screenshot)"}`);
  for (const f of flags) console.log(`  ! ${f}`);
}
console.log(`\nReport: ${reportPath}`);
console.log(defects ? `${defects} flag(s) raised. Open the PNGs and look.` : "No automatic flags. Still open the PNGs and look.");
