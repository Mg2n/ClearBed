"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, RoleName } from "@/types/database";
import clsx from "clsx";

const ROLES: RoleName[] = ["MANAGER", "SUPERVISOR", "HOUSEKEEPER", "MAINTENANCE", "RECEPTION"];
const ROLE_COLORS: Record<RoleName, string> = {
  MANAGER:     "bg-purple-100 text-purple-800",
  SUPERVISOR:  "bg-blue-100 text-blue-800",
  HOUSEKEEPER: "bg-green-100 text-green-800",
  MAINTENANCE: "bg-orange-100 text-orange-800",
  RECEPTION:   "bg-pink-100 text-pink-800",
};

export default function UsersClient({ users: initial, currentProfile }: {
  users: Profile[];
  currentProfile: Profile;
}) {
  const supabase = createClient();
  const [users, setUsers] = useState(initial);

  async function toggleActive(id: string, is_active: boolean) {
    const { data } = await supabase.from("profiles").update({ is_active }).eq("id", id).select().single();
    if (data) setUsers(prev => prev.map(u => u.id === id ? data : u));
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">{users.length} staff members</p>
      </div>

      <div className="card divide-y divide-gray-100">
        {users.map(u => (
          <div key={u.id} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold flex-shrink-0">
                {(u.full_name ?? u.username).charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{u.full_name}</span>
                  {!u.is_active && <span className="badge bg-red-100 text-red-700">Inactive</span>}
                </div>
                <div className="text-sm text-gray-500">@{u.username}</div>
                <div className="text-xs text-gray-400">
                  Last login: {u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`badge ${ROLE_COLORS[u.role]}`}>{u.role}</span>
              {u.id !== currentProfile.id && (
                <button
                  onClick={() => toggleActive(u.id, !u.is_active)}
                  className={clsx("text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors",
                    u.is_active
                      ? "border-red-200 text-red-600 hover:bg-red-50"
                      : "border-green-200 text-green-600 hover:bg-green-50"
                  )}
                >
                  {u.is_active ? "Deactivate" : "Activate"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
