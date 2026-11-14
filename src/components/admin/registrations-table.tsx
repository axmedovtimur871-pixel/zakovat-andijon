"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { IconDownload, IconSearch } from "@/components/site/icons";
import { ITrash } from "./admin-icons";
import { deleteRegistration } from "@/app/admin/(panel)/events/actions";
import { formatPhone } from "@/lib/phone";
import { formatDateTime } from "@/lib/format";
import type { RegistrationRow } from "@/lib/types";

interface EventOption { id: string; title: string; count: number; starts_at: string | null }

export function RegistrationsTable({ events, selectedId, rows }: { events: EventOption[]; selectedId: string; rows: RegistrationRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<RegistrationRow | null>(null);
  const event = events.find((e) => e.id === selectedId);

  const filtered = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("uz");
    const digits = term.replace(/\D/g, "");
    if (!term) return rows;
    return rows.filter((r) =>
      `${r.first_name} ${r.last_name}`.toLocaleLowerCase("uz").includes(term) || (digits.length >= 2 && r.phone.includes(digits)),
    );
  }, [q, rows]);

  function downloadCsv() {
    // ";" + BOM so Excel opens it with correct columns and Uzbek letters.
    const lines = ["№;Ism;Familiya;Telefon;Roʻyxatdan oʻtgan vaqt"].concat(
      rows.map((r, i) => [String(i + 1), r.first_name, r.last_name, formatPhone(r.phone), formatDateTime(r.created_at)]
        .map((v) => `"${v.replace(/"/g, '""')}"`).join(";")),
    );
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `royxat-${(event?.title ?? "tadbir").replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 60)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  }

  return (
    <>
      <div className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row sm:items-center sm:px-6">
        <Select
          aria-label="Tadbir"
          value={selectedId}
          onChange={(e) => start(() => router.push(`${pathname}?event=${e.target.value}`))}
          className="sm:max-w-sm"
        >
          {events.map((e) => <option key={e.id} value={e.id}>{e.title} ({e.count})</option>)}
        </Select>
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ism, familiya yoki telefon"
            aria-label="Qidirish"
            className="h-11 w-full rounded-lg border border-line bg-white pr-3 pl-11 text-[15px] focus:border-gold-500 focus:ring-3 focus:ring-gold-300/40 focus:outline-none"
          />
        </div>
        <Button variant="outline" onClick={downloadCsv} disabled={rows.length === 0}>
          <IconDownload className="size-5" /> Excel (CSV)
        </Button>
      </div>

      {pending ? (
        <p className="p-6 text-sm text-muted">Yuklanmoqda…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Hali hech kim roʻyxatdan oʻtmagan" text="Tadbir sahifasidagi forma orqali roʻyxatdan oʻtganlar shu yerda paydo boʻladi." />
      ) : filtered.length === 0 ? (
        <EmptyState title="Hech narsa topilmadi" text="Qidiruv soʻzini oʻzgartirib koʻring." />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-cream-50 text-xs font-semibold tracking-wide text-muted uppercase">
                <tr>
                  <th className="w-14 px-6 py-3">№</th>
                  <th className="px-3 py-3">Ism familiya</th>
                  <th className="px-3 py-3">Telefon</th>
                  <th className="px-3 py-3">Vaqt</th>
                  <th className="px-6 py-3 text-right"><span className="sr-only">Amallar</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-cream-50/70">
                    <td className="px-6 py-3 text-muted">{rows.indexOf(r) + 1}</td>
                    <td className="px-3 py-3 font-semibold text-navy-900">{r.first_name} {r.last_name}</td>
                    <td className="px-3 py-3"><a href={`tel:${r.phone}`} className="font-mono text-navy-800 hover:text-gold-700">{formatPhone(r.phone)}</a></td>
                    <td className="px-3 py-3 whitespace-nowrap text-muted">{formatDateTime(r.created_at)}</td>
                    <td className="px-6 py-3 text-right">
                      <button type="button" onClick={() => setConfirm(r)} className="inline-grid size-9 place-items-center rounded-md text-muted hover:bg-danger-100 hover:text-danger-700" aria-label={`${r.first_name} ${r.last_name} — oʻchirish`}>
                        <ITrash className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-line md:hidden">
            {filtered.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-navy-900">{rows.indexOf(r) + 1}. {r.first_name} {r.last_name}</p>
                  <a href={`tel:${r.phone}`} className="font-mono text-sm text-navy-700">{formatPhone(r.phone)}</a>
                  <p className="text-xs text-muted">{formatDateTime(r.created_at)}</p>
                </div>
                <button type="button" onClick={() => setConfirm(r)} className="grid size-10 shrink-0 place-items-center rounded-md text-muted hover:bg-danger-100 hover:text-danger-700" aria-label="Oʻchirish">
                  <ITrash className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-5 py-4 text-sm text-muted sm:px-6">
            Jami: <b className="text-navy-900">{rows.length}</b> ta{q && filtered.length !== rows.length ? ` · topildi: ${filtered.length}` : ""}
          </p>
        </>
      )}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Roʻyxatdan oʻchirish"
        description={confirm && <><b>{confirm.first_name} {confirm.last_name}</b> ({formatPhone(confirm.phone)}) roʻyxatdan oʻchiriladi. Bu amal tarixda saqlanadi.</>}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Bekor</Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => start(async () => {
                if (!confirm) return;
                const res = await deleteRegistration(confirm.id);
                setConfirm(null);
                if (!res.ok) return toast(res.error, "error");
                toast("Roʻyxatdan oʻchirildi");
                router.refresh();
              })}
            >
              Oʻchirish
            </Button>
          </>
        }
      />
    </>
  );
}
