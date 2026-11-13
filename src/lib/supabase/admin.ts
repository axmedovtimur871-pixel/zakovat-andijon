import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";
import { HttpError } from "@/lib/http-error";

/**
 * Service-role client. Bypasses RLS – use ONLY on the server, ONLY after the
 * caller's permissions were checked, and only for operations RLS cannot express
 * (creating auth users, serving a verified PDF to the public).
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!SUPABASE_URL || !key) {
    throw new HttpError(500, "Server sozlanmagan: SUPABASE_SERVICE_ROLE_KEY kiritilmagan. Hosting sozlamalariga Supabase'ning secret kalitini qoʻshing.");
  }
  // A real key is plain ASCII: sb_secret_… (new) or a JWT eyJ… (legacy service_role).
  // Anything else (spaces, quotes, pasted instructions) breaks HTTP headers.
  if (!/^(sb_secret_[A-Za-z0-9_-]{10,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.test(key)) {
    throw new HttpError(500, "Server sozlamasida xato: SUPABASE_SERVICE_ROLE_KEY qiymati notoʻgʻri. Supabase → Project Settings → API Keys boʻlimidan secret kalitni nusxalab, hosting sozlamalariga qayta qoʻying va saytni qayta deploy qiling.");
  }
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
