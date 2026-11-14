export interface LatLng { lat: number; lng: number }

/** Andijon shahar markazi – xarita shu yerdan boshlanadi. */
export const ANDIJAN_CENTER: LatLng = { lat: 40.7821, lng: 72.3442 };

const valid = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

const round = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Reads coordinates from what an admin is likely to paste:
 *  "40.7821, 72.3442" · Google Maps links (…/@40.78,72.34,17z · ?q=40.78,72.34 · !3d40.78!4d72.34)
 *  · Yandex Maps links (?ll=72.34,40.78 · pt=72.34,40.78 · whatshere[point]=72.34,40.78 – longitude first).
 */
export function parseCoordinates(input: string): LatLng | null {
  const s = decodeURIComponent(String(input ?? "").trim());
  if (!s) return null;
  const num = "(-?\\d{1,3}(?:\\.\\d+)?)";
  const tryPair = (re: RegExp, lngFirst = false): LatLng | null => {
    const m = re.exec(s);
    if (!m) return null;
    const a = parseFloat(m[1]);
    const b = parseFloat(m[2]);
    const [lat, lng] = lngFirst ? [b, a] : [a, b];
    return valid(lat, lng) ? { lat: round(lat), lng: round(lng) } : null;
  };
  return (
    tryPair(new RegExp(`!3d${num}!4d${num}`)) ??
    tryPair(new RegExp(`@${num},${num}`)) ??
    tryPair(new RegExp(`[?&](?:q|query|ll|center|destination)=${num},\\s*${num}`), /yandex/i.test(s) && /[?&]ll=/.test(s)) ??
    tryPair(new RegExp(`(?:pt|whatshere\\[point\\])=${num},${num}`), true) ??
    tryPair(new RegExp(`^${num}\\s*[,;\\s]\\s*${num}$`))
  );
}

export function googleMapsUrl(p: LatLng | null, address?: string) {
  const q = p ? `${p.lat},${p.lng}` : address ?? "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function yandexMapsUrl(p: LatLng | null, address?: string) {
  return p
    ? `https://yandex.uz/maps/?pt=${p.lng},${p.lat}&z=17&l=map`
    : `https://yandex.uz/maps/?text=${encodeURIComponent(address ?? "")}`;
}

/** Embeddable map (no API key needed). */
export function embedMapUrl(p: LatLng | null, address?: string) {
  const q = p ? `${p.lat},${p.lng}` : address ?? "";
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${p ? 17 : 15}&output=embed`;
}
