// src/lib/i18n.ts

export type Locale = "no" | "en";

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
): number {
  const history = PRICE_HISTORY[locale];
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
    no: "Estimert teoretisk verdi for kvar artist basert på gjennomsnittlege straumeprisar (pro-rata modell).",
    en: "Estimated theoretical value per artist based on average streaming rates (pro-rata model).",
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
    no: "Justér anslaga utan å sende data nokon stad.",
    en: "Adjust estimates without sending data anywhere.",
  },
  albumPriceLabel: {
    no: "Standard albumpris (NOK)",
    en: "Default album price (USD)",
  },
  minMsLabel: { no: "Min. ms per rad", en: "Min. ms per row" },
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
  exportReport: { no: "📄 Eksporter rapport:", en: "📄 Export report:" },
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
  difference: { no: "Differanse", en: "Difference" },
  weightedAvg: { no: "vekta snittpris", en: "weighted avg price" },
  pricesUsed: { no: "Prisar brukt", en: "Prices used" },
  proRataNote: {
    no: "Merk: Spotify bruker ein <b>pro-rata pooling-modell</b>. Det betyr at abonnementspengane dine ikkje går direkte til artistane du lyttar til – dei går i ein felles pott og vert fordelt etter kvar artist sin andel av <i>alle</i> streams på plattforma. Estimata her viser ein teoretisk verdi basert på gjennomsnittleg straumepris × lyttetid, ikkje kva artisten faktisk har fått frå akkurat deg.",
    en: "Note: Spotify uses a <b>pro-rata pooling model</b>. This means your subscription payments don't go directly to the artists you listen to – they go into a shared pool and are distributed based on each artist's share of <i>all</i> streams on the platform. Estimates here show a theoretical value based on average stream rate × listening time, not what the artist actually received from you.",
  },
  subPricingNote: {
    no: "<b>Om abonnementsprising:</b> Spotify sin GDPR-dataeksport inneheld ikkje informasjon om abonnementstype eller betalingshistorikk. Feltet <code>Payments.json</code> er tomt, og <code>Userdata.json</code> har berre grunnleggande kontoinformasjon. Difor tek modellen utgangspunkt i standard <b>Premium Individual-abonnement</b>, med historiske prisar verifisert via Wayback Machine.<br/><br/>Grunnen til at Premium er valt som utgangspunkt er at andre abonnementstypar gir <em>mindre pålitelege data</em>: gratisbrukarar får reklame i staden for full betaling, noko som endrar inntektsmodellen; Duo- og Family-plan har lågare pris per brukar; og Student-rabattar gir annan prisstruktur. Premium-modellen gir det <em>mest konservative og pålitelege estimatet</em>, fordi brukaren betaler full pris utan reklameavbrot, og all lytting tel likt.",
    en: "<b>About subscription pricing:</b> Spotify's GDPR data export does not include subscription type or payment history. The <code>Payments.json</code> field is empty, and <code>Userdata.json</code> only contains basic account info. The model therefore uses the standard <b>Premium Individual subscription</b> price, based on historical prices verified via the Wayback Machine.<br/><br/>Premium is used as the baseline because other subscription types produce <em>less reliable data</em>: free-tier users receive ads instead of paying full price, which changes the revenue model; Duo and Family plans have a lower per-user cost; and Student discounts have a different price structure. The Premium model gives the <em>most conservative and reliable estimate</em>, since the user pays full price without ad interruptions and all listening counts equally.",
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
    no: "Fordi Spotify ikkje deler eksakte økonomiske data per lyttar, bruker denne appen tilgjengelige data frå Spotify sin GDPR-eksport og reknar bakover for å estimere teoretiske royalties og abonnementskostnader. Under følgjer ei forklaring steg for steg.",
    en: "Because Spotify does not share exact financial data per listener, this app uses available data from Spotify's GDPR export and reverse-engineers theoretical royalties and subscription costs. Below is a step-by-step explanation.",
  },

  disclaimerStep1Title: {
    no: "1. Filtrering av data",
    en: "1. Data filtering",
  },
  disclaimerStep1: {
    no: "Appen les JSON-filene frå Spotify sin dataeksport. Avspelingar som varar kortare enn ein minimumsgrense (standard: 30 sekund) blir fjerna. Spotify har sjølv sagt at 30 sekund er grensa for at noko tel som ein «stream». Dette hindrar at prøvespeling, hopping og tilfeldige klikk tel som reelle lyttesesjonar.",
    en: 'The app reads the JSON files from Spotify\'s data export. Plays shorter than a minimum threshold (default: 30 seconds) are removed. Spotify itself has stated that 30 seconds is the cutoff for something to count as a "stream." This prevents test plays, skips, and accidental clicks from counting as real listening sessions.',
  },

  disclaimerStep2Title: {
    no: "2. Estimert royalty-verdi",
    en: "2. Estimated royalty value",
  },
  disclaimerStep2: {
    no: "Modellen brukar historiske gjennomsnittssatsar for royalty per stream, basert på bransjedata frå mellom anna The Trichordist og Soundcharts. Satsane er ulike for kvart tidsrom (sjå prislista i innstillingane). Ein «stream» i denne appen er kvar avspeling som passerer minimumsgrensa. Verdien er altså <em>teoretisk</em> – den viser omtrent kva Spotify ville lagt i den felles poolen basert på dine lyttevanar.",
    en: 'The model uses historical average per-stream royalty rates based on industry data from sources including The Trichordist and Soundcharts. Rates differ for each time period (see the price list in settings). A "stream" in this app is any play that passes the minimum threshold. The value is therefore <em>theoretical</em> – it shows roughly what Spotify would have put into the shared pool based on your listening habits.',
  },

  disclaimerStep3Title: {
    no: "3. Abonnementskostnad",
    en: "3. Subscription cost",
  },
  disclaimerStep3: {
    no: "Modellen reknar ut historisk kostnad per månad du har hatt Spotify, basert på kjende prisaukar. Berre månader der du faktisk har lytteaktivitet i dataen vert rekna med. Spotify sin GDPR-eksport inneheld <em>ikkje</em> betalingshistorikk eller abonnementstype (<code>Payments.json</code> er tom), så modellen tek utgangspunkt i standard <b>Premium Individual-pris</b>.<br/><br/><b>Kvifor Premium?</b> Andre abonnementstypar gir mindre pålitelege data for denne analysen: <em>Gratisbrukarar</em> får reklame innimellom, noko som endrar inntektsmodellen fundamentalt og gjer at strøymeverdien ikkje kan samanliknast direkte. <em>Duo og Family</em> har lågare pris per brukar, men GDPR-eksporten seier ikkje kva plan du har hatt. <em>Student-rabatt</em> gir annan prisstruktur. Ved å bruke Premium-prising får vi det mest konservative og transparente estimatet – det representerer den fulle betalinga ein brukar gir til Spotify utan reklameavbrot.",
    en: "The model calculates historical cost per month you've had Spotify, based on known price changes. Only months where you actually have listening activity in the data are counted. Spotify's GDPR export does <em>not</em> contain payment history or subscription type (<code>Payments.json</code> is empty), so the model assumes standard <b>Premium Individual pricing</b>.<br/><br/><b>Why Premium?</b> Other subscription types produce less reliable data for this analysis: <em>Free-tier users</em> receive ads between tracks, which fundamentally changes the revenue model and makes stream value non-comparable. <em>Duo and Family plans</em> have lower per-user costs, but the GDPR export doesn't indicate which plan you had. <em>Student discounts</em> have a different price structure. By using Premium pricing, we get the most conservative and transparent estimate – it represents the full payment a user makes to Spotify without ad interruptions.",
  },

  disclaimerStep4Title: {
    no: "4. Artistaggregering",
    en: "4. Artist aggregation",
  },
  disclaimerStep4: {
    no: "For kvar artist blir total lyttetid, estimert royalty-verdi, albumfordeling og tal på streams summert. «Album-ekvivalent» viser kor mange fysiske album den estimerte strøymeverdien for ein artist tilsvarar.",
    en: 'For each artist, total listening time, estimated royalty value, album distribution, and stream count are summed up. "Album equivalent" shows how many physical albums the estimated streaming value for an artist corresponds to.',
  },

  disclaimerCaveatsTitle: { no: "Viktige atterhald", en: "Important caveats" },
  disclaimerCaveats: {
    no: [
      "Dette er ein <b>estimatmodell</b>. Spotify publiserer ikkje faktiske royalty-utbetalingar per brukar.",
      "Spotify bruker ein <b>«StreamShare»-modell</b> (pro-rata): alle abonnementsinntekter går i ein felles pott og vert fordelt etter kvar artist sin andel av <em>totale</em> streams på plattforma. Det betyr at pengane du betaler for å lytte til musikk ikkje nødvendigvis går til musikken du faktisk lyttar til.",
      "I praksis betyr det at ein stor del av abonnementspengane går til storforbruk-innhald – bakgrunnsmusikk på kjøpesenter, KI-generert musikk, og store artistar øvst i plateselskapshierarkiet – heller enn til lyttemusikk som folk aktivt vel å setje på.",
      "Satsar varierer med land, abonnementstype og samla aktivitet på plattforma. Tala gir eit <em>rimeleg gjennomsnittsbilete</em>, ikkje eksakte utbetalingar.",
      "For dei som følgjer debatten om bakgrunnsmusikk og EU sitt DSM-direktiv (t.d. i TONO), er dette ein del av ein større problematikk: Lyttemusikk taper terreng i fordeling av vederlag, medan bakgrunnsmusikk får finansiering dei kanskje ikkje fortener.",
    ],
    en: [
      "This is an <b>estimation model</b>. Spotify does not publish actual royalty payouts per user.",
      "Spotify uses a <b>\"StreamShare\" model</b> (pro-rata): all subscription revenue goes into a shared pool and is distributed based on each artist's share of <em>total</em> streams on the platform. This means the money you pay to listen to music doesn't necessarily go to the music you actually listen to.",
      "In practice, a large portion of subscription money flows toward high-volume content – background music in shopping malls, AI-generated tracks, and major artists at the top of the label hierarchy – rather than to music that people actively choose to play.",
      "Rates vary by country, subscription type, and overall platform activity. The figures provide a <em>reasonable average picture</em>, not exact payouts.",
      "For those following the debate about background music and the EU's DSM Directive (e.g. in collecting societies like TONO), this is part of a larger issue: Listening music loses ground in royalty distribution, while background music receives funding it may not deserve.",
    ],
  },

  disclaimerPurpose: {
    no: "Denne sida er lagd for å synleggjere at abonnementspengane dine i stor grad <em>ikkje</em> går til musikken du lyttar til – og at direkte støtte, som å kjøpe album, er ein langt meir effektiv måte å støtte musikken du bryr deg om på.",
    en: "This site is designed to make visible that your subscription money largely does <em>not</em> go to the music you listen to – and that direct support, like buying albums, is a far more effective way to support the music you care about.",
  },

  disclaimerSolution: {
    no: "Ei mogleg løysing er å klargjere for forbrukarane at abonnementa deira i hovudsak går til å betale for noko anna enn sjølve musikken dei lyttar til – og håpe at fleire vel meir etiske løysingar som belønner den musikken dei faktisk ønsker meir av.",
    en: "A possible solution is to make clear to consumers that their subscriptions largely pay for something other than the music they listen to – and hope that more people choose more ethical alternatives that reward the music they actually want more of.",
  },

  disclaimerPrivacy: {
    no: "All analyse skjer 100 % lokalt i nettlesaren din. Ingen data vert sendt til nokon server, lagra, eller delt med nokon. Filane dine forlet aldri maskina di.",
    en: "All analysis runs 100% locally in your browser. No data is sent to any server, stored, or shared with anyone. Your files never leave your machine.",
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
    no: "📊 Del resultata dine",
    en: "📊 Share your results",
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
    no: "Eg har sjekka kvar Spotify-pengane mine eigentleg går med Spotify Unwrapped! 🎵\n\nVisste du at abonnementspengane dine ikkje nødvendigvis går til musikken du lyttar til? Prøv sjølv – det er 100 % lokalt og trygt:\n",
    en: "I checked where my Spotify money actually goes with Spotify Unwrapped! 🎵\n\nDid you know your subscription money doesn't necessarily go to the music you listen to? Try it yourself – it's 100% local and private:\n",
  },
  shareTip: {
    no: "📱 På mobil deler du direkte med biletet. 💻 På PC vert biletet kopiert til utklippstavla — lim det rett inn i eit nytt innlegg.",
    en: "📱 On mobile, share directly with the image. 💻 On desktop, the image is copied to your clipboard — paste it right into a new post.",
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
