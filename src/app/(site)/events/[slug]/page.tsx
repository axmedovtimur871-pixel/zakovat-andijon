import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { IconArrowRight, IconCalendar, IconExternal, IconPin } from "@/components/site/icons";
import { getEventBySlug } from "@/lib/public-data";
import { formatDateTime } from "@/lib/format";
import { publicMediaUrl } from "@/lib/env";
import { EventRegistrationForm } from "@/components/site/event-registration-form";
import { isRegistrationOpen } from "@/lib/registration";
import { EventMap } from "@/components/site/event-map";
import { t } from "@/i18n";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const event = await getEventBySlug((await params).slug);
  return event ? { title: event.title, description: event.summary || undefined } : { title: t.common.notFoundTitle };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getEventBySlug((await params).slug);
  if (!event) notFound();
  const cover = publicMediaUrl(event.cover_image_path);
  const open = isRegistrationOpen(event);
  const point = event.latitude != null && event.longitude != null ? { lat: event.latitude, lng: event.longitude } : null;
  const hasMap = Boolean(point || event.location);
  return (
    <article>
      <header className="relative overflow-hidden bg-navy-950 text-cream-50">
        <div className="pattern-octagram pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="container-page relative py-14 sm:py-20">
          <Link href="/events" className="inline-flex items-center gap-2 text-sm text-cream-100/70 hover:text-gold-300">
            <IconArrowRight className="size-4 rotate-180" /> {t.events.back}
          </Link>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">{event.title}</h1>
          {event.summary && <p className="mt-4 max-w-2xl text-lg leading-8 text-cream-100/75">{event.summary}</p>}
          <dl className="mt-8 flex flex-col gap-3 text-sm sm:flex-row sm:gap-8">
            <div className="flex items-center gap-2">
              <IconCalendar className="size-5 text-gold-400" />
              <dt className="sr-only">{t.events.date}</dt>
              <dd>{event.starts_at ? formatDateTime(event.starts_at) : t.events.tba}</dd>
            </div>
            {hasMap && (
              <div className="flex items-center gap-2">
                <IconPin className="size-5 text-gold-400" />
                <dt className="sr-only">{t.events.location}</dt>
                <dd>
                  <a href="#xarita" className="underline decoration-gold-400/60 underline-offset-4 hover:text-gold-300">
                    {event.location || "Xaritada koʻrish"}
                  </a>
                </dd>
              </div>
            )}
          </dl>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {open && (
              <a href="#royxat" className={buttonClass("gold", "lg")}>
                {t.events.register} <IconArrowRight className="size-5" />
              </a>
            )}
            {event.registration_url && (
              <a href={event.registration_url} target="_blank" rel="noopener noreferrer" className={buttonClass(open ? "light" : "gold", "lg")}>
                {open ? t.events.externalRegister : t.events.register} <IconExternal className="size-4" />
              </a>
            )}
          </div>
        </div>
      </header>
      <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4 text-[16px] leading-8 text-ink/85">
          {(event.description || event.summary || "").split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
        </div>
        <aside className="space-y-6 lg:self-start">
          {open ? (
            <section id="royxat" className="scroll-mt-24 rounded-2xl border border-gold-400/60 bg-white p-5 shadow-lift sm:p-6">
              <h2 className="font-display text-2xl font-semibold text-navy-900">{t.events.registerTitle}</h2>
              <p className="mt-1 mb-5 text-sm leading-6 text-muted">{t.events.registerIntro}</p>
              <EventRegistrationForm eventId={event.id} />
            </section>
          ) : (
            !event.registration_url && (
              <p className="rounded-2xl border border-line bg-cream-100 p-5 text-sm text-muted">{t.events.closed}</p>
            )
          )}
          <EventMap point={point} address={event.location} title={event.title} />
          {cover && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-line">
              <Image src={cover} alt="" fill sizes="(min-width: 1024px) 400px, 100vw" className="object-cover" />
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}
