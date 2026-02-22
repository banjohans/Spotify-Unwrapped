import { useMemo, useState, useEffect } from "react";
import {
  analyze,
  calcHistoricalSubscriptionCost,
  SPOTIFY_PRICE_HISTORY_NOK,
  SPOTIFY_ROYALTY_HISTORY_NOK,
} from "./lib/analyze";
import type { AnalysisConfig, SpotifyStreamRow } from "./lib/analyze";
import "./App.css";
import analyticsImg from "./assets/analytics.png";
import insightImg from "./assets/insight.png";
import privateImg from "./assets/private.png";
import heroImg from "./assets/hero.png";

function formatHours(ms: number) {
  const h = ms / 3600000;
  return `${h.toFixed(1)} t`;
}
function formatNOK(n: number) {
  return `${n.toFixed(0)} kr`;
}
// function pct(x: number) {
//   return `${(x * 100).toFixed(1)}%`;
// }

function albumKey(artist: string, album: string) {
  return `${artist}|||${album}`;
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

  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [artistDetailSort, setArtistDetailSort] = useState<"time" | "tracks">(
    "time",
  );
  const [artistSearchQuery, setArtistSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(30);
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
    albumPriceNOK: 150,
    minMsPlayedToCount: 30_000,
    sessionGapSeconds: 60,
  });

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
    const historical = calcHistoricalSubscriptionCost(activeMonthList);

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
    const spanHistorical = calcHistoricalSubscriptionCost(spanMonths);

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
  }, [dateFilteredRows]);

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
      <header className="hero">
        <div className="heroGlow" />
        <div className="heroContent">
          <div className="heroImageWrap">
            <img
              src={heroImg}
              alt="Spotify Unwrapped – illustrasjon"
              className="heroImage"
            />
          </div>

          <span className="heroBadgePill">
            Lokal analyse · Ingen data forlet nettlesaren
          </span>

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

          <p className="heroTagline">Kva tente artistene på lyttinga di?</p>
          <p className="heroDesc">
            Oppdag kor mykje pengar <u>dine streams</u> faktisk genererte for
            artistane du elskar – og kva det alternativt hadde kosta å kjøpe
            musikken direkte.
          </p>

          <div className="heroUnderline" />

          <div className="featureGrid">
            <div className="featureCard">
              <div
                className="featureImg"
                style={{ backgroundImage: `url(${analyticsImg})` }}
              />
              <div className="featureText">
                <h3>Analyser lyttinga di</h3>
                <p>
                  Estimert teoretisk verdi for kvar artist basert på
                  gjennomsnittlege straumeprisar (pro-rata modell).
                </p>
              </div>
            </div>
            <div className="featureCard">
              <div
                className="featureImg"
                style={{ backgroundImage: `url(${insightImg})` }}
              />
              <div className="featureText">
                <h3>Få innsikt</h3>
                <p>
                  Sjekk kva det hadde kosta å støtte artistane med direktekjøp i
                  staden.
                </p>
              </div>
            </div>
            <div className="featureCard">
              <div
                className="featureImg"
                style={{ backgroundImage: `url(${privateImg})` }}
              />
              <div className="featureText">
                <h3>Heilt privat</h3>
                <p>
                  Alt skjer lokalt i nettlesaren. Vi lagrar eller sender aldri
                  dine data.
                </p>
              </div>
            </div>
          </div>

          <div className="heroCta">
            <a
              href="https://www.spotify.com/no-nb/account/privacy/"
              target="_blank"
              rel="noopener noreferrer"
              className="privacyLink"
            >
              Be om dine data frå Spotify (GDPR) →
            </a>
            <p className="heroCtaHint">
              Manglar du data? Last ned «Extended Streaming History» frå
              Spotify-kontoen din.
            </p>
          </div>
        </div>
      </header>

      <section className="card" style={{ marginTop: 40 }}>
        <div className="cardHeader">
          <h2>
            1) Last opp (alle) "Extended streaming history" JSON filene du har
            motatt frå Spotify
          </h2>
          {!!rows.length && (
            <div className="pill">{rows.length.toLocaleString()} rader</div>
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
              📁 Vel Spotify-data filene dine
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
              <h3>Opplasta filer ({uploadedFiles.length})</h3>
              <button
                className="btnGhost"
                onClick={() => {
                  setUploadedFiles([]);
                  setRows([]);
                }}
              >
                Fjern alle
              </button>
            </div>
            <div className="filesList">
              {uploadedFiles.map((file) => (
                <div key={file.name} className="fileItem">
                  <div className="fileInfo">
                    <span className="fileName">{file.name}</span>
                    <span className="fileStats">
                      {file.rowCount.toLocaleString()} rader
                    </span>
                  </div>
                  <button
                    className="fileRemove"
                    onClick={() => {
                      setUploadedFiles((prev) =>
                        prev.filter((f) => f.name !== file.name),
                      );
                    }}
                    title="Fjern fil"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <div className="cardHeader">
          <h2>Innstillingar</h2>
          <div className="subtle">
            Justér anslaga utan å sende data nokon stad.
          </div>
        </div>

        <div className="controlsGrid">
          <label className="field">
            <span>Standard albumpris (NOK)</span>
            <input
              type="number"
              step="10"
              value={cfg.albumPriceNOK}
              onChange={(e) =>
                setCfg({ ...cfg, albumPriceNOK: Number(e.target.value) })
              }
            />
          </label>

          <label className="field">
            <span>Min. ms per rad</span>
            <input
              type="number"
              step="1000"
              value={cfg.minMsPlayedToCount}
              onChange={(e) =>
                setCfg({ ...cfg, minMsPlayedToCount: Number(e.target.value) })
              }
            />
          </label>
        </div>

        <div className="priceHistoryInfo">
          <h4>Historisk abonnementspris (Premium Individual, Noreg)</h4>
          <table className="priceHistoryTable">
            <thead>
              <tr>
                <th>Periode</th>
                <th>Pris</th>
              </tr>
            </thead>
            <tbody>
              {SPOTIFY_PRICE_HISTORY_NOK.map((period, i) => {
                const nextPeriod = SPOTIFY_PRICE_HISTORY_NOK[i + 1];
                const fromStr = `${period.from[0]}-${String(period.from[1]).padStart(2, "0")}`;
                const toStr = nextPeriod
                  ? `${nextPeriod.from[0]}-${String(nextPeriod.from[1] - 1).padStart(2, "0")}`
                  : "no";
                return (
                  <tr key={i}>
                    <td>
                      {fromStr} → {toStr}
                    </td>
                    <td>{period.price} kr/mnd</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="subtle" style={{ marginTop: 6, fontSize: "0.85em" }}>
            Abonnementskostnad vert rekna ut automatisk basert på historisk pris
            per månad i perioden din.
          </p>
        </div>

        <div className="priceHistoryInfo">
          <h4>Historisk NOK per stream (anslag, norsk marknad)</h4>
          <table className="priceHistoryTable">
            <thead>
              <tr>
                <th>Periode</th>
                <th>NOK/stream</th>
              </tr>
            </thead>
            <tbody>
              {SPOTIFY_ROYALTY_HISTORY_NOK.map((period, i) => {
                const nextPeriod = SPOTIFY_ROYALTY_HISTORY_NOK[i + 1];
                const fromStr = `${period.from[0]}-${String(period.from[1]).padStart(2, "0")}`;
                const toStr = nextPeriod
                  ? `${nextPeriod.from[0]}-${String(nextPeriod.from[1] - 1).padStart(2, "0")}`
                  : "no";
                return (
                  <tr key={i}>
                    <td>
                      {fromStr} → {toStr}
                    </td>
                    <td>{period.nokPerStream.toFixed(3)} kr</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="subtle" style={{ marginTop: 6, fontSize: "0.85em" }}>
            Verdien per stream vert rekna ut automatisk basert på historisk sats
            for kvar strøyming i perioden din. Satsen er eit anslag basert på
            Spotify sine totale utbetalingar, globale strøymetall og norske
            marknadsfaktorar.
          </p>
        </div>
      </section>

      {rows.length > 0 && availableYears.length > 0 && (
        <section className="card">
          <div className="cardHeader">
            <h2>Tidsperiode</h2>
            <div className="subtle">
              Filtrer analysen til eit bestemt år eller datoområde.
            </div>
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
                All tid
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
                Eigendefinert
              </button>
            </div>

            {dateFilterMode === "custom" && (
              <div className="dateCustomRange">
                <label className="dateField">
                  <span>Frå</span>
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
                  <span>Til</span>
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
                Viser data for: <b>{activeDateRange.label}</b>
                {" · "}
                {dateFilteredRows.length.toLocaleString()} rader
                {rows.length !== dateFilteredRows.length && (
                  <span className="subtle">
                    {" "}
                    (av {rows.length.toLocaleString()} totalt)
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
                2) Oversikt
                {activeDateRange ? ` (${activeDateRange.label})` : ""}
              </h2>
              <div className="subtle">
                Kjapp status på materialet
                {activeDateRange ? " i vald periode" : " du har lasta opp"}.
              </div>
            </div>

            <div className="statsGrid">
              <div className="stat">
                <div className="statLabel">Total lyttetid</div>
                <div className="statValue">
                  {formatHours(result.totalMsPlayed)}
                </div>
              </div>

              <div className="stat">
                <div className="statLabel">Rader analysert</div>
                <div className="statValue">
                  {result.countedRows.toLocaleString()}
                </div>
              </div>

              <div className="stat">
                <div className="statLabel">Unike artistar</div>
                <div className="statValue">
                  {result.artists.length.toLocaleString()}
                  {excludedArtists.size > 0 ? (
                    <span className="statHint">
                      {" "}
                      · {excludedArtists.size} skjulte
                    </span>
                  ) : null}
                </div>
              </div>

              {subscriptionEstimate && (
                <div className="stat">
                  <div className="statLabel">
                    Estimert abonnement (full periode)
                  </div>
                  <div className="statValue">
                    {formatNOK(subscriptionEstimate.totalCost)}
                    <span className="statHint">
                      {" "}
                      · {subscriptionEstimate.months.toFixed(1)} mnd
                    </span>
                  </div>
                </div>
              )}

              {subscriptionEstimate && (
                <div className="stat">
                  <div className="statLabel">
                    Abonnement (berre aktive mndr)
                  </div>
                  <div className="statValue">
                    {formatNOK(subscriptionEstimate.activeCost)}
                    <span className="statHint">
                      {" "}
                      · {subscriptionEstimate.activeMonths} mnd
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="sectionSummary" style={{ marginTop: 14 }}>
              <div className="summaryItem">
                <span className="summaryLabel">
                  Total teoretisk Spotfiy-verdi (alle artistar)
                </span>
                <span className="summaryValue green">
                  {formatNOK(totalAllArtistsValue)}
                </span>
              </div>
              {subscriptionEstimate && (
                <>
                  <div className="summarySep" />
                  <div className="summaryItem">
                    <span className="summaryLabel">
                      Estimert abonnementskostnad
                    </span>
                    <span className="summaryValue">
                      {formatNOK(subscriptionEstimate.activeCost)}
                    </span>
                  </div>
                  <div className="summarySep" />
                  <div className="summaryItem">
                    <span className="summaryLabel">Differanse</span>
                    <span
                      className="summaryValue"
                      style={{
                        color:
                          subscriptionEstimate.activeCost -
                            totalAllArtistsValue >
                          0
                            ? "rgb(239, 68, 68)"
                            : "rgb(30, 215, 96)",
                      }}
                    >
                      {formatNOK(
                        subscriptionEstimate.activeCost - totalAllArtistsValue,
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>

            {subscriptionEstimate && (
              <p className="subtle" style={{ marginTop: 10 }}>
                Periode:{" "}
                <b>
                  {subscriptionEstimate.firstDate.toLocaleDateString("nb-NO", {
                    year: "numeric",
                    month: "short",
                  })}
                  {" – "}
                  {subscriptionEstimate.lastDate.toLocaleDateString("nb-NO", {
                    year: "numeric",
                    month: "short",
                  })}
                </b>{" "}
                · vekta snittpris:{" "}
                {formatNOK(subscriptionEstimate.avgMonthlyPrice)}/mnd
                <br />
                Prisar brukt:{" "}
                {(() => {
                  const prices = new Set(
                    subscriptionEstimate.priceBreakdown.map(
                      (m: { price: number }) => m.price,
                    ),
                  );
                  return Array.from(prices)
                    .sort((a, b) => a - b)
                    .map((p) => `${p} kr`)
                    .join(", ");
                })()}
              </p>
            )}

            <p className="subtle" style={{ marginTop: 10 }}>
              Merk: Spotify bruker ein <b>pro-rata pooling-modell</b>. Det betyr
              at abonnementspengane dine ikkje går direkte til artistane du
              lyttar til – dei går i ein felles pott og vert fordelt etter kvar
              artist sin andel av <i>alle</i> streams på plattforma. Estimata
              her viser ein teoretisk verdi basert på gjennomsnittleg
              straumepris × lyttetid, ikkje kva artisten faktisk har fått frå
              akkurat deg.
            </p>

            <p className="subtle" style={{ marginTop: 10 }}>
              <b>Om abonnementsprising:</b> Spotify sin GDPR-dataeksport
              inneheld ikkje informasjon om abonnementstype eller
              betalingshistorikk. Feltet <code>Payments.json</code> er tomt, og{" "}
              <code>Userdata.json</code> har berre grunnleggande
              kontoinformasjon. Difor reknar denne sida med standardpris for
              vanleg <b>Premium-abonnement</b> i Noreg, basert på historiske
              prisar verifisert via Wayback Machine. Har du hatt Free, Duo eller
              Family-abonnement vil den faktiske kostnaden avvike.
            </p>
          </section>

          <section className="card">
            <div className="cardHeader stickyHeader">
              <div>
                <h2>
                  3) Dine {filteredArtists.length} artistar og ca kva det hadde
                  kosta å kjøpe albuma deira direkte
                </h2>
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
                  Legg alle album i kjøpsplan
                </button>

                {plannedCount > 0 && (
                  <button
                    className="btnGhost"
                    onClick={() => setPlannedAlbums({})}
                  >
                    Tøm
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
                      Album lagt til &middot; {formatNOK(plannedCost)}
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
                              {albumsRemaining} album att
                            </span>{" "}
                            — {albumBudget} album kunne du ha eigd i dag
                            i staden for å ikkje eige nokon som
                            Spotify-abonnent (
                            {formatNOK(subscriptionEstimate.activeCost)})
                          </>
                        ) : (
                          <span className="green">
                            ✓ {plannedCount - albumBudget} album meir enn du
                            kunne fått for
                            spotify-abonnementsutgiftene dine ({albumBudget}{" "}
                            album ≈{" "}
                            {formatNOK(subscriptionEstimate.activeCost)})
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
                            title="Fjern"
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
                        <span>Totalt {plannedCount} album</span>
                        <span className="green">{formatNOK(plannedCost)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Top-N veljar */}
            <div className="topNSelector">
              <span className="topNLabel">Vis tal for:</span>
              <div className="topNTabs">
                {([5, 10, 20, 30, 50, "all"] as const).map((n) => {
                  const isAll = n === "all";
                  const label = isAll
                    ? `Alle (${filteredArtists.length})`
                    : `Topp ${n}`;
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
                  Total lyttetid,{" "}
                  {summaryTopN === "all"
                    ? `alle ${topNArtists.length}`
                    : `topp ${topNArtists.length}`}{" "}
                  artistar
                </span>
                <span className="summaryValue">{formatHours(topNMs)}</span>
              </div>
              <div className="summarySep" />
              <div className="summaryItem">
                <span className="summaryLabel">Teoretisk Spotify-verdi</span>
                <span className="summaryValue">{formatNOK(topNValue)}</span>
              </div>
              <div className="summarySep" />
              <div className="summaryItem">
                <span className="summaryLabel">Album</span>
                <span className="summaryValue">{topNAlbumKeys.length}</span>
              </div>
              <div className="summarySep" />
              <div className="summaryItem">
                <span className="summaryLabel">Kjøp fysiske album</span>
                <span className="summaryValue green">
                  {formatNOK(topNCost)}
                </span>
              </div>
            </div>

            {/* Søk og paginering */}
            <div className="paginationControls">
              <div className="searchBox">
                <input
                  type="text"
                  placeholder="Søk etter artist..."
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
                    title="Tøm søk"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="paginationInfo">
                Viser {startIndex + 1}–
                {Math.min(endIndex, searchedArtists.length)} av{" "}
                {searchedArtists.length}
              </div>

              <div className="paginationNav">
                <button
                  className="pageBtn"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  ««
                </button>
                <button
                  className="pageBtn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ‹
                </button>
                <span className="pageNumbers">
                  Side {currentPage} av {totalPages}
                </span>
                <button
                  className="pageBtn"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  ›
                </button>
                <button
                  className="pageBtn"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  »»
                </button>
              </div>

              <div className="perPageSelect">
                <label>
                  Per side:
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
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
                          <span className="metaLabel">Lyttetid</span>{" "}
                          <b>{formatHours(a.msPlayed)}</b>
                        </span>
                        <span className="dot">•</span>
                        <span className="metaItem">
                          <span className="metaLabel">Teor. verdi</span>{" "}
                          <b>{formatNOK(a.estValueNOK)}</b>
                        </span>
                        <span className="dot">•</span>
                        <span className="metaItem">
                          <span className="metaLabel">Album-ekv.</span>{" "}
                          <b>{a.albumEquivalent.toFixed(2)}</b>
                        </span>
                      </div>
                    </div>

                    <div className="albumWrap" aria-label="Topp-album">
                      <p className="albumInstructions">
                        Trykk på albuma du kunne vurdert å kjøpe for å støtte
                        artistane du likar godt.
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
                                  title={`${x.album}${isPlanned ? " (i kjøpsplan)" : ""}`}
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
                                    ? "Vis færre"
                                    : `Vis alle ${a.topAlbums.length} album`}
                                </span>
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    <button
                      className="iconBtn"
                      title="Fjern frå lista"
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

            <div className="divider" />

            <div className="buyPlan">
              <div className="buyPlanHeader">
                <h3>Planlagde kjøp</h3>
                <div className="subtle">
                  {plannedCount > 0 ? (
                    <>
                      Album i plan: <b>{plannedCount}</b> · total:{" "}
                      <b>{formatNOK(plannedCost)}</b>
                    </>
                  ) : (
                    "Klikk på album-chipane for å legge til."
                  )}
                </div>
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
                          {formatNOK(cfg.albumPriceNOK)}
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
                          Fjern
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <p className="subtle" style={{ marginTop: 12 }}>
              Tolking: Viss ein artist ligg høgt her, kan det vere rimeleg å
              tenkje “eg har brukt mykje av musikken deira”. Ein enkel handling
              kan vere å kjøpe eitt album, merch, eller billett.
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
                    · {formatHours(result.activeMsPlayed)}
                  </span>
                </div>
              </div>
              <div className="stat">
                <div className="statLabel">Passiv</div>
                <div className="statValue">
                  {pct(result.passiveShare)}{" "}
                  <span className="statHint">
                    · {formatHours(result.passiveMsPlayed)}
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
                  {formatNOK(result.activeEstValueNOK)}{" "}
                  <span className="statHint">
                    / {formatNOK(result.passiveEstValueNOK)}
                  </span>
                </div>
              </div>
            </div>
          </section> */}

          {excludedArtists.size > 0 && (
            <section className="card soft">
              <div className="cardHeader">
                <h2>Ekskluderte artistar</h2>
                <div className="subtle">Klikk for å gjenopprette.</div>
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
                    title="Klikk for å gjenopprette"
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
                aria-label="Lukk"
              >
                ×
              </button>
            </div>

            <div className="modalStats">
              <div className="statItem">
                <div className="statLabel">Total lyttetid</div>
                <div className="statValue">
                  {formatHours(artistDetails.totalMs)}
                </div>
              </div>
              <div className="statItem">
                <div className="statLabel">Totalt avspelingar</div>
                <div className="statValue">
                  {artistDetails.totalPlays.toLocaleString()}
                </div>
              </div>
              <div className="statItem">
                <div className="statLabel">Album</div>
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
                Sorter etter tid
              </button>
              <button
                className={
                  artistDetailSort === "tracks"
                    ? "filterBtn active"
                    : "filterBtn"
                }
                onClick={() => setArtistDetailSort("tracks")}
              >
                Sorter etter avspelingar
              </button>
            </div>

            <div className="modalBody">
              {artistDetails.albums.map((album) => (
                <div key={album.album} className="albumDetail">
                  <div className="albumHeader">
                    <h3>{album.album}</h3>
                    <div className="albumStats">
                      {formatHours(album.totalMs)} · {album.totalPlays}{" "}
                      avspelingar
                    </div>
                  </div>
                  <div className="trackList">
                    {album.tracks.map((track) => (
                      <div key={track.trackName} className="trackRow">
                        <div className="trackName">{track.trackName}</div>
                        <div className="trackStats">
                          {formatHours(track.msPlayed)} · {track.plays}{" "}
                          avspelingar
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

      {/* Footer */}
      <footer className="siteFooter">
        <p>Utvikla av Hans Martin Sognefest Austestad</p>
        <button
          className="disclaimerLink"
          onClick={() => setDisclaimerOpen(true)}
        >
          Disclaimer &amp; kjelder
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
              <h2>Disclaimer</h2>
              <button
                className="modalClose"
                onClick={() => setDisclaimerOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="disclaimerBody">
              <p>
                Spotify sine data gjev ikkje full tilgang til nøyaktige
                økonomiske tal. Denne nettsida set saman informasjon basert på
                tre kjelder:
              </p>
              <ul>
                <li>
                  <strong>Streamingtall frå Spotify</strong> – di eiga
                  lyttehistorikk, henta via Spotify sin data-eksport.
                </li>
                <li>
                  <strong>Historisk abonnementsprising</strong> – verifisert via
                  Wayback Machine for den norske marknaden.
                </li>
                <li>
                  <strong>Rapporterte royalties</strong> – basert på offentlege
                  kjelder som Spotify Loud &amp; Clear, Soundcharts og
                  bransjeanalysar. Merk at Spotify ikkje opererer med ein fast
                  sats per stream – utbetalinga er basert på strøymedel.
                </li>
              </ul>
              <p>
                Ein må ta høgde for variasjonar. Faktisk utbetaling til artistar
                avheng av avtalar med plateselskap, distribusjonsplattform og
                region. Tala her er anslag, ikkje fasit.
              </p>
              <p>
                Likevel gjev statistikken ein tydeleg peikepinn på korleis
                strøyming har endra oppmerksomheitsøkonomien grunnleggjande:
                Pengane du betalar som lyttar, går i liten grad til musikken du
                faktisk lyttar til, men inn i ein felles pott som i hovudsak
                belønner det som «går på repeat». Slik blir musikk brukt som
                bakgrunn prioritert, framfor musikk som blir lytta til aktivt.
                Til dømes spelelister som står på kontinuerleg i kjøpesenter og
                butikkar, eller som fungerer som stemningsskapande lyd i ulike
                offentlege rom.
              </p>
              <p>
                Denne sida er lagd for å auke bevisstheit rundt korleis folks
                lyttevanar kanskje ikkje belønner musikken dei høyrer mest på
                eller bryr seg mest om – og for å synleggjøre at direkte støtte
                (som å kjøpe album) er ein langt meir effektiv måte å støtte
                musikken ein bryr seg om.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
