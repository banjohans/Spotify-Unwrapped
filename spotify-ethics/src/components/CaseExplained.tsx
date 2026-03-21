import type { Locale } from "../lib/i18n";
import { t } from "../lib/i18n";

interface Props {
  locale: Locale;
}

/* ── tiny inline SVG illustrations ─────────────────────────── */

function IconPerson({ color = "#60a5fa" }: { color?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" className="caseIcon">
      <circle cx="24" cy="14" r="8" fill={color} />
      <path d="M10 42c0-8 6-14 14-14s14 6 14 14" fill={color} opacity={0.7} />
    </svg>
  );
}

function IconDog() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" className="caseIcon">
      <ellipse cx="24" cy="28" rx="12" ry="10" fill="#a78bfa" />
      <circle cx="24" cy="16" r="8" fill="#a78bfa" />
      <ellipse cx="16" cy="10" rx="4" ry="6" fill="#c4b5fd" />
      <ellipse cx="32" cy="10" rx="4" ry="6" fill="#c4b5fd" />
      <circle cx="21" cy="15" r="1.5" fill="#1a1a2e" />
      <circle cx="27" cy="15" r="1.5" fill="#1a1a2e" />
      <ellipse cx="24" cy="19" rx="2" ry="1.2" fill="#1a1a2e" />
    </svg>
  );
}

function IconGrill() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" className="caseIcon">
      <rect x="12" y="22" width="24" height="4" rx="2" fill="#f97316" />
      <rect x="14" y="10" width="2" height="14" fill="#ef4444" opacity={0.6} />
      <rect x="20" y="8" width="2" height="16" fill="#ef4444" opacity={0.5} />
      <rect x="26" y="10" width="2" height="14" fill="#ef4444" opacity={0.6} />
      <rect x="32" y="12" width="2" height="12" fill="#ef4444" opacity={0.4} />
      <line x1="16" y1="26" x2="14" y2="42" stroke="#888" strokeWidth="2" />
      <line x1="32" y1="26" x2="34" y2="42" stroke="#888" strokeWidth="2" />
      <line x1="24" y1="26" x2="24" y2="44" stroke="#888" strokeWidth="2" />
    </svg>
  );
}

function IconHeadphones({ color = "#60a5fa" }: { color?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" className="caseIcon">
      <path
        d="M8 28v-4a16 16 0 0 1 32 0v4"
        fill="none"
        stroke={color}
        strokeWidth="3"
      />
      <rect x="6" y="26" width="6" height="12" rx="3" fill={color} />
      <rect x="36" y="26" width="6" height="12" rx="3" fill={color} />
    </svg>
  );
}

function IconMusic() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" className="caseIcon">
      <path
        d="M18 38V14l20-6v24"
        fill="none"
        stroke="#1DB954"
        strokeWidth="2.5"
      />
      <circle cx="14" cy="38" r="5" fill="#1DB954" />
      <circle cx="34" cy="32" r="5" fill="#1DB954" />
    </svg>
  );
}

function IconSpeaker() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" className="caseIcon">
      <rect x="14" y="8" width="20" height="32" rx="4" fill="#374151" />
      <circle cx="24" cy="28" r="8" fill="#555" stroke="#666" strokeWidth="1" />
      <circle cx="24" cy="28" r="3" fill="#333" />
      <circle cx="24" cy="14" r="3" fill="#555" stroke="#666" strokeWidth="1" />
    </svg>
  );
}

function IconQuestion() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" className="caseIcon">
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="2.5"
      />
      <text
        x="24"
        y="32"
        textAnchor="middle"
        fontSize="24"
        fontWeight="bold"
        fill="#f59e0b"
      >
        ?
      </text>
    </svg>
  );
}

/* ── pie chart for the share breakdown ─────────────────────── */

