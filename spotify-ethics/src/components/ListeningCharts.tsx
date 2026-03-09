// src/components/ListeningCharts.tsx

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import html2canvas from "html2canvas";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import type { Locale } from "../lib/i18n";
import type { SpotifyStreamRow, AnalysisResult } from "../lib/analyze";
import {
  aggregateByDay,
  aggregateByHour,
  aggregateByWeekday,
  aggregateByMonth,
  classifyStart,
} from "../lib/analyze";
import { formatNum, t } from "../lib/i18n";

type ChartTab =
  | "daily"
  | "hourly"
  | "weekday"
  | "monthly"
  | "heatmap"
  | "activePassive";

type DailyMetric = "streams" | "minutes" | "artists";
type DateFilterMode = "all" | "year" | "custom";

interface ListeningChartsProps {
  rows: SpotifyStreamRow[];
  result: AnalysisResult;
  locale: Locale;
  minMsPlayed: number;
  // Time filter props
  availableYears: number[];
  dateFilterMode: DateFilterMode;
  dateFilterYear: number | null;
  onDateFilterChange: (mode: DateFilterMode, year?: number) => void;
}

const CHART_COLORS = {
  primary: "#1DB954", // Spotify green
  secondary: "#60a5fa", // Blue for unique artists
  tertiary: "#169c46",
  assisted: "#ee5a24", // Assisted listening (algorithm-driven)
  unknown: "#6b7280", // Gray - data without classification info
  grid: "rgba(255,255,255,0.1)",
  text: "rgba(255,255,255,0.7)",
  background: "#121212",
};

// Month names
const MONTH_NAMES_NO = [
  "jan",
  "feb",
  "mar",
  "apr",
  "mai",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "des",
];
const MONTH_NAMES_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/* ─── Heatmap Calendar (GitHub-style) ───────────────────────────── */

type HeatmapCell = {
  date: string;
  streams: number;
  dayOfWeek: number;
  inYear: boolean;
};

