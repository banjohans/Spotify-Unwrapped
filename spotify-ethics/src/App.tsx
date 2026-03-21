import { useMemo, useState, useEffect, useRef } from "react";
import { analyze, calcHistoricalSubscriptionCost } from "./lib/analyze";
import type {
  AnalysisConfig,
  SpotifyStreamRow,
  SubscriptionSegment,
} from "./lib/analyze";
import katex from "katex";
import ListeningCharts from "./components/ListeningCharts";
import ArtistComparisonChart from "./components/ArtistComparisonChart";
import { LabelAnalytics } from "./components/LabelAnalytics";
import IndustryCharts from "./components/IndustryCharts";
import CaseExplained from "./components/CaseExplained";
import {
  type Locale,
  type SubscriptionTier,
  PRICE_HISTORY,
  ROYALTY_HISTORY,
  DEFAULT_ALBUM_PRICE,
  TIER_LAUNCH_DATES,
  formatCurrency,
  formatHrs,
  formatNum,
  currencyPerMonth,
  currencyPerStream,
  dateLocale,
  t,
  tRaw,
} from "./lib/i18n";
import "./App.css";

import heroImg from "./assets/hero.png";

const COUNTRIES = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brazil" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "CV", name: "Cabo Verde" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CA", name: "Canada" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CD", name: "Congo (DRC)" },
  { code: "CR", name: "Costa Rica" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "SZ", name: "Eswatini" },
  { code: "ET", name: "Ethiopia" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "GD", name: "Grenada" },
  { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "KP", name: "North Korea" },
  { code: "KR", name: "South Korea" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "MK", name: "North Macedonia" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PS", name: "Palestine" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "LC", name: "Saint Lucia" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "São Tomé and Príncipe" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TV", name: "Tuvalu" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VA", name: "Vatican City" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
] as const;

function albumKey(artist: string, album: string) {
  return `${artist}|||${album}`;
}

function renderLatex(formula: string): string {
  return katex.renderToString(formula, {
    throwOnError: false,
    displayMode: true,
  });
}

type SubscriptionRange = {
  from: [number, number];
  to: [number, number];
};

type SubscriptionEstimate = {
  firstDate: Date;
  lastDate: Date;
  months: number;
  totalCost: number;
  activeMonths: number;
  activeCost: number;
  activePaidMonths: number;
  subscribedMonths: number;
  avgMonthlyPrice: number;
  spanAvgMonthlyPrice: number;
  inactivePaidMonths: number;
  inactivePaidCost: number;
  inactivePaidDays: number;
  inactivePaidDayCost: number;
  paidRanges: SubscriptionRange[];
  noSubscriptionMonths: number;
  noSubscriptionRanges: SubscriptionRange[];
  inactivePaidRanges: SubscriptionRange[];
  priceBreakdown: Array<{
    year: number;
    month: number;
    price: number;
    tier: SubscriptionTier;
  }>;
  tierBreakdown: import("./lib/analyze").TierBreakdown;
};

function monthKey(year: number, month: number): string {
  return `${year}-${month}`;
}

function monthIsoKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthPointFromKey(key: string): { year: number; month: number } {
  const [year, month] = key.split("-").map(Number);
  return { year, month };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function groupConsecutiveMonths(
  months: Array<{ year: number; month: number }>,
): SubscriptionRange[] {
  if (months.length === 0) return [];

  const sorted = [...months].sort(
    (a, b) => a.year - b.year || a.month - b.month,
  );
  const ranges: SubscriptionRange[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    const prevIndex = prev.year * 12 + prev.month;
    const currIndex = curr.year * 12 + curr.month;

    if (currIndex === prevIndex + 1) {
      prev = curr;
      continue;
    }

    ranges.push({
      from: [start.year, start.month],
      to: [prev.year, prev.month],
    });
    start = curr;
    prev = curr;
  }

  ranges.push({ from: [start.year, start.month], to: [prev.year, prev.month] });
  return ranges;
}

function formatMonthRange(range: SubscriptionRange, locale: Locale): string {
  const formatPoint = ([year, month]: [number, number]) =>
    new Date(year, month - 1, 1).toLocaleDateString(dateLocale(locale), {
      year: "numeric",
      month: "short",
    });

  const from = formatPoint(range.from);
  const to = formatPoint(range.to);
  return from === to ? from : `${from} – ${to}`;
}

function formatMonthDuration(months: number, locale: Locale): string {
  if (months <= 0) return locale === "en" ? "0 months" : "0 månadar";

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const parts: string[] = [];

  if (years > 0) {
    parts.push(
      locale === "en"
        ? `${years} ${years === 1 ? "year" : "years"}`
        : `${years} år`,
    );
  }
  if (remainingMonths > 0) {
    parts.push(
      locale === "en"
        ? `${remainingMonths} ${remainingMonths === 1 ? "month" : "months"}`
        : `${remainingMonths} månadar`,
    );
  }

  return parts.join(" ");
}

// ─── Share image generator (canvas → PNG) ────────────────────────

async function generateShareImage(opts: {
  subCost: number;
  artistValue: number;
  artistCount: number;
  hours: string;
  locale: Locale;
  heroSrc: string;
  activePercent?: number;
  assistedPercent?: number;
}): Promise<Blob> {
  const {
    subCost,
    artistValue,
    artistCount,
    hours,
    locale,
    heroSrc,
    activePercent,
    assistedPercent,
  } = opts;
  const rest = Math.max(0, subCost - artistValue);
  const W = 1200,
    H = 630; // Facebook recommended
  const dpr = 2;

  const canvas = document.createElement("canvas");
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // ── Background: dark gradient ──
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0d0d0d");
  bg.addColorStop(1, "#1a1a2e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle glow behind pie
  const glow = ctx.createRadialGradient(880, 315, 40, 880, 315, 260);
  glow.addColorStop(0, "rgba(29,185,84,0.12)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── Pie chart ──
  const cx = 880,
    cy = 290,
    r = 160;
  const artistPct = subCost > 0 ? artistValue / subCost : 0;
  const artistAngle = artistPct * Math.PI * 2;

  // "Other" slice (red/orange)
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, -Math.PI / 2 + artistAngle, -Math.PI / 2 + Math.PI * 2);
  ctx.closePath();
  const otherGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, r);
  otherGrad.addColorStop(0, "#ff6b6b");
  otherGrad.addColorStop(1, "#ee5a24");
  ctx.fillStyle = otherGrad;
  ctx.fill();

  // "Artists" slice (Spotify green)
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + artistAngle);
  ctx.closePath();
  const artistGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, r);
  artistGrad.addColorStop(0, "#1ed760");
  artistGrad.addColorStop(1, "#1DB954");
  ctx.fillStyle = artistGrad;
  ctx.fill();

  // Inner circle (donut hole)
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
  ctx.fillStyle = "#121220";
  ctx.fill();

  // Draw "?" in the orange (unknown) slice
  const orangeStart = -Math.PI / 2 + artistAngle;
  const orangeEnd = -Math.PI / 2 + Math.PI * 2;
  const orangeMid = (orangeStart + orangeEnd) / 2;
  const qR = r * 0.76;
  const qx = cx + qR * Math.cos(orangeMid);
  const qy = cy + qR * Math.sin(orangeMid);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font =
    "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("?", qx, qy);

  // Percentage in center
  const pctText = `${(artistPct * 100).toFixed(0)}%`;
  ctx.fillStyle = "#1ed760";
  ctx.font =
    "bold 42px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(pctText, cx, cy - 8);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font =
    "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(locale === "en" ? "to artists" : "til artistar", cx, cy + 22);

  // ── Legend ──
  const legendY = cy + r + 36;
  const artistPctInt = Math.round(artistPct * 100);
  const restPctInt = 100 - artistPctInt;
  // Green dot - artists
  ctx.fillStyle = "#1DB954";
  ctx.beginPath();
  ctx.arc(cx - 130, legendY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font =
    "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    `${artistPctInt}% ${locale === "en" ? "my artists" : "mine artistar"}`,
    cx - 118,
    legendY + 1,
  );
  // Orange dot - unknown
  ctx.fillStyle = "#ee5a24";
  ctx.beginPath();
  ctx.arc(cx + 20, legendY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(
    `${restPctInt}% ${locale === "en" ? "...distributed through the pool" : "...fordelt gjennom potten"}`,
    cx + 32,
    legendY + 1,
  );

  // ── Text side (left) ──
  const fmtK = (n: number) => formatCurrency(n, locale);
  const lx = 60;

  // ── Mini logo (hero image + text) ──
  // Load hero image and draw it as miniature
  const heroImg = new Image();
  heroImg.crossOrigin = "anonymous";
  await new Promise<void>((resolve) => {
    heroImg.onload = () => resolve();
    heroImg.onerror = () => resolve(); // continue even if image fails
    heroImg.src = heroSrc;
  });

  const logoX = lx,
    logoY = 24;
  const logoH = 60; // miniature height
  const logoW = heroImg.naturalWidth
    ? (heroImg.naturalWidth / heroImg.naturalHeight) * logoH
    : logoH; // keep aspect ratio
  if (heroImg.complete && heroImg.naturalWidth > 0) {
    ctx.drawImage(heroImg, logoX, logoY, logoW, logoH);
  }

  // "Spotify" text next to hero image
  const textStartX = logoX + logoW + 12;
  ctx.fillStyle = "#ffffff";
  ctx.font =
    "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Spotify", textStartX, logoY + 30);

  // "UNWRAPPED" text - green, smaller, with letter spacing
  ctx.fillStyle = "#1ed760";
  ctx.font =
    "800 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  if ("letterSpacing" in ctx) (ctx as any).letterSpacing = "4px";
  ctx.fillText("UNWRAPPED", textStartX, logoY + 48);
  if ("letterSpacing" in ctx) (ctx as any).letterSpacing = "0px";

  // Decorative green accent line
  ctx.fillStyle = "#1DB954";
  ctx.fillRect(logoX, logoY + logoH + 8, 90, 2);

  // Main stat lines
  ctx.fillStyle = "#ffffff";
  ctx.font =
    "600 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const line1 =
    locale === "en"
      ? "My estimated Spotify Premium spending"
      : "Mitt estimerte Spotify Premium-forbruk";
  ctx.fillText(line1, lx, 130);
  ctx.fillStyle = "#1ed760";
  ctx.font =
    "bold 48px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(fmtK(subCost), lx, 182);

  ctx.fillStyle = "#ffffff";
  ctx.font =
    "600 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const line2 =
    locale === "en"
      ? `Based on estimated royalties, this is the approximate value associated with my ${artistCount} artists:`
      : `Basert på estimerte royalties, er dette den omtrentlege verdien knytt til mine ${artistCount} artistar:`;
  // Wrap long text
  const maxW = 520;
  const words2 = line2.split(" ");
  let currentLine = "";
  let textY = 240;
  for (const word of words2) {
    const test = currentLine ? currentLine + " " + word : word;
    if (ctx.measureText(test).width > maxW && currentLine) {
      ctx.fillText(currentLine, lx, textY);
      currentLine = word;
      textY += 28;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) ctx.fillText(currentLine, lx, textY);

  ctx.fillStyle = "#1ed760";
  ctx.font =
    "bold 44px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(fmtK(artistValue), lx, textY + 52);

  const restY = textY + 100;
  ctx.fillStyle = "#ff6b6b";
  ctx.font =
    "bold 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(fmtK(rest), lx, restY);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font =
    "500 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(
    locale === "en"
      ? "was distributed through Spotify\u2019s global royalty pool."
      : "vart fordelt gjennom Spotify sin globale royalty-pott.",
    lx,
    restY + 28,
  );

  // Listening time badge
  ctx.font =
    "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const badge =
    locale === "en"
      ? `⏱ ${hours} of listening · 🎤 ${artistCount} artists`
      : `⏱ ${hours} lyttetid · 🎤 ${artistCount} artistar`;
  const badgePad = 18;
  const badgeW = ctx.measureText(badge).width + badgePad * 2;
  const badgeH = 40,
    badgeX = lx,
    badgeY = restY + 52;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 10);
  } else {
    const rr = 10;
    ctx.moveTo(badgeX + rr, badgeY);
    ctx.arcTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + badgeH, rr);
    ctx.arcTo(badgeX + badgeW, badgeY + badgeH, badgeX, badgeY + badgeH, rr);
    ctx.arcTo(badgeX, badgeY + badgeH, badgeX, badgeY, rr);
    ctx.arcTo(badgeX, badgeY, badgeX + badgeW, badgeY, rr);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(badge, badgeX + badgePad, badgeY + 25);

  // Active/Assisted badge (if provided)
  if (activePercent !== undefined && assistedPercent !== undefined) {
    const activeBadge =
      locale === "en"
        ? `✅ ${activePercent}% active · 🤖 ${assistedPercent}% assisted`
        : `✅ ${activePercent}% aktiv · 🤖 ${assistedPercent}% assistert`;
    const activeBadgeW = ctx.measureText(activeBadge).width + badgePad * 2;
    const activeBadgeY = badgeY + badgeH + 8;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(badgeX, activeBadgeY, activeBadgeW, badgeH, 10);
    } else {
      const rr = 10;
      ctx.moveTo(badgeX + rr, activeBadgeY);
      ctx.arcTo(
        badgeX + activeBadgeW,
        activeBadgeY,
        badgeX + activeBadgeW,
        activeBadgeY + badgeH,
        rr,
      );
      ctx.arcTo(
        badgeX + activeBadgeW,
        activeBadgeY + badgeH,
        badgeX,
        activeBadgeY + badgeH,
        rr,
      );
      ctx.arcTo(badgeX, activeBadgeY + badgeH, badgeX, activeBadgeY, rr);
      ctx.arcTo(badgeX, activeBadgeY, badgeX + activeBadgeW, activeBadgeY, rr);
      ctx.closePath();
    }
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(activeBadge, badgeX + badgePad, activeBadgeY + 25);
  }

  // ── Footer / CTA ──
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(0, H - 58, W, 1);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font =
    "13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  const cta =
    locale === "en"
      ? "How much of your listening translates into royalty value for your artists? → banjohans.github.io/Spotify-Unwrapped"
      : "Kor mykje av lyttinga di gir estimert royalty-verdi til artistane dine? → banjohans.github.io/Spotify-Unwrapped";
  ctx.fillText(cta, W / 2, H - 26);

  // Privacy note
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.font =
    "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(
    locale === "en"
      ? "100% local analysis · No data leaves your browser"
      : "100 % lokal analyse · Ingen data forlet nettlesaren",
    W / 2,
    H - 8,
  );
  ctx.textAlign = "left";

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}

