// src/lib/analyze.ts

/**
 * Historisk Spotify Premium Individual-pris i Noreg (NOK/månad).
 * Verifisert via Wayback Machine-snapshotar av spotify.com/no-nb/premium/.
 *
 * Kjelder:
 *   2015-06 snapshot → 99 kr       (stabil sidan lansering ~2009)
 *   2021-03 snapshot → 119 kr      (auke frå 99, truleg feb 2021)
 *   2022-09 snapshot → 119 kr
 *   2023-05 snapshot → 119 kr
 *   2023-09 snapshot → 129 kr      (auke juli 2023)
 *   2024-09 snapshot → 129 kr
 *   2026-02 live side → 139 kr     (auke truleg juni 2025)
 *
 * Kvar oppføring: frå og med [year, month] gjeld prisen.
 */
export const SPOTIFY_PRICE_HISTORY_NOK: Array<{
  from: [number, number]; // [year, month] (month 1-12)
  price: number;
}> = [
  { from: [2009, 1], price: 99 },
  { from: [2021, 2], price: 119 },
  { from: [2023, 7], price: 129 },
  { from: [2025, 6], price: 139 },
];

/**
 * Returnerer Spotify Premium Individual-prisen (NOK) for ein gitt månad.
 */
export function getMonthlyPriceNOK(year: number, month: number): number {
  let price = SPOTIFY_PRICE_HISTORY_NOK[0].price;
  for (const entry of SPOTIFY_PRICE_HISTORY_NOK) {
    const [fy, fm] = entry.from;
    if (year > fy || (year === fy && month >= fm)) {
      price = entry.price;
    }
  }
  return price;
}

/**
 * Reknar ut total abonnementskostnad for eit sett med månadar,
 * ved å bruke historisk pris for kvar einskild månad.
 */
export function calcHistoricalSubscriptionCost(
  uniqueMonths: Array<{ year: number; month: number }>,
): {
  totalCost: number;
  weightedAvgPrice: number;
  monthDetails: Array<{ year: number; month: number; price: number }>;
} {
  const monthDetails = uniqueMonths.map(({ year, month }) => ({
    year,
    month,
    price: getMonthlyPriceNOK(year, month),
  }));
  const totalCost = monthDetails.reduce((sum, m) => sum + m.price, 0);
  const weightedAvgPrice =
    monthDetails.length > 0 ? totalCost / monthDetails.length : 0;
  return { totalCost, weightedAvgPrice, monthDetails };
}

export type SpotifyStreamRow = {
  ts?: string;
  ms_played?: number;
  msPlayed?: number;

  master_metadata_track_name?: string;
  master_metadata_album_artist_name?: string;
  master_metadata_album_album_name?: string;
  spotify_track_uri?: string;

  reason_start?: string;
  reason_end?: string;
  shuffle?: boolean;
  skipped?: boolean;
  offline?: boolean;
  incognito_mode?: boolean;

  episode_name?: string | null;
  episode_show_name?: string | null;
  spotify_episode_uri?: string | null;
  audiobook_title?: string | null;
};

export type AnalysisConfig = {
  nokPerStream: number;
  albumPriceNOK: number;
  minMsPlayedToCount: number;
  sessionGapSeconds: number;
};

export type ReasonBreakdownRow = {
  reasonStart: string;
  msPlayed: number;
  estStreams: number;
  shareMs: number; // 0..1
};

export type AutoplayArtist = {
  artist: string;
  msPlayed: number;
  plays: number;
  share: number;
};

export type AutoplayTrack = {
  trackName: string;
  artist: string;
  msPlayed: number;
  plays: number;
  share: number;
};

export type ArtistAgg = {
  artist: string;
  msPlayed: number;
  plays: number;

  activeMsPlayed: number;
  passiveMsPlayed: number;

  estStreams: number;
  estValueNOK: number;
  albumEquivalent: number;

  activeShare: number;

  topAlbums: Array<{ album: string; msPlayed: number; plays: number }>;
};

export type AnalysisResult = {
  totalMsPlayed: number;
  totalRows: number;

  countedRows: number;
  countedMsPlayed: number;

  activeMsPlayed: number;
  passiveMsPlayed: number;

  activeShare: number;
  passiveShare: number;

  activeEstStreams: number;
  passiveEstStreams: number;

  activeEstValueNOK: number;
  passiveEstValueNOK: number;

  // Autoplay etter slutt:
  autoplayAfterEndplayMs: number;
  autoplayShare: number;
  autoplayEstStreams: number;
  autoplayEstValueNOK: number;
  autoplayTopArtists: AutoplayArtist[];
  autoplayTopTracks: AutoplayTrack[];
  autoplayReasonBreakdown: ReasonBreakdownRow[];
  autoplayEventsCount: number;

  // Lister:
  artists: ArtistAgg[];
};

