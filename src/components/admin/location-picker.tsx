"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { IconPin, IconSearch } from "@/components/site/icons";
import { ANDIJAN_CENTER, parseCoordinates, type LatLng } from "@/lib/geo";
import { resolveMapLink } from "@/app/admin/(panel)/events/actions";

interface Props {
  value: LatLng | null;
  onChange: (v: LatLng | null) => void;
  address: string;
}

/** Click (or tap) on the map to drop the pin. Drag the pin to adjust. */
export function LocationPicker({ value, onChange, address }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const L = useRef<typeof import("leaflet") | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [results, setResults] = useState<{ name: string; p: LatLng }[]>([]);

  // Create the map once (Leaflet needs the browser, so it is loaded lazily).
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((leaflet) => {
      if (cancelled || !box.current || map.current) return;
      L.current = leaflet;
      const start = value ?? ANDIJAN_CENTER;
      const m = leaflet.map(box.current, { scrollWheelZoom: false }).setView([start.lat, start.lng], value ? 16 : 13);
      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      m.on("click", (e) => onChangeRef.current({ lat: round(e.latlng.lat), lng: round(e.latlng.lng) }));
      map.current = m;
      placeMarker(value);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the pin in sync with the value.
  useEffect(() => placeMarker(value), [value]);

  function placeMarker(p: LatLng | null) {
    const leaflet = L.current;
    const m = map.current;
    if (!leaflet || !m) return;
    if (!p) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      const icon = leaflet.divIcon({
        className: "",
        html: '<div style="width:34px;height:34px;transform:translate(-50%,-100%);position:absolute"><svg viewBox="0 0 24 24" width="34" height="34"><path d="M12 22s-7-6.2-7-12a7 7 0 0114 0c0 5.8-7 12-7 12z" fill="#0f2044" stroke="#d6b569" stroke-width="1.6"/><circle cx="12" cy="10" r="2.6" fill="#d6b569"/></svg></div>',
        iconSize: [0, 0],
      });
      marker.current = leaflet.marker([p.lat, p.lng], { icon, draggable: true }).addTo(m);
      marker.current.on("dragend", () => {
        const ll = marker.current!.getLatLng();
        onChangeRef.current({ lat: round(ll.lat), lng: round(ll.lng) });
      });
    } else {
      marker.current.setLatLng([p.lat, p.lng]);
    }
  }

  function goTo(p: LatLng) {
    onChange(p);
    map.current?.setView([p.lat, p.lng], 17);
    setResults([]);
  }

  async function search() {
    const q = query.trim() || address.trim();
    if (!q) return setMsg("Manzil yoki havolani yozing.");
    setMsg(null);
    setResults([]);
    // 1) coordinates or a full Google/Yandex link
    const direct = parseCoordinates(q);
    if (direct) return goTo(direct);
    setBusy(true);
    try {
      // 2) short share link from a phone
      if (/^https?:\/\//i.test(q)) {
        const res = await resolveMapLink(q);
        const p = res.ok ? parseCoordinates(res.url) : null;
        if (p) return goTo(p);
        return setMsg("Bu havoladan joylashuvni aniqlab boʻlmadi. Xaritada bosib belgilang.");
      }
      // 3) address search (OpenStreetMap Nominatim)
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=uz&countrycodes=uz&q=${encodeURIComponent(q)}`;
      const data = (await (await fetch(url)).json()) as { display_name: string; lat: string; lon: string }[];
      const found = data.map((d) => ({ name: d.display_name, p: { lat: round(+d.lat), lng: round(+d.lon) } }));
      if (found.length === 0) setMsg("Topilmadi. Xaritada kerakli joyga bosing yoki Google Maps havolasini qoʻying.");
      else if (found.length === 1) goTo(found[0].p);
      else setResults(found);
    } catch {
      setMsg("Qidirib boʻlmadi. Xaritada kerakli joyga bosing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-navy-900">Xaritadagi joylashuv</span>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }}
            placeholder="Manzil, Google/Yandex Maps havolasi yoki 40.78, 72.34"
            className="pl-9"
            aria-label="Joylashuvni qidirish"
          />
        </div>
        <Button variant="outline" onClick={search} loading={busy}>Topish</Button>
      </div>
      {results.length > 0 && (
        <ul className="overflow-hidden rounded-lg border border-line bg-white text-sm">
          {results.map((r, i) => (
            <li key={i}>
              <button type="button" onClick={() => goTo(r.p)} className="w-full px-3 py-2 text-left hover:bg-gold-50">{r.name}</button>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="text-sm text-warning-700">{msg}</p>}
      <div ref={box} className="relative z-0 h-72 overflow-hidden rounded-xl ring-1 ring-line" role="application" aria-label="Xarita: joylashuvni belgilash uchun bosing" />
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        {value ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-success-700">
            <IconPin className="size-4" /> Belgilandi: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
        ) : (
          <span className="text-muted">Xaritada tadbir oʻtadigan joyga <b>bir marta bosing</b>. Belgini sudrab aniqlashtirish mumkin.</span>
        )}
        {value && <button type="button" onClick={() => onChange(null)} className="font-semibold text-danger-700">Belgini olib tashlash</button>}
      </div>
    </div>
  );
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;
