-- ============================================================
-- ClearBed — Seed Data (Demo Hotel)
-- Run AFTER 01_schema.sql and 02_rls.sql
-- Uses service_role — paste into SQL Editor
-- ============================================================

-- NOTE: Supabase Auth users must be created via the Auth API or Dashboard.
-- This script seeds the facility, rooms, and profile rows.
-- Use the seed script (scripts/seed.ts) to create auth users automatically.

-- ── Facility ─────────────────────────────────────────────────
insert into facilities (id, name, type, address, require_inspection)
values (
  'a1000000-0000-0000-0000-000000000001',
  'Grand Plaza Hotel',
  'HOTEL',
  '1 Grand Plaza Boulevard, Downtown',
  true
);

-- ── Rooms (floors 1-5, 4 rooms per floor = 20 rooms) ─────────
insert into rooms (facility_id, room_number, floor, room_type, status) values
  ('a1000000-0000-0000-0000-000000000001', '101', 1, 'STANDARD',  'AVAILABLE'),
  ('a1000000-0000-0000-0000-000000000001', '102', 1, 'STANDARD',  'DIRTY'),
  ('a1000000-0000-0000-0000-000000000001', '103', 1, 'DELUXE',    'OCCUPIED'),
  ('a1000000-0000-0000-0000-000000000001', '104', 1, 'ACCESSIBLE','AVAILABLE'),
  ('a1000000-0000-0000-0000-000000000001', '201', 2, 'STANDARD',  'AVAILABLE'),
  ('a1000000-0000-0000-0000-000000000001', '202', 2, 'STANDARD',  'CLEANING'),
  ('a1000000-0000-0000-0000-000000000001', '203', 2, 'DELUXE',    'AVAILABLE'),
  ('a1000000-0000-0000-0000-000000000001', '204', 2, 'DELUXE',    'DIRTY'),
  ('a1000000-0000-0000-0000-000000000001', '301', 3, 'STANDARD',  'OCCUPIED'),
  ('a1000000-0000-0000-0000-000000000001', '302', 3, 'STANDARD',  'OCCUPIED'),
  ('a1000000-0000-0000-0000-000000000001', '303', 3, 'SUITE',     'AVAILABLE'),
  ('a1000000-0000-0000-0000-000000000001', '304', 3, 'SUITE',     'INSPECTING'),
  ('a1000000-0000-0000-0000-000000000001', '401', 4, 'DELUXE',    'AVAILABLE'),
  ('a1000000-0000-0000-0000-000000000001', '402', 4, 'DELUXE',    'MAINTENANCE'),
  ('a1000000-0000-0000-0000-000000000001', '403', 4, 'SUITE',     'AVAILABLE'),
  ('a1000000-0000-0000-0000-000000000001', '404', 4, 'SUITE',     'DIRTY'),
  ('a1000000-0000-0000-0000-000000000001', '501', 5, 'PRESIDENTIAL','AVAILABLE'),
  ('a1000000-0000-0000-0000-000000000001', '502', 5, 'SUITE',     'OCCUPIED'),
  ('a1000000-0000-0000-0000-000000000001', '503', 5, 'SUITE',     'AVAILABLE'),
  ('a1000000-0000-0000-0000-000000000001', '504', 5, 'SUITE','OUT_OF_ORDER');

-- Profile rows are inserted by scripts/seed.ts after auth users are created.
-- See README for setup instructions.
