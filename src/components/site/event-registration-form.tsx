"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { IconCheck } from "./icons";
import { normalizePhone } from "@/lib/phone";
import { t } from "@/i18n";

export function EventRegistrationForm({ eventId }: { eventId: string }) {
  const [v, setV] = useState({ first_name: "", last_name: "", phone: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function set(k: keyof typeof v, val: string) {
    setV((x) => ({ ...x, [k]: val }));
    setErrors((e) => ({ ...e, [k]: "" }));
    setFormError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!v.first_name.trim()) next.first_name = "Ismingizni yozing";
    if (!v.last_name.trim()) next.last_name = "Familiyangizni yozing";
    if (!normalizePhone(v.phone)) next.phone = "Telefon raqami notoʻgʻri. Masalan: 90 123 45 67";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.field && ["first_name", "last_name", "phone"].includes(json.field)) setErrors({ [json.field]: json.error });
        else setFormError(json.error ?? "Xatolik yuz berdi");
        return;
      }
      setDone(true);
    } catch {
      setFormError("Internet aloqasini tekshirib, qayta urinib koʻring.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="animate-rise text-center" role="status">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-success-700 text-white"><IconCheck className="size-8" /></span>
        <p className="mt-4 font-display text-2xl font-semibold text-navy-900">{t.events.successTitle}</p>
        <p className="mt-2 text-sm leading-6 text-muted">{t.events.successText}</p>
        <button
          type="button"
          className="mt-5 text-sm font-semibold text-navy-700 hover:text-gold-700"
          onClick={() => { setDone(false); setV({ first_name: "", last_name: "", phone: "", website: "" }); }}
        >
          {t.events.another}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && <Alert tone="danger">{formError}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Field label={t.events.firstName} required error={errors.first_name}>
          {(p) => <Input {...p} value={v.first_name} onChange={(e) => set("first_name", e.target.value)} autoComplete="given-name" maxLength={80} />}
        </Field>
        <Field label={t.events.lastName} required error={errors.last_name}>
          {(p) => <Input {...p} value={v.last_name} onChange={(e) => set("last_name", e.target.value)} autoComplete="family-name" maxLength={80} />}
        </Field>
      </div>
      <Field label={t.events.phone} required error={errors.phone} hint={t.events.phoneHint}>
        {(p) => (
          <div className="flex">
            <span className="inline-flex h-11 items-center rounded-l-lg border border-r-0 border-line bg-cream-100 px-3 text-[15px] text-muted">+998</span>
            <Input {...p} type="tel" inputMode="tel" autoComplete="tel-national" value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder="90 123 45 67" maxLength={20} className="rounded-l-none" />
          </div>
        )}
      </Field>
      {/* Honeypot: hidden from people, bots fill it */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => set("website", e.target.value)} className="hidden" aria-hidden="true" />
      <Button type="submit" size="lg" className="w-full" loading={loading}>{loading ? t.events.submitting : t.events.submit}</Button>
      <p className="text-xs leading-5 text-muted">Maʼlumotlaringiz faqat tadbir tashkilotchilariga koʻrinadi.</p>
    </form>
  );
}
