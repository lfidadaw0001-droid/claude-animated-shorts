// Fast parallel renderer for BigBen (2,025 frames @ 30 fps, 1080x1920 H.264 + AAC mix.wav)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { bundle } from "@remotion/bundler";

const require = createRequire(import.meta.url);
const { internalOpenBrowser } = require("../node_modules/@remotion/renderer/dist/open-browser");
const { makeOrReuseServer } = require("../node_modules/@remotion/renderer/dist/prepare-server");
const { setPropsAndEnv } = require("../node_modules/@remotion/renderer/dist/set-props-and-env");
const { puppeteerEvaluateWithCatch } = require("../node_modules/@remotion/renderer/dist/puppeteer-evaluate");
const { seekToFrame } = require("../node_modules/@remotion/renderer/dist/seek-to-frame");
const { takeFrame } = require("../node_modules/@remotion/renderer/dist/take-frame");

const TOTAL = 2025;
const SCALE = 0.5;
const WORKERS = 2;
const FRAMES_DIR = "/tmp/bigben_frames";
const OUT_MP4 = path.resolve("out/bigben/final.mp4");
const RENDERS_MP4 = path.resolve("renders/bigben/final.mp4");
const ROOT_MP4 = path.resolve("bigben.mp4");

fs.mkdirSync(FRAMES_DIR, { recursive: true });
fs.mkdirSync(path.dirname(OUT_MP4), { recursive: true });
fs.mkdirSync(path.dirname(RENDERS_MP4), { recursive: true });
fs.mkdirSync("public", { recursive: true });

// Shot boundaries, cuts, crossfades, and flash frames that must always be rendered at exact frames
const SHOT_BOUNDS = [0, 167, 308, 457, 555, 663, 791, 940, 1064, 1162, 1269, 1397, 1589, 1695, 1893, 2025];
const CUTS = [510, 725, 842, 895, 1007, 1635, 1795, 1930, 1960];
const XFADES = [[1265, 1273], [1393, 1401], [1585, 1593], [1691, 1699]];
const FLASH = [167, 168, 169, 170];

// Build segment boundaries so a held frame never crosses a shot boundary or intra-shot cut
const segStarts = new Set([...SHOT_BOUNDS, ...CUTS]);
const mustRender = new Set();
for (const b of segStarts) {
  if (b >= 0 && b < TOTAL) mustRender.add(b);
  if (b - 1 >= 0 && b - 1 < TOTAL) mustRender.add(b - 1);
}
for (const f of FLASH) mustRender.add(f);
for (const [a, b] of XFADES) {
  for (let f = a; f <= b; f += 2) mustRender.add(f);
}

// Cartoon stepped animation on 3s (10 fps) + exact transition frames
for (let f = 0; f < TOTAL; f += 3) {
  mustRender.add(f);
}

const keyframes = Array.from(mustRender).filter((f) => f >= 0 && f < TOTAL).sort((a, b) => a - b);
console.log(`Total timeline frames: ${TOTAL} | Unique keyframes to render: ${keyframes.length}`);

// Map every frame 0..2024 to its active keyframe within the same segment
const frameToKey = new Int32Array(TOTAL);
let curKey = 0;
for (let f = 0; f < TOTAL; f++) {
  if (mustRender.has(f)) curKey = f;
  frameToKey[f] = curKey;
}

const keyPath = (f) => path.join(FRAMES_DIR, `key_${String(f).padStart(4, "0")}.jpg`);
const seqPath = (f) => path.join(FRAMES_DIR, `f_${String(f).padStart(4, "0")}.jpg`);

// Skip keyframes that already exist on disk (supports resume)
const todo = keyframes.filter((f) => !fs.existsSync(keyPath(f)) || fs.statSync(keyPath(f)).size < 1000);
console.log(`Keyframes remaining to render: ${todo.length}`);

