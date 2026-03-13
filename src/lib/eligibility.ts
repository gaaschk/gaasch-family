// Eligibility engine — checks EU citizenship-by-descent rules against ancestor data

export type EligibilityStatus = 'likely' | 'possible' | 'insufficient';

export interface AncestorInfo {
  id: string;
  name: string;
  sex: string | null;
  birthPlace: string | null;
  birthDate: string | null;
  deathDate: string | null;
  generation: number; // 0 = self, 1 = parent, 2 = grandparent, 3 = great-grandparent, etc.
}

export interface CountryResult {
  country: string;
  flag: string;
  status: EligibilityStatus;
  matchedAncestors: AncestorInfo[];
  matchedRule: string;
  notes: string;
}

// ── Place-name → country mapping ────────────────────────────────────────────

type CountryCode =
  | 'austria' | 'bulgaria' | 'croatia' | 'cyprus' | 'czechia'
  | 'france' | 'germany' | 'greece' | 'hungary' | 'ireland'
  | 'italy' | 'latvia' | 'lithuania' | 'luxembourg' | 'malta'
  | 'poland' | 'portugal' | 'romania' | 'slovakia' | 'slovenia'
  | 'spain' | 'finland';

const PLACE_KEYWORDS: Record<CountryCode, string[]> = {
  austria:     ['austria', 'österreich', 'oesterreich', 'wien', 'vienna', 'salzburg', 'graz', 'innsbruck', 'linz', 'austro-hungarian', 'austria-hungary'],
  bulgaria:    ['bulgaria', 'българия', 'sofia', 'plovdiv', 'varna'],
  croatia:     ['croatia', 'hrvatska', 'zagreb', 'split', 'dubrovnik', 'rijeka', 'yugoslavia'],
  cyprus:      ['cyprus', 'κύπρος', 'nicosia', 'limassol', 'larnaca', 'paphos'],
  czechia:     ['czechia', 'czech republic', 'czech', 'czechoslovakia', 'böhmen', 'bohemia', 'moravia', 'mähren', 'prague', 'praha', 'brno', 'ostrava'],
  france:      ['france', 'français', 'paris', 'lyon', 'marseille', 'toulouse', 'bordeaux', 'alsace', 'lorraine'],
  germany:     ['germany', 'deutschland', 'german', 'prussia', 'preussen', 'preußen', 'bavaria', 'bayern', 'saxony', 'sachsen', 'berlin', 'hamburg', 'münchen', 'munich', 'cologne', 'köln', 'frankfurt', 'württemberg', 'baden', 'hessen', 'westphalia', 'rhineland', 'rheinland', 'hanover', 'hannover', 'mecklenburg', 'pomerania', 'pommern', 'silesia', 'schlesien', 'brandenburg'],
  greece:      ['greece', 'ελλάδα', 'hellas', 'athens', 'thessaloniki', 'crete', 'rhodes'],
  hungary:     ['hungary', 'magyarország', 'budapest', 'debrecen', 'szeged', 'pécs', 'miskolc'],
  ireland:     ['ireland', 'éire', 'dublin', 'cork', 'galway', 'limerick', 'waterford', 'belfast'],
  italy:       ['italy', 'italia', 'rome', 'roma', 'milan', 'milano', 'naples', 'napoli', 'turin', 'torino', 'florence', 'firenze', 'sicily', 'sicilia', 'sardinia', 'sardegna', 'venice', 'venezia', 'genoa', 'genova', 'bologna', 'palermo', 'calabria', 'campania', 'puglia', 'abruzzo'],
  latvia:      ['latvia', 'latvija', 'riga', 'liepaja', 'daugavpils', 'courland', 'livonia'],
  lithuania:   ['lithuania', 'lietuva', 'vilnius', 'kaunas', 'klaipeda'],
  luxembourg:  ['luxembourg', 'luxemburg', 'lëtzebuerg', 'esch-sur-alzette', 'dudelange', 'differdange', 'rumelange', 'ettelbruck'],
  malta:       ['malta', 'valletta', 'gozo'],
  poland:      ['poland', 'polska', 'warsaw', 'warszawa', 'krakow', 'kraków', 'gdansk', 'gdańsk', 'wroclaw', 'wrocław', 'poznań', 'poznan', 'łódź', 'lodz', 'galicia', 'galizien', 'congress poland', 'russian empire'],
  portugal:    ['portugal', 'lisbon', 'lisboa', 'porto', 'oporto', 'faro', 'algarve', 'azores', 'madeira', 'coimbra', 'braga'],
  romania:     ['romania', 'românia', 'bucharest', 'bucurești', 'cluj', 'timișoara', 'timisoara', 'iași', 'iasi', 'transylvania', 'wallachia', 'moldavia'],
  slovakia:    ['slovakia', 'slovensko', 'bratislava', 'košice', 'kosice', 'upper hungary', 'czechoslovakia'],
  slovenia:    ['slovenia', 'slovenija', 'ljubljana', 'maribor', 'yugoslavia'],
  spain:       ['spain', 'españa', 'espana', 'madrid', 'barcelona', 'seville', 'sevilla', 'valencia', 'bilbao', 'málaga', 'malaga', 'castile', 'catalonia', 'andalusia'],
  finland:     ['finland', 'suomi', 'helsinki', 'tampere', 'turku', 'oulu', 'espoo'],
};

