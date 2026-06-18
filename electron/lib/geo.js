// Location services. All endpoints are free and keyless.
//   - Auto detect : ipwho.is (HTTPS), fallback ip-api.com
//   - City search : Open-Meteo geocoding (HTTPS)
// Uses global fetch (Node 18+ / Electron 33).

async function detectLocation() {
  // Primary: ipwho.is
  try {
    const r = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(8000) });
    const d = await r.json();
    if (d && d.success !== false && d.latitude) {
      return {
        lat: d.latitude,
        lng: d.longitude,
        city: d.city || d.region || "",
        country: d.country || "",
        countryCode: d.country_code || "",
        timezone: (d.timezone && d.timezone.id) || "",
        source: "auto",
      };
    }
  } catch (_) {
    /* fall through */
  }

  // Fallback: ip-api.com (HTTP only)
  try {
    const r = await fetch("http://ip-api.com/json/?fields=status,lat,lon,city,country,countryCode,timezone", {
      signal: AbortSignal.timeout(8000),
    });
    const d = await r.json();
    if (d && d.status === "success") {
      return {
        lat: d.lat,
        lng: d.lon,
        city: d.city || "",
        country: d.country || "",
        countryCode: d.countryCode || "",
        timezone: d.timezone || "",
        source: "auto",
      };
    }
  } catch (_) {
    /* fall through */
  }

  return null;
}

async function searchCity(query) {
  if (!query || query.trim().length < 2) return [];
  const url =
    "https://geocoding-api.open-meteo.com/v1/search?count=8&language=en&format=json&name=" +
    encodeURIComponent(query.trim());
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const d = await r.json();
    if (!d.results) return [];
    return d.results.map((x) => ({
      lat: x.latitude,
      lng: x.longitude,
      city: x.name,
      admin: x.admin1 || "",
      country: x.country || "",
      countryCode: x.country_code || "",
      timezone: x.timezone || "",
      label: [x.name, x.admin1, x.country].filter(Boolean).join(", "),
    }));
  } catch (_) {
    return [];
  }
}

module.exports = { detectLocation, searchCity };
