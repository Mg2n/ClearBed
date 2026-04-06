import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthProfile } from "@/lib/auth";
import RoomsClient from "./RoomsClient";

export default async function RoomsPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [{ data: rooms }, { data: housekeepers }] = await Promise.all([
    supabase
      .from("rooms")
      .select("*")
      .eq("facility_id", profile.facility_id)
      .eq("is_active", true)
      .order("room_number"),
    supabase
      .from("profiles")
      .select("id, full_name, username")
      .eq("facility_id", profile.facility_id)
      .eq("role", "HOUSEKEEPER")
      .eq("is_active", true),
  ]);

  return <RoomsClient rooms={rooms ?? []} housekeepers={housekeepers ?? []} profile={profile} />;
}
