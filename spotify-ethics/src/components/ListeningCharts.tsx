// src/components/ListeningCharts.tsx

import { useState, useMemo, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import {
  AreaChart,
  Area,
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
  Brush,
} from "recharts";
import type { Locale } from "../lib/i18n";
import type { SpotifyStreamRow, AnalysisResult } from "../lib/analyze";
import {
  aggregateByDay,
  aggregateByHour,
  aggregateByWeekday,
  aggregateByMonth,
} from "../lib/analyze";
import { formatNum } from "../lib/i18n";

type ChartTab = "daily" | "hourly" | "weekday" | "monthly" | "activePassive";

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
  passive: "#ee5a24",
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
  const [drillDownData, setDrillDownData] = useState<{
    date: string;
    label: string;
    streams: number;
    minutes: number;
    artists: number;
    topTracks: Array<{ track: string; artist: string; plays: number; ms: number }>;
    topArtists: Array<{ artist: string; plays: number; ms: number }>;
  } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const monthNames = locale === "en" ? MONTH_NAMES_EN : MONTH_NAMES_NO;

  // Get drill-down data for a specific date
  const getDrillDownForDate = useCallback((dateStr: string) => {
    const targetDate = new Date(dateStr);
    const dayRows = rows.filter(r => {
      if (!r.ts || (r.ms_played ?? 0) < minMsPlayed) return false;
      const d = new Date(r.ts);
      return d.toDateString() === targetDate.toDateString();
    });

    // Aggregate tracks
    const trackMap = new Map<string, { track: string; artist: string; plays: number; ms: number }>();
    const artistMap = new Map<string, { artist: string; plays: number; ms: number }>();

    for (const row of dayRows) {
      const trackKey = `${row.master_metadata_track_name}|||${row.master_metadata_album_artist_name}`;
      const artistKey = row.master_metadata_album_artist_name || "Unknown";
      const trackName = row.master_metadata_track_name || "Unknown";
      const msPlayed = row.ms_played ?? 0;

      // Track aggregation
      if (!trackMap.has(trackKey)) {
        trackMap.set(trackKey, { track: trackName, artist: artistKey, plays: 0, ms: 0 });
      }
      const t = trackMap.get(trackKey)!;
      t.plays++;
      t.ms += msPlayed;

      // Artist aggregation
      if (!artistMap.has(artistKey)) {
        artistMap.set(artistKey, { artist: artistKey, plays: 0, ms: 0 });
      }
      const a = artistMap.get(artistKey)!;
      a.plays++;
      a.ms += msPlayed;
    }

    const topTracks = [...trackMap.values()].sort((a, b) => b.plays - a.plays).slice(0, 10);
    const topArtists = [...artistMap.values()].sort((a, b) => b.plays - a.plays).slice(0, 10);
    const totalMs = dayRows.reduce((sum, r) => sum + (r.ms_played ?? 0), 0);
    const uniqueArtists = new Set(dayRows.map(r => r.master_metadata_album_artist_name)).size;

    const formattedDate = targetDate.toLocaleDateString(locale === "en" ? "en-US" : "nb-NO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    return {
      date: dateStr,
      label: formattedDate,
      streams: dayRows.length,
      minutes: Math.round(totalMs / 60000),
      artists: uniqueArtists,
      topTracks,
      topArtists
    };
  }, [rows, minMsPlayed, locale]);

  // Handle chart click for drill-down
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartClick = useCallback((data: any) => {
    if (!data?.activePayload || data.activePayload.length === 0) return;
    const payload = data.activePayload[0]?.payload;
    
    if (activeTab === "daily" && payload?.date) {
      const drillDown = getDrillDownForDate(payload.date);
      setDrillDownData(drillDown);
    }
  }, [activeTab, getDrillDownForDate]);

  // Handle dot click for drill-down (more reliable than chart onClick)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDotClick = useCallback((data: any) => {
    if (activeTab === "daily" && data?.payload?.date) {
      const drillDown = getDrillDownForDate(data.payload.date);
      setDrillDownData(drillDown);
    }
  }, [activeTab, getDrillDownForDate]);

  // Export chart as PDF
  const exportChartPDF = useCallback(async () => {
    if (!chartContainerRef.current) {
      console.error("Chart container not found");
      return;
    }

    try {
      const container = chartContainerRef.current;
      
      // Force a small delay to ensure chart is fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(container, {
        backgroundColor: "#121212",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        onclone: (clonedDoc) => {
          // Replace color-mix() values that html2canvas can't parse
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * {
              --accent: #1DB954 !important;
              --text: #ffffff !important;
              --muted: #999999 !important;
            }
          `;
          clonedDoc.head.appendChild(style);
          
          // Remove elements with color-mix in their computed styles
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const computed = clonedDoc.defaultView?.getComputedStyle(htmlEl);
            if (computed) {
              // Replace problematic background colors
              if (computed.backgroundColor.includes('color-mix') || computed.backgroundColor.includes('color(')) {
                htmlEl.style.backgroundColor = 'transparent';
              }
              if (computed.borderColor.includes('color-mix') || computed.borderColor.includes('color(')) {
                htmlEl.style.borderColor = 'transparent';
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
      const date = new Date().toLocaleDateString(
        locale === "en" ? "en-US" : "nb-NO",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        },
      );

      const tabLabels: Record<ChartTab, Record<"no" | "en", string>> = {
        daily: { no: "Dagleg", en: "Daily" },
        hourly: { no: "Timevis", en: "Hourly" },
        weekday: { no: "Vekedag", en: "Weekday" },
        monthly: { no: "Månadleg", en: "Monthly" },
        activePassive: { no: "Aktiv/Passiv", en: "Active/Passive" },
      };

      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Spotify Unwrapped - ${tabLabels[activeTab][locale]} Chart</title>
  <style>
    @page { size: landscape; margin: 20mm; }
    body { font-family: system-ui, sans-serif; background: #121212; color: #fff; margin: 0; padding: 40px; }
    .header { text-align: center; margin-bottom: 24px; }
    h1 { font-size: 24px; margin: 0; color: #1DB954; }
    .subtitle { color: #999; font-size: 14px; margin-top: 8px; }
    .chart-img { display: block; max-width: 100%; margin: 0 auto; border-radius: 12px; }
    .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎵 Spotify Unwrapped - ${tabLabels[activeTab][locale]}</h1>
    <p class="subtitle">${locale === "en" ? "Generated" : "Generert"} ${date}</p>
  </div>
  <img class="chart-img" src="${imgData}" />
  <div class="footer">
    <p>${locale === "en" ? "Generated from" : "Generert frå"} <b>Spotify Unwrapped</b> · banjohans.github.io/Spotify-Unwrapped</p>
  </div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
      } else {
        // Popup blocked - fallback to download
        const link = document.createElement("a");
        link.download = `spotify-chart-${activeTab}-${Date.now()}.png`;
        link.href = imgData;
        link.click();
      }
    } catch (err) {
      console.error("Failed to export chart:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(locale === "en" 
        ? `Failed to export chart: ${errorMsg}` 
        : `Kunne ikkje eksportere graf: ${errorMsg}`);
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

  // Active/Passive pie data
  const activePassiveData = useMemo(() => {
    const activeLabel = locale === "en" ? "Active listening" : "Aktiv lytting";
    const passiveLabel =
      locale === "en" ? "Passive listening" : "Passiv lytting";
    return [
      {
        name: activeLabel,
        value: result.activeShare * 100,
        color: CHART_COLORS.primary,
      },
      {
        name: passiveLabel,
        value: result.passiveShare * 100,
        color: CHART_COLORS.passive,
      },
    ];
  }, [result, locale]);

  // Labels by locale
  const labels = useMemo(
    () => ({
      chartsTitle: locale === "en" ? "Listening Charts" : "Lyttediagram",
      daily: locale === "en" ? "Daily" : "Dagleg",
      hourly: locale === "en" ? "By hour" : "Per time",
      weekday: locale === "en" ? "Weekday" : "Vekedag",
      monthly: locale === "en" ? "Monthly" : "Månadleg",
      activePassive: locale === "en" ? "Active/Passive" : "Aktiv/Passiv",
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
    return (
      <div className="chartTooltip">
        <p className="chartTooltipLabel">{label}</p>
        {payload.map((entry: any, idx: number) => {
          const dataKey = entry.dataKey || "";
          const isMinutes = dataKey === "msPlayed" || dataKey.includes("Ms");
          const isStreams = dataKey === "streams" || dataKey === "avgStreams";

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

  // Format daily X-axis - show abbreviated month name only
  const formatDailyXAxis = (dateStr: string): string => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = monthNames[d.getMonth()];
    // Show month name on 1st of each month
    if (day === 1) {
      return month;
    }
    return `${day}.`;
  };

  // Format monthly X-axis - show year on quarterly months (Jan, Apr, Jul, Oct)
  const formatMonthlyXAxis = (monthStr: string): string => {
    const parts = monthStr.split("-");
    if (parts.length < 2) return monthStr;
    const monthIdx = parseInt(parts[1], 10) - 1;
    // Show year on quarterly months: Jan (0), Apr (3), Jul (6), Oct (9)
    if (monthIdx === 0 || monthIdx === 3 || monthIdx === 6 || monthIdx === 9) {
      return `${monthNames[monthIdx]} '${parts[0].slice(2)}`;
    }
    return monthNames[monthIdx];
  };

  if (dailyData.length === 0) {
    return (
      <div className="chartsSection">
        <h3 className="chartsSectionTitle">{labels.chartsTitle}</h3>
        <p className="subtle">{labels.noData}</p>
      </div>
    );
  }

  // Calculate appropriate intervals based on data
  const dailyInterval =
    dailyData.length > 60
      ? Math.floor(dailyData.length / 12)
      : dailyData.length > 30
        ? Math.floor(dailyData.length / 8)
        : dailyData.length > 14
          ? 2
          : 0;
  const monthlyInterval =
    monthlyData.length > 24
      ? Math.floor(monthlyData.length / 12)
      : monthlyData.length > 12
        ? 2
        : 0;

  return (
    <div className="chartsSection">
      <div className="chartsSectionHeader">
        <h3 className="chartsSectionTitle">{labels.chartsTitle}</h3>
        <div className="chartsHeaderRight">
          <button
            className="btnExportChart"
            onClick={exportChartPDF}
            title={locale === "en" ? "Export as PDF" : "Eksporter som PDF"}
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
            PDF
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
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={dailyData} onClick={handleChartClick}>
                <defs>
                  <linearGradient
                    id="colorGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={CHART_COLORS.primary}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={CHART_COLORS.primary}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_COLORS.grid}
                />
                <XAxis
                  dataKey="date"
                  stroke={CHART_COLORS.text}
                  tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                  tickFormatter={formatDailyXAxis}
                  interval={dailyInterval}
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
                {dailyMetric === "streams" && (
                  <Area
                    type="monotone"
                    dataKey="streams"
                    name={labels.streams}
                    stroke={CHART_COLORS.primary}
                    fill="url(#colorGradient)"
                    activeDot={{
                      r: 6,
                      fill: CHART_COLORS.primary,
                      stroke: "#fff",
                      strokeWidth: 2,
                      cursor: "pointer",
                      onClick: handleDotClick,
                    }}
                  />
                )}
                {dailyMetric === "minutes" && (
                  <Area
                    type="monotone"
                    dataKey="msPlayed"
                    name={labels.listeningTime}
                    stroke={CHART_COLORS.primary}
                    fill="url(#colorGradient)"
                    activeDot={{
                      r: 6,
                      fill: CHART_COLORS.primary,
                      stroke: "#fff",
                      strokeWidth: 2,
                      cursor: "pointer",
                      onClick: handleDotClick,
                    }}
                  />
                )}
                {dailyMetric === "artists" && (
                  <Area
                    type="monotone"
                    dataKey="uniqueArtists"
                    name={labels.uniqueArtists}
                    stroke={CHART_COLORS.secondary}
                    fill="url(#colorGradient)"
                    activeDot={{
                      r: 6,
                      fill: CHART_COLORS.secondary,
                      stroke: "#fff",
                      strokeWidth: 2,
                      cursor: "pointer",
                      onClick: handleDotClick,
                    }}
                  />
                )}
                <Brush
                  dataKey="date"
                  height={25}
                  stroke={CHART_COLORS.primary}
                  fill="rgba(29, 185, 84, 0.1)"
                  tickFormatter={formatDailyXAxis}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Hourly chart */}
        {activeTab === "hourly" && (
          <div className="chartContainer">
            <ResponsiveContainer width="100%" height={300}>
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
            <ResponsiveContainer width="100%" height={300}>
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
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={monthlyData}>
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
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="uniqueArtists"
                  name={labels.uniqueArtists}
                  stroke={CHART_COLORS.secondary}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.secondary, r: 3 }}
                />
                <Brush
                  dataKey="month"
                  height={25}
                  stroke={CHART_COLORS.primary}
                  fill="rgba(29, 185, 84, 0.1)"
                  tickFormatter={formatMonthlyXAxis}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Active/Passive pie chart */}
        {activeTab === "activePassive" && (
          <div className="chartContainer pieChartContainer">
            <ResponsiveContainer width="100%" height={300}>
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
                ? "Active = you played, navigated, or continued an album/playlist. Passive = Spotify chose for you (autoplay after album ends, recommendations, app startup)."
                : "Aktiv = du spelte, navigerte, eller fortsette eit album/spilleliste. Passiv = Spotify valde for deg (autoplay etter albumet er ferdig, anbefalingar, app-oppstart)."}
            </p>
          </div>
        )}
      </div>

      {/* Drill-down Modal */}
      {drillDownData && (
        <div className="drillDownOverlay" onClick={() => setDrillDownData(null)}>
          <div className="drillDownModal" onClick={(e) => e.stopPropagation()}>
            <button className="drillDownClose" onClick={() => setDrillDownData(null)}>×</button>
            <h3 className="drillDownTitle">{drillDownData.label}</h3>
            
            <div className="drillDownStats">
              <div className="drillDownStat">
                <span className="drillDownStatValue">{formatNum(drillDownData.streams, locale)}</span>
                <span className="drillDownStatLabel">{locale === "en" ? "Streams" : "Strøymingar"}</span>
              </div>
              <div className="drillDownStat">
                <span className="drillDownStatValue">{formatNum(drillDownData.minutes, locale)}</span>
                <span className="drillDownStatLabel">{locale === "en" ? "Minutes" : "Minutt"}</span>
              </div>
              <div className="drillDownStat">
                <span className="drillDownStatValue">{drillDownData.artists}</span>
                <span className="drillDownStatLabel">{locale === "en" ? "Artists" : "Artistar"}</span>
              </div>
            </div>

            <div className="drillDownSections">
              <div className="drillDownSection">
                <h4>{locale === "en" ? "Top Tracks" : "Topp låtar"}</h4>
                <ul className="drillDownList">
                  {drillDownData.topTracks.map((t, i) => (
                    <li key={i} className="drillDownItem">
                      <span className="drillDownRank">{i + 1}</span>
                      <div className="drillDownItemInfo">
                        <span className="drillDownTrack">{t.track}</span>
                        <span className="drillDownArtist">{t.artist}</span>
                      </div>
                      <span className="drillDownPlays">{t.plays}×</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="drillDownSection">
                <h4>{locale === "en" ? "Top Artists" : "Topp artistar"}</h4>
                <ul className="drillDownList">
                  {drillDownData.topArtists.map((a, i) => (
                    <li key={i} className="drillDownItem">
                      <span className="drillDownRank">{i + 1}</span>
                      <div className="drillDownItemInfo">
                        <span className="drillDownTrack">{a.artist}</span>
                        <span className="drillDownArtist">{Math.round(a.ms / 60000)} min</span>
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
