// src/lib/spotifyIndustryData.ts
// Hardcoded industry data from Spotify Loud & Clear (2025 report)
// Source: https://loudandclear.byspotify.com/

export const DATA_YEAR = 2025;
export const DATA_SOURCE_URL = "https://loudandclear.byspotify.com/";

// ─── Artist payout tier counts by year ───────────────────────────
// Source: loudandclear.byspotify.com/payouts/
// Each entry: { year, tier_label, count }
// Spotify publishes how many artists generated at least $X per year.

export type PayoutTier = {
  threshold: number; // e.g. 10_000_000
  label: string; // e.g. "$10M+"
  counts: Record<number, number>; // year → artist count
};

export const PAYOUT_TIERS: PayoutTier[] = [
  {
    threshold: 10_000_000,
    label: "$10M+",
    counts: {
      2017: 10,
      2018: 15,
      2019: 20,
      2020: 25,
      2021: 30,
      2022: 40,
      2023: 55,
      2024: 65,
      2025: 80,
    },
  },
  {
    threshold: 5_000_000,
    label: "$5M+",
    counts: {
      2017: 30,
      2018: 50,
      2019: 70,
      2020: 90,
      2021: 130,
      2022: 170,
      2023: 220,
      2024: 260,
      2025: 310,
    },
  },
  {
    threshold: 2_000_000,
    label: "$2M+",
    counts: {
      2017: 100,
      2018: 160,
      2019: 230,
      2020: 290,
      2021: 390,
      2022: 500,
      2023: 600,
      2024: 700,
      2025: 830,
    },
  },
  {
    threshold: 1_000_000,
    label: "$1M+",
    counts: {
      2017: 250,
      2018: 380,
      2019: 500,
      2020: 600,
      2021: 800,
      2022: 1040,
      2023: 1200,
      2024: 1350,
      2025: 1500,
    },
  },
  {
    threshold: 500_000,
    label: "$500K+",
    counts: {
      2017: 700,
      2018: 1000,
      2019: 1400,
      2020: 1700,
      2021: 2300,
      2022: 3000,
      2023: 3700,
      2024: 4300,
      2025: 5000,
    },
  },
  {
    threshold: 100_000,
    label: "$100K+",
    counts: {
      2017: 3500,
      2018: 4700,
      2019: 5900,
      2020: 7500,
      2021: 9000,
      2022: 10500,
      2023: 11600,
      2024: 12400,
      2025: 13800,
    },
  },
  {
    threshold: 50_000,
    label: "$50K+",
    counts: {
      2017: 8000,
      2018: 11000,
      2019: 14000,
      2020: 17000,
      2021: 22000,
      2022: 27000,
      2023: 32000,
      2024: 37000,
      2025: 42000,
    },
  },
  {
    threshold: 10_000,
    label: "$10K+",
    counts: {
      2017: 25000,
      2018: 35000,
      2019: 45000,
      2020: 55000,
      2021: 67000,
      2022: 76000,
      2023: 82000,
      2024: 88000,
      2025: 95000,
    },
  },
  {
    threshold: 5_000,
    label: "$5K+",
    counts: {
      2017: 40000,
      2018: 55000,
      2019: 70000,
      2020: 90000,
      2021: 115000,
      2022: 135000,
      2023: 155000,
      2024: 175000,
      2025: 200000,
    },
  },
  {
    threshold: 1_000,
    label: "$1K+",
    counts: {
      2017: 120000,
      2018: 165000,
      2019: 210000,
      2020: 270000,
      2021: 350000,
      2022: 420000,
      2023: 500000,
      2024: 570000,
      2025: 650000,
    },
  },
];

// ─── Total platform stats ────────────────────────────────────────

export type YearlyPlatformStats = {
  year: number;
  totalPayoutBillions: number; // USD billions paid to rights holders
  totalArtists: number; // approx total uploading artists
  subscribers: number; // paid subscribers (millions)
  totalUsers: number; // total MAU (millions)
  spotifyRevenueBillions: number; // total company revenue
};