function exportPlannedAlbumsPDF(
  plannedAlbums: Record<string, { artist: string; album: string }>,
  albumPrice: number,
  locale: Locale,
) {
  const entries = Object.values(plannedAlbums).sort(
    (a, b) =>
      a.artist.localeCompare(b.artist) || a.album.localeCompare(b.album),
  );
  const total = entries.length * albumPrice;
  const date = new Date().toLocaleDateString(dateLocale(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const fmtPrice = (n: number) => formatCurrency(n, locale);

  const html = `<!DOCTYPE html>
<html lang="${locale === "no" ? "nn" : "en"}">
<head>
<meta charset="utf-8" />
<title>${t("shoppingListTitle", locale)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; padding: 40px; max-width: 700px; margin: 0 auto; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .date { color: #666; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; border-bottom: 2px solid #ddd; padding: 8px 6px; }
  td { padding: 8px 6px; border-bottom: 1px solid #eee; font-size: 14px; }
  td.price { text-align: right; white-space: nowrap; }
  th.price { text-align: right; }
  .total-row td { border-top: 2px solid #333; border-bottom: none; font-weight: 700; font-size: 15px; padding-top: 12px; }
  .footer { margin-top: 32px; font-size: 11px; color: #999; }
  .intro { font-size: 12px; color: #555; line-height: 1.6; margin-bottom: 20px; border-left: 3px solid #1DB954; padding: 10px 14px; background: #f7fdf9; border-radius: 0 6px 6px 0; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<h1>${t("shoppingListTitle", locale)}</h1>
<p class="date">${date} · ${entries.length} ${t("albumsLabel", locale).toLowerCase()}</p>
<div class="intro">
${
  locale === "en"
    ? "These albums were identified from your Spotify listening data using <b>Spotify Unwrapped</b>. The app analyzes your GDPR data export to estimate which artists you've listened to the most. In Spotify's pro-rata model, your subscription payment enters a shared royalty pool and is distributed according to global listening share, rather than being directly allocated to the artists you personally listen to. Buying music directly from artists or rights holders can provide a more direct financial link between listener and creator. Prices shown are estimates based on a standard album price."
    : "Desse albuma er identifiserte frå Spotify-lyttedataa dine ved hjelp av <b>Spotify Unwrapped</b>. Appen analyserer GDPR-dataeksporten din for å estimere kva artistar du har lytta mest til. I Spotify sin pro-rata-modell går abonnementsbetalinga di inn i ein felles royalty-pott og vert fordelt etter global lyttedel, i staden for å vere direkte allokert til artistane du personleg lyttar til. Å kjøpe musikk direkte frå artistar eller rettshavarar kan gje ein meir direkte økonomisk kopling mellom lyttar og skapar. Prisar er estimat basert på standard albumpris."
}
</div>
<table>
  <thead>
    <tr><th>#</th><th>Artist</th><th>${t("albumsLabel", locale)}</th><th class="price">${t("priceCol", locale)}</th></tr>
  </thead>
  <tbody>
    ${entries
      .map(
        (e, i) =>
          `<tr><td>${i + 1}</td><td>${e.artist}</td><td>${e.album}</td><td class="price">${fmtPrice(albumPrice)}</td></tr>`,
      )
      .join("\n    ")}
    <tr class="total-row"><td></td><td colspan="2">${t("shoppingListTotal", locale)}</td><td class="price">${fmtPrice(total)}</td></tr>
  </tbody>
</table>
<p class="footer">${t("shoppingListGenerated", locale)}</p>
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

function exportFullReportPDF(
  result: import("./lib/analyze").AnalysisResult,
  cfg: import("./lib/analyze").AnalysisConfig,
  subscriptionEstimate: SubscriptionEstimate | null,
  activeDateRange: { label: string } | null,
  excludedArtists: Set<string>,
  plannedAlbums: Record<string, { artist: string; album: string }>,
  maxArtists: number | "all" = 50,
  countOnlyActiveSubscriptionMonths = true,
  locale: Locale = "no",
) {
  const date = new Date().toLocaleDateString(dateLocale(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const fmtH = (ms: number) => formatHrs(ms, locale);
  const fmtK = (n: number) => formatCurrency(n, locale);
  const fmtN = (n: number) => formatNum(n, locale);

  const periodLabel = activeDateRange
    ? activeDateRange.label
    : subscriptionEstimate
      ? `${subscriptionEstimate.firstDate.toLocaleDateString(dateLocale(locale), { year: "numeric", month: "short" })} – ${subscriptionEstimate.lastDate.toLocaleDateString(dateLocale(locale), { year: "numeric", month: "short" })}`
      : locale === "en"
        ? "All data"
        : "Alle data";

  const artistLimit = maxArtists === "all" ? result.artists.length : maxArtists;
  const topArtists = result.artists.slice(0, artistLimit);
  const isAllArtists =
    maxArtists === "all" || artistLimit >= result.artists.length;
  const reportTitle = isAllArtists
    ? locale === "en"
      ? `Complete report – all ${result.artists.length} artists`
      : `Komplett rapport – alle ${result.artists.length} artistar`
    : locale === "en"
      ? `Report – Top ${artistLimit} artists`
      : `Rapport – Topp ${artistLimit} artistar`;
  const allAlbumCount = result.artists.reduce(
    (sum, a) => sum + a.topAlbums.length,
    0,
  );
  const totalValue = result.artists.reduce((sum, a) => sum + a.estValueNOK, 0);

  const plannedEntries = Object.values(plannedAlbums).sort(
    (a, b) =>
      a.artist.localeCompare(b.artist) || a.album.localeCompare(b.album),
  );
  const plannedTotal = plannedEntries.length * cfg.albumPriceNOK;
  const effectiveSubCost = subscriptionEstimate
    ? countOnlyActiveSubscriptionMonths
      ? subscriptionEstimate.activeCost
      : subscriptionEstimate.totalCost
    : 0;
  const effectiveSubMonths = subscriptionEstimate
    ? countOnlyActiveSubscriptionMonths
      ? subscriptionEstimate.activePaidMonths
      : subscriptionEstimate.subscribedMonths
    : 0;
  const effectiveAvgPrice = subscriptionEstimate
    ? countOnlyActiveSubscriptionMonths
      ? subscriptionEstimate.avgMonthlyPrice
      : subscriptionEstimate.spanAvgMonthlyPrice
    : 0;
  const effectiveSubModeLabel = countOnlyActiveSubscriptionMonths
    ? locale === "en"
      ? "active subscription months"
      : "aktive abonnementsmånadar"
    : locale === "en"
      ? "all paid subscription months"
      : "alle betalte abonnementsmånadar";

  const _t = (key: import("./lib/i18n").TKey) => t(key, locale);
  const _of = locale === "en" ? "of" : "av";
  const _totalSuffix = locale === "en" ? "total" : "totalt";
  const _excluded = locale === "en" ? "excluded" : "ekskluderte";
  const _activeMonthsLabel =
    locale === "en" ? "Active months" : "Aktive månadar";
  const _withActivity =
    locale === "en" ? "with listening activity" : "med lytteaktivitet";
  const _avgPriceMo = locale === "en" ? "Avg price/mo" : "Snittpris/mnd";
  const _uniqueAlbumsListened =
    locale === "en" ? "Unique albums listened to" : "Unike album lytta til";
  const _economy = locale === "en" ? "Economy" : "Økonomi";
  const _theoValue =
    locale === "en" ? "Theoretical Spotify value" : "Teoretisk Spotify-verdi";
  const _estSub = countOnlyActiveSubscriptionMonths
    ? t("subActiveOnly", locale)
    : t("estSubFull", locale);
  const _diff = locale === "en" ? "Difference" : "Differanse";
  const _whatMeansTitle =
    locale === "en" ? "What does this mean?" : "Kva betyr dette?";
  const _youPaid =
    locale === "en"
      ? `You paid approx. <b>${fmtK(effectiveSubCost)}</b> in Spotify subscription across <b>${effectiveSubMonths} ${effectiveSubModeLabel}</b>.`
      : `Du har betalt ca. <b>${fmtK(effectiveSubCost)}</b> i Spotify-abonnement over <b>${effectiveSubMonths} ${effectiveSubModeLabel}</b>.`;
  const _theoArtistValue =
    locale === "en"
      ? `The estimated royalty value associated with your listening activity is <b>${fmtK(totalValue)}</b>.`
      : `Den estimerte royalty-verdien knytt til lytteaktiviteten din er <b>${fmtK(totalValue)}</b>.`;
  const _allArtists =
    locale === "en"
      ? `All ${topArtists.length} artists`
      : `Alle ${topArtists.length} artistar`;
  const _topArtists =
    locale === "en"
      ? `Top ${topArtists.length} artists`
      : `Topp ${topArtists.length} artistar`;
  const _listeningTime = locale === "en" ? "Listening time" : "Lyttetid";
  const _theorVal = locale === "en" ? "Theor. value" : "Teor. verdi";
  const _albumEq = locale === "en" ? "Album eq." : "Album-ekv.";
  const _totalWord = locale === "en" ? "Total" : "Totalt";
  const _artists = locale === "en" ? "artists" : "artistar";
  const _showingTopOf =
    locale === "en"
      ? `Showing top ${topArtists.length} of ${result.artists.length} artists. Export "All" for complete overview.`
      : `Viser topp ${topArtists.length} av ${result.artists.length} artistar. Eksporter "Alle" for komplett oversikt.`;
  const _purchasePlan =
    locale === "en" ? "Purchase plan – Albums" : "Kjøpsplan – Album";
  const _albumsPlanned = locale === "en" ? "albums planned" : "album planlagt";
  const _price = locale === "en" ? "Price" : "Pris";
  const _methodology =
    locale === "en"
      ? "How the model works &amp; disclaimer"
      : "Korleis modellen fungerer &amp; disclaimer";
  const _minSec = (cfg.minMsPlayedToCount / 1000).toFixed(0);
  const _albumPriceFmt = fmtK(cfg.albumPriceNOK);
  const _country = locale === "en" ? "USA" : "Noreg";
  const _currUnit = locale === "en" ? "USD" : "NOK";
  const _methodIntro =
    locale === "en"
      ? "Because Spotify does not publish financial data at the listener level, this report uses data from Spotify's GDPR export and estimates the economic value of your listening using publicly available industry data."
      : "Fordi Spotify ikkje publiserer økonomiske data på lyttarnivå, brukar denne rapporten data frå Spotify sin GDPR-eksport og estimerer den økonomiske verdien av lyttinga di ved hjelp av offentleg tilgjengelege bransjedata.";
  const _methodIntroRebuttal =
    locale === "en"
      ? "It is a common claim that you cannot calculate per-stream values to see what artists earn — but it is entirely possible to retrospectively compute a theoretical value based on figures Spotify itself has published."
      : "Det er ein vanleg forklaring at ein ikkje kan rekne ut straumeverdier for å sjå kva artistar tener — men det er fullt mogleg å retrospektivt utrekne ein teoretisk verdi basert på tal Spotify sjølv har publisert.";
  const _methodSteps =
    locale === "en"
      ? [
          `<b>1. Data filtering:</b> Plays shorter than ${_minSec} seconds are removed. Spotify states 30 sec is the threshold for an official "stream." This excludes test plays, skips, and accidental clicks.`,
          `<b>2. Estimated royalty value:</b> Historical average per-stream royalty rates (${_currUnit}) are applied to each qualifying play, based on industry data from The Trichordist, Soundcharts, and others. Rates differ by time period (see settings). The value is <i>theoretical</i> – it approximates what Spotify adds to the shared pool based on your habits. The estimate thus illustrates approximately how much value your listening may have generated in the system.`,
          `<b>3. Subscription cost:</b> Defaults to Premium Individual pricing (${_country}), verified via Wayback Machine. In Settings you can choose whether to count only paid months with actual listening activity, or all paid months in the selected period. Spotify's GDPR export does <i>not</i> include payment history or subscription type (<code>Payments.json</code> is empty). Users can select their subscription type in Settings — available options are Individual, Student, Duo, Family, and Free — and define which periods they had each type. Prices are automatically adjusted based on the selection and historical price changes.`,
          `<b>4. Artist aggregation:</b> For each artist: total listening time, estimated royalty value, album distribution, and stream count are summed. "Album equivalent" = estimated streaming value ÷ album price (${_albumPriceFmt}). This provides an overview of how your listening is distributed across artists and catalogs.`,
        ]
      : [
          `<b>1. Filtrering av data:</b> Avspelingar kortare enn ${_minSec} sekund vert fjerna. Spotify har sagt at 30 sek er grensa for ein offisiell «stream». Dette hindrar prøvespeling, hopping og tilfeldige klikk.`,
          `<b>2. Estimert royalty-verdi:</b> Historiske gjennomsnittssatsar (${_currUnit}/stream) vert brukt per kvalifiserande avspeling, basert på bransjedata frå m.a. The Trichordist og Soundcharts. Satsane er ulike for kvart tidsrom (sjå innstillingar). Verdien er <i>teoretisk</i> – den viser omtrent kva Spotify ville lagt i den felles poolen basert på dine lyttevanar. Estimatet illustrerer dermed omtrent kor mykje verdi lyttinga di kan ha generert i systemet.`,
          `<b>3. Abonnementskostnad:</b> Standard er Premium Individual (${_country}), verifisert via Wayback Machine. I innstillingane kan du velje om modellen berre skal telle betalte månadar med faktisk lytteaktivitet, eller alle betalte månadar i den valde perioden. Spotify sin GDPR-eksport har <i>ikkje</i> betalingshistorikk eller abonnementstype (<code>Payments.json</code> er tom). Brukaren kan velje abonnementstype i innstillingane — tilgjengelege alternativ er Individual, Student, Duo, Family og Free — og definere kva periodar ein har hatt kvar type. Prisane vert justerte automatisk basert på valet og historiske prisendringar.`,
          `<b>4. Artistaggregering:</b> For kvar artist: total lyttetid, estimert royalty-verdi, albumfordeling og tal på streams vert summert. «Album-ekvivalent» = estimert strøymeverdi ÷ albumpris (${_albumPriceFmt}). Dette gir eit oversyn over korleis lyttinga di fordeler seg på tvers av artistar og katalogar.`,
        ];
  const _methodCaveats =
    locale === "en"
      ? [
          "This is an <b>estimation model</b>. Spotify does not publish actual royalty payouts per user.",
          'Spotify uses a <b>"StreamShare" (pro-rata) model</b>: all subscription revenue goes into a shared pool distributed by each artist\'s share of <i>total</i> platform streams. Your subscription payment is not directly allocated to the artists you personally listen to.',
          "Because revenue is distributed according to global streaming volume, the system tends to favour high-volume content over individual listener preferences.",
          "Rates vary by country, subscription type, and platform activity. These figures represent a <i>reasonable average</i>, not exact payouts.",
          "For those following the debate about background music and the EU's DSM Directive (e.g. in collecting societies like TONO), this is part of a larger issue: Listening music loses ground in royalty distribution, while background music receives a disproportionate share of the revenue pool.",
          "<b>Label lookup</b> uses MusicBrainz and Discogs (community-driven, may be incomplete). The major/indie classification is approximate.",
          "<b>Inferences and Marquee</b> data reflects Spotify's internal categorizations. Unwrapped displays but does not interpret this data.",
          "<b>Listening pattern</b> classification (active vs. assisted) is based on Spotify's <code>reason_start</code> field in the GDPR data.",
          "From 2024, Spotify requires a track to have <b>at least 1,000 streams per year</b> to generate royalty income. This model does not account for this threshold.",
          "The figures in this analysis show estimated <b>gross</b> royalty value – not what the artist actually receives. Streaming revenue flows to the entire <b>value chain</b> behind a recording: labels, distributors, producers, session musicians, mixing and mastering engineers, and other rights holders. The actual amount reaching the songwriter or performer is a fraction of the gross total. This also means the system economically favours music that can be produced with few contributors, since traditional production involving many participants results in each individual receiving an ever-smaller share of an already low sum.",
        ]
      : [
          "Dette er ein <b>estimatmodell</b>. Spotify publiserer ikkje faktiske royalty-utbetalingar per brukar.",
          "Spotify bruker ein <b>«StreamShare» (pro-rata)</b>-modell: alle abonnementsinntekter går i ein felles pott fordelt etter kvar artist sin andel av <i>totale</i> streams. Abonnementspengane dine vert ikkje direkte allokert til artistane du personleg lyttar til.",
          "Fordi inntektene vert fordelt etter globalt lyttevolum, favoriserer systemet innhald med høgt avspelingsvolum framfor individuelle lyttarpreferansar.",
          "Satsar varierer med land, abonnementstype og plattformaktivitet. Tala gir eit <i>rimeleg gjennomsnittsbilete</i>, ikkje eksakte utbetalingar.",
          "For dei som følgjer debatten om bakgrunnsmusikk og EU sitt DSM-direktiv (t.d. i TONO), er dette ein del av ein større problematikk: Lyttemusikk taper terreng i fordeling av vederlag, medan bakgrunnsmusikk får ein uforholdsmessig stor del av inntektspotten.",
          "<b>Plateselskap-oppslag</b> nyttar MusicBrainz og Discogs (samfunnsdrivne, kan vere ufullstendige). Klassifiseringa major/indie er tilnærma.",
          "<b>Inferences og Marquee</b>-data reflekterer Spotify sine interne kategoriseringar. Unwrapped viser, men tolkar ikkje desse dataene.",
          "<b>Lyttemønster</b>-klassifiseringa (aktiv vs. assistert) er basert på <code>reason_start</code>-feltet i Spotify sin GDPR-data.",
          "Frå 2024 krev Spotify at ein song må ha <b>minst 1 000 streams per år</b> for å generere royalties. Denne modellen tek ikkje høgde for denne grensa.",
          "Tala i denne analysen viser estimert <b>brutto</b> royalty-verdi – ikkje kva artisten faktisk mottek. Inntektene frå streaming går til heile <b>verdikjeda</b> bak opptaket: plateselskap, distributørar, produsentar, studiomusikerar, miks- og masteringteknikarar og andre rettshavarar. Det reelle beløpet som når fram til songskrivaren eller utøvaren er i praksis ein brøkdel av bruttotalet. Dette inneber også at systemet økonomisk favoriserer musikk som kan lagast med få medverkande, sidan tradisjonell produksjon med mange involverte fører til at kvar enkelt mottek ein stadig mindre del av ein allereie låg sum.",
        ];
  const _methodPurpose =
    locale === "en"
      ? "This report illustrates how Spotify's pro-rata royalty model disconnects individual subscription payments from individual listening behaviour – and that buying music directly from artists or rights holders can provide a more direct financial link between listener and creator."
      : "Denne rapporten illustrerer korleis Spotify sin pro-rata royalty-modell koplar individuelle abonnementsbetalingar frå individuell lytteåtferd – og at å kjøpe musikk direkte frå artistar eller rettshavarar kan gje ein meir direkte økonomisk kopling mellom lyttar og skapar.";
  const _methodSolution =
    locale === "en"
      ? "A possible further development is to make visible to consumers how their subscription payments are distributed in a pro-rata system – so that more people can make informed choices about how they support the music they care about."
      : "Ei mogleg vidare utvikling er å synleggjere for forbrukarane korleis abonnementspengane deira vert fordelt i eit pro-rata-system – slik at fleire kan ta informerte val om korleis dei støttar musikken dei bryr seg om.";
  const _methodStudies =
    locale === "en"
      ? [
          'Pedersen (2020): "A Meta Study of User-Centric Distribution" – Koda / Roskilde University',
          'CNM / Deloitte (2021): "User Centric Payment System (UCPS)" – Centre national de la musique, France',
          'Bergantiños & Moreno-Ternero (2025): "Revenue Sharing at Music Streaming Platforms" – Management Science 71(10)',
          "Muikku (2017): Digital Media Finland – User-centric distribution simulation",
          "Spotify Loud & Clear (2024): loudandclear.byspotify.com",
          "FIM (2018): Comparison of pro-rata and user-centric distribution",
          'Nordgård (2018): "The Music Business and Digital Impacts" – University of Agder / Springer',
          'Yu (2026): "On click-fraud under pro-rata revenue sharing rule" – arXiv:2601.09573',
        ]
      : [
          "Pedersen (2020): «A Meta Study of User-Centric Distribution» – Koda / Roskilde Universitet",
          "CNM / Deloitte (2021): «User Centric Payment System (UCPS)» – Centre national de la musique, Frankrike",
          "Bergantiños & Moreno-Ternero (2025): «Revenue Sharing at Music Streaming Platforms» – Management Science 71(10)",
          "Muikku (2017): Digital Media Finland – Simulering av brukarsentrert fordeling",
          "Spotify Loud & Clear (2024): loudandclear.byspotify.com",
          "FIM (2018): Samanlikning av pro-rata og brukarsentrert fordeling",
          "Nordgård (2018): «The Music Business and Digital Impacts» – Universitetet i Agder / Springer",
          "Yu (2026): «On click-fraud under pro-rata revenue sharing rule» – arXiv:2601.09573",
        ];
  const _methodPrivacy =
    locale === "en"
      ? "🔒 All analysis runs 100% locally in the browser. No data is sent to any server, stored, or shared with anyone."
      : "🔒 All analyse skjer 100 % lokalt i nettlesaren. Ingen data vert sendt til nokon server, lagra, eller delt med nokon.";
  const _genFrom = locale === "en" ? "Generated from" : "Generert frå";
  const _localNote =
    locale === "en"
      ? "All analysis runs locally in the browser. No data is sent or stored."
      : "All analyse skjer lokalt i nettlesaren. Ingen data vert sendt eller lagra.";

  const html = `<!DOCTYPE html>
<html lang="${locale === "no" ? "nn" : "en"}">
<head>
<meta charset="utf-8" />
<title>Spotify Unwrapped – ${reportTitle}</title>
<style>
  @page { margin: 30px 40px; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    color: #1a1a1a; padding: 40px; max-width: 900px; margin: 0 auto;
    font-size: 13px; line-height: 1.5;
  }

  /* Header */
  .report-header {
    text-align: center; margin-bottom: 32px;
    border-bottom: 3px solid #1DB954; padding-bottom: 20px;
  }
  .report-header h1 { font-size: 26px; margin-bottom: 2px; letter-spacing: -0.5px; }
  .report-header .subtitle { font-size: 14px; color: #666; margin-bottom: 4px; }
  .report-header .period { font-size: 12px; color: #999; }

  /* Sections */
  .section { margin-bottom: 28px; page-break-inside: avoid; }
  .section h2 {
    font-size: 16px; color: #1DB954; margin-bottom: 10px;
    border-bottom: 1px solid #e0e0e0; padding-bottom: 4px;
    text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;
  }

  /* Stats grid */
  .stats-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 12px; margin-bottom: 16px;
  }
  .stat-box {
    background: #f8f9fa; border-radius: 8px; padding: 14px 16px;
    text-align: center;
  }
  .stat-box .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 2px; }
  .stat-box .value { font-size: 20px; font-weight: 700; color: #1a1a1a; }
  .stat-box .hint { font-size: 11px; color: #999; }

  /* Financial summary */
  .finance-grid {
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    gap: 0; border: 2px solid #e0e0e0; border-radius: 10px; overflow: hidden;
    margin-bottom: 16px;
  }
  .finance-box { padding: 16px; text-align: center; border-right: 1px solid #e0e0e0; }
  .finance-box:last-child { border-right: none; }
  .finance-box .label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.3px; }
  .finance-box .value { font-size: 22px; font-weight: 800; margin-top: 4px; }
  .finance-box .value.green { color: #1DB954; }
  .finance-box .value.red { color: #ef4444; }
  .finance-box .value.neutral { color: #333; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; }
  th {
    text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;
    color: #888; border-bottom: 2px solid #ddd; padding: 6px 8px; font-weight: 700;
  }
  td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; }
  tr:nth-child(even) { background: #fafafa; }
  .rank { color: #bbb; font-size: 11px; width: 30px; }
  .right { text-align: right; }
  .bold { font-weight: 700; }
  .total-row td { border-top: 2px solid #333; border-bottom: none; font-weight: 700; padding-top: 10px; }

  /* Small info boxes */
  .info-box {
    background: #f0faf4; border-left: 4px solid #1DB954; padding: 12px 16px;
    border-radius: 0 6px 6px 0; margin-bottom: 16px; font-size: 12px; color: #444;
  }
  .info-box b { color: #1a1a1a; }

  /* Planned albums */
  .planned-header {
    display: flex; justify-content: space-between; align-items: baseline;
    margin-bottom: 8px;
  }
  .planned-header .count { font-size: 13px; color: #1DB954; font-weight: 700; }

  /* Footer */
  .report-footer {
    margin-top: 40px; padding-top: 16px;
    border-top: 1px solid #ddd; font-size: 10px; color: #999;
    text-align: center;
  }

  /* Methodology */
  .methodology { font-size: 11px; color: #666; line-height: 1.6; }
  .methodology li { margin-bottom: 4px; }
  .methodology h3 { page-break-after: avoid; }
  .methodology p { margin-bottom: 6px; }

  /* Report preamble */
  .preamble {
    font-size: 12px; color: #555; line-height: 1.6; margin-bottom: 24px;
    border-left: 4px solid #1DB954; padding: 12px 16px; background: #f7fdf9;
    border-radius: 0 6px 6px 0;
  }

  @media print {
    body { padding: 20px; }
    .section { page-break-inside: avoid; }
    .artist-table { page-break-inside: auto; }
    .artist-table tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="report-header">
  <h1>🎵 Spotify Unwrapped</h1>
  <p class="subtitle">${reportTitle}</p>
  <p class="period">${periodLabel} · ${locale === "en" ? "Generated" : "Generert"} ${date}</p>
</div>

<div class="preamble">
${
  locale === "en"
    ? "This report was generated from your personal Spotify GDPR data export. All analysis runs locally in your browser — no data is sent or stored anywhere. The figures are <b>theoretical estimates</b> based on historical per-stream royalty rates and subscription pricing. Spotify uses a pro-rata pooling model, where your subscription payment enters a shared royalty pool and is distributed according to global listening share, rather than being directly allocated to the artists you personally listen to. This report illustrates that disconnect and explores more direct forms of artist support."
    : "Denne rapporten er generert frå din personlege Spotify GDPR-dataeksport. All analyse skjer lokalt i nettlesaren — ingen data vert sendt eller lagra. Tala er <b>teoretiske estimat</b> basert på historiske royalty-satsar per stream og abonnementsprisar. Spotify bruker ein pro-rata-modell der abonnementsbetalinga di går inn i ein felles royalty-pott og vert fordelt etter global lyttedel, i staden for å vere direkte allokert til artistane du personleg lyttar til. Denne rapporten illustrerer denne fråkoplinga og utforskar meir direkte former for artiststøtte."
}
</div>

<div class="section">
  <h2>${_t("rowsAnalyzed").split(" ")[0] === "Rows" ? "Summary" : "Samandrag"}</h2>
  <div class="stats-grid">
    <div class="stat-box">
      <div class="label">${_t("totalListeningTime")}</div>
      <div class="value">${fmtH(result.totalMsPlayed)}</div>
    </div>
    <div class="stat-box">
      <div class="label">${_t("rowsAnalyzed")}</div>
      <div class="value">${fmtN(result.countedRows)}</div>
      <div class="hint">${_of} ${fmtN(result.totalRows)} ${_totalSuffix}</div>
    </div>
    <div class="stat-box">
      <div class="label">${_t("uniqueArtists")}</div>
      <div class="value">${fmtN(result.artists.length)}</div>
      ${excludedArtists.size > 0 ? `<div class="hint">${excludedArtists.size} ${_excluded}</div>` : ""}
    </div>
  </div>

  ${
    subscriptionEstimate
      ? `
  <div class="stats-grid">
    <div class="stat-box">
      <div class="label">${_activeMonthsLabel}</div>
      <div class="value">${subscriptionEstimate.activeMonths}</div>
      <div class="hint">${_withActivity}</div>
    </div>
    <div class="stat-box">
      <div class="label">${_avgPriceMo}</div>
      <div class="value">${fmtK(effectiveAvgPrice)}</div>
    </div>
    <div class="stat-box">
      <div class="label">${_uniqueAlbumsListened}</div>
      <div class="value">${fmtN(allAlbumCount)}</div>
    </div>
  </div>`
      : ""
  }
</div>

${
  subscriptionEstimate
    ? `
<div class="section">
  <h2>${_economy}</h2>
  <div class="finance-grid">
    <div class="finance-box">
      <div class="label">${_theoValue}</div>
      <div class="value green">${fmtK(totalValue)}</div>
    </div>
    <div class="finance-box">
      <div class="label">${_estSub}</div>
      <div class="value neutral">${fmtK(effectiveSubCost)}</div>
    </div>
    <div class="finance-box">
      <div class="label">${_diff}</div>
      <div class="value ${effectiveSubCost - totalValue > 0 ? "red" : "green"}">
        ${fmtK(effectiveSubCost - totalValue)}
      </div>
    </div>
  </div>
  <div class="info-box">
    <b>${_whatMeansTitle}</b> ${_youPaid}
    ${_theoArtistValue}
    ${locale === "en" ? "The difference" : "Differansen"} (${fmtK(effectiveSubCost - totalValue)}) ${locale === "en" ? "reflects the gap between your estimated listening-based royalty value and your subscription payment within Spotify\u2019s pooled royalty system" : "viser differansen mellom den estimerte royalty-verdien frå lyttinga di og abonnementsbetalinga di i Spotify sitt pro-rata-system"}.
  </div>
</div>`
    : ""
}

<div class="section">
  <h2>${locale === "en" ? "Listening Patterns" : "Lyttemønster"}</h2>
  <div class="stats-grid">
    <div class="stat-box">
      <div class="label">${locale === "en" ? "Active listening" : "Aktiv lytting"}</div>
      <div class="value" style="color:#1DB954">${Math.round(result.activeShare * 100)}%</div>
      <div class="hint">${fmtH(result.activeMsPlayed)}</div>
    </div>
    <div class="stat-box">
      <div class="label">${locale === "en" ? "Assisted listening" : "Assistert lytting"}</div>
      <div class="value" style="color:#ee5a24">${Math.round(result.passiveShare * 100)}%</div>
      <div class="hint">${fmtH(result.passiveMsPlayed)}</div>
    </div>
    <div class="stat-box">
      <div class="label">${locale === "en" ? "Unknown" : "Ukjent"}</div>
      <div class="value" style="color:#888">${Math.round(result.unknownShare * 100)}%</div>
      <div class="hint">${fmtH(result.unknownMsPlayed)}</div>
    </div>
  </div>
  <div class="info-box">
    ${
      locale === "en"
        ? `<b>Active listening</b> means you explicitly chose to play the music (play button, search, direct selection). <b>Assisted listening</b> includes auto-played content, algorithm suggestions, and background plays where Spotify chose the music for you.`
        : `<b>Aktiv lytting</b> betyr at du eksplisitt valde å spele musikken (play-knapp, søk, direkte val). <b>Assistert lytting</b> inkluderer automatisk avspelt innhald, algoritmeforslag og bakgrunnsavspelingar der Spotify valde musikken for deg.`
    }
  </div>
</div>

<div class="section">
  <h2>${isAllArtists ? _allArtists : _topArtists}</h2>
  <table class="artist-table">
    <thead>
      <tr>
        <th class="rank">#</th>
        <th>Artist</th>
        <th class="right">${_listeningTime}</th>
        <th class="right">Streams</th>
        <th class="right">${_theorVal}</th>
        <th class="right">${_albumEq}</th>
      </tr>
    </thead>
    <tbody>
      ${topArtists
        .map(
          (a, i) =>
            `<tr>
          <td class="rank">${i + 1}</td>
          <td class="bold">${a.artist}</td>
          <td class="right">${fmtH(a.msPlayed)}</td>
          <td class="right">${fmtN(a.estStreams)}</td>
          <td class="right">${fmtK(a.estValueNOK)}</td>
          <td class="right">${a.albumEquivalent.toFixed(2)}</td>
        </tr>`,
        )
        .join("\n      ")}
      <tr class="total-row">
        <td></td>
        <td>${_totalWord} (${result.artists.length} ${_artists})</td>
        <td class="right">${fmtH(result.countedMsPlayed)}</td>
        <td class="right">${fmtN(result.countedRows)}</td>
        <td class="right">${fmtK(totalValue)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>
  ${!isAllArtists && topArtists.length < result.artists.length ? `<p style="font-size:11px;color:#999;">${_showingTopOf}</p>` : ""}
</div>

${
  plannedEntries.length > 0
    ? `
<div class="section">
  <h2>${_purchasePlan}</h2>
  <div class="planned-header">
    <span>${plannedEntries.length} ${_albumsPlanned}</span>
    <span class="count">${fmtK(plannedTotal)}</span>
  </div>
  <table>
    <thead>
      <tr><th>#</th><th>Artist</th><th>${_t("albumsLabel")}</th><th class="right">${_price}</th></tr>
    </thead>
    <tbody>
      ${plannedEntries
        .map(
          (e, i) =>
            `<tr><td>${i + 1}</td><td>${e.artist}</td><td>${e.album}</td><td class="right">${fmtK(cfg.albumPriceNOK)}</td></tr>`,
        )
        .join("\n      ")}
      <tr class="total-row"><td></td><td colspan="2">${_totalWord}</td><td class="right">${fmtK(plannedTotal)}</td></tr>
    </tbody>
  </table>
</div>`
    : ""
}

<div class="section">
  <h2>${_methodology}</h2>
  <div class="methodology">
    <p>${_methodIntro}</p>
    <p><strong>${_methodIntroRebuttal}</strong></p>
    <ul>
      ${_methodSteps.map((item) => `<li>${item}</li>`).join("\n      ")}
    </ul>
    <h3 style="margin-top:14px;font-size:13px;color:#333;">${locale === "en" ? "Important caveats" : "Viktige atterhald"}</h3>
    <ul>
      ${_methodCaveats.map((item) => `<li>${item}</li>`).join("\n      ")}
    </ul>
    <p style="margin-top:10px;">${_methodPurpose}</p>
    <p style="margin-top:6px;">${_methodSolution}</p>
    <h3 style="margin-top:14px;font-size:13px;color:#333;">${locale === "en" ? "Key studies" : "Sentrale studiar"}</h3>
    <ul style="font-size:11px;">
      ${_methodStudies.map((s) => `<li>${s}</li>`).join("\n      ")}
    </ul>
    <p style="margin-top:8px;font-style:italic;">${_methodPrivacy}</p>
  </div>
</div>

<div class="report-footer">
  <p>${_genFrom} <b>Spotify Unwrapped</b> · banjohans.github.io/Spotify-Unwrapped</p>
  <p>${_localNote}</p>
</div>

<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

function uniqAlbumKeysFromArtists(
  artists: Array<{ artist: string; topAlbums: Array<{ album: string }> }>,
) {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const a of artists) {
    for (const al of a.topAlbums ?? []) {
      const key = albumKey(a.artist, al.album);
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
  }
  return keys;
}

export default function App() {
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{
      name: string;
      rowCount: number;
      rows: SpotifyStreamRow[];
    }>
  >([]);
  const [rows, setRows] = useState<SpotifyStreamRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [excludedArtists, setExcludedArtists] = useState<Set<string>>(
    new Set(),
  );

  const [plannedAlbums, setPlannedAlbums] = useState<
    Record<string, { artist: string; album: string }>
  >({});
  const [plannedAlbumsOpen, setPlannedAlbumsOpen] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [studiesOpen, setStudiesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [methodologyInfoOpen, setMethodologyInfoOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>("no");
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [appView, setAppView] = useState<"industry" | "mydata" | "case">(
    "mydata",
  );

  // Extra Spotify data files
  const [inferences, setInferences] = useState<string[]>([]);
  const [marqueeArtists, setMarqueeArtists] = useState<
    Array<{ artistName: string; segment: string }>
  >([]);
  const [userdata, setUserdata] = useState<{
    username?: string;
    country?: string;
    creationTime?: string;
    gender?: string;
  } | null>(null);
  const [fileGuideOpen, setFileGuideOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contribGender, setContribGender] = useState(0);
  const [contribAge, setContribAge] = useState(0);
  const [contribSocial, setContribSocial] = useState(0);
  const [contribCountry, setContribCountry] = useState("");
  const [contribConsent, setContribConsent] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaChallenge] = useState(() => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    return { a, b, answer: a + b };
  });

  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [artistDetailSort, setArtistDetailSort] = useState<"time" | "tracks">(
    "time",
  );
  const [artistSearchQuery, setArtistSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(30);
  const paginationRef = useRef<HTMLDivElement>(null);

  // Helper to scroll to pagination after page change
  const scrollToPagination = () => {
    setTimeout(() => {
      paginationRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 10);
  };
  const [summaryTopN, setSummaryTopN] = useState<number | "all">(30);
  const [expandedAlbumArtists, setExpandedAlbumArtists] = useState<Set<string>>(
    new Set(),
  );

  // Date filter
  const [dateFilterMode, setDateFilterMode] = useState<
    "all" | "year" | "custom"
  >("all");
  const [dateFilterYear, setDateFilterYear] = useState<number | null>(null);
  const [dateFilterStart, setDateFilterStart] = useState<string>("");
  const [dateFilterEnd, setDateFilterEnd] = useState<string>("");

  // Subscription segments with localStorage persistence
  const [subscriptionSegments, setSubscriptionSegments] = useState<
    SubscriptionSegment[]
  >(() => {
    try {
      const saved = localStorage.getItem("spotify-sub-segments");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem(
      "spotify-sub-segments",
      JSON.stringify(subscriptionSegments),
    );
  }, [subscriptionSegments]);

  const [
    countOnlyActiveSubscriptionMonths,
    setCountOnlyActiveSubscriptionMonths,
  ] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("spotify-sub-active-only");
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  useEffect(() => {
    localStorage.setItem(
      "spotify-sub-active-only",
      JSON.stringify(countOnlyActiveSubscriptionMonths),
    );
  }, [countOnlyActiveSubscriptionMonths]);

  const [cfg, setCfg] = useState<AnalysisConfig>({
    albumPriceNOK: DEFAULT_ALBUM_PRICE["no"],
    minMsPlayedToCount: 30_000,
    sessionGapSeconds: 60,
    locale: "no",
  });

  // Sync locale into cfg whenever it changes
  useEffect(() => {
    setCfg((prev) => ({
      ...prev,
      locale,
      albumPriceNOK: DEFAULT_ALBUM_PRICE[locale],
      subscriptionSegments,
    }));
  }, [locale, subscriptionSegments]);

  /**
   * Convert Level 1 streaming history rows (endTime, artistName, trackName, msPlayed)
   * to the extended SpotifyStreamRow format used by analyze().
   */
  function convertLevel1Row(row: {
    endTime?: string;
    artistName?: string;
    trackName?: string;
    msPlayed?: number;
  }): SpotifyStreamRow {
    // endTime is "YYYY-MM-DD HH:mm" — convert to ISO
    let ts: string | undefined;
    if (row.endTime) {
      const d = new Date(row.endTime.replace(" ", "T") + ":00Z");
      if (!isNaN(d.getTime())) ts = d.toISOString();
    }
    return {
      ts,
      ms_played: row.msPlayed ?? 0,
      master_metadata_album_artist_name: row.artistName ?? undefined,
      master_metadata_track_name: row.trackName ?? undefined,
      // No album, reason_start, etc. in Level 1 data
    };
  }

  /**
   * Convert an anonymized export row back to SpotifyStreamRow format.
   */
  function convertAnonRow(row: {
    ts?: string | null;
    ms_played?: number;
    artist?: string | null;
    album?: string | null;
    track?: string | null;
    reason_start?: string | null;
    reason_end?: string | null;
    shuffle?: boolean | null;
    skipped?: boolean | null;
  }): SpotifyStreamRow {
    return {
      ts: row.ts ?? undefined,
      ms_played: row.ms_played ?? 0,
      master_metadata_album_artist_name: row.artist ?? undefined,
      master_metadata_album_album_name: row.album ?? undefined,
      master_metadata_track_name: row.track ?? undefined,
      reason_start: row.reason_start ?? undefined,
      reason_end: row.reason_end ?? undefined,
      shuffle: row.shuffle ?? undefined,
      skipped: row.skipped ?? undefined,
    };
  }

  async function onFiles(files: FileList | null) {
    setErr(null);
    if (!files || files.length === 0) return;

    const newFiles: Array<{
      name: string;
      rowCount: number;
      rows: SpotifyStreamRow[];
    }> = [];

    try {
      for (const f of Array.from(files)) {
        const text = await f.text();
        const json = JSON.parse(text);
        const nameLower = f.name.toLowerCase();

        // ── Handle special non-streaming files ──
        if (nameLower === "inferences.json") {
          if (json && Array.isArray(json.inferences)) {
            setInferences(json.inferences);
          }
          continue;
        }
        if (nameLower === "marquee.json") {
          if (Array.isArray(json)) {
            setMarqueeArtists(json);
          }
          continue;
        }
        if (nameLower === "userdata.json") {
          if (json && typeof json === "object" && !Array.isArray(json)) {
            setUserdata(json);
          }
          continue;
        }

        // ── Anonymized export files (spotify-unwrapped-anon-*.json) ──
        if (
          json &&
          typeof json === "object" &&
          !Array.isArray(json) &&
          "version" in json &&
          "pseudoId" in json &&
          Array.isArray(json.rows)
        ) {
          const rows: SpotifyStreamRow[] = json.rows.map(convertAnonRow);
          newFiles.push({
            name: f.name,
            rowCount: rows.length,
            rows,
          });
          continue;
        }

        // ── Streaming history files ──
        if (!Array.isArray(json)) {
          throw new Error(
            `Fila ${f.name} var ikkje ei liste (array) av rader.`,
          );
        }

        // Detect Level 1 format (endTime + artistName) and convert
        const isLevel1 =
          json.length > 0 &&
          "endTime" in json[0] &&
          "artistName" in json[0] &&
          !("ts" in json[0]) &&
          !("master_metadata_track_name" in json[0]);

        const rows: SpotifyStreamRow[] = isLevel1
          ? json.map(convertLevel1Row)
          : (json as SpotifyStreamRow[]);

        newFiles.push({
          name: f.name,
          rowCount: rows.length,
          rows,
        });
      }

      // Legg til nye filer (ikkje duplikater)
      setUploadedFiles((prev) => {
        const existing = new Set(prev.map((f) => f.name));
        const toAdd = newFiles.filter((f) => !existing.has(f.name));
        return [...prev, ...toAdd];
      });
    } catch (e: any) {
      setErr(e?.message ?? "Ukjend feil ved lesing av filer.");
    }
  }

  // Oppdater rows når uploadedFiles endrer seg — dedupliser overlapp mellom
  // Extended (Streaming_History_Audio_*) og Level 1 (StreamingHistory_music_*)
  useEffect(() => {
    const allRows = uploadedFiles.flatMap((f) => f.rows);
    const seen = new Map<string, SpotifyStreamRow>();
    for (const r of allRows) {
      const key = `${r.ts ?? ""}|${r.master_metadata_album_artist_name ?? ""}|${r.master_metadata_track_name ?? ""}|${r.ms_played ?? 0}`;
      const existing = seen.get(key);
      // Prefer extended rows (they have reason_start, album, etc.)
      if (!existing || (!existing.reason_start && r.reason_start)) {
        seen.set(key, r);
      }
    }
    setRows(Array.from(seen.values()));
  }, [uploadedFiles]);

  // Available years from data
  const availableYears = useMemo(() => {
    if (!rows.length) return [];
    const years = new Set<number>();
    for (const r of rows) {
      if (r.ts) {
        const d = new Date(r.ts);
        if (!isNaN(d.getTime())) years.add(d.getFullYear());
      }
    }
    return Array.from(years).sort();
  }, [rows]);

  // Date range for display
  const activeDateRange = useMemo(() => {
    if (dateFilterMode === "year" && dateFilterYear) {
      return {
        label: `${dateFilterYear}`,
        start: new Date(dateFilterYear, 0, 1),
        end: new Date(dateFilterYear, 11, 31, 23, 59, 59),
      };
    }
    if (dateFilterMode === "custom" && dateFilterStart && dateFilterEnd) {
      return {
        label: `${dateFilterStart} – ${dateFilterEnd}`,
        start: new Date(dateFilterStart),
        end: new Date(dateFilterEnd + "T23:59:59"),
      };
    }
    return null;
  }, [dateFilterMode, dateFilterYear, dateFilterStart, dateFilterEnd]);

  // Apply date filter first, then artist exclusion
  const dateFilteredRows = useMemo(() => {
    if (!rows.length) return [];
    if (!activeDateRange) return rows;
    const { start, end } = activeDateRange;
    return rows.filter((r) => {
      if (!r.ts) return false;
      const d = new Date(r.ts);
      return !isNaN(d.getTime()) && d >= start && d <= end;
    });
  }, [rows, activeDateRange]);

  const filteredRows = useMemo(() => {
    if (!dateFilteredRows.length) return [];
    if (excludedArtists.size === 0) return dateFilteredRows;
    return dateFilteredRows.filter((row) => {
      const artist = row.master_metadata_album_artist_name;
      return !artist || !excludedArtists.has(artist);
    });
  }, [dateFilteredRows, excludedArtists]);

  const result = useMemo(() => {
    if (!filteredRows.length) return null;
    return analyze(filteredRows, cfg);
  }, [filteredRows, cfg]);

  const filteredArtists = useMemo(() => {
    if (!result) return [];
    return result.artists;
  }, [result]);

  // Total theoretical value for ALL artists (not just shown page)
  const totalAllArtistsValue = useMemo(() => {
    if (!filteredArtists.length) return 0;
    return filteredArtists.reduce((sum, a) => sum + a.estValueNOK, 0);
  }, [filteredArtists]);

  const subscriptionEstimate = useMemo<SubscriptionEstimate | null>(() => {
    if (!dateFilteredRows.length) return null;

    const dates = dateFilteredRows
      .map((r) => r.ts)
      .filter(Boolean)
      .map((ts) => new Date(ts!))
      .filter((d) => !isNaN(d.getTime()));

    if (!dates.length) return null;

    const firstDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const lastDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    const months =
      (lastDate.getTime() - firstDate.getTime()) /
      (1000 * 60 * 60 * 24 * 30.44);

    // Unique months with actual activity (year-month pairs)
    const uniqueMonthSet = new Set(
      dates.map((d) => `${d.getFullYear()}-${d.getMonth() + 1}`),
    );
    const activeMonths = uniqueMonthSet.size;
    const uniqueDaySet = new Set(
      dates.map((d) => d.toISOString().slice(0, 10)),
    );
    const activeDayCountByMonth = new Map<string, number>();
    for (const day of uniqueDaySet) {
      const month = day.slice(0, 7);
      activeDayCountByMonth.set(
        month,
        (activeDayCountByMonth.get(month) ?? 0) + 1,
      );
    }

    // Bygg liste av aktive månadar for historisk prisutrekning
    const activeMonthList = Array.from(uniqueMonthSet).map(monthPointFromKey);

    // Kalkuler total kostnad basert på historisk pris per månad
    const segs =
      subscriptionSegments.length > 0 ? subscriptionSegments : undefined;
    const historical = calcHistoricalSubscriptionCost(
      activeMonthList,
      locale,
      segs,
    );

    // Kalkuler også «span-kostnad» (alle månadar i perioden, inkl. inaktive)
    const spanMonths: Array<{ year: number; month: number }> = [];
    let cursor = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    const endMonth = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
    while (cursor <= endMonth) {
      spanMonths.push({
        year: cursor.getFullYear(),
        month: cursor.getMonth() + 1,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const spanHistorical = calcHistoricalSubscriptionCost(
      spanMonths,
      locale,
      segs,
    );

    const activePaidMonthDetails = historical.monthDetails.filter(
      (detail) => detail.price > 0,
    );
    const subscribedMonthDetails = spanHistorical.monthDetails.filter(
      (detail) => detail.price > 0,
    );
    const noSubscriptionMonthDetails = spanHistorical.monthDetails.filter(
      (detail) => detail.price === 0,
    );
    const inactivePaidMonthDetails = subscribedMonthDetails.filter(
      (detail) => !uniqueMonthSet.has(monthKey(detail.year, detail.month)),
    );

    let inactivePaidDayCost = 0;
    let inactivePaidDays = 0;
    for (const detail of subscribedMonthDetails) {
      const days = daysInMonth(detail.year, detail.month);
      const activeDays =
        activeDayCountByMonth.get(monthIsoKey(detail.year, detail.month)) ?? 0;
      const unusedDays = Math.max(0, days - activeDays);
      inactivePaidDays += unusedDays;
      inactivePaidDayCost += (detail.price * unusedDays) / days;
    }

    const inactivePaidCost = inactivePaidMonthDetails.reduce(
      (sum, detail) => sum + detail.price,
      0,
    );
    const activePaidMonths = activePaidMonthDetails.length;
    const subscribedMonths = subscribedMonthDetails.length;

    return {
      firstDate,
      lastDate,
      months,
      totalCost: spanHistorical.totalCost,
      activeMonths,
      activeCost: historical.totalCost,
      activePaidMonths,
      subscribedMonths,
      avgMonthlyPrice:
        activePaidMonths > 0 ? historical.totalCost / activePaidMonths : 0,
      spanAvgMonthlyPrice:
        subscribedMonths > 0 ? spanHistorical.totalCost / subscribedMonths : 0,
      inactivePaidMonths: inactivePaidMonthDetails.length,
      inactivePaidCost,
      inactivePaidDays,
      inactivePaidDayCost,
      paidRanges: groupConsecutiveMonths(
        subscribedMonthDetails.map(({ year, month }) => ({ year, month })),
      ),
      noSubscriptionMonths: noSubscriptionMonthDetails.length,
      noSubscriptionRanges: groupConsecutiveMonths(
        noSubscriptionMonthDetails.map(({ year, month }) => ({ year, month })),
      ),
      inactivePaidRanges: groupConsecutiveMonths(
        inactivePaidMonthDetails.map(({ year, month }) => ({ year, month })),
      ),
      priceBreakdown: historical.monthDetails,
      tierBreakdown: historical.tierBreakdown,
    };
  }, [dateFilteredRows, locale, subscriptionSegments]);

  const effectiveSubscriptionCost = subscriptionEstimate
    ? countOnlyActiveSubscriptionMonths
      ? subscriptionEstimate.activeCost
      : subscriptionEstimate.totalCost
    : 0;
  const effectiveSubscriptionMonths = subscriptionEstimate
    ? countOnlyActiveSubscriptionMonths
      ? subscriptionEstimate.activePaidMonths
      : subscriptionEstimate.subscribedMonths
    : 0;
  const effectiveSubscriptionAvgPrice = subscriptionEstimate
    ? countOnlyActiveSubscriptionMonths
      ? subscriptionEstimate.avgMonthlyPrice
      : subscriptionEstimate.spanAvgMonthlyPrice
    : 0;
  const subscribedDurationLabel = subscriptionEstimate
    ? formatMonthDuration(subscriptionEstimate.subscribedMonths, locale)
    : "";

  const searchedArtists = useMemo(() => {
    if (!artistSearchQuery.trim()) return filteredArtists;
    const query = artistSearchQuery.toLowerCase();
    return filteredArtists.filter((a) =>
      a.artist.toLowerCase().includes(query),
    );
  }, [filteredArtists, artistSearchQuery]);

  const totalPages = Math.ceil(searchedArtists.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Juster currentPage hvis den blir ugyldig
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const shownArtists = useMemo(
    () => searchedArtists.slice(startIndex, endIndex),
    [searchedArtists, startIndex, endIndex],
  );
  const shownAlbumKeys = useMemo(
    () => uniqAlbumKeysFromArtists(shownArtists),
    [shownArtists],
  );
  const allAlbumKeys = useMemo(
    () => uniqAlbumKeysFromArtists(filteredArtists),
    [filteredArtists],
  );

  // Top-N summary
  const topNArtists = useMemo(() => {
    if (!filteredArtists.length) return [];
    if (summaryTopN === "all") return filteredArtists;
    return filteredArtists.slice(0, summaryTopN);
  }, [filteredArtists, summaryTopN]);

  const topNAlbumKeys = useMemo(
    () => uniqAlbumKeysFromArtists(topNArtists),
    [topNArtists],
  );
  const topNValue = useMemo(
    () => topNArtists.reduce((sum, a) => sum + a.estValueNOK, 0),
    [topNArtists],
  );
  const topNMs = useMemo(
    () => topNArtists.reduce((sum, a) => sum + a.msPlayed, 0),
    [topNArtists],
  );
  const topNCost = useMemo(
    () => topNAlbumKeys.length * cfg.albumPriceNOK,
    [topNAlbumKeys, cfg.albumPriceNOK],
  );
  const plannedCount = Object.keys(plannedAlbums).length;
  const plannedCost = plannedCount * cfg.albumPriceNOK;
  const albumBudget = subscriptionEstimate
    ? Math.floor(effectiveSubscriptionCost / cfg.albumPriceNOK)
    : 0;
  const albumsRemaining = Math.max(0, albumBudget - plannedCount);

  const artistDetails = useMemo(() => {
    if (!selectedArtist || !filteredRows.length) return null;

    const artistRows = filteredRows.filter(
      (r) => r.master_metadata_album_artist_name === selectedArtist,
    );

    if (!artistRows.length) return null;

    const totalMs = artistRows.reduce(
      (sum, r) => sum + (r.ms_played || r.msPlayed || 0),
      0,
    );
    const totalPlays = artistRows.length;

    // Group by album
    const albumMap = new Map<
      string,
      {
        album: string;
        tracks: Array<{
          trackName: string;
          msPlayed: number;
          plays: number;
        }>;
        totalMs: number;
        totalPlays: number;
      }
    >();

    for (const row of artistRows) {
      const albumName =
        row.master_metadata_album_album_name || "(Ukjent album)";
      const trackName = row.master_metadata_track_name || "(Ukjent låt)";
      const ms = row.ms_played || row.msPlayed || 0;

      if (!albumMap.has(albumName)) {
        albumMap.set(albumName, {
          album: albumName,
          tracks: [],
          totalMs: 0,
          totalPlays: 0,
        });
      }

      const albumData = albumMap.get(albumName)!;
      albumData.totalMs += ms;
      albumData.totalPlays += 1;

      let track = albumData.tracks.find((t) => t.trackName === trackName);
      if (!track) {
        track = { trackName, msPlayed: 0, plays: 0 };
        albumData.tracks.push(track);
      }
      track.msPlayed += ms;
      track.plays += 1;
    }

    const albums = Array.from(albumMap.values());

    // Sort albums and tracks based on artistDetailSort
    if (artistDetailSort === "time") {
      albums.sort((a, b) => b.totalMs - a.totalMs);
      albums.forEach((album) => {
        album.tracks.sort((a, b) => b.msPlayed - a.msPlayed);
      });
    } else {
      albums.sort((a, b) => b.totalPlays - a.totalPlays);
      albums.forEach((album) => {
        album.tracks.sort((a, b) => b.plays - a.plays);
      });
    }

    return {
      artist: selectedArtist,
      totalMs,
      totalPlays,
      albums,
    };
  }, [selectedArtist, filteredRows, artistDetailSort]);

  return (
    <div className="page">
      <button
        className="langSwitch"
        onClick={() => setLocale((prev) => (prev === "no" ? "en" : "no"))}
        aria-label={locale === "no" ? "Switch to English" : "Bytt til norsk"}
      >
        <span className={locale === "no" ? "langActive" : ""}>🇳🇴 NO</span>
        <span className="langDivider">/</span>
        <span className={locale === "en" ? "langActive" : ""}>🇺🇸 EN</span>
      </button>
      <header className="hero">
        <div className="heroGlow" />
        <div className="heroContent">
          <div className="heroImageWrap">
            <img
              src={heroImg}
              alt={t("heroImgAlt", locale)}
              className="heroImage"
            />
          </div>

          <span className="heroBadgePill">{t("heroBadge", locale)}</span>

          <div className="heroLogo">
            <div className="spotifyLine">
              <svg
                className="spotifyIcon"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              <span className="spotifyText">Spotify</span>
            </div>

            <div className="tornStrip">
              <span className="unwrappedText">UNWRAPPED</span>
            </div>
          </div>

          <p className="heroTagline">{t("heroTagline", locale)}</p>
          <p className="heroDesc">
            {t("heroDesc1", locale)}
            <u>{t("heroDescStreams", locale)}</u>
            {t("heroDesc2", locale)}
          </p>

          <div className="heroUnderline" />

          <ul className="featureBullets">
            <li>{t("featureAnalyzeTitle", locale)}</li>
            <li>{t("featureInsightTitle", locale)}</li>
            <li>{t("featurePrivateTitle", locale)}</li>
          </ul>

          <div className="heroCta">
            <a
              href={t("heroCtaUrl", locale)}
              target="_blank"
              rel="noopener noreferrer"
              className="privacyLink"
            >
              {t("heroCtaLink", locale)}
            </a>
            <p className="heroCtaHint">{t("heroCtaHint", locale)}</p>
          </div>
        </div>
      </header>

      <nav className="mainNav">
        <button
          className={`mainNavBtn ${appView === "mydata" ? "active" : ""}`}
          onClick={() => setAppView("mydata")}
        >
          {t("myDataNavLabel", locale)}
        </button>
        <button
          className={`mainNavBtn ${appView === "industry" ? "active" : ""}`}
          onClick={() => setAppView("industry")}
        >
          {t("industryNavLabel", locale)}
        </button>
        <button
          className={`mainNavBtn ${appView === "case" ? "active" : ""}`}
          onClick={() => setAppView("case")}
        >
          {t("caseNavLabel", locale)}
        </button>
      </nav>

      {appView === "industry" && <IndustryCharts locale={locale} />}

      {appView === "case" && <CaseExplained locale={locale} />}

      {appView === "mydata" && (
        <>
          <section className="card" style={{ marginTop: 40 }}>
            <div className="cardHeader">
              <h2>{t("uploadTitle", locale)}</h2>
              {!!rows.length && (
                <div className="pill">
                  {rows.length.toLocaleString()} {t("rows", locale)}
                </div>
              )}
            </div>

            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <label
                style={{
                  display: "inline-block",
                  cursor: "pointer",
                }}
              >
                <input
                  className="fileInput"
                  type="file"
                  multiple
                  accept=".json,application/json"
                  onChange={(e) => onFiles(e.target.files)}
                  style={{ display: "none" }}
                />
                <button
                  className="btn"
                  style={{ fontSize: "18px", padding: "16px 32px" }}
                  onClick={(e) => {
                    e.currentTarget
                      .closest("label")
                      ?.querySelector("input")
                      ?.click();
                  }}
                >
                  {t("uploadBtn", locale)}
                </button>
              </label>
              {err && (
                <div className="error" style={{ marginTop: 16 }}>
                  {err}
                </div>
              )}
            </div>

            {/* File guide */}
            <div className="fileGuideSection">
              <button
                className="collapsibleToggle fileGuideToggle"
                onClick={() => setFileGuideOpen(!fileGuideOpen)}
                aria-expanded={fileGuideOpen}
              >
                <span
                  className={`collapsibleChevron ${fileGuideOpen ? "open" : ""}`}
                >
                  ▾
                </span>
                {t("fileGuideToggle", locale)}
              </button>

              {fileGuideOpen && (
                <div className="fileGuideContent">
                  <p className="subtle" style={{ marginBottom: 16 }}>
                    {t("fileGuideIntro", locale)}
                  </p>

                  <h4 className="fileGuideGroupTitle">
                    {t("fileGuideRequired", locale)}
                  </h4>
                  <div className="fileGuideGrid">
                    <div className="fileGuideItem">
                      <div className="fileGuideName">
                        Streaming_History_Audio_*.json
                        <span className="fileGuideBadge primary">
                          {locale === "no" ? "Hovudfil" : "Main file"}
                        </span>
                      </div>
                      <div className="fileGuideDesc">
                        <strong>{t("fileGuideContains", locale)}:</strong>{" "}
                        {locale === "no"
                          ? "Fullstendig strøymehistorikk med tidsstempel, artist, album, låttittel, ms lytta, avspelingsgrunn (reason_start/end), shuffle, offline m.m. Filnamn inkluderer årsperiode, t.d. Streaming_History_Audio_2018-2021_1.json."
                          : "Complete streaming history with timestamp, artist, album, track name, ms played, playback reason (reason_start/end), shuffle, offline, etc. Filenames include year range, e.g. Streaming_History_Audio_2018-2021_1.json."}
                        <br />
                        <strong>{t("fileGuideUsedFor", locale)}:</strong>{" "}
                        {locale === "no"
                          ? "All hovudanalyse — royalty-estimat, artistoversikt, aktiv/assistert lytting, diagram."
                          : "All main analysis — royalty estimates, artist overview, active/assisted listening, charts."}
                      </div>
                    </div>

                    <div className="fileGuideItem">
                      <div className="fileGuideName">
                        Streaming_History_Video_*.json
                        <span className="fileGuideBadge primary">
                          {locale === "no" ? "Hovudfil" : "Main file"}
                        </span>
                      </div>
                      <div className="fileGuideDesc">
                        <strong>{t("fileGuideContains", locale)}:</strong>{" "}
                        {locale === "no"
                          ? "Strøymehistorikk for video og podcastar, same format som Audio-filene."
                          : "Streaming history for video and podcasts, same format as the Audio files."}
                        <br />
                        <strong>{t("fileGuideUsedFor", locale)}:</strong>{" "}
                        {locale === "no"
                          ? "Vert analysert saman med Audio-filene for komplett oversikt."
                          : "Analyzed together with Audio files for a complete overview."}
                      </div>
                    </div>

                    <div className="fileGuideItem">
                      <div className="fileGuideName">
                        StreamingHistory_music_*.json
                        <span className="fileGuideBadge">
                          {locale === "no" ? "Alternativ" : "Alternative"}
                        </span>
                      </div>
                      <div className="fileGuideDesc">
                        <strong>{t("fileGuideContains", locale)}:</strong>{" "}
                        {locale === "no"
                          ? "Enklare strøymehistorikk (siste året) frå vanleg «Account Data»-eksport. Har sluttid, artistnamn, låtnamn og ms lytta. Manglar album, avspelingsgrunn, URI m.m."
                          : 'Simpler streaming history (last year) from a regular "Account Data" export. Has end time, artist name, track name, and ms played. Missing album, playback reason, URI, etc.'}
                        <br />
                        <strong>{t("fileGuideUsedFor", locale)}:</strong>{" "}
                        {locale === "no"
                          ? "Kan brukast som fallback — gir grunnleggande statistikk og royalty-estimat, men ingen aktiv/assistert-analyse."
                          : "Can be used as fallback — provides basic stats and royalty estimates, but no active/assisted analysis."}
                      </div>
                    </div>
                  </div>

                  <h4 className="fileGuideGroupTitle">
                    {t("fileGuideOptional", locale)}
                  </h4>
                  <div className="fileGuideGrid">
                    <div className="fileGuideItem">
                      <div className="fileGuideName">
                        Inferences.json
                        {inferences.length > 0 && (
                          <span className="fileGuideBadge loaded">
                            {t("fileGuideLoaded", locale)}
                          </span>
                        )}
                      </div>
                      <div className="fileGuideDesc">
                        <strong>{t("fileGuideContains", locale)}:</strong>{" "}
                        {locale === "no"
                          ? "Spotify sine reklame-profilar av deg: demografiske segment, innhaldspreferansar, og annonsesegment."
                          : "Spotify's advertising profiles of you: demographic segments, content preferences, and ad segments."}
                        <br />
                        <strong>{t("fileGuideUsedFor", locale)}:</strong>{" "}
                        {locale === "no"
                          ? "Viser ein eigen «Slik ser Spotify deg»-seksjon som avslører korleis du vert profilert for annonsørar."
                          : 'Shows a dedicated "How Spotify sees you" section revealing how you\'re profiled for advertisers.'}
                      </div>
                    </div>

                    <div className="fileGuideItem">
                      <div className="fileGuideName">
                        Marquee.json
                        {marqueeArtists.length > 0 && (
                          <span className="fileGuideBadge loaded">
                            {t("fileGuideLoaded", locale)}
                          </span>
                        )}
                      </div>
                      <div className="fileGuideDesc">
                        <strong>{t("fileGuideContains", locale)}:</strong>{" "}
                        {locale === "no"
                          ? "Liste over artistar Spotify har kategorisert deg som lyttar av, med segment (t.d. «Previously Active Listeners», «Light listeners»). Brukt i Marquee-marknadsføringsverktøyet."
                          : 'List of artists Spotify has categorized you as a listener of, with segments (e.g. "Previously Active Listeners", "Light listeners"). Used in the Marquee marketing tool.'}
                        <br />
                        <strong>{t("fileGuideUsedFor", locale)}:</strong>{" "}
                        {locale === "no"
                          ? "Viser korleis Spotify segmenterer deg som lyttar — og gjer deg til ei målgruppe for betalt promotering."
                          : "Shows how Spotify segments you as a listener — turning you into a target audience for paid promotion."}
                      </div>
                    </div>

                    <div className="fileGuideItem">
                      <div className="fileGuideName">
                        Userdata.json
                        {userdata && (
                          <span className="fileGuideBadge loaded">
                            {t("fileGuideLoaded", locale)}
                          </span>
                        )}
                      </div>
                      <div className="fileGuideDesc">
                        <strong>{t("fileGuideContains", locale)}:</strong>{" "}
                        {locale === "no"
                          ? "Grunnleggande kontoinformasjon: brukarnamn, land, opprettingsdato."
                          : "Basic account info: username, country, creation date."}
                        <br />
                        <strong>{t("fileGuideUsedFor", locale)}:</strong>{" "}
                        {locale === "no"
                          ? "Viser kor lenge du har vore Spotify-brukar."
                          : "Shows how long you've been a Spotify user."}
                      </div>
                    </div>
                  </div>

                  <h4 className="fileGuideGroupTitle">
                    {t("fileGuideNotUsed", locale)}
                  </h4>
                  <div className="fileGuideGrid dimmed">
                    {[
                      {
                        name: "Follow.json",
                        desc:
                          locale === "no"
                            ? "Sosial graf — kven du følgjer og kven som følgjer deg."
                            : "Social graph — who you follow and who follows you.",
                      },
                      {
                        name: "Playlist1.json",
                        desc:
                          locale === "no"
                            ? "Spillelistene dine med alle sporar."
                            : "Your playlists with all tracks.",
                      },
                      {
                        name: "Payments.json",
                        desc:
                          locale === "no"
                            ? "Betalingsinformasjon (vanlegvis tom)."
                            : "Payment information (usually empty).",
                      },
                      {
                        name: "YourLibrary.json",
                        desc:
                          locale === "no"
                            ? "Lagra sporar, artistar, album og podcastar."
                            : "Saved tracks, artists, albums, and podcasts.",
                      },
                      {
                        name: "SearchQueries.json",
                        desc:
                          locale === "no"
                            ? "Dei siste søka dine på Spotify."
                            : "Your recent Spotify searches.",
                      },
                      {
                        name: "Identifiers.json",
                        desc:
                          locale === "no"
                            ? "E-postadressa knytt til kontoen."
                            : "Email address linked to the account.",
                      },
                    ].map((item) => (
                      <div className="fileGuideItem" key={item.name}>
                        <div className="fileGuideName">{item.name}</div>
                        <div className="fileGuideDesc">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {(uploadedFiles.length > 0 ||
              inferences.length > 0 ||
              marqueeArtists.length > 0 ||
              userdata) && (
              <div className="uploadedFilesList">
                <div className="filesHeader">
                  <h3>
                    {t("uploadedFilesLabel", locale)} ({uploadedFiles.length})
                  </h3>
                  <button
                    className="btnGhost"
                    onClick={() => {
                      setUploadedFiles([]);
                      setRows([]);
                      setInferences([]);
                      setMarqueeArtists([]);
                      setUserdata(null);
                    }}
                  >
                    {t("removeAll", locale)}
                  </button>
                </div>
                <div className="filesList">
                  {uploadedFiles.map((file) => (
                    <div key={file.name} className="fileItem">
                      <div className="fileInfo">
                        <span className="fileName">{file.name}</span>
                        <span className="fileStats">
                          {file.rowCount.toLocaleString()} {t("rows", locale)}
                        </span>
                      </div>
                      <button
                        className="fileRemove"
                        onClick={() => {
                          setUploadedFiles((prev) =>
                            prev.filter((f) => f.name !== file.name),
                          );
                        }}
                        title={t("removeFile", locale)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {inferences.length > 0 && (
                    <div className="fileItem extraFile">
                      <div className="fileInfo">
                        <span className="fileName">Inferences.json</span>
                        <span className="fileStats">
                          {inferences.length}{" "}
                          {locale === "no" ? "segment" : "segments"}
                        </span>
                      </div>
                      <button
                        className="fileRemove"
                        onClick={() => setInferences([])}
                        title={t("removeFile", locale)}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {marqueeArtists.length > 0 && (
                    <div className="fileItem extraFile">
                      <div className="fileInfo">
                        <span className="fileName">Marquee.json</span>
                        <span className="fileStats">
                          {marqueeArtists.length}{" "}
                          {locale === "no" ? "artistar" : "artists"}
                        </span>
                      </div>
                      <button
                        className="fileRemove"
                        onClick={() => setMarqueeArtists([])}
                        title={t("removeFile", locale)}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {userdata && (
                    <div className="fileItem extraFile">
                      <div className="fileInfo">
                        <span className="fileName">Userdata.json</span>
                        <span className="fileStats">
                          {userdata.username ?? ""}
                        </span>
                      </div>
                      <button
                        className="fileRemove"
                        onClick={() => setUserdata(null)}
                        title={t("removeFile", locale)}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="card settingsCard">
            <button
              className="settingsToggle"
              onClick={() => setSettingsOpen(!settingsOpen)}
              aria-expanded={settingsOpen}
            >
              <span
                className={`collapsibleChevron ${settingsOpen ? "open" : ""}`}
              >
                ▾
              </span>
              <span className="settingsToggleTitle">
                {t("settingsTitle", locale)}
              </span>
              <span className="settingsToggleHint">
                {t("settingsDesc", locale)}
              </span>
            </button>

            {settingsOpen && (
              <div className="settingsContent">
                <div className="controlsInline">
                  <label className="fieldInline">
                    <span>{t("albumPriceLabel", locale)}</span>
                    <input
                      type="number"
                      step="10"
                      value={cfg.albumPriceNOK}
                      onChange={(e) =>
                        setCfg({
                          ...cfg,
                          albumPriceNOK: Number(e.target.value),
                        })
                      }
                    />
                  </label>

                  <label className="fieldInline">
                    <span>{t("minMsLabel", locale)}</span>
                    <input
                      type="number"
                      step="1000"
                      value={cfg.minMsPlayedToCount}
                      onChange={(e) =>
                        setCfg({
                          ...cfg,
                          minMsPlayedToCount: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                <label className="checkboxField">
                  <input
                    type="checkbox"
                    checked={countOnlyActiveSubscriptionMonths}
                    onChange={(e) =>
                      setCountOnlyActiveSubscriptionMonths(e.target.checked)
                    }
                  />
                  <span>
                    <strong>{t("subscriptionUsageToggleLabel", locale)}</strong>
                    <small>{t("subscriptionUsageToggleHint", locale)}</small>
                  </span>
                </label>

                {/* Price History Tables */}
                <div className="priceHistorySection">
                  <div className="priceHistoryInfo">
                    <h4>{t("priceHistoryTitle", locale)}</h4>
                    <table className="priceHistoryTable">
                      <thead>
                        <tr>
                          <th>{t("periodCol", locale)}</th>
                          <th>{t("priceCol", locale)}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PRICE_HISTORY[locale].map((period, i) => {
                          const nextPeriod = PRICE_HISTORY[locale][i + 1];
                          const fromStr = `${period.from[0]}-${String(period.from[1]).padStart(2, "0")}`;
                          const toStr = nextPeriod
                            ? `${nextPeriod.from[0]}-${String(nextPeriod.from[1] - 1).padStart(2, "0")}`
                            : locale === "en"
                              ? "now"
                              : "no";
                          return (
                            <tr key={i}>
                              <td>
                                {fromStr} → {toStr}
                              </td>
                              <td>{currencyPerMonth(period.price, locale)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <p
                      className="subtle"
                      style={{ marginTop: 6, fontSize: "0.85em" }}
                    >
                      {t("priceHistoryNote", locale)}
                    </p>
                  </div>

                  <div className="priceHistoryInfo">
                    <h4>{t("royaltyHistoryTitle", locale)}</h4>
                    <table className="priceHistoryTable">
                      <thead>
                        <tr>
                          <th>{t("periodCol", locale)}</th>
                          <th>{t("ratePerStreamCol", locale)}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ROYALTY_HISTORY[locale].map((period, i) => {
                          const nextPeriod = ROYALTY_HISTORY[locale][i + 1];
                          const fromStr = `${period.from[0]}-${String(period.from[1]).padStart(2, "0")}`;
                          const toStr = nextPeriod
                            ? `${nextPeriod.from[0]}-${String(nextPeriod.from[1] - 1).padStart(2, "0")}`
                            : locale === "en"
                              ? "now"
                              : "no";
                          return (
                            <tr key={i}>
                              <td>
                                {fromStr} → {toStr}
                              </td>
                              <td>
                                {currencyPerStream(
                                  period.ratePerStream,
                                  locale,
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <p
                      className="subtle"
                      style={{ marginTop: 6, fontSize: "0.85em" }}
                    >
                      {t("royaltyHistoryNote", locale)}
                    </p>
                  </div>
                </div>

                {/* Subscription History Timeline Builder */}
                <div className="subHistorySection">
                  <h4>{t("subHistoryTitle", locale)}</h4>
                  <p
                    className="subtle"
                    style={{ marginBottom: 10, fontSize: "0.85em" }}
                  >
                    {t("subHistoryDesc", locale)}
                  </p>

                  {/* Quick presets */}
                  <div className="subPresets">
                    <button
                      className={`btn btnSmall ${subscriptionSegments.length === 0 ? "active" : ""}`}
                      onClick={() => setSubscriptionSegments([])}
                    >
                      {t("presetAlwaysPremium", locale)}
                    </button>
                    <button
                      className="btn btnSmall"
                      onClick={() =>
                        setSubscriptionSegments([
                          { tier: "free", from: [2009, 1], to: null },
                        ])
                      }
                    >
                      {t("presetAlwaysFree", locale)}
                    </button>
                    <button
                      className="btn btnSmall"
                      onClick={() =>
                        setSubscriptionSegments((prev) => [
                          ...prev,
                          {
                            tier: "individual",
                            from: [new Date().getFullYear(), 1],
                            to: null,
                          },
                        ])
                      }
                    >
                      + {t("addSegment", locale)}
                    </button>
                  </div>

                  {/* Segment list */}
                  {subscriptionSegments.length > 0 &&
                    (() => {
                      const currentYear = new Date().getFullYear();
                      const years = Array.from(
                        { length: currentYear - 2008 },
                        (_, i) => 2009 + i,
                      );
                      const monthNames = Array.from({ length: 12 }, (_, i) =>
                        new Intl.DateTimeFormat(
                          locale === "no" ? "nb-NO" : "en-US",
                          { month: "long" },
                        ).format(new Date(2000, i)),
                      );
                      return (
                        <div className="subSegmentList">
                          {subscriptionSegments.map((seg, idx) => {
                            // Validate tier against launch dates
                            const launchDate =
                              TIER_LAUNCH_DATES[
                                seg.tier as keyof typeof TIER_LAUNCH_DATES
                              ];
                            const isBeforeLaunch =
                              launchDate &&
                              (seg.from[0] < launchDate[0] ||
                                (seg.from[0] === launchDate[0] &&
                                  seg.from[1] < launchDate[1]));

                            return (
                              <div className="subSegmentRow" key={idx}>
                                <select
                                  className="subTierSelect"
                                  value={seg.tier}
                                  onChange={(e) => {
                                    const next = [...subscriptionSegments];
                                    next[idx] = {
                                      ...next[idx],
                                      tier: e.target.value as SubscriptionTier,
                                    };
                                    setSubscriptionSegments(next);
                                  }}
                                >
                                  <option value="individual">
                                    {t("tierIndividual", locale)}
                                  </option>
                                  <option value="free">
                                    {t("tierFree", locale)}
                                  </option>
                                  <option value="student">
                                    {t("tierStudent", locale)}
                                  </option>
                                  <option value="duo">
                                    {t("tierDuo", locale)}
                                  </option>
                                  <option value="family">
                                    {t("tierFamily", locale)}
                                  </option>
                                  <option value="unknown">
                                    {t("tierUnknown", locale)}
                                  </option>
                                </select>

                                <label className="subDateField">
                                  <span>{t("segmentFrom", locale)}</span>
                                  <div className="subDateSelects">
                                    <select
                                      className="subMonthSelect"
                                      value={seg.from[1]}
                                      onChange={(e) => {
                                        const next = [...subscriptionSegments];
                                        next[idx] = {
                                          ...next[idx],
                                          from: [
                                            seg.from[0],
                                            Number(e.target.value),
                                          ],
                                        };
                                        setSubscriptionSegments(next);
                                      }}
                                    >
                                      {monthNames.map((name, i) => (
                                        <option key={i} value={i + 1}>
                                          {name}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      className="subYearSelect"
                                      value={seg.from[0]}
                                      onChange={(e) => {
                                        const next = [...subscriptionSegments];
                                        next[idx] = {
                                          ...next[idx],
                                          from: [
                                            Number(e.target.value),
                                            seg.from[1],
                                          ],
                                        };
                                        setSubscriptionSegments(next);
                                      }}
                                    >
                                      {years.map((y) => (
                                        <option key={y} value={y}>
                                          {y}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </label>

                                <label className="subDateField">
                                  <span>{t("segmentTo", locale)}</span>
                                  <div className="subDateSelects">
                                    {seg.to ? (
                                      <>
                                        <select
                                          className="subMonthSelect"
                                          value={seg.to[1]}
                                          onChange={(e) => {
                                            const next = [
                                              ...subscriptionSegments,
                                            ];
                                            next[idx] = {
                                              ...next[idx],
                                              to: [
                                                seg.to![0],
                                                Number(e.target.value),
                                              ],
                                            };
                                            setSubscriptionSegments(next);
                                          }}
                                        >
                                          {monthNames.map((name, i) => (
                                            <option key={i} value={i + 1}>
                                              {name}
                                            </option>
                                          ))}
                                        </select>
                                        <select
                                          className="subYearSelect"
                                          value={seg.to[0]}
                                          onChange={(e) => {
                                            const next = [
                                              ...subscriptionSegments,
                                            ];
                                            next[idx] = {
                                              ...next[idx],
                                              to: [
                                                Number(e.target.value),
                                                seg.to![1],
                                              ],
                                            };
                                            setSubscriptionSegments(next);
                                          }}
                                        >
                                          {years.map((y) => (
                                            <option key={y} value={y}>
                                              {y}
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          className="btnGhost btnTiny"
                                          onClick={() => {
                                            const next = [
                                              ...subscriptionSegments,
                                            ];
                                            next[idx] = {
                                              ...next[idx],
                                              to: null,
                                            };
                                            setSubscriptionSegments(next);
                                          }}
                                          title={t("segmentOngoing", locale)}
                                        >
                                          ∞
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        className="btn btnSmall"
                                        onClick={() => {
                                          const next = [
                                            ...subscriptionSegments,
                                          ];
                                          next[idx] = {
                                            ...next[idx],
                                            to: [currentYear, 12],
                                          };
                                          setSubscriptionSegments(next);
                                        }}
                                      >
                                        {t("segmentOngoing", locale)}
                                      </button>
                                    )}
                                  </div>
                                </label>

                                <button
                                  className="btnGhost btnSmall"
                                  onClick={() => {
                                    setSubscriptionSegments((prev) =>
                                      prev.filter((_, i) => i !== idx),
                                    );
                                  }}
                                >
                                  {t("removeSegment", locale)}
                                </button>

                                {isBeforeLaunch && (
                                  <div className="subTierWarning">
                                    {t("tierNotAvailable", locale).replace(
                                      "{date}",
                                      `${launchDate[0]}-${String(launchDate[1]).padStart(2, "0")}`,
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                </div>
              </div>
            )}
          </section>

          {rows.length > 0 && availableYears.length > 0 && (
            <section className="card">
              <div className="cardHeader">
                <h2>{t("dateFilterTitle", locale)}</h2>
                <div className="subtle">{t("dateFilterDesc", locale)}</div>
              </div>

              <div className="dateFilterControls">
                <div className="dateFilterTabs">
                  <button
                    className={`dateTab ${dateFilterMode === "all" ? "active" : ""}`}
                    onClick={() => {
                      setDateFilterMode("all");
                      setCurrentPage(1);
                    }}
                  >
                    {t("allTime", locale)}
                  </button>
                  {availableYears.map((year) => (
                    <button
                      key={year}
                      className={`dateTab ${dateFilterMode === "year" && dateFilterYear === year ? "active" : ""}`}
                      onClick={() => {
                        setDateFilterMode("year");
                        setDateFilterYear(year);
                        setCurrentPage(1);
                      }}
                    >
                      {year}
                    </button>
                  ))}
                  <button
                    className={`dateTab ${dateFilterMode === "custom" ? "active" : ""}`}
                    onClick={() => {
                      setDateFilterMode("custom");
                      setCurrentPage(1);
                    }}
                  >
                    {t("custom", locale)}
                  </button>
                </div>

                {dateFilterMode === "custom" && (
                  <div className="dateCustomRange">
                    <label className="dateField">
                      <span>{t("fromLabel", locale)}</span>
                      <input
                        type="date"
                        value={dateFilterStart}
                        onChange={(e) => {
                          setDateFilterStart(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </label>
                    <span className="dateSep">–</span>
                    <label className="dateField">
                      <span>{t("toLabel", locale)}</span>
                      <input
                        type="date"
                        value={dateFilterEnd}
                        onChange={(e) => {
                          setDateFilterEnd(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </label>
                  </div>
                )}

                {activeDateRange && (
                  <div className="dateFilterInfo">
                    {t("showingDataFor", locale)} <b>{activeDateRange.label}</b>
                    {" · "}
                    {dateFilteredRows.length.toLocaleString()}{" "}
                    {t("rows", locale)}
                    {rows.length !== dateFilteredRows.length && (
                      <span className="subtle">
                        {" "}
                        ({t(
                          "ofTotal",
                          locale,
                        )} {rows.length.toLocaleString()}{" "}
                        {t("totalSuffix", locale)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {result && (
            <>
              <section className="card">
                <div className="cardHeader">
                  <h2>
                    {t("listeningPatternsTitle", locale)}
                    {activeDateRange ? ` (${activeDateRange.label})` : ""}
                  </h2>
                  <p className="subtle">{t("listeningPatternsDesc", locale)}</p>
                </div>

                {/* Listening Charts */}
                <ListeningCharts
                  rows={dateFilteredRows}
                  result={result}
                  locale={locale}
                  minMsPlayed={cfg.minMsPlayedToCount}
                  availableYears={availableYears}
                  dateFilterMode={dateFilterMode}
                  dateFilterYear={dateFilterYear}
                  onDateFilterChange={(mode, year) => {
                    setDateFilterMode(mode);
                    if (mode === "year" && year) {
                      setDateFilterYear(year);
                    } else if (mode === "all") {
                      setDateFilterYear(null);
                    }
                  }}
                />

                {/* Stats Summary (below charts) */}
                <div className="chartSummarySection">
                  {/* Key metrics row */}
                  <div className="keyMetricsRow">
                    <div className="keyMetric">
                      <span className="keyMetricValue">
                        {formatHrs(result.totalMsPlayed, locale)}
                      </span>
                      <span className="keyMetricLabel">
                        {t("totalListeningTime", locale)}
                      </span>
                    </div>
                    <div className="keyMetricSep">·</div>
                    <div className="keyMetric">
                      <span className="keyMetricValue">
                        {formatNum(result.countedRows, locale)}
                      </span>
                      <span className="keyMetricLabel">
                        {t("totalStreams", locale)}
                      </span>
                    </div>
                    <div className="keyMetricSep">·</div>
                    <div className="keyMetric">
                      <span className="keyMetricValue">
                        {result.artists.length.toLocaleString()}
                      </span>
                      <span className="keyMetricLabel">
                        {t("uniqueArtists", locale)}
                      </span>
                    </div>
                  </div>

                  {/* Economic comparison box */}
                  {subscriptionEstimate && (
                    <div className="economicComparisonBox">
                      <div className="economicRow">
                        <div className="economicItem">
                          <span className="economicLabel">
                            {countOnlyActiveSubscriptionMonths
                              ? t("subActiveOnly", locale)
                              : t("estSubFull", locale)}
                          </span>
                          <span className="economicValue">
                            {formatCurrency(effectiveSubscriptionCost, locale)}
                          </span>
                          <span className="economicHint">
                            {effectiveSubscriptionMonths}{" "}
                            {t("monthsAbbr", locale)} ·{" "}
                            {formatCurrency(
                              effectiveSubscriptionAvgPrice,
                              locale,
                            )}{" "}
                            {t("weightedAvg", locale)}
                          </span>
                        </div>
                        <div className="economicVs">vs</div>
                        <div className="economicItem">
                          <span className="economicLabel">
                            {t("totalTheoValue", locale)}
                          </span>
                          <span className="economicValue green">
                            {formatCurrency(totalAllArtistsValue, locale)}
                          </span>
                          <span className="economicHint">
                            {locale === "en"
                              ? "associated with your artists"
                              : "knytt til dine artistar"}
                          </span>
                        </div>
                        <div className="economicEquals">=</div>
                        <div className="economicItem economicDifference">
                          <span className="economicLabel">
                            {t("difference", locale)}
                          </span>
                          <span
                            className="economicValue"
                            style={{
                              color:
                                effectiveSubscriptionCost -
                                  totalAllArtistsValue >
                                0
                                  ? "rgb(239, 68, 68)"
                                  : "rgb(30, 215, 96)",
                            }}
                          >
                            {formatCurrency(
                              effectiveSubscriptionCost - totalAllArtistsValue,
                              locale,
                            )}
                          </span>
                          <span className="economicHint">
                            {locale === "en"
                              ? "distributed through the pool"
                              : "fordelt gjennom potten"}
                          </span>
                        </div>
                      </div>
                      <div className="economicPeriod">
                        {t("periodCol", locale)}:{" "}
                        <b>
                          {subscriptionEstimate.firstDate.toLocaleDateString(
                            dateLocale(locale),
                            { year: "numeric", month: "short" },
                          )}
                          {" – "}
                          {subscriptionEstimate.lastDate.toLocaleDateString(
                            dateLocale(locale),
                            { year: "numeric", month: "short" },
                          )}
                        </b>
                      </div>

                      <div className="subscriptionInsightsGrid">
                        <div className="subscriptionInsightCard">
                          <span className="economicLabel">
                            {t("paidDurationLabel", locale)}
                          </span>
                          <span className="subscriptionInsightValue">
                            {subscribedDurationLabel}
                          </span>
                          <span className="economicHint">
                            {t("paidDurationHint", locale).replace(
                              "{months}",
                              String(subscriptionEstimate.subscribedMonths),
                            )}
                          </span>
                          {subscriptionEstimate.paidRanges.length > 0 ? (
                            <div className="subscriptionInsightRangeList">
                              {subscriptionEstimate.paidRanges.map((range) => {
                                const rangeLabel = formatMonthRange(
                                  range,
                                  locale,
                                );
                                return (
                                  <span
                                    key={`paid-${range.from.join("-")}-${range.to.join("-")}`}
                                    className="subscriptionInsightRangeTag"
                                  >
                                    {rangeLabel}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="subscriptionInsightRanges">
                              {locale === "en" ? "None" : "Ingen"}
                            </span>
                          )}
                        </div>

                        <div className="subscriptionInsightCard">
                          <span className="economicLabel">
                            {t("noSubscriptionLabel", locale)}
                          </span>
                          {subscriptionSegments.length === 0 ? (
                            <>
                              <span
                                className="subscriptionInsightValue"
                                style={{ opacity: 0.35 }}
                              >
                                —
                              </span>
                              <span className="economicHint">
                                {t("noSubscriptionNeedsHistory", locale)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="subscriptionInsightValue">
                                {subscriptionEstimate.noSubscriptionMonths}{" "}
                                {t("monthsAbbr", locale)}
                              </span>
                              <span className="economicHint">
                                {t("noSubscriptionHint", locale).replace(
                                  "{months}",
                                  String(
                                    subscriptionEstimate.noSubscriptionMonths,
                                  ),
                                )}
                              </span>
                              {subscriptionEstimate.noSubscriptionRanges
                                .length > 0 ? (
                                <div className="subscriptionInsightRangeList">
                                  {subscriptionEstimate.noSubscriptionRanges.map(
                                    (range) => {
                                      const rangeLabel = formatMonthRange(
                                        range,
                                        locale,
                                      );
                                      return (
                                        <span
                                          key={`none-${range.from.join("-")}-${range.to.join("-")}`}
                                          className="subscriptionInsightRangeTag"
                                        >
                                          {rangeLabel}
                                        </span>
                                      );
                                    },
                                  )}
                                </div>
                              ) : (
                                <span className="subscriptionInsightRanges">
                                  {locale === "en" ? "None" : "Ingen"}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        <div className="subscriptionInsightCard">
                          <span className="economicLabel">
                            {t("unusedSubscriptionLabel", locale)}
                          </span>
                          <span className="subscriptionInsightValue warning">
                            {formatCurrency(
                              subscriptionEstimate.inactivePaidCost,
                              locale,
                            )}
                          </span>
                          <span className="economicHint">
                            {t("unusedSubscriptionHint", locale).replace(
                              "{months}",
                              String(subscriptionEstimate.inactivePaidMonths),
                            )}
                          </span>
                          {subscriptionSegments.length === 0 && (
                            <span
                              className="economicHint"
                              style={{ fontStyle: "italic", opacity: 0.7 }}
                            >
                              {t("unusedSubscriptionDefaultNote", locale)}
                            </span>
                          )}
                          {subscriptionEstimate.inactivePaidRanges.length >
                          0 ? (
                            <div className="subscriptionInsightRangeList">
                              {subscriptionEstimate.inactivePaidRanges.map(
                                (range) => {
                                  const rangeLabel = formatMonthRange(
                                    range,
                                    locale,
                                  );
                                  return (
                                    <span
                                      key={`inactive-${range.from.join("-")}-${range.to.join("-")}`}
                                      className="subscriptionInsightRangeTag"
                                    >
                                      {rangeLabel}
                                    </span>
                                  );
                                },
                              )}
                            </div>
                          ) : (
                            <span className="subscriptionInsightRanges">
                              {locale === "en" ? "None" : "Ingen"}
                            </span>
                          )}
                        </div>

                        <div className="subscriptionInsightCard">
                          <span className="economicLabel">
                            {t("unusedDailyLabel", locale)}
                          </span>
                          <span className="subscriptionInsightValue warning">
                            {formatCurrency(
                              subscriptionEstimate.inactivePaidDayCost,
                              locale,
                            )}
                          </span>
                          <span className="economicHint">
                            {t("unusedDailyHint", locale).replace(
                              "{days}",
                              String(subscriptionEstimate.inactivePaidDays),
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tier impact insight */}
                  {result && subscriptionSegments.length > 0 && (
                    <div className="tierImpactBox">
                      <h4 className="tierImpactTitle">
                        {t("tierImpactTitle", locale)}
                      </h4>
                      {result.freeMonths > 0 ? (
                        <>
                          <p className="tierImpactText">
                            {t("tierImpactFree", locale).replace(
                              "{months}",
                              String(result.freeMonths),
                            )}
                          </p>
                          <p className="tierImpactDelta">
                            {t("tierImpactFreeDelta", locale).replace(
                              "{amount}",
                              formatCurrency(result.tierImpactDelta, locale),
                            )}
                          </p>
                          <p
                            className="tierImpactMethodology"
                            dangerouslySetInnerHTML={{
                              __html: t("tierMethodologyNote", locale),
                            }}
                          />
                        </>
                      ) : (
                        <p className="tierImpactAllPaid">
                          {t("tierImpactAllPaid", locale)}
                        </p>
                      )}
                      {subscriptionEstimate?.tierBreakdown?.student &&
                        subscriptionEstimate.tierBreakdown.student.months >
                          0 && (
                          <p className="tierImpactNote">
                            {t("tierStudentNote", locale)}
                          </p>
                        )}
                    </div>
                  )}

                  {/* Collapsible methodology info */}
                  <div className="methodologyToggle">
                    <button
                      className="collapsibleToggle"
                      onClick={() =>
                        setMethodologyInfoOpen(!methodologyInfoOpen)
                      }
                      aria-expanded={methodologyInfoOpen}
                    >
                      <span
                        className={`collapsibleChevron ${
                          methodologyInfoOpen ? "open" : ""
                        }`}
                      >
                        ▾
                      </span>
                      {locale === "en"
                        ? "About these estimates"
                        : "Om desse estimata"}
                    </button>
                    {methodologyInfoOpen && (
                      <div className="methodologyContent">
                        <p
                          className="subtle"
                          dangerouslySetInnerHTML={{
                            __html: t("proRataNote", locale),
                          }}
                        />
                        <p
                          className="subtle"
                          style={{ marginTop: 10 }}
                          dangerouslySetInnerHTML={{
                            __html: t("subPricingNote", locale),
                          }}
                        />
                        {subscriptionSegments.length > 0 && (
                          <p
                            className="subtle"
                            style={{ marginTop: 10 }}
                            dangerouslySetInnerHTML={{
                              __html: t("tierMethodologyNote", locale),
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="card">
                <div className="cardHeader stickyHeader">
                  <div>
                    <h2>
                      {t("yourArtistsTitle", locale)} ({filteredArtists.length})
                      – {allAlbumKeys.length} {t("uniqueAlbumsLabel", locale)}
                    </h2>
                    {subscriptionEstimate && (
                      <p className="stickySubtitle">
                        {locale === "en" ? (
                          <>
                            For what you paid for Spotify Premium (
                            {formatCurrency(effectiveSubscriptionCost, locale)})
                            you could have bought approx.{" "}
                            <strong>{albumBudget} albums</strong> at{" "}
                            {formatCurrency(cfg.albumPriceNOK, locale)} each.
                          </>
                        ) : (
                          <>
                            For det du har betalt i Spotify Premium (
                            {formatCurrency(effectiveSubscriptionCost, locale)})
                            kunne du ha kjøpt ca.{" "}
                            <strong>{albumBudget} album</strong> à{" "}
                            {formatCurrency(cfg.albumPriceNOK, locale)} direkte.
                          </>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="headerActions">
                    <button
                      className="btn"
                      onClick={() => {
                        const next = { ...plannedAlbums };
                        for (const key of shownAlbumKeys) {
                          const [artist, album] = key.split("|||");
                          next[key] = { artist, album };
                        }
                        setPlannedAlbums(next);
                      }}
                    >
                      {t("addAllToPlan", locale)}
                    </button>

                    {plannedCount > 0 && (
                      <button
                        className="btnGhost"
                        onClick={() => setPlannedAlbums({})}
                      >
                        {t("clear", locale)}
                      </button>
                    )}
                  </div>

                  {/* Dropdown for planlagde album */}
                  {plannedCount > 0 && (
                    <div className="plannedDropdown">
                      <button
                        className="plannedDropdownToggle"
                        onClick={() => setPlannedAlbumsOpen((o) => !o)}
                      >
                        <span className="plannedDropdownSummary">
                          <span className="plannedBadge">{plannedCount}</span>
                          {t("albumsAddedMiddot", locale)} &middot;{" "}
                          {formatCurrency(plannedCost, locale)}
                        </span>
                        <span
                          className={`plannedChevron ${plannedAlbumsOpen ? "open" : ""}`}
                        >
                          ▾
                        </span>
                      </button>

                      {subscriptionEstimate && (
                        <div className="albumBudgetBar">
                          <div className="albumBudgetProgress">
                            <div
                              className="albumBudgetFill"
                              style={{
                                width: `${Math.min(100, albumBudget > 0 ? (plannedCount / albumBudget) * 100 : 0)}%`,
                              }}
                            />
                          </div>
                          <div className="albumBudgetText">
                            {albumsRemaining > 0 ? (
                              <>
                                <span className="albumBudgetRemaining">
                                  {albumsRemaining} {t("albumsLeft", locale)}
                                </span>{" "}
                                — {albumBudget} {t("couldHaveOwned", locale)} (
                                {formatCurrency(
                                  effectiveSubscriptionCost,
                                  locale,
                                )}
                                )
                              </>
                            ) : (
                              <span className="green">
                                ✓ {plannedCount - albumBudget}{" "}
                                {t("moreThanBudget", locale)} ({albumBudget}{" "}
                                {locale === "en" ? "albums" : "album"} ≈{" "}
                                {formatCurrency(
                                  effectiveSubscriptionCost,
                                  locale,
                                )}
                                )
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {plannedAlbumsOpen && (
                        <div className="plannedDropdownList">
                          {Object.entries(plannedAlbums).map(([key, val]) => (
                            <div className="plannedDropdownItem" key={key}>
                              <div className="plannedDropdownInfo">
                                <span className="plannedAlbumName">
                                  {val.album}
                                </span>
                                <span className="plannedArtistName">
                                  {val.artist}
                                </span>
                              </div>
                              <button
                                className="plannedRemoveBtn"
                                title={t("removeBtn", locale)}
                                onClick={() => {
                                  setPlannedAlbums((prev) => {
                                    const next = { ...prev };
                                    delete next[key];
                                    return next;
                                  });
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <div className="plannedDropdownTotal">
                            <span>
                              {locale === "en"
                                ? `Total ${plannedCount} albums`
                                : `Totalt ${plannedCount} album`}
                            </span>
                            <span className="green">
                              {formatCurrency(plannedCost, locale)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Top-N veljar */}
                <div className="topNSelector">
                  <span className="topNLabel">{t("showStatsFor", locale)}</span>
                  <div className="topNTabs">
                    {([5, 10, 20, 30, 50, "all"] as const).map((n) => {
                      const isAll = n === "all";
                      const label = isAll
                        ? `${t("allLabel", locale)} (${filteredArtists.length})`
                        : `${t("topPrefix", locale)} ${n}`;
                      const disabled = !isAll && n > filteredArtists.length;
                      return (
                        <button
                          key={String(n)}
                          className={`dateTab ${summaryTopN === n ? "active" : ""}`}
                          onClick={() => setSummaryTopN(n)}
                          disabled={disabled}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Samandrag */}
                <div className="sectionSummary">
                  <div className="summaryItem">
                    <span className="summaryLabel">
                      {t("totalListeningTime", locale)},{" "}
                      {summaryTopN === "all"
                        ? `${t("allLabel", locale).toLowerCase()} ${topNArtists.length}`
                        : `${t("topPrefix", locale).toLowerCase()} ${topNArtists.length}`}{" "}
                      {t("yourArtists", locale)}
                    </span>
                    <span className="summaryValue">
                      {formatHrs(topNMs, locale)}
                    </span>
                  </div>
                  <div className="summarySep" />
                  <div className="summaryItem">
                    <span className="summaryLabel">
                      {t("theorSpotifyValue", locale)}
                    </span>
                    <span className="summaryValue">
                      {formatCurrency(topNValue, locale)}
                    </span>
                  </div>
                  <div className="summarySep" />
                  <div className="summaryItem">
                    <span className="summaryLabel">
                      {t("albumsLabel", locale)}
                    </span>
                    <span className="summaryValue">{topNAlbumKeys.length}</span>
                  </div>
                  <div className="summarySep" />
                  <div className="summaryItem">
                    <span className="summaryLabel">
                      {t("buyPhysical", locale)}
                    </span>
                    <span className="summaryValue green">
                      {formatCurrency(topNCost, locale)}
                    </span>
                  </div>
                </div>

                {/* Søk og paginering */}
                <div className="paginationControls" ref={paginationRef}>
                  <div className="searchBox">
                    <input
                      type="text"
                      placeholder={t("searchArtist", locale)}
                      value={artistSearchQuery}
                      onChange={(e) => {
                        setArtistSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="searchInput"
                    />
                    {artistSearchQuery && (
                      <button
                        className="clearSearch"
                        onClick={() => {
                          setArtistSearchQuery("");
                          setCurrentPage(1);
                        }}
                        title={t("clearSearch", locale)}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="paginationInfo">
                    {t("showing", locale)} {startIndex + 1}–
                    {Math.min(endIndex, searchedArtists.length)}{" "}
                    {t("ofWord", locale)} {searchedArtists.length}
                  </div>

                  <div className="paginationNav">
                    <button
                      className="pageBtn"
                      onClick={() => {
                        setCurrentPage(1);
                        scrollToPagination();
                      }}
                      disabled={currentPage === 1}
                    >
                      ««
                    </button>
                    <button
                      className="pageBtn"
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        scrollToPagination();
                      }}
                      disabled={currentPage === 1}
                    >
                      ‹
                    </button>
                    <span className="pageNumbers">
                      {t("pageLabel", locale)} {currentPage}{" "}
                      {t("ofWord", locale)} {totalPages}
                    </span>
                    <button
                      className="pageBtn"
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        scrollToPagination();
                      }}
                      disabled={currentPage === totalPages}
                    >
                      ›
                    </button>
                    <button
                      className="pageBtn"
                      onClick={() => {
                        setCurrentPage(totalPages);
                        scrollToPagination();
                      }}
                      disabled={currentPage === totalPages}
                    >
                      »»
                    </button>
                  </div>

                  <div className="perPageSelect">
                    <label>
                      {t("perPage", locale)}
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                          scrollToPagination();
                        }}
                      >
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={250}>250</option>
                      </select>
                    </label>
                  </div>
                </div>

                {/* Grid-liste i staden for tabell -> stabil layout */}
                <div className="artistList">
                  {shownArtists.map((a) => {
                    // Finn faktisk posisjon i filteredArtists
                    const actualRank =
                      filteredArtists.findIndex(
                        (artist) => artist.artist === a.artist,
                      ) + 1;

                    return (
                      <div className="artistRow" key={a.artist}>
                        <div className="artistMain">
                          <div
                            className="artistName"
                            onClick={() => setSelectedArtist(a.artist)}
                            style={{ cursor: "pointer" }}
                          >
                            #{actualRank} {a.artist}
                          </div>
                          <div className="artistMeta">
                            <span className="metaItem">
                              <span className="metaLabel">
                                {t("listeningTime", locale)}
                              </span>{" "}
                              <b>{formatHrs(a.msPlayed, locale)}</b>
                            </span>
                            <span className="dot">•</span>
                            <span className="metaItem">
                              <span className="metaLabel">
                                {t("streamsLabel", locale)}
                              </span>{" "}
                              <b>{formatNum(a.estStreams, locale)}</b>
                            </span>
                            <span className="dot">•</span>
                            <span className="metaItem">
                              <span className="metaLabel">
                                {t("theorValue", locale)}
                              </span>{" "}
                              <b>{formatCurrency(a.estValueNOK, locale)}</b>
                            </span>
                            <span className="dot">•</span>
                            <span className="metaItem">
                              <span className="metaLabel">
                                {t("albumEquiv", locale)}
                              </span>{" "}
                              <b>{a.albumEquivalent.toFixed(2)}</b>
                            </span>
                          </div>
                          {a.loyaltyScore > 0 && (
                            <div
                              className="loyaltyBadge"
                              title={
                                a.firstListen
                                  ? `${t("loyaltySince", locale)} ${a.firstListen} · ${a.distinctMonths} ${t("loyaltyMonths", locale)}`
                                  : ""
                              }
                            >
                              <span className="loyaltyBar">
                                <span
                                  className="loyaltyFill"
                                  style={{ width: `${a.loyaltyScore}%` }}
                                />
                              </span>
                              <span className="loyaltyText">
                                {t("loyaltyLabel", locale)} {a.loyaltyScore}%
                                {a.firstListen && (
                                  <span className="loyaltySince">
                                    {" · "}
                                    {t("loyaltySince", locale)}{" "}
                                    {a.firstListen.slice(0, 7)}
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>

                        <div
                          className="albumWrap"
                          aria-label={t("albumsLabel", locale)}
                        >
                          <p className="albumInstructions">
                            {t("clickAlbumsHint", locale)}
                          </p>
                          {(() => {
                            const isExpanded = expandedAlbumArtists.has(
                              a.artist,
                            );
                            const visibleAlbums = isExpanded
                              ? a.topAlbums
                              : a.topAlbums.slice(0, 5);
                            const hasMore = a.topAlbums.length > 5;
                            return (
                              <>
                                {visibleAlbums.map((x) => {
                                  const key = albumKey(a.artist, x.album);
                                  const isPlanned = !!plannedAlbums[key];

                                  return (
                                    <button
                                      key={key}
                                      className={
                                        isPlanned
                                          ? "albumChip selected"
                                          : "albumChip"
                                      }
                                      onClick={() => {
                                        setPlannedAlbums((prev) => {
                                          const next = { ...prev };
                                          if (next[key]) delete next[key];
                                          else
                                            next[key] = {
                                              artist: a.artist,
                                              album: x.album,
                                            };
                                          return next;
                                        });
                                      }}
                                      title={`${x.album}${isPlanned ? ` (${t("inPurchasePlan", locale)})` : ""}`}
                                    >
                                      <span className="chipText">
                                        {x.album}
                                      </span>
                                      {isPlanned && (
                                        <span className="chipMark">✓</span>
                                      )}
                                    </button>
                                  );
                                })}
                                {hasMore && (
                                  <button
                                    className="albumChip showAllBtn"
                                    onClick={() => {
                                      setExpandedAlbumArtists((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(a.artist))
                                          next.delete(a.artist);
                                        else next.add(a.artist);
                                        return next;
                                      });
                                    }}
                                  >
                                    <span className="chipText">
                                      {isExpanded
                                        ? t("showFewer", locale)
                                        : `${t("showAllAlbums", locale)} ${a.topAlbums.length} ${t("albumWord", locale)}`}
                                    </span>
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>

                        <button
                          className="iconBtn"
                          title={t("removeFromList", locale)}
                          onClick={() => {
                            setExcludedArtists((prev) => {
                              const next = new Set(prev);
                              next.add(a.artist);
                              return next;
                            });
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination below artist list */}
                <div className="paginationControls paginationBottom">
                  <div className="paginationInfo">
                    {t("showing", locale)} {startIndex + 1}–
                    {Math.min(endIndex, searchedArtists.length)}{" "}
                    {t("ofWord", locale)} {searchedArtists.length}
                  </div>

                  <div className="paginationNav">
                    <button
                      className="pageBtn"
                      onClick={() => {
                        setCurrentPage(1);
                        scrollToPagination();
                      }}
                      disabled={currentPage === 1}
                    >
                      ««
                    </button>
                    <button
                      className="pageBtn"
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        scrollToPagination();
                      }}
                      disabled={currentPage === 1}
                    >
                      ‹
                    </button>
                    <span className="pageNumbers">
                      {t("pageLabel", locale)} {currentPage}{" "}
                      {t("ofWord", locale)} {totalPages}
                    </span>
                    <button
                      className="pageBtn"
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        scrollToPagination();
                      }}
                      disabled={currentPage === totalPages}
                    >
                      ›
                    </button>
                    <button
                      className="pageBtn"
                      onClick={() => {
                        setCurrentPage(totalPages);
                        scrollToPagination();
                      }}
                      disabled={currentPage === totalPages}
                    >
                      »»
                    </button>
                  </div>

                  <div className="perPageSelect">
                    <label>
                      {t("perPage", locale)}
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                          scrollToPagination();
                        }}
                      >
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={250}>250</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="divider" />

                <div className="buyPlan">
                  <div className="buyPlanHeader">
                    <h3>{t("plannedPurchases", locale)}</h3>
                    <div className="subtle">
                      {plannedCount > 0 ? (
                        <>
                          {t("albumsInPlan", locale)} <b>{plannedCount}</b> ·{" "}
                          {t("totalLabel", locale)}{" "}
                          <b>{formatCurrency(plannedCost, locale)}</b>
                        </>
                      ) : (
                        t("clickChipsToAdd", locale)
                      )}
                    </div>
                    {plannedCount > 0 && (
                      <button
                        className="btnExportPdf"
                        onClick={() =>
                          exportPlannedAlbumsPDF(
                            plannedAlbums,
                            cfg.albumPriceNOK,
                            locale,
                          )
                        }
                      >
                        {t("exportShoppingList", locale)}
                      </button>
                    )}
                  </div>

                  {plannedCount > 0 && (
                    <div className="planTable">
                      {Object.entries(plannedAlbums)
                        .map(([key, v]) => ({ key, ...v }))
                        .sort(
                          (a, b) =>
                            a.artist.localeCompare(b.artist) ||
                            a.album.localeCompare(b.album),
                        )
                        .map((row) => (
                          <div className="planRow" key={row.key}>
                            <div className="planArtist">{row.artist}</div>
                            <div className="planAlbum">{row.album}</div>
                            <div className="planPrice">
                              {formatCurrency(cfg.albumPriceNOK, locale)}
                            </div>
                            <button
                              className="btnGhost"
                              onClick={() => {
                                setPlannedAlbums((prev) => {
                                  const next = { ...prev };
                                  delete next[row.key];
                                  return next;
                                });
                              }}
                            >
                              {t("removeBtn", locale)}
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <p className="subtle" style={{ marginTop: 12 }}>
                  {t("interpretation", locale)}
                </p>
              </section>

              {/* <section className="card">
            <div className="cardHeader">
              <h2>4) Aktiv vs assistert lytting</h2>
              <div className="subtle">
                Heuristikk basert på <code>reason_start</code> frå Spotify
                dataene. «Aktiv» = du klikka eksplisitt for å spele; «Assistert» =
                autoplay, neste i kø o.l. Ei spilleliste du startar sjølv tel
                som aktiv berre for fyrste låt.
              </div>
            </div>

            <div className="statsGrid">
              <div className="stat">
                <div className="statLabel">Aktiv</div>
                <div className="statValue">
                  {pct(result.activeShare)}{" "}
                  <span className="statHint">
                    · {formatHrs(result.activeMsPlayed, locale)}
                  </span>
                </div>
              </div>
              <div className="stat">
                <div className="statLabel">Assistert</div>
                <div className="statValue">
                  {pct(result.passiveShare)}{" "}
                  <span className="statHint">
                    · {formatHrs(result.passiveMsPlayed, locale)}
                  </span>
                </div>
              </div>
              <div className="stat">
                <div className="statLabel">Est. streams</div>
                <div className="statValue">
                  {result.activeEstStreams.toFixed(0)}{" "}
                  <span className="statHint">
                    / {result.passiveEstStreams.toFixed(0)}
                  </span>
                </div>
              </div>
              <div className="stat">
                <div className="statLabel">Est. verdi</div>
                <div className="statValue">
                  {formatCurrency(result.activeEstValueNOK, locale)}{" "}
                  <span className="statHint">
                    / {formatCurrency(result.passiveEstValueNOK, locale)}
                  </span>
                </div>
              </div>
            </div>
          </section> */}

              {excludedArtists.size > 0 && (
                <section className="card soft">
                  <div className="cardHeader">
                    <h2>{t("excludedArtistsTitle", locale)}</h2>
                    <div className="subtle">{t("clickToRestore", locale)}</div>
                  </div>

                  <div className="chipsRow">
                    {Array.from(excludedArtists).map((artist) => (
                      <button
                        key={artist}
                        className="smallChip"
                        onClick={() => {
                          setExcludedArtists((prev) => {
                            const next = new Set(prev);
                            next.delete(artist);
                            return next;
                          });
                        }}
                        title={t("restoreTitle", locale)}
                      >
                        {artist} ↺
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Artist Detail Modal */}
          {selectedArtist && artistDetails && (
            <div
              className="modalOverlay"
              onClick={() => setSelectedArtist(null)}
            >
              <div
                className="modalContent"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modalHeader">
                  <h2>{artistDetails.artist}</h2>
                  <button
                    className="modalClose"
                    onClick={() => setSelectedArtist(null)}
                    aria-label={t("closeLabel", locale)}
                  >
                    ×
                  </button>
                </div>

                <div className="modalStats">
                  <div className="statItem">
                    <div className="statLabel">
                      {t("totalListeningTime", locale)}
                    </div>
                    <div className="statValue">
                      {formatHrs(artistDetails.totalMs, locale)}
                    </div>
                  </div>
                  <div className="statItem">
                    <div className="statLabel">
                      {t("totalPlaysLabel", locale)}
                    </div>
                    <div className="statValue">
                      {artistDetails.totalPlays.toLocaleString()}
                    </div>
                  </div>
                  <div className="statItem">
                    <div className="statLabel">{t("albumsLabel", locale)}</div>
                    <div className="statValue">
                      {artistDetails.albums.length}
                    </div>
                  </div>
                </div>

                <div className="modalFilters">
                  <button
                    className={
                      artistDetailSort === "time"
                        ? "filterBtn active"
                        : "filterBtn"
                    }
                    onClick={() => setArtistDetailSort("time")}
                  >
                    {t("sortByTime", locale)}
                  </button>
                  <button
                    className={
                      artistDetailSort === "tracks"
                        ? "filterBtn active"
                        : "filterBtn"
                    }
                    onClick={() => setArtistDetailSort("tracks")}
                  >
                    {t("sortByPlays", locale)}
                  </button>
                </div>

                <div className="modalBody">
                  {artistDetails.albums.map((album) => (
                    <div key={album.album} className="albumDetail">
                      <div className="albumHeader">
                        <h3>{album.album}</h3>
                        <div className="albumStats">
                          {formatHrs(album.totalMs, locale)} ·{" "}
                          {album.totalPlays} {t("playsWord", locale)}
                        </div>
                      </div>
                      <div className="trackList">
                        {album.tracks.map((track) => (
                          <div key={track.trackName} className="trackRow">
                            <div className="trackName">{track.trackName}</div>
                            <div className="trackStats">
                              {formatHrs(track.msPlayed, locale)} ·{" "}
                              {track.plays} {t("playsWord", locale)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Artist Comparison Chart */}
          {result && result.artists.length > 0 && (
            <ArtistComparisonChart
              allRows={rows}
              artists={result.artists}
              locale={locale}
              minMsPlayed={cfg.minMsPlayedToCount}
              availableYears={availableYears}
              dateFilterMode={dateFilterMode}
              dateFilterYear={dateFilterYear}
              onDateFilterChange={(mode, year) => {
                setDateFilterMode(mode);
                if (mode === "year" && year) {
                  setDateFilterYear(year);
                } else if (mode === "all") {
                  setDateFilterYear(null);
                }
              }}
            />
          )}

          {/* Label Analytics Section */}
          <LabelAnalytics
            allRows={rows}
            minMsPlayed={cfg.minMsPlayedToCount}
            locale={locale}
            availableYears={availableYears}
            dateFilterMode={dateFilterMode}
            dateFilterYear={dateFilterYear}
            excludedArtists={excludedArtists}
            onDateFilterChange={(mode, year) => {
              setDateFilterMode(mode);
              if (mode === "year" && year) {
                setDateFilterYear(year);
              } else if (mode === "all") {
                setDateFilterYear(null);
              }
            }}
          />

          {/* ─── Extra Spotify Data Sections ─── */}

          {/* Account info from Userdata.json */}
          {userdata && userdata.creationTime && (
            <section className="card">
              <div className="cardHeader">
                <h2>{t("userdataTitle", locale)}</h2>
                <p
                  className="subtle"
                  dangerouslySetInnerHTML={{
                    __html: t("userdataDesc", locale),
                  }}
                />
              </div>
              <div className="userdataGrid">
                {userdata.creationTime && (
                  <div className="userdataItem">
                    <div className="userdataLabel">
                      {t("userdataCreated", locale)}
                    </div>
                    <div className="userdataValue">{userdata.creationTime}</div>
                  </div>
                )}
                {userdata.country && (
                  <div className="userdataItem">
                    <div className="userdataLabel">
                      {t("userdataCountry", locale)}
                    </div>
                    <div className="userdataValue">{userdata.country}</div>
                  </div>
                )}
                {userdata.creationTime &&
                  (() => {
                    const created = new Date(userdata.creationTime);
                    if (isNaN(created.getTime())) return null;
                    const years = Math.floor(
                      (Date.now() - created.getTime()) /
                        (365.25 * 24 * 60 * 60 * 1000),
                    );
                    return (
                      <div className="userdataItem">
                        <div className="userdataLabel">
                          {t("userdataAccountAge", locale)}
                        </div>
                        <div className="userdataValue">
                          {years} {t("userdataYears", locale)}
                        </div>
                      </div>
                    );
                  })()}
              </div>
            </section>
          )}

          {/* How Spotify sees you — Inferences.json */}
          {inferences.length > 0 && (
            <section className="card">
              <div className="cardHeader">
                <h2>{t("inferencesTitle", locale)}</h2>
                <p
                  className="subtle"
                  dangerouslySetInnerHTML={{
                    __html: t("inferencesDesc", locale),
                  }}
                />
              </div>

              {(() => {
                // Categorize inferences
                const demo: string[] = [];
                const content: string[] = [];
                const adSegments: string[] = [];
                const other: string[] = [];

                for (const inf of inferences) {
                  const lower = inf.toLowerCase();
                  if (lower.startsWith("demographic_")) {
                    demo.push(
                      inf.replace("demographic_", "").replace(/_/g, " "),
                    );
                  } else if (lower.startsWith("content_")) {
                    content.push(
                      inf.replace("content_", "").replace(/_/g, " "),
                    );
                  } else if (lower.startsWith("1p_custom_")) {
                    const clean = inf
                      .replace("1P_Custom_", "")
                      .replace(/_/g, " ");
                    adSegments.push(clean);
                  } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(lower)) {
                    // UUIDs — internal IDs, skip display
                  } else {
                    other.push(inf.replace(/_/g, " "));
                  }
                }

                return (
                  <div className="inferencesContent">
                    {demo.length > 0 && (
                      <div className="inferenceGroup">
                        <h4 className="inferenceGroupTitle">
                          👤 {t("inferencesDemo", locale)}
                        </h4>
                        <div className="inferenceChips">
                          {demo.map((d) => (
                            <span className="inferenceChip demo" key={d}>
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {content.length > 0 && (
                      <div className="inferenceGroup">
                        <h4 className="inferenceGroupTitle">
                          🎵 {t("inferencesContent", locale)}
                        </h4>
                        <div className="inferenceChips">
                          {content.map((c) => (
                            <span className="inferenceChip content" key={c}>
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {adSegments.length > 0 && (
                      <div className="inferenceGroup">
                        <h4 className="inferenceGroupTitle">
                          📢 {t("inferencesAdSegments", locale)}
                        </h4>
                        <div className="inferenceChips">
                          {adSegments.map((a) => (
                            <span
                              className={`inferenceChip ad ${a.includes("[Advertiser-Restricted]") ? "restricted" : ""}`}
                              key={a}
                            >
                              {a.replace(" [Advertiser-Restricted]", "")}
                              {a.includes("[Advertiser-Restricted]") && (
                                <span className="restrictedBadge">
                                  {t("inferencesRestricted", locale)}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {other.length > 0 && (
                      <div className="inferenceGroup">
                        <h4 className="inferenceGroupTitle">
                          🏷️ {t("inferencesOther", locale)}
                        </h4>
                        <div className="inferenceChips">
                          {other.map((o) => (
                            <span className="inferenceChip other" key={o}>
                              {o}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <p
                      className="inferencesPrivacyNote"
                      dangerouslySetInnerHTML={{
                        __html: t("inferencesPrivacyNote", locale),
                      }}
                    />
                  </div>
                );
              })()}
            </section>
          )}

          {/* Listener segments — Marquee.json */}
          {marqueeArtists.length > 0 && (
            <section className="card">
              <div className="cardHeader">
                <h2>{t("marqueeTitle", locale)}</h2>
                <p
                  className="subtle"
                  dangerouslySetInnerHTML={{
                    __html: t("marqueeDesc", locale),
                  }}
                />
              </div>

              <div className="marqueeContent">
                <div className="marqueeCount">
                  {t("marqueeCount", locale).replace(
                    "{count}",
                    String(marqueeArtists.length),
                  )}
                </div>
                {/* Group by segment */}
                {Object.entries(
                  marqueeArtists.reduce<Record<string, string[]>>((acc, m) => {
                    const seg = m.segment || "Unknown";
                    if (!acc[seg]) acc[seg] = [];
                    acc[seg].push(m.artistName);
                    return acc;
                  }, {}),
                ).map(([segment, artists]) => (
                  <div key={segment} style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        opacity: 0.7,
                        marginBottom: 6,
                      }}
                    >
                      {segment} ({artists.length})
                    </div>
                    <div className="marqueeChips">
                      {artists.map((name) => (
                        <span className="marqueeChip" key={name}>
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                <p
                  className="marqueeEthicsNote"
                  dangerouslySetInnerHTML={{
                    __html: t("marqueeEthicsNote", locale),
                  }}
                />
              </div>
            </section>
          )}

          {/* Summary & Export Section */}
          {result && (
            <section className="card summaryExportSection">
              <div className="cardHeader">
                <h2>{t("summaryExportTitle", locale)}</h2>
                <p className="subtle">{t("summaryExportDesc", locale)}</p>
              </div>

              <div className="summaryExportContent">
                <div className="overviewActionsGroup">
                  <span className="overviewActionsLabel">
                    {t("exportReport", locale)}
                  </span>
                  <div className="exportBtnGroup">
                    {(
                      [
                        [10, `${t("topPrefix", locale)} 10`],
                        [30, `${t("topPrefix", locale)} 30`],
                        [50, `${t("topPrefix", locale)} 50`],
                        [100, `${t("topPrefix", locale)} 100`],
                        [500, `${t("topPrefix", locale)} 500`],
                        [
                          "all",
                          `${t("allLabel", locale)} (${result.artists.length})`,
                        ],
                      ] as [number | "all", string][]
                    ).map(([n, label]) => (
                      <button
                        key={String(n)}
                        className="btnExportPdf btnExportSmall"
                        onClick={() =>
                          exportFullReportPDF(
                            result,
                            cfg,
                            subscriptionEstimate,
                            activeDateRange,
                            excludedArtists,
                            plannedAlbums,
                            n as number | "all",
                            countOnlyActiveSubscriptionMonths,
                            locale,
                          )
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overviewActionsGroup">
                  <span className="overviewActionsLabel">
                    {t("shareResults", locale)}
                  </span>
                  <div className="shareGroup">
                    <button
                      className="btnShare btnShareMain"
                      onClick={async () => {
                        const totalVal = result.artists.reduce(
                          (s, a) => s + a.estValueNOK,
                          0,
                        );
                        const blob = await generateShareImage({
                          subCost: effectiveSubscriptionCost,
                          artistValue: totalVal,
                          artistCount: result.artists.length,
                          hours: formatHrs(result.totalMsPlayed, locale),
                          locale,
                          heroSrc: heroImg,
                          activePercent: Math.round(result.activeShare * 100),
                          assistedPercent: Math.round(
                            result.passiveShare * 100,
                          ),
                        });
                        const file = new File([blob], "spotify-unwrapped.png", {
                          type: "image/png",
                        });

                        if (
                          navigator.share &&
                          navigator.canShare?.({ files: [file] })
                        ) {
                          try {
                            await navigator.share({
                              files: [file],
                              title: "Spotify Unwrapped",
                              text:
                                t("shareText", locale) +
                                "https://banjohans.github.io/Spotify-Unwrapped/",
                            });
                            return;
                          } catch {
                            /* user cancelled */
                          }
                        }

                        let copiedImage = false;
                        try {
                          const item = new ClipboardItem({ "image/png": blob });
                          await navigator.clipboard.write([item]);
                          copiedImage = true;
                        } catch {
                          try {
                            await navigator.clipboard.writeText(
                              t("shareText", locale) +
                                "https://banjohans.github.io/Spotify-Unwrapped/",
                            );
                          } catch {
                            /* clipboard not available */
                          }
                        }

                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "spotify-unwrapped.png";
                        a.click();
                        URL.revokeObjectURL(url);

                        setShareToast(
                          copiedImage
                            ? t("shareCopiedImage", locale)
                            : t("shareCopiedText", locale),
                        );
                        setTimeout(() => setShareToast(null), 8000);
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
                        <polyline points="7 7 12 2 17 7" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                      </svg>
                      {t("shareResults", locale)}
                    </button>
                    <button
                      className="btnShare btnShareFb"
                      onClick={async () => {
                        const totalVal = result.artists.reduce(
                          (s, a) => s + a.estValueNOK,
                          0,
                        );
                        const blob = await generateShareImage({
                          subCost: effectiveSubscriptionCost,
                          artistValue: totalVal,
                          artistCount: result.artists.length,
                          hours: formatHrs(result.totalMsPlayed, locale),
                          locale,
                          heroSrc: heroImg,
                          activePercent: Math.round(result.activeShare * 100),
                          assistedPercent: Math.round(
                            result.passiveShare * 100,
                          ),
                        });

                        const file = new File([blob], "spotify-unwrapped.png", {
                          type: "image/png",
                        });
                        if (
                          navigator.share &&
                          navigator.canShare?.({ files: [file] })
                        ) {
                          try {
                            await navigator.share({
                              files: [file],
                              title: "Spotify Unwrapped",
                              text:
                                t("shareText", locale) +
                                "https://banjohans.github.io/Spotify-Unwrapped/",
                            });
                            return;
                          } catch {
                            /* user cancelled */
                          }
                        }

                        try {
                          const item = new ClipboardItem({ "image/png": blob });
                          await navigator.clipboard.write([item]);
                        } catch {
                          /* clipboard image not supported */
                        }

                        const dlUrl = URL.createObjectURL(blob);
                        const dl = document.createElement("a");
                        dl.href = dlUrl;
                        dl.download = "spotify-unwrapped.png";
                        dl.click();
                        URL.revokeObjectURL(dlUrl);

                        window.open(
                          "https://www.facebook.com/",
                          "_blank",
                          "noopener",
                        );

                        setShareToast(t("shareFbToast", locale));
                        setTimeout(() => setShareToast(null), 10000);
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      {t("shareFacebook", locale)}
                    </button>
                  </div>
                  <p className="shareTip">{t("shareTip", locale)}</p>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* Footer */}
      <footer className="siteFooter">
        <p>{t("developedBy", locale)}</p>
        <button
          className="disclaimerLink"
          onClick={() => setDisclaimerOpen(true)}
        >
          {t("disclaimerLink", locale)}
        </button>

        {/* ─── Anonymized data contribution CTA ─── */}
        <div
          className="contributeCta"
          onClick={() => {
            if (!result) {
              setShareToast(t("contributeNoData", locale));
              setTimeout(() => setShareToast(null), 5000);
              return;
            }
            setContributeOpen(true);
          }}
        >
          <div className="contributeCtaIcon">📊</div>
          <div className="contributeCtaText">
            <strong>{t("contributeCtaHeadline", locale)}</strong>
            <span>{t("contributeDesc", locale)}</span>
          </div>
          <span className="contributeCtaArrow">→</span>
        </div>
      </footer>

      {/* Disclaimer Modal */}
      {disclaimerOpen && (
        <div className="modalOverlay" onClick={() => setDisclaimerOpen(false)}>
          <div
            className="modalContent disclaimerModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalHeader">
              <h2>{t("disclaimerTitle", locale)}</h2>
              <button
                className="modalClose"
                onClick={() => setDisclaimerOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="disclaimerBody">
              <p className="disclaimerIntro">{t("disclaimerIntro", locale)}</p>
              <p className="disclaimerIntroRebuttal">
                <strong>{t("disclaimerIntroRebuttal", locale)}</strong>
              </p>

              <h3>{t("disclaimerStep1Title", locale)}</h3>
              <p
                dangerouslySetInnerHTML={{
                  __html: t("disclaimerStep1", locale),
                }}
              />

              <h3>{t("disclaimerStep2Title", locale)}</h3>
              <p
                dangerouslySetInnerHTML={{
                  __html: t("disclaimerStep2", locale),
                }}
              />

              <h3>{t("disclaimerStep3Title", locale)}</h3>
              <p
                dangerouslySetInnerHTML={{
                  __html: t("disclaimerStep3", locale),
                }}
              />

              <h3>{t("disclaimerStep4Title", locale)}</h3>
              <p
                dangerouslySetInnerHTML={{
                  __html: t("disclaimerStep4", locale),
                }}
              />

              <h3>{t("disclaimerCaveatsTitle", locale)}</h3>
              <ul>
                {(tRaw("disclaimerCaveats", locale) as readonly string[]).map(
                  (item, i) => (
                    <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
                  ),
                )}
              </ul>

              <p
                className="disclaimerPurpose"
                dangerouslySetInnerHTML={{
                  __html: t("disclaimerPurpose", locale),
                }}
              />
              <p
                className="disclaimerSolution"
                dangerouslySetInnerHTML={{
                  __html: t("disclaimerSolution", locale),
                }}
              />

              <div className="disclaimerPrivacy">
                <span>🔒</span> {t("disclaimerPrivacy", locale)}
              </div>

              {/* Collapsible: Research & Math */}
              <div className="disclaimerSection">
                <button
                  className="disclaimerToggle"
                  onClick={() => setResearchOpen((v) => !v)}
                >
                  {researchOpen ? "▾" : "▸"}{" "}
                  {t("disclaimerResearchTitle", locale)}
                </button>
                {researchOpen && (
                  <div className="disclaimerSectionBody">
                    <p>{t("disclaimerResearchIntro", locale)}</p>
                    <p
                      dangerouslySetInnerHTML={{
                        __html: t("disclaimerResearchCoreIdea", locale),
                      }}
                    />
                    <div
                      className="katexBlock"
                      dangerouslySetInnerHTML={{
                        __html: renderLatex(
                          t("disclaimerResearchFormula1", locale),
                        ),
                      }}
                    />
                    <ul className="formulaVars">
                      {(
                        tRaw(
                          "disclaimerResearchFormula1Vars",
                          locale,
                        ) as readonly string[]
                      ).map((v, i) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: v }} />
                      ))}
                    </ul>

                    <p>{t("disclaimerResearchStreamValue", locale)}</p>
                    <div
                      className="katexBlock"
                      dangerouslySetInnerHTML={{
                        __html: renderLatex(
                          t("disclaimerResearchFormula2", locale),
                        ),
                      }}
                    />
                    <p
                      dangerouslySetInnerHTML={{
                        __html: t("disclaimerResearchVariation", locale),
                      }}
                    />

                    <p
                      dangerouslySetInnerHTML={{
                        __html: t("disclaimerResearchUserValue", locale),
                      }}
                    />
                    <div
                      className="katexBlock"
                      dangerouslySetInnerHTML={{
                        __html: renderLatex(
                          t("disclaimerResearchFormula3", locale),
                        ),
                      }}
                    />
                    <ul className="formulaVars">
                      {(
                        tRaw(
                          "disclaimerResearchFormula3Vars",
                          locale,
                        ) as readonly string[]
                      ).map((v, i) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: v }} />
                      ))}
                    </ul>

                    <p>{t("disclaimerResearchIllustrates", locale)}</p>
                    <p>{t("disclaimerResearchMatters", locale)}</p>

                    <h4 className="breakeven-title">
                      {t("disclaimerBreakevenTitle", locale)}
                    </h4>
                    <p
                      dangerouslySetInnerHTML={{
                        __html: t("disclaimerBreakevenIntro", locale),
                      }}
                    />
                    <div
                      className="katexBlock"
                      dangerouslySetInnerHTML={{
                        __html: renderLatex(
                          t("disclaimerBreakevenFormula", locale),
                        ),
                      }}
                    />
                    <p>{t("disclaimerBreakevenExample", locale)}</p>
                    <ul className="breakeven-numbers">
                      {(
                        tRaw(
                          "disclaimerBreakevenNumbers",
                          locale,
                        ) as readonly string[]
                      ).map((v, i) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: v }} />
                      ))}
                    </ul>
                    <p
                      className="breakeven-caveat"
                      dangerouslySetInnerHTML={{
                        __html: t("disclaimerBreakevenPoolNote", locale),
                      }}
                    />
                    <ul className="breakeven-numbers">
                      {(
                        tRaw(
                          "disclaimerBreakevenPoolNumbers",
                          locale,
                        ) as readonly string[]
                      ).map((v, i) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: v }} />
                      ))}
                    </ul>
                    <p
                      className="breakeven-implication"
                      dangerouslySetInnerHTML={{
                        __html: t("disclaimerBreakevenImplication", locale),
                      }}
                    />
                    <p className="breakeven-caveat">
                      {t("disclaimerBreakevenCaveat", locale)}
                    </p>
                    <p className="breakeven-caveat">
                      {t("disclaimerBreakevenGenre", locale)}
                    </p>
                  </div>
                )}
              </div>

              {/* Collapsible: Studies */}
              <div className="disclaimerSection">
                <button
                  className="disclaimerToggle"
                  onClick={() => setStudiesOpen((v) => !v)}
                >
                  {studiesOpen ? "▾" : "▸"}{" "}
                  {t("disclaimerStudiesTitle", locale)}
                </button>
                {studiesOpen && (
                  <div className="disclaimerSectionBody">
                    <p>{t("disclaimerStudiesIntro", locale)}</p>
                    {([1, 2, 3, 4, 5, 6, 7, 8] as const).map((n) => {
                      const titleKey = `disclaimerStudy${n}Title` as Parameters<
                        typeof t
                      >[0];
                      const metaKey = `disclaimerStudy${n}Meta` as Parameters<
                        typeof t
                      >[0];
                      const summaryKey =
                        `disclaimerStudy${n}Summary` as Parameters<typeof t>[0];
                      const urlKey = `disclaimerStudy${n}Url` as Parameters<
                        typeof t
                      >[0];
                      return (
                        <div className="studyCard" key={n}>
                          <div className="studyTitle">
                            <a
                              href={t(urlKey, locale)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {t(titleKey, locale)}
                            </a>
                          </div>
                          <div className="studyMeta">{t(metaKey, locale)}</div>
                          <p className="studySummary">
                            {t(summaryKey, locale)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Anonymized export modal ─── */}
      {contributeOpen && result && (
        <div className="modalOverlay" onClick={() => setContributeOpen(false)}>
          <div
            className="modalContent contributeModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalHeader">
              <h2>{t("contributeTitle", locale)}</h2>
              <button
                className="modalClose"
                onClick={() => setContributeOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="contributeBody">
              <p
                className="contributePrivacy"
                dangerouslySetInnerHTML={{
                  __html: t("contributePrivacyNote", locale),
                }}
              />

              <div className="contributeColumns">
                <div className="contributeCol">
                  <h3>{t("contributeIncludedTitle", locale)}</h3>
                  <ul className="contributeList contributeListIncluded">
                    {(
                      tRaw("contributeIncluded", locale) as readonly string[]
                    ).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="contributeCol">
                  <h3>{t("contributeRemovedTitle", locale)}</h3>
                  <ul className="contributeList contributeListRemoved">
                    {(
                      tRaw("contributeRemoved", locale) as readonly string[]
                    ).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <h3 style={{ marginTop: 20 }}>
                {t("contributeDemographicsTitle", locale)}
              </h3>
              <p className="subtle">
                {t("contributeDemographicsDesc", locale)}
              </p>

              <div className="contributeFormGrid">
                <label>
                  {t("contributeGenderLabel", locale)}
                  <select
                    value={contribGender}
                    onChange={(e) => setContribGender(Number(e.target.value))}
                  >
                    {(
                      tRaw(
                        "contributeGenderOptions",
                        locale,
                      ) as readonly string[]
                    ).map((opt, i) => (
                      <option key={i} value={i}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("contributeAgeLabel", locale)}
                  <select
                    value={contribAge}
                    onChange={(e) => setContribAge(Number(e.target.value))}
                  >
                    {(
                      tRaw("contributeAgeOptions", locale) as readonly string[]
                    ).map((opt, i) => (
                      <option key={i} value={i}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("contributeSocialLabel", locale)}
                  <select
                    value={contribSocial}
                    onChange={(e) => setContribSocial(Number(e.target.value))}
                  >
                    {(
                      tRaw(
                        "contributeSocialOptions",
                        locale,
                      ) as readonly string[]
                    ).map((opt, i) => (
                      <option key={i} value={i}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("contributeCountryLabel", locale)}
                  <select
                    value={contribCountry || userdata?.country || ""}
                    onChange={(e) => setContribCountry(e.target.value)}
                  >
                    <option value="">
                      {locale === "no" ? "Vel land" : "Select country"}
                    </option>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Consent + Human verification */}
              <label className="contributeConsentLabel">
                <input
                  type="checkbox"
                  checked={contribConsent}
                  onChange={(e) => setContribConsent(e.target.checked)}
                />
                {t("contributeConsentLabel", locale)}
              </label>

              {!captchaVerified || !contribConsent ? (
                <div className="captchaBox">
                  {!contribConsent && (
                    <p className="captchaBlockedHint">
                      {locale === "no"
                        ? "Du må godta vilkåra over for å fortsetje."
                        : "You must accept the terms above to continue."}
                    </p>
                  )}
                  {contribConsent && !captchaVerified && (
                    <label className="captchaLabel">
                      {t("captchaPrompt", locale)
                        .replace("{a}", String(captchaChallenge.a))
                        .replace("{b}", String(captchaChallenge.b))}
                      <div className="captchaInputRow">
                        <input
                          type="number"
                          className="captchaInput"
                          value={captchaAnswer}
                          onChange={(e) => {
                            setCaptchaAnswer(e.target.value);
                            if (
                              parseInt(e.target.value, 10) ===
                              captchaChallenge.answer
                            ) {
                              setCaptchaVerified(true);
                            }
                          }}
                          placeholder="?"
                        />
                        <span className="captchaHint">
                          {t("captchaHint", locale)}
                        </span>
                      </div>
                    </label>
                  )}
                </div>
              ) : (
                <>
                  <button
                    className="btnExportPdf contributeDownloadBtn"
                    onClick={async () => {
                      const genderOpts = tRaw(
                        "contributeGenderOptions",
                        locale,
                      ) as readonly string[];
                      const ageOpts = tRaw(
                        "contributeAgeOptions",
                        locale,
                      ) as readonly string[];
                      const socialOpts = tRaw(
                        "contributeSocialOptions",
                        locale,
                      ) as readonly string[];

                      // Build pseudonymous hash from username (or fallback)
                      const raw = userdata?.username ?? "anonymous";
                      const salt = "spotify-unwrapped-2026";
                      const encoder = new TextEncoder();
                      const data = encoder.encode(raw + salt);
                      const hashBuffer = await crypto.subtle.digest(
                        "SHA-256",
                        data,
                      );
                      const hashArray = Array.from(new Uint8Array(hashBuffer));
                      const pseudoId = hashArray
                        .map((b) => b.toString(16).padStart(2, "0"))
                        .join("")
                        .slice(0, 16);

                      // Random time offset ±59 minutes (in ms) — same for all rows in this export.
                      // Preserves relative gaps and patterns, but prevents exact timestamp matching.
                      const offsetMs = Math.round(
                        (Math.random() * 2 - 1) * 59 * 60 * 1000,
                      );

                      // Sanitize rows: strip identifying fields, apply time offset
                      const sanitizedRows = filteredRows.map((r) => {
                        let ts: string | null = null;
                        if (r.ts) {
                          const d = new Date(r.ts);
                          if (!isNaN(d.getTime())) {
                            ts = new Date(d.getTime() + offsetMs).toISOString();
                          }
                        }
                        return {
                          ts,
                          ms_played: r.ms_played ?? r.msPlayed ?? 0,
                          artist: r.master_metadata_album_artist_name ?? null,
                          album: r.master_metadata_album_album_name ?? null,
                          track: r.master_metadata_track_name ?? null,
                          reason_start: r.reason_start ?? null,
                          reason_end: r.reason_end ?? null,
                          shuffle: r.shuffle ?? null,
                          skipped: r.skipped ?? null,
                        };
                      });

                      const demographics = {
                        gender:
                          contribGender > 0 ? genderOpts[contribGender] : null,
                        ageGroup: contribAge > 0 ? ageOpts[contribAge] : null,
                        socialStatus:
                          contribSocial > 0 ? socialOpts[contribSocial] : null,
                        country:
                          (contribCountry || userdata?.country || "").trim() ||
                          null,
                      };

                      const exportData = {
                        version: 1,
                        pseudoId,
                        exportedAt: new Date().toISOString(),
                        locale,
                        demographics,
                        totalRows: sanitizedRows.length,
                        rows: sanitizedRows,
                      };

                      const json = JSON.stringify(exportData, null, 2);
                      const blob = new Blob([json], {
                        type: "application/json",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `spotify-unwrapped-anon-${pseudoId}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    {t("contributeDownload", locale)}
                  </button>

                  <p className="contributeUploadHint">
                    {t("contributeUploadHint", locale)}
                  </p>
                  <a
                    className="contributeUploadLink"
                    href="https://www.dropbox.com/request/H5CeM21kcBUwHiuInXq7"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("contributeUploadLink", locale)} →
                  </a>
                </>
              )}

              <div className="researcherCta">
                <span className="researcherCtaIcon">🎓</span>
                <div className="researcherCtaContent">
                  <strong>{t("researcherCtaHeadline", locale)}</strong>
                  <p>{t("researcherCtaDesc", locale)}</p>
                  <a
                    className="researcherCtaLink"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      const u = ["hansmartinaustestad", "gmail.com"].join("@");
                      window.location.href = `mailto:${u}?subject=${encodeURIComponent("Research data request – Spotify Unwrapped")}`;
                    }}
                  >
                    {t("researcherCtaLink", locale)} →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {shareToast && <div className="shareToast">{shareToast}</div>}
    </div>
  );
}
