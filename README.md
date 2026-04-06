# ClearBed 🛏️

> Hotel room operations management — built for speed, clarity, and control.

ClearBed is a full-stack hotel operations platform that automates housekeeping, maintenance, and room turnover workflows across multiple facilities. Built with **Next.js 14** and **Supabase**, it gives hotel teams a real-time dashboard to manage everything from cleaning tasks to quality inspections — all in one place.

---

## Features

- 🏨 **Multi-facility architecture** — isolated data per facility with role-based access
- 🧹 **Housekeeping management** — assign, start, and complete cleaning tasks in real time
- 🔧 **Maintenance tracking** — log requests, create work orders, track resolution
- 🔄 **Room turnover lifecycle** — manage the full checkout-to-ready workflow
- ✅ **Quality inspections** — supervisor-led checklists with pass/fail tracking
- 📊 **Live dashboard** — KPI cards and room status map updated in real time
- 👥 **Team management** — role-based permissions (Manager, Supervisor, Housekeeper, Maintenance, Reception)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, Row Level Security) |
| Deployment | Vercel |

---

## Getting Started

### 1. Set up the database

Go to your Supabase project → **SQL Editor** and run these files in order:

```bash
sql/01_schema.sql   # tables, enums, triggers, indexes
sql/02_rls.sql      # Row Level Security policies
sql/03_seed.sql     # demo facility + 20 rooms
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create a `.env.local` file based on `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Seed demo users

```bash
npx tsx scripts/seed.ts
```

Creates 6 demo users with different roles for the Grand Plaza Hotel facility.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Manager | hotel_manager@clearbed.demo | Manager@123 |
| Supervisor | hotel_supervisor@clearbed.demo | Supervisor@123 |
| Housekeeper | housekeeper1@clearbed.demo | Housekeeper@123 |
| Maintenance | hotel_maintenance@clearbed.demo | Maintenance@123 |
| Reception | hotel_reception@clearbed.demo | Reception@123 |

---

## Pages

| Route | Description | Access |
|---|---|---|
| `/dashboard` | KPI cards + live room status map | All roles |
| `/rooms` | Room list with status filter and updates | All roles |
| `/housekeeping` | Cleaning task assignment and tracking | All roles |
| `/maintenance` | Maintenance requests and work orders | All roles |
| `/turnovers` | Room turnover lifecycle management | All roles |
| `/inspections` | Quality inspections with checklists | Supervisor+ |
| `/users` | Team member management | Manager only |

---

## Project Structure

```
src/
├── app/                    Next.js 14 App Router
│   ├── login/              Authentication page
│   ├── dashboard/          KPIs + room map
│   ├── housekeeping/       Cleaning task management
│   ├── maintenance/        Maintenance requests
│   ├── turnovers/          Turnover workflow
│   ├── inspections/        Quality inspections
│   └── users/              User management
├── components/layout/      Sidebar + AppShell
├── hooks/useAuth.ts        Supabase auth hook
├── lib/supabase/           Browser, server, and admin clients
├── middleware.ts           Auth redirect middleware
└── types/                  TypeScript types matching DB schema

sql/
├── 01_schema.sql           Tables, enums, triggers
├── 02_rls.sql              Row Level Security
└── 03_seed.sql             Demo data

scripts/
└── seed.ts                 Auth user seeding script
```

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add these in Vercel → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Security

- All database access is protected by **Row Level Security (RLS)** policies
- Facility-scoped helpers (`my_facility_id()`, `my_role()`) prevent cross-facility data access
- Service role key is server-only and never exposed to the client
- `.env.local` is gitignored — never commit real credentials

---

Built by [Nawaf Alghamdi](https://github.com/Mg2n)