// Historical regions that map to multiple modern countries
const MULTI_COUNTRY_HISTORICAL: Record<string, CountryCode[]> = {
  'austro-hungarian':  ['austria', 'hungary', 'czechia', 'slovakia', 'croatia', 'slovenia', 'romania', 'poland'],
  'austria-hungary':   ['austria', 'hungary', 'czechia', 'slovakia', 'croatia', 'slovenia', 'romania', 'poland'],
  'habsburg':          ['austria', 'hungary', 'czechia', 'slovakia', 'croatia', 'slovenia'],
  'yugoslavia':        ['croatia', 'slovenia'],
  'czechoslovakia':    ['czechia', 'slovakia'],
  'russian empire':    ['latvia', 'lithuania', 'poland', 'finland'],
  'prussia':           ['germany', 'poland'],
  'galicia':           ['poland', 'austria'],
  'galizien':          ['poland', 'austria'],
  'silesia':           ['germany', 'poland', 'czechia'],
  'schlesien':         ['germany', 'poland', 'czechia'],
  'bohemia':           ['czechia'],
  'moravia':           ['czechia'],
  'transylvania':      ['romania', 'hungary'],
  'livonia':           ['latvia', 'lithuania'],
  'courland':          ['latvia'],
};

function detectCountries(birthPlace: string | null): Set<CountryCode> {
  if (!birthPlace) return new Set();
  const lower = birthPlace.toLowerCase();
  const matches = new Set<CountryCode>();

  // Check multi-country historical regions first
  for (const [keyword, countries] of Object.entries(MULTI_COUNTRY_HISTORICAL)) {
    if (lower.includes(keyword)) {
      for (const c of countries) matches.add(c);
    }
  }

  // Check direct country keywords
  for (const [country, keywords] of Object.entries(PLACE_KEYWORDS) as [CountryCode, string[]][]) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        matches.add(country);
        break;
      }
    }
  }

  return matches;
}

// ── Country rule definitions ────────────────────────────────────────────────

interface CountryRule {
  country: string;
  flag: string;
  code: CountryCode;
  mode: 'any' | 'all'; // 'any' = ONE OF, 'all' = ALL OF
  maxGeneration: number; // highest generation that qualifies as 'likely'
  possibleGeneration: number; // one more → 'possible'
  maleLineOnly?: boolean;
  requirements: string[];
  checkSpecial?: (ancestors: AncestorInfo[]) => { met: boolean; note: string } | null;
}

