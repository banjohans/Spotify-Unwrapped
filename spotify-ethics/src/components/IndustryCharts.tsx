// src/components/IndustryCharts.tsx

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  ComposedChart,
  Area,
} from "recharts";
import type { Locale } from "../lib/i18n";
import { formatNum, t } from "../lib/i18n";
import {
  PAYOUT_TIERS,
  YEARLY_STATS,
  PER_STREAM_USD,
  CPI_US,
  MIN_WAGES,
  MONEY_FLOW,
  KEY_FACTS,
  DATA_YEAR,
  DATA_SOURCE_URL,
} from "../lib/spotifyIndustryData";

type IndustryTab =
  | "pyramid"
  | "moneyFlow"
  | "minWage"
  | "perStream"
  | "perArtist"
  | "streamsToLive";

interface IndustryChartsProps {
  locale: Locale;
}

const COLORS = {
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  yellow: "#eab308",
  green: "#22c55e",
  spotifyGreen: "#1DB954",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  gray: "#6b7280",
  text: "rgba(255,255,255,0.85)",
  grid: "rgba(255,255,255,0.1)",
};

const PYRAMID_COLORS = [
  "#dc2626", // $10M+
  "#ef4444", // $5M+
  "#f97316", // $2M+
  "#f59e0b", // $1M+
  "#eab308", // $500K+
  "#84cc16", // $100K+
  "#22c55e", // $50K+
  "#14b8a6", // $10K+
  "#3b82f6", // $5K+
  "#6366f1", // $1K+
  "#374151", // <$1K (the massive base)
];

const TOOLTIP_STYLE = {
  backgroundColor: "#1a1a2e",
  border: "1px solid #444",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
};

const TOOLTIP_LABEL_STYLE = { color: "#fff", fontWeight: 600 };
const TOOLTIP_ITEM_STYLE = { color: "#fff" };

const FLOW_COLORS: Record<string, string> = {
  spotify: "#ef4444",
  labelKeeps: "#f97316",
  publisherKeeps: "#f59e0b",
  artistRecording: "#22c55e",
  songwriter: "#34d399",
};

export default function IndustryCharts({ locale }: IndustryChartsProps) {
  const [tab, setTab] = useState<IndustryTab>("pyramid");

  const tabs: { key: IndustryTab; label: string }[] = [
    { key: "pyramid", label: t("industryTabPyramid", locale) },
    { key: "moneyFlow", label: t("industryTabMoneyFlow", locale) },
    { key: "minWage", label: t("industryTabMinWage", locale) },
    { key: "perStream", label: t("industryTabPerStream", locale) },
    { key: "perArtist", label: t("industryTabPerArtist", locale) },
    { key: "streamsToLive", label: t("industryTabStreamsToLive", locale) },
  ];

  const sourceNote = t("industrySourceNote", locale).replace(
    "{year}",
    String(DATA_YEAR),
  );

  return (
    <section className="card industryCard">
      <h2 className="sectionTitle industryTitle">
        {t("industryTitle", locale)}
      </h2>
      <p className="sectionDesc">{t("industrySubtitle", locale)}</p>

      <div className="chartsTabs">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            className={`chartsTab ${tab === tb.key ? "active" : ""}`}
            onClick={() => setTab(tb.key)}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className="chartArea">
        {tab === "pyramid" && <PyramidChart locale={locale} />}
        {tab === "moneyFlow" && <MoneyFlowChart locale={locale} />}
        {tab === "minWage" && <MinWageChart locale={locale} />}
        {tab === "perStream" && <PerStreamChart locale={locale} />}
        {tab === "perArtist" && <PerArtistChart locale={locale} />}
        {tab === "streamsToLive" && <StreamsToLiveChart locale={locale} />}
      </div>

      <p className="industrySource">
        <a href={DATA_SOURCE_URL} target="_blank" rel="noopener noreferrer">
          {sourceNote}
        </a>
      </p>
    </section>
  );
}

// ─── 1. Inequality Pyramid (SVG trapezoid) + Long-Tail ──────────

function PyramidChart({ locale }: { locale: Locale }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [view, setView] = useState<"pyramid" | "longtail">("pyramid");

  const data = useMemo(() => {
    const year = DATA_YEAR;
    const totalArtists = KEY_FACTS.totalArtists;
    const totalPayout =
      (YEARLY_STATS.find((s) => s.year === year)?.totalPayoutBillions ?? 11) *
      1e9;
    const sorted = [...PAYOUT_TIERS].sort((a, b) => b.threshold - a.threshold);

    const tiers: Array<{
      label: string;
      count: number;
      percent: string;
      color: string;
      estRevShare: string;
    }> = [];

    let accounted = 0;
    let totalEstRevenue = 0;

    // First pass: compute estimated revenue per tier
    const tierRevenues: number[] = [];
    sorted.forEach((tier, i) => {
      const count = tier.counts[year] ?? 0;
      const nextHigher = i > 0 ? (sorted[i - 1].counts[year] ?? 0) : 0;
      const exclusive = count - nextHigher;
      // Midpoint income between this threshold and the next-higher one
      const upperBound = i > 0 ? sorted[i - 1].threshold : tier.threshold * 2;
      const avgIncome = (tier.threshold + upperBound) / 2;
      const estRevenue = exclusive * avgIncome;
      tierRevenues.push(estRevenue);
      totalEstRevenue += estRevenue;
    });
    // Base tier (<$1K)
    const baseCount =
      totalArtists -
      sorted.reduce((s, t, i) => {
        const count = t.counts[year] ?? 0;
        const nextHigher = i > 0 ? (sorted[i - 1].counts[year] ?? 0) : 0;
        return s + (count - nextHigher);
      }, 0);
    const baseRevenue = baseCount * 200; // avg ~$200 for <$1K tier
    totalEstRevenue += baseRevenue;

    // Scale so that sum equals actual total payout
    const scaleFactor = totalPayout / totalEstRevenue;

    sorted.forEach((tier, i) => {
      const count = tier.counts[year] ?? 0;
      const nextHigher = i > 0 ? (sorted[i - 1].counts[year] ?? 0) : 0;
      const exclusive = count - nextHigher;
      const pct = ((exclusive / totalArtists) * 100).toFixed(
        exclusive / totalArtists < 0.001 ? 4 : 2,
      );
      const revShare = ((tierRevenues[i] * scaleFactor) / totalPayout) * 100;
      tiers.push({
        label: tier.label,
        count: exclusive,
        percent: pct,
        estRevShare: revShare < 1 ? revShare.toFixed(1) : revShare.toFixed(0),
        color: PYRAMID_COLORS[i],
      });
      accounted += exclusive;
    });

    const remaining = totalArtists - accounted;
    const baseRevSharePct = ((baseRevenue * scaleFactor) / totalPayout) * 100;
    tiers.push({
      label: t("pyramidBelowThreshold", locale),
      count: remaining,
      percent: ((remaining / totalArtists) * 100).toFixed(1),
      estRevShare: baseRevSharePct.toFixed(1),
      color: PYRAMID_COLORS[PYRAMID_COLORS.length - 1],
    });

    return tiers;
  }, [locale]);

  const title = t("pyramidTitle", locale).replace(
    "{totalArtists}",
    formatNum(KEY_FACTS.totalArtists, locale),
  );

  const totalArtists = KEY_FACTS.totalArtists;

  return (
    <div>
      <h3 className="chartTitle">{title}</h3>
      <p className="chartDesc">{t("pyramidDesc", locale)}</p>

      {/* Toggle between pyramid view and long-tail */}
      <div className="pyramidViewToggle">
        <button
          className={`chartsTab ${view === "pyramid" ? "active" : ""}`}
          onClick={() => setView("pyramid")}
        >
          {t("pyramidToggleLabel", locale)}
        </button>
        <button
          className={`chartsTab ${view === "longtail" ? "active" : ""}`}
          onClick={() => setView("longtail")}
        >
          {t("longTailToggleLabel", locale)}
        </button>
      </div>

      {view === "pyramid" ? (
        <PyramidView
          data={data}
          locale={locale}
          hovered={hovered}
          setHovered={setHovered}
        />
      ) : (
        <LongTailView data={data} locale={locale} />
      )}

      {/* Callout stat */}
      <div className="pyramidCallout">
        <span className="pyramidCalloutBig">94.1%</span>
        <span className="pyramidCalloutText">
          {locale === "no"
            ? `av alle artistar på Spotify tener under $1 000/år — det er ${formatNum(totalArtists - 650_000, locale)} artistar`
            : `of all artists on Spotify earn less than $1,000/year — that's ${formatNum(totalArtists - 650_000, locale)} artists`}
        </span>
      </div>
      <p className="chartSource">{t("sourcePyramid", locale)}</p>
    </div>
  );
}

type PyramidTier = {
  label: string;
  count: number;
  percent: string;
  estRevShare: string;
  color: string;
};