function getMsPlayed(row: SpotifyStreamRow): number {
  if (typeof row.ms_played === "number") return row.ms_played;
  if (typeof row.msPlayed === "number") return row.msPlayed;
  return 0;
}

function safeStr(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function isAutoplayAfterEndplay(
  prev: SpotifyStreamRow,
  curr: SpotifyStreamRow,
  gapSeconds: number,
  sessionGapSeconds: number,
): boolean {
  const prevEnd = (prev.reason_end ?? "").toLowerCase();
  const currStart = (curr.reason_start ?? "").toLowerCase();

  const ended = prevEnd === "endplay";
  const noExplicitClick =
    currStart === "trackdone" || currStart === "unknown" || currStart === "";
  const sameSession = gapSeconds >= 0 && gapSeconds <= sessionGapSeconds;

  return ended && noExplicitClick && sameSession;
}

/**
 * Heuristikk:
 * - "active": tydelege brukarhandlingar
 * - "passive": vidareføring / uklart
 */
export function classifyStart(
  reasonStartRaw: string | undefined,
): "active" | "passive" {
  const r = (reasonStartRaw ?? "").trim().toLowerCase();

  const ACTIVE = new Set([
    "clickrow",
    "playbtn",
    "fwdbtn",
    "backbtn",
    "search",
    "artist",
    "uriopen",
    "clickside",
  ]);

  const PASSIVE = new Set([
    "trackdone",
    "appload",
    "popup",
    "remote",
    "unknown",
    "endplay",
    "",
  ]);

  if (ACTIVE.has(r)) return "active";
  if (PASSIVE.has(r)) return "passive";
  return "passive";
}

export function analyze(
  rows: SpotifyStreamRow[],
  cfg: AnalysisConfig,
): AnalysisResult {
  const nokPerStream = Math.max(0, cfg.nokPerStream);
  const albumPrice = Math.max(1, cfg.albumPriceNOK);
  const sessionGapSeconds = Math.max(1, cfg.sessionGapSeconds);

  // Sorter radene kronologisk
  const sorted = [...rows].sort((a, b) => {
    const ta = Date.parse(a.ts ?? "");
    const tb = Date.parse(b.ts ?? "");
    return (isNaN(ta) ? 0 : ta) - (isNaN(tb) ? 0 : tb);
  });

  const byArtist = new Map<
    string,
    {
      msPlayed: number;
      plays: number;
      activeMs: number;
      passiveMs: number;
      byAlbum: Map<string, { msPlayed: number; plays: number }>;
    }
  >();

  // Autoplay tracking
  let autoplayAfterEndplayMs = 0;
  let autoplayEventsCount = 0;
  const autoplayByArtist = new Map<string, number>();
  const autoplayByTrack = new Map<
    string,
    { artist: string; ms: number; plays: number }
  >();
  const autoplayByReasonStart = new Map<string, number>();

  let totalMsPlayed = 0;
  let countedRows = 0;
  let countedMsPlayed = 0;

  let activeMsPlayed = 0;
  let passiveMsPlayed = 0;
  let activePlays = 0;
  let passivePlays = 0;

  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    const ms = getMsPlayed(r);
    totalMsPlayed += ms;

    if (ms < cfg.minMsPlayedToCount) continue;

    const artist = safeStr(r.master_metadata_album_artist_name);
    if (!artist) continue;

    // Autoplay etter endplay
    if (i > 0) {
      const prev = sorted[i - 1];
      const tPrev = Date.parse(prev.ts ?? "");
      const tCurr = Date.parse(r.ts ?? "");
      const gapSeconds =
        !isNaN(tPrev) && !isNaN(tCurr) ? (tCurr - tPrev) / 1000 : -1;

      if (isAutoplayAfterEndplay(prev, r, gapSeconds, sessionGapSeconds)) {
        autoplayAfterEndplayMs += ms;
        autoplayEventsCount++;

        autoplayByArtist.set(artist, (autoplayByArtist.get(artist) ?? 0) + ms);

        const trackName = safeStr(r.master_metadata_track_name, "(Ukjent)");
        const trackKey = `${artist}|||${trackName}`;
        if (!autoplayByTrack.has(trackKey)) {
          autoplayByTrack.set(trackKey, { artist, ms: 0, plays: 0 });
        }
        const trackData = autoplayByTrack.get(trackKey)!;
        trackData.ms += ms;
        trackData.plays++;

        const reasonStart = safeStr(r.reason_start, "(tom)");
        autoplayByReasonStart.set(
          reasonStart,
          (autoplayByReasonStart.get(reasonStart) ?? 0) + ms,
        );
      }
    }

    countedRows++;
    countedMsPlayed += ms;

    const album = safeStr(r.master_metadata_album_album_name, "(Ukjent album)");

    const cls = classifyStart(r.reason_start);

    if (!byArtist.has(artist)) {
      byArtist.set(artist, {
        msPlayed: 0,
        plays: 0,
        activeMs: 0,
        passiveMs: 0,
        byAlbum: new Map(),
      });
    }

    const a = byArtist.get(artist)!;
    a.msPlayed += ms;
    a.plays += 1;

    if (cls === "active") {
      a.activeMs += ms;
      activeMsPlayed += ms;
      activePlays++;
    } else {
      a.passiveMs += ms;
      passiveMsPlayed += ms;
      passivePlays++;
    }

    if (!a.byAlbum.has(album)) a.byAlbum.set(album, { msPlayed: 0, plays: 0 });
    const al = a.byAlbum.get(album)!;
    al.msPlayed += ms;
    al.plays += 1;
  }

  const artists: ArtistAgg[] = Array.from(byArtist.entries()).map(
    ([artist, a]) => {
      const estStreams = a.plays;
      const estValueNOK = estStreams * nokPerStream;
      const albumEquivalent = estValueNOK / albumPrice;

      const topAlbums = Array.from(a.byAlbum.entries())
        .map(([album, v]) => ({ album, msPlayed: v.msPlayed, plays: v.plays }))
        .sort((x, y) => y.msPlayed - x.msPlayed)
        .slice(0, 5);

      const activeShare = a.msPlayed > 0 ? a.activeMs / a.msPlayed : 0;

      return {
        artist,
        msPlayed: a.msPlayed,
        plays: a.plays,
        activeMsPlayed: a.activeMs,
        passiveMsPlayed: a.passiveMs,
        estStreams,
        estValueNOK,
        albumEquivalent,
        activeShare,
        topAlbums,
      };
    },
  );

  artists.sort((x, y) => y.estValueNOK - x.estValueNOK);

  const totalCounted = Math.max(1, countedMsPlayed);
  const activeShare = activeMsPlayed / totalCounted;
  const passiveShare = passiveMsPlayed / totalCounted;

  // Kvar kvalifiserande rad (ms_played >= terskel) = 1 stream
  const activeEstStreams = activePlays;
  const passiveEstStreams = passivePlays;

  const activeEstValueNOK = activeEstStreams * nokPerStream;
  const passiveEstValueNOK = passiveEstStreams * nokPerStream;

  // Autoplay statistikk
  const autoplayShare = autoplayAfterEndplayMs / Math.max(1, countedMsPlayed);
  const autoplayEstStreams = autoplayEventsCount;
  const autoplayEstValueNOK = autoplayEstStreams * nokPerStream;

  const autoplayTopArtists: AutoplayArtist[] = Array.from(
    autoplayByArtist.entries(),
  )
    .map(([artist, msPlayed]) => ({
      artist,
      msPlayed,
      plays: 0,
      share: msPlayed / Math.max(1, autoplayAfterEndplayMs),
    }))
    .sort((a, b) => b.msPlayed - a.msPlayed)
    .slice(0, 20);

  const autoplayTopTracks: AutoplayTrack[] = Array.from(
    autoplayByTrack.entries(),
  )
    .map(([key, data]) => {
      const trackName = key.split("|||")[1] || "(Ukjent)";
      return {
        trackName,
        artist: data.artist,
        msPlayed: data.ms,
        plays: data.plays,
        share: data.ms / Math.max(1, autoplayAfterEndplayMs),
      };
    })
    .sort((a, b) => b.msPlayed - a.msPlayed)
    .slice(0, 20);

  const autoplayReasonBreakdown: ReasonBreakdownRow[] = Array.from(
    autoplayByReasonStart.entries(),
  )
    .map(([reasonStart, msPlayed]) => {
      return {
        reasonStart,
        msPlayed,
        estStreams: 0, // ikkje mogleg å telle eksakte streams per reason her
        shareMs: msPlayed / Math.max(1, autoplayAfterEndplayMs),
      };
    })
    .sort((a, b) => b.msPlayed - a.msPlayed);

  return {
    totalMsPlayed,
    totalRows: rows.length,
    countedRows,
    countedMsPlayed,

    activeMsPlayed,
    passiveMsPlayed,
    activeShare,
    passiveShare,

    activeEstStreams,
    passiveEstStreams,

    activeEstValueNOK,
    passiveEstValueNOK,

    autoplayAfterEndplayMs,
    autoplayShare,
    autoplayEstStreams,
    autoplayEstValueNOK,
    autoplayTopArtists,
    autoplayTopTracks,
    autoplayReasonBreakdown,
    autoplayEventsCount,

    artists,
  };
}
