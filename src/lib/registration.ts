import type { EventRow } from "@/lib/types";

/** Same rule as register_for_event() in the database. */
export function isRegistrationOpen(e: Pick<EventRow, "registration_open" | "starts_at" | "ends_at" | "status">) {
  if (e.status !== "published" || !e.registration_open) return false;
  const end = e.ends_at ? new Date(e.ends_at).getTime() : e.starts_at ? new Date(e.starts_at).getTime() + 12 * 3600_000 : null;
  return end === null || end >= Date.now();
}
