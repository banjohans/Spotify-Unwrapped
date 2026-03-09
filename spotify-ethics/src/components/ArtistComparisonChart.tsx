// src/components/ArtistComparisonChart.tsx

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import html2canvas from "html2canvas";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import type { Locale } from "../lib/i18n";
import type { SpotifyStreamRow, ArtistAgg } from "../lib/analyze";
import { formatNum } from "../lib/i18n";

type DateFilterMode = "all" | "year" | "custom";

interface ArtistComparisonChartProps {
  allRows: SpotifyStreamRow[]; // ALL rows (unfiltered by date)
  artists: ArtistAgg[];
  locale: Locale;
  minMsPlayed: number;
  availableYears: number[];
  // Shared time filter props
  dateFilterMode: DateFilterMode;
  dateFilterYear: number | null;
  onDateFilterChange: (mode: DateFilterMode, year?: number) => void;
}

// Rich color palette for comparing artists - distinct colors first
const ARTIST_COLORS = [
  "#1DB954", // Spotify green
  "#60a5fa", // Blue
  "#f472b6", // Pink
  "#fbbf24", // Yellow
  "#a78bfa", // Purple
  "#f87171", // Red
  "#34d399", // Teal
  "#fb923c", // Orange
  "#e879f9", // Fuchsia
  "#94a3b8", // Slate
];

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

type ArtistSortOption = "plays-desc" | "plays-asc" | "alpha-asc" | "alpha-desc";

