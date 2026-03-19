// src/lib/i18n.ts

export type Locale = "no" | "en";

export type SubscriptionTier =
  | "free"
  | "individual"
  | "student"
  | "duo"
  | "family"
  | "unknown";

// ─── Price & Royalty Data per locale ─────────────────────────────

export type PriceEntry = { from: [number, number]; price: number };
export type RoyaltyEntry = { from: [number, number]; ratePerStream: number };

/**
 * Spotify Premium Individual subscription prices.
 *
 * NO (NOK/mnd): Wayback Machine snapshots of spotify.com/no-nb/premium/
 * EN (USD/mo):  Wayback Machine snapshots of spotify.com/us/premium/
 */
export const PRICE_HISTORY: Record<Locale, PriceEntry[]> = {
  no: [
    { from: [2009, 1], price: 99 },
    { from: [2021, 2], price: 119 },
    { from: [2023, 7], price: 129 },
    { from: [2025, 6], price: 139 },
  ],
  en: [
    { from: [2009, 1], price: 9.99 },
    { from: [2023, 7], price: 10.99 },
    { from: [2024, 6], price: 11.99 },
  ],
};

/**
 * Estimated royalty per stream.
 *
 * NO: NOK estimates (Norwegian premium market)
 * EN: USD estimates (US market, global average)
 *
 * Sources: The Trichordist, Soundcharts, Digital Music News, Spotify Loud & Clear
 */
export const ROYALTY_HISTORY: Record<Locale, RoyaltyEntry[]> = {
  no: [
    { from: [2009, 1], ratePerStream: 0.05 },
    { from: [2015, 1], ratePerStream: 0.044 },
    { from: [2018, 1], ratePerStream: 0.035 },
    { from: [2020, 1], ratePerStream: 0.03 },
    { from: [2023, 1], ratePerStream: 0.038 },
    { from: [2025, 1], ratePerStream: 0.04 },
  ],
  en: [
    { from: [2009, 1], ratePerStream: 0.006 },
    { from: [2015, 1], ratePerStream: 0.005 },
    { from: [2018, 1], ratePerStream: 0.0035 },
    { from: [2020, 1], ratePerStream: 0.003 },
    { from: [2023, 1], ratePerStream: 0.004 },
    { from: [2025, 1], ratePerStream: 0.004 },
  ],
};

export const DEFAULT_ALBUM_PRICE: Record<Locale, number> = {
  no: 150,
  en: 15,
};

// ─── Multi-tier pricing ──────────────────────────────────────────

/**
 * Subscription prices per tier per locale.
 * Free = 0. Student ≈ 50% of Individual. Duo = total/2. Family = total/6.
 */
export const PRICE_HISTORY_BY_TIER: Record<
  Locale,
  Record<SubscriptionTier, PriceEntry[]>
> = {
  no: {
    free: [{ from: [2009, 1], price: 0 }],
    individual: [
      { from: [2009, 1], price: 99 },
      { from: [2021, 2], price: 119 },
      { from: [2023, 7], price: 129 },
      { from: [2025, 6], price: 139 },
    ],
    student: [
      { from: [2014, 3], price: 49 },
      { from: [2021, 2], price: 59 },
      { from: [2023, 7], price: 69 },
      { from: [2025, 6], price: 79 },
    ],
    duo: [
      // Per-user share: total / 2
      { from: [2020, 7], price: 69.5 }, // 139/2
      { from: [2021, 2], price: 79.5 }, // 159/2
      { from: [2023, 7], price: 89.5 }, // 179/2
      { from: [2025, 6], price: 99.5 }, // 199/2
    ],
    family: [
      // Per-user share: total / 6
      { from: [2014, 10], price: 24.83 }, // 149/6
      { from: [2021, 2], price: 29.83 }, // 179/6
      { from: [2023, 7], price: 33.17 }, // 199/6
      { from: [2025, 6], price: 38.17 }, // 229/6
    ],
    unknown: [
      { from: [2009, 1], price: 99 },
      { from: [2021, 2], price: 119 },
      { from: [2023, 7], price: 129 },
      { from: [2025, 6], price: 139 },
    ],
  },
  en: {
    free: [{ from: [2009, 1], price: 0 }],
    individual: [
      { from: [2009, 1], price: 9.99 },
      { from: [2023, 7], price: 10.99 },
      { from: [2024, 6], price: 11.99 },
    ],
    student: [
      { from: [2014, 3], price: 4.99 },
      { from: [2023, 7], price: 5.99 },
      { from: [2024, 6], price: 6.99 },
    ],
    duo: [
      // Per-user share: total / 2
      { from: [2020, 7], price: 6.995 }, // 13.99/2
      { from: [2023, 7], price: 7.495 }, // 14.99/2
      { from: [2024, 6], price: 8.495 }, // 16.99/2
    ],
    family: [
      // Per-user share: total / 6
      { from: [2014, 10], price: 2.498 }, // 14.99/6
      { from: [2023, 7], price: 2.748 }, // 16.49/6
      { from: [2024, 6], price: 2.998 }, // 17.99/6
    ],
    unknown: [
      { from: [2009, 1], price: 9.99 },
      { from: [2023, 7], price: 10.99 },
      { from: [2024, 6], price: 11.99 },
    ],
  },
};

/**
 * Per-stream royalty multiplier by tier.
 * Free-tier streams are funded by ad revenue, which yields ~35% of the
 * per-stream value compared to subscription-funded streams.
 * All paid tiers contribute equally to the royalty pool.
 */
export const TIER_ROYALTY_MULTIPLIER: Record<SubscriptionTier, number> = {
  free: 0.35,
  individual: 1.0,
  student: 1.0,
  duo: 1.0,
  family: 1.0,
  unknown: 1.0,
};

/**
 * Tier launch dates — tiers cannot be selected before these dates.
 * Individual and Free existed from launch.
 */
export const TIER_LAUNCH_DATES: Partial<
  Record<SubscriptionTier, [number, number]>
> = {
  student: [2014, 3],
  family: [2014, 10],
  duo: [2020, 7],
};

export function getRoyaltyMultiplier(tier: SubscriptionTier): number {
  return TIER_ROYALTY_MULTIPLIER[tier];
}

// ─── Lookup helpers ──────────────────────────────────────────────

export function getRatePerStream(
  year: number,
  month: number,
  locale: Locale,
): number {
  const history = ROYALTY_HISTORY[locale];
  let rate = history[0].ratePerStream;
  for (const entry of history) {
    const [fy, fm] = entry.from;
    if (year > fy || (year === fy && month >= fm)) {
      rate = entry.ratePerStream;
    }
  }
  return rate;
}

export function getMonthlyPrice(
  year: number,
  month: number,
  locale: Locale,
  tier: SubscriptionTier = "individual",
): number {
  const history = PRICE_HISTORY_BY_TIER[locale][tier];
  let price = history[0].price;
  for (const entry of history) {
    const [fy, fm] = entry.from;
    if (year > fy || (year === fy && month >= fm)) {
      price = entry.price;
    }
  }
  return price;
}

// ─── Formatting helpers ──────────────────────────────────────────

export function formatCurrency(n: number, locale: Locale): string {
  if (locale === "en") {
    if (n === 0) return "$0";
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs < 1) return `${sign}$${abs.toFixed(2)}`;
    if (abs < 10) return `${sign}$${abs.toFixed(2)}`;
    return `${sign}$${abs.toFixed(0)}`;
  }
  if (n === 0) return "0 kr";
  if (Math.abs(n) < 1) return `${n.toFixed(2)} kr`;
  if (Math.abs(n) < 10) return `${n.toFixed(1)} kr`;
  return `${n.toFixed(0)} kr`;
}

export function formatHrs(ms: number, locale: Locale): string {
  const totalMinutes = ms / 60000;
  if (totalMinutes < 60) return `${Math.round(totalMinutes)} min`;
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  const unit = locale === "en" ? "h" : "t";
  return m > 0 ? `${h} ${unit} ${m} min` : `${h} ${unit}`;
}

export function formatNum(n: number, locale: Locale): string {
  return n.toLocaleString(locale === "en" ? "en-US" : "nb-NO");
}

export function currencyPerMonth(price: number, locale: Locale): string {
  if (locale === "en") return `$${price.toFixed(2)}/mo`;
  return `${price} kr/mnd`;
}

export function currencyPerStream(rate: number, locale: Locale): string {
  if (locale === "en") return `$${rate.toFixed(4)}`;
  return `${rate.toFixed(3)} kr`;
}

export function dateLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "nb-NO";
}

// ─── UI Translations ─────────────────────────────────────────────

