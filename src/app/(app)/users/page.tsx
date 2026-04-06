import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthProfile } from "@/lib/auth";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "MANAGER") redirect("/dashboard");

  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .eq("facility_id", profile.facility_id)
    .order("full_name");

  return <UsersClient users={users ?? []} currentProfile={profile} />;
}
