import type { Metadata } from "next";
import { PageTitle } from "@/components/admin/admin-shell";
import { Card, EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { RegistrationsTable } from "@/components/admin/registrations-table";
import { IPlus } from "@/components/admin/admin-icons";
import { requireAdminPage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { RegistrationRow } from "@/lib/types";

export const metadata: Metadata = { title: "Roʻyxatdan oʻtganlar" };

export default async function RegistrationsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  await requireAdminPage("viewRegistrations");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: eventRows } = await supabase.from("events").select("id, title, starts_at").order("starts_at", { ascending: false, nullsFirst: true }).limit(200);
  const counts = await Promise.all(
    (eventRows ?? []).map(async (e) => {
      const { count } = await supabase.from("event_registrations").select("id", { count: "exact", head: true }).eq("event_id", e.id);
      return { ...e, count: count ?? 0 };
    }),
  );

  if (counts.length === 0) {
    return (
      <>
        <PageTitle title="Roʻyxatdan oʻtganlar" />
        <Card><EmptyState title="Hali tadbir yoʻq" text="Avval tadbir yarating va uni eʼlon qiling." action={<LinkButton href="/admin/events/new" size="sm"><IPlus className="size-4" /> Tadbir qoʻshish</LinkButton>} /></Card>
      </>
    );
  }

  const selected = counts.find((e) => e.id === sp.event) ?? counts.find((e) => e.count > 0) ?? counts[0];
  const rows: RegistrationRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from("event_registrations").select("id, event_id, first_name, last_name, phone, created_at").eq("event_id", selected.id).order("created_at").range(from, from + 999);
    rows.push(...((data ?? []) as RegistrationRow[]));
    if (!data || data.length < 1000) break;
  }

  return (
    <>
      <PageTitle title="Roʻyxatdan oʻtganlar" description="Tadbir sahifasidagi forma orqali roʻyxatdan oʻtgan ishtirokchilar. Telefon raqamiga bosib qoʻngʻiroq qilishingiz mumkin." />
      <Card>
        <RegistrationsTable key={selected.id} events={counts} selectedId={selected.id} rows={rows} />
      </Card>
    </>
  );
}
