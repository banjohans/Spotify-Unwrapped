// src/lib/labelLookup.ts
// Label/publisher lookup using free APIs (MusicBrainz, Discogs)
// Optimized for large datasets with Top-N prioritization and parallel lookups

/**
 * Cached track label info
 */
export type TrackLabelInfo = {
  trackId: string; // Spotify track ID
  trackName: string;
  artist: string;
  label: string | null;
  labelId: string | null;
  parentLabel: string | null; // Major label parent (Universal, Sony, Warner, etc.)
  isrc: string | null;
  releaseYear: number | null;
  lookupSource: "musicbrainz" | "discogs" | "estimated" | "cache" | "unknown";
  lastUpdated: number; // timestamp
};

/**
 * Major label conglomerates and their subsidiaries
 * Used to map subsidiary labels to parent companies
 */
export const MAJOR_LABEL_GROUPS: Record<string, string[]> = {
  "Universal Music Group": [
    "universal",
    "interscope",
    "republic",
    "def jam",
    "capitol",
    "polydor",
    "virgin",
    "emi",
    "island",
    "geffen",
    "motown",
    "mercury",
    "decca",
    "verve",
    "blue note",
    "harvest",
    "umg",
    "aftermath",
    "bravado",
    "caroline",
  ],
  "Sony Music Entertainment": [
    "sony",
    "columbia",
    "rca",
    "epic",
    "arista",
    "legacy",
    "j-records",
    "syco",
    "kemosabe",
    "provident",
    "masterworks",
    "portrait",
    "jive",
    "zomba",
  ],
  "Warner Music Group": [
    "warner",
    "atlantic",
    "elektra",
    "asylum",
    "rhino",
    "nonesuch",
    "reprise",
    "sire",
    "parlophone",
    "roadrunner",
    "fueled by ramen",
    "big beat",
    "300 entertainment",
    "wmg",
    "east west",
  ],
  Independent: [
    "independent",
    "indie",
    "self-released",
    "unsigned",
    "bandcamp",
    "distrokid",
    "tunecore",
    "cd baby",
    "amuse",
    "believe",
    "awal",
    "ditto",
    "routenote",
  ],
};

/**
 * Configuration
 */
const CONFIG = {
  CACHE_KEY: "spotify-unwrapped-label-cache-v2",
  CACHE_VERSION: 2,
  CACHE_EXPIRY_MS: 30 * 24 * 60 * 60 * 1000, // 30 days

  // Top-N: Only lookup this many tracks (sorted by listening time)
  TOP_N_TRACKS: 500,

  // Minimum coverage: If TOP_N doesn't cover this % of listening time, increase
  MIN_COVERAGE_PERCENT: 75,

  // Rate limits
  MUSICBRAINZ_INTERVAL_MS: 1100, // 1 req/sec
  DISCOGS_INTERVAL_MS: 1000, // 60 req/min -> 1 req/sec to be safe
};

/**
 * Rate limiter for API calls
 */
class RateLimiter {
  private lastCall = 0;
  private queue: Array<() => void> = [];
  private processing = false;
  private minIntervalMs: number;

  constructor(minIntervalMs: number) {
    this.minIntervalMs = minIntervalMs;
  }

  async throttle(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const elapsed = now - this.lastCall;
      if (elapsed < this.minIntervalMs) {
        await new Promise((r) => setTimeout(r, this.minIntervalMs - elapsed));
      }
      this.lastCall = Date.now();
      const resolve = this.queue.shift();
      resolve?.();
    }

    this.processing = false;
  }
}

// API rate limiters
const musicBrainzLimiter = new RateLimiter(CONFIG.MUSICBRAINZ_INTERVAL_MS);
const discogsLimiter = new RateLimiter(CONFIG.DISCOGS_INTERVAL_MS);

/**
 * Load cache from localStorage
 */
function loadCache(): Map<string, TrackLabelInfo> {
  try {
    const stored = localStorage.getItem(CONFIG.CACHE_KEY);
    if (!stored) return new Map();

    const parsed = JSON.parse(stored);
    if (parsed.version !== CONFIG.CACHE_VERSION) {
      localStorage.removeItem(CONFIG.CACHE_KEY);
      return new Map();
    }

    const now = Date.now();
    const entries: [string, TrackLabelInfo][] = parsed.entries.filter(
      ([, info]: [string, TrackLabelInfo]) =>
        now - info.lastUpdated < CONFIG.CACHE_EXPIRY_MS,
    );

    return new Map(entries);
  } catch {
    return new Map();
  }
}

