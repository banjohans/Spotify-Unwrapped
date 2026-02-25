// src/lib/analyze.ts

import type { Locale } from "./i18n";
import { getRatePerStream, getMonthlyPrice } from "./i18n";

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
 * Historisk estimert royalty per stream i NOK.
 *
 * Spotify betalar ikkje ein fast «per stream»-sats – utbetalinga avheng av
 * total inntekt, antal streams på plattforma, land, abonnementstype m.m.
 * Desse tala er gjennomsnittlege estimat basert på bransjedata
 * (The Trichordist, Soundcharts, Digital Music News) omrekna til NOK
 * med historiske valutakursar, justert for at Noreg er eit premiummarknad.
 *
 * Kjelder:
 *   2014 → globalt snitt ~$0.006-0.007/stream (få streams, høg sats)
 *   2015-17 → ~$0.005-0.006 (rask vekst i brukarar)
 *   2018 → Soundcharts vekta snitt: $0.00318 (500M+ streams analysert)
 *   2019-21 → ~$0.003-0.004 (peak dilution, mange gratisbrukarar)
 *   2022-24 → ~$0.004 (prisaukar, 1000-streams-terskel frå 2024)
 *   2025+ → ~$0.004 (stabil)
 *
 * Omrekna til NOK med historiske kursar + premiummarknads-justering.
 */
export const SPOTIFY_ROYALTY_HISTORY_NOK: Array<{
  from: [number, number]; // [year, month]
  nokPerStream: number;
}> = [
  { from: [2009, 1], nokPerStream: 0.05 },
  { from: [2015, 1], nokPerStream: 0.044 },
  { from: [2018, 1], nokPerStream: 0.035 },
  { from: [2020, 1], nokPerStream: 0.03 },
  { from: [2023, 1], nokPerStream: 0.038 },
  { from: [2025, 1], nokPerStream: 0.04 },
];

/**
 * Returnerer estimert NOK per stream for ein gitt månad.
 */
