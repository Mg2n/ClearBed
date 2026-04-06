/**
 * ClearBed Seed Script
 * Creates demo Supabase Auth users + profile rows for the Grand Plaza Hotel.
 *
 * Usage:
 *   npx ts-node --esm scripts/seed.ts
 * Or with tsx:
 *   npx tsx scripts/seed.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL        = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY!
const FACILITY_ID         = 'a1000000-0000-0000-0000-000000000001'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const USERS = [
  { username: 'hotel_manager',    fullName: 'Alex Morgan',    role: 'MANAGER',     email: 'hotel_manager@clearbed.demo',    password: 'Manager@123' },
  { username: 'hotel_supervisor', fullName: 'Jordan Lee',     role: 'SUPERVISOR',  email: 'hotel_supervisor@clearbed.demo', password: 'Supervisor@123' },
  { username: 'housekeeper1',     fullName: 'Sam Rivera',     role: 'HOUSEKEEPER', email: 'housekeeper1@clearbed.demo',     password: 'Housekeeper@123' },
  { username: 'housekeeper2',     fullName: 'Casey Kim',      role: 'HOUSEKEEPER', email: 'housekeeper2@clearbed.demo',     password: 'Housekeeper@123' },
  { username: 'hotel_maintenance',fullName: 'Chris Patel',    role: 'MAINTENANCE', email: 'hotel_maintenance@clearbed.demo',password: 'Maintenance@123' },
  { username: 'hotel_reception',  fullName: 'Taylor Brooks',  role: 'RECEPTION',   email: 'hotel_reception@clearbed.demo',  password: 'Reception@123' },
]

async function seed() {
  console.log('🌱 Seeding ClearBed demo data...\n')

  // Upsert facility (should already exist from 03_seed.sql)
  await supabase.from('facilities').upsert({
    id: FACILITY_ID,
    name: 'Grand Plaza Hotel',
    type: 'HOTEL',
    address: '1 Grand Plaza Boulevard, Downtown',
    require_inspection: true,
  }, { onConflict: 'id' })

  for (const u of USERS) {
    console.log(`Creating user: ${u.username}`)

    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    })

    if (authErr && !authErr.message.includes('already')) {
      console.error(`  ✗ Auth error: ${authErr.message}`)
      continue
    }

    const userId = authData?.user?.id
    if (!userId) {
      // User might already exist — look it up
      const { data: existing } = await supabase.auth.admin.listUsers()
      const found = existing?.users?.find(x => x.email === u.email)
      if (!found) { console.error('  ✗ Could not find or create user'); continue }
      // Upsert profile
      await supabase.from('profiles').upsert({
        id: found.id, facility_id: FACILITY_ID,
        username: u.username, full_name: u.fullName, role: u.role,
      }, { onConflict: 'id' })
      console.log(`  ✓ Profile upserted (existing user)`)
      continue
    }

    // Insert profile
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: userId, facility_id: FACILITY_ID,
      username: u.username, full_name: u.fullName, role: u.role,
    }, { onConflict: 'id' })

    if (profileErr) console.error(`  ✗ Profile error: ${profileErr.message}`)
    else console.log(`  ✓ Created (${u.role})`)
  }

  console.log('\n✅ Seed complete!')
  console.log('\nDemo credentials:')
  USERS.forEach(u => console.log(`  ${u.email.padEnd(40)} ${u.password}`))
}

seed().catch(console.error)
