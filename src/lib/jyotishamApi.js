import { geocodeCity, DEFAULT_TZ } from './geocode';

const BASE_URL = 'https://api.jyotishamastroapi.com/api';

const pad2 = (n) => String(n).padStart(2, '0');

// JyotishamAstroAPI's date format is inconsistent per endpoint (confirmed against
// its Postman docs): panchang/* and numerology/* want DD/MM/YYYY, while
// horoscope/* and matching/* want YYYY/MM/DD. Times are always 24h HH:mm.
export const toApiDateDMY = (isoDate) => {
  const [year, month, day] = isoDate.split('-');
  return `${pad2(day)}/${pad2(month)}/${year}`;
};
export const toApiDateYMD = (isoDate) => {
  const [year, month, day] = isoDate.split('-');
  return `${year}/${pad2(month)}/${pad2(day)}`;
};
export const toApiTime = (time) => {
  const [hour, minute] = time.split(':');
  return `${pad2(hour)}:${pad2(minute)}`;
};

export async function jyotishamGet(path, params) {
  const apiKey = import.meta.env.VITE_JYOTISHAM_API_KEY;
  if (!apiKey) throw new Error('Astrology API is not configured.');

  const query = new URLSearchParams({ lang: 'en', ...params }).toString();
  const res = await fetch(`${BASE_URL}/${path}?${query}`, { headers: { key: apiKey } });
  const data = await res.json();
  if (data?.status !== 200) throw new Error(data?.msg || 'Failed to fetch astrology data.');
  return data.response;
}

// chart_image/* endpoints don't use the {status, response} envelope — they
// return the raw SVG markup as a bare JSON string.
export async function jyotishamGetSvg(path, params) {
  const apiKey = import.meta.env.VITE_JYOTISHAM_API_KEY;
  if (!apiKey) throw new Error('Astrology API is not configured.');

  const query = new URLSearchParams({ lang: 'en', style: 'north', ...params }).toString();
  const res = await fetch(`${BASE_URL}/${path}?${query}`, { headers: { key: apiKey } });
  const svg = await res.json();
  if (typeof svg !== 'string' || !svg.startsWith('<svg')) throw new Error('Failed to generate chart.');
  return svg;
}

// Shared birth-detail params (date/time/lat/lon/tz) most endpoints need.
// dateFormat differs per endpoint — confirmed against the Postman docs, not
// documented consistently by the API itself.
export async function buildBirthParams(form, dateFormat = 'DMY') {
  const { lat, lon } = await geocodeCity(form.city);
  return {
    date: dateFormat === 'YMD' ? toApiDateYMD(form.dob) : toApiDateDMY(form.dob),
    time: toApiTime(form.tob),
    latitude: lat,
    longitude: lon,
    tz: DEFAULT_TZ,
  };
}

export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];
