// Maps a country code to the prayer-time calculation authority commonly
// used there. Used when the user picks "Auto by location".
//
// adhan's available methods:
//   MuslimWorldLeague, Egyptian, Karachi, UmmAlQura, Dubai,
//   MoonsightingCommittee, NorthAmerica, Kuwait, Qatar, Singapore,
//   Tehran, Turkey, Other
//
// Anything not listed falls back to MuslimWorldLeague (the most
// geographically neutral choice).

const COUNTRY_METHOD = {
  // Gulf / Umm al-Qura
  SA: "UmmAlQura",
  YE: "UmmAlQura",
  // Gulf states with their own tuned methods
  AE: "Dubai",
  KW: "Kuwait",
  QA: "Qatar",
  BH: "UmmAlQura",
  OM: "UmmAlQura",
  // North America (ISNA)
  US: "NorthAmerica",
  CA: "NorthAmerica",
  MX: "NorthAmerica",
  // Egypt + much of Africa / Levant using Egyptian authority
  EG: "Egyptian",
  SD: "Egyptian",
  LY: "Egyptian",
  DZ: "Egyptian",
  TN: "Egyptian",
  MA: "Egyptian",
  IQ: "Egyptian",
  SY: "Egyptian",
  JO: "Egyptian",
  LB: "Egyptian",
  PS: "Egyptian",
  // South Asia (Karachi)
  PK: "Karachi",
  IN: "Karachi",
  BD: "Karachi",
  AF: "Karachi",
  LK: "Karachi",
  // Specific national methods
  TR: "Turkey",
  IR: "Tehran",
  SG: "Singapore",
  MY: "Singapore",
  ID: "Singapore",
  BN: "Singapore",
};

// Human-friendly labels for the Settings dropdown.
const METHOD_LABELS = {
  MuslimWorldLeague: "Muslim World League",
  Egyptian: "Egyptian General Authority",
  Karachi: "Univ. of Islamic Sciences, Karachi",
  UmmAlQura: "Umm al-Qura, Makkah",
  Dubai: "Dubai",
  MoonsightingCommittee: "Moonsighting Committee",
  NorthAmerica: "ISNA (North America)",
  Kuwait: "Kuwait",
  Qatar: "Qatar",
  Singapore: "Singapore",
  Tehran: "Univ. of Tehran",
  Turkey: "Diyanet (Turkey)",
  Other: "Other / Custom",
};

function methodForCountry(countryCode) {
  if (!countryCode) return "MuslimWorldLeague";
  return COUNTRY_METHOD[countryCode.toUpperCase()] || "MuslimWorldLeague";
}

module.exports = { methodForCountry, METHOD_LABELS, COUNTRY_METHOD };