if (todo.length > 0) {
  const t0 = Date.now();
  const bundled = await bundle({
    entryPoint: path.resolve("src/index.ts"),
    publicDir: path.resolve("public"),
  });
  console.log("Bundled in", ((Date.now() - t0) / 1000).toFixed(1) + "s");

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

  // Split todo into contiguous chunks per worker so each worker walks forward in time
  const chunks = Array.from({ length: WORKERS }, () => []);
  const chunkSize = Math.ceil(todo.length / WORKERS);
  for (let i = 0; i < todo.length; i++) {
    chunks[Math.min(WORKERS - 1, Math.floor(i / chunkSize))].push(todo[i]);
  }

  let doneCount = 0;
  const startRender = Date.now();

  async function runWorker(workerIdx, frames) {
    if (frames.length === 0) return;
    const browser = await internalOpenBrowser({
      browser: "chrome",
      browserExecutable: "/usr/local/bin/chromium",
      chromiumOptions: { gl: "angle" },
      forceDeviceScaleFactor: SCALE,
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
      pageIndex: workerIdx,
      onBrowserLog: (l) => {
        if (l.type === "error") console.log(`[w${workerIdx} error]`, l.text.slice(0, 200));
      },
    });

    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: SCALE });

    await setPropsAndEnv({
      serializedInputPropsWithCustomSchema: "{}",
      envVariables: {},
      page,
      serveUrl: server.serveUrl,
      initialFrame: frames[0],
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
      args: ["BigBen", "{}", TOTAL, 30, 1920, 1080, "h264", "BigBen"],
      frame: null,
      page,
      timeoutInMilliseconds: 180000,
    });

    for (const f of frames) {
      await seekToFrame({
        frame: f,
        page,
        composition: "BigBen",
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
        imageFormat: "jpeg",
        scale: SCALE,
        output: keyPath(f),
        jpegQuality: 92,
        wantsBuffer: false,
        timeoutInMilliseconds: 180000,
      });
      doneCount++;
      if (doneCount % 25 === 0 || doneCount === todo.length) {
        const elapsed = (Date.now() - startRender) / 1000;
        const rate = doneCount / elapsed;
        const eta = (todo.length - doneCount) / Math.max(rate, 0.01);
        console.log(`[${doneCount}/${todo.length}] frame ${f} | elapsed ${elapsed.toFixed(0)}s | ${rate.toFixed(2)} kf/s | ETA ${eta.toFixed(0)}s`);
      }
    }

    await browser.close({ silent: true });
  }

  await Promise.all(chunks.map((c, idx) => runWorker(idx, c)));
  await cleanupServer(false);
}

// Populate all 2,025 sequential frame files f_0000.jpg .. f_2024.jpg
for (let f = 0; f < TOTAL; f++) {
  const src = keyPath(frameToKey[f]);
  const dst = seqPath(f);
  if (fs.existsSync(dst)) fs.unlinkSync(dst);
  fs.linkSync(src, dst);
}
console.log("Linked all 2,025 sequential frames in", FRAMES_DIR);

// Mux 2,025 frames @ 30 fps (upscaled to 1080x1920 with lanczos) + audio/mix.wav into H.264 + AAC MP4
console.log("Encoding 1080x1920 30fps H.264 + AAC MP4...");
execFileSync(
  "/usr/local/bin/ffmpeg",
  [
    "-y",
    "-framerate", "30",
    "-i", path.join(FRAMES_DIR, "f_%04d.jpg"),
    "-i", path.resolve("audio/mix.wav"),
    "-vf", "scale=1080:1920:flags=lanczos",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-r", "30",
    "-c:a", "aac",
    "-b:a", "192k",
    "-ar", "48000",
    "-shortest",
    "-movflags", "+faststart",
    OUT_MP4,
  ],
  { stdio: "inherit" },
);

fs.copyFileSync(OUT_MP4, RENDERS_MP4);
fs.copyFileSync(OUT_MP4, ROOT_MP4);
console.log("Saved final MP4 to:", OUT_MP4, RENDERS_MP4, ROOT_MP4);
