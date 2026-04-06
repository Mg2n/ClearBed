import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthProfile } from "@/lib/auth";
import HousekeepingClient from "./HousekeepingClient";

export default async function HousekeepingPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  const fid = profile.facility_id;

  const supabase = await createClient();

  const [{ data: tasks }, { data: housekeepers }, { data: rooms }] = await Promise.all([
    supabase
      .from("cleaning_tasks")
      // assigned_to is a FK to profiles — alias the join to avoid ambiguity with assigned_by
      .select("*, rooms(room_number, floor, room_type), assignee:profiles!assigned_to(full_name, username)")
      .eq("facility_id", fid)
      .order("priority")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, username")
      .eq("facility_id", fid)
      .eq("role", "HOUSEKEEPER")
      .eq("is_active", true),
    supabase
      .from("rooms")
      .select("id, room_number, floor, status")
      .eq("facility_id", fid)
      .eq("is_active", true)
      .order("room_number"),
  ]);

  return (
    <HousekeepingClient
      tasks={tasks ?? []}
      housekeepers={housekeepers ?? []}
      rooms={rooms ?? []}
      profile={profile}
    />
  );
}