const T = {
  // Hero
  heroBadge: {
    no: "Lokal analyse · Ingen data forlet nettlesaren",
    en: "Local analysis · No data leaves your browser",
  },
  heroImgAlt: {
    no: "Spotify Unwrapped – illustrasjon",
    en: "Spotify Unwrapped – illustration",
  },
  heroTagline: {
    no: "Kva tente artistene på lyttinga di?",
    en: "How much did artists earn from your listening?",
  },
  heroDesc1: {
    no: "Oppdag kor mykje pengar ",
    en: "Discover how much money ",
  },
  heroDescStreams: {
    no: "dine streams",
    en: "your streams",
  },
  heroDesc2: {
    no: " faktisk genererte for artistane du elskar – og kva det alternativt hadde kosta å kjøpe musikken direkte.",
    en: " actually generated for the artists you love – and what it would have cost to buy the music directly.",
  },
  featureAnalyzeTitle: {
    no: "Analyser lyttinga di",
    en: "Analyze your listening",
  },
  featureAnalyzeDesc: {
    no: "Estimert royalty-verdi for kvar artist basert på gjennomsnittlege straumeprisar (pro-rata modell).",
    en: "Estimated royalty value per artist based on average streaming rates (pro-rata model).",
  },
  featureInsightTitle: { no: "Få innsikt", en: "Get insights" },
  featureInsightDesc: {
    no: "Sjekk kva det hadde kosta å støtte artistane med direktekjøp i staden.",
    en: "See what it would cost to support artists with direct purchases instead.",
  },
  featurePrivateTitle: { no: "Heilt privat", en: "Completely private" },
  featurePrivateDesc: {
    no: "Alt skjer lokalt i nettlesaren. Vi lagrar eller sender aldri dine data.",
    en: "Everything runs locally in your browser. We never store or send your data.",
  },
  heroCtaUrl: {
    no: "https://www.spotify.com/no-nb/account/privacy/",
    en: "https://www.spotify.com/us/account/privacy/",
  },
  heroCtaLink: {
    no: "Be om dine data frå Spotify (GDPR) →",
    en: "Request your data from Spotify (GDPR) →",
  },
  heroCtaHint: {
    no: "Manglar du data? Last ned «Extended Streaming History» frå Spotify-kontoen din.",
    en: 'Missing data? Download "Extended Streaming History" from your Spotify account.',
  },

  // Upload
  uploadTitle: {
    no: '1) Last opp (alle) "Extended streaming history" JSON filene du har motatt frå Spotify',
    en: '1) Upload (all) "Extended streaming history" JSON files you received from Spotify',
  },
  uploadBtn: {
    no: "📁 Vel Spotify-data filene dine",
    en: "📁 Choose your Spotify data files",
  },
  uploadedFilesLabel: { no: "Opplasta filer", en: "Uploaded files" },
  removeAll: { no: "Fjern alle", en: "Remove all" },
  rows: { no: "rader", en: "rows" },
  removeFile: { no: "Fjern fil", en: "Remove file" },

  // Settings
  settingsTitle: { no: "Innstillingar", en: "Settings" },
  settingsDesc: {
    no: "Få innsikt i, og justér anslaga.",
    en: "Adjust estimates without sending data anywhere.",
  },
  albumPriceLabel: {
    no: "Standard albumpris (NOK)",
    en: "Default album price (USD)",
  },
  minMsLabel: { no: "Min. ms per rad", en: "Min. ms per row" },
  subscriptionUsageToggleLabel: {
    no: "Tell berre betalte abonnementsmånadar med faktisk bruk",
    en: "Only count paid subscription months with listening activity",
  },
  subscriptionUsageToggleHint: {
    no: "Slå av for å ta med alle betalte abonnementsmånadar i vald periode, også når Spotify ikkje vart brukt.",
    en: "Turn off to include all paid subscription months in the selected period, even when Spotify was not used.",
  },
  priceHistoryTitle: {
    no: "Historisk abonnementspris (Premium Individual, Noreg)",
    en: "Historical subscription price (Premium Individual, USA)",
  },
  periodCol: { no: "Periode", en: "Period" },
  priceCol: { no: "Pris", en: "Price" },
  priceHistoryNote: {
    no: "Abonnementskostnad vert rekna ut automatisk basert på historisk pris per månad i perioden din.",
    en: "Subscription cost is calculated automatically based on the historical price per month in your period.",
  },
  royaltyHistoryTitle: {
    no: "Historisk NOK per stream (anslag, norsk marknad)",
    en: "Historical USD per stream (estimate, US market)",
  },
  ratePerStreamCol: { no: "NOK/stream", en: "USD/stream" },
  royaltyHistoryNote: {
    no: "Verdien per stream vert rekna ut automatisk basert på historisk sats for kvar strøyming i perioden din. Satsen er eit anslag basert på Spotify sine totale utbetalingar, globale strøymetall og norske marknadsfaktorar.",
    en: "The value per stream is calculated automatically based on the historical rate for each stream in your period. The rate is an estimate based on Spotify's total payouts, global stream counts, and US market factors.",
  },

  // Date filter
  dateFilterTitle: { no: "Tidsperiode", en: "Time period" },
  dateFilterDesc: {
    no: "Filtrer analysen til eit bestemt år eller datoområde.",
    en: "Filter the analysis to a specific year or date range.",
  },
  allTime: { no: "All tid", en: "All time" },
  custom: { no: "Eigendefinert", en: "Custom" },
  fromLabel: { no: "Frå", en: "From" },
  toLabel: { no: "Til", en: "To" },
  showingDataFor: { no: "Viser data for:", en: "Showing data for:" },
  ofTotal: { no: "av", en: "of" },
  totalSuffix: { no: "totalt", en: "total" },

  // Overview
  overviewTitle: { no: "2) Oversikt", en: "2) Overview" },
  overviewDescUploaded: {
    no: "Kjapp status på materialet du har lasta opp.",
    en: "Quick summary of the data you uploaded.",
  },
  overviewDescPeriod: {
    no: "Kjapp status på materialet i vald periode.",
    en: "Quick summary of the data in selected period.",
  },
  exportReport: { no: "Eksporter rapport", en: "Export report" },
  totalListeningTime: { no: "Total lyttetid", en: "Total listening time" },
  rowsAnalyzed: { no: "Rader analysert", en: "Rows analyzed" },
  uniqueArtists: { no: "Unike artistar", en: "Unique artists" },
  hidden: { no: "skjulte", en: "hidden" },
  estSubFull: {
    no: "Estimert abonnement (full periode)",
    en: "Est. subscription (full period)",
  },
  monthsAbbr: { no: "mnd", en: "mo" },
  subActiveOnly: {
    no: "Abonnement (berre aktive mndr)",
    en: "Subscription (active months only)",
  },
  totalTheoValue: {
    no: "Total teoretisk Spotfiy-verdi (alle artistar)",
    en: "Total theoretical Spotify value (all artists)",
  },
  estSubCost: {
    no: "Estimert abonnementskostnad",
    en: "Estimated subscription cost",
  },
  paidDurationLabel: {
    no: "Med abonnement",
    en: "With subscription",
  },
  paidDurationHint: {
    no: "{months} betalte månadar i perioden",
    en: "{months} paid months in the period",
  },
  noSubscriptionLabel: {
    no: "Utan abonnement",
    en: "Without subscription",
  },
  noSubscriptionHint: {
    no: "{months} månadar utan betalt abonnement",
    en: "{months} months without a paid subscription",
  },
  unusedSubscriptionLabel: {
    no: "Betalt utan bruk",
    en: "Paid but unused",
  },
  unusedSubscriptionHint: {
    no: "{months} heile månadar utan aktivitet",
    en: "{months} full months without activity",
  },
  unusedDailyLabel: {
    no: "Ubrukt dagsestimat",
    en: "Unused daily estimate",
  },
  unusedDailyHint: {
    no: "{days} dagar utan aktivitet",
    en: "{days} days without activity",
  },
  noSubscriptionNeedsHistory: {
    no: "Legg til abonnementshistorikk for å sjå periodar utan abonnement",
    en: "Add subscription history to see periods without a subscription",
  },
  unusedSubscriptionDefaultNote: {
    no: "Basert på «alltid premium»-modellen. Hol kan vera periodar utan abonnement.",
    en: "Based on 'always premium' model. Gaps may be unsubscribed periods.",
  },
  difference: { no: "Differanse", en: "Difference" },
  weightedAvg: { no: "vekta snittpris", en: "weighted avg price" },
  pricesUsed: { no: "Prisar brukt", en: "Prices used" },
  proRataNote: {
    no: "Merk: Spotify bruker ein <b>pro-rata pooling-modell</b>. Det betyr at abonnementspengane dine ikkje vert tildelt direkte til artistane du lyttar til – dei går i ein felles pott og vert fordelt etter kvar artist sin andel av <i>alle</i> strøymingar på plattforma. Estimata her viser ein royalty-verdi basert på gjennomsnittleg straumepris × lyttetid, ikkje kva artisten faktisk har motteke frå akkurat deg.",
    en: "Note: Spotify uses a <b>pro-rata pooling model</b>. This means your subscription payments are not directly allocated to the artists you listen to – they enter a shared pool and are distributed based on each artist's share of <i>all</i> streams on the platform. Estimates here show an estimated royalty value based on average stream rate × listening time, not what the artist actually received from you.",
  },
  subPricingNote: {
    no: "<b>Om abonnementsprising:</b> Spotify sin GDPR-dataeksport inneheld ikkje informasjon om abonnementstype eller betalingshistorikk. Feltet <code>Payments.json</code> er tomt, og <code>Userdata.json</code> har berre grunnleggande kontoinformasjon.<br/><br/>Du kan konfigurere abonnementshistorikken din under <em>Innstillingar → Abonnementshistorikk</em>. Utan eigne innstillingar brukar modellen <b>Premium Individual</b> som standard. Dei ulike abonnementstypane påverkar utrekninga slik:<ul><li><b>Premium (Individual/Duo/Family/Student):</b> Alle betalande abonnement bidreg til same inntektspott. Per-stream-verdien er lik, men prisen du betalar varierer.</li><li><b>Gratis (reklamefinansiert):</b> Artistar får framleis betalt, men inntektene kjem frå reklame i staden for abonnement. Reklameinntekt per brukar er vesentleg lågare enn abonnementsinntekt – bransjetal viser at per-stream-verdien for reklamefinansierte streams er ca. 30–40 % av abonnementsfinansierte streams.</li><li><b>Student:</b> Same per-stream-verdi som Premium, men du betalar lågare pris.</li></ul>Historiske prisar er verifiserte via Wayback Machine. Duo-pris er delt på 2, Family-pris delt på 6.",
    en: "<b>About subscription pricing:</b> Spotify's GDPR data export does not include subscription type or payment history. The <code>Payments.json</code> field is empty, and <code>Userdata.json</code> only contains basic account info.<br/><br/>You can configure your subscription history under <em>Settings → Subscription history</em>. Without custom settings, the model defaults to <b>Premium Individual</b>. The different subscription types affect the estimates as follows:<ul><li><b>Premium (Individual/Duo/Family/Student):</b> All paid subscriptions contribute to the same revenue pool. The per-stream value is the same, but the price you pay varies.</li><li><b>Free (ad-funded):</b> Artists still get paid, but revenue comes from advertising instead of subscriptions. Ad revenue per user is significantly lower than subscription revenue – industry data shows per-stream value for ad-funded streams is approximately 30–40% of subscription-funded streams.</li><li><b>Student:</b> Same per-stream value as Premium, but you pay a lower price.</li></ul>Historical prices verified via the Wayback Machine. Duo price divided by 2, Family price divided by 6.",
  },

  // Section 3 – Artists
  yourArtists: { no: "artistar", en: "artists" },
  uniqueAlbumsLabel: { no: "unike album", en: "unique albums" },
  addAllToPlan: {
    no: "Legg alle album i kjøpsplan",
    en: "Add all albums to purchase plan",
  },
  clear: { no: "Tøm", en: "Clear" },
  albumsAddedMiddot: { no: "Album lagt til", en: "Albums added" },
  albumsLeft: { no: "album att", en: "albums left" },
  couldHaveOwned: {
    no: "album kunne du ha eigd i dag i staden for å ikkje eige nokon som Spotify-abonnent",
    en: "albums you could have owned today instead of owning none as a Spotify subscriber",
  },
  moreThanBudget: {
    no: "album meir enn du kunne fått for spotify-abonnementsutgiftene dine",
    en: "more albums than you could get for your Spotify subscription costs",
  },
  showStatsFor: { no: "Vis tal for:", en: "Show stats for:" },
  topPrefix: { no: "Topp", en: "Top" },
  allLabel: { no: "Alle", en: "All" },
  listeningTime: { no: "Lyttetid", en: "Listening time" },
  theorValue: { no: "Teor. verdi", en: "Theor. value" },
  albumEquiv: { no: "Album-ekv.", en: "Album equiv." },
  theorSpotifyValue: {
    no: "Teoretisk Spotify-verdi",
    en: "Theoretical Spotify value",
  },
  albumsLabel: { no: "Album", en: "Albums" },
  buyPhysical: { no: "Kjøp fysiske album", en: "Buy physical albums" },
  searchArtist: { no: "Søk etter artist...", en: "Search for artist..." },
  showing: { no: "Viser", en: "Showing" },
  ofWord: { no: "av", en: "of" },
  pageLabel: { no: "Side", en: "Page" },
  perPage: { no: "Per side:", en: "Per page:" },
  clickAlbumsHint: {
    no: "Trykk på albuma du kunne vurdert å kjøpe for å støtte artistane du likar godt.",
    en: "Click on albums you might consider buying to support the artists you enjoy.",
  },
  showFewer: { no: "Vis færre", en: "Show fewer" },
  removeFromList: { no: "Fjern frå lista", en: "Remove from list" },
  inPurchasePlan: { no: "i kjøpsplan", en: "in purchase plan" },

  // Planned purchases
  plannedPurchases: { no: "Planlagde kjøp", en: "Planned purchases" },
  albumsInPlan: { no: "Album i plan:", en: "Albums in plan:" },
  totalLabel: { no: "total:", en: "total:" },
  clickChipsToAdd: {
    no: "Klikk på album-chipane for å legge til.",
    en: "Click album chips to add.",
  },
  exportShoppingList: {
    no: "📄 Eksporter handleliste (PDF)",
    en: "📄 Export shopping list (PDF)",
  },
  removeBtn: { no: "Fjern", en: "Remove" },
  clearSearch: { no: "Tøm søk", en: "Clear search" },
  totalCountAlbums: { no: "album", en: "albums" },
  showAllAlbums: { no: "Vis alle", en: "Show all" },
  albumWord: { no: "album", en: "albums" },
  interpretation: {
    no: 'Tolking: Viss ein artist ligg høgt her, kan det vere rimeleg å tenkje "eg har brukt mykje av musikken deira". Ein enkel handling kan vere å kjøpe eitt album, merch, eller billett.',
    en: "Interpretation: If an artist ranks high here, it's fair to think \"I've used a lot of their music.\" A simple action could be buying an album, merch, or a ticket.",
  },

  // Excluded artists
  excludedArtistsTitle: { no: "Ekskluderte artistar", en: "Excluded artists" },
  clickToRestore: { no: "Klikk for å gjenopprette.", en: "Click to restore." },
  restoreTitle: {
    no: "Klikk for å gjenopprette",
    en: "Click to restore",
  },

  // Artist detail modal
  totalPlaysLabel: { no: "Totalt avspelingar", en: "Total plays" },
  sortByTime: { no: "Sorter etter tid", en: "Sort by time" },
  sortByPlays: { no: "Sorter etter avspelingar", en: "Sort by plays" },
  playsWord: { no: "avspelingar", en: "plays" },
  closeLabel: { no: "Lukk", en: "Close" },

  // Footer
  developedBy: {
    no: "Utvikla av Hans Martin Sognefest Austestad",
    en: "Developed by Hans Martin Sognefest Austestad",
  },
  disclaimerLink: {
    no: "Korleis modellen fungerer · Disclaimer & kjelder",
    en: "How the model works · Disclaimer & sources",
  },

  // Disclaimer modal — structured as sections
  disclaimerTitle: {
    no: "Korleis utrekningsmodellen fungerer",
    en: "How the calculation model works",
  },
  disclaimerIntro: {
    no: "Fordi Spotify ikkje publiserer økonomiske data på lyttarnivå, brukar denne appen data frå Spotify sin GDPR-eksport og estimerer den økonomiske verdien av lyttinga di ved hjelp av offentleg tilgjengelege bransjedata. Under følgjer ei forklaring av kvart steg i modellen.",
    en: "Because Spotify does not publish financial data at the listener level, this app uses data from Spotify's GDPR export and estimates the economic value of your listening using publicly available industry data. Below is an explanation of each step in the model.",
  },

  disclaimerIntroRebuttal: {
    no: "Det er ein vanleg forklaring at ein ikkje kan rekne ut straumeverdiar for å sjå kva artistar tener — men det er fullt mogleg å retrospektivt utrekne ein teoretisk verdi basert på berekningar av gjennomsnittlege satsar per stream. Desse satsene er nettopp utrekna frå Spotify sine eigne publiserte tal, og reflekterer den faktiske økonomien i strøyming så langt det er mogleg å anslå utan tilgang til Spotify sine interne data. Hadde det ikkje vore mogleg, ville deira tal vore ubrukelige for analyse eller innsikt, og hele industrien ville vært i mørket om hvordan strøymingsinntekter genereres.",
    en: "It is a common explanation that you can't calculate stream values to see what artists earn — but it's entirely possible to retrospectively calculate a theoretical value based on calculations of average rates per stream. These rates are precisely calculated from Spotify's own published figures, and reflect the actual economics of streaming as far as can be estimated without access to Spotify's internal data. Had it not been possible, their numbers would be useless for any kind of analysis or insight, and the entire industry would be in the dark about how streaming revenue is generated.",
  },

  disclaimerStep1Title: {
    no: "1. Filtrering av data",
    en: "1. Data filtering",
  },
  disclaimerStep1: {
    no: "Appen les JSON-filene frå Spotify sin dataeksport. Avspelingar kortare enn ein minimumsgrense (standard: 30 sekund) vert fjerna. Spotify har sjølv oppgitt at 30 sekund er grensa for at ei avspeling tel som ein «stream». Dette hindrar at korte prøvelyttingar, hopping og tilfeldige klikk vert talde som reelle lytteøkter.",
    en: 'The app reads the JSON files from Spotify\'s data export. Plays shorter than a minimum threshold (default: 30 seconds) are removed. Spotify has stated that 30 seconds is the cutoff for a play to count as a "stream." This prevents short test plays, skips, and accidental clicks from being counted as real listening sessions.',
  },

  disclaimerStep2Title: {
    no: "2. Estimert royalty-verdi",
    en: "2. Estimated royalty value",
  },
  disclaimerStep2: {
    no: "Modellen brukar historiske gjennomsnittssatsar for royalty per stream, basert på bransjedata frå mellom anna The Trichordist og Soundcharts. Satsane er ulike for kvart tidsrom (sjå prislista i innstillingane). Ein «stream» i denne appen er kvar avspeling som passerer minimumsgrensa. Verdien er <em>teoretisk</em> – den viser omtrent kva Spotify ville ha lagt i den felles poolen basert på dine lyttevanar. Estimatet illustrerer dermed omtrent kor mykje verdi lyttinga di kan ha generert i systemet.",
    en: 'The model uses historical average per-stream royalty rates based on industry data from sources including The Trichordist and Soundcharts. Rates differ for each time period (see the rate table in settings). A "stream" in this app is any play that passes the minimum threshold. The value is <em>theoretical</em> – it shows roughly what Spotify would have put into the shared pool based on your listening habits. The estimate thus illustrates approximately how much value your listening may have generated in the system.',
  },

  disclaimerStep3Title: {
    no: "3. Abonnementskostnad",
    en: "3. Subscription cost",
  },
  disclaimerStep3: {
    no: "Modellen reknar ut historisk kostnad per månad du har hatt Spotify, basert på kjende prisaukar. Berre månadar der du faktisk har lytteaktivitet i dataen vert rekna med. Spotify sin GDPR-eksport inneheld <em>ikkje</em> betalingshistorikk eller abonnementstype (<code>Payments.json</code> er tom), så modellen brukar <b>Premium Individual</b> som standard. Du kan sjølv velje abonnementstype i innstillingane — tilgjengelege alternativ er Individual, Student, Duo, Family og Free — og definere kva periodar du har hatt kvar type. Prisane vert justerte automatisk basert på valet ditt og historiske prisendringar.",
    en: "The model calculates historical cost per month you've had Spotify, based on known price changes. Only months where you actually have listening activity in the data are counted. Spotify's GDPR export does <em>not</em> contain payment history or subscription type (<code>Payments.json</code> is empty), so the model defaults to <b>Premium Individual pricing</b>. You can select your subscription type in Settings — available options are Individual, Student, Duo, Family, and Free — and define which periods you had each type. Prices are automatically adjusted based on your selection and historical price changes.",
  },

  disclaimerStep4Title: {
    no: "4. Artistaggregering",
    en: "4. Artist aggregation",
  },
  disclaimerStep4: {
    no: "For kvar artist vert total lyttetid, estimert royalty-verdi, albumfordeling og tal på streams summert. «Album-ekvivalent» viser kor mange fysiske album den estimerte strøymeverdien for ein artist tilsvarar. Dette gir eit oversyn over korleis lyttinga di fordeler seg på tvers av artistar og katalogar.",
    en: 'For each artist, total listening time, estimated royalty value, album distribution, and stream count are summed. "Album equivalent" shows how many physical albums the estimated streaming value for an artist corresponds to. This provides an overview of how your listening is distributed across artists and catalogs.',
  },

  disclaimerCaveatsTitle: { no: "Viktige atterhald", en: "Important caveats" },
  disclaimerCaveats: {
    no: [
      "Dette er ein <b>estimatmodell</b>. Spotify publiserer ikkje faktiske royalty-utbetalingar per brukar.",
      "Spotify bruker ein <b>«StreamShare»-modell</b> (pro-rata): alle abonnementsinntekter går i ein felles pott og vert fordelt etter kvar artist sin andel av <em>totale</em> streams på plattforma. Abonnementspengane dine vert med andre ord ikkje direkte allokert til artistane du personleg lyttar til.",
      "Fordi inntektene vert fordelt etter globalt lyttevolum, favoriserer systemet innhald med høgt avspelingsvolum framfor individuelle lyttarpreferansar.",
      "Satsar varierer med land, abonnementstype og samla aktivitet på plattforma. Tala gir eit <em>rimeleg gjennomsnittsbilete</em>, ikkje eksakte utbetalingar.",
      "For dei som følgjer debatten om bakgrunnsmusikk og EU sitt DSM-direktiv (t.d. i TONO), er dette ein del av ein større problematikk: Lyttemusikk taper terreng i fordeling av vederlag, medan bakgrunnsmusikk får ein uforholdsmessig stor del av inntektspotten.",
      "<b>Plateselskap-oppslag</b> (label analytics) nyttar MusicBrainz og Discogs som kjelder. Desse databasane er samfunnsdrivne og kan vere ufullstendige eller upresise. Klassifiseringa av «major» vs. «indie» er tilnærma.",
      "<b>Inferences og Marquee</b>-data reflekterer Spotify sine interne kategoriseringar og marknadsføringsval. Unwrapped viser desse dataene, men tolkar dei ikkje.",
      "<b>Lyttemønster</b>-klassifiseringa (aktiv vs. assistert lytting) er basert på <code>reason_start</code>-feltet i GDPR-dataen, som Spotify sjølv definerer. Grensedraging mellom kategoriane kan variere.",
      "Frå 2024 krev Spotify at ein song må ha <b>minst 1 000 streams per år</b> for å generere royalty-inntekter. Denne modellen tek ikkje høgde for denne grensa – estimata inkluderer også streams til artistar og songar som i praksis fell under minimumskravet.",
    ],
    en: [
      "This is an <b>estimation model</b>. Spotify does not publish actual royalty payouts per user.",
      'Spotify uses a <b>"StreamShare" model</b> (pro-rata): all subscription revenue goes into a shared pool and is distributed based on each artist\'s share of <em>total</em> streams on the platform. Your subscription payment is not directly allocated to the artists you personally listen to.',
      "Because revenue is distributed according to global streaming volume, the system tends to favour high-volume content over individual listener preferences.",
      "Rates vary by country, subscription type, and overall platform activity. The figures provide a <em>reasonable average picture</em>, not exact payouts.",
      "For those following the debate about background music and the EU's DSM Directive (e.g. in collecting societies like TONO), this is part of a larger issue: Listening music loses ground in royalty distribution, while background music receives a disproportionate share of the revenue pool.",
      '<b>Label lookup</b> (label analytics) uses MusicBrainz and Discogs as sources. These databases are community-driven and may be incomplete or imprecise. The classification of "major" vs. "indie" is approximate.',
      "<b>Inferences and Marquee</b> data reflects Spotify's internal categorizations and marketing decisions. Unwrapped displays this data but does not interpret it.",
      "<b>Listening pattern</b> classification (active vs. assisted listening) is based on the <code>reason_start</code> field in the GDPR data, as defined by Spotify. The boundary between categories may vary.",
      "From 2024, Spotify requires a track to have <b>at least 1,000 streams per year</b> to generate royalty income. This model does not account for this threshold – estimates include streams to artists and tracks that in practice fall below the minimum requirement.",
      "The figures in this analysis show estimated <b>gross</b> royalty value – not what the artist actually receives. Streaming revenue flows to the entire <b>value chain</b> behind a recording: labels, distributors, producers, session musicians, mixing and mastering engineers, and other rights holders. The actual amount reaching the songwriter or performer is in practice a fraction of the gross total. This also means the system economically favours music that can be produced with few contributors, since traditional music production involving many participants results in each individual receiving an ever-smaller share of an already low sum.",
    ],
  },

  disclaimerPurpose: {
    no: "Denne sida illustrerer korleis Spotify sin pro-rata royalty-modell koplar individuelle abonnementsbetalingar frå individuell lytteåtferd – og at å kjøpe musikk direkte frå artistar eller rettshavarar kan gje ein meir direkte økonomisk kopling mellom lyttar og skapar.",
    en: "This site illustrates how Spotify's pro-rata royalty model disconnects individual subscription payments from individual listening behaviour – and that buying music directly from artists or rights holders can provide a more direct financial link between listener and creator.",
  },

  disclaimerSolution: {
    no: "Ei mogleg vidare utvikling er å synleggjere for forbrukarane korleis abonnementspengane deira vert fordelt i eit pro-rata-system – slik at fleire kan ta informerte val om korleis dei støttar musikken dei bryr seg om.",
    en: "A possible further development is to make visible to consumers how their subscription payments are distributed in a pro-rata system – so that more people can make informed choices about how they support the music they care about.",
  },

  disclaimerPrivacy: {
    no: "All analyse skjer 100 % lokalt i nettlesaren din. Ingen data vert sendt til nokon server, lagra, eller delt med nokon. Filane dine forlet aldri maskina di.",
    en: "All analysis runs 100% locally in your browser. No data is sent to any server, stored, or shared with anyone. Your files never leave your machine.",
  },

  // Research & Math section (collapsible)
  disclaimerResearchTitle: {
    no: "Vil du vite meir om forskinga og matematikken?",
    en: "Want to know more about the research and the math?",
  },
  disclaimerResearchIntro: {
    no: "Spotify sin eksakte royalty-fordeling er ikkje offentleg, og det er ikkje mogleg å rekonstruere den nøyaktig frå GDPR-dataen åleine. Denne appen bruker derfor ein estimeringsmodell basert på offentleg tilgjengelege bransjetal og akademisk litteratur om strøymeøkonomi.",
    en: "Spotify's exact royalty distribution is not public, and it is not possible to reconstruct it precisely from GDPR data alone. This app therefore uses an estimation model based on publicly available industry figures and academic literature on streaming economics.",
  },
  disclaimerResearchCoreIdea: {
    no: "I Spotify sin pro-rata-modell vert alle abonnementsinntekter samla i ein felles pott, og kvar artist sin del vert bestemt av deira andel av totale streams på plattforma. Følgande formel beskriv <b>prinsippet</b> bak modellen:",
    en: "In Spotify's pro-rata model, all subscription revenue is pooled together, and each artist's share is determined by their proportion of total streams on the platform. The following formula describes the <b>principle</b> behind the model:",
  },
  disclaimerResearchFormula1: {
    no: "P_{artist} = \\frac{S_{artist}}{S_{total}} \\times R_{pool}",
    en: "P_{artist} = \\frac{S_{artist}}{S_{total}} \\times R_{pool}",
  },
  disclaimerResearchFormula1Vars: {
    no: [
      "<i>P<sub>artist</sub></i> = utbetaling til ein gitt artist",
      "<i>S<sub>artist</sub></i> = antal streams for den artisten",
      "<i>S<sub>total</sub></i> = totalt antal streams på heile plattforma",
      "<i>R<sub>pool</sub></i> = den samla royalty-potten (ca. 70 % av Spotify sine inntekter)",
    ],
    en: [
      "<i>P<sub>artist</sub></i> = payout to a given artist",
      "<i>S<sub>artist</sub></i> = number of streams for that artist",
      "<i>S<sub>total</sub></i> = total number of streams on the entire platform",
      "<i>R<sub>pool</sub></i> = the total royalty pool (approx. 70% of Spotify's revenue)",
    ],
  },
  disclaimerResearchStreamValue: {
    no: "Frå dette prinsippet kan ein statistisk gjennomsnittleg verdi per stream tilnærmast som:",
    en: "From this principle, a statistical average value per stream can be approximated as:",
  },
  disclaimerResearchFormula2: {
    no: "V_{stream} \\approx \\frac{R_{pool}}{S_{total}}",
    en: "V_{stream} \\approx \\frac{R_{pool}}{S_{total}}",
  },
  disclaimerResearchVariation: {
    no: "Sidan verken <i>R<sub>pool</sub></i> eller <i>S<sub>total</sub></i> er offentleg tilgjengelege, kan ikkje appen utleie denne verdien direkte. I staden brukar appen <b>publiserte gjennomsnittssatsar</b> frå bransjeanalytikarar (m.a. The Trichordist, Soundcharts) som har utleia <i>V<sub>stream</sub></i> retrospektivt frå Spotify sine finansrapportar. Satsane varierer med land, abonnementstype, reklameinntekter og samla plattformaktivitet. Appen brukar historiske satsar frå 0.03 til 0.05 NOK per stream (tilsvarande $0.003–0.006 USD).",
    en: "Since neither <i>R<sub>pool</sub></i> nor <i>S<sub>total</sub></i> are publicly available, the app cannot derive this value directly. Instead, it uses <b>published average rates</b> from industry analysts (including The Trichordist, Soundcharts) who have derived <i>V<sub>stream</sub></i> retrospectively from Spotify's financial reports. Rates vary by country, subscription type, ad revenue, and overall platform activity. The app uses historical rates from $0.003 to $0.006 per stream (corresponding to 0.03–0.05 NOK).",
  },
  disclaimerResearchUserValue: {
    no: "Det einaste appen faktisk reknar ut er verdien av <em>di</em> lytting, ved å gange antal kvalifiserande streams med den publiserte gjennomsnittssatsen:",
    en: "The only calculation the app actually performs is estimating the value of <em>your</em> listening, by multiplying qualifying streams by the published average per-stream rate:",
  },
  disclaimerResearchFormula3: {
    no: "V_{user} \\approx S_{user} \\times V_{stream}",
    en: "V_{user} \\approx S_{user} \\times V_{stream}",
  },
  disclaimerResearchFormula3Vars: {
    no: [
      "<i>V<sub>user</sub></i> = estimert verdi av lyttinga di",
      "<i>S<sub>user</sub></i> = ditt totale antal kvalifiserande streams",
    ],
    en: [
      "<i>V<sub>user</sub></i> = estimated value of your listening",
      "<i>S<sub>user</sub></i> = your total number of qualifying streams",
    ],
  },
  disclaimerResearchIllustrates: {
    no: "Denne analysen illustrerer at det du betalar i abonnement og det artistane du lyttar til mottek, ikkje er direkte knytt saman. Differansen mellom abonnementskostnaden din og den estimerte royaltyverdien viser korleis pro-rata-systemet omfordeler inntektene.",
    en: "This analysis illustrates that what you pay in subscription fees and what the artists you listen to receive are not directly linked. The gap between your subscription cost and the estimated royalty value shows how the pro-rata system redistributes revenue.",
  },
  disclaimerResearchMatters: {
    no: "Å forstå korleis systemet fungerer gjev lyttarar høve til å ta meir informerte val – anten det gjeld å kjøpe musikk direkte, støtte artistar via andre kanalar, eller engasjere seg i debatten om korleis strøymeinntekter bør fordelast.",
    en: "Understanding how the system works allows listeners to make more informed choices – whether that means buying music directly, supporting artists through other channels, or engaging in the debate about how streaming revenue should be distributed.",
  },

  // Break-even analysis
  disclaimerBreakevenTitle: {
    no: "Kor mykje må du lytte for å \u00abgå i null\u00bb?",
    en: "How much do you need to listen to \u201cbreak even\u201d?",
  },
  disclaimerBreakevenIntro: {
    no: "Vi kan estimere kor mange streams som trengst for at den estimerte royaltyverdien av lyttinga di skal tilsvare abonnementet ditt. Utrekninga løyser for <i>S<sub>user</sub></i>:",
    en: "We can estimate how many streams are needed for the estimated royalty value of your listening to match your subscription. The calculation solves for <i>S<sub>user</sub></i>:",
  },
  disclaimerBreakevenFormula: {
    no: "S_{user} \\approx \\frac{\\text{Abonnement}}{V_{stream}}",
    en: "S_{user} \\approx \\frac{\\text{Subscription}}{V_{stream}}",
  },
  disclaimerBreakevenExample: {
    no: "Med ein noverande Premium-pris på 139 NOK/mnd og appen sine royalty-satsar på 0.03–0.05 NOK per stream (avhengig av tidsperiode), gjev dette:",
    en: "With a current Premium price of $11.99/month and the app's royalty rates of $0.003–$0.006 per stream (depending on time period), this gives:",
  },
  disclaimerBreakevenPoolNote: {
    no: "<b>Viktig presisering:</b> Per-stream-satsane som appen brukar (0.03–0.05 NOK) er utleia frå <em>faktiske utbetalingar til rettshavarar</em>, som utgjer ca. 70 % av Spotify sine inntekter. Spotify sin eigen margin (~30 %) er allereie trekt frå. Det betyr at vi samanliknar 100 % av abonnementet ditt mot satsar som berre representerer ~70 % av inntektene. Om vi i staden reknar mot berre royalty-delen av abonnementet (139 × 0.7 ≈ 97 NOK), vert break-even-punktet lågare:",
    en: "<b>Important clarification:</b> The per-stream rates the app uses ($0.003–$0.006) are derived from <em>actual payouts to rights holders</em>, which represent approx. 70% of Spotify's revenue. Spotify's own margin (~30%) has already been deducted. This means we are comparing 100% of your subscription against rates that only represent ~70% of the revenue. If we instead calculate against just the royalty portion of the subscription ($11.99 × 0.7 ≈ $8.39), the break-even point is lower:",
  },
  disclaimerBreakevenNumbers: {
    no: [
      "<b>Låg sats</b> (0.03 NOK): ~4 633 streams/mnd → ~154 streams/dag → ~7,7 timar lytting per dag",
      "<b>Noverande sats</b> (0.04 NOK): ~3 475 streams/mnd → ~116 streams/dag → ~5,8 timar lytting per dag",
      "<b>Høg sats</b> (0.05 NOK): ~2 780 streams/mnd → ~93 streams/dag → ~4,6 timar lytting per dag",
    ],
    en: [
      "<b>Low rate</b> ($0.003): ~4,000 streams/mo → ~133 streams/day → ~6.6 hours of listening per day",
      "<b>Current rate</b> ($0.004): ~3,000 streams/mo → ~100 streams/day → ~5 hours of listening per day",
      "<b>High rate</b> ($0.006): ~2,000 streams/mo → ~67 streams/day → ~3.3 hours of listening per day",
    ],
  },
  disclaimerBreakevenPoolNumbers: {
    no: [
      "<b>Låg sats</b> (0.03 NOK): ~3 233 streams/mnd → ~108 streams/dag → ~5,4 timar lytting per dag",
      "<b>Noverande sats</b> (0.04 NOK): ~2 425 streams/mnd → ~81 streams/dag → ~4,0 timar lytting per dag",
      "<b>Høg sats</b> (0.05 NOK): ~1 940 streams/mnd → ~65 streams/dag → ~3,2 timar lytting per dag",
    ],
    en: [
      "<b>Low rate</b> ($0.003): ~2,797 streams/mo → ~93 streams/day → ~4.7 hours of listening per day",
      "<b>Current rate</b> ($0.004): ~2,098 streams/mo → ~70 streams/day → ~3.5 hours of listening per day",
      "<b>High rate</b> ($0.006): ~1,398 streams/mo → ~47 streams/day → ~2.3 hours of listening per day",
    ],
  },
  disclaimerBreakevenImplication: {
    no: "Matematisk sett vil gjennomsnittslyttaren per definisjon generere nok streams til å matche gjennomsnittet – men spørsmålet er <em>kven</em> som driv dette gjennomsnittet. Det finst lite uavhengig forsking på korleis lyttetid fordeler seg blant Spotify sine brukarar, og i kva grad høgt lyttevolum kjem frå aktive, medvitne lytteøkter. Som eit konkret døme: utviklaren av denne appen hadde eit gjennomsnittleg strøymetal tilsvarande ca. 12 minutt om dagen – noko som betyr at over 3 timar dagleg lytteverdi vart omfordelt vekk frå artistane han lytta til. Differansen mellom abonnementet ditt og den estimerte royaltyverdien går inn i den globale potten og vert fordelt etter total lytting på plattforma.",
    en: "Mathematically, the average listener will by definition generate enough streams to match the average – but the question is <em>who</em> drives that average. There is little independent research on how listening time is distributed among Spotify's users, and to what extent high listening volumes come from active, conscious listening sessions. As a concrete example: the developer of this app had an average streaming figure equivalent to about 12 minutes per day – meaning over 3 hours of daily listening value was redistributed away from the artists he listened to. The difference between your subscription and the estimated royalty value enters the global pool and is distributed according to total listening on the platform.",
  },
  disclaimerBreakevenCaveat: {
    no: "Men sjølv om du lyttar nok til å \u00abgå i null\u00bb, stoppar ikkje omfordelinga. I pro-rata-modellen følgjer ikkje abonnementspengane dine lyttinga di direkte – dei aukar berre den totale potten. Du kan aldri fullt ut sikre at pengane dine går til akkurat dei artistane du høyrer på.",
    en: "But even if you listen enough to \u201cbreak even,\u201d the redistribution does not stop. In the pro-rata model, your subscription payment does not follow your listening directly – it only increases the total pool. You can never fully ensure that your money goes to exactly the artists you listen to.",
  },
  disclaimerBreakevenGenre: {
    no: "Påverknaden ei enkelt lytting har på den globale potten vil logisk sett vere avhengig av korleis grupper med felles lyttevanar skapar strøymetrendar. Dette gjer nokre sjangrar meir sårbare enn andre – musikk med smalare publikum når sjeldan dei volumnivåa som gir utteljing i eit pro-rata-system.",
    en: "The impact any individual listening has on the global pool is logically determined by how groups with common listening habits create streaming trends. This leaves some genres more vulnerable than others – music with narrower audiences rarely reaches the volume levels that yield meaningful returns in a pro-rata system.",
  },

  // Studies section (collapsible)
  disclaimerStudiesTitle: {
    no: "Kva seier forskinga?",
    en: "What do studies say?",
  },
  disclaimerStudiesIntro: {
    no: "Fleire uavhengige forskingsprosjekt har undersøkt korleis ulike fordelingsmodellar påverkar artistar. Dei fleste studiane er prega av mangel på gode data frå plattformene, og er avgrensa mot problemstillingar det er mogleg å seie noko om med tilgjengeleg informasjon. Her er eit utval av sentrale studiar:",
    en: "Several independent research projects have examined how different distribution models affect artists. Most studies are characterised by a lack of good data from the platforms, and are limited to questions that can be addressed with available information. Here is a selection of key studies:",
  },
  disclaimerStudy1Title: {
    no: "A Meta Study of User-Centric Distribution for Music Streaming",
    en: "A Meta Study of User-Centric Distribution for Music Streaming",
  },
  disclaimerStudy1Meta: {
    no: "Rasmus Rex Pedersen · Koda / Roskilde Universitet · 2020",
    en: "Rasmus Rex Pedersen · Koda / Roskilde University · 2020",
  },
  disclaimerStudy1Summary: {
    no: "Meta-studien samanliknar fire empiriske undersøkingar av brukarsentrert fordeling (UCD) vs. pro-rata. Hovudfunna er at overordna fordeling mellom plateselskap vert lite endra, men UCD kjem betre ut for artistar utanfor den absolutte toppen – særleg lokale og nisjeprega artistar. Effekten varierer etter individuelle lyttemønster.",
    en: "This meta-study compares four empirical investigations of user-centric distribution (UCD) vs. pro-rata. The main findings are that overall label-level shares change little, but UCD benefits artists outside the extreme top – especially local and niche artists. The effect varies by individual listening patterns.",
  },
  disclaimerStudy1Url: {
    no: "https://www.koda.dk/media/224782/meta-study-of-user-centric-distribution-model-for-music-streaming.pdf",
    en: "https://www.koda.dk/media/224782/meta-study-of-user-centric-distribution-model-for-music-streaming.pdf",
  },
  disclaimerStudy2Title: {
    no: "User Centric Payment System (UCPS)",
    en: "User Centric Payment System (UCPS)",
  },
  disclaimerStudy2Meta: {
    no: "Centre national de la musique (CNM) / Deloitte · Frankrike · 2021",
    en: "Centre national de la musique (CNM) / Deloitte · France · 2021",
  },
  disclaimerStudy2Summary: {
    no: "Den største studien til no, basert på faktiske data frå Deezer og Spotify i Frankrike. Hovudfunn: UCPS ville betre samsvar mellom fordeling og forbrukaråtferd, marginalt gagne artistar utanfor den ekstreme toppen, og redusere effekten av klikk-svindel. Omfordelinga skjer primært mellom sjangrar, ikkje mellom store og små aktørar.",
    en: "The largest study to date, based on actual data from Deezer and Spotify in France. Main findings: UCPS would better align distribution with consumer behaviour, marginally benefit artists outside the extreme top, and reduce the impact of click fraud. Redistribution occurs primarily between genres, not between large and small actors.",
  },
  disclaimerStudy2Url: {
    no: "https://cnm.fr/en/studies/impact-of-online-music-streaming-services-adopting-the-ucps/",
    en: "https://cnm.fr/en/studies/impact-of-online-music-streaming-services-adopting-the-ucps/",
  },
  disclaimerStudy3Title: {
    no: "Revenue Sharing at Music Streaming Platforms",
    en: "Revenue Sharing at Music Streaming Platforms",
  },
  disclaimerStudy3Meta: {
    no: "Gustavo Bergantiños & Juan D. Moreno-Ternero · Management Science 71(10) · 2025",
    en: "Gustavo Bergantiños & Juan D. Moreno-Ternero · Management Science 71(10) · 2025",
  },
  disclaimerStudy3Summary: {
    no: "Gjev aksiomatiske og spelteori-baserte grunnlag for pro-rata og brukarsentrert fordeling. Studien formaliserer eigenskapane til begge modellar, foreslår kompromissfamiliar av metodar, og viser at begge tilnærmingane har normativt forsvarleg grunnlag – men med ulike konsekvensar for fordeling.",
    en: "Provides axiomatic and game-theoretical foundations for pro-rata and user-centric distribution. The study formalises the properties of both models, proposes compromise families of methods, and shows that both approaches have normatively defensible foundations – but with different distributional consequences.",
  },
  disclaimerStudy3Url: {
    no: "https://doi.org/10.1287/mnsc.2023.03830",
    en: "https://doi.org/10.1287/mnsc.2023.03830",
  },
  disclaimerStudy4Title: {
    no: "Digital Media Finland: Effekten av brukarsentrert fordeling",
    en: "Digital Media Finland: The effect of user-centric distribution",
  },
  disclaimerStudy4Meta: {
    no: "Arno Muikku · Digital Media Finland · 2017",
    en: "Arno Muikku · Digital Media Finland · 2017",
  },
  disclaimerStudy4Summary: {
    no: "Tidleg finsk studie som simulerte overgang frå pro-rata til brukarsentrert på det finske marknaden. Hovudfunn: Mainstream-artistar ville tape 1–5 %, medan lokale og nisje-sjangrar ville vinne tilsvarande. Studien peika mot at UCD kan styrke kulturelt mangfald i strøymemarknaden.",
    en: "Early Finnish study that simulated a switch from pro-rata to user-centric in the Finnish market. Main findings: Mainstream artists would lose 1–5%, while local and niche genres would gain correspondingly. The study suggested that UCD could strengthen cultural diversity in streaming markets.",
  },
  disclaimerStudy4Url: {
    no: "https://www.digitalmediafi.com/",
    en: "https://www.digitalmediafi.com/",
  },
  disclaimerStudy5Title: {
    no: "Spotify Loud & Clear",
    en: "Spotify Loud & Clear",
  },
  disclaimerStudy5Meta: {
    no: "Spotify · Årlege transparensdata · 2024",
    en: "Spotify · Annual transparency data · 2024",
  },
  disclaimerStudy5Summary: {
    no: "Spotify sine eigne tal om royalty-økonomi: Over $10 milliardar utbetalt til rettshavarar i 2024, ca. 1 500 artistar tente over $1M, 100 000+ artistar tente tusenvis. Uavhengige artistar mottok over $5 milliardar. Dataene gjev kontekst for å forstå skalaen av strøymeøkonomien.",
    en: "Spotify's own figures on royalty economics: Over $10 billion paid out to rights holders in 2024, around 1,500 artists earned over $1M, 100,000+ artists earned thousands. Independent artists received over $5 billion. The data provides context for understanding the scale of the streaming economy.",
  },
  disclaimerStudy5Url: {
    no: "https://loudandclear.byspotify.com/",
    en: "https://loudandclear.byspotify.com/",
  },
  disclaimerStudy6Title: {
    no: "FIM: Samanlikning av pro-rata og brukarsentrert fordeling",
    en: "FIM: Comparison of pro-rata and user-centric distribution",
  },
  disclaimerStudy6Meta: {
    no: "International Federation of Musicians (FIM) · 2018",
    en: "International Federation of Musicians (FIM) · 2018",
  },
  disclaimerStudy6Summary: {
    no: "FIM gjennomgjekk fire empiriske studiar og konkluderte med at brukarsentrert fordeling ville gagne nisjemusikk og lokale artistar, utan store endringar på overordna nivå. Rapporten tilrådde vidare utforsking av UCD som eit meir rettferdig alternativ.",
    en: "FIM reviewed four empirical studies and concluded that user-centric distribution would benefit niche music and local artists, without major changes at the macro level. The report recommended further exploration of UCD as a more equitable alternative.",
  },
  disclaimerStudy6Url: {
    no: "https://www.fim-musicians.org/wp-content/uploads/prorata-vs-user-centric-models-study-2018.pdf",
    en: "https://www.fim-musicians.org/wp-content/uploads/prorata-vs-user-centric-models-study-2018.pdf",
  },
  disclaimerStudy7Title: {
    no: "The Music Business and Digital Impacts",
    en: "The Music Business and Digital Impacts",
  },
  disclaimerStudy7Meta: {
    no: "Daniel Nordgård · Universitetet i Agder / Springer · 2018",
    en: "Daniel Nordgård · University of Agder / Springer · 2018",
  },
  disclaimerStudy7Summary: {
    no: "Nordgård analyserer korleis digitalisering og strøyming har endra maktstrukturar og verdikjeder i musikkbransjen. Boka drøftar korleis pro-rata-fordelingsmodellar påverkar ulike aktørar ulikt, og argumenterer for at bransjen treng meir transparens og nye fordelingsmekanismar for å sikre berekraftig mangfald.",
    en: "Nordgård analyses how digitalisation and streaming have changed power structures and value chains in the music industry. The book discusses how pro-rata distribution models affect different actors differently, and argues that the industry needs more transparency and new distribution mechanisms to ensure sustainable diversity.",
  },
  disclaimerStudy7Url: {
    no: "https://doi.org/10.1007/978-3-319-91887-7",
    en: "https://doi.org/10.1007/978-3-319-91887-7",
  },
  disclaimerStudy8Title: {
    no: "On click-fraud under pro-rata revenue sharing rule",
    en: "On click-fraud under pro-rata revenue sharing rule",
  },
  disclaimerStudy8Meta: {
    no: "Hao Yu · arXiv (econ.TH) · 2026",
    en: "Hao Yu · arXiv (econ.TH) · 2026",
  },
  disclaimerStudy8Summary: {
    no: "Analyserer klikk-svindel som ei sårbarheit i pro-rata-modellen. Viser at pro-rata er meir robust enn anteke når svindelteknologien er svak, men at ein parametrisk vekta regel mellom pro-rata og brukarsentrert kan eliminere svindelinsentiv. Drøftar også implikasjonar av Spotify sin moderniserte royalty-modell for svindelinsentiv.",
    en: "Analyses click-fraud as a vulnerability of the pro-rata model. Shows that pro-rata is more robust than assumed when fraud technology is weak, but that a parametric weighted rule interpolating between pro-rata and user-centric can eliminate fraud incentives. Also discusses implications of Spotify's modernised royalty system for fraud incentives.",
  },
  disclaimerStudy8Url: {
    no: "https://arxiv.org/abs/2601.09573",
    en: "https://arxiv.org/abs/2601.09573",
  },

  // Shopping list PDF
  shoppingListTitle: {
    no: "🎵 Handleliste – Album å kjøpe",
    en: "🎵 Shopping list – Albums to buy",
  },
  shoppingListTotal: { no: "Totalt", en: "Total" },
  shoppingListGenerated: {
    no: "Generert frå Spotify Unwrapped – banjohans.github.io/Spotify-Unwrapped",
    en: "Generated from Spotify Unwrapped – banjohans.github.io/Spotify-Unwrapped",
  },

  // Share
  shareResults: {
    no: "Del resultata dine",
    en: "Share your results",
  },
  shareDownload: {
    no: "Last ned bilete",
    en: "Download image",
  },
  shareFacebook: {
    no: "Del på Facebook",
    en: "Share on Facebook",
  },
  shareCopiedImage: {
    no: "📋 Bilete kopiert til utklippstavla + lasta ned!\nLim det inn (Ctrl+V / ⌘V) i eit nytt innlegg på Facebook, Instagram, eller kvar du vil.",
    en: "📋 Image copied to clipboard + downloaded!\nPaste it (Ctrl+V / ⌘V) into a new post on Facebook, Instagram, or wherever you like.",
  },
  shareCopiedText: {
    no: "📸 Bilete lasta ned + tekst kopiert!\nLag eit nytt innlegg på Facebook/Instagram og legg ved biletet.",
    en: "📸 Image downloaded + text copied!\nCreate a new post on Facebook/Instagram and attach the image.",
  },
  shareFbToast: {
    no: "📋 Bilete kopiert + lasta ned! Facebook er opna.\n\n1. Trykk «Kva tenker du på?»\n2. Lim inn biletet (⌘V / Ctrl+V)\n3. Legg til ein kommentar og del!",
    en: '📋 Image copied + downloaded! Facebook is open.\n\n1. Click "What\'s on your mind?"\n2. Paste the image (⌘V / Ctrl+V)\n3. Add a comment and share!',
  },
  shareText: {
    no: "Eg har sjekka korleis Spotify sin pro-rata-modell fordeler abonnementspengane mine med Spotify Unwrapped! 🎵\n\nVisste du at abonnementspengane dine ikkje vert tildelt direkte til musikken du lyttar til? Prøv sjølv – det er 100 % lokalt og trygt:\n",
    en: "I explored how Spotify's pro-rata model distributes my subscription with Spotify Unwrapped! 🎵\n\nDid you know your subscription isn't directly allocated to the music you listen to? Try it yourself – it's 100% local and private:\n",
  },
  shareTip: {
    no: "📱 På mobil deler du direkte med biletet. 💻 På PC vert biletet kopiert til utklippstavla — lim det rett inn i eit nytt innlegg.",
    en: "📱 On mobile, share directly with the image. 💻 On desktop, the image is copied to your clipboard — paste it right into a new post.",
  },

  // Listening patterns section
  listeningPatternsTitle: {
    no: "Lyttevanar",
    en: "Listening patterns",
  },
  listeningPatternsDesc: {
    no: "Sjå korleis du lyttar – dag for dag, time for time, og kva type lytting det er.",
    en: "See how you listen – day by day, hour by hour, and what type of listening it is.",
  },

  // Artist section
  yourArtistsTitle: {
    no: "Dine artistar",
    en: "Your artists",
  },

  // Summary & Export section
  summaryExportTitle: {
    no: "Samandrag og deling",
    en: "Summary & sharing",
  },
  summaryExportDesc: {
    no: "No har du sett gjennom dataene dine. Eksporter ein PDF-rapport eller del resultata på sosiale medium.",
    en: "You've now reviewed your data. Export a PDF report or share your results on social media.",
  },

  // Total streams
  totalStreams: {
    no: "Totalt antal strøymingar",
    en: "Total streams",
  },

  // Streams label (artist list)
  streamsLabel: { no: "Streams", en: "Streams" },

  // Loyalty score
  loyaltyLabel: { no: "Lojalitet", en: "Loyalty" },
  loyaltySince: { no: "sidan", en: "since" },
  loyaltyMonths: { no: "mnd", en: "mo" },

  // Heatmap
  heatmapTab: { no: "Kalender", en: "Calendar" },
  heatmapLess: { no: "Mindre", en: "Less" },
  heatmapMore: { no: "Meir", en: "More" },

  // Subscription tier
  subHistoryTitle: {
    no: "Abonnementshistorikk",
    en: "Subscription history",
  },
  subHistoryDesc: {
    no: "Legg til periodane dine for meir nøyaktige estimat. Standard er Premium Individual. Hol i tidslinja vert tolka som periodar utan abonnement.",
    en: "Add your subscription periods for more accurate estimates. Defaults to Premium Individual. Gaps in the timeline are treated as periods without a paid subscription.",
  },
  tierFree: { no: "Gratis", en: "Free" },
  tierIndividual: { no: "Premium Individual", en: "Premium Individual" },
  tierStudent: { no: "Premium Student", en: "Premium Student" },
  tierDuo: { no: "Premium Duo", en: "Premium Duo" },
  tierFamily: { no: "Premium Family", en: "Premium Family" },
  tierUnknown: { no: "Veit ikkje", en: "Don't know" },
  tierLabel: { no: "Abonnementstype", en: "Subscription tier" },
  segmentFrom: { no: "Frå", en: "From" },
  segmentTo: { no: "Til", en: "To" },
  segmentOngoing: { no: "Pågåande", en: "Ongoing" },
  addSegment: { no: "Legg til periode", en: "Add period" },
  removeSegment: { no: "Fjern", en: "Remove" },
  tierNotAvailable: {
    no: "Denne abonnementstypen var ikkje tilgjengeleg før {date}",
    en: "This tier was not available before {date}",
  },
  tierImpactTitle: {
    no: "Effekt av abonnementstype",
    en: "Subscription tier impact",
  },
  tierImpactFree: {
    no: "I {months} månad(ar) på gratisabonnement kom artistinntektene frå reklamefinansiering i staden for abonnement. Reklamefinansierte streams har ein estimert per-stream-verdi på ~35 % av abonnementsfinansierte streams.",
    en: "During {months} month(s) on the Free tier, artist earnings came from ad revenue instead of subscription fees. Ad-funded streams have an estimated per-stream value of ~35% compared to subscription-funded streams.",
  },
  tierImpactFreeDelta: {
    no: "Estimert skilnad i per-stream-verdi: {amount} (reklamefinansiert vs. abonnementsfinansiert).",
    en: "Estimated per-stream value difference: {amount} (ad-funded vs. subscription-funded).",
  },
  tierImpactAllPaid: {
    no: "All lyttinga di var med eit betalt abonnement — artistane mottok full per-stream-verdi.",
    en: "All your listening was on a paid plan — artists received full per-stream value.",
  },
  tierStudentNote: {
    no: "Student-abonnement betalar same per-stream-verdi som Premium, men kostar deg mindre.",
    en: "Student plans pay the same per-stream value as Premium but cost you less.",
  },
  tierMethodologyNote: {
    no: "Spotify brukar ein pro-rata pooling-modell der <em>all</em> inntekt — både abonnement og reklame — vert samla i ein felles pott. Denne potten vert fordelt til rettshavarar basert på støymedelen deira. Reklameinntekt per brukar er vesentleg lågare enn abonnementsinntekt per brukar. Difor er per-stream-verdien for reklamefinansierte streams lågare — ikkje fordi artisten ikkje får betalt, men fordi inntektskjelda genererer mindre pengar totalt. Estimatet vårt brukar ein multiplikator på 0,35 for gratis-tier basert på bransjedata (Spotify Loud & Clear, Digital Music News).",
    en: "Spotify uses a pro-rata pooling model where <em>all</em> revenue — both subscriptions and advertising — is collected into a shared pool. This pool is distributed to rights holders based on their streaming share. Ad revenue per user is significantly lower than subscription revenue per user. This is why per-stream value for ad-funded streams is lower — not because artists don't get paid, but because the revenue source generates less money overall. Our estimate uses a 0.35 multiplier for the Free tier based on industry data (Spotify Loud & Clear, Digital Music News).",
  },
  presetAlwaysPremium: { no: "Alltid Premium", en: "Always Premium" },
  presetAlwaysFree: { no: "Alltid Gratis", en: "Always Free" },
  presetCustom: { no: "Eigendefinert", en: "Custom" },

  // ─── File guide (upload section) ──────────────────────────────
  fileGuideToggle: {
    no: "Kva filer har eg fått frå Spotify?",
    en: "What files did I get from Spotify?",
  },
  fileGuideIntro: {
    no: "Spotify sender deg fleire JSON-filer i GDPR-eksporten. Her er ei oversikt over kva kvar fil inneheld og korleis Spotify Unwrapped brukar dei.",
    en: "Spotify sends you several JSON files in the GDPR export. Here's an overview of what each file contains and how Spotify Unwrapped uses them.",
  },
  fileGuideRequired: {
    no: "Hovuddata (strøymehistorikk)",
    en: "Main data (streaming history)",
  },
  fileGuideOptional: {
    no: "Tilleggsdata (valfritt)",
    en: "Additional data (optional)",
  },
  fileGuideNotUsed: {
    no: "Ikkje brukt av Unwrapped",
    en: "Not used by Unwrapped",
  },
  fileGuideUsedFor: { no: "Brukt til", en: "Used for" },
  fileGuideContains: { no: "Innhald", en: "Contains" },
  fileGuideStatus: { no: "Status", en: "Status" },
  fileGuideLoaded: { no: "Lasta opp ✓", en: "Uploaded ✓" },
  fileGuideNotLoaded: { no: "Ikkje lasta opp", en: "Not uploaded" },

  // ─── Inferences section ────────────────────────────────────────
  inferencesTitle: {
    no: "Slik ser Spotify deg",
    en: "How Spotify sees you",
  },
  inferencesDesc: {
    no: "Spotify byggjer ein annonseprofil av deg basert på lyttevanane dine. Desse kategoriane vert brukte til å selje målretta reklame. Fila <code>Inferences.json</code> viser kva segment Spotify har plassert deg i.",
    en: "Spotify builds an advertising profile of you based on your listening habits. These categories are used to sell targeted ads. The file <code>Inferences.json</code> shows which segments Spotify has placed you in.",
  },
  inferencesDemo: { no: "Demografisk", en: "Demographic" },
  inferencesContent: { no: "Innhaldspreferansar", en: "Content preferences" },
  inferencesAdSegments: { no: "Annonsesegment", en: "Ad segments" },
  inferencesRestricted: { no: "Annonsøravgrensa", en: "Advertiser-Restricted" },
  inferencesOther: { no: "Andre", en: "Other" },
  inferencesPrivacyNote: {
    no: "Denne informasjonen vert brukt av Spotify til å selje annonseringsplassar. Du er ikkje berre ein lyttar — du er eit produkt.",
    en: "This information is used by Spotify to sell advertising space. You're not just a listener — you're a product.",
  },

  // ─── Marquee section ──────────────────────────────────────────
  marqueeTitle: {
    no: "Dine lyttarsegment (Marquee)",
    en: "Your listener segments (Marquee)",
  },
  marqueeDesc: {
    no: 'Spotify kategoriserer forholdet ditt til artistar i ulike lyttarsegment. Desse segmenta vert brukte i <a href="https://artists.spotify.com/marquee" target="_blank" rel="noopener">Marquee</a> — eit betalt marknadsføringsverktøy der artistar og plateselskap kan betale for fullskjermsanbefalingar retta mot bestemte lyttargrupper. Fila viser ikkje kven som faktisk har betalt for kampanjar — berre korleis Spotify har klassifisert deg.',
    en: 'Spotify categorizes your relationship to artists into listener segments. These segments are used in <a href="https://artists.spotify.com/marquee" target="_blank" rel="noopener">Marquee</a> — a paid marketing tool where artists and labels can pay for full-screen recommendations targeted at specific listener groups. This file does not show who actually paid for campaigns — only how Spotify has classified you.',
  },
  marqueeCount: {
    no: "Du er segmentert for {count} artistar",
    en: "You are segmented for {count} artists",
  },
  marqueeEthicsNote: {
    no: "Spotify tener pengar <em>begge vegar</em>: frå abonnementet ditt og frå artistar som betaler for å bli promotert til deg. Marquee-segmenteringa viser korleis Spotify gjer lyttarane sine til ei vare — du vert kategorisert og pakka inn som målgruppe for betalt marknadsføring.",
    en: "Spotify earns money <em>both ways</em>: from your subscription and from artists paying to be promoted to you. The Marquee segmentation shows how Spotify turns its listeners into a product — you are categorized and packaged as a target audience for paid marketing.",
  },

  // ─── Userdata section ─────────────────────────────────────────
  userdataTitle: {
    no: "Kontoinformasjon",
    en: "Account information",
  },
  userdataDesc: {
    no: "Grunnleggande informasjon frå Spotify-kontoen din (<code>Userdata.json</code>).",
    en: "Basic information from your Spotify account (<code>Userdata.json</code>).",
  },
  userdataCreated: { no: "Konto oppretta", en: "Account created" },
  userdataCountry: { no: "Land", en: "Country" },
  userdataAccountAge: { no: "Kontoalder", en: "Account age" },
  userdataYears: { no: "år", en: "years" },

  // ─── Anonymized data contribution ─────────────────────────────
  contributeTitle: {
    no: "Bidra anonymisert data til forsking",
    en: "Contribute anonymized data for research",
  },
  contributeDesc: {
    no: "Vi fjernar sensitive data og tek ut berre dei relevante dataene som kan brukast til å seie noko fornuftig når ein slår fleire lyttarar sine lyttevanar saman. Dataene vil kunne hjelpe forskarar og studentar med å forstå lyttemønster og måten Spotify vert brukt på.",
    en: "We remove sensitive data and extract only the relevant data that can provide meaningful insights when multiple listeners' habits are combined. The data can help researchers and students understand listening patterns and how Spotify is used.",
  },
  contributeBtn: {
    no: "Opne anonymisert eksport",
    en: "Open anonymized export",
  },
  contributeNoData: {
    no: "Du må laste opp Spotify-dataene dine først før du kan bidra.",
    en: "You need to upload your Spotify data first before you can contribute.",
  },
  contributeCtaHeadline: {
    no: "Vil du bidra til ein felles datadugnad?",
    en: "Want to contribute to a data pool?",
  },
  contributeDemographicsTitle: {
    no: "Valfri demografisk informasjon",
    en: "Optional demographic information",
  },
  contributeDemographicsDesc: {
    no: "Denne informasjonen er valfri og vert berre brukt til å analysere lyttemønster på tvers av grupper. Du kan hoppe over alle felta.",
    en: "This information is optional and is only used to analyze patterns across groups. You can skip any field.",
  },
  contributeGenderLabel: { no: "Kjønn", en: "Gender" },
  contributeGenderOptions: {
    no: ["Vil ikkje seie", "Mann", "Kvinne", "Ikkje-binær", "Anna"],
    en: ["Prefer not to say", "Male", "Female", "Non-binary", "Other"],
  },
  contributeAgeLabel: { no: "Aldersgruppe", en: "Age group" },
  contributeAgeOptions: {
    no: [
      "Vil ikkje seie",
      "Under 18",
      "18–24",
      "25–34",
      "35–44",
      "45–54",
      "55–64",
      "65+",
    ],
    en: [
      "Prefer not to say",
      "Under 18",
      "18–24",
      "25–34",
      "35–44",
      "45–54",
      "55–64",
      "65+",
    ],
  },
  contributeSocialLabel: { no: "Sosial status", en: "Social status" },
  contributeSocialOptions: {
    no: [
      "Vil ikkje seie",
      "Student",
      "Tilsett",
      "Sjølvstendig næringsdrivande",
      "Arbeidsledig",
      "Pensjonert",
      "Anna",
    ],
    en: [
      "Prefer not to say",
      "Student",
      "Employed",
      "Self-employed",
      "Unemployed",
      "Retired",
      "Other",
    ],
  },
  contributeCountryLabel: { no: "Land", en: "Country" },
  contributeConsentLabel: {
    no: "Eg godtek at dei opplasta filene kan brukast til analyse og forsking",
    en: "I accept that the uploaded files may be used for analysis and research",
  },
  captchaPrompt: {
    no: "Stadfest at du er eit menneske: kva er {a} + {b}?",
    en: "Verify you are human: what is {a} + {b}?",
  },
  captchaHint: {
    no: "Svar rett for å låse opp nedlasting",
    en: "Answer correctly to unlock download",
  },
  researcherCtaHeadline: {
    no: "Treng du samla data til forskinga di?",
    en: "Need pooled data for your research?",
  },
  researcherCtaDesc: {
    no: "Anonymiserte lyttedata frå bidragsytarar er tilgjengelege for forskarar etter førespurnad. Send oss ein e-post med informasjon om forskingsprosjektet ditt.",
    en: "Anonymized listening data from contributors is available to researchers upon request. Send us an email with information about your research project.",
  },
  researcherCtaLink: {
    no: "Send førespurnad",
    en: "Request access",
  },
  contributeDownload: {
    no: "Last ned anonymisert fil",
    en: "Download anonymized file",
  },
  contributeUploadHint: {
    no: "Etter nedlasting kan du laste opp fila via lenkja under for å bidra til forskingsdatasettet. Ved å laste opp godtek du at dei anonymiserte dataene kan brukast fritt til forsking og analyse.",
    en: "After downloading, you can upload the file via the link below to contribute to the research dataset. By uploading, you agree that the anonymized data may be freely used for research and analysis.",
  },
  contributeUploadLink: {
    no: "Last opp til forskingsdatasett",
    en: "Upload to research dataset",
  },
  contributePrivacyNote: {
    no: "Fila inneheld <strong>ingen</strong> brukarnamn, IP-adresser, e-post eller andre identifiserande data. Ein pseudonym hash-ID gjer det mogleg å gruppere fleire eksportar frå same brukar utan å avsløre identiteten.",
    en: "The file contains <strong>no</strong> usernames, IP addresses, emails, or other identifying data. A pseudonymous hash ID allows grouping multiple exports from the same user without revealing identity.",
  },
  contributeIncludedTitle: {
    no: "Kva er inkludert",
    en: "What's included",
  },
  contributeIncluded: {
    no: [
      "Artistnamn og albumnamn",
      "Lyttetid per straum (ms)",
      "Tidspunkt for kvar straum (tidsforskyvd ±59 min for anonymisering)",
      "Aktiv/passiv-klassifisering (reason_start/end)",
      "Valfri demografisk info du vel å oppgje",
    ],
    en: [
      "Artist names and album names",
      "Listening time per stream (ms)",
      "Timestamp for each stream (time-shifted ±59 min for anonymization)",
      "Active/passive classification (reason_start/end)",
      "Optional demographic info you choose to provide",
    ],
  },
  contributeRemovedTitle: {
    no: "Kva er fjerna",
    en: "What's removed",
  },
  contributeRemoved: {
    no: [
      "Brukarnamn og e-post",
      "IP-adresser",
      "Spotify URI-ar (sporbar tilbake til konto)",
      "Inkognitomodus-flagg",
      "Offline-flagg",
    ],
    en: [
      "Username and email",
      "IP addresses",
      "Spotify URIs (traceable back to account)",
      "Incognito mode flag",
      "Offline flag",
    ],
  },

  // ─── Industry Charts (Loud & Clear) ──────────────────────────
  industryNavLabel: {
    no: "Bransjedata",
    en: "Industry data",
  },
  myDataNavLabel: {
    no: "Mine data",
    en: "My data",
  },
  industryTitle: {
    no: "Skuggeside: Spotify sine eigne tal",
    en: "The Shadow Side: Spotify's Own Numbers",
  },
  industrySubtitle: {
    no: "Desse grafane brukar offisielle tal frå Spotify Loud & Clear for å setje den store skeivfordelinga i perspektiv.",
    en: "These charts use official numbers from Spotify Loud & Clear to put the massive inequality in perspective.",
  },
  industrySourceNote: {
    no: "Kjelde: loudandclear.byspotify.com · Data frå {year}",
    en: "Source: loudandclear.byspotify.com · {year} data",
  },

  // Tab labels
  industryTabPyramid: { no: "Ulikheitspyramiden", en: "Inequality Pyramid" },
  industryTabMoneyFlow: { no: "Pengeflyten", en: "Money Flow" },
  industryTabMinWage: { no: "Minstelønn-testen", en: "Minimum Wage Test" },
  industryTabPerStream: { no: "Per-stream-rate", en: "Per-Stream Rate" },
  industryTabPerArtist: { no: "Per artist", en: "Per Artist" },
  industryTabStreamsToLive: {
    no: "Streams for å leve",
    en: "Streams to Survive",
  },

  // 1. Inequality Pyramid
  pyramidTitle: {
    no: "Ulikheitspyramiden: {totalArtists} artistar på Spotify",
    en: "The Inequality Pyramid: {totalArtists} artists on Spotify",
  },
  pyramidDesc: {
    no: "Spotify skryt av 13 800 artistar som tener over $100 000. Men det er berre 0,13 % av alle artistane på plattforma. Resten — over 10,9 millionar — deler smulane.",
    en: "Spotify boasts about 13,800 artists earning over $100,000. But that's just 0.13% of all artists on the platform. The rest — over 10.9 million — share the crumbs.",
  },
  pyramidArtists: { no: "artistar", en: "artists" },
  pyramidOfTotal: { no: "av alle", en: "of total" },
  pyramidBelowThreshold: {
    no: "<$1K eller ingenting",
    en: "<$1K or nothing",
  },

  // 2. Money Flow / Waterfall
  moneyFlowTitle: {
    no: "Kor går {price}/mnd?",
    en: "Where does {price}/mo go?",
  },
  moneyFlowDesc: {
    no: "Abonnementet ditt vert delt opp lenge før artisten ser ei krone. Slik ser verdikjeda ut:",
    en: "Your subscription is carved up long before the artist sees a penny. Here's the value chain:",
  },
  moneyFlowSpotify: { no: "Spotify tek ~30 %", en: "Spotify takes ~30%" },
  moneyFlowLabelKeeps: { no: "Plateselskap beheld", en: "Label keeps" },
  moneyFlowPublisherKeeps: { no: "Forlag beheld", en: "Publisher keeps" },
  moneyFlowArtistRecording: {
    no: "Artist (innspelingsrettar)",
    en: "Artist (recording royalty)",
  },
  moneyFlowSongwriter: {
    no: "Låtskrivar (publiseringsrettar)",
    en: "Songwriter (publishing)",
  },
  moneyFlowLeftForArtist: {
    no: "Artist + låtskrivar sit att med ~{amount} ({pct}%) — resten går til mellomledd",
    en: "Artist + songwriter are left with ~{amount} ({pct}%) — the rest goes to intermediaries",
  },
  moneyFlowAlbumCompare: {
    no: "Eitt albumkjøp ({albumPrice}) gir artisten ~{albumArtistShare} — {times}x meir enn ein månad med streaming.",
    en: "One album purchase ({albumPrice}) gives the artist ~{albumArtistShare} — {times}x more than a month of streaming.",
  },

  // 3. The 100,000th Artist / Minimum wage
  minWageTitle: {
    no: "Artist nr. 100 000 sin verdikjede tener {amount}/år",
    en: "Artist #100,000's value chain earns {amount}/year",
  },
  minWageDesc: {
    no: "Spotify framstiller dette som ein suksesshistorie. Men {amount}/år er det som vert utbetalt til heile verdikjeda — plateselskap, forlag, distributør og artist. Artisten sjølv sit att med ein brøkdel. Slik ser fullt beløp ut samanlikna med minstelønn:",
    en: "Spotify presents this as a success story. But {amount}/year is what's paid out to the entire value chain — label, publisher, distributor, and artist. The artist themselves keeps a fraction. Here's how the full amount compares to minimum wage:",
  },
  minWageHourly: {
    no: "timelønn (fulltid)",
    en: "hourly wage (full-time)",
  },
  minWageArtistLabel: {
    no: "Artist #100 000 — verdikjeda",
    en: "Artist #100,000 — value chain",
  },
  minWageCountry: { no: "Minstelønn", en: "Minimum wage" },

  // 4. Per-Stream Rate vs Revenue
  perStreamTitle: {
    no: "Per-stream-rate fell — Spotify sine inntekter stig",
    en: "Per-stream rate falls — Spotify's revenue rises",
  },
  perStreamDesc: {
    no: "Sjølv om Spotify tener meir enn nokon gong, har betalinga per avspeling blitt lågare med tida. Artistane får ein stadig mindre bit av ein veksande kake.",
    en: "Even though Spotify earns more than ever, the payment per play has declined over time. Artists get an ever-smaller slice of a growing pie.",
  },
  perStreamRateLabel: {
    no: "Per-stream rate (USD)",
    en: "Per-stream rate (USD)",
  },
  perStreamRateRealLabel: {
    no: "Reell rate (KPI-justert, 2025-kr)",
    en: "Real rate (CPI-adjusted, 2025$)",
  },
  perStreamRevenueLabel: {
    no: "Spotify-inntekt ($mrd)",
    en: "Spotify revenue ($B)",
  },
  perStreamCpiNote: {
    no: "KPI-justert linje viser den reelle verdien av kvar stream i 2025-dollar. Inflasjonen gjer at det reelle fallet er endå brattare.",
    en: "CPI-adjusted line shows the real value of each stream in 2025 dollars. Inflation makes the real decline even steeper.",
  },

  // 5. Per Artist Average
  perArtistTitle: {
    no: "«$11 milliardar» — kva betyr det eigentleg?",
    en: '"$11 billion" — what does it really mean?',
  },
  perArtistDesc: {
    no: "Spotify la $11 milliardar i potten i 2025. Delt på 11 millionar artistar er snittet ~$1 000. Men fordelinga er ekstremt skeiv — medianen er truleg under $100.",
    en: "Spotify put $11 billion in the pool in 2025. Divided among 11 million artists, the average is ~$1,000. But the distribution is extremely skewed — the median is likely below $100.",
  },
  perArtistAvg: { no: "Gjennomsnitt", en: "Average" },
  perArtistMedian: { no: "Estimert median", en: "Estimated median" },
  perArtistTop1: { no: "Topp 0,01 % snitt", en: "Top 0.01% average" },
  perArtistBottom99: { no: "Botn 99 % snitt", en: "Bottom 99% average" },
  perArtistPerSubscriber: {
    no: "Per abonnent: ~{amountTotal}/år går til rettshavarar. Med typiske plateavtalar sit artistar og låtskrivarar att med ~{amountArtist}/år — som deretter skal fordelast mellom alle medverkande.",
    en: "Per subscriber: ~{amountTotal}/year goes to rights holders. With typical label deals, artists and songwriters are left with ~{amountArtist}/year — which is then split among all contributors.",
  },

  // 6. Streams to survive
  streamsToLiveTitle: {
    no: "Kor mange streams trengst for minstelønn?",
    en: "How many streams for minimum wage?",
  },
  streamsToLiveDesc: {
    no: "Med ein sats på ~$0,004 per stream: dette er kor mange streams ein artist treng kvar månad for å nå minstelønn i ulike land.",
    en: "At a rate of ~$0.004 per stream: this is how many streams an artist needs each month to reach minimum wage in different countries.",
  },
  streamsPerMonth: { no: "streams/mnd", en: "streams/mo" },
  streamsPerDay: { no: "~{n} per dag", en: "~{n} per day" },
  impossibleNote: {
    no: "Til samanlikning: berre ~400 000 songar vart strøyma over 1 million gonger i heile 2025.",
    en: "For comparison: only ~400,000 songs were streamed over 1 million times in all of 2025.",
  },

  // Long-tail toggle (pyramid tab)
  pyramidToggleLabel: { no: "Pyramide", en: "Pyramid" },
  longTailToggleLabel: { no: "Long tail", en: "Long tail" },
  longTailTitle: {
    no: "Long tail: Inntektsfordelinga på Spotify",
    en: "Long tail: Income distribution on Spotify",
  },
  longTailDesc: {
    no: "Same data som pyramiden — vist som ei inntektskurve. Legg merke til den dramatiske spiken heilt til venstre: topp ~6 % tek nesten alt. Resten er ein flat linje langs botnen.",
    en: "Same data as the pyramid — shown as an income curve. Notice the dramatic spike on the far left: the top ~6% take almost everything. The rest is a flat line along the bottom.",
  },

  // Money flow — redistribution notes
  moneyFlowRedistTitle: {
    no: "Pro-rata: Pengane dine går ikkje dit du trur",
    en: "Pro-rata: Your money doesn't go where you think",
  },
  moneyFlowRedistNote: {
    no: "Abonnementet ditt vert fordelt på SAMTLEGE artistar via pro-rata-modellen — ikkje dei du lyttar på. Pengane i potten vert fordelt etter strøymedel: dei som får flest streams globalt, får mest pengar. For dei med få streams vert bidraget ditt i praksis omfordelt til topp 0,01 %.",
    en: "Your subscription is distributed across ALL artists via the pro-rata model — not the ones you listen to. The pool is distributed by stream share: those with the most global streams get the most money. For those with few streams, your contribution is effectively redistributed to the top 0.01%.",
  },
  moneyFlowPoolTopCapture: {
    no: "Topp {n} artistar ({pct}%) tek ~{revPct}% av totalpotten",
    en: "Top {n} artists ({pct}%) capture ~{revPct}% of total pool",
  },
  moneyFlowPoolBottomCapture: {
    no: "Botn {n} artistar ({pct}%) får berre ~{revPct}%",
    en: "Bottom {n} artists ({pct}%) receive only ~{revPct}%",
  },

  // Per artist — revenue concentration
  perArtistConcTitle: {
    no: "Inntektskonsentrasjon: kven tek pengane?",
    en: "Revenue concentration: who gets the money?",
  },
  perArtistConcDesc: {
    no: "Kvar rad viser ein inntektsgruppe. Blå er deira del av alle artistar, raud er deira del av totalinntekta. Skilnaden er sjokkerende.",
    en: "Each row shows an income tier. Blue is their share of all artists, red is their share of total revenue. The gap is staggering.",
  },
  perArtistPctArtists: { no: "% av artistar", en: "% of artists" },
  perArtistPctRevenue: { no: "% av inntekt", en: "% of revenue" },
  perArtistSkewNote: {
    no: "Gjennomsnittet ($1 000/år) er meiningslaust. Dei 1 500 best betalte artistane (~0,014 %) tek over ein tredjedel av heile potten — medan 94 % av alle artistar deler berre 2 % seg imellom.",
    en: "The average ($1,000/year) is meaningless. The top 1,500 artists (~0.014%) take over a third of the entire pool — while 94% of all artists share just 2% among themselves.",
  },

  // ─── Per-chart source citations ────────────────────────────────
  sourcePyramid: {
    no: "Kjelde: Spotify Loud & Clear (loudandclear.byspotify.com) – artistar per inntektsnivå, 2025-tal.",
    en: "Source: Spotify Loud & Clear (loudandclear.byspotify.com) – artists per income tier, 2025 data.",
  },
  sourceMoneyFlow: {
    no: "Kjelder: Spotify investorrapportar (30 % margin), IFPI Global Music Report (75/25 innspeling/publisering), Music Business Worldwide (typisk label-split 80/20), NMPA (forlag/låtskrivar 50/50). Tala gjeld ein typisk signert artist — uavhengige artistar sit att med meir.",
    en: "Sources: Spotify investor reports (30% margin), IFPI Global Music Report (75/25 recording/publishing split), Music Business Worldwide (typical label deal 80/20), NMPA (publisher/songwriter 50/50). Figures are for a typical signed artist — independent artists keep more.",
  },
  sourceMinWage: {
    no: "Kjelder: Spotify Loud & Clear (artist #100 000 = $7 300/år til rettshavarar, ikkje artisten personleg), ILO / OECD minstelønnsdata (2024–2025), omrekna til USD. Artisten sjølv mottek typisk 15–25 % av dette etter at plateselskap, forlag og distributør har teke sin del.",
    en: "Sources: Spotify Loud & Clear (artist #100,000 = $7,300/yr to rights holders, not the artist personally), ILO / OECD minimum wage data (2024–2025), converted to USD. The artist typically receives 15–25% of this after label, publisher, and distributor take their share.",
  },
  sourcePerStream: {
    no: "Kjelder: The Trichordist, Soundcharts, Digital Music News (per-stream-rate), Spotify investorrapportar (inntekt), U.S. Bureau of Labor Statistics CPI-U (inflasjonsjustering).",
    en: "Sources: The Trichordist, Soundcharts, Digital Music News (per-stream rate), Spotify investor reports (revenue), U.S. Bureau of Labor Statistics CPI-U (inflation adjustment).",
  },
  sourcePerArtist: {
    no: "Kjelder: Spotify Loud & Clear ($11 mrd utbetalt 2025, ~11M artistar), investorrapportar (abonnenttal). Gjennomsnittet er matematisk korrekt men misvisande — medianen er estimert <$100.",
    en: "Sources: Spotify Loud & Clear ($11B paid out 2025, ~11M artists), investor reports (subscriber count). The average is mathematically correct but misleading — the median is estimated at <$100.",
  },
  sourceStreamsToLive: {
    no: "Kjelder: Spotify Loud & Clear (per-stream-rate ~$0,004), ILO / OECD minstelønnsdata (2024–2025). Utrekninga: minstelønn/mnd ÷ $0,004/stream.",
    en: "Sources: Spotify Loud & Clear (per-stream rate ~$0.004), ILO / OECD minimum wage data (2024–2025). Calculation: min wage/mo ÷ $0.004/stream.",
  },
} as const;

export type TKey = keyof typeof T;

export function t(key: TKey, locale: Locale): string {
  const entry = T[key];
  const val = entry[locale];
  if (Array.isArray(val)) return (val as readonly string[]).join("\n");
  return val as string;
}

/** Access the raw translation entry (for arrays, functions, etc.) */
export function tRaw<K extends TKey>(
  key: K,
  locale: Locale,
): (typeof T)[K][Locale] {
  return T[key][locale] as (typeof T)[K][Locale];
}
