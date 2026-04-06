import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthProfile } from "@/lib/auth";
import TurnoversClient from "./TurnoversClient";

export default async function TurnoversPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  const fid = profile.facility_id;

  const supabase = await createClient();

  const [{ data: turnovers }, { data: rooms }] = await Promise.all([
    supabase
      .from("room_turnovers")
      .select(
        // initiated_by is the FK column → alias the join so result field is named "initiator"
        "*, rooms(room_number, floor, room_type), initiator:profiles!initiated_by(full_name), guest_stays(guest_name, check_out)"
      )
      .eq("facility_id", fid)
      .order("created_at", { ascending: false }),
    supabase
      .from("rooms")
      .select("id, room_number, status")
      .eq("facility_id", fid)
      .in("status", ["OCCUPIED", "DIRTY"])
      .order("room_number"),
  ]);

  return <TurnoversClient turnovers={turnovers ?? []} rooms={rooms ?? []} profile={profile} />;
}
