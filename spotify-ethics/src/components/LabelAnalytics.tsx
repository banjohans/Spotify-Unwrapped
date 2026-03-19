// src/components/LabelAnalytics.tsx
// Component for displaying record label ownership analysis

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Locale } from "../lib/i18n";
import type { SpotifyStreamRow } from "../lib/analyze";
import { classifyStart } from "../lib/analyze";
import { formatNum } from "../lib/i18n";
import {
  extractSpotifyTrackId,
  batchLookupLabels,
  getCachedLabelStats,
  clearLabelCache,
  estimateLookupTime,
  type LabelStats,
  type LookupProgressCallback,
  type TrackLabelInfo,
} from "../lib/labelLookup";

type DateFilterMode = "all" | "year" | "custom";

interface LabelAnalyticsProps {
  allRows: SpotifyStreamRow[];
  minMsPlayed: number;
  locale: Locale;
  availableYears: number[];
  dateFilterMode: DateFilterMode;
  dateFilterYear: number | null;
  onDateFilterChange: (mode: DateFilterMode, year?: number) => void;
  excludedArtists?: Set<string>;
}

const COLORS = {
  universal: "#FF6B6B", // Red
  sony: "#4ECDC4", // Teal
  warner: "#45B7D1", // Blue
  independent: "#96CEB4", // Green
  unknown: "#6b7280", // Gray
  active: "#1DB954", // Spotify green
  assisted: "#ee5a24", // Orange
};

const PARENT_COLORS: Record<string, string> = {
  "Universal Music Group": COLORS.universal,
  "Sony Music Entertainment": COLORS.sony,
  "Warner Music Group": COLORS.warner,
  Independent: COLORS.independent,
  "Independent / Other": COLORS.independent,
};