export default function ArtistComparisonChart({
  allRows,
  artists,
  locale,
  minMsPlayed,
  availableYears,
  dateFilterMode,
  dateFilterYear,
  onDateFilterChange,
}: ArtistComparisonChartProps) {
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomRange, setZoomRange] = useState<[number, number]>([0, 100]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [chartMetric, setChartMetric] = useState<"streams" | "minutes">(
    "streams",
  );
  const [artistSort, setArtistSort] = useState<ArtistSortOption>("plays-desc");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Responsive chart height based on orientation
  const [chartHeight, setChartHeight] = useState(450);
  useEffect(() => {
    const updateHeight = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const isMobile = window.innerHeight < 600;
      if (isLandscape && isMobile) {
        setChartHeight(280);
      } else if (isMobile) {
        setChartHeight(350);
      } else {
        setChartHeight(450);
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

  // Labels
  const labels = useMemo(
    () => ({
      title: locale === "en" ? "Artist Comparison" : "Samanlikning av artistar",
      subtitle:
        locale === "en"
          ? "Compare listening patterns across your favorite artists over time"
          : "Samanlikn ditt lyttemønster til dine favorittartistar over tid",
      period: locale === "en" ? "Period:" : "Periode:",
      allTime: locale === "en" ? "All time" : "All tid",
      selectArtists:
        locale === "en"
          ? "Select artists to compare..."
          : "Vel artistar å samanlikne...",
      searchPlaceholder:
        locale === "en" ? "Search artists..." : "Søk etter artistar...",
      noArtistsSelected:
        locale === "en"
          ? "Select artists from the dropdown above to see their listening trends over time."
          : "Vel artistar frå nedtrekkslista over for å sjå lyttetrendane deira over tid.",
      streams: locale === "en" ? "Streams" : "Strøymingar",
      minutes: locale === "en" ? "Minutes" : "Minutt",
      clearAll: locale === "en" ? "Clear all" : "Tøm alle",
      maxSelected: locale === "en" ? "Max 10 artists" : "Maks 10 artistar",
      sortBy: locale === "en" ? "Sort by:" : "Sorter etter:",
      mostPlayed: locale === "en" ? "Most played" : "Mest spelt",
      leastPlayed: locale === "en" ? "Least played" : "Minst spelt",
      alphaAsc: locale === "en" ? "A → Z" : "A → Å",
      alphaDesc: locale === "en" ? "Z → A" : "Å → A",
    }),
    [locale],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Export chart as PNG
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
              // Replace problematic background colors
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

      // Direct PNG download
      const link = document.createElement("a");
      link.download = `spotify-artist-comparison-${Date.now()}.png`;
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
  }, [locale]);

  // Filter rows by selected time period
  const filteredRows = useMemo(() => {
    if (dateFilterMode === "all") return allRows;
    if (dateFilterMode === "year" && dateFilterYear) {
      return allRows.filter((r) => {
        if (!r.ts) return false;
        const d = new Date(r.ts);
        return !isNaN(d.getTime()) && d.getFullYear() === dateFilterYear;
      });
    }
    return allRows;
  }, [allRows, dateFilterMode, dateFilterYear]);

  // Filtered artists for dropdown (based on search and sort)
  const filteredDropdownArtists = useMemo(() => {
    let list = [...artists];

    // Apply sort
    switch (artistSort) {
      case "plays-desc":
        list.sort((a, b) => b.plays - a.plays);
        break;
      case "plays-asc":
        list.sort((a, b) => a.plays - b.plays);
        break;
      case "alpha-asc":
        list.sort((a, b) => a.artist.localeCompare(b.artist, locale));
        break;
      case "alpha-desc":
        list.sort((a, b) => b.artist.localeCompare(a.artist, locale));
        break;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => a.artist.toLowerCase().includes(q));
    }

    return list;
  }, [artists, artistSort, searchQuery, locale]);

  // Aggregate data by month for selected artists
  const chartData = useMemo(() => {
    if (selectedArtists.length === 0) return [];

    const selectedSet = new Set(selectedArtists);
    const byMonth = new Map<
      string,
      Record<string, { streams: number; msPlayed: number }>
    >();

    for (const row of filteredRows) {
      const ms =
        typeof row.ms_played === "number"
          ? row.ms_played
          : typeof row.msPlayed === "number"
            ? row.msPlayed
            : 0;
      if (ms < minMsPlayed) continue;

      const artist = row.master_metadata_album_artist_name?.trim();
      if (!artist || !selectedSet.has(artist)) continue;

      const ts = row.ts;
      if (!ts) continue;
      const date = new Date(ts);
      if (isNaN(date.getTime())) continue;

      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM

      if (!byMonth.has(monthKey)) {
        byMonth.set(monthKey, {});
      }
      const monthData = byMonth.get(monthKey)!;

      if (!monthData[artist]) {
        monthData[artist] = { streams: 0, msPlayed: 0 };
      }
      monthData[artist].streams++;
      monthData[artist].msPlayed += ms;
    }

    // Convert to array format for Recharts
    return Array.from(byMonth.entries())
      .map(([month, artistData]) => {
        const dataPoint: Record<string, any> = { month };
        for (const artist of selectedArtists) {
          const data = artistData[artist];
          if (chartMetric === "streams") {
            dataPoint[artist] = data?.streams || 0;
          } else {
            dataPoint[artist] = Math.round((data?.msPlayed || 0) / 60000); // Convert to minutes
          }
        }
        return dataPoint;
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredRows, selectedArtists, minMsPlayed, chartMetric]);

  // Apply zoom range to chart data
  const zoomedChartData = useMemo(() => {
    if (chartData.length === 0) return chartData;
    if (zoomRange[0] === 0 && zoomRange[1] === 100) return chartData;
    const startIdx = Math.floor((zoomRange[0] / 100) * chartData.length);
    const endIdx = Math.ceil((zoomRange[1] / 100) * chartData.length);
    return chartData.slice(startIdx, endIdx);
  }, [chartData, zoomRange]);

  // Handle time filter change - updates global state
  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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

  // Toggle artist selection
  const toggleArtist = (artist: string) => {
    setSelectedArtists((prev) => {
      if (prev.includes(artist)) {
        return prev.filter((a) => a !== artist);
      }
      if (prev.length >= 10) return prev; // Max 10
      return [...prev, artist];
    });
  };

  // Remove artist
  const removeArtist = (artist: string) => {
    setSelectedArtists((prev) => prev.filter((a) => a !== artist));
  };

  // Format X-axis - show year prominently on January
  const formatXAxis = (monthStr: string): string => {
    const [year, monthNum] = monthStr.split("-");
    const monthIdx = parseInt(monthNum, 10) - 1;
    // Show full year on January
    if (monthIdx === 0) {
      return year;
    }
    return monthNames[monthIdx];
  };

  // Get year boundaries for ReferenceLine
  const yearBoundaries = useMemo(() => {
    const boundaries: string[] = [];
    for (const item of zoomedChartData) {
      if (item.month.endsWith("-01")) {
        boundaries.push(item.month);
      }
    }
    return boundaries;
  }, [zoomedChartData]);

  // Calculate custom tick positions for X-axis
  const monthlyTicks = useMemo(() => {
    if (zoomedChartData.length === 0) return [];

    // Extract years from data
    const years = new Set<number>();
    zoomedChartData.forEach((item) => {
      years.add(parseInt(item.month.slice(0, 4), 10));
    });
    const spanYears = years.size;

    if (spanYears > 2) {
      // Multi-year: show only January of each year
      return zoomedChartData
        .filter((item) => item.month.endsWith("-01"))
        .map((item) => item.month);
    } else if (spanYears >= 1 && zoomedChartData.length > 6) {
      // 1-2 years with many months: show every 2-3 months
      const tickIndices: number[] = [];
      const interval = zoomedChartData.length > 12 ? 3 : 2;
      for (let i = 0; i < zoomedChartData.length; i += interval) {
        tickIndices.push(i);
      }
      // Always include last point
      if (!tickIndices.includes(zoomedChartData.length - 1)) {
        tickIndices.push(zoomedChartData.length - 1);
      }
      return tickIndices.map((i) => zoomedChartData[i].month);
    } else {
      // Short range: show all months
      return zoomedChartData.map((item) => item.month);
    }
  }, [zoomedChartData]);

  // Format minutes for display
  const formatMinutes = (mins: number): string => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return locale === "en" ? `${h}h ${m}m` : `${h}t ${m}m`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="chartTooltip artistCompareTooltip">
        <p className="chartTooltipLabel">{formatXAxis(label)}</p>
        {payload
          .filter((entry: any) => entry.value > 0)
          .sort((a: any, b: any) => b.value - a.value)
          .map((entry: any, idx: number) => (
            <p key={idx} style={{ color: entry.color }}>
              {entry.dataKey}:{" "}
              {chartMetric === "minutes"
                ? formatMinutes(entry.value)
                : `${formatNum(entry.value, locale)} ${locale === "en" ? "streams" : "strøymingar"}`}
            </p>
          ))}
      </div>
    );
  };

  return (
    <section className="card artistComparisonSection">
      <div className="artistComparisonHeader">
        <div className="artistComparisonTitleArea">
          <h2 className="artistComparisonTitle">{labels.title}</h2>
          <p className="artistComparisonSubtitle">{labels.subtitle}</p>
        </div>
        <button
          className="btnExportChart"
          onClick={exportChartPNG}
          disabled={selectedArtists.length === 0}
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
      </div>

      <div className="artistComparisonControls">
        {/* Time filter */}
        <div className="artistComparisonFilter">
          <label>{labels.period}</label>
          <select
            className="artistCompareSelect"
            value={
              dateFilterMode === "year" && dateFilterYear
                ? dateFilterYear.toString()
                : "all"
            }
            onChange={handleTimeChange}
          >
            <option value="all">{labels.allTime}</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Metric toggle */}
        <div className="artistComparisonFilter">
          <button
            className={`metricBtn ${chartMetric === "streams" ? "active" : ""}`}
            onClick={() => setChartMetric("streams")}
          >
            {labels.streams}
          </button>
          <button
            className={`metricBtn ${chartMetric === "minutes" ? "active" : ""}`}
            onClick={() => setChartMetric("minutes")}
          >
            {labels.minutes}
          </button>
        </div>

        {/* Artist search dropdown */}
        <div
          className="artistComparisonFilter artistDropdownContainer artistDropdownLarge"
          ref={dropdownRef}
        >
          <div
            className="artistDropdownTrigger"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span className="artistDropdownLabel">
              {selectedArtists.length === 0
                ? labels.selectArtists
                : `${selectedArtists.length} ${locale === "en" ? "selected" : "valde"}`}
            </span>
            <span className="artistDropdownArrow">
              {isDropdownOpen ? "▲" : "▼"}
            </span>
          </div>

          {isDropdownOpen && (
            <div className="artistDropdownMenu">
              <input
                type="text"
                className="artistDropdownSearch"
                placeholder={labels.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <div className="artistSortOptions">
                <span className="artistSortLabel">{labels.sortBy}</span>
                <button
                  className={`artistSortBtn ${artistSort === "plays-desc" ? "active" : ""}`}
                  onClick={() => setArtistSort("plays-desc")}
                  title={labels.mostPlayed}
                >
                  {labels.mostPlayed}
                </button>
                <button
                  className={`artistSortBtn ${artistSort === "plays-asc" ? "active" : ""}`}
                  onClick={() => setArtistSort("plays-asc")}
                  title={labels.leastPlayed}
                >
                  {labels.leastPlayed}
                </button>
                <button
                  className={`artistSortBtn ${artistSort === "alpha-asc" ? "active" : ""}`}
                  onClick={() => setArtistSort("alpha-asc")}
                  title={labels.alphaAsc}
                >
                  {labels.alphaAsc}
                </button>
                <button
                  className={`artistSortBtn ${artistSort === "alpha-desc" ? "active" : ""}`}
                  onClick={() => setArtistSort("alpha-desc")}
                  title={labels.alphaDesc}
                >
                  {labels.alphaDesc}
                </button>
              </div>
              <div className="artistDropdownList">
                {filteredDropdownArtists.map((artist) => {
                  const isSelected = selectedArtists.includes(artist.artist);
                  const colorIdx = selectedArtists.indexOf(artist.artist);
                  return (
                    <div
                      key={artist.artist}
                      className={`artistDropdownItem ${isSelected ? "selected" : ""}`}
                      onClick={() => toggleArtist(artist.artist)}
                    >
                      <span
                        className="artistDropdownColor"
                        style={{
                          backgroundColor: isSelected
                            ? ARTIST_COLORS[colorIdx % ARTIST_COLORS.length]
                            : "transparent",
                          borderColor: isSelected
                            ? ARTIST_COLORS[colorIdx % ARTIST_COLORS.length]
                            : "rgba(255,255,255,0.3)",
                        }}
                      />
                      <span className="artistDropdownName">
                        {artist.artist}
                      </span>
                      <span className="artistDropdownPlays">
                        {formatNum(artist.plays, locale)}{" "}
                        {locale === "en" ? "plays" : "avspelingar"}
                      </span>
                    </div>
                  );
                })}
              </div>
              {selectedArtists.length >= 10 && (
                <div className="artistDropdownMax">{labels.maxSelected}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected artists chips */}
      {selectedArtists.length > 0 && (
        <div className="artistChipsContainer">
          {selectedArtists.map((artist, idx) => (
            <span
              key={artist}
              className="artistChip"
              style={{
                backgroundColor: ARTIST_COLORS[idx % ARTIST_COLORS.length],
              }}
            >
              {artist}
              <button
                className="artistChipRemove"
                onClick={() => removeArtist(artist)}
              >
                ×
              </button>
            </span>
          ))}
          {selectedArtists.length > 1 && (
            <button
              className="artistChipClearAll"
              onClick={() => setSelectedArtists([])}
            >
              {labels.clearAll}
            </button>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="artistComparisonChartContainer" ref={chartContainerRef}>
        {selectedArtists.length === 0 ? (
          <div className="artistComparisonEmpty">
            <div className="artistComparisonEmptyIcon">📊</div>
            <p>{labels.noArtistsSelected}</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="artistComparisonEmpty">
            <p>
              {locale === "en"
                ? "No data for selected period"
                : "Ingen data for vald periode"}
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <AreaChart data={zoomedChartData}>
                <defs>
                  {selectedArtists.map((artist, idx) => (
                    <linearGradient
                      key={artist}
                      id={`gradient-${idx}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={ARTIST_COLORS[idx % ARTIST_COLORS.length]}
                        stopOpacity={0.6}
                      />
                      <stop
                        offset="95%"
                        stopColor={ARTIST_COLORS[idx % ARTIST_COLORS.length]}
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis
                  dataKey="month"
                  stroke="rgba(255,255,255,0.7)"
                  tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
                  tickFormatter={formatXAxis}
                  ticks={monthlyTicks}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.7)"
                  tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
                  label={{
                    value:
                      chartMetric === "streams" ? labels.streams : labels.minutes,
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "rgba(255,255,255,0.7)", fontSize: 11 },
                    offset: 0,
                  }}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  wrapperStyle={{ paddingBottom: "15px" }}
                  formatter={(value) => (
                    <span style={{ color: "rgba(255,255,255,0.85)" }}>
                      {value}
                    </span>
                  )}
                />
                {selectedArtists.map((artist, idx) => (
                  <Area
                    key={artist}
                    type="monotone"
                    dataKey={artist}
                    name={artist}
                    stroke={ARTIST_COLORS[idx % ARTIST_COLORS.length]}
                    fill={`url(#gradient-${idx})`}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    activeDot={{
                      r: 4,
                      fill: ARTIST_COLORS[idx % ARTIST_COLORS.length],
                    }}
                  />
                ))}
                {/* Year boundary lines */}
                {yearBoundaries.map((month) => (
                  <ReferenceLine
                    key={month}
                    x={month}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
            {/* Range slider for zooming */}
            {chartData.length > 12 && (
              <div className="chartRangeSlider">
                <span className="rangeLabel">
                  {chartData.length > 0 &&
                    (() => {
                      const [year, month] = chartData[0].month.split("-");
                      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
                      return d.toLocaleDateString(
                        locale === "en" ? "en-US" : "nb-NO",
                        { month: "short", year: "2-digit" }
                      );
                    })()}
                </span>
                <div className="rangeSliderTrack">
                  <div
                    className="rangeSliderFill"
                    style={{
                      left: `${zoomRange[0]}%`,
                      width: `${zoomRange[1] - zoomRange[0]}%`,
                    }}
                  />
                  {/* Handle position labels */}
                  {chartData.length > 0 && (
                    <>
                      <span
                        className="rangeHandleLabel rangeHandleLabelStart"
                        style={{ left: `${zoomRange[0]}%` }}
                      >
                        {(() => {
                          const idx = Math.min(
                            Math.floor((zoomRange[0] / 100) * chartData.length),
                            chartData.length - 1
                          );
                          const [year, month] = chartData[idx].month.split("-");
                          const d = new Date(parseInt(year), parseInt(month) - 1, 1);
                          return d.toLocaleDateString(
                            locale === "en" ? "en-US" : "nb-NO",
                            { month: "short", year: "2-digit" }
                          );
                        })()}
                      </span>
                      <span
                        className="rangeHandleLabel rangeHandleLabelEnd"
                        style={{ left: `${zoomRange[1]}%` }}
                      >
                        {(() => {
                          const idx = Math.min(
                            Math.ceil((zoomRange[1] / 100) * chartData.length) - 1,
                            chartData.length - 1
                          );
                          const [year, month] = chartData[idx].month.split("-");
                          const d = new Date(parseInt(year), parseInt(month) - 1, 1);
                          return d.toLocaleDateString(
                            locale === "en" ? "en-US" : "nb-NO",
                            { month: "short", year: "2-digit" }
                          );
                        })()}
                      </span>
                    </>
                  )}
                  <input
                    key={`artist-start-${zoomRange[0]}`}
                    type="range"
                    min="0"
                    max="100"
                    defaultValue={zoomRange[0]}
                    className="rangeSliderInput rangeSliderStart"
                    onMouseUp={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      if (val < zoomRange[1] - 5) {
                        setZoomRange([val, zoomRange[1]]);
                      }
                    }}
                    onTouchEnd={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      if (val < zoomRange[1] - 5) {
                        setZoomRange([val, zoomRange[1]]);
                      }
                    }}
                  />
                  <input
                    key={`artist-end-${zoomRange[1]}`}
                    type="range"
                    min="0"
                    max="100"
                    defaultValue={zoomRange[1]}
                    className="rangeSliderInput rangeSliderEnd"
                    onMouseUp={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      if (val > zoomRange[0] + 5) {
                        setZoomRange([zoomRange[0], val]);
                      }
                    }}
                    onTouchEnd={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      if (val > zoomRange[0] + 5) {
                        setZoomRange([zoomRange[0], val]);
                      }
                    }}
                  />
                </div>
                <span className="rangeLabel">
                  {chartData.length > 0 &&
                    (() => {
                      const [year, month] =
                        chartData[chartData.length - 1].month.split("-");
                      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
                      return d.toLocaleDateString(
                        locale === "en" ? "en-US" : "nb-NO",
                        { month: "short", year: "2-digit" }
                      );
                    })()}
                </span>
                {(zoomRange[0] > 0 || zoomRange[1] < 100) && (
                  <button
                    className="rangeResetBtn"
                    onClick={() => setZoomRange([0, 100])}
                    title={locale === "en" ? "Reset zoom" : "Nullstill zoom"}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
