import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const MP4 = path.resolve("bigben.mp4");
const PORT = 8080;

const HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>The Bell That Broke Itself — bigben.mp4</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      background: #141118;
      color: #f7f1e1;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
      gap: 16px;
    }
    h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .meta { color: #b8b0c4; font-size: 13px; }
    video {
      max-height: 74vh;
      max-width: 92vw;
      aspect-ratio: 9 / 16;
      border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.6);
      background: #000;
    }
    .btn {
      display: inline-block;
      background: #e8b948;
      color: #160d18;
      font-weight: 700;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 15px;
    }
    .btn:hover { background: #ffd65c; }
  </style>
</head>
<body>
  <h1>The Bell That Broke Itself (bigben.mp4)</h1>
  <div class="meta">1080×1920 · 30 fps · 67.5 s · H.264 + AAC (-15.0 LUFS)</div>
  <video src="/bigben.mp4" controls autoplay playsinline></video>
  <a class="btn" href="/bigben.mp4" download="bigben.mp4">⬇ Download bigben.mp4 (25 MB)</a>
</body>
</html>`;

http.createServer((req, res) => {
  if (req.url && req.url.startsWith("/bigben.mp4")) {
    const stat = fs.statSync(MP4);
    const range = req.headers.range;
    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": "video/mp4",
      });
      fs.createReadStream(MP4, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": stat.size,
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Content-Disposition": 'inline; filename="bigben.mp4"',
      });
      fs.createReadStream(MP4).pipe(res);
    }
    return;
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(HTML);
}).listen(PORT, "0.0.0.0", () => {
  console.log(`Serving bigben.mp4 at http://0.0.0.0:${PORT}/`);
});