export function LabelAnalytics({
  allRows,
  minMsPlayed,
  locale,
  availableYears,
  dateFilterMode,
  dateFilterYear,
  onDateFilterChange,
  excludedArtists,
}: LabelAnalyticsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{
    completed: number;
    total: number;
    phase: "lookup" | "estimation";
    currentTrack: string;
    estimatedSecondsRemaining: number;
    coveragePercent: number;
  } | null>(null);
  const [labelStats, setLabelStats] = useState<LabelStats | null>(null);
  const [cachedInfo, setCachedInfo] = useState<{
    cached: number;
    uncached: number;
  } | null>(null);
  const [showAllLabels, setShowAllLabels] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [trackLabels, setTrackLabels] = useState<Map<string, TrackLabelInfo>>(
    new Map(),
  );
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Filter rows based on date filter and excluded artists
  const rows = useMemo(() => {
    let filtered = allRows;
    if (dateFilterMode !== "all" && dateFilterYear) {
      filtered = filtered.filter((r) => {
        if (!r.ts) return false;
        const d = new Date(r.ts);
        return d.getFullYear() === dateFilterYear;
      });
    }
    if (excludedArtists && excludedArtists.size > 0) {
      filtered = filtered.filter((r) => {
        const artist = r.master_metadata_album_artist_name;
        return !artist || !excludedArtists.has(artist);
      });
    }
    return filtered;
  }, [allRows, dateFilterMode, dateFilterYear, excludedArtists]);

  // Handle time filter change
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

  // Prepare track data for lookup
  const tracksForLookup = useMemo(() => {
    const trackMap = new Map<
      string,
      {
        trackId: string;
        trackName: string;
        artist: string;
        msPlayed: number;
        plays: number;
        activePlays: number;
        assistedPlays: number;
      }
    >();

    for (const row of rows) {
      if ((row.ms_played ?? 0) < minMsPlayed) continue;
      if (!row.spotify_track_uri) continue;

      const trackId = extractSpotifyTrackId(row.spotify_track_uri);
      if (!trackId) continue;

      const trackName = row.master_metadata_track_name || "Unknown";
      const artist = row.master_metadata_album_artist_name || "Unknown";
      const msPlayed = row.ms_played ?? 0;
      const classification = classifyStart(row.reason_start);
      const isAssisted = classification === "passive";

      const key = trackId;
      if (!trackMap.has(key)) {
        trackMap.set(key, {
          trackId,
          trackName,
          artist,
          msPlayed: 0,
          plays: 0,
          activePlays: 0,
          assistedPlays: 0,
        });
      }

      const entry = trackMap.get(key)!;
      entry.msPlayed += msPlayed;
      entry.plays++;
      if (isAssisted) {
        entry.assistedPlays++;
      } else {
        entry.activePlays++;
      }
    }

    return Array.from(trackMap.values()).map((t) => ({
      ...t,
      isAssisted: t.assistedPlays > t.activePlays,
    }));
  }, [rows, minMsPlayed]);

  // Check cache status on mount
  useEffect(() => {
    if (tracksForLookup.length > 0) {
      const {
        labelStats: cached,
        trackLabels: cachedTrackLabels,
        cachedCount,
        uncachedCount,
      } = getCachedLabelStats(tracksForLookup);
      setCachedInfo({ cached: cachedCount, uncached: uncachedCount });
      if (cachedCount > 0) {
        setLabelStats(cached);
        setTrackLabels(cachedTrackLabels);
      }
    }
  }, [tracksForLookup]);

  const handleStartLookup = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setProgress(null);
    abortControllerRef.current = new AbortController();

    const onProgress: LookupProgressCallback = (p) => {
      setProgress(p);
    };

    try {
      const { labelStats: stats, trackLabels: newTrackLabels } =
        await batchLookupLabels(
          tracksForLookup,
          onProgress,
          abortControllerRef.current.signal,
        );
      setLabelStats(stats);
      setTrackLabels(newTrackLabels);
      setCachedInfo({ cached: tracksForLookup.length, uncached: 0 });
    } catch (e) {
      console.error("Label lookup failed:", e);
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  }, [tracksForLookup, isLoading]);

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setProgress(null);
  }, []);

  const handleClearCache = useCallback(() => {
    clearLabelCache();
    setLabelStats(null);
    setCachedInfo({ cached: 0, uncached: tracksForLookup.length });
  }, [tracksForLookup.length]);

  // Export chart as PNG
  const exportChartPNG = useCallback(async () => {
    if (!chartContainerRef.current) {
      console.error("Chart container not found");
      return;
    }

    try {
      const container = chartContainerRef.current;
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(container, {
        backgroundColor: "#121212",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement("style");
          style.textContent = `
            * {
              --accent: #1DB954 !important;
              --text: #ffffff !important;
              --muted: #999999 !important;
            }
          `;
          clonedDoc.head.appendChild(style);

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

      const imgData = canvas.toDataURL("image/png");

      // Direct PNG download
      const link = document.createElement("a");
      link.download = `spotify-label-analysis-${Date.now()}.png`;
      link.href = imgData;
      link.click();
    } catch (err) {
      console.error("Failed to export chart:", err);
    }
  }, []);

  // Labels for display
  const labels = useMemo(
    () => ({
      title:
        locale === "en" ? "Record Label Analysis" : "Analyse av plateselskap",
      description:
        locale === "en"
          ? "See which record labels and parent companies earn from your listening"
          : "Sjå kva plateselskap og moderselskap som tener på lyttinga di",
      startLookup:
        locale === "en"
          ? "Start Label Lookup"
          : "Start oppslag av plateselskap",
      loading: locale === "en" ? "Looking up labels..." : "Slår opp selskap...",
      cancel: locale === "en" ? "Cancel" : "Avbryt",
      clearCache: locale === "en" ? "Clear cache" : "Tøm hurtigbuffer",
      cached: locale === "en" ? "cached" : "i hurtigbuffer",
      remaining: locale === "en" ? "remaining" : "att",
      estimatedTime: locale === "en" ? "Est. time:" : "Est. tid:",
      coverage:
        locale === "en" ? "Lookup coverage" : "Dekningsgrad for oppslag",
      majorLabels:
        locale === "en" ? "Major Label Groups" : "Store selskapsgrupper",
      topLabels: locale === "en" ? "Top Labels" : "Topp plateselskap",
      plays: locale === "en" ? "plays" : "avspelingar",
      streams: locale === "en" ? "streams" : "strøymingar",
      active: locale === "en" ? "Active" : "Aktiv",
      assisted: locale === "en" ? "Assisted" : "Assistert",
      revenue: locale === "en" ? "Est. revenue" : "Est. inntekt",
      tracks: locale === "en" ? "tracks" : "låtar",
      unknown: locale === "en" ? "Unknown" : "Ukjent",
      showAll: locale === "en" ? "Show all" : "Vis alle",
      showLess: locale === "en" ? "Show less" : "Vis mindre",
      showInfo:
        locale === "en" ? "How does this work?" : "Korleis fungerer dette?",
      hideInfo: locale === "en" ? "Hide info" : "Skjul info",
      infoTitle:
        locale === "en" ? "About Label Analysis" : "Om plateselskapsanalyse",
      infoText:
        locale === "en"
          ? `This analysis identifies which record labels and their parent companies (Universal, Sony, Warner, or independent labels) earn revenue from your listening. We use open music databases (MusicBrainz and Discogs) to look up label information for each track.`
          : `Denne analysen identifiserer kva plateselskap og moderselskap (Universal, Sony, Warner eller uavhengige selskap) som tener på lyttinga di. Vi brukar opne musikkdatabasar (MusicBrainz og Discogs) for å slå opp selskapsinformasjon for kvar låt.`,
      infoOptimization:
        locale === "en"
          ? `To keep lookup times reasonable, we only query the top 500 tracks (by listening time) which typically cover ~75% of your total listening. For remaining tracks, we estimate labels based on other tracks by the same artist.`
          : `For å halde oppslagstida rimeleg, spør vi berre etter dei 500 mest spelte låtane (etter lyttetid) som typisk dekker ~75% av total lytting. For resterande låtar estimerer vi selskap basert på andre låtar av same artist.`,
      disclaimer:
        locale === "en"
          ? `⚠️ Disclaimer: Label ownership data may be incomplete or outdated. Revenue estimates (~0.003-0.005 kr per stream) are approximations. Labels change ownership over time, and some tracks may be incorrectly attributed.`
          : `⚠️ Ansvarsfraskrivelse: Data om selskapseigande kan vera ufullstendig eller utdatert. Inntektsestimat (~0,003-0,005 kr per strøyming) er tilnærmingar. Selskap skiftar eigarskap over tid, og nokre låtar kan vera feil tilskrivne.`,
      note:
        locale === "en"
          ? "Optimized: Only looks up top 500 tracks (~75% of listening time), estimates rest from artist data. Uses MusicBrainz + Discogs APIs."
          : "Optimalisert: Slår berre opp topp 500 låtar (~75% av lyttetid), estimerer resten frå artistdata. Brukar MusicBrainz + Discogs API.",
      labelModal: locale === "en" ? "Tracks on" : "Låtar på",
      close: locale === "en" ? "Close" : "Lukk",
      year: locale === "en" ? "Year" : "År",
      artist: locale === "en" ? "Artist" : "Artist",
      track: locale === "en" ? "Track" : "Låt",
      listenTime: locale === "en" ? "Listen time" : "Lyttetid",
      source: locale === "en" ? "Source" : "Kjelde",
      exportPng: locale === "en" ? "Export PNG" : "Eksporter PNG",
    }),
    [locale],
  );

  // Get tracks for selected label
  const selectedLabelTracks = useMemo(() => {
    if (!selectedLabel) return [];

    return tracksForLookup
      .filter((track) => {
        const info = trackLabels.get(track.trackId);
        return info?.label === selectedLabel;
      })
      .map((track) => {
        const info = trackLabels.get(track.trackId);
        return {
          ...track,
          releaseYear: info?.releaseYear || null,
          lookupSource: info?.lookupSource || "unknown",
          parentLabel: info?.parentLabel || "Unknown",
        };
      })
      .sort((a, b) => b.msPlayed - a.msPlayed);
  }, [selectedLabel, tracksForLookup, trackLabels]);

  // Pie chart data for parent labels
  const parentPieData = useMemo(() => {
    if (!labelStats) return [];

    return labelStats.byParentLabel
      .filter((p) => p.plays > 0)
      .map((p) => ({
        name: p.parentLabel,
        value: p.plays,
        color: PARENT_COLORS[p.parentLabel] || "#888",
        revenue: p.estimatedRevenue,
      }));
  }, [labelStats]);

  // Bar chart data for top labels
  const topLabelsData = useMemo(() => {
    if (!labelStats) return [];

    const data = labelStats.byLabel.slice(0, showAllLabels ? 20 : 10);
    return data.map((l) => ({
      name: l.label.length > 20 ? l.label.slice(0, 18) + "…" : l.label,
      fullName: l.label,
      active: l.activePlays,
      assisted: l.assistedPlays,
      revenue: l.estimatedRevenue,
      parentLabel: l.parentLabel,
    }));
  }, [labelStats, showAllLabels]);

  // Custom tooltip for pie
  const PieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className="chartTooltip">
        <p style={{ color: data.color, fontWeight: 600 }}>{data.name}</p>
        <p>
          {formatNum(data.value, locale)} {labels.streams}
        </p>
        <p>
          {labels.revenue}: {formatNum(data.revenue, locale)} kr
        </p>
      </div>
    );
  };

  // Custom tooltip for bar
  const BarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const entry = payload[0]?.payload;
    return (
      <div className="chartTooltip">
        <p style={{ fontWeight: 600 }}>{entry?.fullName || label}</p>
        <p style={{ color: "#888", fontSize: "0.8rem" }}>
          {entry?.parentLabel}
        </p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {formatNum(p.value, locale)}
          </p>
        ))}
        <p>
          {labels.revenue}: {formatNum(entry?.revenue || 0, locale)} kr
        </p>
      </div>
    );
  };

  if (tracksForLookup.length === 0) {
    return (
      <div className="labelAnalytics">
        <h2>{labels.title}</h2>
        <p className="labelDescription">
          {locale === "en"
            ? "No tracks with Spotify IDs found in your data."
            : "Ingen låtar med Spotify-ID funne i dataene dine."}
        </p>
      </div>
    );
  }

  return (
    <div className="labelAnalytics">
      <div className="labelAnalyticsHeader">
        <div className="labelHeaderTitleSection">
          <h2>{labels.title}</h2>
          <p className="labelDescription">{labels.description}</p>
        </div>
        <div className="labelHeaderControls">
          <div className="labelTimeFilter">
            <label htmlFor="label-time-filter">
              {locale === "en" ? "Period:" : "Periode:"}
            </label>
            <select
              id="label-time-filter"
              className="labelTimeSelect"
              value={
                dateFilterMode === "year" && dateFilterYear
                  ? dateFilterYear.toString()
                  : "all"
              }
              onChange={handleTimeChange}
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

      {/* Info dropdown */}
      <details
        className="labelInfoDropdown"
        open={showInfo}
        onToggle={(e) => setShowInfo((e.target as HTMLDetailsElement).open)}
      >
        <summary>{showInfo ? labels.hideInfo : labels.showInfo}</summary>
        <div className="labelInfoContent">
          <h4>{labels.infoTitle}</h4>
          <p>{labels.infoText}</p>
          <p>{labels.infoOptimization}</p>
          <p className="labelDisclaimer">{labels.disclaimer}</p>
        </div>
      </details>

      {/* Progress / Controls */}
      <div className="labelControls">
        {!isLoading && (
          <>
            <button className="primaryButton" onClick={handleStartLookup}>
              {labels.startLookup}
            </button>
            <span className="timeEstimate">
              ~{estimateLookupTime(tracksForLookup.length).maxMinutes} min
            </span>
            {labelStats && (
              <button className="secondaryButton" onClick={handleClearCache}>
                {labels.clearCache}
              </button>
            )}
          </>
        )}

        {isLoading && progress && (
          <div className="lookupProgress">
            <div className="progressBar">
              <div
                className="progressFill"
                style={{
                  width: `${(progress.completed / progress.total) * 100}%`,
                }}
              />
            </div>
            <div className="progressInfo">
              <span>
                {progress.phase === "lookup"
                  ? locale === "en"
                    ? "Looking up"
                    : "Slår opp"
                  : locale === "en"
                    ? "Estimating"
                    : "Estimerer"}
                : {progress.completed} / {progress.total}
              </span>
              <span>
                {progress.coveragePercent}%{" "}
                {locale === "en" ? "coverage" : "dekn."}
              </span>
            </div>
            <div className="progressInfo">
              <span className="progressTrack">{progress.currentTrack}</span>
              <span>
                ~{Math.ceil(progress.estimatedSecondsRemaining / 60)} min{" "}
                {locale === "en" ? "left" : "att"}
              </span>
            </div>
            <button className="cancelButton" onClick={handleCancel}>
              {labels.cancel}
            </button>
          </div>
        )}

        {cachedInfo && !isLoading && (
          <p className="cacheInfo">
            {cachedInfo.cached} {labels.cached}, {cachedInfo.uncached}{" "}
            {labels.remaining}
          </p>
        )}
      </div>

      <p className="labelNote">{labels.note}</p>

      {/* Results */}
      {labelStats && (
        <div className="labelResults" ref={chartContainerRef}>
          {/* Export button */}
          <div className="labelExportRow">
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
          </div>

          {/* Coverage indicator */}
          <div className="coverageBox">
            <span>{labels.coverage}:</span>
            <strong>{Math.round(labelStats.lookupCoverage * 100)}%</strong>
            <span className="coverageDetail">
              ({labelStats.apiLookupCount} API + {labelStats.estimatedCount}{" "}
              {locale === "en" ? "estimated" : "estimert"},{" "}
              {labelStats.unknownCount} {labels.unknown})
            </span>
          </div>

          {/* Major label pie chart */}
          <div className="labelChartSection">
            <h3>{labels.majorLabels}</h3>
            <div className="labelPieChart">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={parentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) =>
                      name && percent !== undefined
                        ? `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`
                        : ""
                    }
                    labelLine={false}
                  >
                    {parentPieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Summary cards */}
            <div className="labelSummaryCards">
              {labelStats.byParentLabel.slice(0, 4).map((p) => (
                <div
                  key={p.parentLabel}
                  className="labelCard"
                  style={{
                    borderColor: PARENT_COLORS[p.parentLabel] || "#888",
                  }}
                >
                  <h4>{p.parentLabel.split(" ")[0]}</h4>
                  <div className="labelCardStats">
                    <div>
                      <span className="labelCardValue">
                        {formatNum(p.plays, locale)}
                      </span>
                      <span className="labelCardLabel">{labels.streams}</span>
                    </div>
                    <div>
                      <span className="labelCardValue">
                        {formatNum(p.estimatedRevenue, locale)} kr
                      </span>
                      <span className="labelCardLabel">{labels.revenue}</span>
                    </div>
                    <div>
                      <span className="labelCardValue">{p.uniqueLabels}</span>
                      <span className="labelCardLabel">
                        {locale === "en" ? "labels" : "selskap"}
                      </span>
                    </div>
                  </div>
                  <div className="labelCardBar">
                    <div
                      className="labelCardBarActive"
                      style={{
                        width: `${(p.activePlays / p.plays) * 100}%`,
                      }}
                      title={`${labels.active}: ${p.activePlays}`}
                    />
                    <div
                      className="labelCardBarAssisted"
                      style={{
                        width: `${(p.assistedPlays / p.plays) * 100}%`,
                      }}
                      title={`${labels.assisted}: ${p.assistedPlays}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top labels bar chart */}
          <div className="labelChartSection">
            <h3>{labels.topLabels}</h3>
            <p className="clickHint">
              {locale === "en"
                ? "Click a label to see all tracks"
                : "Trykk på eit selskap for å sjå alle låtar"}
            </p>
            <div className="labelBarChart">
              <ResponsiveContainer
                width="100%"
                height={Math.max(400, topLabelsData.length * 32)}
              >
                <BarChart
                  data={topLabelsData}
                  layout="vertical"
                  margin={{ left: 10, right: 20, top: 10, bottom: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis type="number" tick={{ fill: "#888", fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#fff", fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip content={<BarTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="active"
                    name={labels.active}
                    stackId="plays"
                    fill={COLORS.active}
                    cursor="pointer"
                    onClick={(data: any) => setSelectedLabel(data.fullName)}
                  />
                  <Bar
                    dataKey="assisted"
                    name={labels.assisted}
                    stackId="plays"
                    fill={COLORS.assisted}
                    cursor="pointer"
                    onClick={(data: any) => setSelectedLabel(data.fullName)}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {labelStats.byLabel.length > 10 && (
              <button
                className="showMoreButton"
                onClick={() => setShowAllLabels(!showAllLabels)}
              >
                {showAllLabels ? labels.showLess : labels.showAll} (
                {labelStats.byLabel.length})
              </button>
            )}
          </div>

          {/* Table with details */}
          <div className="labelChartSection">
            <h3>{locale === "en" ? "Label Details" : "Detaljar om selskap"}</h3>
            <div className="labelTableWrapper">
              <table className="labelTable">
                <thead>
                  <tr>
                    <th>{locale === "en" ? "Label" : "Selskap"}</th>
                    <th>{locale === "en" ? "Parent" : "Konsern"}</th>
                    <th>{labels.streams}</th>
                    <th>{labels.active}</th>
                    <th>{labels.assisted}</th>
                    <th>{labels.tracks}</th>
                    <th>{labels.revenue}</th>
                  </tr>
                </thead>
                <tbody>
                  {labelStats.byLabel
                    .slice(0, showAllLabels ? 50 : 15)
                    .map((l) => (
                      <tr
                        key={l.label}
                        className="clickableRow"
                        onClick={() => setSelectedLabel(l.label)}
                      >
                        <td className="labelName">{l.label}</td>
                        <td className="parentLabel">
                          <span
                            className="parentDot"
                            style={{
                              background:
                                PARENT_COLORS[l.parentLabel] || "#888",
                            }}
                          />
                          {l.parentLabel.split(" ")[0]}
                        </td>
                        <td>{formatNum(l.plays, locale)}</td>
                        <td style={{ color: COLORS.active }}>
                          {formatNum(l.activePlays, locale)}
                        </td>
                        <td style={{ color: COLORS.assisted }}>
                          {formatNum(l.assistedPlays, locale)}
                        </td>
                        <td>{l.uniqueTracks}</td>
                        <td>{formatNum(l.estimatedRevenue, locale)} kr</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Label detail modal */}
      {selectedLabel && (
        <div className="labelModal" onClick={() => setSelectedLabel(null)}>
          <div
            className="labelModalContent"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="labelModalHeader">
              <h3>
                {labels.labelModal} {selectedLabel}
              </h3>
              <button
                className="modalCloseButton"
                onClick={() => setSelectedLabel(null)}
              >
                ×
              </button>
            </div>
            <div className="labelModalStats">
              <span>
                {selectedLabelTracks.length} {labels.tracks}
              </span>
              <span>
                {formatNum(
                  selectedLabelTracks.reduce((sum, t) => sum + t.plays, 0),
                  locale,
                )}{" "}
                {labels.streams}
              </span>
              <span>
                {Math.round(
                  selectedLabelTracks.reduce((sum, t) => sum + t.msPlayed, 0) /
                    60000,
                )}{" "}
                min {labels.listenTime.toLowerCase()}
              </span>
            </div>
            <div className="labelModalTableWrapper">
              <table className="labelModalTable">
                <thead>
                  <tr>
                    <th>{labels.track}</th>
                    <th>{labels.artist}</th>
                    <th>{labels.year}</th>
                    <th>{labels.streams}</th>
                    <th>{labels.active}</th>
                    <th>{labels.assisted}</th>
                    <th>{labels.listenTime}</th>
                    <th>{labels.source}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLabelTracks.map((track) => (
                    <tr key={track.trackId}>
                      <td className="trackName">{track.trackName}</td>
                      <td>{track.artist}</td>
                      <td>{track.releaseYear || "–"}</td>
                      <td>{track.plays}</td>
                      <td style={{ color: COLORS.active }}>
                        {track.activePlays}
                      </td>
                      <td style={{ color: COLORS.assisted }}>
                        {track.assistedPlays}
                      </td>
                      <td>{Math.round(track.msPlayed / 60000)} min</td>
                      <td className="sourceTag">
                        <span
                          className={`sourceBadge sourceBadge--${track.lookupSource}`}
                        >
                          {track.lookupSource}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="modalCloseButtonBottom"
              onClick={() => setSelectedLabel(null)}
            >
              {labels.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
