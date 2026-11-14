-- =====================================================================
-- Event registrations: visitors sign up for an event (first name,
-- last name, phone). Only administrators can see the list.
-- =====================================================================

alter table public.events
  add column if not exists registration_open boolean not null default true;

create table if not exists public.event_registrations (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  first_name  text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name   text not null check (char_length(btrim(last_name)) between 1 and 80),
  phone       text not null check (phone ~ '^\+[0-9]{8,15}$'),
  ip_hash     text,
  created_at  timestamptz not null default now(),
  unique (event_id, phone)
);
create index if not exists event_registrations_event_idx
  on public.event_registrations (event_id, created_at desc);

alter table public.event_registrations enable row level security;

-- Nobody signs up by writing to the table directly: visitors go through
-- register_for_event() below, which checks that the event accepts sign-ups.
create policy event_registrations_admin_select on public.event_registrations
  for select to authenticated
  using (public.has_admin_role(array['super_admin', 'admin']::public.admin_role[]));
create policy event_registrations_admin_delete on public.event_registrations
  for delete to authenticated
  using (public.has_admin_role(array['super_admin', 'admin']::public.admin_role[]));

revoke all on public.event_registrations from anon;
revoke insert, update on public.event_registrations from authenticated;
grant select, delete on public.event_registrations to authenticated;

-- Public sign-up. Returns 'ok' | 'duplicate' | 'closed' | 'not_found'.
create or replace function public.register_for_event(
  p_event_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_ip_hash text default null
)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_event public.events;
begin
  select * into v_event from public.events where id = p_event_id and status = 'published';
  if not found then
    return 'not_found';
  end if;
  if not v_event.registration_open
     or coalesce(v_event.ends_at, v_event.starts_at + interval '12 hours') < now() then
    return 'closed';
  end if;

  insert into public.event_registrations (event_id, first_name, last_name, phone, ip_hash)
  values (p_event_id, btrim(p_first_name), btrim(p_last_name), btrim(p_phone), left(p_ip_hash, 128));
  return 'ok';
exception
  when unique_violation then
    return 'duplicate';
end $$;

revoke all on function public.register_for_event(uuid, text, text, text, text) from public;
grant execute on function public.register_for_event(uuid, text, text, text, text) to anon, authenticated;

-- Audit: removing a registration is a sensitive admin action.
create or replace function public.audit_registration_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.activity_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'registration.deleted', 'event_registrations', old.id::text,
          jsonb_build_object('name', old.first_name || ' ' || old.last_name, 'event_id', old.event_id));
  return null;
end $$;
revoke execute on function public.audit_registration_delete() from public, anon, authenticated;

create trigger audit_event_registrations after delete on public.event_registrations
  for each row execute function public.audit_registration_delete();
