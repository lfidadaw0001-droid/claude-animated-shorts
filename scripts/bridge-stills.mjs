// usage: node scripts/bridge-stills.mjs <outPrefix> <frame[:path],frame[:path],...> [scale] [format]
// Opens ONE Chromium page and seeks across all requested frames so World & textures initialize only once.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { bundle } from "@remotion/bundler";

const require = createRequire(import.meta.url);
const { internalOpenBrowser } = require("../node_modules/@remotion/renderer/dist/open-browser");
const { makeOrReuseServer } = require("../node_modules/@remotion/renderer/dist/prepare-server");
const { setPropsAndEnv } = require("../node_modules/@remotion/renderer/dist/set-props-and-env");
const { puppeteerEvaluateWithCatch } = require("../node_modules/@remotion/renderer/dist/puppeteer-evaluate");
const { seekToFrame } = require("../node_modules/@remotion/renderer/dist/seek-to-frame");
const { takeFrame } = require("../node_modules/@remotion/renderer/dist/take-frame");

if (process.env.REMOTION_TMP) {
  fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true });
  process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP;
}
fs.mkdirSync("public", { recursive: true });

const [prefix, framesArg, scaleStr = "0.5", fmt = "jpeg"] = process.argv.slice(2);
const scale = Number(scaleStr);
const imageFormat = fmt === "png" ? "png" : "jpeg";
const browserExecutable = process.env.BROWSER_EXECUTABLE || "/usr/local/bin/chromium";
const compId = process.env.COMP_ID || "BigBen";
const inputPropsJson = process.env.INPUT_PROPS || "{}";

const items = framesArg.split(",").map((s) => {
  const [fStr, outPath] = s.split(":");
  const f = Number(fStr);
  return { f, out: path.resolve(outPath || `${prefix}${fStr}.${imageFormat === "png" ? "png" : "jpg"}`) };
});

const t0 = Date.now();
const bundled = await bundle({
  entryPoint: path.resolve(process.env.BRIDGE_ENTRY || "src/index.ts"),
  publicDir: path.resolve("public"),
});
console.log("bundled in", ((Date.now() - t0) / 1000).toFixed(1) + "s");

const { server, cleanupServer } = await makeOrReuseServer(
  null,
  {
    webpackConfigOrServeUrl: bundled,
    port: undefined,
    remotionRoot: process.cwd(),
    offthreadVideoThreads: 1,
    logLevel: "warn",
    indent: false,
    offthreadVideoCacheSizeInBytes: null,
    binariesDirectory: null,
    forceIPv4: false,
  },
  {},
);

const browser = await internalOpenBrowser({
  browser: "chrome",
  browserExecutable,
  chromiumOptions: { gl: "angle" },
  forceDeviceScaleFactor: scale,
  indent: false,
  viewport: null,
  logLevel: "warn",
  onBrowserDownload: undefined,
  chromeMode: "headless-shell",
});

const page = await browser.newPage({
  context: server.sourceMap,
  logLevel: "warn",
  indent: false,
  pageIndex: 0,
  onBrowserLog: (l) => {
    if (l.type === "error") console.log(`[error]`, l.text.slice(0, 300));
  },
});

await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: scale });

await setPropsAndEnv({
  serializedInputPropsWithCustomSchema: inputPropsJson,
  envVariables: {},
  page,
  serveUrl: server.serveUrl,
  initialFrame: items[0].f,
  timeoutInMilliseconds: 180000,
  proxyPort: server.offthreadPort,
  retriesRemaining: 2,
  audioEnabled: false,
  videoEnabled: true,
  indent: false,
  logLevel: "warn",
  onServeUrlVisited: () => undefined,
});

await puppeteerEvaluateWithCatch({
  pageFunction: (id, props, durationInFrames, fps, height, width, defaultCodec, defaultOutName) => {
    window.remotion_setBundleMode({
      type: "composition",
      compositionName: id,
      serializedResolvedPropsWithSchema: props,
      compositionDurationInFrames: durationInFrames,
      compositionFps: fps,
      compositionHeight: height,
      compositionWidth: width,
      compositionDefaultCodec: defaultCodec,
      compositionDefaultOutName: defaultOutName,
    });
  },
  args: [compId, inputPropsJson, 2025, 30, 1920, 1080, "h264", compId],
  frame: null,
  page,
  timeoutInMilliseconds: 180000,
});

for (const { f, out } of items) {
  const tf = Date.now();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await seekToFrame({
    frame: f,
    page,
    composition: compId,
    timeoutInMilliseconds: 180000,
    indent: false,
    logLevel: "warn",
    attempt: 0,
  });
  await takeFrame({
    frame: f,
    freePage: page,
    height: 1920,
    width: 1080,
    imageFormat,
    scale,
    output: out,
    jpegQuality: imageFormat === "png" ? undefined : 90,
    wantsBuffer: false,
    timeoutInMilliseconds: 180000,
  });
  console.log("still", f, "->", path.relative(process.cwd(), out), ((Date.now() - tf) / 1000).toFixed(2) + "s");
}

await browser.close({ silent: true });
await cleanupServer(false);