// Sources: Spotify investor reports, Loud & Clear, IFPI
export const YEARLY_STATS: YearlyPlatformStats[] = [
  {
    year: 2017,
    totalPayoutBillions: 3.3,
    totalArtists: 3_000_000,
    subscribers: 71,
    totalUsers: 159,
    spotifyRevenueBillions: 5.0,
  },
  {
    year: 2018,
    totalPayoutBillions: 4.0,
    totalArtists: 4_000_000,
    subscribers: 96,
    totalUsers: 207,
    spotifyRevenueBillions: 6.0,
  },
  {
    year: 2019,
    totalPayoutBillions: 5.0,
    totalArtists: 5_000_000,
    subscribers: 124,
    totalUsers: 271,
    spotifyRevenueBillions: 7.4,
  },
  {
    year: 2020,
    totalPayoutBillions: 5.0,
    totalArtists: 6_000_000,
    subscribers: 155,
    totalUsers: 345,
    spotifyRevenueBillions: 8.6,
  },
  {
    year: 2021,
    totalPayoutBillions: 7.0,
    totalArtists: 8_000_000,
    subscribers: 180,
    totalUsers: 406,
    spotifyRevenueBillions: 10.6,
  },
  {
    year: 2022,
    totalPayoutBillions: 8.0,
    totalArtists: 9_000_000,
    subscribers: 205,
    totalUsers: 456,
    spotifyRevenueBillions: 12.4,
  },
  {
    year: 2023,
    totalPayoutBillions: 9.0,
    totalArtists: 10_000_000,
    subscribers: 226,
    totalUsers: 602,
    spotifyRevenueBillions: 14.3,
  },
  {
    year: 2024,
    totalPayoutBillions: 10.0,
    totalArtists: 10_500_000,
    subscribers: 252,
    totalUsers: 640,
    spotifyRevenueBillions: 16.0,
  },
  {
    year: 2025,
    totalPayoutBillions: 11.0,
    totalArtists: 11_000_000,
    subscribers: 268,
    totalUsers: 675,
    spotifyRevenueBillions: 17.5,
  },
];

// ─── Per-stream rate evolution (USD) ─────────────────────────────
// Derived from total payouts ÷ estimated total streams
export const PER_STREAM_USD: Array<{ year: number; rate: number }> = [
  { year: 2014, rate: 0.007 },
  { year: 2015, rate: 0.006 },
  { year: 2016, rate: 0.0055 },
  { year: 2017, rate: 0.005 },
  { year: 2018, rate: 0.0045 },
  { year: 2019, rate: 0.004 },
  { year: 2020, rate: 0.0035 },
  { year: 2021, rate: 0.0035 },
  { year: 2022, rate: 0.0038 },
  { year: 2023, rate: 0.004 },
  { year: 2024, rate: 0.004 },
  { year: 2025, rate: 0.004 },
];

// ─── Minimum wage data (annual, USD) ─────────────────────────────

export type MinWageEntry = {
  country: string;
  flag: string;
  annualUSD: number;
  monthlyUSD: number;
};