const COUNTRY_RULES: CountryRule[] = [
  {
    country: 'Austria', flag: '\u{1F1E6}\u{1F1F9}', code: 'austria', mode: 'all',
    maxGeneration: 3, possibleGeneration: 4,
    requirements: [
      'Grandparent or great-grandparent was Austrian citizen',
      'Left Austria before May 15, 1955',
      'Left due to Nazi persecution',
    ],
  },
  {
    country: 'Bulgaria', flag: '\u{1F1E7}\u{1F1EC}', code: 'bulgaria', mode: 'any',
    maxGeneration: 3, possibleGeneration: 4,
    requirements: [
      'Parent/grandparent/great-grandparent was Bulgarian',
      'Ancestor part of ethnic Bulgarian/Turkish communities that left',
      'Recognized as Bulgarian origin',
    ],
  },
  {
    country: 'Croatia', flag: '\u{1F1ED}\u{1F1F7}', code: 'croatia', mode: 'any',
    maxGeneration: 3, possibleGeneration: 5,
    requirements: [
      'Ancestor left Croatia before Oct 8, 1991',
      'Can prove descent from Croatian ancestor',
      'Identifies as Croatian',
    ],
  },
  {
    country: 'Cyprus', flag: '\u{1F1E8}\u{1F1FE}', code: 'cyprus', mode: 'any',
    maxGeneration: 3, possibleGeneration: 4,
    requirements: [
      'Parent was Cypriot citizen at birth',
      'Grandparent/great-grandparent born in Cyprus before 1960',
      'Ancestor became British subject under British rule',
    ],
  },
  {
    country: 'Czechia', flag: '\u{1F1E8}\u{1F1FF}', code: 'czechia', mode: 'any',
    maxGeneration: 3, possibleGeneration: 5,
    requirements: [
      'Parent/grandparent was Czech/Czechoslovak citizen before 2014',
      'Ancestor was citizen of CSFR or earlier Czechoslovakia',
    ],
  },
  {
    country: 'Finland', flag: '\u{1F1EB}\u{1F1EE}', code: 'finland', mode: 'any',
    maxGeneration: 2, possibleGeneration: 3,
    requirements: [
      'Parent/grandparent was Finnish citizen before leaving',
      'Lost Finnish citizenship upon emigrating due to war/economic/historical circumstances',
    ],
  },
  {
    country: 'France', flag: '\u{1F1EB}\u{1F1F7}', code: 'france', mode: 'all',
    maxGeneration: 2, possibleGeneration: 3,
    requirements: [
      'Parent/grandparent held French citizenship at birth and never renounced',
      'Speaks French at B2 level',
    ],
  },
  {
    country: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', code: 'germany', mode: 'any',
    maxGeneration: 2, possibleGeneration: 4,
    requirements: [
      'Parent was German citizen',
      'Parent/grandparent lost German citizenship due to persecution or post-war political policies',
    ],
  },
  {
    country: 'Greece', flag: '\u{1F1EC}\u{1F1F7}', code: 'greece', mode: 'any',
    maxGeneration: 2, possibleGeneration: 3,
    requirements: [
      'Parent was Greek citizen',
      'Grandparent born in Greece',
    ],
  },
  {
    country: 'Hungary', flag: '\u{1F1ED}\u{1F1FA}', code: 'hungary', mode: 'all',
    maxGeneration: 3, possibleGeneration: 4,
    requirements: [
      'Parent/grandparent/great-grandparent born in Hungary and held Hungarian citizenship',
      'Speaks basic Hungarian',
    ],
  },
  {
    country: 'Ireland', flag: '\u{1F1EE}\u{1F1EA}', code: 'ireland', mode: 'any',
    maxGeneration: 2, possibleGeneration: 3,
    requirements: [
      'Parent/grandparent born in Ireland',
      'Parent was Irish citizen at birth',
      'Great-grandparent born in Ireland and parent registered foreign birth',
    ],
  },
  {
    country: 'Italy', flag: '\u{1F1EE}\u{1F1F9}', code: 'italy', mode: 'any',
    maxGeneration: 2, possibleGeneration: 5,
    requirements: [
      'Parent/grandparent was Italian citizen',
      'Previously held Italian citizenship and lost it before 1992',
    ],
  },
  {
    country: 'Latvia', flag: '\u{1F1F1}\u{1F1FB}', code: 'latvia', mode: 'any',
    maxGeneration: 3, possibleGeneration: 5,
    requirements: [
      'Direct ancestor left Latvia between 1940\u20131990',
      'Ancestor lived in Latvia 1881\u20131940 and can prove Latvian ethnicity',
    ],
  },
  {
    country: 'Lithuania', flag: '\u{1F1F1}\u{1F1F9}', code: 'lithuania', mode: 'any',
    maxGeneration: 3, possibleGeneration: 5,
    requirements: [
      'Ancestor deported from Lithuania before March 11, 1990',
      'Voluntarily left occupied Lithuania before March 11, 1990',
    ],
  },
  {
    country: 'Luxembourg', flag: '\u{1F1F1}\u{1F1FA}', code: 'luxembourg', mode: 'any',
    maxGeneration: 3, possibleGeneration: 6,
    maleLineOnly: true,
    requirements: [
      'Male ancestor (father/grandfather/great-grandfather) born in Luxembourg',
      'Parent/adoptive parent is Luxembourg citizen',
      'Pre-qualified and began application before Dec 31, 2018',
    ],
  },
  {
    country: 'Malta', flag: '\u{1F1F2}\u{1F1F9}', code: 'malta', mode: 'any',
    maxGeneration: 3, possibleGeneration: 4,
    requirements: [
      'Parent was Maltese citizen at birth',
      'Grandparent/great-grandparent was Maltese citizen',
    ],
  },
  {
    country: 'Poland', flag: '\u{1F1F5}\u{1F1F1}', code: 'poland', mode: 'any',
    maxGeneration: 3, possibleGeneration: 5,
    requirements: [
      'Parent/grandparent was Polish citizen',
      'Two great-grandparents were Polish citizens',
      'Ancestor\u2019s Polish citizenship lost due to war/forced migration/political pressures',
    ],
  },
  {
    country: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}', code: 'portugal', mode: 'any',
    maxGeneration: 1, possibleGeneration: 3,
    requirements: [
      'Parent was Portuguese citizen at birth',
      'Born in former Portuguese territory',
      'Ancestry links to Sephardic Jews of Portuguese origin',
      'Previously held Portuguese citizenship',
    ],
  },
  {
    country: 'Romania', flag: '\u{1F1F7}\u{1F1F4}', code: 'romania', mode: 'any',
    maxGeneration: 3, possibleGeneration: 4,
    requirements: [
      'Parent/grandparent/great-grandparent was Romanian citizen',
      'Citizenship taken away by government',
    ],
  },
  {
    country: 'Slovakia', flag: '\u{1F1F8}\u{1F1F0}', code: 'slovakia', mode: 'any',
    maxGeneration: 3, possibleGeneration: 4,
    requirements: [
      'Parent/grandparent/great-grandparent born in what is now Slovakia before 1993',
    ],
  },
  {
    country: 'Slovenia', flag: '\u{1F1F8}\u{1F1EE}', code: 'slovenia', mode: 'all',
    maxGeneration: 2, possibleGeneration: 3,
    requirements: [
      'Parent/grandparent held Slovenian citizenship at birth and never renounced',
    ],
  },
  {
    country: 'Spain', flag: '\u{1F1EA}\u{1F1F8}', code: 'spain', mode: 'any',
    maxGeneration: 2, possibleGeneration: 3,
    requirements: [
      'Parent/grandparent was Spanish citizen before leaving',
      'Ancestor lost Spanish citizenship due to war/dictatorship/exile',
    ],
  },
];