function SharePie({
  data,
}: {
  data: Array<{ label: string; pct: number; color: string }>;
}) {
  const total = data.reduce((s, d) => s + d.pct, 0);
  let cumAngle = -90;
  const arcs = data.map((d) => {
    const angle = (d.pct / total) * 360;
    const start = cumAngle;
    cumAngle += angle;
    return { ...d, start, angle };
  });

  function arcPath(
    cx: number,
    cy: number,
    r: number,
    startDeg: number,
    angleDeg: number,
  ) {
    const rad = (d: number) => (d * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(startDeg));
    const y1 = cy + r * Math.sin(rad(startDeg));
    const x2 = cx + r * Math.cos(rad(startDeg + angleDeg));
    const y2 = cy + r * Math.sin(rad(startDeg + angleDeg));
    const large = angleDeg > 180 ? 1 : 0;
    return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
  }

  return (
    <div className="casePieWrap">
      <svg viewBox="0 0 200 200" width="200" height="200">
        {arcs.map((a, i) => (
          <path
            key={i}
            d={arcPath(100, 100, 90, a.start, a.angle)}
            fill={a.color}
            stroke="#1a1a2e"
            strokeWidth="1"
          />
        ))}
      </svg>
      <div className="casePieLegend">
        {data.map((d, i) => (
          <div key={i} className="casePieLegendItem">
            <span className="casePieDot" style={{ background: d.color }} />
            <span className="casePieLabel">{d.label}</span>
            <span className="casePiePct">{d.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── horizontal bar chart for minutes ─────────────────────── */

function MinutesBars({
  data,
  locale,
}: {
  data: Array<{ label: string; minutes: number; color: string }>;
  locale: Locale;
}) {
  const max = Math.max(...data.map((d) => d.minutes));
  return (
    <div className="caseBarsWrap">
      {data.map((d, i) => (
        <div key={i} className="caseBarRow">
          <span className="caseBarLabel">{d.label}</span>
          <div className="caseBarTrack">
            <div
              className="caseBarFill"
              style={{
                width: `${(d.minutes / max) * 100}%`,
                background: d.color,
              }}
            />
          </div>
          <span className="caseBarValue">
            {d.minutes} {locale === "no" ? "min" : "min"}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── main component ────────────────────────────────────────── */

const T = {
  caseTitle: {
    no: "Familien som betaler for musikken – men kan ikkje styre pengane dit det betyr noko",
    en: "The Family That Pays for Music – but can't direct their money to where it matters",
  },
  caseIntro: {
    no: "Ein heilt vanleg familie har eit familieabonnement hos Spotify. Dei tenker eigentleg ikkje så mykje over korleis pengane dei betaler kvar månad blir fordelte. Dei bruker berre tenesta slik det passar dei.",
    en: "An ordinary family has a Spotify family plan. They don't really think about how the money they pay each month gets distributed. They just use the service the way it suits them.",
  },
  caseButDifferent: {
    no: "Men lyttemønsteret deira er ganske ulikt.",
    en: "But their listening patterns are quite different.",
  },

  // Nicolai
  nicolaiName: { no: "Nicolai", en: "Nicolai" },
  nicolaiDesc: {
    no: "Nicolai er far i huset. Han har ein travel kvardag, og det er sjeldan han set av tid til å lytte til musikk.\n\nMen når han først gjer det, lyttar han konsentrert. Han set gjerne på ein artist han har høyrt på i mange år — til dømes Robert Wyatt.\n\nDet blir kanskje 12–20 minutt musikk om dagen. Nokre få spor medan han lagar middag eller rydder kjøkkenet etterpå. Av og til noko anna smalt han kjem over, men ofte Wyatt.\n\nFor Nicolai er dette eigentleg det Spotify er til for: å finne fram til musikk han bryr seg om, og høyre ordentleg etter.",
    en: "Nicolai is the father of the house. He has a busy life, and rarely makes time to listen to music.\n\nBut when he does, he listens intently. He often puts on an artist he's followed for years — for example Robert Wyatt.\n\nIt's maybe 12–20 minutes of music a day. A few tracks while cooking dinner or tidying the kitchen. Sometimes something else he stumbles upon, but often Wyatt.\n\nFor Nicolai, this is really what Spotify is for: finding music he cares about, and listening properly.",
  },

  // Grillemusakk
  grillName: { no: "Grillemusakk", en: "BBQ Playlist" },
  grillDesc: {
    no: 'Om sommaren skjer det noko anna.\n\nKvar laurdag, når Nicolai fyrer opp grillen og inviterer vener, set han på ei generativ "mood"-speleliste.\n\nMusikken berre går. Time etter time.\n\nSeks timar med jamn, behageleg, algoritmisk bakgrunnsmusikk som skal skape stemning, utan å krevje merksemd.\n\nIngen veit heilt kven som har laga musikken. Ingen lyttar eigentleg aktivt. Men den er der — heile kvelden.',
    en: 'In summer, something else happens.\n\nEvery Saturday, when Nicolai fires up the grill and invites friends over, he puts on a generative "mood" playlist.\n\nThe music just plays. Hour after hour.\n\nSix hours of steady, pleasant, algorithmic background music meant to set the mood, without demanding attention.\n\nNobody really knows who made the music. Nobody is actively listening. But it\'s there — all evening.',
  },

  // Mette
  metteName: { no: "Mette", en: "Mette" },
  metteDesc: {
    no: "Mette har heller ikkje mykje tid til musikk i kvardagen.\n\nMen ho har to situasjonar der musikken er viktig.\n\nDen eine er kammerkoret ho syng i. Ho øver på stemma si, repeterer verk dei jobbar med, og høyrer gjennom korinnspelingar for å lære strukturen.\n\nDen andre er på treningsstudioet. Der spelar anlegget så dårleg musikk at ho ofte set på eigne spelelister i øyreproppane — energisk musikk som hjelper henne gjennom økta.\n\nTil saman blir det kanskje 15–25 minutt om dagen.",
    en: "Mette doesn't have much time for music in everyday life either.\n\nBut she has two situations where music matters.\n\nOne is the chamber choir she sings in. She practices her part, rehearses works they're preparing, and listens to choral recordings to learn the structure.\n\nThe other is at the gym. The gym's sound system plays such bad music that she often puts on her own playlists through earbuds — energetic music that helps her through the session.\n\nAll together, maybe 15–25 minutes a day.",
  },

  // Veslemøy
  veslemoyName: { no: "Veslemøy", en: "Veslemøy" },
  veslemoyDesc: {
    no: "Dottera Veslemøy er den som faktisk brukar Spotify mest aktivt.\n\nHo pendlar til skulen: 45 minutt kvar veg. Då går øyreproppane på, og det strøymer pop, hiphop og alt det vennene hennar høyrer på.\n\nNår ho kjem heim, sit ho ofte med leksene. Då taklar ho ikkje musikk med mykje tekst, så ho set på elektronika eller instrumentale spelelister.\n\nTil saman blir det fort rundt 2,5 timar lytting kvar dag.",
    en: "Their daughter Veslemøy is the one who actually uses Spotify the most.\n\nShe commutes to school: 45 minutes each way. The earbuds go in, and it's pop, hip-hop, and whatever her friends are listening to.\n\nWhen she gets home, she often does homework. She can't handle music with lyrics then, so she puts on electronica or instrumental playlists.\n\nAll in all, it easily adds up to around 2.5 hours of listening every day.",
  },

  // Sprint
  sprintName: { no: "Sprint", en: "Sprint" },
  sprintDesc: {
    no: "Så er det hunden.\n\nSprint er ein snill, men litt engsteleg hund. Når Nicolai og Mette er på jobb, kan han vere åleine i fleire timar.\n\nEin dag oppdaga familien at Sprint vart mykje rolegare dersom det stod på svak bakgrunnsmusikk i huset.\n\nSå dei laga eit lite avslappingshjørne til han. Der står ein høgtalar og spelar roleg musikk — gjerne ambient, pianomusikk eller naturlydar.\n\nMusikken går 6 til 8 timar om dagen.\n\nSprint bryr seg eigentleg ikkje så mykje om kva som spelar. Han ligg ofte i ein annan del av huset. Men musikken står der likevel, som eit tilbod.",
    en: "And then there's the dog.\n\nSprint is a sweet but slightly anxious dog. When Nicolai and Mette are at work, he can be alone for hours.\n\nOne day the family discovered that Sprint became much calmer when soft background music was playing in the house.\n\nSo they made a little relaxation corner for him. There's a speaker playing calm music — often ambient, piano music, or nature sounds.\n\nThe music plays 6 to 8 hours a day.\n\nSprint doesn't really care much about what's playing. He often lies in another part of the house. But the music is there anyway, as an offer.",
  },

  // How Spotify sees them
  systemTitle: {
    no: "Korleis Spotify ser familien",
    en: "How Spotify Sees the Family",
  },
  systemDesc: {
    no: "I familien sitt hovud betaler dei for eitt abonnement og bruker det kvar på sin måte.\n\nMen i pro rata-systemet til Spotify blir ikkje pengane fordelte etter kva kvar brukar høyrer på.\n\nDei blir fordelte etter andel av alle streams.\n\nDet betyr at den som spelar mest musikk, får mest påverknad på kvar pengane går.",
    en: "In the family's mind, they pay for one subscription and each use it their own way.\n\nBut in Spotify's pro-rata system, the money isn't distributed according to what each user listens to.\n\nIt's distributed by share of all streams.\n\nThat means whoever plays the most music has the most influence over where the money goes.",
  },

  // Rekneskapen
  mathTitle: {
    no: "Rekneskapen",
    en: "The Math",
  },
  mathDesc: {
    no: "La oss rekne grovt på familien sitt daglege lyttemønster, inkludert grillemusakken fordelt som snitt per dag.",
    en: "Let's roughly calculate the family's daily listening pattern, including the BBQ music spread as a daily average.",
  },
  mathGrillNote: {
    no: "Grillemusakk er basert på 6 timar kvar laurdag, som tilsvarar om lag 50 minutt per dag i snitt.",
    en: "BBQ music is based on 6 hours every Saturday, which averages about 50 minutes per day.",
  },
  mathTotal: {
    no: "Totalt i familien: 655 minutt musikk per dag",
    en: "Family total: 655 minutes of music per day",
  },

  // Consequence
  consequenceTitle: {
    no: "Konsekvensen",
    en: "The Consequence",
  },
  consequenceDesc: {
    no: "I praksis betyr dette at:",
    en: "In practice, this means:",
  },
  consequence1: {
    no: "Over 70 % av familien sine Spotify-pengar blir styrt av bakgrunnsmusikk",
    en: "Over 70% of the family's Spotify money is driven by background music",
  },
  consequence2: {
    no: "Mindre enn 3 % går til musikken Nicolai faktisk set seg ned og høyrer på",
    en: "Less than 3% goes to the music Nicolai actually sits down and listens to",
  },
  consequence3: {
    no: "Ein aukande del går til generativ stemningsmusikk som ingen eigentleg følgjer med på",
    en: "An increasing share goes to generative mood music that nobody is really paying attention to",
  },
  consequenceConclusion: {
    no: "Så sjølv om Nicolai trur abonnementet hans i nokon grad støttar artistar som Robert Wyatt, er realiteten ein annan.\n\nPengane blir i staden styrt av timar med bakgrunnslytting som ingen eigentleg følgjer med på.",
    en: "So even though Nicolai believes his subscription somehow supports artists like Robert Wyatt, the reality is different.\n\nThe money is instead driven by hours of background listening that nobody is really paying attention to.",
  },

  // Bigger picture
  biggerTitle: {
    no: "Eit større bilete",
    en: "The Bigger Picture",
  },
  biggerDesc: {
    no: "Dette høyrest kanskje ut som ein vits.\n\nMen dette er realiteten av korleis Spotify belønner bruk på plattforma si.\n\nSå kan du tenke deg at Sprint ikkje berre er ein hund.\nMen ein butikk.\nEit hotell.\nEit treningssenter.\n\nStader der musikken står på heile dagen for å skape stemning.\n\nOg musikken er ikkje nødvendigvis laga av menneske.\nDet kan vere KI-generert musikk.\nEller spor Spotify sjølv har plassert i eigne spelelister.\n\nOg det stoppar ikkje der.\n\nTenk deg også at inntektene frå denne typen bakgrunnsmusikk blir brukt til å utvikle ny teknologi — langt unna det vi vanlegvis forbinder med musikk.\n\nDå byrjar konturane av eit system å tre fram.\n\nDet finst mange rapportar om stemningsmusikk som Spotify sjølve har lagt til i spelelister dei kuraterer — og plassert desse artistane blant ekte artistar.\n\nDet har også vore ein auke i rapportar om at ekte artistar opplever klona KI-musikk som blir gitt ut og knytt til artistkontoane deira.\n\nMed Spotify sine 12 millionar artistar verkar problema dei sjølve har bidrege til å skape heilt ute av kontroll.",
    en: "This might sound like a joke.\n\nBut this is the reality of how Spotify rewards usage on its platform.\n\nNow imagine Sprint isn't just a dog.\nBut a shop.\nA hotel.\nA gym.\n\nPlaces where music plays all day to set the mood.\n\nAnd the music isn't necessarily made by humans.\nIt could be AI-generated music.\nOr tracks Spotify itself has placed in its own playlists.\n\nAnd it doesn't stop there.\n\nImagine the revenue from this kind of background music being used to develop new technology — far removed from what we usually associate with music.\n\nThen the outlines of a system begin to emerge.\n\nThere are numerous reports about mood music being added by Spotify themselves to playlists they curate — placing these artists among other real artists.\n\nThere has also been an increase in reports that actual artists are experiencing cloned AI music released and connected to their artist accounts.\n\nWith Spotify's 12 million artists, the problems they have helped create seem unhinged.",
  },

  // Conclusion
  conclusionTitle: {
    no: "Konklusjon",
    en: "Conclusion",
  },
  conclusionDesc: {
    no: "Familien trur dei betaler for den musikken dei sjølve høyrer.\n\nMen i praksis ender dei opp med å subsidiere:\nbakgrunnsmusikk\nfunksjonell lyd\nog system som ikkje nødvendigvis har noko med kunstnarleg verdi å gjere",
    en: "The family thinks they pay for the music they actually listen to.\n\nBut in practice they end up subsidizing:\nbackground music\nfunctional sound\nand systems that don't necessarily have anything to do with artistic value",
  },
  conclusionEpilogue: {
    no: "Dette er musikkøkonomien i 2026.",
    en: "This is the music economy of 2026.",
  },
  conclusionQuestion: {
    no: "Kven er det eigentleg du betaler?",
    en: "Who are you really paying?",
  },
};

const MEMBERS = [
  { key: "nicolai", minutes: 15, color: "#60a5fa" },
  { key: "mette", minutes: 20, color: "#f472b6" },
  { key: "veslemoy", minutes: 150, color: "#a78bfa" },
  { key: "sprint", minutes: 420, color: "#c4b5fd" },
  { key: "grill", minutes: 50, color: "#f97316" },
] as const;

const TOTAL_MIN = MEMBERS.reduce((s, m) => s + m.minutes, 0);

export default function CaseExplained({ locale }: Props) {
  const tx = (key: keyof typeof T) => T[key][locale];

  const pieData = MEMBERS.map((m) => ({
    label:
      m.key === "nicolai"
        ? tx("nicolaiName")
        : m.key === "mette"
          ? tx("metteName")
          : m.key === "veslemoy"
            ? tx("veslemoyName")
            : m.key === "sprint"
              ? tx("sprintName")
              : tx("grillName"),
    pct: (m.minutes / TOTAL_MIN) * 100,
    color: m.color,
  }));

  const barData = pieData.map((d, i) => ({
    label: d.label,
    minutes: MEMBERS[i].minutes,
    color: d.color,
  }));

  return (
    <section className="card caseCard">
      <h2 className="caseTitle">{tx("caseTitle")}</h2>

      <p className="caseIntro">{tx("caseIntro")}</p>
      <p className="caseDifferent">{tx("caseButDifferent")}</p>

      {/* ── Nicolai ── */}
      <div className="casePerson">
        <div className="casePersonHeader">
          <IconPerson color="#60a5fa" />
          <IconHeadphones color="#60a5fa" />
          <h3>{tx("nicolaiName")}</h3>
        </div>
        <p className="casePersonDesc">{tx("nicolaiDesc")}</p>
      </div>

      {/* ── Grillemusakk ── */}
      <div className="casePerson casePersonAlt">
        <div className="casePersonHeader">
          <IconGrill />
          <IconMusic />
          <h3>{tx("grillName")}</h3>
        </div>
        <p className="casePersonDesc">{tx("grillDesc")}</p>
      </div>

      {/* ── Mette ── */}
      <div className="casePerson">
        <div className="casePersonHeader">
          <IconPerson color="#f472b6" />
          <IconHeadphones color="#f472b6" />
          <h3>{tx("metteName")}</h3>
        </div>
        <p className="casePersonDesc">{tx("metteDesc")}</p>
      </div>

      {/* ── Veslemøy ── */}
      <div className="casePerson casePersonAlt">
        <div className="casePersonHeader">
          <IconPerson color="#a78bfa" />
          <IconHeadphones color="#a78bfa" />
          <h3>{tx("veslemoyName")}</h3>
        </div>
        <p className="casePersonDesc">{tx("veslemoyDesc")}</p>
      </div>

      {/* ── Sprint ── */}
      <div className="casePerson">
        <div className="casePersonHeader">
          <IconDog />
          <IconSpeaker />
          <h3>{tx("sprintName")}</h3>
        </div>
        <p className="casePersonDesc">{tx("sprintDesc")}</p>
      </div>

      {/* ── System explanation ── */}
      <div className="caseSystemBlock">
        <h3>{tx("systemTitle")}</h3>
        <p>{tx("systemDesc")}</p>
      </div>

      {/* ── The math ── */}
      <div className="caseMathBlock">
        <h3>{tx("mathTitle")}</h3>
        <p>{tx("mathDesc")}</p>

        <MinutesBars data={barData} locale={locale} />

        <p className="caseMathNote">{tx("mathGrillNote")}</p>
        <p className="caseMathTotal">{tx("mathTotal")}</p>

        <SharePie data={pieData} />
      </div>

      {/* ── Consequence ── */}
      <div className="caseConsequenceBlock">
        <h3>{tx("consequenceTitle")}</h3>
        <p>{tx("consequenceDesc")}</p>
        <ul className="caseConsequenceList">
          <li>{tx("consequence1")}</li>
          <li>{tx("consequence2")}</li>
          <li>{tx("consequence3")}</li>
        </ul>
        <p className="caseConsequenceConclusion">
          {tx("consequenceConclusion")}
        </p>
      </div>

      {/* ── Bigger picture ── */}
      <div className="caseBiggerBlock">
        <div className="caseBiggerIcon">
          <IconQuestion />
        </div>
        <h3>{tx("biggerTitle")}</h3>
        <p>{tx("biggerDesc")}</p>
      </div>

      {/* ── Conclusion ── */}
      <div className="caseConclusionBlock">
        <h3>{tx("conclusionTitle")}</h3>
        <p>{tx("conclusionDesc")}</p>
        <p className="caseEpilogue">{tx("conclusionEpilogue")}</p>
        <p className="caseFinalQuestion">{tx("conclusionQuestion")}</p>
      </div>
    </section>
  );
}
