import { NextResponse } from "next/server";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/server";
import { clientFingerprint } from "@/lib/verify";
import { rateLimit } from "@/lib/rate-limit";
import { nameSchema } from "@/lib/validation";
import { normalizePhone } from "@/lib/phone";
import { isSupabaseConfigured } from "@/lib/env";

const schema = z.object({
  first_name: nameSchema,
  last_name: nameSchema,
  phone: z.string().max(40),
  website: z.string().max(200).optional(), // honeypot – real visitors never fill it
});

const err = (message: string, status = 400, field?: string) => NextResponse.json({ error: message, field }, { status });

// Public sign-up for an event. The database function decides whether the event
// still accepts registrations; the list itself is visible only to admins.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return err("Tadbir topilmadi.", 404);
  if (!isSupabaseConfigured) return err("Roʻyxatdan oʻtish vaqtincha ishlamayapti.", 503);

  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return err("Notoʻgʻri soʻrov.", 403);

  const fp = await clientFingerprint();
  if (!rateLimit(`reg:${fp.ipHash}`, 5, 60_000) || !rateLimit(`reg-h:${fp.ipHash}`, 30, 3_600_000)) {
    return err("Juda koʻp urinish. Birozdan soʻng qayta urinib koʻring.", 429);
  }

  let body: z.infer<typeof schema>;
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = String(issue.path[0] ?? "");
      const label = field === "first_name" ? "Ism" : field === "last_name" ? "Familiya" : "Maʼlumot";
      return err(`${label}: ${issue.message}`, 422, field);
    }
    body = parsed.data;
  } catch {
    return err("Soʻrov formati notoʻgʻri.");
  }
  if (body.website) return NextResponse.json({ ok: true }); // bot – pretend success

  const phone = normalizePhone(body.phone);
  if (!phone) return err("Telefon raqami notoʻgʻri. Masalan: 90 123 45 67", 422, "phone");

  const { data, error } = await createPublicClient().rpc("register_for_event", {
    p_event_id: id,
    p_first_name: body.first_name,
    p_last_name: body.last_name,
    p_phone: phone,
    p_ip_hash: fp.ipHash,
  });
  if (error) {
    console.error("register_for_event:", error.message);
    return err("Roʻyxatdan oʻtkazib boʻlmadi. Qayta urinib koʻring.", 500);
  }
  switch (data) {
    case "ok":
      return NextResponse.json({ ok: true }, { status: 201 });
    case "duplicate":
      return err("Bu telefon raqami bilan shu tadbirga allaqachon roʻyxatdan oʻtilgan.", 409, "phone");
    case "closed":
      return err("Bu tadbirga roʻyxatdan oʻtish yopilgan.", 410);
    default:
      return err("Tadbir topilmadi.", 404);
  }
}