function PyramidView({
  data,
  locale,
  hovered,
  setHovered,
}: {
  data: PyramidTier[];
  locale: Locale;
  hovered: number | null;
  setHovered: (i: number | null) => void;
}) {
  const W = 700,
    H = 600;
  const topW = 20;
  const botW = W - 40;
  const padTop = 10,
    padBot = 10;
  const usableH = H - padTop - padBot;

  const sqrtTotal = data.reduce((s, d) => s + Math.sqrt(d.count), 0);

  const tierSlices = data.map((tier) => {
    const h = Math.max(20, (Math.sqrt(tier.count) / sqrtTotal) * usableH);
    return { ...tier, h };
  });
  const rawH = tierSlices.reduce((s, t) => s + t.h, 0);
  const scale = usableH / rawH;
  tierSlices.forEach((t) => (t.h *= scale));

  let y = padTop;
  const shapes = tierSlices.map((tier, i) => {
    const progress = (y - padTop) / usableH;
    const nextProgress = (y + tier.h - padTop) / usableH;
    const cx = W / 2;
    const w1 = topW + (botW - topW) * progress;
    const w2 = topW + (botW - topW) * nextProgress;

    const x1 = cx - w1 / 2,
      x2 = cx + w1 / 2;
    const x3 = cx + w2 / 2,
      x4 = cx - w2 / 2;

    const path = `M ${x1} ${y} L ${x2} ${y} L ${x3} ${y + tier.h} L ${x4} ${y + tier.h} Z`;
    const midY = y + tier.h / 2;
    const midW = (w1 + w2) / 2;
    const labelFits = tier.h > 22 && midW > 60;

    const result = { ...tier, path, y, midY, midW, labelFits, idx: i };
    y += tier.h;
    return result;
  });

  return (
    <div className="pyramidSvgWrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="pyramidSvg">
        {shapes.map((s) => (
          <g
            key={s.idx}
            onMouseEnter={() => setHovered(s.idx)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "pointer" }}
          >
            <path
              d={s.path}
              fill={s.color}
              opacity={hovered === null || hovered === s.idx ? 1 : 0.35}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth={0.5}
              style={{ transition: "opacity 0.2s" }}
            />
            {s.labelFits && (
              <text
                x={W / 2}
                y={s.midY + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontWeight={700}
                fontSize={s.h > 40 ? 14 : 11}
                style={{
                  pointerEvents: "none",
                  textShadow: "0 1px 3px rgba(0,0,0,0.7)",
                }}
              >
                {s.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      <div className="pyramidLegend">
        <div
          className="pyramidLegendHeader"
          style={{
            display: "flex",
            gap: 8,
            padding: "0 0 4px",
            fontSize: 10,
            color: "rgba(255,255,255,0.45)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            marginBottom: 4,
          }}
        >
          <span style={{ width: 12 }} />
          <span style={{ flex: 1 }}>{locale === "no" ? "Nivå" : "Tier"}</span>
          <span style={{ width: 80, textAlign: "right" }}>
            {locale === "no" ? "Artistar" : "Artists"}
          </span>
          <span style={{ width: 55, textAlign: "right" }}>
            {locale === "no" ? "% artistar" : "% artists"}
          </span>
          <span style={{ width: 65, textAlign: "right", fontWeight: 700 }}>
            {locale === "no" ? "% inntekt" : "% revenue"}
          </span>
        </div>
        {shapes.map((s) => (
          <div
            key={s.idx}
            className={`pyramidLegendRow ${hovered === s.idx ? "highlighted" : ""}`}
            onMouseEnter={() => setHovered(s.idx)}
            onMouseLeave={() => setHovered(null)}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <span
              className="pyramidLegendDot"
              style={{ backgroundColor: s.color }}
            />
            <span className="pyramidLegendLabel" style={{ flex: 1 }}>
              {s.label}
            </span>
            <span
              className="pyramidLegendCount"
              style={{ width: 80, textAlign: "right" }}
            >
              {formatNum(s.count, locale)}
            </span>
            <span
              className="pyramidLegendPct"
              style={{ width: 55, textAlign: "right" }}
            >
              {s.percent}%
            </span>
            <span
              style={{
                width: 65,
                textAlign: "right",
                fontWeight: 700,
                color: Number(s.estRevShare) > 10 ? COLORS.red : COLORS.text,
              }}
            >
              {s.estRevShare}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LongTailView({
  data,
  locale,
}: {
  data: PyramidTier[];
  locale: Locale;
}) {
  // Build a smooth income-distribution curve.
  // X = cumulative artist percentile (0–100%), Y = income ($) — LINEAR scale
  const totalArtists = KEY_FACTS.totalArtists;
  const sorted = [...PAYOUT_TIERS].sort((a, b) => b.threshold - a.threshold);

  const curvePoints: Array<{
    pct: number;
    income: number;
    label: string;
  }> = [];

  let cumulative = 0;
  sorted.forEach((tier, i) => {
    const count = tier.counts[DATA_YEAR] ?? 0;
    const nextHigher = i > 0 ? (sorted[i - 1].counts[DATA_YEAR] ?? 0) : 0;
    const exclusive = count - nextHigher;
    const startPct = (cumulative / totalArtists) * 100;
    cumulative += exclusive;
    const endPct = (cumulative / totalArtists) * 100;
    const midPct = (startPct + endPct) / 2;
    curvePoints.push({
      pct: Number(midPct.toFixed(3)),
      income: tier.threshold,
      label: tier.label,
    });
  });

  // Massive <$1K base
  const remaining = totalArtists - cumulative;
  const startPctBase = (cumulative / totalArtists) * 100;
  cumulative += remaining;
  curvePoints.push({
    pct: Number(((startPctBase + 100) / 2).toFixed(1)),
    income: 500,
    label: data[data.length - 1]?.label ?? "<$1K",
  });

  // Full dataset with endpoints
  const chartData = [
    { pct: 0, income: curvePoints[0].income * 1.2 },
    ...curvePoints,
    { pct: 100, income: 100 },
  ];

  // ── SVG dimensions ──
  const W = 900;
  const H = 520;
  const PAD = { top: 20, right: 60, bottom: 50, left: 80 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // Log scale: $50 → $12M
  const LOG_MIN = Math.log10(50);
  const LOG_MAX = Math.log10(
    Math.max(...chartData.map((d) => d.income)) * 1.05,
  );
  const logRange = LOG_MAX - LOG_MIN;

  // Sqrt X-scale: spreading out the top percentiles so they're easier to hover
  const xScale = (pct: number) => PAD.left + Math.sqrt(pct / 100) * plotW;
  const yScale = (inc: number) => {
    const clamped = Math.max(50, inc);
    const frac = (Math.log10(clamped) - LOG_MIN) / logRange;
    return PAD.top + plotH * (1 - frac);
  };

  // Build path
  const pathPoints = chartData.map(
    (d) => `${xScale(d.pct)},${yScale(d.income)}`,
  );
  const linePath = `M${pathPoints.join("L")}`;
  const areaPath = `${linePath}L${xScale(100)},${yScale(50)}L${xScale(0)},${yScale(50)}Z`;

  // Y-axis ticks (log-spaced)
  const yTicks = [
    100, 500, 1_000, 5_000, 10_000, 50_000, 100_000, 1_000_000, 10_000_000,
  ];
  const fmtUSD = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
  };

  // X-axis ticks (non-uniform to match sqrt scale)
  const xTicks = [0.5, 1, 2, 5, 10, 25, 50, 75, 100];

  const [shareHover, setShareHover] = useState<number | null>(null);

  // ── Zoom lens state ──
  const [hover, setHover] = useState<{
    svgX: number;
    svgY: number;
    pct: number;
    income: number;
  } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;

    // Map to data space (inverse sqrt scale)
    const t = (svgX - PAD.left) / plotW;
    const pct = t * t * 100;
    if (t < 0 || pct > 100) {
      setHover(null);
      return;
    }

    // Interpolate income along the actual SVG path segments
    // The path is linear between data points in sqrt-X / log-Y space,
    // so we interpolate the SVG Y and then inverse-map to income.
    const curX = xScale(pct);
    let interpY = yScale(50);
    for (let i = 0; i < chartData.length - 1; i++) {
      const x0 = xScale(chartData[i].pct);
      const x1 = xScale(chartData[i + 1].pct);
      if (curX >= x0 && curX <= x1) {
        const seg = (curX - x0) / (x1 - x0 || 1);
        const y0 = yScale(chartData[i].income);
        const y1 = yScale(chartData[i + 1].income);
        interpY = y0 + seg * (y1 - y0);
        break;
      }
    }
    // Inverse yScale: frac = (PAD.top + plotH - interpY) / plotH
    const frac = (PAD.top + plotH - interpY) / plotH;
    const income = Math.pow(10, LOG_MIN + frac * logRange);

    setHover({ svgX: curX, svgY, pct, income });
  };

  // ── Revenue share per official Spotify tier category ──
  // Each tier shows: label, exclusive artist count, % of artists, est. revenue share
  const tierShares = useMemo(() => {
    const year = DATA_YEAR;
    const totalPayout =
      (YEARLY_STATS.find((s) => s.year === year)?.totalPayoutBillions ?? 11) *
      1e9;
    const sortedTiers = [...PAYOUT_TIERS].sort(
      (a, b) => b.threshold - a.threshold,
    );

    let totalEstRev = 0;
    const tiers: Array<{
      threshold: number;
      label: string;
      exclusive: number;
      artistPct: string;
      estRev: number;
    }> = [];

    sortedTiers.forEach((tier, i) => {
      const count = tier.counts[year] ?? 0;
      const higher = i > 0 ? (sortedTiers[i - 1].counts[year] ?? 0) : 0;
      const exclusive = count - higher;
      const upper = i > 0 ? sortedTiers[i - 1].threshold : tier.threshold * 2;
      const avg = (tier.threshold + upper) / 2;
      const estRev = exclusive * avg;
      tiers.push({
        threshold: tier.threshold,
        label: tier.label,
        exclusive,
        artistPct: ((exclusive / totalArtists) * 100).toFixed(
          exclusive / totalArtists < 0.001 ? 4 : 2,
        ),
        estRev,
      });
      totalEstRev += estRev;
    });

    // Base tier (<$1K)
    const accounted = tiers.reduce((s, t) => s + t.exclusive, 0);
    const baseExclusive = totalArtists - accounted;
    const baseEstRev = baseExclusive * 200;
    totalEstRev += baseEstRev;
    tiers.push({
      threshold: 0,
      label: "<$1K",
      exclusive: baseExclusive,
      artistPct: ((baseExclusive / totalArtists) * 100).toFixed(1),
      estRev: baseEstRev,
    });

    // Scale so sum = actual total payout, then compute share %
    const scale = totalPayout / totalEstRev;
    return tiers.map((t) => ({
      ...t,
      revSharePct: ((t.estRev * scale) / totalPayout) * 100,
    }));
  }, [totalArtists]);

  // Find which official tier an income level falls into
  const getTierInfo = (
    income: number,
  ): { label: string; artistPct: string; revSharePct: string } => {
    for (const t of tierShares) {
      if (income >= t.threshold && t.threshold > 0) {
        return {
          label: t.label,
          artistPct: t.artistPct,
          revSharePct:
            t.revSharePct < 1
              ? t.revSharePct.toFixed(1)
              : t.revSharePct.toFixed(0),
        };
      }
    }
    // Base tier
    const base = tierShares[tierShares.length - 1];
    return {
      label: base.label,
      artistPct: base.artistPct,
      revSharePct: base.revSharePct.toFixed(1),
    };
  };

  // ── Interactive insight text based on hover position ──
  const getInsightText = (
    pct: number,
    income: number,
    loc: Locale,
  ): { headline: string; body: string } => {
    const fmtI = fmtUSD(Math.round(income));
    const tier = getTierInfo(income);
    const tierNote =
      loc === "no"
        ? `Kategori ${tier.label}: ${tier.artistPct} % av artistane, ~${tier.revSharePct} % av utbetalingane.`
        : `Tier ${tier.label}: ${tier.artistPct}% of artists, ~${tier.revSharePct}% of payouts.`;
    if (pct < 0.01) {
      return loc === "no"
        ? {
            headline: "🔴 Topp 0,01 % — Dei globale superstjernene",
            body: `Rundt 80 artistar tener over $10M/år. Dei dominerer algoritmane, speltelistene og reklameinntektene. Éin einaste artist kan generere meir inntekt enn 100 000 andre til saman. Estimert inntekt her: ${fmtI}. ${tierNote}`,
          }
        : {
            headline: "🔴 Top 0.01% — The global superstars",
            body: `About 80 artists earn over $10M/year. They dominate algorithms, playlists, and ad revenue. A single artist can generate more income than 100,000 others combined. Estimated income here: ${fmtI}. ${tierNote}`,
          };
    }
    if (pct < 0.5) {
      return loc === "no"
        ? {
            headline: "🟠 Topp 0,5 % — Dei etablerte artistane",
            body: `Her finn du artistar med platekontraktar og store management-apparat. Dei tener millionar, men sjølv her går mesteparten til plateselskap og mellommenn. Estimert inntekt: ${fmtI}. ${tierNote}`,
          }
        : {
            headline: "🟠 Top 0.5% — The established artists",
            body: `These artists have label deals and big management teams. They earn millions, but even here most goes to labels and intermediaries. Estimated income: ${fmtI}. ${tierNote}`,
          };
    }
    if (pct < 2) {
      return loc === "no"
        ? {
            headline: "🟡 Topp 2 % — Artistar som «klarer seg»",
            body: `Dette er artistar som kan leve av musikken — men berre so vidt. Mange er avhengige av touring og merch i tillegg til strøyming. Under denne grensa byrjar det å bli vanskeleg å kalle det ei levebrød. Estimert inntekt: ${fmtI}. ${tierNote}`,
          }
        : {
            headline: "🟡 Top 2% — Artists who 'get by'",
            body: `These artists can live off music — but barely. Many depend on touring and merch in addition to streaming. Below this threshold, it's hard to call music a livelihood. Estimated income: ${fmtI}. ${tierNote}`,
          };
    }
    if (pct < 6) {
      return loc === "no"
        ? {
            headline: "🔵 Topp 6 % — Over $1 000/år. Det er alt.",
            body: `Berre ~6 % av alle artistar på Spotify tener meir enn $1 000 i året. Resten — over 10 millionar menneske — tener mindre enn det kostar å mikse éin singel. Pro-rata-modellen gjer at pengane deira i praksis vert omfordelte til toppen. Estimert inntekt: ${fmtI}. ${tierNote}`,
          }
        : {
            headline: "🔵 Top 6% — Over $1,000/year. That's all.",
            body: `Only ~6% of all Spotify artists earn more than $1,000/year. The rest — over 10 million people — earn less than the cost of mixing a single track. The pro-rata model effectively redistributes their money to the top. Estimated income: ${fmtI}. ${tierNote}`,
          };
    }
    if (pct < 40) {
      return loc === "no"
        ? {
            headline: "⚫ Botn 94 % — Usynlege på grafen",
            body: `Du er no i den flate delen av kurva. Desse artistane tener frå $0 til nokre hundre dollar i året. Mange har lagt sjela si i musikken — men inntekta deira er forsvinnande lita samanlikna med toppen. Den logaritmiske skalaen gjer at du kan sjå desse verdiane. Estimert inntekt: ${fmtI}. ${tierNote}`,
          }
        : {
            headline: "⚫ Bottom 94% — Invisible on the graph",
            body: `You're now in the flat part of the curve. These artists earn from $0 to a few hundred dollars a year. Many have poured their soul into music — but their income is vanishingly small compared to the top. The logarithmic scale makes these values visible. Estimated income: ${fmtI}. ${tierNote}`,
          };
    }
    return loc === "no"
      ? {
          headline: "⚫ Den lange halen — Millionar av stemmer utan inntekt",
          body: `Jo lenger til høgre du går, jo fleire artistar er det — og jo mindre tener dei. Spotify har over 12 millionar artistar, men 94 % av dei tener under $1 000/år. Denne ekstreme skeivfordelinga er ikkje tilfeldig: ho er eit direkte resultat av pro-rata-modellen. Estimert inntekt: ${fmtI}. ${tierNote}`,
        }
      : {
          headline: "⚫ The long tail — Millions of voices without income",
          body: `The further right you go, the more artists there are — and the less they earn. Spotify has over 12 million artists, but 94% earn under $1,000/year. This extreme skew isn't accidental: it's a direct result of the pro-rata payment model. Estimated income: ${fmtI}. ${tierNote}`,
        };
  };

  const [ltView, setLtView] = useState<"curve" | "share">("curve");

  return (
    <div>
      <h4 className="chartSubtitle">{t("longTailTitle", locale)}</h4>
      <p className="chartDesc">{t("longTailDesc", locale)}</p>

      {/* View toggle */}
      <div style={{ display: "flex", gap: 8, margin: "8px 0 4px" }}>
        {(["curve", "share"] as const).map((v) => (
          <button
            key={v}
            onClick={() => {
              setLtView(v);
              setHover(null);
            }}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border:
                ltView === v
                  ? "1px solid rgba(255,255,255,0.4)"
                  : "1px solid rgba(255,255,255,0.12)",
              background:
                ltView === v ? "rgba(255,255,255,0.1)" : "transparent",
              color:
                ltView === v
                  ? "rgba(255,255,255,0.9)"
                  : "rgba(255,255,255,0.5)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: ltView === v ? 600 : 400,
              transition: "all 0.2s",
            }}
          >
            {v === "curve"
              ? locale === "no"
                ? "Inntektskurve"
                : "Income curve"
              : locale === "no"
                ? "Andelsfordeling"
                : "Share distribution"}
          </button>
        ))}
      </div>

      {ltView === "curve" && (
        <>
          {/* Interactive insight text */}
          <div
            className="longTailInsight"
            style={{
              height: 100,
              overflow: "hidden",
              padding: "12px 16px",
              margin: "12px 0 4px",
              borderRadius: 10,
              background: hover ? "rgba(255,255,255,0.04)" : "transparent",
              border: hover
                ? "1px solid rgba(255,255,255,0.1)"
                : "1px solid transparent",
              transition: "all 0.3s ease",
            }}
          >
            {hover ? (
              (() => {
                const insight = getInsightText(hover.pct, hover.income, locale);
                return (
                  <>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.9)",
                        marginBottom: 4,
                      }}
                    >
                      {insight.headline}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.65)",
                        lineHeight: 1.5,
                      }}
                    >
                      {insight.body}
                    </div>
                  </>
                );
              })()
            ) : (
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.35)",
                  fontStyle: "italic",
                }}
              >
                {locale === "no"
                  ? "👆 Hald musa over grafen for å utforske inntektsfordelinga"
                  : "👆 Hover over the chart to explore the income distribution"}
              </div>
            )}
          </div>

          <div style={{ width: "100%", overflowX: "auto" }}>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              style={{ maxWidth: W, display: "block", margin: "0 auto" }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHover(null)}
            >
              <defs>
                <linearGradient id="longTailGrad2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={COLORS.red} stopOpacity={0.85} />
                  <stop
                    offset="3%"
                    stopColor={COLORS.orange}
                    stopOpacity={0.6}
                  />
                  <stop
                    offset="8%"
                    stopColor={COLORS.amber}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="20%"
                    stopColor={COLORS.blue}
                    stopOpacity={0.08}
                  />
                  <stop
                    offset="100%"
                    stopColor={COLORS.gray}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {yTicks.map((v) => (
                <line
                  key={v}
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={yScale(v)}
                  y2={yScale(v)}
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="3 3"
                />
              ))}

              {/* Area fill */}
              <path d={areaPath} fill="url(#longTailGrad2)" />

              {/* Line */}
              <path
                d={linePath}
                fill="none"
                stroke={COLORS.red}
                strokeWidth={2.5}
                strokeLinejoin="round"
              />

              {/* Data points */}
              {curvePoints.map((pt, i) => (
                <circle
                  key={i}
                  cx={xScale(pt.pct)}
                  cy={yScale(pt.income)}
                  r={3}
                  fill="#fff"
                  stroke={COLORS.red}
                  strokeWidth={1.5}
                  opacity={0.7}
                />
              ))}

              {/* $100K reference line */}
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={yScale(100_000)}
                y2={yScale(100_000)}
                stroke={COLORS.green}
                strokeDasharray="5 5"
                opacity={0.6}
              />
              <text
                x={W - PAD.right + 4}
                y={yScale(100_000) + 4}
                fill={COLORS.green}
                fontSize={10}
              >
                $100K
              </text>

              {/* $1K reference line */}
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={yScale(1_000)}
                y2={yScale(1_000)}
                stroke={COLORS.amber}
                strokeDasharray="5 5"
                opacity={0.5}
              />
              <text
                x={W - PAD.right + 4}
                y={yScale(1_000) + 4}
                fill={COLORS.amber}
                fontSize={10}
              >
                $1K
              </text>

              {/* Annotation: the visible drop */}
              <text
                x={xScale(70)}
                y={yScale(200) + 16}
                fill="rgba(255,255,255,0.5)"
                fontSize={11}
                textAnchor="middle"
              >
                {locale === "no"
                  ? "~94 % av artistane tener under $1 000/år"
                  : "~94% of artists earn under $1,000/year"}
              </text>

              {/* Y-axis */}
              <line
                x1={PAD.left}
                y1={PAD.top}
                x2={PAD.left}
                y2={PAD.top + plotH}
                stroke="rgba(255,255,255,0.2)"
              />
              {yTicks.map((v) => (
                <text
                  key={v}
                  x={PAD.left - 8}
                  y={yScale(v) + 4}
                  fill="rgba(255,255,255,0.7)"
                  fontSize={10}
                  textAnchor="end"
                >
                  {fmtUSD(v)}
                </text>
              ))}
              <text
                x={16}
                y={PAD.top + plotH / 2}
                fill="rgba(255,255,255,0.6)"
                fontSize={10}
                textAnchor="middle"
                transform={`rotate(-90,16,${PAD.top + plotH / 2})`}
              >
                {locale === "no"
                  ? "Årsinntekt — log skala (USD)"
                  : "Annual income — log scale (USD)"}
              </text>

              {/* X-axis */}
              <line
                x1={PAD.left}
                y1={PAD.top + plotH}
                x2={W - PAD.right}
                y2={PAD.top + plotH}
                stroke="rgba(255,255,255,0.2)"
              />
              {xTicks.map((v) => (
                <text
                  key={v}
                  x={xScale(v)}
                  y={PAD.top + plotH + 16}
                  fill="rgba(255,255,255,0.7)"
                  fontSize={10}
                  textAnchor="middle"
                >
                  {v < 1 ? `${v}%` : `${v}%`}
                </text>
              ))}
              <text
                x={PAD.left + plotW / 2}
                y={H - 6}
                fill="rgba(255,255,255,0.6)"
                fontSize={11}
                textAnchor="middle"
              >
                {locale === "no"
                  ? "% av artistar — √-skala (rikaste → fattigaste)"
                  : "% of artists — √-scale (richest → poorest)"}
              </text>

              {/* Hover crosshair + tooltip */}
              {hover &&
                (() => {
                  const cx = hover.svgX;
                  const cy = yScale(hover.income);
                  const labelX =
                    cx + 10 > W - PAD.right - 80 ? cx - 100 : cx + 10;
                  return (
                    <>
                      <line
                        x1={cx}
                        y1={PAD.top}
                        x2={cx}
                        y2={PAD.top + plotH}
                        stroke="rgba(255,255,255,0.3)"
                        strokeDasharray="3 3"
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="#fff"
                        stroke={COLORS.red}
                        strokeWidth={2}
                      />
                      {/* Small label near cursor */}
                      <text
                        x={labelX}
                        y={Math.max(PAD.top + 16, cy - 8)}
                        fill="#fff"
                        fontSize={11}
                        fontWeight={600}
                      >
                        {fmtUSD(Math.round(hover.income))} —{" "}
                        {locale === "no" ? "topp" : "top"}{" "}
                        {hover.pct.toFixed(1)}%
                      </text>
                    </>
                  );
                })()}
            </svg>
          </div>
        </>
      )}

      {ltView === "share" &&
        (() => {
          // Build cumulative offsets for both bars
          let cumArtist = 0;
          let cumRev = 0;
          const segments = tierShares.map((tier, i) => {
            const aPct = parseFloat(tier.artistPct);
            const rPct = tier.revSharePct;
            const seg = {
              label:
                tier.label === "<$1K"
                  ? locale === "no"
                    ? "Under $1K"
                    : "Below $1K"
                  : tier.label,
              exclusive: tier.exclusive,
              artistPct: aPct,
              revPct: rPct,
              artistStart: cumArtist,
              revStart: cumRev,
              color:
                PYRAMID_COLORS[i] ?? PYRAMID_COLORS[PYRAMID_COLORS.length - 1],
            };
            cumArtist += aPct;
            cumRev += rPct;
            return seg;
          });

          const BAR_H = 48;
          const GAP = 24;

          return (
            <div style={{ marginTop: 12 }}>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.55)",
                  marginBottom: 16,
                  lineHeight: 1.5,
                }}
              >
                {locale === "no"
                  ? "Dei to stolpane viser same data: kven er artistane, og kven får pengane? Breidda til kvar farge viser prosentandelen. Legg merke til korleis dei øvste kategoriane er usynlege på artiststolpen, men dominerer inntektsstolpen."
                  : "The two bars show the same data: who are the artists, and who gets the money? Each color's width shows its percentage. Notice how the top tiers are invisible on the artist bar, but dominate the revenue bar."}
              </p>

              {/* Stacked bars */}
              <div style={{ position: "relative" }}>
                {/* Revenue bar */}
                <div style={{ marginBottom: 4 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.6)",
                      marginBottom: 4,
                      fontWeight: 600,
                    }}
                  >
                    {locale === "no"
                      ? "Andel av utbetalingar"
                      : "Share of payouts"}{" "}
                    →
                  </div>
                  <div
                    style={{
                      display: "flex",
                      height: BAR_H,
                      borderRadius: 6,
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {segments.map((seg, i) => (
                      <div
                        key={`rev-${i}`}
                        onMouseEnter={() => setShareHover(i)}
                        onMouseLeave={() => setShareHover(null)}
                        style={{
                          width: `${Math.max(seg.revPct, 0.15)}%`,
                          background: seg.color,
                          opacity:
                            shareHover === null || shareHover === i
                              ? 0.85
                              : 0.3,
                          transition: "opacity 0.2s",
                          cursor: "pointer",
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {seg.revPct > 4 && (
                          <span
                            style={{
                              fontSize: 10,
                              color: "#fff",
                              fontWeight: 700,
                              textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                            }}
                          >
                            {seg.revPct < 1
                              ? seg.revPct.toFixed(1)
                              : seg.revPct.toFixed(0)}
                            %
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spacer */}
                <div style={{ height: GAP }} />

                {/* Artist bar */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.6)",
                      marginBottom: 4,
                      fontWeight: 600,
                    }}
                  >
                    {locale === "no" ? "Andel av artistar" : "Share of artists"}{" "}
                    →
                  </div>
                  <div
                    style={{
                      display: "flex",
                      height: BAR_H,
                      borderRadius: 6,
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {segments.map((seg, i) => (
                      <div
                        key={`art-${i}`}
                        onMouseEnter={() => setShareHover(i)}
                        onMouseLeave={() => setShareHover(null)}
                        style={{
                          width: `${Math.max(seg.artistPct, 0.15)}%`,
                          background: seg.color,
                          opacity:
                            shareHover === null || shareHover === i
                              ? 0.85
                              : 0.3,
                          transition: "opacity 0.2s",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {seg.artistPct > 4 && (
                          <span
                            style={{
                              fontSize: 10,
                              color: "#fff",
                              fontWeight: 700,
                              textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                            }}
                          >
                            {seg.artistPct < 1
                              ? seg.artistPct.toFixed(1)
                              : seg.artistPct.toFixed(0)}
                            %
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hover detail */}
              <div
                style={{
                  height: 56,
                  overflow: "hidden",
                  marginTop: 12,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background:
                    shareHover !== null
                      ? "rgba(255,255,255,0.04)"
                      : "transparent",
                  border:
                    shareHover !== null
                      ? "1px solid rgba(255,255,255,0.1)"
                      : "1px solid transparent",
                  transition: "all 0.2s ease",
                }}
              >
                {shareHover !== null ? (
                  (() => {
                    const s = segments[shareHover];
                    return (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 3,
                            background: s.color,
                            flexShrink: 0,
                          }}
                        />
                        <div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "rgba(255,255,255,0.9)",
                            }}
                          >
                            {s.label}{" "}
                            <span
                              style={{
                                fontWeight: 400,
                                fontSize: 12,
                                color: "rgba(255,255,255,0.5)",
                              }}
                            >
                              ({s.exclusive.toLocaleString()}{" "}
                              {locale === "no" ? "artistar" : "artists"})
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "rgba(255,255,255,0.6)",
                              marginTop: 2,
                            }}
                          >
                            {locale === "no"
                              ? `${s.artistPct < 0.01 ? s.artistPct.toFixed(4) : s.artistPct < 1 ? s.artistPct.toFixed(2) : s.artistPct.toFixed(1)} % av artistane → ${s.revPct < 1 ? s.revPct.toFixed(1) : s.revPct.toFixed(0)} % av utbetalingane`
                              : `${s.artistPct < 0.01 ? s.artistPct.toFixed(4) : s.artistPct < 1 ? s.artistPct.toFixed(2) : s.artistPct.toFixed(1)}% of artists → ${s.revPct < 1 ? s.revPct.toFixed(1) : s.revPct.toFixed(0)}% of payouts`}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.3)",
                      fontStyle: "italic",
                      paddingTop: 4,
                    }}
                  >
                    {locale === "no"
                      ? "👆 Hald musa over ein farge for detaljar"
                      : "👆 Hover a color segment for details"}
                  </div>
                )}
              </div>

              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px 14px",
                  marginTop: 10,
                }}
              >
                {segments.map((s, i) => (
                  <div
                    key={i}
                    onMouseEnter={() => setShareHover(i)}
                    onMouseLeave={() => setShareHover(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      cursor: "pointer",
                      opacity:
                        shareHover === null || shareHover === i ? 1 : 0.4,
                      transition: "opacity 0.2s",
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: s.color,
                      }}
                    />
                    <span
                      style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
    </div>
  );
}

// ─── 2. Money Flow (Waterfall) + Redistribution ─────────────────

function MoneyFlowChart({ locale }: { locale: Locale }) {
  const priceStr =
    locale === "no"
      ? `${KEY_FACTS.currentPremiumNOK} kr`
      : `$${KEY_FACTS.currentPremiumUSD}`;

  const price =
    locale === "no" ? KEY_FACTS.currentPremiumNOK : KEY_FACTS.currentPremiumUSD;

  const flowLabels: Record<string, string> = {
    spotify: t("moneyFlowSpotify", locale),
    labelKeeps: t("moneyFlowLabelKeeps", locale),
    publisherKeeps: t("moneyFlowPublisherKeeps", locale),
    artistRecording: t("moneyFlowArtistRecording", locale),
    songwriter: t("moneyFlowSongwriter", locale),
  };

  // Build waterfall: each step has a "base" (invisible) and "amount" (visible)
  let running = price;
  const data = MONEY_FLOW.map((step) => {
    const amount = Number(((step.percentOfTotal / 100) * price).toFixed(2));
    const base = running - amount;
    running -= amount;
    return {
      name: flowLabels[step.id] ?? step.id,
      amount,
      base: Math.max(0, base),
      percent: step.percentOfTotal,
      color: FLOW_COLORS[step.id],
      isArtist: !!step.isArtistIncome,
    };
  });

  // Total artist income = recording + songwriter
  const artistTotal = MONEY_FLOW.filter((s) => s.isArtistIncome).reduce(
    (s, step) => s + (step.percentOfTotal / 100) * price,
    0,
  );
  const artistTotalStr =
    locale === "no"
      ? `${artistTotal.toFixed(0)} kr`
      : `$${artistTotal.toFixed(2)}`;
  const artistPct = MONEY_FLOW.filter((s) => s.isArtistIncome)
    .reduce((s, step) => s + step.percentOfTotal, 0)
    .toFixed(0);

  const title = t("moneyFlowTitle", locale).replace("{price}", priceStr);

  const albumPrice = locale === "no" ? "150 kr" : "$15";
  const albumArtistShare = locale === "no" ? "75–105 kr" : "$7.50–$10.50";
  const times = Math.round((locale === "no" ? 90 : 9) / artistTotal);

  const compareText = t("moneyFlowAlbumCompare", locale)
    .replace("{albumPrice}", albumPrice)
    .replace("{albumArtistShare}", albumArtistShare)
    .replace("{times}", String(times));

  // Pro-rata redistribution data
  const topN = 1500;
  const topPct = ((topN / KEY_FACTS.totalArtists) * 100).toFixed(3);
  const topRevPct = "36";
  const botN = KEY_FACTS.totalArtists - 650_000;
  const botPct = ((botN / KEY_FACTS.totalArtists) * 100).toFixed(0);
  const botRevPct = "2";

  const topCapture = t("moneyFlowPoolTopCapture", locale)
    .replace("{n}", formatNum(topN, locale))
    .replace("{pct}", topPct)
    .replace("{revPct}", topRevPct);
  const botCapture = t("moneyFlowPoolBottomCapture", locale)
    .replace("{n}", formatNum(botN, locale))
    .replace("{pct}", botPct)
    .replace("{revPct}", botRevPct);

  return (
    <div>
      <h3 className="chartTitle">{title}</h3>
      <p className="chartDesc">{t("moneyFlowDesc", locale)}</p>

      <ResponsiveContainer width="100%" height={340}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 10, right: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis
            type="number"
            tick={{ fill: COLORS.text, fontSize: 12 }}
            domain={[0, price]}
            tickFormatter={(v: number) =>
              locale === "no" ? `${v} kr` : `$${v}`
            }
          />
          <YAxis
            type="category"
            dataKey="name"
            width={200}
            tick={{ fill: COLORS.text, fontSize: 11 }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={
              ((value: any, name: any, props: any) => {
                if (name === "base") return [null, null]; // hide base
                const amt = Number(value ?? 0);
                const pct = props?.payload?.percent ?? 0;
                return [
                  `${locale === "no" ? `${amt.toFixed(1)} kr` : `$${amt.toFixed(2)}`} (${pct}%)`,
                  props?.payload?.isArtist ? "✅ → skapar" : "",
                ];
              }) as any
            }
          />
          {/* Invisible base bar */}
          <Bar dataKey="base" stackId="a" fill="transparent" radius={0} />
          {/* Visible amount bar */}
          <Bar dataKey="amount" stackId="a" radius={[0, 6, 6, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.color}
                stroke={entry.isArtist ? "#fff" : "none"}
                strokeWidth={entry.isArtist ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="chartHighlight chartHighlightGreen">
        {t("moneyFlowLeftForArtist", locale)
          .replace("{amount}", artistTotalStr)
          .replace("{pct}", artistPct)}
      </p>
      <p className="chartFootnote">{compareText}</p>

      {/* Pro-rata redistribution explanation */}
      <div className="redistCard">
        <h4 className="redistTitle">{t("moneyFlowRedistTitle", locale)}</h4>
        <p className="redistDesc">{t("moneyFlowRedistNote", locale)}</p>
        <div className="redistStats">
          <div className="redistStat redistStatRed">
            <span className="redistStatIcon">🔺</span>
            <span>{topCapture}</span>
          </div>
          <div className="redistStat redistStatBlue">
            <span className="redistStatIcon">🔻</span>
            <span>{botCapture}</span>
          </div>
        </div>
      </div>

      <p className="chartSource">{t("sourceMoneyFlow", locale)}</p>
    </div>
  );
}

// ─── 3. Minimum Wage Comparison ──────────────────────────────────

function MinWageChart({ locale }: { locale: Locale }) {
  const artistHourly = KEY_FACTS.the100000thArtist / (52 * 40); // ~$3.51
  const artistAnnual = KEY_FACTS.the100000thArtist; // $7,300

  // Build data: all countries + spotify artist, sorted by hourly rate descending
  const wageData = MIN_WAGES.map((w) => ({
    name: w.country,
    hourly: Number((w.annualUSD / (52 * 40)).toFixed(2)),
    annual: w.annualUSD,
    color: COLORS.blue,
    isArtist: false,
  }));

  // Insert Spotify artist at the correct sorted position
  const spotifyEntry = {
    name: t("minWageArtistLabel", locale),
    hourly: Number(artistHourly.toFixed(2)),
    annual: artistAnnual,
    color: COLORS.red,
    isArtist: true,
  };

  const allData = [...wageData, spotifyEntry].sort(
    (a, b) => b.hourly - a.hourly,
  );

  const topPct = ((100_000 / KEY_FACTS.totalArtists) * 100).toFixed(1);

  const title = t("minWageTitle", locale)
    .replace("{amount}", `$${formatNum(KEY_FACTS.the100000thArtist, locale)}`)
    .replace("{topPct}", topPct);

  return (
    <div>
      <h3 className="chartTitle">{title}</h3>
      <p className="chartDesc">
        {t("minWageDesc", locale).replace(
          "{amount}",
          `$${formatNum(KEY_FACTS.the100000thArtist, locale)}`,
        )}
      </p>

      <ResponsiveContainer
        width="100%"
        height={Math.max(500, allData.length * 28)}
      >
        <BarChart
          data={allData}
          layout="vertical"
          margin={{ left: 10, right: 30, bottom: 25 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis
            type="number"
            tick={{ fill: COLORS.text, fontSize: 12 }}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            label={{
              value: t("minWageHourly", locale),
              position: "insideBottom",
              fill: COLORS.text,
              fontSize: 11,
              offset: 0,
            }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={200}
            tick={{ fill: "#fff", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={
              ((value: any, _name: any, props: any) => {
                const annual = props?.payload?.annual ?? 0;
                return [
                  `$${Number(value ?? 0).toFixed(2)}/hr ($${formatNum(annual, locale)}/yr)`,
                  t("minWageHourly", locale),
                ];
              }) as any
            }
          />
          <Bar dataKey="hourly" radius={[0, 6, 6, 0]}>
            {allData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.isArtist ? COLORS.red : COLORS.blue}
                stroke={entry.isArtist ? "#fff" : "none"}
                strokeWidth={entry.isArtist ? 2 : 0}
              />
            ))}
          </Bar>
          <ReferenceLine
            x={artistHourly}
            stroke={COLORS.red}
            strokeDasharray="5 5"
            label={{
              value: `$${artistHourly.toFixed(2)}/hr`,
              fill: COLORS.red,
              fontSize: 10,
              position: "top",
            }}
          />
        </BarChart>
      </ResponsiveContainer>

      <p className="chartFootnote" style={{ marginTop: 8 }}>
        {locale === "no"
          ? `Artist nr. 100 000 (den artisten Spotify framhevar som suksesshistorie) genererer $${formatNum(artistAnnual, locale)}/år til heile verdikjeda — det er $${artistHourly.toFixed(2)}/time fulltid. Under minstelønn i alle vestlege land. Men dette er ikkje det artisten sjølv får: etter at plateselskap (~50 %), forlag (~15 %) og distributør tek sin del, sit artisten att med kanskje $1 100–1 800/år.`
          : `Artist #100,000 (the one Spotify highlights as a success story) generates $${formatNum(artistAnnual, locale)}/year for the entire value chain — that's $${artistHourly.toFixed(2)}/hr full-time. Below minimum wage in every Western country. But this isn't what the artist gets: after label (~50%), publisher (~15%), and distributor take their share, the artist may keep $1,100–1,800/year.`}
      </p>
      <p className="chartSource">{t("sourceMinWage", locale)}</p>
    </div>
  );
}

// ─── 4. Per-Stream Rate vs Revenue (with CPI adjustment) ────────

type PerStreamView = "dilution" | "niche" | "purchasing";

function PerStreamChart({ locale }: { locale: Locale }) {
  const [subView, setSubView] = useState<PerStreamView>("dilution");
  const cpi2025 = CPI_US[2025] ?? 322;

  const data = useMemo(() => {
    return PER_STREAM_USD.map((ps) => {
      const stats = YEARLY_STATS.find((s) => s.year === ps.year);
      const cpiYear = CPI_US[ps.year] ?? cpi2025;
      const realRate = ps.rate * (cpi2025 / cpiYear);
      const payouts = stats?.totalPayoutBillions ?? null;
      const estStreams =
        payouts != null ? (payouts * 1e9) / ps.rate / 1e9 : null;
      return {
        year: ps.year,
        rate: ps.rate * 1000,
        realRate: realRate * 1000,
        rawRate: ps.rate,
        payouts,
        realPayouts: payouts != null ? payouts * (cpi2025 / cpiYear) : null,
        estStreams: estStreams != null ? Math.round(estStreams) : null,
        streams50k: Math.round((50_000 / ps.rate / 1e6) * 10) / 10,
        streams10k: Math.round((10_000 / ps.rate / 1e6) * 10) / 10,
      };
    }).filter((d) => d.year >= 2017);
  }, [cpi2025]);

  const subViews: { key: PerStreamView; label: string }[] = [
    { key: "dilution", label: t("perStreamSubDilution", locale) },
    { key: "niche", label: t("perStreamSubNiche", locale) },
    { key: "purchasing", label: t("perStreamSubPurchasing", locale) },
  ];

  return (
    <div>
      <h3 className="chartTitle">{t("perStreamTitle", locale)}</h3>
      <p className="chartDesc">{t("perStreamDesc", locale)}</p>

      <div className="chartsTabs" style={{ marginBottom: 12 }}>
        {subViews.map((sv) => (
          <button
            key={sv.key}
            className={`chartsTab ${subView === sv.key ? "active" : ""}`}
            onClick={() => setSubView(sv.key)}
            style={{ fontSize: 12, padding: "4px 10px" }}
          >
            {sv.label}
          </button>
        ))}
      </div>

      {subView === "dilution" && (
        <DilutionSubView data={data} locale={locale} />
      )}
      {subView === "niche" && <NicheSubView data={data} locale={locale} />}
      {subView === "purchasing" && (
        <PurchasingSubView data={data} locale={locale} />
      )}

      <p
        className="chartFootnote"
        style={{ marginTop: 12, fontSize: 11, opacity: 0.7 }}
      >
        {t("perStreamSourceNote", locale)}
      </p>
      <p className="chartSource">{t("sourcePerStream", locale)}</p>
    </div>
  );
}

// ─── Sub-view 1: Dilution ────────────────────────────────────────

type PerStreamDataRow = {
  year: number;
  rate: number;
  realRate: number;
  rawRate: number;
  payouts: number | null;
  realPayouts: number | null;
  estStreams: number | null;
  streams50k: number;
  streams10k: number;
};

function DilutionSubView({
  data,
  locale,
}: {
  data: PerStreamDataRow[];
  locale: Locale;
}) {
  const indexed = useMemo(() => {
    const base = data[0];
    if (!base?.estStreams || !base.payouts || !base.realPayouts) return [];
    const baseStreams = base.estStreams;
    const basePayouts = base.payouts;
    const baseRealPayouts = base.realPayouts;
    const baseRate = base.rate;
    return data.map((d) => ({
      year: d.year,
      streamsIdx:
        d.estStreams != null
          ? Math.round((d.estStreams / baseStreams) * 100)
          : null,
      payoutsIdx:
        d.payouts != null ? Math.round((d.payouts / basePayouts) * 100) : null,
      realPayoutsIdx:
        d.realPayouts != null
          ? Math.round((d.realPayouts / baseRealPayouts) * 100)
          : null,
      rateIdx: Math.round((d.rate / baseRate) * 100),
    }));
  }, [data]);

  return (
    <div>
      <h4 className="chartSubTitle">{t("perStreamDilutionTitle", locale)}</h4>
      <p className="chartDesc" style={{ fontSize: 13, whiteSpace: "pre-line" }}>
        {t("perStreamDilutionDesc", locale)}
      </p>

      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={indexed} margin={{ left: 0, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis dataKey="year" tick={{ fill: COLORS.text, fontSize: 12 }} />
          <YAxis
            tick={{ fill: COLORS.text, fontSize: 11 }}
            tickFormatter={(v: number) => `${v}`}
            domain={[50, "auto"]}
            label={{
              value:
                locale === "no" ? "Indeks (2017 = 100)" : "Index (2017 = 100)",
              angle: -90,
              position: "insideLeft",
              fill: COLORS.text,
              fontSize: 10,
              offset: 15,
            }}
          />
          <ReferenceLine
            y={100}
            stroke={COLORS.text}
            strokeDasharray="4 3"
            strokeOpacity={0.4}
            label={{
              value:
                locale === "no"
                  ? "← 100 = utgangspunkt (2017-nivå)"
                  : "← 100 = starting point (2017 level)",
              fill: COLORS.text,
              fontSize: 10,
              position: "insideTopRight",
            }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={
              ((value: any, name: any) => {
                const v = Number(value ?? 0);
                const pctChange = v - 100;
                const sign = pctChange >= 0 ? "+" : "";
                const changeStr = `${sign}${Math.round(pctChange)} %`;
                if (name === "streamsIdx") {
                  const label =
                    locale === "no"
                      ? `🔵 Streams: ${v} (${changeStr} sidan 2017)`
                      : `🔵 Streams: ${v} (${changeStr} since 2017)`;
                  return [label, ""];
                }
                if (name === "payoutsIdx") {
                  const label =
                    locale === "no"
                      ? `🟢 Utbetalingar: ${v} (${changeStr} sidan 2017)`
                      : `🟢 Payouts: ${v} (${changeStr} since 2017)`;
                  return [label, ""];
                }
                if (name === "realPayoutsIdx") {
                  const label =
                    locale === "no"
                      ? `🟠 Utbetalingar (KPI-justert): ${v} (${changeStr} sidan 2017)`
                      : `🟠 Payouts (CPI-adjusted): ${v} (${changeStr} since 2017)`;
                  return [label, ""];
                }
                const label =
                  locale === "no"
                    ? `🔴 Per-stream rate: ${v} (${changeStr} sidan 2017)`
                    : `🔴 Per-stream rate: ${v} (${changeStr} since 2017)`;
                return [label, ""];
              }) as any
            }
          />
          <Legend
            formatter={(value: string) => {
              if (value === "streamsIdx")
                return t("perStreamStreamsGrowthLabel", locale);
              if (value === "payoutsIdx")
                return t("perStreamPayoutsGrowthLabel", locale);
              if (value === "realPayoutsIdx")
                return t("perStreamPayoutsRealGrowthLabel", locale);
              return t("perStreamRateIndexLabel", locale);
            }}
          />
          <Area
            type="monotone"
            dataKey="streamsIdx"
            fill={COLORS.blue}
            fillOpacity={0.06}
            stroke={COLORS.blue}
            strokeWidth={2}
            dot={{ fill: COLORS.blue, r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="payoutsIdx"
            stroke={COLORS.spotifyGreen}
            strokeWidth={2}
            dot={{ fill: COLORS.spotifyGreen, r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="realPayoutsIdx"
            stroke={COLORS.orange}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ fill: COLORS.orange, r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="rateIdx"
            stroke={COLORS.red}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ fill: COLORS.red, r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p
        className="chartCallout"
        style={{
          marginTop: 8,
          padding: "8px 12px",
          background: "rgba(239,68,68,0.08)",
          borderLeft: "3px solid #ef4444",
          borderRadius: 4,
          fontSize: 13,
        }}
      >
        {t("perStreamDilutionCallout", locale)}
      </p>
    </div>
  );
}

// ─── Sub-view 2: Niche Impact ────────────────────────────────────

function NicheSubView({
  data,
  locale,
}: {
  data: PerStreamDataRow[];
  locale: Locale;
}) {
  const latestRate = data[data.length - 1]?.rawRate ?? 0.004;
  const streams50kM = Math.round((50_000 / latestRate / 1e6) * 10) / 10;
  const firstRate = data[0]?.rawRate ?? 0.004;
  const streams50k2017M = Math.round((50_000 / firstRate / 1e6) * 10) / 10;
  const lowestRate = Math.min(...data.map((d) => d.rawRate));
  const streams50kLowM = Math.round((50_000 / lowestRate / 1e6) * 10) / 10;

  const note = t("perStreamNicheNote", locale)
    .replace("{streams50k}", String(streams50kM))
    .replace("{streams50k_2017}", String(streams50k2017M))
    .replace("{streams50k_low}", String(streams50kLowM));

  return (
    <div>
      <h4 className="chartSubTitle">{t("perStreamNicheTitle", locale)}</h4>
      <p className="chartDesc" style={{ fontSize: 13, whiteSpace: "pre-line" }}>
        {t("perStreamNicheDesc", locale)}
      </p>

      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={data} margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis dataKey="year" tick={{ fill: COLORS.text, fontSize: 12 }} />
          <YAxis
            tick={{ fill: COLORS.text, fontSize: 11 }}
            tickFormatter={(v: number) => `${v}M`}
            label={{
              value: locale === "no" ? "Millionar streams" : "Million streams",
              angle: -90,
              position: "insideLeft",
              fill: COLORS.text,
              fontSize: 10,
              offset: 15,
            }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={
              ((value: any, name: any) => {
                const v = Number(value ?? 0);
                if (name === "streams50k")
                  return [`${v}M streams`, t("perStreamNiche50k", locale)];
                return [`${v}M streams`, t("perStreamNiche10k", locale)];
              }) as any
            }
          />
          <Legend
            formatter={(value: string) => {
              if (value === "streams50k") return t("perStreamNiche50k", locale);
              return t("perStreamNiche10k", locale);
            }}
          />
          <Bar dataKey="streams50k" fill={COLORS.red} fillOpacity={0.8} />
          <Bar dataKey="streams10k" fill={COLORS.orange} fillOpacity={0.8} />
          <ReferenceLine
            y={1}
            stroke={COLORS.text}
            strokeDasharray="4 3"
            label={{
              value:
                locale === "no"
                  ? "1M streams (berre 400K songar nådde dette i 2025)"
                  : "1M streams (only 400K songs reached this in 2025)",
              fill: COLORS.text,
              fontSize: 10,
              position: "insideTopRight",
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p
        className="chartCallout"
        style={{
          marginTop: 8,
          padding: "8px 12px",
          background: "rgba(249,115,22,0.08)",
          borderLeft: "3px solid #f97316",
          borderRadius: 4,
          fontSize: 13,
        }}
      >
        {note}
      </p>
    </div>
  );
}

// ─── Sub-view 3: Purchasing Power ────────────────────────────────

function PurchasingSubView({
  data,
  locale,
}: {
  data: PerStreamDataRow[];
  locale: Locale;
}) {
  return (
    <div>
      <h4 className="chartSubTitle">{t("perStreamPurchasingTitle", locale)}</h4>
      <p className="chartDesc" style={{ fontSize: 13, whiteSpace: "pre-line" }}>
        {t("perStreamPurchasingDesc", locale)}
      </p>

      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={data} margin={{ left: 0, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis dataKey="year" tick={{ fill: COLORS.text, fontSize: 12 }} />
          <YAxis
            tick={{ fill: COLORS.text, fontSize: 11 }}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(3)}`}
            label={{
              value: t("perStreamRateLabel", locale),
              angle: -90,
              position: "insideLeft",
              fill: COLORS.text,
              fontSize: 10,
              offset: 15,
            }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={
              ((value: any, name: any) => {
                const v = Number(value ?? 0);
                const rate = `$${(v / 1000).toFixed(4)}`;
                if (name === "rate") {
                  return [
                    rate,
                    locale === "no"
                      ? "🔴 Nominell (kva Spotify betaler)"
                      : "🔴 Nominal (what Spotify pays)",
                  ];
                }
                return [
                  rate,
                  locale === "no"
                    ? "🟠 Reell verdi (kva du kan kjøpe)"
                    : "🟠 Real value (what you can buy)",
                ];
              }) as any
            }
          />
          <Legend
            formatter={(value: string) => {
              if (value === "rate") return t("perStreamRateLabel", locale);
              return t("perStreamRateRealLabel", locale);
            }}
          />
          <Line
            type="monotone"
            dataKey="rate"
            stroke={COLORS.red}
            strokeWidth={2}
            dot={{ fill: COLORS.red, r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="realRate"
            stroke={COLORS.orange}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ fill: COLORS.orange, r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="chartFootnote" style={{ marginTop: 8 }}>
        {t("perStreamCpiNote", locale)}
      </p>

      <p
        className="chartCallout"
        style={{
          marginTop: 8,
          padding: "8px 12px",
          background: "rgba(249,115,22,0.08)",
          borderLeft: "3px solid #f97316",
          borderRadius: 4,
          fontSize: 13,
        }}
      >
        {t("perStreamPurchasingCallout", locale)}
      </p>
    </div>
  );
}

// ─── 5. Per Artist Breakdown ─────────────────────────────────────

function PerArtistChart({ locale }: { locale: Locale }) {
  const stats2025 = YEARLY_STATS.find((s) => s.year === DATA_YEAR)!;
  const avgPerArtist =
    (stats2025.totalPayoutBillions * 1_000_000_000) / stats2025.totalArtists;
  const perSubscriberYear =
    (stats2025.totalPayoutBillions * 1_000_000_000) /
    (stats2025.subscribers * 1_000_000);

  const [hovered, setHovered] = useState<number | null>(null);

  // Build proportional tiers: width = % of artists, height = avg income
  const tiers = [
    {
      label: t("perArtistTop1", locale),
      pctArtists: 0.01,
      avgIncome: 5_000_000,
      color: COLORS.red,
    },
    {
      label: locale === "no" ? "Topp 0,01–0,12 %" : "Top 0.01–0.12%",
      pctArtists: 0.11,
      avgIncome: 300_000,
      color: COLORS.orange,
    },
    {
      label: locale === "no" ? "0,12–0,35 %" : "0.12–0.35%",
      pctArtists: 0.24,
      avgIncome: 70_000,
      color: COLORS.amber,
    },
    {
      label: locale === "no" ? "0,35–1,7 %" : "0.35–1.7%",
      pctArtists: 1.32,
      avgIncome: 15_000,
      color: COLORS.yellow,
    },
    {
      label: locale === "no" ? "1,7–5,4 %" : "1.7–5.4%",
      pctArtists: 3.73,
      avgIncome: 3_000,
      color: COLORS.blue,
    },
    {
      label: locale === "no" ? "Botn 94,6 %" : "Bottom 94.6%",
      pctArtists: 94.58,
      avgIncome: 50,
      color: COLORS.gray,
    },
  ];

  // SVG dimensions
  const W = 800,
    H = 400;
  const padLeft = 60,
    padRight = 20,
    padTop = 30,
    padBot = 80;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBot;

  // Log scale for height: map income → pixel height
  const minLog = Math.log10(10); // $10
  const maxLog = Math.log10(10_000_000); // $10M
  const logRange = maxLog - minLog;
  const incomeToY = (income: number) => {
    const logVal = Math.log10(Math.max(10, income));
    const frac = (logVal - minLog) / logRange;
    return padTop + chartH * (1 - frac);
  };

  // Build rects
  let xCursor = padLeft;
  const blocks = tiers.map((tier, i) => {
    const w = Math.max(2, (tier.pctArtists / 100) * chartW);
    const yTop = incomeToY(tier.avgIncome);
    const h = padTop + chartH - yTop;
    const block = {
      ...tier,
      x: xCursor,
      y: yTop,
      w,
      h,
      idx: i,
    };
    xCursor += w;
    return block;
  });

  // Y-axis ticks
  const yTicks = [10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000];

  // Average reference line
  const avgY = incomeToY(avgPerArtist);

  const perSubAmountTotalStr =
    locale === "no"
      ? `${Math.round(perSubscriberYear * 10)} kr`
      : `$${perSubscriberYear.toFixed(0)}`;

  // After intermediaries: ~19.25% of subscription reaches artists+songwriters
  const artistSharePct = 19.25; // artistRecording (10.5%) + songwriter (8.75%)
  const perSubArtistYear = perSubscriberYear * (artistSharePct / 100);
  const perSubAmountArtistStr =
    locale === "no"
      ? `${Math.round(perSubArtistYear * 10)} kr`
      : `$${perSubArtistYear.toFixed(0)}`;

  const perSubNote = t("perArtistPerSubscriber", locale)
    .replace("{amountTotal}", perSubAmountTotalStr)
    .replace("{amountArtist}", perSubAmountArtistStr);

  const fmtIncome = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
  };

  return (
    <div>
      <h3 className="chartTitle">{t("perArtistTitle", locale)}</h3>
      <p className="chartDesc">{t("perArtistDesc", locale)}</p>

      <div className="perArtistSvgWrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="perArtistSvg">
          {/* Grid lines */}
          {yTicks.map((tick) => {
            const y = incomeToY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={W - padRight}
                  y2={y}
                  stroke="rgba(255,255,255,0.07)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 6}
                  y={y + 4}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.6)"
                  fontSize={10}
                >
                  {fmtIncome(tick)}
                </text>
              </g>
            );
          })}

          {/* Blocks */}
          {blocks.map((b) => (
            <g
              key={b.idx}
              onMouseEnter={() => setHovered(b.idx)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                fill={b.color}
                opacity={hovered === null || hovered === b.idx ? 0.85 : 0.3}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth={0.5}
                rx={2}
                style={{ transition: "opacity 0.2s" }}
              />
              {/* Income label on top of block if wide enough */}
              {b.w > 30 && (
                <text
                  x={b.x + b.w / 2}
                  y={b.y - 6}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={11}
                  fontWeight={700}
                  style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                >
                  {fmtIncome(b.avgIncome)}
                </text>
              )}
              {/* Percentage label at bottom */}
              {b.w > 20 && (
                <text
                  x={b.x + b.w / 2}
                  y={padTop + chartH + 16}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.7)"
                  fontSize={10}
                >
                  {b.pctArtists < 1
                    ? `${b.pctArtists}%`
                    : `${b.pctArtists.toFixed(1)}%`}
                </text>
              )}
              {/* Tier label */}
              {b.w > 50 && (
                <text
                  x={b.x + b.w / 2}
                  y={padTop + chartH + 30}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.5)"
                  fontSize={9}
                >
                  {b.label}
                </text>
              )}
            </g>
          ))}

          {/* Average reference line */}
          <line
            x1={padLeft}
            y1={avgY}
            x2={W - padRight}
            y2={avgY}
            stroke={COLORS.amber}
            strokeDasharray="6 3"
            strokeWidth={1.5}
          />
          <text
            x={W - padRight + 2}
            y={avgY + 4}
            fill={COLORS.amber}
            fontSize={10}
            fontWeight={600}
          >
            {locale === "no" ? "snitt" : "avg"}{" "}
            {fmtIncome(Math.round(avgPerArtist))}
          </text>

          {/* X-axis label */}
          <text
            x={padLeft + chartW / 2}
            y={H - 8}
            textAnchor="middle"
            fill="rgba(255,255,255,0.5)"
            fontSize={11}
          >
            {locale === "no"
              ? "← bredde = % av artistar — høgde = gjennomsnittsinntekt (log) →"
              : "← width = % of artists — height = avg income (log) →"}
          </text>

          {/* Y-axis label */}
          <text
            x={14}
            y={padTop + chartH / 2}
            textAnchor="middle"
            fill="rgba(255,255,255,0.5)"
            fontSize={10}
            transform={`rotate(-90, 14, ${padTop + chartH / 2})`}
          >
            {locale === "no" ? "Årsinntekt (USD)" : "Annual income (USD)"}
          </text>
        </svg>

        {/* Hover tooltip overlay */}
        {hovered !== null && (
          <div className="perArtistTooltip">
            <strong>{blocks[hovered].label}</strong>
            <br />
            {locale === "no" ? "Snittinntekt" : "Avg income"}:{" "}
            {fmtIncome(blocks[hovered].avgIncome)}
            <br />
            {locale === "no" ? "Del av artistar" : "Share of artists"}:{" "}
            {blocks[hovered].pctArtists}%
            <br />≈{" "}
            {formatNum(
              Math.round(
                (blocks[hovered].pctArtists / 100) * stats2025.totalArtists,
              ),
              locale,
            )}{" "}
            {locale === "no" ? "artistar" : "artists"}
          </div>
        )}
      </div>

      <p className="chartFootnote">{perSubNote}</p>
      <p className="chartSource">{t("sourcePerArtist", locale)}</p>
    </div>
  );
}

// ─── 6. Streams Needed for Minimum Wage ──────────────────────────

function StreamsToLiveChart({ locale }: { locale: Locale }) {
  const rate = KEY_FACTS.currentPerStreamUSD;

  const data = MIN_WAGES.map((w) => {
    const streamsNeeded = Math.round(w.monthlyUSD / rate);
    return {
      name: w.country,
      streams: streamsNeeded,
      perDay: Math.round(streamsNeeded / 30),
      color: COLORS.orange,
    };
  });

  return (
    <div>
      <h3 className="chartTitle">{t("streamsToLiveTitle", locale)}</h3>
      <p className="chartDesc">{t("streamsToLiveDesc", locale)}</p>

      <ResponsiveContainer
        width="100%"
        height={Math.max(500, data.length * 30)}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 10, right: 20, bottom: 25 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis
            type="number"
            tick={{ fill: COLORS.text, fontSize: 11 }}
            tickFormatter={(v: number) => {
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
              if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
              return String(v);
            }}
            label={{
              value: t("streamsPerMonth", locale),
              position: "insideBottom",
              fill: COLORS.text,
              fontSize: 11,
              offset: 0,
            }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fill: COLORS.text, fontSize: 12 }}
            interval={0}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={
              ((value: any, _name: any, props: any) => [
                `${formatNum(Number(value ?? 0), locale)} ${t("streamsPerMonth", locale)} (${t("streamsPerDay", locale).replace("{n}", formatNum(props?.payload?.perDay ?? 0, locale))})`,
                "",
              ]) as any
            }
          />
          <Bar dataKey="streams" radius={[0, 6, 6, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS.orange} />
            ))}
          </Bar>
          <ReferenceLine
            x={1_000_000}
            stroke={COLORS.red}
            strokeDasharray="5 5"
            label={{
              value: "1M",
              fill: COLORS.red,
              fontSize: 11,
              position: "top",
            }}
          />
        </BarChart>
      </ResponsiveContainer>

      <p className="chartFootnote industryWarning">
        {t("impossibleNote", locale)}
      </p>
      <p className="chartSource">{t("sourceStreamsToLive", locale)}</p>
    </div>
  );
}
