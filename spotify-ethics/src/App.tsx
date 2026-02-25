import { useMemo, useState, useEffect, useRef } from "react";
import { analyze, calcHistoricalSubscriptionCost } from "./lib/analyze";
import type { AnalysisConfig, SpotifyStreamRow } from "./lib/analyze";
import ListeningCharts from "./components/ListeningCharts";
import ArtistComparisonChart from "./components/ArtistComparisonChart";
import { LabelAnalytics } from "./components/LabelAnalytics";
import {
  type Locale,
  PRICE_HISTORY,
  ROYALTY_HISTORY,
  DEFAULT_ALBUM_PRICE,
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
import analyticsImg from "./assets/analytics.png";
import insightImg from "./assets/insight.png";
import privateImg from "./assets/private.png";
import heroImg from "./assets/hero.png";

function albumKey(artist: string, album: string) {
  return `${artist}|||${album}`;
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
    `${restPctInt}% ${locale === "en" ? "...who knows?" : "...kven veit?"}`,
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
      ? "Spotify Premium cost me"
      : "Spotify Premium har kosta meg";
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
      ? `Of this, only this went to the ${artistCount} artists I listened to:`
      : `Av dette gjekk berre dette til dei ${artistCount} artistane eg lytta til:`;
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
      ? "went to… who knows what? Spotify won\u2019t say."
      : "gjekk til… kven veit kva? Spotify seier det ikkje.",
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
      ? "How much of YOUR subscription actually reaches the artists? → banjohans.github.io/Spotify-Unwrapped"
      : "Kor mykje av DITT abonnement når faktisk artistane? → banjohans.github.io/Spotify-Unwrapped";
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
    ? "These albums were identified from your Spotify listening data using <b>Spotify Unwrapped</b>. The app analyzes your GDPR data export to estimate which artists you've listened to the most. Because Spotify's pro-rata model distributes your subscription money into a shared pool rather than directly to the artists you listen to, buying albums is a far more direct way to support the music you enjoy. Prices shown are estimates based on a standard album price."
    : "Desse albuma er identifiserte frå Spotify-lyttedataa dine ved hjelp av <b>Spotify Unwrapped</b>. Appen analyserer GDPR-dataeksporten din for å estimere kva artistar du har lytta mest til. Fordi Spotify sin pro-rata-modell fordeler abonnementspengane dine i ein felles pott i staden for direkte til artistane du lyttar til, er det å kjøpe album ein langt meir direkte måte å støtte musikken du likar. Prisar er estimat basert på standard albumpris."
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
  subscriptionEstimate: {
    firstDate: Date;
    lastDate: Date;
    months: number;
    totalCost: number;
    activeMonths: number;
    activeCost: number;
    avgMonthlyPrice: number;
    spanAvgMonthlyPrice: number;
  } | null,
  activeDateRange: { label: string } | null,
  excludedArtists: Set<string>,
  plannedAlbums: Record<string, { artist: string; album: string }>,
  maxArtists: number | "all" = 50,
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
  const _estSub =
    locale === "en" ? "Estimated subscription" : "Estimert abonnement";
  const _diff = locale === "en" ? "Difference" : "Differanse";
  const _whatMeansTitle =
    locale === "en" ? "What does this mean?" : "Kva betyr dette?";
  const _youPaid =
    locale === "en"
      ? `You paid approx. <b>${fmtK(subscriptionEstimate?.activeCost ?? 0)}</b> in Spotify subscription over <b>${subscriptionEstimate?.activeMonths ?? 0} active months</b>.`
      : `Du har betalt ca. <b>${fmtK(subscriptionEstimate?.activeCost ?? 0)}</b> i Spotify-abonnement over <b>${subscriptionEstimate?.activeMonths ?? 0} aktive månadar</b>.`;
  const _theoArtistValue =
    locale === "en"
      ? `The estimated theoretical value your artists received from your streaming is <b>${fmtK(totalValue)}</b>.`
      : `Den estimerte teoretiske verdien artistane dine har fått frå strøyminga di er <b>${fmtK(totalValue)}</b>.`;
  const _diffExpl = (diff: number) =>
    diff > 0
      ? locale === "en"
        ? "didn't go to the artists you listened to, but to the shared pool"
        : "ikkje gjekk til artistane du lytta på, men til den felles poolen"
      : locale === "en"
        ? "went beyond what you paid – other listeners subsidized your favorites"
        : "gjekk utover det du betalte – andre lyttarar finansierte dine favorittar";
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
      ? "Because Spotify does not share exact financial data per listener, this report uses available data from Spotify's GDPR export and reverse-engineers theoretical royalties and subscription costs."
      : "Fordi Spotify ikkje deler eksakte data per lyttar, bruker denne rapporten tilgjengelege data frå Spotify sin GDPR-eksport og reknar bakover for å estimere teoretiske royalties og abonnementskostnader.";
  const _methodSteps =
    locale === "en"
      ? [
          `<b>1. Data filtering:</b> Plays shorter than ${_minSec} seconds are removed. Spotify states 30 sec is the threshold for an official "stream." This excludes test plays, skips, and accidental clicks.`,
          `<b>2. Estimated royalty value:</b> Historical average per-stream royalty rates (${_currUnit}) are applied to each qualifying play, based on industry data from The Trichordist, Soundcharts, and others. Rates differ by time period (see settings). The value is <i>theoretical</i> – it approximates what Spotify adds to the shared pool based on your habits.`,
          `<b>3. Subscription cost:</b> Premium Individual pricing (${_country}), verified via Wayback Machine. Only months with actual listening activity are counted. Spotify's GDPR export does <i>not</i> include payment history or subscription type (<code>Payments.json</code> is empty). <b>Why Premium?</b> Other plans produce less reliable data: free-tier users receive ads instead of paying, which changes the revenue model; Duo/Family have lower per-user costs; Student discounts have different pricing. Premium gives the most conservative and transparent estimate – it represents the full payment without ad interruptions.`,
          `<b>4. Artist aggregation:</b> For each artist: total listening time, estimated royalty value, album distribution, and stream count are summed. "Album equivalent" = estimated streaming value ÷ album price (${_albumPriceFmt}).`,
        ]
      : [
          `<b>1. Filtrering av data:</b> Avspelingar kortare enn ${_minSec} sekund vert fjerna. Spotify har sagt at 30 sek er grensa for ein offisiell «stream». Dette hindrar prøvespeling, hopping og tilfeldige klikk.`,
          `<b>2. Estimert royalty-verdi:</b> Historiske gjennomsnittssatsar (${_currUnit}/stream) vert brukt per kvalifiserande avspeling, basert på bransjedata frå m.a. The Trichordist og Soundcharts. Satsane er ulike for kvart tidsrom (sjå innstillingar). Verdien er <i>teoretisk</i> – den viser omtrent kva Spotify ville lagt i den felles poolen basert på dine lyttevanar.`,
          `<b>3. Abonnementskostnad:</b> Premium Individual (${_country}), verifisert via Wayback Machine. Berre månadar med faktisk lytteaktivitet er talde. Spotify sin GDPR-eksport har <i>ikkje</i> betalingshistorikk eller abonnementstype (<code>Payments.json</code> er tom). <b>Kvifor Premium?</b> Andre abonnementstypar gir mindre pålitelege data: gratisbrukarar får reklame i staden for full betaling, noko som endrar inntektsmodellen; Duo/Family har lågare pris per brukar; Student-rabatt gir annan prisstruktur. Premium-prising gir det mest konservative og transparente estimatet – det representerer full betaling utan reklameavbrot.`,
          `<b>4. Artistaggregering:</b> For kvar artist: total lyttetid, estimert royalty-verdi, albumfordeling og tal på streams vert summert. «Album-ekvivalent» = estimert strøymeverdi ÷ albumpris (${_albumPriceFmt}).`,
        ];
  const _methodCaveats =
    locale === "en"
      ? [
          "This is an <b>estimation model</b>. Spotify does not publish actual royalty payouts per user.",
          "Spotify uses a <b>\"StreamShare\" (pro-rata) model</b>: all subscription revenue goes into a shared pool distributed by each artist's share of <i>total</i> platform streams. Your money doesn't necessarily go to the music you listen to.",
          "In practice, a large portion of subscription money flows to high-volume content – background music, AI-generated tracks, and major-label artists – rather than music people actively choose.",
          "Rates vary by country, subscription type, and platform activity. These figures represent a <i>reasonable average</i>, not exact payouts.",
        ]
      : [
          "Dette er ein <b>estimatmodell</b>. Spotify publiserer ikkje faktiske royalty-utbetalingar per brukar.",
          "Spotify bruker ein <b>«StreamShare» (pro-rata)</b>-modell: alle abonnementsinntekter går i ein felles pott fordelt etter kvar artist sin andel av <i>totale</i> streams. Pengane dine går ikkje nødvendigvis til musikken du lyttar til.",
          "I praksis går ein stor del av abonnementspengane til storforbruk-innhald – bakgrunnsmusikk, KI-generert musikk, og store artistar – heller enn til musikk folk aktivt vel å spele.",
          "Satsar varierer med land, abonnementstype og plattformaktivitet. Tala gir eit <i>rimeleg gjennomsnittsbilete</i>, ikkje eksakte utbetalingar.",
        ];
  const _methodPurpose =
    locale === "en"
      ? "This report is designed to make visible that your subscription money largely does <i>not</i> go to the music you listen to – and that direct support (like buying albums) is a far more effective way to support the music you care about."
      : "Denne rapporten er lagd for å synleggjere at abonnementspengane dine i stor grad <i>ikkje</i> går til musikken du lyttar til – og at direkte støtte (som å kjøpe album) er ein langt meir effektiv måte å støtte musikken du bryr deg om.";
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
    ? "This report was generated from your personal Spotify GDPR data export. All analysis runs locally in your browser — no data is sent or stored anywhere. The figures are <b>theoretical estimates</b> based on historical per-stream royalty rates and subscription pricing. Spotify uses a pro-rata pooling model, meaning your subscription money goes into a shared pool rather than directly to the artists you listen to. This report aims to make that visible and encourage more direct forms of artist support."
    : "Denne rapporten er generert frå din personlege Spotify GDPR-dataeksport. All analyse skjer lokalt i nettlesaren — ingen data vert sendt eller lagra. Tala er <b>teoretiske estimat</b> basert på historiske royalty-satsar per stream og abonnementsprisar. Spotify bruker ein pro-rata-modell der abonnementspengane dine går i ein felles pott i staden for direkte til artistane du lyttar til. Denne rapporten er meint å synleggjere dette, og motivere til meir direkte støtte av artistar."
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
      <div class="value">${fmtK(subscriptionEstimate.avgMonthlyPrice)}</div>
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
      <div class="value neutral">${fmtK(subscriptionEstimate.activeCost)}</div>
    </div>
    <div class="finance-box">
      <div class="label">${_diff}</div>
      <div class="value ${subscriptionEstimate.activeCost - totalValue > 0 ? "red" : "green"}">
        ${fmtK(subscriptionEstimate.activeCost - totalValue)}
      </div>
    </div>
  </div>
  <div class="info-box">
    <b>${_whatMeansTitle}</b> ${_youPaid}
    ${_theoArtistValue}
    ${locale === "en" ? "The difference" : "Differansen"} (${fmtK(subscriptionEstimate.activeCost - totalValue)}) ${locale === "en" ? "represents money that" : "er midlar som"}
    ${_diffExpl(subscriptionEstimate.activeCost - totalValue)}.
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
    <ul>
      ${_methodSteps.map((item) => `<li>${item}</li>`).join("\n      ")}
    </ul>
    <h3 style="margin-top:14px;font-size:13px;color:#333;">${locale === "en" ? "Important caveats" : "Viktige atterhald"}</h3>
    <ul>
      ${_methodCaveats.map((item) => `<li>${item}</li>`).join("\n      ")}
    </ul>
    <p style="margin-top:10px;">${_methodPurpose}</p>
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [methodologyInfoOpen, setMethodologyInfoOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>("no");
  const [shareToast, setShareToast] = useState<string | null>(null);

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
    }));
  }, [locale]);

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
        if (!Array.isArray(json)) {
          throw new Error(
            `Fila ${f.name} var ikkje ei liste (array) av rader.`,
          );
        }
        newFiles.push({
          name: f.name,
          rowCount: json.length,
          rows: json as SpotifyStreamRow[],
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

  // Oppdater rows når uploadedFiles endrer seg
  useEffect(() => {
    const allRows = uploadedFiles.flatMap((f) => f.rows);
    setRows(allRows);
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

  const subscriptionEstimate = useMemo(() => {
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

    // Bygg liste av aktive månadar for historisk prisutrekning
    const activeMonthList = Array.from(uniqueMonthSet).map((key) => {
      const [y, m] = key.split("-").map(Number);
      return { year: y, month: m };
    });

    // Kalkuler total kostnad basert på historisk pris per månad
    const historical = calcHistoricalSubscriptionCost(activeMonthList, locale);

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
    const spanHistorical = calcHistoricalSubscriptionCost(spanMonths, locale);

    return {
      firstDate,
      lastDate,
      months,
      totalCost: spanHistorical.totalCost,
      activeMonths,
      activeCost: historical.totalCost,
      avgMonthlyPrice: historical.weightedAvgPrice,
      spanAvgMonthlyPrice: spanHistorical.weightedAvgPrice,
      priceBreakdown: historical.monthDetails,
    };
  }, [dateFilteredRows, locale]);

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
    ? Math.floor(subscriptionEstimate.activeCost / cfg.albumPriceNOK)
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

          <div className="featureGrid">
            <div className="featureCard">
              <div
                className="featureImg"
                style={{ backgroundImage: `url(${analyticsImg})` }}
              />
              <div className="featureText">
                <h3>{t("featureAnalyzeTitle", locale)}</h3>
                <p>{t("featureAnalyzeDesc", locale)}</p>
              </div>
            </div>
            <div className="featureCard">
              <div
                className="featureImg"
                style={{ backgroundImage: `url(${insightImg})` }}
              />
              <div className="featureText">
                <h3>{t("featureInsightTitle", locale)}</h3>
                <p>{t("featureInsightDesc", locale)}</p>
              </div>
            </div>
            <div className="featureCard">
              <div
                className="featureImg"
                style={{ backgroundImage: `url(${privateImg})` }}
              />
              <div className="featureText">
                <h3>{t("featurePrivateTitle", locale)}</h3>
                <p>{t("featurePrivateDesc", locale)}</p>
              </div>
            </div>
          </div>

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

        {uploadedFiles.length > 0 && (
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
          <span className={`collapsibleChevron ${settingsOpen ? "open" : ""}`}>
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
                    setCfg({ ...cfg, albumPriceNOK: Number(e.target.value) })
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
                            {currencyPerStream(period.ratePerStream, locale)}
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
                {dateFilteredRows.length.toLocaleString()} {t("rows", locale)}
                {rows.length !== dateFilteredRows.length && (
                  <span className="subtle">
                    {" "}
                    ({t("ofTotal", locale)} {rows.length.toLocaleString()}{" "}
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
                        {t("estSubCost", locale)}
                      </span>
                      <span className="economicValue">
                        {formatCurrency(
                          subscriptionEstimate.activeCost,
                          locale,
                        )}
                      </span>
                      <span className="economicHint">
                        {subscriptionEstimate.activeMonths}{" "}
                        {t("monthsAbbr", locale)}
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
                          ? "to your artists"
                          : "til dine artistar"}
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
                            subscriptionEstimate.activeCost -
                              totalAllArtistsValue >
                            0
                              ? "rgb(239, 68, 68)"
                              : "rgb(30, 215, 96)",
                        }}
                      >
                        {formatCurrency(
                          subscriptionEstimate.activeCost -
                            totalAllArtistsValue,
                          locale,
                        )}
                      </span>
                      <span className="economicHint">
                        {locale === "en"
                          ? "to other artists"
                          : "til andre artistar"}
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
                </div>
              )}

              {/* Collapsible methodology info */}
              <div className="methodologyToggle">
                <button
                  className="collapsibleToggle"
                  onClick={() => setMethodologyInfoOpen(!methodologyInfoOpen)}
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
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="card">
            <div className="cardHeader stickyHeader">
              <div>
                <h2>
                  {t("yourArtistsTitle", locale)} ({filteredArtists.length}) –{" "}
                  {allAlbumKeys.length} {t("uniqueAlbumsLabel", locale)}
                </h2>
                {subscriptionEstimate && (
                  <p className="stickySubtitle">
                    {locale === "en" ? (
                      <>
                        For what you paid for Spotify Premium (
                        {formatCurrency(
                          subscriptionEstimate.activeCost,
                          locale,
                        )}
                        ) you could have bought approx.{" "}
                        <strong>{albumBudget} albums</strong> at{" "}
                        {formatCurrency(cfg.albumPriceNOK, locale)} each.
                      </>
                    ) : (
                      <>
                        For det du har betalt i Spotify Premium (
                        {formatCurrency(
                          subscriptionEstimate.activeCost,
                          locale,
                        )}
                        ) kunne du ha kjøpt ca.{" "}
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
                              subscriptionEstimate.activeCost,
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
                              subscriptionEstimate.activeCost,
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
                <span className="summaryLabel">{t("albumsLabel", locale)}</span>
                <span className="summaryValue">{topNAlbumKeys.length}</span>
              </div>
              <div className="summarySep" />
              <div className="summaryItem">
                <span className="summaryLabel">{t("buyPhysical", locale)}</span>
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
                  {t("pageLabel", locale)} {currentPage} {t("ofWord", locale)}{" "}
                  {totalPages}
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
                    </div>

                    <div
                      className="albumWrap"
                      aria-label={t("albumsLabel", locale)}
                    >
                      <p className="albumInstructions">
                        {t("clickAlbumsHint", locale)}
                      </p>
                      {(() => {
                        const isExpanded = expandedAlbumArtists.has(a.artist);
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
                                  <span className="chipText">{x.album}</span>
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
                  {t("pageLabel", locale)} {currentPage} {t("ofWord", locale)}{" "}
                  {totalPages}
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
              <h2>4) Aktiv vs passiv lytting</h2>
              <div className="subtle">
                Heuristikk basert på <code>reason_start</code> frå Spotify
                dataene. «Aktiv» = du klikka eksplisitt for å spele; «passiv» =
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
                <div className="statLabel">Passiv</div>
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
        <div className="modalOverlay" onClick={() => setSelectedArtist(null)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
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
                <div className="statLabel">{t("totalPlaysLabel", locale)}</div>
                <div className="statValue">
                  {artistDetails.totalPlays.toLocaleString()}
                </div>
              </div>
              <div className="statItem">
                <div className="statLabel">{t("albumsLabel", locale)}</div>
                <div className="statValue">{artistDetails.albums.length}</div>
              </div>
            </div>

            <div className="modalFilters">
              <button
                className={
                  artistDetailSort === "time" ? "filterBtn active" : "filterBtn"
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
                      {formatHrs(album.totalMs, locale)} · {album.totalPlays}{" "}
                      {t("playsWord", locale)}
                    </div>
                  </div>
                  <div className="trackList">
                    {album.tracks.map((track) => (
                      <div key={track.trackName} className="trackRow">
                        <div className="trackName">{track.trackName}</div>
                        <div className="trackStats">
                          {formatHrs(track.msPlayed, locale)} · {track.plays}{" "}
                          {t("playsWord", locale)}
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
        onDateFilterChange={(mode, year) => {
          setDateFilterMode(mode);
          if (mode === "year" && year) {
            setDateFilterYear(year);
          } else if (mode === "all") {
            setDateFilterYear(null);
          }
        }}
      />

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
                      subCost: subscriptionEstimate?.activeCost ?? 0,
                      artistValue: totalVal,
                      artistCount: result.artists.length,
                      hours: formatHrs(result.totalMsPlayed, locale),
                      locale,
                      heroSrc: heroImg,
                      activePercent: Math.round(result.activeShare * 100),
                      assistedPercent: Math.round(result.passiveShare * 100),
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
                      subCost: subscriptionEstimate?.activeCost ?? 0,
                      artistValue: totalVal,
                      artistCount: result.artists.length,
                      hours: formatHrs(result.totalMsPlayed, locale),
                      locale,
                      heroSrc: heroImg,
                      activePercent: Math.round(result.activeShare * 100),
                      assistedPercent: Math.round(result.passiveShare * 100),
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

      {/* Footer */}
      <footer className="siteFooter">
        <p>{t("developedBy", locale)}</p>
        <button
          className="disclaimerLink"
          onClick={() => setDisclaimerOpen(true)}
        >
          {t("disclaimerLink", locale)}
        </button>
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
            </div>
          </div>
        </div>
      )}

      {shareToast && <div className="shareToast">{shareToast}</div>}
    </div>
  );
}
