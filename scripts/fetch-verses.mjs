// Builds data/verses.json from verified sources.
// Arabic  : quran-uthmani  (Uthmani rasm, fully voweled)
// English : en.sahih       (Sahih International)
// Source  : https://alquran.cloud  (free, no key)
//
// Run:  npm run fetch:verses
//
// We deliberately store the text VERBATIM from the API so the Arabic
// renders correctly in a Quranic font (Amiri Quran) without any of our
// own transcription errors.

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "verses.json");

// Curated, prayer-themed ayat. `tags` lets us bias which verse shows for
// which prayer; `any` means it can show for any prayer.
const REFS = [
  { ref: "11:114", tags: ["any", "dhuhr", "fajr", "maghrib"] }, // establish prayer at the two ends of the day
  { ref: "2:45",   tags: ["any"] },                              // seek help through patience and prayer
  { ref: "2:153",  tags: ["any"] },                              // patience and prayer
  { ref: "2:238",  tags: ["any", "asr"] },                       // guard strictly your prayers, esp. the middle one
  { ref: "20:14",  tags: ["any", "fajr"] },                      // establish prayer for My remembrance
  { ref: "20:132", tags: ["any"] },                              // enjoin prayer upon your family
  { ref: "29:45",  tags: ["any"] },                              // prayer prohibits immorality and wrongdoing
  { ref: "4:103",  tags: ["any"] },                              // prayer is decreed at specified times
  { ref: "23:9",   tags: ["any"] },                              // those who carefully maintain their prayers
  { ref: "70:34",  tags: ["any"] },                              // those who guard their prayer
  { ref: "87:15",  tags: ["any", "fajr"] },                      // mentions his Lord's name and prays
  { ref: "62:9",   tags: ["any", "dhuhr"] },                     // hasten to the remembrance of Allah, leave trade
  { ref: "63:9",   tags: ["any"] },                              // let not wealth/children divert from remembrance
  { ref: "24:37",  tags: ["any", "dhuhr", "asr"] },              // men whom trade does not distract from prayer
];

async function fetchAyah(ref) {
  const url = `https://api.alquran.cloud/v1/ayah/${ref}/editions/quran-uthmani,en.sahih`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${ref}`);
  const json = await res.json();
  if (json.code !== 200) throw new Error(`API ${json.code} for ${ref}`);
  const [ar, en] = json.data;
  return {
    ref,
    surah: ar.surah.number,
    ayah: ar.numberInSurah,
    juz: ar.juz,                           // which Juz' (1–30)
    surahArabic: ar.surah.name,            // e.g. سُورَةُ هُودٍ
    surahEnglish: ar.surah.englishName,    // e.g. Hud
    arabic: ar.text,                       // Uthmani
    english: en.text,                      // Sahih International
  };
}

async function main() {
  const out = [];
  for (const { ref, tags } of REFS) {
    process.stdout.write(`  fetching ${ref} … `);
    try {
      const v = await fetchAyah(ref);
      out.push({ ...v, tags });
      console.log("ok");
    } catch (e) {
      console.log("FAILED:", e.message);
    }
    await new Promise((r) => setTimeout(r, 250)); // be gentle
  }

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify(
      {
        _meta: {
          arabicEdition: "quran-uthmani",
          englishEdition: "en.sahih (Sahih International)",
          source: "https://alquran.cloud",
          generatedAt: new Date().toISOString(),
          count: out.length,
        },
        verses: out,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(`\nWrote ${out.length} verses → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
