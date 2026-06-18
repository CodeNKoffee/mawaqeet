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

// v0.1: use a SINGLE fixed verse (An-Nūr 24:37) instead of rotating, so it can
// be verified once. The daily randomizer is preserved below (commented) and can
// be re-enabled in a later version. All verses remain in data/verses.json.
const FIXED_REF = "24:37";

function pickForPrayer(prayerKey, date = new Date()) {
  const all = load();
  if (!all.length) return null;
  return all.find((v) => v.ref === FIXED_REF) || all[0];

  /* --- daily rotation (disabled for v0.1) ---
  const key = (prayerKey || "any").toLowerCase();
  const tagged = all.filter((v) => v.tags && v.tags.includes(key));
  const pool = tagged.length ? tagged : all;
  const dayIndex =
    Math.floor(date.getTime() / 86400000) + key.charCodeAt(0); // varies by day & prayer
  return pool[dayIndex % pool.length];
  */
}

function all() {
  return load();
}

module.exports = { pickForPrayer, all };
