import { IconExternal, IconPin } from "./icons";
import { embedMapUrl, googleMapsUrl, yandexMapsUrl, type LatLng } from "@/lib/geo";
import { buttonClass } from "@/components/ui/button";

/** Event location: embedded map + one-tap buttons to open Google / Yandex Maps (navigation). */
export function EventMap({ point, address, title }: { point: LatLng | null; address: string; title: string }) {
  if (!point && !address) return null;
  return (
    <section id="xarita" className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div className="relative aspect-[4/3] bg-cream-100">
        <iframe
          src={embedMapUrl(point, address)}
          title={`${title} — xaritada`}
          className="absolute inset-0 size-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      <div className="p-5">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-navy-900">
          <IconPin className="size-5 text-gold-600" /> Tadbir joyi
        </h2>
        {address && <p className="mt-1 text-sm leading-6 text-muted">{address}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href={googleMapsUrl(point, address)} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm")}>
            Google Maps <IconExternal className="size-3.5" />
          </a>
          <a href={yandexMapsUrl(point, address)} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm")}>
            Yandex Maps <IconExternal className="size-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
