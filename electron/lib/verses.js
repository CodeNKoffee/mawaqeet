// Loads the verified verse dataset and picks one for a given prayer.
const fs = require("fs");
const path = require("path");

let CACHE = null;

function load() {
  if (CACHE) return CACHE;
  const p = path.join(__dirname, "..", "..", "data", "verses.json");
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  CACHE = raw.verses || [];
  return CACHE;
}

// Deterministic-ish daily rotation: same verse for the same prayer on the
// same day (so it doesn't flicker while the blocker is open), but it
// changes day to day. Prefers verses tagged for that specific prayer.
function pickForPrayer(prayerKey, date = new Date()) {
  const all = load();
  if (!all.length) return null;
  const key = (prayerKey || "any").toLowerCase();

  const tagged = all.filter((v) => v.tags && v.tags.includes(key));
  const pool = tagged.length ? tagged : all;

  const dayIndex =
    Math.floor(date.getTime() / 86400000) + key.charCodeAt(0); // varies by day & prayer
  const v = pool[dayIndex % pool.length];
  return v;
}

function all() {
  return load();
}

module.exports = { pickForPrayer, all };
