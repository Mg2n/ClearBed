import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthProfile } from "@/lib/auth";
import MaintenanceClient from "./MaintenanceClient";

export default async function MaintenancePage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  const fid = profile.facility_id;

  const supabase = await createClient();

  const [{ data: requests }, { data: maintStaff }, { data: rooms }] = await Promise.all([
    supabase
      .from("maintenance_requests")
      .select(
        // work_orders has two FKs to profiles (assigned_to, assigned_by) — pick one with alias
        "*, rooms(room_number, floor), work_orders(id, status, assigned_to:profiles!assigned_to(full_name))"
      )
      .eq("facility_id", fid)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("facility_id", fid)
      .eq("role", "MAINTENANCE")
      .eq("is_active", true),
    supabase
      .from("rooms")
      .select("id, room_number")
      .eq("facility_id", fid)
      .eq("is_active", true)
      .order("room_number"),
  ]);

  return (
    <MaintenanceClient
      requests={requests ?? []}
      maintStaff={maintStaff ?? []}
      rooms={rooms ?? []}
      profile={profile}
    />
  );
}
