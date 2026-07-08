// Free, keyless geocoding via OpenStreetMap Nominatim. Used to turn a
// birth-city name into the lat/lon the JyotishamAstroAPI endpoints require.
export async function geocodeCity(city) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Could not look up that birth city.');
  const results = await res.json();
  if (!results.length) throw new Error('Could not find that birth city. Try a nearby major city instead.');
  return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
}

// India Standard Time — the site targets Indian users/cities exclusively (matches
// the fixed +5:30 offset already assumed by PanchangWidget.jsx).
export const DEFAULT_TZ = 5.5;