export function getNokPerStream(year: number, month: number): number {
  let rate = SPOTIFY_ROYALTY_HISTORY_NOK[0].nokPerStream;
  for (const entry of SPOTIFY_ROYALTY_HISTORY_NOK) {
    const [fy, fm] = entry.from;
    if (year > fy || (year === fy && month >= fm)) {
      rate = entry.nokPerStream;
    }
  }
  return rate;
}

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
  locale: Locale = "no",
): {
  totalCost: number;
  weightedAvgPrice: number;
  monthDetails: Array<{ year: number; month: number; price: number }>;
} {
  const monthDetails = uniqueMonths.map(({ year, month }) => ({
    year,
    month,
    price: getMonthlyPrice(year, month, locale),
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
  albumPriceNOK: number;
  minMsPlayedToCount: number;
  sessionGapSeconds: number;
  locale: Locale;
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
  unknownMsPlayed: number; // Data uten reason_start felt / tvetydig

  activeShare: number;
  passiveShare: number;
  unknownShare: number; // Andel der me ikkje kan klassifisera

  activeEstStreams: number;
  passiveEstStreams: number;
  unknownEstStreams: number;

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

/**
 * Detekterer "ekte" autoplay ETTER at eit album/spilleliste er ferdig.
 * Dette skjer når:
 * 1. Førre låt enda med "endplay" (album/spilleliste ferdig)
 * 2. Neste låt starta utan eksplisitt brukarhandling
 * 3. Dei er i same økt (kort gap)
 *
 * Dette er den mest problematiske passive lyttinga:
 * Spotify serverer nytt innhald du ikkje ba om.
 */
function isAutoplayAfterEndplay(
  prev: SpotifyStreamRow,
  curr: SpotifyStreamRow,
  gapSeconds: number,
  sessionGapSeconds: number,
): boolean {
  const prevEnd = (prev.reason_end ?? "").toLowerCase();
  const currStart = (curr.reason_start ?? "").toLowerCase();

  // Førre låt enda (album/spilleliste ferdig)
  const ended = prevEnd === "endplay";

  // Neste låt starta utan eksplisitt brukarhandling
  const noExplicitClick =
    currStart === "trackdone" ||
    currStart === "unknown" ||
    currStart === "" ||
    currStart === "appload";

  // Same økt (kort gap mellom låtane)
  const sameSession = gapSeconds >= 0 && gapSeconds <= sessionGapSeconds;

  // Autoplay = album enda + ingen eksplisitt handling + same økt
  return ended && noExplicitClick && sameSession;
}

/**
 * Raffinert heuristikk for aktiv/passiv:
 *
 * AKTIV lytting:
 * - Eksplisitte brukarhandlingar (clickrow, playbtn, etc.)
 * - trackdone: neste låt i album/spilleliste du valde = framleis ditt val
 * - fwdbtn/backbtn: navigering innanfor valt innhald
 *
 * PASSIV lytting (algoritmestyrt):
 * - unknown: Spotify valde noko for deg
 * - appload: Spotify bestemte kva som speler ved oppstart
 * - remote: innhald pusha frå anna enheit
 * - popup: truleg reklame eller prompts
 * - (tom streng): ukjent/algoritme
 *
 * Obs: autoplay etter album vert fanga av isAutoplayAfterEndplay()
 */
export function classifyStart(
  reasonStartRaw: string | undefined | null,
): "active" | "passive" | "unknown" {
  // CRITICAL: If field doesn't exist at all, we can't know
  // Old data (pre-2018) often lacks this field entirely
  if (reasonStartRaw === undefined || reasonStartRaw === null) {
    return "unknown";
  }

  const r = reasonStartRaw.trim().toLowerCase();

  // Empty string is ambiguous but Spotify sometimes uses it for algorithm picks
  // We classify it as passive with low confidence
  if (r === "") {
    return "passive";
  }

  // Eksplisitte brukarhandlingar = AKTIV
  const ACTIVE = new Set([
    "clickrow", // klikka på ei rad
    "playbtn", // trykte play
    "fwdbtn", // neste-knapp
    "backbtn", // tilbake-knapp
    "search", // fann via søk
    "artist", // navigerte via artist
    "uriopen", // opna via link/URI
    "clickside", // klikka i sidefeltet
    "trackdone", // neste låt i album/spilleliste du valde
  ]);

  // Algoritmestyrte val = PASSIV (kun når me VET det er algoritme)
  // NB: Desse verdiane må være ukontroversielle - kun ting som HEILT KLART
  // er algoritmestyrte utan brukarhandling
  const PASSIVE = new Set([
    "unknown", // Spotify eksplisitt seier "unknown" = algoritme valde
    "appload", // app-oppstart, Spotify bestemte (ingen brukarhandling)
    "remote", // pusha frå anna enheit (ikkje aktiv handling på denne enheten)
    "endplay", // slutt på kø, algoritme tek over
  ]);

  // Verdiar som er tvetydige historisk - kan ikkje klassifiserast trygt
  // "popup" kunne i gamle dagar være albumførehandsvisning brukaren klikka på
  const AMBIGUOUS = new Set([
    "popup", // historisk uklar meining
  ]);

  if (ACTIVE.has(r)) return "active";
  if (PASSIVE.has(r)) return "passive";
  if (AMBIGUOUS.has(r)) return "unknown";

  // Ukjende verdiar: sjekk om dei ser aktive ut
  if (r.includes("click") || r.includes("btn") || r.includes("play")) {
    return "active";
  }

  // For andre ukjende verdiar, ver konservativ - me veit ikkje
  return "unknown";
}

export function analyze(
  rows: SpotifyStreamRow[],
  cfg: AnalysisConfig,
): AnalysisResult {
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
      estValueNOK: number;
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
  let unknownMsPlayed = 0;
  let activePlays = 0;
  let passivePlays = 0;
  let unknownPlays = 0;
  let activeEstValueNOKAccum = 0;
  let passiveEstValueNOKAccum = 0;
  let autoplayEstValueNOKAccum = 0;

  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    const ms = getMsPlayed(r);
    totalMsPlayed += ms;

    if (ms < cfg.minMsPlayedToCount) continue;

    const artist = safeStr(r.master_metadata_album_artist_name);
    if (!artist) continue;

    // Historisk rate per stream basert på tidspunktet for streamen
    const rowDate = new Date(r.ts ?? "");
    const rowYear = isNaN(rowDate.getTime()) ? 2024 : rowDate.getFullYear();
    const rowMonth = isNaN(rowDate.getTime()) ? 1 : rowDate.getMonth() + 1;
    const rowRate = getRatePerStream(rowYear, rowMonth, cfg.locale);

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
        autoplayEstValueNOKAccum += rowRate;

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
        estValueNOK: 0,
        byAlbum: new Map(),
      });
    }

    const a = byArtist.get(artist)!;
    a.msPlayed += ms;
    a.plays += 1;
    a.estValueNOK += rowRate;

    // Only count active/passive for streams where we KNOW the classification
    // "unknown" streams (old data or ambiguous) are tracked separately
    if (cls === "active") {
      a.activeMs += ms;
      activeMsPlayed += ms;
      activePlays++;
      activeEstValueNOKAccum += rowRate;
    } else if (cls === "passive") {
      a.passiveMs += ms;
      passiveMsPlayed += ms;
      passivePlays++;
      passiveEstValueNOKAccum += rowRate;
    } else {
      // cls === "unknown"
      unknownMsPlayed += ms;
      unknownPlays++;
    }

    if (!a.byAlbum.has(album)) a.byAlbum.set(album, { msPlayed: 0, plays: 0 });
    const al = a.byAlbum.get(album)!;
    al.msPlayed += ms;
    al.plays += 1;
  }

  const artists: ArtistAgg[] = Array.from(byArtist.entries()).map(
    ([artist, a]) => {
      const estStreams = a.plays;
      const estValueNOK = a.estValueNOK;
      const albumEquivalent = estValueNOK / albumPrice;

      const topAlbums = Array.from(a.byAlbum.entries())
        .map(([album, v]) => ({ album, msPlayed: v.msPlayed, plays: v.plays }))
        .sort((x, y) => y.msPlayed - x.msPlayed);

      // activeShare only meaningful when we have classification data
      // Use (activeMs + passiveMs) as denominator, not total msPlayed
      const knownClassified = a.activeMs + a.passiveMs;
      const activeShare =
        knownClassified > 0 ? a.activeMs / knownClassified : 0;

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

  // For active/passive share: calculate based on ALL counted ms, with unknown as separate category
  const totalCountedMs = Math.max(1, countedMsPlayed);
  const activeShare = activeMsPlayed / totalCountedMs;
  const passiveShare = passiveMsPlayed / totalCountedMs;
  const unknownShare = unknownMsPlayed / totalCountedMs;

  // Kvar kvalifiserande rad (ms_played >= terskel) = 1 stream
  const activeEstStreams = activePlays;
  const passiveEstStreams = passivePlays;
  const unknownEstStreams = unknownPlays;

  const activeEstValueNOK = activeEstValueNOKAccum;
  const passiveEstValueNOK = passiveEstValueNOKAccum;

  // Autoplay statistikk
  const autoplayShare = autoplayAfterEndplayMs / Math.max(1, countedMsPlayed);
  const autoplayEstStreams = autoplayEventsCount;
  const autoplayEstValueNOK = autoplayEstValueNOKAccum;

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
    unknownMsPlayed,
    activeShare,
    passiveShare,
    unknownShare,

    activeEstStreams,
    passiveEstStreams,
    unknownEstStreams,

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

// ─── Chart aggregation types ─────────────────────────────────────

export type DayAggregation = {
  date: string; // YYYY-MM-DD
  streams: number;
  msPlayed: number;
  uniqueArtists: number;
  // Active/passive split (only for data with reason_start)
  activeStreams: number;
  passiveStreams: number;
  activeMsPlayed: number;
  passiveMsPlayed: number;
  // Unknown = data where we can't classify (old data lacks reason_start)
  unknownStreams: number;
  unknownMsPlayed: number;
};

export type HourAggregation = {
  hour: number; // 0-23
  streams: number;
  msPlayed: number;
};

export type WeekdayAggregation = {
  day: number; // 0=Sunday, 1=Monday, etc.
  dayName: string;
  streams: number;
  msPlayed: number;
  avgStreams: number;
  avgMsPlayed: number;
};

export type MonthAggregation = {
  month: string; // YYYY-MM
  streams: number;
  msPlayed: number;
  uniqueArtists: number;
};

// ─── Chart aggregation functions ─────────────────────────────────

export function aggregateByDay(
  rows: SpotifyStreamRow[],
  minMsPlayed = 30000,
): DayAggregation[] {
  const byDay = new Map<
    string,
    {
      streams: number;
      msPlayed: number;
      artists: Set<string>;
      activeStreams: number;
      passiveStreams: number;
      activeMsPlayed: number;
      passiveMsPlayed: number;
      unknownStreams: number;
      unknownMsPlayed: number;
    }
  >();

  for (const row of rows) {
    const ms = getMsPlayed(row);
    if (ms < minMsPlayed) continue;

    const ts = row.ts;
    if (!ts) continue;

    const date = new Date(ts);
    if (isNaN(date.getTime())) continue;

    const dayKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
    const artist = safeStr(row.master_metadata_album_artist_name);
    const classification = classifyStart(row.reason_start);

    if (!byDay.has(dayKey)) {
      byDay.set(dayKey, {
        streams: 0,
        msPlayed: 0,
        artists: new Set(),
        activeStreams: 0,
        passiveStreams: 0,
        activeMsPlayed: 0,
        passiveMsPlayed: 0,
        unknownStreams: 0,
        unknownMsPlayed: 0,
      });
    }

    const d = byDay.get(dayKey)!;
    d.streams++;
    d.msPlayed += ms;
    if (artist) d.artists.add(artist);

    if (classification === "active") {
      d.activeStreams++;
      d.activeMsPlayed += ms;
    } else if (classification === "passive") {
      d.passiveStreams++;
      d.passiveMsPlayed += ms;
    } else {
      // "unknown" - data without reason_start field
      d.unknownStreams++;
      d.unknownMsPlayed += ms;
    }
  }

  return Array.from(byDay.entries())
    .map(([date, data]) => ({
      date,
      streams: data.streams,
      msPlayed: data.msPlayed,
      uniqueArtists: data.artists.size,
      activeStreams: data.activeStreams,
      passiveStreams: data.passiveStreams,
      activeMsPlayed: data.activeMsPlayed,
      passiveMsPlayed: data.passiveMsPlayed,
      unknownStreams: data.unknownStreams,
      unknownMsPlayed: data.unknownMsPlayed,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function aggregateByHour(
  rows: SpotifyStreamRow[],
  minMsPlayed = 30000,
): HourAggregation[] {
  const byHour = new Map<number, { streams: number; msPlayed: number }>();

  // Initialize all hours
  for (let h = 0; h < 24; h++) {
    byHour.set(h, { streams: 0, msPlayed: 0 });
  }

  for (const row of rows) {
    const ms = getMsPlayed(row);
    if (ms < minMsPlayed) continue;

    const ts = row.ts;
    if (!ts) continue;

    const date = new Date(ts);
    if (isNaN(date.getTime())) continue;

    const hour = date.getHours();
    const h = byHour.get(hour)!;
    h.streams++;
    h.msPlayed += ms;
  }

  return Array.from(byHour.entries())
    .map(([hour, data]) => ({
      hour,
      streams: data.streams,
      msPlayed: data.msPlayed,
    }))
    .sort((a, b) => a.hour - b.hour);
}

export function aggregateByWeekday(
  rows: SpotifyStreamRow[],
  minMsPlayed = 30000,
  locale: Locale = "no",
): WeekdayAggregation[] {
  const byWeekday = new Map<
    number,
    { streams: number; msPlayed: number; dayCount: Set<string> }
  >();

  const dayNames =
    locale === "en"
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];

  // Initialize all days
  for (let d = 0; d < 7; d++) {
    byWeekday.set(d, { streams: 0, msPlayed: 0, dayCount: new Set() });
  }

  for (const row of rows) {
    const ms = getMsPlayed(row);
    if (ms < minMsPlayed) continue;

    const ts = row.ts;
    if (!ts) continue;

    const date = new Date(ts);
    if (isNaN(date.getTime())) continue;

    const weekday = date.getDay(); // 0 = Sunday
    const dayKey = date.toISOString().slice(0, 10);

    const w = byWeekday.get(weekday)!;
    w.streams++;
    w.msPlayed += ms;
    w.dayCount.add(dayKey);
  }

  return Array.from(byWeekday.entries())
    .map(([day, data]) => {
      const numDays = Math.max(1, data.dayCount.size);
      return {
        day,
        dayName: dayNames[day],
        streams: data.streams,
        msPlayed: data.msPlayed,
        avgStreams: Math.round(data.streams / numDays),
        avgMsPlayed: Math.round(data.msPlayed / numDays),
      };
    })
    .sort((a, b) => {
      // Reorder so Monday is first (more intuitive in Norway)
      const orderA = a.day === 0 ? 7 : a.day;
      const orderB = b.day === 0 ? 7 : b.day;
      return orderA - orderB;
    });
}

export function aggregateByMonth(
  rows: SpotifyStreamRow[],
  minMsPlayed = 30000,
): MonthAggregation[] {
  const byMonth = new Map<
    string,
    { streams: number; msPlayed: number; artists: Set<string> }
  >();

  for (const row of rows) {
    const ms = getMsPlayed(row);
    if (ms < minMsPlayed) continue;

    const ts = row.ts;
    if (!ts) continue;

    const date = new Date(ts);
    if (isNaN(date.getTime())) continue;

    const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
    const artist = safeStr(row.master_metadata_album_artist_name);

    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, { streams: 0, msPlayed: 0, artists: new Set() });
    }

    const m = byMonth.get(monthKey)!;
    m.streams++;
    m.msPlayed += ms;
    if (artist) m.artists.add(artist);
  }

  return Array.from(byMonth.entries())
    .map(([month, data]) => ({
      month,
      streams: data.streams,
      msPlayed: data.msPlayed,
      uniqueArtists: data.artists.size,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
