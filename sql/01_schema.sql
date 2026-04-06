-- ============================================================
-- ClearBed — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Enums ────────────────────────────────────────────────────
create type facility_type     as enum ('HOTEL', 'HOSPITAL');
create type user_role         as enum ('MANAGER', 'SUPERVISOR', 'HOUSEKEEPER', 'MAINTENANCE', 'RECEPTION');
create type room_status       as enum ('AVAILABLE', 'OCCUPIED', 'DIRTY', 'CLEANING', 'INSPECTING', 'MAINTENANCE', 'OUT_OF_ORDER');
create type room_type         as enum ('STANDARD', 'DELUXE', 'SUITE', 'PRESIDENTIAL', 'ACCESSIBLE');
create type task_type         as enum ('STANDARD', 'DEEP_CLEAN', 'TURNOVER', 'INSPECTION_RECLEAN');
create type task_status       as enum ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
create type priority_level    as enum ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
create type maintenance_status as enum ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
create type workorder_status  as enum ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
create type turnover_status   as enum ('INITIATED', 'CLEANING', 'AWAITING_INSPECTION', 'COMPLETED', 'FLAGGED_MAINTENANCE');
create type inspection_result as enum ('PASS', 'FAIL', 'CONDITIONAL');

-- ── Facilities ───────────────────────────────────────────────
create table facilities (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  type                facility_type not null default 'HOTEL',
  address             text,
  contact_email       text,
  contact_phone       text,
  require_inspection  boolean not null default true,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── User Profiles (extends Supabase Auth) ────────────────────
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  facility_id   uuid not null references facilities(id) on delete cascade,
  username      text not null,
  full_name     text,
  role          user_role not null default 'HOUSEKEEPER',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(facility_id, username)
);

-- ── Rooms ────────────────────────────────────────────────────
create table rooms (
  id            uuid primary key default uuid_generate_v4(),
  facility_id   uuid not null references facilities(id) on delete cascade,
  room_number   text not null,
  floor         int not null default 1,
  room_type     room_type not null default 'STANDARD',
  status        room_status not null default 'AVAILABLE',
  is_active     boolean not null default true,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(facility_id, room_number)
);

-- ── Guest Stays ──────────────────────────────────────────────
create table guest_stays (
  id              uuid primary key default uuid_generate_v4(),
  facility_id     uuid not null references facilities(id) on delete cascade,
  room_id         uuid not null references rooms(id) on delete cascade,
  guest_name      text not null,
  guest_count     int not null default 1,
  check_in        timestamptz not null,
  check_out       timestamptz,
  is_checked_out  boolean not null default false,
  notes           text,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Room Turnovers ───────────────────────────────────────────
create table room_turnovers (
  id              uuid primary key default uuid_generate_v4(),
  facility_id     uuid not null references facilities(id) on delete cascade,
  room_id         uuid not null references rooms(id) on delete cascade,
  guest_stay_id   uuid references guest_stays(id),
  status          turnover_status not null default 'INITIATED',
  initiated_at    timestamptz not null default now(),
  completed_at    timestamptz,
  initiated_by    uuid references profiles(id),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Cleaning Tasks ───────────────────────────────────────────
create table cleaning_tasks (
  id              uuid primary key default uuid_generate_v4(),
  facility_id     uuid not null references facilities(id) on delete cascade,
  room_id         uuid not null references rooms(id) on delete cascade,
  turnover_id     uuid references room_turnovers(id),
  task_type       task_type not null default 'STANDARD',
  status          task_status not null default 'PENDING',
  priority        int not null default 5 check (priority between 1 and 10),
  assigned_to     uuid references profiles(id),
  assigned_by     uuid references profiles(id),
  started_at      timestamptz,
  completed_at    timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Maintenance Requests ─────────────────────────────────────
create table maintenance_requests (
  id              uuid primary key default uuid_generate_v4(),
  facility_id     uuid not null references facilities(id) on delete cascade,
  room_id         uuid not null references rooms(id) on delete cascade,
  reported_by     uuid references profiles(id),
  title           text not null,
  description     text,
  priority        priority_level not null default 'MEDIUM',
  status          maintenance_status not null default 'OPEN',
  blocks_room     boolean not null default false,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Work Orders ──────────────────────────────────────────────
create table work_orders (
  id              uuid primary key default uuid_generate_v4(),
  facility_id     uuid not null references facilities(id) on delete cascade,
  request_id      uuid not null references maintenance_requests(id) on delete cascade,
  assigned_to     uuid references profiles(id),
  assigned_by     uuid references profiles(id),
  status          workorder_status not null default 'PENDING',
  description     text,
  started_at      timestamptz,
  completed_at    timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Inspections ──────────────────────────────────────────────
create table inspections (
  id              uuid primary key default uuid_generate_v4(),
  facility_id     uuid not null references facilities(id) on delete cascade,
  room_id         uuid not null references rooms(id) on delete cascade,
  turnover_id     uuid references room_turnovers(id),
  inspected_by    uuid references profiles(id),
  result          inspection_result,
  score           int check (score between 0 and 100),
  checklist       jsonb not null default '{}',
  notes           text,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── updated_at triggers ──────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_facilities_updated       before update on facilities        for each row execute function update_updated_at();
create trigger trg_profiles_updated         before update on profiles          for each row execute function update_updated_at();
create trigger trg_rooms_updated            before update on rooms             for each row execute function update_updated_at();
create trigger trg_guest_stays_updated      before update on guest_stays       for each row execute function update_updated_at();
create trigger trg_room_turnovers_updated   before update on room_turnovers    for each row execute function update_updated_at();
create trigger trg_cleaning_tasks_updated   before update on cleaning_tasks    for each row execute function update_updated_at();
create trigger trg_maintenance_updated      before update on maintenance_requests for each row execute function update_updated_at();
create trigger trg_work_orders_updated      before update on work_orders       for each row execute function update_updated_at();
create trigger trg_inspections_updated      before update on inspections       for each row execute function update_updated_at();

-- ── Indexes ──────────────────────────────────────────────────
create index idx_profiles_facility       on profiles(facility_id);
create index idx_rooms_facility          on rooms(facility_id);
create index idx_rooms_status            on rooms(facility_id, status);
create index idx_cleaning_tasks_facility on cleaning_tasks(facility_id);
create index idx_cleaning_tasks_assigned on cleaning_tasks(assigned_to);
create index idx_maintenance_facility    on maintenance_requests(facility_id);
create index idx_work_orders_facility    on work_orders(facility_id);
create index idx_inspections_facility    on inspections(facility_id);
create index idx_turnovers_facility      on room_turnovers(facility_id);
create index idx_turnovers_room          on room_turnovers(room_id);
