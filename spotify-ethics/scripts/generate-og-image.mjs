/**
 * Generate og-image.png for Facebook / Twitter / social sharing.
 * Run: node scripts/generate-og-image.mjs
 * Output: public/og-image.png (1200×630 @2x = 2400×1260)
 */
import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const W = 1200,
  H = 630,
  dpr = 2;

const canvas = createCanvas(W * dpr, H * dpr);
const ctx = canvas.getContext("2d");
ctx.scale(dpr, dpr);

// ── Background: dark gradient ──
const bg = ctx.createLinearGradient(0, 0, W, H);
bg.addColorStop(0, "#0d0d0d");
bg.addColorStop(1, "#1a1a2e");
ctx.fillStyle = bg;
ctx.fillRect(0, 0, W, H);

// Subtle green glow
const glow = ctx.createRadialGradient(860, 290, 40, 860, 290, 300);
glow.addColorStop(0, "rgba(29,185,84,0.10)");
glow.addColorStop(1, "transparent");
ctx.fillStyle = glow;
ctx.fillRect(0, 0, W, H);

// ── Donut chart (illustrative: ~6% green, ~94% orange) ──
const cx = 880,
  cy = 280,
  r = 170;
const pct = 0.06;
const artistAngle = pct * Math.PI * 2;

// Orange slice
ctx.beginPath();
ctx.moveTo(cx, cy);
ctx.arc(cx, cy, r, -Math.PI / 2 + artistAngle, -Math.PI / 2 + Math.PI * 2);
ctx.closePath();
const oGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, r);
oGrad.addColorStop(0, "#ff6b6b");
oGrad.addColorStop(1, "#ee5a24");
ctx.fillStyle = oGrad;
ctx.fill();

// Green slice
ctx.beginPath();
ctx.moveTo(cx, cy);
ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + artistAngle);
ctx.closePath();
const gGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, r);
gGrad.addColorStop(0, "#1ed760");
gGrad.addColorStop(1, "#1DB954");
ctx.fillStyle = gGrad;
ctx.fill();

// Donut hole
ctx.beginPath();
ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
ctx.fillStyle = "#121220";
ctx.fill();

// "?" in the orange area
const oStart = -Math.PI / 2 + artistAngle;
const oEnd = -Math.PI / 2 + Math.PI * 2;
const oMid = (oStart + oEnd) / 2;
const qR = r * 0.76;
ctx.fillStyle = "rgba(255,255,255,0.9)";
ctx.font = "bold 36px sans-serif";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillText("?", cx + qR * Math.cos(oMid), cy + qR * Math.sin(oMid));

// Center percentage
ctx.fillStyle = "#1ed760";
ctx.font = "bold 44px sans-serif";
ctx.fillText("6%", cx, cy - 8);
ctx.fillStyle = "rgba(255,255,255,0.5)";
ctx.font = "14px sans-serif";
ctx.fillText("to artists", cx, cy + 22);

// Legend
const ly = cy + r + 40;
ctx.fillStyle = "#1DB954";
ctx.beginPath();
ctx.arc(cx - 130, ly, 6, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = "rgba(255,255,255,0.85)";
ctx.font = "bold 13px sans-serif";
ctx.textAlign = "left";
ctx.fillText("6% my artists", cx - 118, ly + 1);
ctx.fillStyle = "#ee5a24";
ctx.beginPath();
ctx.arc(cx + 20, ly, 6, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = "rgba(255,255,255,0.85)";
ctx.fillText("94% ...who knows?", cx + 32, ly + 1);

// ── Left side ──
const lx = 60;

// App title
ctx.textAlign = "left";
ctx.fillStyle = "#ffffff";
ctx.font = "bold 28px sans-serif";
ctx.fillText("Spotify", lx, 80);
ctx.fillStyle = "#1ed760";
ctx.font = "800 15px sans-serif";
ctx.fillText("U N W R A P P E D", lx, 106);

// Green accent line
ctx.fillStyle = "#1DB954";
ctx.fillRect(lx, 120, 100, 2);

// Main question
ctx.fillStyle = "#ffffff";
ctx.font = "600 26px sans-serif";
ctx.fillText("Where does your Spotify", lx, 172);
ctx.fillText("money actually go?", lx, 204);

// Explanation
ctx.fillStyle = "rgba(255,255,255,0.55)";
ctx.font = "500 17px sans-serif";
ctx.fillText("On average, only ~6% of your", lx, 260);
ctx.fillText("subscription reaches the artists", lx, 284);
ctx.fillText("you actually listen to.", lx, 308);

// Red highlight
ctx.fillStyle = "#ff6b6b";
ctx.font = "bold 20px sans-serif";
ctx.fillText("The rest? Who knows.", lx, 370);
ctx.fillStyle = "rgba(255,255,255,0.4)";
ctx.font = "500 14px sans-serif";
ctx.fillText("Spotify won\u2019t tell you.", lx, 395);

// CTA
ctx.fillStyle = "#1ed760";
ctx.font = "bold 18px sans-serif";
ctx.fillText("Find out where YOUR money goes \u2192", lx, 455);
ctx.fillStyle = "rgba(255,255,255,0.45)";
ctx.font = "14px sans-serif";
ctx.fillText("Upload your Spotify data export.", lx, 480);
ctx.fillText("100% local \u2014 no data leaves your browser.", lx, 500);

// ── Footer ──
ctx.fillStyle = "rgba(255,255,255,0.2)";
ctx.fillRect(0, H - 48, W, 1);
ctx.fillStyle = "rgba(255,255,255,0.4)";
ctx.font = "13px sans-serif";
ctx.textAlign = "center";
ctx.fillText("banjohans.github.io/Spotify-Unwrapped", W / 2, H - 20);

// ── Write file ──
const buf = canvas.toBuffer("image/png");
const outPath = resolve(__dirname, "..", "public", "og-image.png");
writeFileSync(outPath, buf);
console.log(
  `\u2705 og-image.png written to ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`,
);