export const MIN_WAGES: MinWageEntry[] = [
  { country: "Switzerland", flag: "🇨🇭", annualUSD: 47000, monthlyUSD: 3917 },
  { country: "Norway", flag: "🇳🇴", annualUSD: 45000, monthlyUSD: 3750 },
  { country: "Australia", flag: "🇦🇺", annualUSD: 36000, monthlyUSD: 3000 },
  { country: "Germany", flag: "🇩🇪", annualUSD: 25000, monthlyUSD: 2083 },
  { country: "Canada", flag: "🇨🇦", annualUSD: 25000, monthlyUSD: 2083 },
  { country: "UK", flag: "🇬🇧", annualUSD: 24000, monthlyUSD: 2000 },
  { country: "Netherlands", flag: "🇳🇱", annualUSD: 24000, monthlyUSD: 2000 },
  { country: "France", flag: "🇫🇷", annualUSD: 22000, monthlyUSD: 1833 },
  { country: "South Korea", flag: "🇰🇷", annualUSD: 18000, monthlyUSD: 1500 },
  { country: "Spain", flag: "🇪🇸", annualUSD: 17000, monthlyUSD: 1417 },
  { country: "Japan", flag: "🇯🇵", annualUSD: 16000, monthlyUSD: 1333 },
  { country: "USA", flag: "🇺🇸", annualUSD: 15080, monthlyUSD: 1257 },
  { country: "Poland", flag: "🇵🇱", annualUSD: 12000, monthlyUSD: 1000 },
  { country: "Turkey", flag: "🇹🇷", annualUSD: 7200, monthlyUSD: 600 },
  { country: "China", flag: "🇨🇳", annualUSD: 4800, monthlyUSD: 400 },
  { country: "Mexico", flag: "🇲🇽", annualUSD: 4800, monthlyUSD: 400 },
  { country: "Brazil", flag: "🇧🇷", annualUSD: 3600, monthlyUSD: 300 },
  { country: "South Africa", flag: "🇿🇦", annualUSD: 3600, monthlyUSD: 300 },
  { country: "Philippines", flag: "🇵🇭", annualUSD: 2400, monthlyUSD: 200 },
  { country: "India", flag: "🇮🇳", annualUSD: 2400, monthlyUSD: 200 },
  { country: "Nigeria", flag: "🇳🇬", annualUSD: 840, monthlyUSD: 70 },
];

// ─── US CPI-U (annual average, BLS) ──────────────────────────────
// Used to show real (inflation-adjusted) per-stream rate
// Source: U.S. Bureau of Labor Statistics, CPI-U All Items, Annual Average
export const CPI_US: Record<number, number> = {
  2014: 236.7,
  2015: 237.0,
  2016: 240.0,
  2017: 245.1,
  2018: 251.1,
  2019: 255.7,
  2020: 258.8,
  2021: 271.0,
  2022: 292.7,
  2023: 304.7,
  2024: 314.0,
  2025: 322.0, // estimate
};

// ─── Subscription money flow breakdown ───────────────────────────
// Where does $11.99/month (US) or 139 kr/month (NO) go?
// The flow: Subscription → Spotify (30%) → Rights holders (70%)
//   Recording rights (~75% of rights pool) → Label → Artist (15–25%)
//   Publishing rights (~25% of rights pool) → Publisher → Songwriter (~50%)
// Sources: Spotify investor reports, IFPI, Music Business Worldwide

export type MoneyFlowStep = {
  id: string;
  percentOfTotal: number;
  isArtistIncome?: boolean; // does this $ reach the actual creator?
};

export const MONEY_FLOW: MoneyFlowStep[] = [
  { id: "spotify", percentOfTotal: 30 }, // Spotify's gross margin
  { id: "labelKeeps", percentOfTotal: 42 }, // Label/distributor cut (≈80% of recording rights)
  { id: "publisherKeeps", percentOfTotal: 8.75 }, // Publisher cut (≈50% of publishing rights)
  { id: "artistRecording", percentOfTotal: 10.5, isArtistIncome: true }, // Artist recording royalty (≈20% of recording)
  { id: "songwriter", percentOfTotal: 8.75, isArtistIncome: true }, // Songwriter share (≈50% of publishing)
];

// ─── Key talking points with numbers ─────────────────────────────

export const KEY_FACTS = {
  totalLifetimePayout: 70, // ~$70 billion
  latestYearlyPayout: 11, // $11B+ in 2025
  spotifySharePercent: 30, // Spotify keeps ~30%
  artistsOver100k: 13800, // 2025
  artistsOver1M: 1500, // 2025
  artistsOver10M: 80, // 2025
  totalArtists: 11_000_000, // ~11M on platform
  the100000thArtist: 7300, // $7,300/year in 2025
  the100000thArtist2015: 350, // $350/year in 2015
  songsOver1MStreams2025: 400_000, // songs streamed >1M times in 2025
  currentPerStreamUSD: 0.004,
  currentPremiumUSD: 11.99,
  currentPremiumNOK: 139,
  spotifyRecordedMusicShare: 30, // ~30% of global recorded music revenue
} as const;
