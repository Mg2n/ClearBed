-- ============================================================
-- ClearBed — Row Level Security Policies
-- Run AFTER 01_schema.sql
-- ============================================================

-- Helper: get the current user's facility_id from their profile
create or replace function my_facility_id()
returns uuid language sql security definer stable as $$
  select facility_id from profiles where id = auth.uid()
$$;

-- Helper: get the current user's role
create or replace function my_role()
returns user_role language sql security definer stable as $$
  select role from profiles where id = auth.uid()
$$;

-- ── Enable RLS on all tables ─────────────────────────────────
alter table facilities          enable row level security;
alter table profiles            enable row level security;
alter table rooms               enable row level security;
alter table guest_stays         enable row level security;
alter table room_turnovers      enable row level security;
alter table cleaning_tasks      enable row level security;
alter table maintenance_requests enable row level security;
alter table work_orders         enable row level security;
alter table inspections         enable row level security;

-- ── facilities ───────────────────────────────────────────────
-- Any authenticated user can see their own facility
create policy "facility_select" on facilities
  for select using (id = my_facility_id());

-- Only managers can update facility settings
create policy "facility_update" on facilities
  for update using (id = my_facility_id() and my_role() = 'MANAGER');

-- Public: allow unauthenticated listing of facility names (for login screen)
create policy "facility_public_list" on facilities
  for select using (is_active = true);

-- ── profiles ─────────────────────────────────────────────────
create policy "profiles_select" on profiles
  for select using (facility_id = my_facility_id());

create policy "profiles_insert" on profiles
  for insert with check (
    facility_id = my_facility_id() and my_role() = 'MANAGER'
  );

create policy "profiles_update" on profiles
  for update using (
    facility_id = my_facility_id() and (
      my_role() = 'MANAGER' or id = auth.uid()
    )
  );

-- ── rooms ────────────────────────────────────────────────────
create policy "rooms_select" on rooms
  for select using (facility_id = my_facility_id());

create policy "rooms_insert" on rooms
  for insert with check (
    facility_id = my_facility_id() and
    my_role() in ('MANAGER', 'SUPERVISOR')
  );

-- MAINTENANCE role needs to update rooms (e.g. set status to MAINTENANCE when blocking)
create policy "rooms_update" on rooms
  for update using (
    facility_id = my_facility_id() and
    my_role() in ('MANAGER', 'SUPERVISOR', 'RECEPTION', 'MAINTENANCE')
  );

-- ── guest_stays ──────────────────────────────────────────────
create policy "stays_select" on guest_stays
  for select using (facility_id = my_facility_id());

create policy "stays_insert" on guest_stays
  for insert with check (
    facility_id = my_facility_id() and
    my_role() in ('MANAGER', 'SUPERVISOR', 'RECEPTION')
  );

create policy "stays_update" on guest_stays
  for update using (
    facility_id = my_facility_id() and
    my_role() in ('MANAGER', 'SUPERVISOR', 'RECEPTION')
  );

-- ── room_turnovers ───────────────────────────────────────────
create policy "turnovers_select" on room_turnovers
  for select using (facility_id = my_facility_id());

create policy "turnovers_insert" on room_turnovers
  for insert with check (
    facility_id = my_facility_id() and
    my_role() in ('MANAGER', 'SUPERVISOR', 'RECEPTION')
  );

create policy "turnovers_update" on room_turnovers
  for update using (
    facility_id = my_facility_id() and
    my_role() in ('MANAGER', 'SUPERVISOR')
  );

-- ── cleaning_tasks ───────────────────────────────────────────
-- MAINTENANCE role also needs to see tasks (e.g. for coordination)
create policy "tasks_select" on cleaning_tasks
  for select using (
    facility_id = my_facility_id() and (
      my_role() in ('MANAGER', 'SUPERVISOR', 'RECEPTION', 'MAINTENANCE') or
      assigned_to = auth.uid()
    )
  );

create policy "tasks_insert" on cleaning_tasks
  for insert with check (
    facility_id = my_facility_id() and
    my_role() in ('MANAGER', 'SUPERVISOR')
  );

create policy "tasks_update" on cleaning_tasks
  for update using (
    facility_id = my_facility_id() and (
      my_role() in ('MANAGER', 'SUPERVISOR') or
      (my_role() = 'HOUSEKEEPER' and assigned_to = auth.uid())
    )
  );

-- ── maintenance_requests ─────────────────────────────────────
create policy "maint_req_select" on maintenance_requests
  for select using (facility_id = my_facility_id());

-- All roles can report maintenance issues (including RECEPTION)
create policy "maint_req_insert" on maintenance_requests
  for insert with check (
    facility_id = my_facility_id() and
    my_role() in ('MANAGER', 'SUPERVISOR', 'HOUSEKEEPER', 'MAINTENANCE', 'RECEPTION')
  );

create policy "maint_req_update" on maintenance_requests
  for update using (
    facility_id = my_facility_id() and
    my_role() in ('MANAGER', 'SUPERVISOR', 'MAINTENANCE')
  );

-- ── work_orders ──────────────────────────────────────────────
create policy "wo_select" on work_orders
  for select using (
    facility_id = my_facility_id() and (
      my_role() in ('MANAGER', 'SUPERVISOR') or
      assigned_to = auth.uid()
    )
  );

create policy "wo_insert" on work_orders
  for insert with check (
    facility_id = my_facility_id() and
    my_role() in ('MANAGER', 'SUPERVISOR')
  );

create policy "wo_update" on work_orders
  for update using (
    facility_id = my_facility_id() and (
      my_role() in ('MANAGER', 'SUPERVISOR') or
      (my_role() = 'MAINTENANCE' and assigned_to = auth.uid())
    )
  );

-- ── inspections ──────────────────────────────────────────────
create policy "insp_select" on inspections
  for select using (facility_id = my_facility_id());

create policy "insp_insert" on inspections
  for insert with check (
    facility_id = my_facility_id() and
    my_role() in ('MANAGER', 'SUPERVISOR')
  );

create policy "insp_update" on inspections
  for update using (
    facility_id = my_facility_id() and
    my_role() in ('MANAGER', 'SUPERVISOR')
  );