/**
 * Save cache to localStorage
 */
function saveCache(cache: Map<string, TrackLabelInfo>) {
  try {
    const data = {
      version: CONFIG.CACHE_VERSION,
      entries: Array.from(cache.entries()),
    };
    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save label cache:", e);
  }
}

/**
 * Determine parent label group from label name
 */
export function getParentLabel(labelName: string | null): string | null {
  if (!labelName) return null;

  const lower = labelName.toLowerCase();

  for (const [parent, subsidiaries] of Object.entries(MAJOR_LABEL_GROUPS)) {
    for (const sub of subsidiaries) {
      if (lower.includes(sub)) {
        return parent;
      }
    }
  }

  return "Independent / Other";
}

/**
 * Extract Spotify track ID from URI
 */
export function extractSpotifyTrackId(uri: string | undefined): string | null {
  if (!uri) return null;

  const uriMatch = uri.match(/spotify:track:([a-zA-Z0-9]+)/);
  if (uriMatch) return uriMatch[1];

  const urlMatch = uri.match(/track\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];

  return null;
}

/**
 * Search MusicBrainz for recording info
 */
async function searchMusicBrainz(
  trackName: string,
  artist: string,
): Promise<{ label: string | null; isrc: string | null } | null> {
  await musicBrainzLimiter.throttle();

  try {
    // Clean up search terms
    const cleanTrack = trackName.replace(/['"]/g, "").slice(0, 100);
    const cleanArtist = artist.replace(/['"]/g, "").slice(0, 100);

    const query = encodeURIComponent(
      `recording:"${cleanTrack}" AND artist:"${cleanArtist}"`,
    );
    const searchUrl = `https://musicbrainz.org/ws/2/recording?query=${query}&fmt=json&limit=1`;

    const searchRes = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "SpotifyUnwrapped/1.0 (github.com/banjohans/Spotify-Unwrapped)",
      },
    });

    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    if (!searchData.recordings?.length) return null;

    const recording = searchData.recordings[0];
    const recordingId = recording.id;

    // Get detailed info with release relationships
    await musicBrainzLimiter.throttle();
    const detailUrl = `https://musicbrainz.org/ws/2/recording/${recordingId}?inc=releases+isrcs+labels&fmt=json`;

    const detailRes = await fetch(detailUrl, {
      headers: {
        "User-Agent":
          "SpotifyUnwrapped/1.0 (github.com/banjohans/Spotify-Unwrapped)",
      },
    });

    if (!detailRes.ok) return null;

    const detail = await detailRes.json();
    const isrc = detail.isrcs?.[0] || null;

    let label: string | null = null;
    for (const release of detail.releases || []) {
      if (release["label-info"]?.length) {
        const labelInfo = release["label-info"][0];
        if (labelInfo.label?.name) {
          label = labelInfo.label.name;
          break;
        }
      }
    }

    return { label, isrc };
  } catch (e) {
    console.warn("MusicBrainz lookup failed:", e);
    return null;
  }
}

/**
 * Search Discogs for release info
 */
async function searchDiscogs(
  trackName: string,
  artist: string,
): Promise<{ label: string | null; year: number | null } | null> {
  await discogsLimiter.throttle();

  try {
    // Discogs search - search for release with track and artist
    const cleanTrack = trackName.replace(/['"]/g, "").slice(0, 50);
    const cleanArtist = artist.replace(/['"]/g, "").slice(0, 50);

    const query = encodeURIComponent(`${cleanArtist} ${cleanTrack}`);
    const searchUrl = `https://api.discogs.com/database/search?q=${query}&type=release&per_page=3`;

    const searchRes = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "SpotifyUnwrapped/1.0 +https://github.com/banjohans/Spotify-Unwrapped",
      },
    });

    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    if (!searchData.results?.length) return null;

    // Find best match
    const result = searchData.results[0];
    const label = result.label?.[0] || null;
    const year = result.year || null;

    return { label, year };
  } catch (e) {
    console.warn("Discogs lookup failed:", e);
    return null;
  }
}

/**
 * Lookup label info for a single track (tries MusicBrainz first, then Discogs)
 */
async function lookupTrackLabelWithFallback(
  trackId: string,
  trackName: string,
  artist: string,
  cache: Map<string, TrackLabelInfo>,
  useDiscogsFallback: boolean = true,
): Promise<TrackLabelInfo> {
  // Check cache first
  if (cache.has(trackId)) {
    return cache.get(trackId)!;
  }

  // Try MusicBrainz first
  const mbResult = await searchMusicBrainz(trackName, artist);

  if (mbResult?.label) {
    const info: TrackLabelInfo = {
      trackId,
      trackName,
      artist,
      label: mbResult.label,
      labelId: null,
      parentLabel: getParentLabel(mbResult.label),
      isrc: mbResult.isrc,
      releaseYear: null,
      lookupSource: "musicbrainz",
      lastUpdated: Date.now(),
    };
    cache.set(trackId, info);
    return info;
  }

  // Fallback to Discogs if enabled
  if (useDiscogsFallback) {
    const discogsResult = await searchDiscogs(trackName, artist);

    if (discogsResult?.label) {
      const info: TrackLabelInfo = {
        trackId,
        trackName,
        artist,
        label: discogsResult.label,
        labelId: null,
        parentLabel: getParentLabel(discogsResult.label),
        isrc: null,
        releaseYear: discogsResult.year,
        lookupSource: "discogs",
        lastUpdated: Date.now(),
      };
      cache.set(trackId, info);
      return info;
    }
  }

  // No result found
  const info: TrackLabelInfo = {
    trackId,
    trackName,
    artist,
    label: null,
    labelId: null,
    parentLabel: null,
    isrc: null,
    releaseYear: null,
    lookupSource: "unknown",
    lastUpdated: Date.now(),
  };
  cache.set(trackId, info);
  return info;
}

/**
 * Progress callback type
 */
export type LookupProgressCallback = (progress: {
  completed: number;
  total: number;
  phase: "lookup" | "estimation";
  currentTrack: string;
  estimatedSecondsRemaining: number;
  coveragePercent: number;
}) => void;

/**
 * Track input type for batch lookup
 */
export type TrackInput = {
  trackId: string;
  trackName: string;
  artist: string;
  msPlayed: number;
  plays: number;
  isAssisted: boolean;
};

/**
 * Optimized batch lookup with Top-N prioritization and artist estimation
 */
export async function batchLookupLabels(
  tracks: TrackInput[],
  onProgress?: LookupProgressCallback,
  abortSignal?: AbortSignal,
): Promise<{
  trackLabels: Map<string, TrackLabelInfo>;
  labelStats: LabelStats;
}> {
  const cache = loadCache();
  const trackLabels = new Map<string, TrackLabelInfo>();

  // Dedupe and aggregate tracks by ID
  const trackMap = new Map<string, TrackInput>();
  for (const t of tracks) {
    const existing = trackMap.get(t.trackId);
    if (existing) {
      existing.msPlayed += t.msPlayed;
      existing.plays += t.plays;
    } else {
      trackMap.set(t.trackId, { ...t });
    }
  }

  // Sort by listening time (most played first)
  const sortedTracks = Array.from(trackMap.values()).sort(
    (a, b) => b.msPlayed - a.msPlayed,
  );

  const totalMs = sortedTracks.reduce((sum, t) => sum + t.msPlayed, 0);

  // Calculate how many tracks to lookup to hit coverage target
  let cumulativeMs = 0;
  let topNCount = 0;
  for (const track of sortedTracks) {
    cumulativeMs += track.msPlayed;
    topNCount++;
    if (
      topNCount >= CONFIG.TOP_N_TRACKS ||
      cumulativeMs / totalMs >= CONFIG.MIN_COVERAGE_PERCENT / 100
    ) {
      break;
    }
  }

  const tracksToLookup = sortedTracks.slice(0, topNCount);
  const tracksToEstimate = sortedTracks.slice(topNCount);

  console.log(
    `Label lookup: ${tracksToLookup.length} tracks to lookup, ${tracksToEstimate.length} to estimate`,
  );
  console.log(
    `Coverage: Top ${topNCount} tracks = ${((cumulativeMs / totalMs) * 100).toFixed(1)}% of listening time`,
  );

  // Phase 1: API lookups for top tracks
  const startTime = Date.now();
  let completed = 0;

  for (const track of tracksToLookup) {
    if (abortSignal?.aborted) break;

    const info = await lookupTrackLabelWithFallback(
      track.trackId,
      track.trackName,
      track.artist,
      cache,
      true, // Use Discogs fallback
    );

    trackLabels.set(track.trackId, info);
    completed++;

    // Report progress
    if (onProgress && completed % 5 === 0) {
      const elapsedMs = Date.now() - startTime;
      const avgMsPerTrack = elapsedMs / completed;
      const remaining = tracksToLookup.length - completed;

      const currentCoverageMs = sortedTracks
        .slice(0, completed)
        .reduce((sum, t) => sum + t.msPlayed, 0);

      onProgress({
        completed,
        total: tracksToLookup.length,
        phase: "lookup",
        currentTrack: `${track.trackName} - ${track.artist}`,
        estimatedSecondsRemaining: Math.ceil(
          (remaining * avgMsPerTrack) / 1000,
        ),
        coveragePercent: Math.round((currentCoverageMs / totalMs) * 100),
      });
    }

    // Save cache periodically
    if (completed % 25 === 0) {
      saveCache(cache);
    }
  }

  // Phase 2: Artist-based estimation for remaining tracks
  if (!abortSignal?.aborted) {
    // Build artist -> label mapping from looked-up tracks
    const artistLabelMap = new Map<
      string,
      { label: string; parentLabel: string; count: number }
    >();

    for (const info of trackLabels.values()) {
      if (info.label && info.lookupSource !== "estimated") {
        const existing = artistLabelMap.get(info.artist);
        if (existing) {
          existing.count++;
        } else {
          artistLabelMap.set(info.artist, {
            label: info.label,
            parentLabel: info.parentLabel || "Independent / Other",
            count: 1,
          });
        }
      }
    }

    // Estimate labels for remaining tracks
    let estimatedCount = 0;
    for (const track of tracksToEstimate) {
      if (abortSignal?.aborted) break;

      // Check if in cache first
      if (cache.has(track.trackId)) {
        trackLabels.set(track.trackId, cache.get(track.trackId)!);
        continue;
      }

      // Try artist-based estimation
      const artistLabel = artistLabelMap.get(track.artist);

      const info: TrackLabelInfo = {
        trackId: track.trackId,
        trackName: track.trackName,
        artist: track.artist,
        label: artistLabel?.label || null,
        labelId: null,
        parentLabel: artistLabel?.parentLabel || null,
        isrc: null,
        releaseYear: null,
        lookupSource: artistLabel ? "estimated" : "unknown",
        lastUpdated: Date.now(),
      };

      trackLabels.set(track.trackId, info);
      cache.set(track.trackId, info);
      estimatedCount++;
    }

    if (onProgress) {
      onProgress({
        completed: tracksToLookup.length,
        total: tracksToLookup.length,
        phase: "estimation",
        currentTrack: `${estimatedCount} tracks estimated from artist data`,
        estimatedSecondsRemaining: 0,
        coveragePercent: 100,
      });
    }
  }

  // Final cache save
  saveCache(cache);

  // Calculate statistics
  const labelStats = calculateLabelStats(tracks, trackLabels);

  return { trackLabels, labelStats };
}

/**
 * Label statistics aggregation
 */
export type LabelStats = {
  byLabel: Array<{
    label: string;
    parentLabel: string;
    msPlayed: number;
    plays: number;
    activePlays: number;
    assistedPlays: number;
    uniqueTracks: number;
    estimatedRevenue: number;
  }>;
  byParentLabel: Array<{
    parentLabel: string;
    msPlayed: number;
    plays: number;
    activePlays: number;
    assistedPlays: number;
    uniqueTracks: number;
    uniqueLabels: number;
    estimatedRevenue: number;
  }>;
  unknownCount: number;
  unknownMs: number;
  lookupCoverage: number;
  estimatedCount: number;
  apiLookupCount: number;
};

/**
 * Calculate aggregated label statistics
 */
function calculateLabelStats(
  tracks: TrackInput[],
  trackLabels: Map<string, TrackLabelInfo>,
): LabelStats {
  const labelMap = new Map<
    string,
    {
      label: string;
      parentLabel: string;
      msPlayed: number;
      plays: number;
      activePlays: number;
      assistedPlays: number;
      trackIds: Set<string>;
    }
  >();

  let unknownCount = 0;
  let unknownMs = 0;
  let totalTracks = 0;
  let successfulLookups = 0;
  let estimatedCount = 0;
  let apiLookupCount = 0;

  for (const track of tracks) {
    totalTracks++;
    const info = trackLabels.get(track.trackId);

    if (!info?.label) {
      unknownCount += track.plays;
      unknownMs += track.msPlayed;
      continue;
    }

    successfulLookups++;
    if (info.lookupSource === "estimated") {
      estimatedCount++;
    } else if (
      info.lookupSource === "musicbrainz" ||
      info.lookupSource === "discogs"
    ) {
      apiLookupCount++;
    }

    const label = info.label;
    const parentLabel = info.parentLabel || "Independent / Other";

    if (!labelMap.has(label)) {
      labelMap.set(label, {
        label,
        parentLabel,
        msPlayed: 0,
        plays: 0,
        activePlays: 0,
        assistedPlays: 0,
        trackIds: new Set(),
      });
    }

    const entry = labelMap.get(label)!;
    entry.msPlayed += track.msPlayed;
    entry.plays += track.plays;
    entry.trackIds.add(track.trackId);

    if (track.isAssisted) {
      entry.assistedPlays += track.plays;
    } else {
      entry.activePlays += track.plays;
    }
  }

  // Convert to array and sort by plays
  const byLabel = Array.from(labelMap.values())
    .map((entry) => ({
      label: entry.label,
      parentLabel: entry.parentLabel,
      msPlayed: entry.msPlayed,
      plays: entry.plays,
      activePlays: entry.activePlays,
      assistedPlays: entry.assistedPlays,
      uniqueTracks: entry.trackIds.size,
      estimatedRevenue: Math.round(entry.plays * 0.04 * 100) / 100,
    }))
    .sort((a, b) => b.plays - a.plays);

  // Aggregate by parent label
  const parentMap = new Map<
    string,
    {
      parentLabel: string;
      msPlayed: number;
      plays: number;
      activePlays: number;
      assistedPlays: number;
      trackIds: Set<string>;
      labels: Set<string>;
    }
  >();

  for (const entry of labelMap.values()) {
    const parent = entry.parentLabel;

    if (!parentMap.has(parent)) {
      parentMap.set(parent, {
        parentLabel: parent,
        msPlayed: 0,
        plays: 0,
        activePlays: 0,
        assistedPlays: 0,
        trackIds: new Set(),
        labels: new Set(),
      });
    }

    const parentEntry = parentMap.get(parent)!;
    parentEntry.msPlayed += entry.msPlayed;
    parentEntry.plays += entry.plays;
    parentEntry.activePlays += entry.activePlays;
    parentEntry.assistedPlays += entry.assistedPlays;
    parentEntry.labels.add(entry.label);
    for (const tid of entry.trackIds) {
      parentEntry.trackIds.add(tid);
    }
  }

  const byParentLabel = Array.from(parentMap.values())
    .map((entry) => ({
      parentLabel: entry.parentLabel,
      msPlayed: entry.msPlayed,
      plays: entry.plays,
      activePlays: entry.activePlays,
      assistedPlays: entry.assistedPlays,
      uniqueTracks: entry.trackIds.size,
      uniqueLabels: entry.labels.size,
      estimatedRevenue: Math.round(entry.plays * 0.04 * 100) / 100,
    }))
    .sort((a, b) => b.plays - a.plays);

  return {
    byLabel,
    byParentLabel,
    unknownCount,
    unknownMs,
    lookupCoverage: totalTracks > 0 ? successfulLookups / totalTracks : 0,
    estimatedCount,
    apiLookupCount,
  };
}

/**
 * Get cached label stats without new lookups
 */
export function getCachedLabelStats(tracks: TrackInput[]): {
  labelStats: LabelStats;
  trackLabels: Map<string, TrackLabelInfo>;
  cachedCount: number;
  uncachedCount: number;
} {
  const cache = loadCache();

  let cachedCount = 0;
  let uncachedCount = 0;

  for (const track of tracks) {
    if (cache.has(track.trackId)) {
      cachedCount++;
    } else {
      uncachedCount++;
    }
  }

  const labelStats = calculateLabelStats(tracks, cache);

  return { labelStats, trackLabels: cache, cachedCount, uncachedCount };
}

/**
 * Clear the label cache
 */
export function clearLabelCache() {
  localStorage.removeItem(CONFIG.CACHE_KEY);
}

/**
 * Get estimated lookup time based on uncached tracks
 */
export function estimateLookupTime(uncachedCount: number): {
  minMinutes: number;
  maxMinutes: number;
  tracksToLookup: number;
} {
  const tracksToLookup = Math.min(uncachedCount, CONFIG.TOP_N_TRACKS);
  // ~2 seconds per track (MusicBrainz + potential Discogs fallback)
  const minMinutes = Math.ceil((tracksToLookup * 2) / 60);
  const maxMinutes = Math.ceil((tracksToLookup * 4) / 60);

  return { minMinutes, maxMinutes, tracksToLookup };
}
