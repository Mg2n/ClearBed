import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthProfile } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // getAuthProfile is cached — layout + page share the same fetch within one render
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");

  // Fetch facility name separately (layout-only concern)
  const supabase = await createClient();
  const { data: facility } = await supabase
    .from("facilities")
    .select("name")
    .eq("id", profile.facility_id)
    .single();

  return (
    <div className="flex min-h-screen">
      <Sidebar username={profile.full_name ?? profile.username} role={profile.role} facilityName={facility?.name ?? ""} />
      <main className="flex-1 overflow-auto ml-64">
        {children}
      </main>
    </div>
  );
}
