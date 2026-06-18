// Thin wrapper around the `adhan` library. Pure logic, no Electron — so
// the same module can be lifted into the Capacitor mobile build later.

const adhan = require("adhan");
const { methodForCountry } = require("./methods");

const PRAYER_ORDER = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

const DISPLAY = {
  fajr: { en: "Fajr", ar: "الفجر" },
  sunrise: { en: "Sunrise", ar: "الشروق" },
  dhuhr: { en: "Dhuhr", ar: "الظهر" },
  asr: { en: "Asr", ar: "العصر" },
  maghrib: { en: "Maghrib", ar: "المغرب" },
  isha: { en: "Isha", ar: "العشاء" },
  none: { en: "Isha", ar: "العشاء" },
};

function resolveMethodName(calc, countryCode) {
  if (!calc || calc.method === "auto") return methodForCountry(countryCode);
  return calc.method;
}

function buildParams(calc, countryCode) {
  const methodName = resolveMethodName(calc, countryCode);
  const factory = adhan.CalculationMethod[methodName] || adhan.CalculationMethod.MuslimWorldLeague;
  const params = factory();
  params.madhab = calc && calc.madhab === "hanafi" ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
  return { params, methodName };
}

// Returns prayer times + metadata for a given day (default: today).
function computeTimes({ lat, lng, calc, countryCode, date = new Date() }) {
  const coords = new adhan.Coordinates(lat, lng);
  const { params, methodName } = buildParams(calc, countryCode);
  const pt = new adhan.PrayerTimes(coords, date, params);

  const times = {
    fajr: pt.fajr,
    sunrise: pt.sunrise,
    dhuhr: pt.dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
  };

  return { pt, times, methodName, coords, params };
}

// Computes the next *obligatory* prayer (skips sunrise), handling the
// roll-over into tomorrow's Fajr after Isha.
function nextPrayer({ lat, lng, calc, countryCode, now = new Date() }) {
  const today = computeTimes({ lat, lng, calc, countryCode, date: now });

  for (const key of PRAYER_ORDER) {
    const t = today.times[key];
    if (t.getTime() > now.getTime()) {
      return {
        key,
        name: DISPLAY[key].en,
        arabic: DISPLAY[key].ar,
        time: t,
        msUntil: t.getTime() - now.getTime(),
        tomorrow: false,
      };
    }
  }

  // After Isha → tomorrow's Fajr
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tm = computeTimes({ lat, lng, calc, countryCode, date: tomorrow });
  return {
    key: "fajr",
    name: DISPLAY.fajr.en,
    arabic: DISPLAY.fajr.ar,
    time: tm.times.fajr,
    msUntil: tm.times.fajr.getTime() - now.getTime(),
    tomorrow: true,
  };
}

module.exports = {
  PRAYER_ORDER,
  DISPLAY,
  computeTimes,
  nextPrayer,
  resolveMethodName,
};