function HeatmapCalendar({
  dailyData,
  locale,
  monthNames,
  onDayClick,
}: {
  dailyData: { date: string; streams: number; msPlayed: number }[];
  locale: Locale;
  monthNames: string[];
  onDayClick?: (dateStr: string) => void;
}) {
  const CELL = 13;
  const GAP = 2;
  const STEP = CELL + GAP;
  const DAY_W = 28;

  const dataMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of dailyData) m.set(d.date, d.streams);
    return m;
  }, [dailyData]);

  const years = useMemo(() => {
    if (!dailyData.length) return [];
    const s = new Set<number>();
    for (const d of dailyData)
      s.add(new Date(d.date + "T12:00:00").getFullYear());
    return Array.from(s).sort((a, b) => b - a);
  }, [dailyData]);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const activeYear = selectedYear ?? years[0] ?? new Date().getFullYear();

  const maxStreams = useMemo(() => {
    let mx = 0;
    for (const d of dailyData) if (d.streams > mx) mx = d.streams;
    return mx || 1;
  }, [dailyData]);

  const { weeks, monthLabels } = useMemo(() => {
    const start = new Date(activeYear, 0, 1);
    const end = new Date(activeYear, 11, 31);
    const s = new Date(start);
    s.setDate(s.getDate() - s.getDay()); // back to Sunday

    const weeks: HeatmapCell[][] = [];
    const monthLabels: { month: number; weekIdx: number }[] = [];
    let cur = new Date(s);
    let week: HeatmapCell[] = [];
    let lastMo = -1;

    while (cur <= end || week.length > 0) {
      const dow = cur.getDay();
      const ds = cur.toISOString().slice(0, 10);
      const inYear = cur.getFullYear() === activeYear;
      const streams = (inYear ? dataMap.get(ds) : undefined) ?? 0;
      week.push({ date: ds, streams, dayOfWeek: dow, inYear });

      if (inYear && cur.getMonth() !== lastMo && cur.getDate() <= 7) {
        monthLabels.push({ month: cur.getMonth(), weekIdx: weeks.length });
        lastMo = cur.getMonth();
      }

      if (dow === 6) {
        weeks.push(week);
        week = [];
        if (cur > end) break;
      }
      cur = new Date(cur);
      cur.setDate(cur.getDate() + 1);
    }
    if (week.length) weeks.push(week);
    return { weeks, monthLabels };
  }, [activeYear, dataMap]);

  const color = (streams: number, inYear: boolean) => {
    if (!inYear) return "rgba(255,255,255,0.02)";
    if (streams === 0) return "rgba(255,255,255,0.06)";
    const r = Math.min(1, streams / (maxStreams * 0.6));
    if (r < 0.25) return "rgba(29,185,84,0.25)";
    if (r < 0.5) return "rgba(29,185,84,0.50)";
    if (r < 0.75) return "rgba(29,185,84,0.75)";
    return "#1DB954";
  };

  const dayLabels =
    locale === "en"
      ? ["", "Mon", "", "Wed", "", "Fri", ""]
      : ["", "man", "", "ons", "", "fre", ""];

  const svgW = DAY_W + weeks.length * STEP + 4;
  const svgH = 7 * STEP + 30;

  const [tip, setTip] = useState<{
    x: number;
    y: number;
    date: string;
    streams: number;
  } | null>(null);

  return (
    <div className="heatmapWrap">
      {years.length > 1 && (
        <div className="heatmapYearSel">
          {years.map((y) => (
            <button
              key={y}
              className={`heatmapYearBtn${y === activeYear ? " active" : ""}`}
              onClick={() => setSelectedYear(y)}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      <div className="heatmapScroll">
        <svg
          width={svgW}
          height={svgH}
          className="heatmapSvg"
          onMouseLeave={() => setTip(null)}
        >
          {monthLabels.map(({ month, weekIdx }) => (
            <text
              key={month}
              x={DAY_W + weekIdx * STEP}
              y={10}
              fill="rgba(255,255,255,0.5)"
              fontSize={10}
              fontFamily="inherit"
            >
              {monthNames[month]}
            </text>
          ))}

          {dayLabels.map((l, i) =>
            l ? (
              <text
                key={i}
                x={0}
                y={20 + i * STEP + CELL - 2}
                fill="rgba(255,255,255,0.4)"
                fontSize={9}
                fontFamily="inherit"
              >
                {l}
              </text>
            ) : null,
          )}

          {weeks.map((wk, wi) =>
            wk.map((c) => (
              <rect
                key={c.date}
                x={DAY_W + wi * STEP}
                y={20 + c.dayOfWeek * STEP}
                width={CELL}
                height={CELL}
                rx={2}
                fill={color(c.streams, c.inYear)}
                onClick={() => {
                  if (c.inYear && c.streams > 0 && onDayClick)
                    onDayClick(c.date);
                }}
                onMouseEnter={(e) => {
                  if (!c.inYear) return;
                  const r = (
                    e.target as SVGRectElement
                  ).getBoundingClientRect();
                  setTip({
                    x: r.left + r.width / 2,
                    y: r.top,
                    date: c.date,
                    streams: c.streams,
                  });
                }}
                onMouseLeave={() => setTip(null)}
                style={{
                  cursor: c.inYear && c.streams > 0 ? "pointer" : "default",
                }}
              />
            )),
          )}
        </svg>
      </div>

      <div className="heatmapLegend">
        <span className="heatmapLegendTxt">{t("heatmapLess", locale)}</span>
        {[
          "rgba(255,255,255,0.06)",
          "rgba(29,185,84,0.25)",
          "rgba(29,185,84,0.50)",
          "rgba(29,185,84,0.75)",
          "#1DB954",
        ].map((bg) => (
          <span
            key={bg}
            className="heatmapLegendCell"
            style={{ background: bg }}
          />
        ))}
        <span className="heatmapLegendTxt">{t("heatmapMore", locale)}</span>
      </div>

      {tip && (
        <div
          className="heatmapTooltip"
          style={{
            position: "fixed",
            left: tip.x,
            top: tip.y - 40,
            transform: "translateX(-50%)",
          }}
        >
          <strong>{tip.streams}</strong>{" "}
          {locale === "en" ? "streams" : "strøymingar"}
          <br />
          <span style={{ opacity: 0.7 }}>
            {new Date(tip.date + "T12:00:00").toLocaleDateString(
              locale === "en" ? "en-US" : "nb-NO",
              { month: "short", day: "numeric", year: "numeric" },
            )}
          </span>
        </div>
      )}
    </div>
  );
}

export default function ListeningCharts({
  rows,
  result,
  locale,
  minMsPlayed,
  availableYears,
  dateFilterMode,
  dateFilterYear,
  onDateFilterChange,
}: ListeningChartsProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>("daily");
  const [dailyMetric, setDailyMetric] = useState<DailyMetric>("streams");
  // Range sliders - only update chart on mouse release
  const [dailyRange, setDailyRange] = useState<[number, number]>([0, 100]); // percentage
  const [monthlyRange, setMonthlyRange] = useState<[number, number]>([0, 100]); // percentage
  const [drillDownData, setDrillDownData] = useState<{
    date: string;
    label: string;
    streams: number;
    minutes: number;
    artists: number;
    topTracks: Array<{
      track: string;
      artist: string;
      plays: number;
      ms: number;
      activeCount: number;
      assistedCount: number;
      unknownCount: number;
    }>;
    topArtists: Array<{ artist: string; plays: number; ms: number }>;
  } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Responsive chart height based on orientation
  const [chartHeight, setChartHeight] = useState(350);
  useEffect(() => {
    const updateHeight = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const isMobile = window.innerHeight < 600;
      if (isLandscape && isMobile) {
        setChartHeight(220);
      } else if (isMobile) {
        setChartHeight(280);
      } else {
        setChartHeight(350);
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    window.addEventListener("orientationchange", updateHeight);
    return () => {
      window.removeEventListener("resize", updateHeight);
      window.removeEventListener("orientationchange", updateHeight);
    };
  }, []);

  const monthNames = locale === "en" ? MONTH_NAMES_EN : MONTH_NAMES_NO;

  // Get drill-down data for a specific date
  const getDrillDownForDate = useCallback(
    (dateStr: string) => {
      // IMPORTANT: Use same date matching as aggregateByDay (ISO format, UTC-based)
      const dayRows = rows.filter((r) => {
        if (!r.ts || (r.ms_played ?? 0) < minMsPlayed) return false;
        const d = new Date(r.ts);
        if (isNaN(d.getTime())) return false;
        const rowDateKey = d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
        return rowDateKey === dateStr;
      });

      // Aggregate tracks with classification counts
      const trackMap = new Map<
        string,
        {
          track: string;
          artist: string;
          plays: number;
          ms: number;
          activeCount: number;
          assistedCount: number;
          unknownCount: number;
        }
      >();
      const artistMap = new Map<
        string,
        { artist: string; plays: number; ms: number }
      >();

      for (const row of dayRows) {
        const trackKey = `${row.master_metadata_track_name}|||${row.master_metadata_album_artist_name}`;
        const artistKey = row.master_metadata_album_artist_name || "Unknown";
        const trackName = row.master_metadata_track_name || "Unknown";
        const msPlayed = row.ms_played ?? 0;
        const classification = classifyStart(row.reason_start);

        // Track aggregation
        if (!trackMap.has(trackKey)) {
          trackMap.set(trackKey, {
            track: trackName,
            artist: artistKey,
            plays: 0,
            ms: 0,
            activeCount: 0,
            assistedCount: 0,
            unknownCount: 0,
          });
        }
        const t = trackMap.get(trackKey)!;
        t.plays++;
        t.ms += msPlayed;
        if (classification === "active") t.activeCount++;
        else if (classification === "passive") t.assistedCount++;
        else t.unknownCount++;

        // Artist aggregation
        if (!artistMap.has(artistKey)) {
          artistMap.set(artistKey, { artist: artistKey, plays: 0, ms: 0 });
        }
        const a = artistMap.get(artistKey)!;
        a.plays++;
        a.ms += msPlayed;
      }

      const topTracks = [...trackMap.values()].sort(
        (a, b) => b.plays - a.plays,
      );
      const topArtists = [...artistMap.values()].sort(
        (a, b) => b.plays - a.plays,
      );
      const totalMs = dayRows.reduce((sum, r) => sum + (r.ms_played ?? 0), 0);
      const uniqueArtists = new Set(
        dayRows.map((r) => r.master_metadata_album_artist_name),
      ).size;

      // Parse ISO date for display (add time to avoid timezone offset issues)
      const displayDate = new Date(dateStr + "T12:00:00");
      const formattedDate = displayDate.toLocaleDateString(
        locale === "en" ? "en-US" : "nb-NO",
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      );

      return {
        date: dateStr,
        label: formattedDate,
        streams: dayRows.length,
        minutes: Math.round(totalMs / 60000),
        artists: uniqueArtists,
        topTracks,
        topArtists,
      };
    },
    [rows, minMsPlayed, locale],
  );

  // Handle chart click for drill-down
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartClick = useCallback(
    (data: any) => {
      if (!data) return;

      // activeLabel contains the date string directly (YYYY-MM-DD format)
      const date = data.activeLabel;

      if (activeTab === "daily" && date && typeof date === "string") {
        const drillDown = getDrillDownForDate(date);
        setDrillDownData(drillDown);
      }
    },
    [activeTab, getDrillDownForDate],
  );

  // Export chart as PNG using html2canvas
  const exportChartPNG = useCallback(async () => {
    if (!chartContainerRef.current) {
      console.error("Chart container not found");
      return;
    }

    try {
      const container = chartContainerRef.current;

      // Force a small delay to ensure chart is fully rendered
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(container, {
        backgroundColor: "#121212",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        onclone: (clonedDoc) => {
          // Replace color-mix() values that html2canvas can't parse
          const style = clonedDoc.createElement("style");
          style.textContent = `
            * {
              --accent: #1DB954 !important;
              --text: #ffffff !important;
              --muted: #999999 !important;
            }
          `;
          clonedDoc.head.appendChild(style);

          // Remove elements with color-mix in their computed styles
          const allElements = clonedDoc.querySelectorAll("*");
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const computed = clonedDoc.defaultView?.getComputedStyle(htmlEl);
            if (computed) {
              if (
                computed.backgroundColor.includes("color-mix") ||
                computed.backgroundColor.includes("color(")
              ) {
                htmlEl.style.backgroundColor = "transparent";
              }
              if (
                computed.borderColor.includes("color-mix") ||
                computed.borderColor.includes("color(")
              ) {
                htmlEl.style.borderColor = "transparent";
              }
            }
          });
        },
      });

      // Validate canvas has content
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error("Canvas is empty");
      }

      const imgData = canvas.toDataURL("image/png");

      if (!imgData || imgData === "data:,") {
        throw new Error("Failed to generate image");
      }

      const tabLabels: Record<ChartTab, Record<"no" | "en", string>> = {
        daily: { no: "Dagleg", en: "Daily" },
        hourly: { no: "Timevis", en: "Hourly" },
        weekday: { no: "Vekedag", en: "Weekday" },
        monthly: { no: "Månadleg", en: "Monthly" },
        heatmap: { no: "Kalender", en: "Calendar" },
        activePassive: { no: "Aktiv/Assistert", en: "Active/Assisted" },
      };

      // Direct PNG download
      const link = document.createElement("a");
      link.download = `spotify-${tabLabels[activeTab].en.toLowerCase()}-${Date.now()}.png`;
      link.href = imgData;
      link.click();
    } catch (err) {
      console.error("Failed to export chart:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(
        locale === "en"
          ? `Failed to export chart: ${errorMsg}`
          : `Kunne ikkje eksportere graf: ${errorMsg}`,
      );
    }
  }, [activeTab, locale]);

  // Handle dropdown change
  const handleTimeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "all") {
      onDateFilterChange("all");
    } else {
      const year = parseInt(value, 10);
      if (!isNaN(year)) {
        onDateFilterChange("year", year);
      }
    }
  };

  // Pre-compute aggregations
  const dailyData = useMemo(
    () => aggregateByDay(rows, minMsPlayed),
    [rows, minMsPlayed],
  );

  // Zoomed daily data - filter based on range slider percentage
  const zoomedDailyData = useMemo(() => {
    if (dailyData.length === 0) return dailyData;
    if (dailyRange[0] === 0 && dailyRange[1] === 100) return dailyData;
    const startIdx = Math.floor((dailyRange[0] / 100) * dailyData.length);
    const endIdx = Math.ceil((dailyRange[1] / 100) * dailyData.length);
    return dailyData.slice(startIdx, endIdx);
  }, [dailyData, dailyRange]);

  const hourlyData = useMemo(
    () => aggregateByHour(rows, minMsPlayed),
    [rows, minMsPlayed],
  );

  const weekdayData = useMemo(
    () => aggregateByWeekday(rows, minMsPlayed, locale),
    [rows, minMsPlayed, locale],
  );

  const monthlyData = useMemo(
    () => aggregateByMonth(rows, minMsPlayed),
    [rows, minMsPlayed],
  );

  // Zoomed monthly data - filter based on range slider percentage
  const zoomedMonthlyData = useMemo(() => {
    if (monthlyData.length === 0) return monthlyData;
    if (monthlyRange[0] === 0 && monthlyRange[1] === 100) return monthlyData;
    const startIdx = Math.floor((monthlyRange[0] / 100) * monthlyData.length);
    const endIdx = Math.ceil((monthlyRange[1] / 100) * monthlyData.length);
    return monthlyData.slice(startIdx, endIdx);
  }, [monthlyData, monthlyRange]);

  // Active/Assisted pie data (including unknown category)
  const activePassiveData = useMemo(() => {
    const activeLabel = locale === "en" ? "Active listening" : "Aktiv lytting";
    const assistedLabel =
      locale === "en" ? "Assisted listening" : "Assistert lytting";
    const unknownLabel =
      locale === "en" ? "Unknown (old data)" : "Ukjent (eldre data)";

    const data = [
      {
        name: activeLabel,
        value: result.activeShare * 100,
        color: CHART_COLORS.primary,
      },
      {
        name: assistedLabel,
        value: result.passiveShare * 100,
        color: CHART_COLORS.assisted,
      },
    ];

    // Only show unknown slice if it's significant (>1%)
    if (result.unknownShare > 0.01) {
      data.push({
        name: unknownLabel,
        value: result.unknownShare * 100,
        color: CHART_COLORS.unknown,
      });
    }

    return data;
  }, [result, locale]);

  // Labels by locale
  const labels = useMemo(
    () => ({
      chartsTitle: locale === "en" ? "Listening Charts" : "Lyttediagram",
      daily: locale === "en" ? "Daily" : "Dagleg",
      hourly: locale === "en" ? "By hour" : "Per time",
      weekday: locale === "en" ? "Weekday" : "Vekedag",
      monthly: locale === "en" ? "Monthly" : "Månadleg",
      heatmap: t("heatmapTab", locale),
      activePassive: locale === "en" ? "Active/Assisted" : "Aktiv/Assistert",
      streams: locale === "en" ? "Streams" : "Strøymingar",
      minutes: locale === "en" ? "Minutes" : "Minutt",
      artists: locale === "en" ? "Artists" : "Artistar",
      hour: locale === "en" ? "Hour" : "Time",
      day: locale === "en" ? "Day" : "Dag",
      month: locale === "en" ? "Month" : "Månad",
      date: locale === "en" ? "Date" : "Dato",
      avgPerDay: locale === "en" ? "Avg streams/day" : "Snitt strøymingar/dag",
      uniqueArtists: locale === "en" ? "Unique artists" : "Unike artistar",
      listeningTime: locale === "en" ? "Listening time" : "Lyttetid",
      showMetric: locale === "en" ? "Show:" : "Vis:",
      noData:
        locale === "en"
          ? "No data available for charts"
          : "Ingen data tilgjengeleg for diagram",
      streamsUnit: locale === "en" ? "streams" : "strøymingar",
      minutesUnit: locale === "en" ? "min" : "min",
    }),
    [locale],
  );

  // Format minutes from ms - for display
  const formatMinutes = (ms: number): string => {
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return locale === "en" ? `${h}h ${m}m` : `${h}t ${m}m`;
  };

  // Format Y-axis for minutes (shorter)
  const formatYAxisMinutes = (ms: number): string => {
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}`;
    const h = Math.floor(mins / 60);
    return `${h}t`;
  };

  // Custom tooltip - with clear units
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    // Calculate totals for stacked bars
    let totalStreams = 0;
    let totalMs = 0;
    const isStackedStreams = payload.some(
      (e: any) =>
        e.dataKey === "activeStreams" ||
        e.dataKey === "passiveStreams" ||
        e.dataKey === "unknownStreams",
    );
    const isStackedMinutes = payload.some(
      (e: any) =>
        e.dataKey === "activeMsPlayed" ||
        e.dataKey === "passiveMsPlayed" ||
        e.dataKey === "unknownMsPlayed",
    );

    if (isStackedStreams) {
      totalStreams = payload.reduce(
        (sum: number, e: any) =>
          e.dataKey === "activeStreams" ||
          e.dataKey === "passiveStreams" ||
          e.dataKey === "unknownStreams"
            ? sum + (e.value || 0)
            : sum,
        0,
      );
    }
    if (isStackedMinutes) {
      totalMs = payload.reduce(
        (sum: number, e: any) =>
          e.dataKey === "activeMsPlayed" ||
          e.dataKey === "passiveMsPlayed" ||
          e.dataKey === "unknownMsPlayed"
            ? sum + (e.value || 0)
            : sum,
        0,
      );
    }

    return (
      <div className="chartTooltip">
        <p className="chartTooltipLabel">{label}</p>
        {/* Show total first for stacked charts */}
        {isStackedStreams && (
          <p style={{ color: CHART_COLORS.text, fontWeight: 600 }}>
            {locale === "en" ? "Total" : "Totalt"}:{" "}
            {formatNum(totalStreams, locale)} {labels.streamsUnit}
          </p>
        )}
        {isStackedMinutes && (
          <p style={{ color: CHART_COLORS.text, fontWeight: 600 }}>
            {locale === "en" ? "Total" : "Totalt"}: {formatMinutes(totalMs)}
          </p>
        )}
        {payload.map((entry: any, idx: number) => {
          const dataKey = entry.dataKey || "";
          const isMinutes =
            dataKey === "msPlayed" ||
            dataKey.includes("Ms") ||
            dataKey.includes("MsPlayed");
          const isStreams =
            dataKey === "streams" ||
            dataKey === "avgStreams" ||
            dataKey.includes("Streams");

          let formattedValue: string;
          if (isMinutes) {
            formattedValue = formatMinutes(entry.value);
          } else if (isStreams) {
            formattedValue = `${formatNum(entry.value, locale)} ${labels.streamsUnit}`;
          } else {
            formattedValue = formatNum(entry.value, locale);
          }

          return (
            <p key={idx} style={{ color: entry.color || CHART_COLORS.primary }}>
              {entry.name}: {formattedValue}
            </p>
          );
        })}
      </div>
    );
  };

  // Calculate data range to determine best axis format (use zoomed data)
  const dataRangeInfo = useMemo(() => {
    if (zoomedDailyData.length === 0) return { years: 0, months: 0 };
    const first = new Date(zoomedDailyData[0].date);
    const last = new Date(zoomedDailyData[zoomedDailyData.length - 1].date);
    const years =
      (last.getTime() - first.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const months = years * 12;
    return { years, months };
  }, [zoomedDailyData]);

  // Format monthly X-axis - show year prominently on January
  const formatMonthlyXAxis = (monthStr: string): string => {
    const parts = monthStr.split("-");
    if (parts.length < 2) return monthStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    // Show full year on January
    if (monthIdx === 0) {
      return year;
    }
    return monthNames[monthIdx];
  };

  // Generate meaningful tick positions for daily chart (use zoomed data)
  const dailyTicks = useMemo(() => {
    if (zoomedDailyData.length === 0) return [];

    const dataDateSet = new Set(zoomedDailyData.map((d) => d.date));
    const ticks: string[] = [];

    // Multi-year: show years
    if (dataRangeInfo.years > 2) {
      // Find all January 1st dates in the data
      for (const item of zoomedDailyData) {
        const d = new Date(item.date);
        if (d.getMonth() === 0 && d.getDate() === 1) {
          ticks.push(item.date);
        }
      }
      // If no Jan 1st found, find closest to Jan 1st for each year
      if (ticks.length === 0) {
        const yearsSeen = new Set<number>();
        for (const item of zoomedDailyData) {
          const d = new Date(item.date);
          const year = d.getFullYear();
          if (!yearsSeen.has(year)) {
            yearsSeen.add(year);
            ticks.push(item.date);
          }
        }
      }
    }
    // 1-2 years: show months
    else if (dataRangeInfo.years > 0.5) {
      const monthsSeen = new Set<string>();
      for (const item of zoomedDailyData) {
        const d = new Date(item.date);
        const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
        if (!monthsSeen.has(monthKey)) {
          monthsSeen.add(monthKey);
          // Prefer 1st of month if available
          const firstOfMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
          if (dataDateSet.has(firstOfMonth)) {
            ticks.push(firstOfMonth);
          } else {
            ticks.push(item.date);
          }
        }
      }
    }
    // Short range: show every few days
    else {
      const step = Math.max(1, Math.floor(zoomedDailyData.length / 10));
      for (let i = 0; i < zoomedDailyData.length; i += step) {
        ticks.push(zoomedDailyData[i].date);
      }
      // Always include last
      if (!ticks.includes(zoomedDailyData[zoomedDailyData.length - 1].date)) {
        ticks.push(zoomedDailyData[zoomedDailyData.length - 1].date);
      }
    }

    return ticks;
  }, [zoomedDailyData, dataRangeInfo]);

  // Simpler formatting now that ticks are positioned correctly
  const formatDailyXAxisTick = (dateStr: string): string => {
    const d = new Date(dateStr);
    const month = d.getMonth();
    const year = d.getFullYear();

    // Multi-year: show year
    if (dataRangeInfo.years > 2) {
      return `${year}`;
    }

    // 1-2 years: show month + year for Jan, just month otherwise
    if (dataRangeInfo.years > 0.5) {
      if (month === 0) {
        return `${year}`;
      }
      return monthNames[month];
    }

    // Short range: show day.month
    return `${d.getDate()}. ${monthNames[month]}`;
  };

  // Get year boundaries for ReferenceLine in daily chart (use zoomed data)
  const yearBoundariesDaily = useMemo(() => {
    const boundaries: string[] = [];
    for (const item of zoomedDailyData) {
      const d = new Date(item.date);
      if (d.getMonth() === 0 && d.getDate() === 1) {
        boundaries.push(item.date);
      }
    }
    return boundaries;
  }, [zoomedDailyData]);

  // Get year boundaries for ReferenceLine in monthly chart (use zoomed data)
  const yearBoundariesMonthly = useMemo(() => {
    const boundaries: string[] = [];
    for (const item of zoomedMonthlyData) {
      if (item.month.endsWith("-01")) {
        boundaries.push(item.month);
      }
    }
    return boundaries;
  }, [zoomedMonthlyData]);

  if (dailyData.length === 0) {
    return (
      <div className="chartsSection">
        <h3 className="chartsSectionTitle">{labels.chartsTitle}</h3>
        <p className="subtle">{labels.noData}</p>
      </div>
    );
  }

  // Calculate appropriate intervals for monthly chart (use zoomed data)
  const monthlyInterval =
    zoomedMonthlyData.length > 24
      ? Math.floor(zoomedMonthlyData.length / 12)
      : zoomedMonthlyData.length > 12
        ? 2
        : 0;

  return (
    <div className="chartsSection">
      <div className="chartsSectionHeader">
        <h3 className="chartsSectionTitle">{labels.chartsTitle}</h3>
        <div className="chartsHeaderRight">
          <button
            className="btnExportChart"
            onClick={exportChartPNG}
            title={locale === "en" ? "Export as PNG" : "Eksporter som PNG"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            PNG
          </button>
          <div className="chartsTimeFilter">
            <label htmlFor="charts-time-filter">
              {locale === "en" ? "Period:" : "Periode:"}
            </label>
            <select
              id="charts-time-filter"
              className="chartsTimeSelect"
              value={
                dateFilterMode === "year" && dateFilterYear
                  ? dateFilterYear.toString()
                  : "all"
              }
              onChange={handleTimeFilterChange}
            >
              <option value="all">
                {locale === "en" ? "All time" : "All tid"}
              </option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="chartsTabs">
        {(
          [
            "daily",
            "hourly",
            "weekday",
            "monthly",
            "heatmap",
            "activePassive",
          ] as ChartTab[]
        ).map((tab) => (
          <button
            key={tab}
            className={`chartsTab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {labels[tab]}
          </button>
        ))}
      </div>

      <div ref={chartContainerRef}>
        {/* Daily chart */}
        {activeTab === "daily" && (
          <div className="chartContainer">
            <div className="chartMetricToggle">
              <span>{labels.showMetric}</span>
              {(["streams", "minutes", "artists"] as DailyMetric[]).map(
                (metric) => (
                  <button
                    key={metric}
                    className={`metricBtn ${dailyMetric === metric ? "active" : ""}`}
                    onClick={() => setDailyMetric(metric)}
                  >
                    {labels[metric]}
                  </button>
                ),
              )}
            </div>
            <p className="chartClickHint">
              {locale === "en"
                ? "💡 Click on a data point to see details"
                : "💡 Klikk på eit datapunkt for å sjå detaljar"}
            </p>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={zoomedDailyData} onClick={handleChartClick}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_COLORS.grid}
                />
                <XAxis
                  dataKey="date"
                  stroke={CHART_COLORS.text}
                  tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                  tickFormatter={formatDailyXAxisTick}
                  ticks={dailyTicks}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  stroke={CHART_COLORS.text}
                  tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                  tickFormatter={(val) =>
                    dailyMetric === "minutes"
                      ? formatYAxisMinutes(val)
                      : formatNum(val, locale)
                  }
                  label={
                    dailyMetric === "minutes"
                      ? {
                          value: labels.minutesUnit,
                          angle: -90,
                          position: "insideLeft",
                          style: { fill: CHART_COLORS.text, fontSize: 11 },
                          offset: 10,
                        }
                      : undefined
                  }
                  width={dailyMetric === "minutes" ? 60 : 50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 10 }}
                  iconType="square"
                  iconSize={10}
                />
                {dailyMetric === "streams" && (
                  <>
                    <Bar
                      dataKey="activeStreams"
                      name={locale === "en" ? "Active" : "Aktiv"}
                      stackId="streams"
                      fill={CHART_COLORS.primary}
                      isAnimationActive={false}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="passiveStreams"
                      name={locale === "en" ? "Assisted" : "Assistert"}
                      stackId="streams"
                      fill={CHART_COLORS.assisted}
                      isAnimationActive={false}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="unknownStreams"
                      name={locale === "en" ? "Unknown" : "Ukjent"}
                      stackId="streams"
                      fill={CHART_COLORS.unknown}
                      isAnimationActive={false}
                      cursor="pointer"
                    />
                  </>
                )}
                {dailyMetric === "minutes" && (
                  <>
                    <Bar
                      dataKey="activeMsPlayed"
                      name={locale === "en" ? "Active" : "Aktiv"}
                      stackId="minutes"
                      fill={CHART_COLORS.primary}
                      isAnimationActive={false}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="passiveMsPlayed"
                      name={locale === "en" ? "Assisted" : "Assistert"}
                      stackId="minutes"
                      fill={CHART_COLORS.assisted}
                      isAnimationActive={false}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="unknownMsPlayed"
                      name={locale === "en" ? "Unknown" : "Ukjent"}
                      stackId="minutes"
                      fill={CHART_COLORS.unknown}
                      isAnimationActive={false}
                      cursor="pointer"
                    />
                  </>
                )}
                {dailyMetric === "artists" && (
                  <Bar
                    dataKey="uniqueArtists"
                    name={labels.uniqueArtists}
                    fill={CHART_COLORS.secondary}
                    isAnimationActive={false}
                    cursor="pointer"
                  />
                )}
                {/* Year boundary lines */}
                {yearBoundariesDaily.map((date) => (
                  <ReferenceLine
                    key={date}
                    x={date}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            {/* Range slider for zooming */}
            {dailyData.length > 30 && (
              <div className="chartRangeSlider">
                <span className="rangeLabel">
                  {dailyData.length > 0 &&
                    new Date(dailyData[0].date).toLocaleDateString(
                      locale === "en" ? "en-US" : "nb-NO",
                      { month: "short", year: "2-digit" },
                    )}
                </span>
                <div className="rangeSliderTrack">
                  <div
                    className="rangeSliderFill"
                    style={{
                      left: `${dailyRange[0]}%`,
                      width: `${dailyRange[1] - dailyRange[0]}%`,
                    }}
                  />
                  {/* Handle position labels */}
                  {dailyData.length > 0 && (
                    <>
                      <span
                        className="rangeHandleLabel rangeHandleLabelStart"
                        style={{ left: `${dailyRange[0]}%` }}
                      >
                        {new Date(
                          dailyData[
                            Math.min(
                              Math.floor(
                                (dailyRange[0] / 100) * dailyData.length,
                              ),
                              dailyData.length - 1,
                            )
                          ].date,
                        ).toLocaleDateString(
                          locale === "en" ? "en-US" : "nb-NO",
                          {
                            month: "short",
                            year: "2-digit",
                          },
                        )}
                      </span>
                      <span
                        className="rangeHandleLabel rangeHandleLabelEnd"
                        style={{ left: `${dailyRange[1]}%` }}
                      >
                        {new Date(
                          dailyData[
                            Math.min(
                              Math.ceil(
                                (dailyRange[1] / 100) * dailyData.length,
                              ) - 1,
                              dailyData.length - 1,
                            )
                          ].date,
                        ).toLocaleDateString(
                          locale === "en" ? "en-US" : "nb-NO",
                          {
                            month: "short",
                            year: "2-digit",
                          },
                        )}
                      </span>
                    </>
                  )}
                  <input
                    key={`daily-start-${dailyRange[0]}`}
                    type="range"
                    min="0"
                    max="100"
                    defaultValue={dailyRange[0]}
                    className="rangeSliderInput rangeSliderStart"
                    onMouseUp={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      if (val < dailyRange[1] - 5) {
                        setDailyRange([val, dailyRange[1]]);
                      }
                    }}
                    onTouchEnd={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      if (val < dailyRange[1] - 5) {
                        setDailyRange([val, dailyRange[1]]);
                      }
                    }}
                  />
                  <input
                    key={`daily-end-${dailyRange[1]}`}
                    type="range"
                    min="0"
                    max="100"
                    defaultValue={dailyRange[1]}
                    className="rangeSliderInput rangeSliderEnd"
                    onMouseUp={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      if (val > dailyRange[0] + 5) {
                        setDailyRange([dailyRange[0], val]);
                      }
                    }}
                    onTouchEnd={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      if (val > dailyRange[0] + 5) {
                        setDailyRange([dailyRange[0], val]);
                      }
                    }}
                  />
                </div>
                <span className="rangeLabel">
                  {dailyData.length > 0 &&
                    new Date(
                      dailyData[dailyData.length - 1].date,
                    ).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO", {
                      month: "short",
                      year: "2-digit",
                    })}
                </span>
                {(dailyRange[0] > 0 || dailyRange[1] < 100) && (
                  <button
                    className="rangeResetBtn"
                    onClick={() => setDailyRange([0, 100])}
                    title={locale === "en" ? "Reset zoom" : "Nullstill zoom"}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Hourly chart */}
        {activeTab === "hourly" && (
          <div className="chartContainer">
            <ResponsiveContainer width="100%" height={chartHeight - 50}>
              <BarChart data={hourlyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_COLORS.grid}
                />
                <XAxis
                  dataKey="hour"
                  stroke={CHART_COLORS.text}
                  tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                  tickFormatter={(val) => `${val}:00`}
                  interval={2}
                />
                <YAxis
                  stroke={CHART_COLORS.text}
                  tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="streams"
                  name={labels.streams}
                  fill={CHART_COLORS.primary}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Weekday chart */}
        {activeTab === "weekday" && (
          <div className="chartContainer">
            <ResponsiveContainer width="100%" height={chartHeight - 50}>
              <BarChart data={weekdayData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_COLORS.grid}
                />
                <XAxis
                  dataKey="dayName"
                  stroke={CHART_COLORS.text}
                  tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                />
                <YAxis
                  stroke={CHART_COLORS.text}
                  tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="avgStreams"
                  name={labels.avgPerDay}
                  fill={CHART_COLORS.primary}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly chart */}
        {activeTab === "monthly" && (
          <div className="chartContainer">
            <ResponsiveContainer width="100%" height={chartHeight + 30}>
              <LineChart data={zoomedMonthlyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_COLORS.grid}
                />
                <XAxis
                  dataKey="month"
                  stroke={CHART_COLORS.text}
                  tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                  tickFormatter={formatMonthlyXAxis}
                  interval={monthlyInterval}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  yAxisId="left"
                  stroke={CHART_COLORS.primary}
                  tick={{ fill: CHART_COLORS.primary, fontSize: 11 }}
                  label={{
                    value: labels.streams,
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: CHART_COLORS.primary, fontSize: 11 },
                    offset: 0,
                  }}
                  width={70}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={CHART_COLORS.secondary}
                  tick={{ fill: CHART_COLORS.secondary, fontSize: 11 }}
                  label={{
                    value: labels.uniqueArtists,
                    angle: 90,
                    position: "insideRight",
                    style: { fill: CHART_COLORS.secondary, fontSize: 11 },
                    offset: 0,
                  }}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{
                    color: CHART_COLORS.text,
                    paddingTop: "10px",
                    paddingBottom: "30px",
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="streams"
                  name={labels.streams}
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.primary, r: 3 }}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="uniqueArtists"
                  name={labels.uniqueArtists}
                  stroke={CHART_COLORS.secondary}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.secondary, r: 3 }}
                  isAnimationActive={false}
                />
                {/* Year boundary lines */}
                {yearBoundariesMonthly.map((month) => (
                  <ReferenceLine
                    key={month}
                    x={month}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            {/* Range slider for zooming */}
            {monthlyData.length > 12 && (
              <div className="chartRangeSlider">
                <span className="rangeLabel">
                  {monthlyData.length > 0 &&
                    (() => {
                      const [year, month] = monthlyData[0].month.split("-");
                      const d = new Date(
                        parseInt(year),
                        parseInt(month) - 1,
                        1,
                      );
                      return d.toLocaleDateString(
                        locale === "en" ? "en-US" : "nb-NO",
                        { month: "short", year: "2-digit" },
                      );
                    })()}
                </span>
                <div className="rangeSliderTrack">
                  <div
                    className="rangeSliderFill"
                    style={{
                      left: `${monthlyRange[0]}%`,
                      width: `${monthlyRange[1] - monthlyRange[0]}%`,
                    }}
                  />
                  {/* Handle position labels */}
                  {monthlyData.length > 0 && (
                    <>
                      <span
                        className="rangeHandleLabel rangeHandleLabelStart"
                        style={{ left: `${monthlyRange[0]}%` }}
                      >
                        {(() => {
                          const idx = Math.min(
                            Math.floor(
                              (monthlyRange[0] / 100) * monthlyData.length,
                            ),
                            monthlyData.length - 1,
                          );
                          const [year, month] =
                            monthlyData[idx].month.split("-");
                          const d = new Date(
                            parseInt(year),
                            parseInt(month) - 1,
                            1,
                          );
                          return d.toLocaleDateString(
                            locale === "en" ? "en-US" : "nb-NO",
                            {
                              month: "short",
                              year: "2-digit",
                            },
                          );
                        })()}
                      </span>
                      <span
                        className="rangeHandleLabel rangeHandleLabelEnd"
                        style={{ left: `${monthlyRange[1]}%` }}
                      >
                        {(() => {
                          const idx = Math.min(
                            Math.ceil(
                              (monthlyRange[1] / 100) * monthlyData.length,
                            ) - 1,
                            monthlyData.length - 1,
                          );
                          const [year, month] =
                            monthlyData[idx].month.split("-");
                          const d = new Date(
                            parseInt(year),
                            parseInt(month) - 1,
                            1,
                          );
                          return d.toLocaleDateString(
                            locale === "en" ? "en-US" : "nb-NO",
                            {
                              month: "short",
                              year: "2-digit",
                            },
                          );
                        })()}
                      </span>
                    </>
                  )}
                  <input
                    key={`monthly-start-${monthlyRange[0]}`}
                    type="range"
                    min="0"
                    max="100"
                    defaultValue={monthlyRange[0]}
                    className="rangeSliderInput rangeSliderStart"
                    onMouseUp={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      if (val < monthlyRange[1] - 5) {
                        setMonthlyRange([val, monthlyRange[1]]);
                      }
                    }}
                    onTouchEnd={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      if (val < monthlyRange[1] - 5) {
                        setMonthlyRange([val, monthlyRange[1]]);
                      }
                    }}
                  />
                  <input
                    key={`monthly-end-${monthlyRange[1]}`}
                    type="range"
                    min="0"
                    max="100"
                    defaultValue={monthlyRange[1]}
                    className="rangeSliderInput rangeSliderEnd"
                    onMouseUp={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      if (val > monthlyRange[0] + 5) {
                        setMonthlyRange([monthlyRange[0], val]);
                      }
                    }}
                    onTouchEnd={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      if (val > monthlyRange[0] + 5) {
                        setMonthlyRange([monthlyRange[0], val]);
                      }
                    }}
                  />
                </div>
                <span className="rangeLabel">
                  {monthlyData.length > 0 &&
                    (() => {
                      const [year, month] =
                        monthlyData[monthlyData.length - 1].month.split("-");
                      const d = new Date(
                        parseInt(year),
                        parseInt(month) - 1,
                        1,
                      );
                      return d.toLocaleDateString(
                        locale === "en" ? "en-US" : "nb-NO",
                        { month: "short", year: "2-digit" },
                      );
                    })()}
                </span>
                {(monthlyRange[0] > 0 || monthlyRange[1] < 100) && (
                  <button
                    className="rangeResetBtn"
                    onClick={() => setMonthlyRange([0, 100])}
                    title={locale === "en" ? "Reset zoom" : "Nullstill zoom"}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Listening Heatmap (GitHub-style calendar) */}
        {activeTab === "heatmap" && (
          <div className="chartContainer">
            <HeatmapCalendar
              dailyData={dailyData}
              locale={locale}
              monthNames={monthNames}
              onDayClick={(dateStr) => {
                const drillDown = getDrillDownForDate(dateStr);
                setDrillDownData(drillDown);
              }}
            />
          </div>
        )}

        {/* Active/Assisted pie chart */}
        {activeTab === "activePassive" && (
          <div className="chartContainer pieChartContainer">
            <ResponsiveContainer width="100%" height={chartHeight - 50}>
              <PieChart>
                <Pie
                  data={activePassiveData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ value }) => `${value.toFixed(0)}%`}
                  labelLine={false}
                >
                  {activePassiveData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `${Number(value).toFixed(1)}%`}
                />
                <Legend wrapperStyle={{ color: CHART_COLORS.text }} />
              </PieChart>
            </ResponsiveContainer>
            <p className="chartDescription">
              {locale === "en"
                ? "Active = you played, navigated, or continued an album/playlist. Passive = Spotify chose for you (autoplay after album ends, recommendations, app startup). Unknown = ambiguous data (e.g. older exports where the start reason field has unclear semantics)."
                : "Aktiv = du spelte, navigerte, eller fortsette eit album/spilleliste. Passiv = Spotify valde for deg (autoplay etter albumet er ferdig, anbefalingar, app-oppstart). Ukjent = tvetydig data (t.d. eldre eksportar der reason_start-feltet har uklar historisk betydning)."}
            </p>
            {result.unknownShare > 0.05 && (
              <p className="chartWarning">
                ⚠️{" "}
                {locale === "en"
                  ? `${Math.round(result.unknownShare * 100)}% of your listening data cannot be reliably classified as active or passive. This is often due to older exports where the data format differs. The active/passive statistics should be interpreted with caution.`
                  : `${Math.round(result.unknownShare * 100)}% av lyttedataene dine kan ikkje klassifiserast påliteleg som aktiv eller passiv. Dette skuldast ofte eldre eksportar der dataformatet er annleis. Aktiv/passiv-statistikken bør tolkast med forsiktigheit.`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Drill-down Modal */}
      {drillDownData && (
        <div
          className="drillDownOverlay"
          onClick={() => setDrillDownData(null)}
        >
          <div className="drillDownModal" onClick={(e) => e.stopPropagation()}>
            <button
              className="drillDownClose"
              onClick={() => setDrillDownData(null)}
            >
              ×
            </button>
            <h3 className="drillDownTitle">{drillDownData.label}</h3>

            <div className="drillDownStats">
              <div className="drillDownStat">
                <span className="drillDownStatValue">
                  {formatNum(drillDownData.streams, locale)}
                </span>
                <span className="drillDownStatLabel">
                  {locale === "en" ? "Streams" : "Strøymingar"}
                </span>
              </div>
              <div className="drillDownStat">
                <span className="drillDownStatValue">
                  {formatNum(drillDownData.minutes, locale)}
                </span>
                <span className="drillDownStatLabel">
                  {locale === "en" ? "Minutes" : "Minutt"}
                </span>
              </div>
              <div className="drillDownStat">
                <span className="drillDownStatValue">
                  {drillDownData.artists}
                </span>
                <span className="drillDownStatLabel">
                  {locale === "en" ? "Artists" : "Artistar"}
                </span>
              </div>
            </div>

            <div className="drillDownSections">
              <div className="drillDownSection">
                <h4>
                  {locale === "en"
                    ? `All Tracks (${drillDownData.topTracks.length})`
                    : `Alle låtar (${drillDownData.topTracks.length})`}
                </h4>
                <div className="classificationLegend">
                  <span className="legendItem">
                    <span className="classificationBadge active">●</span>
                    {locale === "en" ? "Active" : "Aktiv"}
                  </span>
                  <span className="legendItem">
                    <span className="classificationBadge assisted">●</span>
                    {locale === "en" ? "Assisted" : "Assistert"}
                  </span>
                  <span className="legendItem">
                    <span className="classificationBadge unknown">●</span>
                    {locale === "en" ? "Unknown" : "Ukjent"}
                  </span>
                </div>
                <ul className="drillDownList">
                  {drillDownData.topTracks.map((t, i) => (
                    <li key={i} className="drillDownItem">
                      <span className="drillDownRank">{i + 1}</span>
                      <div className="drillDownItemInfo">
                        <span className="drillDownTrack">{t.track}</span>
                        <span className="drillDownArtist">{t.artist}</span>
                      </div>
                      <div className="drillDownClassification">
                        {t.activeCount > 0 && (
                          <span
                            className="classificationBadge active"
                            title={
                              locale === "en"
                                ? `${t.activeCount} active`
                                : `${t.activeCount} aktiv`
                            }
                          >
                            {t.activeCount}
                          </span>
                        )}
                        {t.assistedCount > 0 && (
                          <span
                            className="classificationBadge assisted"
                            title={
                              locale === "en"
                                ? `${t.assistedCount} assisted`
                                : `${t.assistedCount} assistert`
                            }
                          >
                            {t.assistedCount}
                          </span>
                        )}
                        {t.unknownCount > 0 && (
                          <span
                            className="classificationBadge unknown"
                            title={
                              locale === "en"
                                ? `${t.unknownCount} unknown`
                                : `${t.unknownCount} ukjent`
                            }
                          >
                            {t.unknownCount}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="drillDownSection">
                <h4>
                  {locale === "en"
                    ? `All Artists (${drillDownData.topArtists.length})`
                    : `Alle artistar (${drillDownData.topArtists.length})`}
                </h4>
                <ul className="drillDownList">
                  {drillDownData.topArtists.map((a, i) => (
                    <li key={i} className="drillDownItem">
                      <span className="drillDownRank">{i + 1}</span>
                      <div className="drillDownItemInfo">
                        <span className="drillDownTrack">{a.artist}</span>
                        <span className="drillDownArtist">
                          {Math.round(a.ms / 60000)} min
                        </span>
                      </div>
                      <span className="drillDownPlays">{a.plays}×</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
