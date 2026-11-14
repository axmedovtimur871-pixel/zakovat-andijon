import Link from "next/link";
import type { Metadata } from "next";
import { PageTitle } from "@/components/admin/admin-shell";
import { Card, EmptyState } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { IPlus } from "@/components/admin/admin-icons";
import { requireAdminPage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import type { EventRow } from "@/lib/types";

export const metadata: Metadata = { title: "Tadbirlar" };
const STATUS = { draft: { label: "Qoralama", tone: "neutral" }, published: { label: "Eʼlon qilingan", tone: "success" }, archived: { label: "Arxiv", tone: "navy" } } as const;

export default async function EventsAdminPage() {
  await requireAdminPage("manageEvents");
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*").order("starts_at", { ascending: false, nullsFirst: true });
  const events = (data ?? []) as EventRow[];
  const counts = new Map(
    await Promise.all(
      events.map(async (e) => {
        const { count } = await supabase.from("event_registrations").select("id", { count: "exact", head: true }).eq("event_id", e.id);
        return [e.id, count ?? 0] as const;
      }),
    ),
  );
  return (
    <>
      <PageTitle title="Tadbirlar" description="Saytdagi “Tadbirlarimiz” boʻlimi va sertifikat formalaridagi tadbirlar roʻyxati shu yerdan boshqariladi." actions={<LinkButton href="/admin/events/new"><IPlus className="size-5" /> Yangi tadbir</LinkButton>} />
      <Card>
        {events.length === 0 ? (
          <EmptyState title="Hali tadbir yoʻq" text="Birinchi tadbirni qoʻshing — u saytda va sertifikat yaratishda koʻrinadi." action={<LinkButton href="/admin/events/new" size="sm"><IPlus className="size-4" /> Tadbir qoʻshish</LinkButton>} />
        ) : (
          <ul className="divide-y divide-line">
            {events.map((e) => (
              <li key={e.id} className="flex flex-col gap-2 px-5 py-4 hover:bg-cream-50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <Link href={`/admin/events/${e.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-navy-900">{e.title}</p>
                  <p className="text-sm text-muted">{e.starts_at ? formatDateTime(e.starts_at) : "Sana belgilanmagan"}{e.location ? ` · ${e.location}` : ""}</p>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/admin/registrations?event=${e.id}`} className="rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-800 ring-1 ring-navy-200 hover:bg-gold-50 hover:ring-gold-400">
                    {counts.get(e.id) ?? 0} ta roʻyxatdan oʻtgan
                  </Link>
                  <Badge tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