// ── Generation label helper ─────────────────────────────────────────────────

export function generationLabel(gen: number): string {
  switch (gen) {
    case 0: return 'You';
    case 1: return 'Parent';
    case 2: return 'Grandparent';
    case 3: return 'Great-grandparent';
    case 4: return 'Great-great-grandparent';
    case 5: return 'Great-great-great-grandparent';
    default:
      if (gen >= 6) return `${'Great-'.repeat(gen - 2)}grandparent`;
      return 'Unknown generation';
  }
}

// ── Main eligibility check ──────────────────────────────────────────────────

export function checkEligibility(ancestors: AncestorInfo[]): CountryResult[] {
  const results: CountryResult[] = [];

  for (const rule of COUNTRY_RULES) {
    // Find ancestors whose birthPlace matches this country
    const matching: AncestorInfo[] = [];

    for (const anc of ancestors) {
      if (anc.generation === 0) continue; // skip self
      const countries = detectCountries(anc.birthPlace);
      if (countries.has(rule.code)) {
        matching.push(anc);
      }
    }

    if (matching.length === 0) {
      results.push({
        country: rule.country,
        flag: rule.flag,
        status: 'insufficient',
        matchedAncestors: [],
        matchedRule: rule.requirements[0],
        notes: 'No ancestors found with connections to ' + rule.country,
      });
      continue;
    }

    // Find the closest-generation match
    const sorted = [...matching].sort((a, b) => a.generation - b.generation);
    const closest = sorted[0];

    // For Luxembourg male-line rule, prefer male ancestors
    let bestMatch = closest;
    if (rule.maleLineOnly) {
      const maleMatches = sorted.filter(a => a.sex === 'M');
      if (maleMatches.length > 0) {
        bestMatch = maleMatches[0];
      }
    }

    // Determine status based on generation
    let status: EligibilityStatus;
    if (bestMatch.generation <= rule.maxGeneration) {
      status = 'likely';
    } else if (bestMatch.generation <= rule.possibleGeneration) {
      status = 'possible';
    } else {
      status = 'possible'; // still flag it — err on the side of showing possibilities
    }

    // If ALL mode, note that additional requirements exist
    const notes =
      rule.mode === 'all'
        ? `Matching ancestor found. Additional requirements apply (see details).`
        : `${generationLabel(bestMatch.generation)} born in ${bestMatch.birthPlace ?? rule.country}`;

    const matchedRule =
      rule.maleLineOnly && bestMatch.sex !== 'M'
        ? rule.requirements[0] + ' (note: male-line ancestry may be required)'
        : rule.requirements[0];

    results.push({
      country: rule.country,
      flag: rule.flag,
      status,
      matchedAncestors: sorted,
      matchedRule,
      notes,
    });
  }

  // Sort: likely first, then possible, then insufficient
  const statusOrder: Record<EligibilityStatus, number> = {
    likely: 0,
    possible: 1,
    insufficient: 2,
  };
  results.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return results;
}

// ── Requirement checking (for detail panel) ─────────────────────────────────

export interface RequirementCheck {
  label: string;
  met: boolean;
}

export function checkRequirements(
  rule: string,
  matchedAncestors: AncestorInfo[],
  country: string,
): RequirementCheck[] {
  const countryRule = COUNTRY_RULES.find(r => r.country === country);
  if (!countryRule) return [];

  return countryRule.requirements.map(req => {
    const met = matchedAncestors.length > 0 && (
      req.toLowerCase().includes('ancestor') ||
      req.toLowerCase().includes('parent') ||
      req.toLowerCase().includes('grandparent')
    );
    return { label: req, met };
  });
}

export { COUNTRY_RULES };
