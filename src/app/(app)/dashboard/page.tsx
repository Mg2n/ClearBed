import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthProfile } from "@/lib/auth";

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE:    "bg-green-100 text-green-800",
  OCCUPIED:     "bg-blue-100 text-blue-800",
  DIRTY:        "bg-yellow-100 text-yellow-800",
  CLEANING:     "bg-purple-100 text-purple-800",
  MAINTENANCE:  "bg-red-100 text-red-800",
  OUT_OF_ORDER: "bg-gray-100 text-gray-800",
};

const STATUS_BAR_COLORS: Record<string, string> = {
  AVAILABLE:    "bg-green-500",
  OCCUPIED:     "bg-blue-500",
  DIRTY:        "bg-yellow-400",
  CLEANING:     "bg-purple-500",
  MAINTENANCE:  "bg-red-500",
  OUT_OF_ORDER: "bg-gray-400",
};

export default async function DashboardPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  const fid = profile.facility_id;
  const supabase = await createClient();

  // ── RECEPTION: only available rooms ──────────────────────────
  if (profile.role === "RECEPTION") {
    const { data: availableRooms } = await supabase
      .from("rooms")
      .select("id, room_number, floor, room_type")
      .eq("facility_id", fid)
      .eq("is_active", true)
      .eq("status", "AVAILABLE")
      .order("room_number");

    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Available Rooms</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {availableRooms?.length ?? 0} rooms available · Good day,{" "}
            {profile.full_name ?? profile.username}
          </p>
        </div>
        {(availableRooms ?? []).length === 0 ? (
          <div className="card py-16 text-center text-gray-400">No available rooms at this time</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {(availableRooms ?? []).map((room: any) => (
              <div key={room.id} className="card p-4 border-l-4 border-green-500">
                <div className="text-lg font-bold text-gray-900">Room {room.room_number}</div>
                <div className="text-xs text-gray-500 mt-0.5">Floor {room.floor}</div>
                <div className="text-xs text-gray-500">{room.room_type}</div>
                <div className="mt-2">
                  <span className="badge bg-green-100 text-green-800 text-xs">Available</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── HOUSEKEEPER: their active tasks ──────────────────────────
  if (profile.role === "HOUSEKEEPER") {
    const { data: myTasks } = await supabase
      .from("cleaning_tasks")
      .select("id, status, priority, task_type, rooms(room_number), created_at")
      .eq("facility_id", fid)
      .eq("assigned_to", profile.id)
      .in("status", ["ASSIGNED", "IN_PROGRESS"])
      .order("priority");

    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Good day, {profile.full_name ?? profile.username}
          </p>
        </div>
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Active Tasks Assigned to You</h2>
            <span className="badge bg-blue-100 text-blue-800">{myTasks?.length ?? 0}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {(myTasks ?? []).length === 0 && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No active tasks assigned to you</div>
            )}
            {(myTasks ?? []).map((t: any) => (
              <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800">Room {t.rooms?.room_number}</div>
                  <div className="text-xs text-gray-500">
                    Priority {t.priority} · {t.task_type.replace("_", " ")}
                  </div>
                </div>
                <span className={`badge ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-700"}`}>
                  {t.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── MAINTENANCE: open requests ────────────────────────────────
  if (profile.role === "MAINTENANCE") {
    const { data: myRequests } = await supabase
      .from("maintenance_requests")
      .select("id, title, priority, status, rooms(room_number), created_at")
      .eq("facility_id", fid)
      .in("status", ["OPEN", "IN_PROGRESS"])
      .order("created_at", { ascending: false })
      .limit(20);

    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Requests</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Good day, {profile.full_name ?? profile.username}
          </p>
        </div>
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Open Requests</h2>
            <span className="badge bg-red-100 text-red-800">{myRequests?.length ?? 0}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {(myRequests ?? []).length === 0 && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No open requests</div>
            )}
            {(myRequests ?? []).map((r: any) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800">{r.title}</div>
                  <div className="text-xs text-gray-500">Room {r.rooms?.room_number}</div>
                </div>
                <span
                  className={`badge ${
                    r.priority === "URGENT"
                      ? "bg-red-100 text-red-800"
                      : r.priority === "HIGH"
                      ? "bg-orange-100 text-orange-800"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {r.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── MANAGER / SUPERVISOR: full dashboard (no INSPECTING) ─────
  const [{ data: rooms }, { data: pendingTasks }, { data: openRequests }] = await Promise.all([
    supabase.from("rooms").select("status").eq("facility_id", fid).eq("is_active", true),
    supabase
      .from("cleaning_tasks")
      .select("id, status, priority, rooms(room_number), created_at")
      .eq("facility_id", fid)
      .in("status", ["PENDING", "ASSIGNED", "IN_PROGRESS"])
      .order("priority")
      .limit(10),
    supabase
      .from("maintenance_requests")
      .select("id, title, priority, status, rooms(room_number), created_at")
      .eq("facility_id", fid)
      .in("status", ["OPEN", "IN_PROGRESS"])
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const statusCounts = (rooms ?? []).reduce((acc: Record<string, number>, r: any) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalRooms  = rooms?.length ?? 0;
  const available   = statusCounts["AVAILABLE"]  ?? 0;
  const dirty       = statusCounts["DIRTY"]       ?? 0;
  const cleaning    = statusCounts["CLEANING"]    ?? 0;
  const maintenance = statusCounts["MAINTENANCE"] ?? 0;
  const occupied    = statusCounts["OCCUPIED"]    ?? 0;

  // Remove INSPECTING from the status display (change #3)
  const displayStatusCounts = Object.fromEntries(
    Object.entries(statusCounts).filter(([s]) => s !== "INSPECTING")
  );

  const kpis = [
    { label: "Total Rooms",         value: totalRooms,   color: "bg-blue-600",   icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
    { label: "Available",           value: available,    color: "bg-green-500",  icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Occupied",            value: occupied,     color: "bg-blue-500",   icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { label: "Dirty / Needs Clean", value: dirty,        color: "bg-yellow-500", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
    { label: "Being Cleaned",       value: cleaning,     color: "bg-purple-500", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { label: "Maintenance",         value: maintenance,  color: "bg-red-500",    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Good day, {profile.full_name ?? profile.username}
        </p>
      </div>

      {/* KPI Grid — no Inspecting */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="card p-4">
            <div className={`w-9 h-9 ${k.color} rounded-lg flex items-center justify-center mb-3`}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={k.icon} />
              </svg>
            </div>
            <div className="text-2xl font-bold text-gray-900">{k.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Cleaning Tasks */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Active Cleaning Tasks</h2>
            <span className="badge bg-yellow-100 text-yellow-800">{pendingTasks?.length ?? 0}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingTasks?.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No active tasks</div>
            )}
            {pendingTasks?.map((t: any) => (
              <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800">Room {t.rooms?.room_number}</div>
                  <div className="text-xs text-gray-500">Priority {t.priority}</div>
                </div>
                <span className={`badge ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-700"}`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Open Maintenance Requests */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Open Maintenance Requests</h2>
            <span className="badge bg-red-100 text-red-800">{openRequests?.length ?? 0}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {openRequests?.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No open requests</div>
            )}
            {openRequests?.map((r: any) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800">{r.title}</div>
                  <div className="text-xs text-gray-500">Room {r.rooms?.room_number}</div>
                </div>
                <span
                  className={`badge ${
                    r.priority === "URGENT"
                      ? "bg-red-100 text-red-800"
                      : r.priority === "HIGH"
                      ? "bg-orange-100 text-orange-800"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {r.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Room Status Overview — no Inspecting */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Room Status Overview</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(displayStatusCounts).map(([status, count]) => (
            <div key={status} className="flex items-center gap-2">
              <span className={`badge ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700"}`}>
                {status}: {String(count)}
              </span>
            </div>
          ))}
        </div>
        {totalRooms > 0 && (
          <div className="mt-4 h-3 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
            {Object.entries(displayStatusCounts).map(([status, count]) => {
              const pct = ((count as number) / totalRooms) * 100;
              return (
                <div
                  key={status}
                  className={`${STATUS_BAR_COLORS[status] ?? "bg-gray-400"} rounded-full`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
