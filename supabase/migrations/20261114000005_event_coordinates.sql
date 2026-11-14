-- Map pin for an event (optional). Set in Admin → Tadbirlar by clicking the map.
alter table public.events
  add column if not exists latitude  double precision check (latitude  between -90  and 90),
  add column if not exists longitude double precision check (longitude between -180 and 180);

alter table public.events
  drop constraint if exists events_coordinates_pair;
alter table public.events
  add constraint events_coordinates_pair check ((latitude is null) = (longitude is null));
