# ClearBed — Hotel Operations Platform

Next.js 14 + Supabase frontend/backend for hotel housekeeping and room operations.

---

## Quick Start

### 1. Run the SQL schema in Supabase

Go to your Supabase project → **SQL Editor** and run these files **in order**:

```
sql/01_schema.sql   ← creates all tables, enums, triggers, indexes
sql/02_rls.sql      ← Row Level Security policies
sql/03_seed.sql     ← demo facility + 20 rooms
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

`.env.local` is already populated with your project credentials.
Never commit this file — it contains your service role key.

### 4. Seed demo users

```bash
npx tsx scripts/seed.ts
```

This creates 6 Supabase Auth users with profile rows for the Grand Plaza Hotel demo facility.

### 5. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000

---

## Demo Credentials

| Username            | Email                               | Password        | Role         |
|---------------------|-------------------------------------|-----------------|--------------|
| hotel_manager       | hotel_manager@clearbed.demo         | Manager@123     | Manager      |
| hotel_supervisor    | hotel_supervisor@clearbed.demo      | Supervisor@123  | Supervisor   |
| housekeeper1        | housekeeper1@clearbed.demo          | Housekeeper@123 | Room Attendant|
| housekeeper2        | housekeeper2@clearbed.demo          | Housekeeper@123 | Room Attendant|
| hotel_maintenance   | hotel_maintenance@clearbed.demo     | Maintenance@123 | Maintenance  |
| hotel_reception     | hotel_reception@clearbed.demo       | Reception@123   | Reception    |

---

## Pages

| Route           | Description                                    | Min Role     |
|-----------------|------------------------------------------------|--------------|
| /dashboard      | KPI cards + room status map                    | All          |
| /rooms          | Room list with status filter + update          | All          |
| /housekeeping   | Cleaning tasks — assign, start, complete       | All          |
| /maintenance    | Requests + work orders                         | All          |
| /turnovers      | Room turnover lifecycle                        | All          |
| /inspections    | Quality inspections with checklist             | Supervisor+  |
| /users          | Team member management                         | Manager only |

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add these environment variables in Vercel → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Architecture

```
src/
├── app/                   Next.js 14 App Router pages
│   ├── login/             Login page (Supabase Auth)
│   ├── dashboard/         KPIs + room map
│   ├── rooms/             Room management
│   ├── housekeeping/      Cleaning task management
│   ├── maintenance/       Maintenance requests + work orders
│   ├── turnovers/         Room turnover workflow
│   ├── inspections/       Quality inspections
│   └── users/             User management (Manager only)
├── components/
│   └── layout/
│       ├── Sidebar.tsx    Navigation sidebar
│       └── AppShell.tsx   Auth-gated layout wrapper
├── hooks/
│   └── useAuth.ts         Supabase auth + profile hook
├── lib/
│   ├── supabase/
│   │   ├── client.ts      Browser client
│   │   ├── server.ts      Server component client
│   │   ├── admin.ts       Service role client (server-only)
│   │   └── middleware.ts  Session refresh middleware
│   └── utils.ts           Status colours, helpers, role checks
├── middleware.ts           Auth redirect middleware
└── types/index.ts          TypeScript types (matches DB schema)

sql/
├── 01_schema.sql          All tables, enums, triggers, indexes
├── 02_rls.sql             Row Level Security policies
└── 03_seed.sql            Demo facility + rooms

scripts/
└── seed.ts                Creates Supabase Auth users + profiles
```

---

## Adding Users

Since this is a closed system, new users are added by a Manager via the Supabase Dashboard:

1. Go to **Authentication → Users → Invite user**
2. Enter their email and send invite
3. In the **Table Editor**, find the newly created row in `profiles` and set:
   - `facility_id` = your facility's UUID
   - `role` = one of `MANAGER | SUPERVISOR | HOUSEKEEPER | MAINTENANCE | RECEPTION`
   - `username` = their display name

Or use the `scripts/seed.ts` pattern to script user creation with the service role key.
