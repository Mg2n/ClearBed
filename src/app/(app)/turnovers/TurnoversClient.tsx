"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile, TurnoverStatus } from "@/types/database";
import clsx from "clsx";

// Must match DB enum: INITIATED, CLEANING, AWAITING_INSPECTION, COMPLETED, FLAGGED_MAINTENANCE
const TURNOVER_STATUS: Record<TurnoverStatus, { label: string; cls: string }> = {
  INITIATED:           { label: "Initiated",           cls: "bg-gray-100 text-gray-700"    },
  CLEANING:            { label: "Cleaning",            cls: "bg-purple-100 text-purple-800"},
  AWAITING_INSPECTION: { label: "Awaiting Inspection", cls: "bg-indigo-100 text-indigo-800"},
  FLAGGED_MAINTENANCE: { label: "Maintenance",         cls: "bg-red-100 text-red-800"      },
  COMPLETED:           { label: "Completed",           cls: "bg-green-100 text-green-800"  },
};

// Map turnover status → room status to keep them in sync
const TURNOVER_TO_ROOM_STATUS: Record<TurnoverStatus, string> = {
  INITIATED:           "DIRTY",
  CLEANING:            "CLEANING",
  AWAITING_INSPECTION: "INSPECTING",
  FLAGGED_MAINTENANCE: "MAINTENANCE",
  COMPLETED:           "AVAILABLE",
};

const NEXT_STATUS: Partial<Record<TurnoverStatus, TurnoverStatus>> = {
  INITIATED:           "CLEANING",
  CLEANING:            "AWAITING_INSPECTION",
  AWAITING_INSPECTION: "COMPLETED",
};

const TURNOVER_SELECT =
  "*, rooms(room_number, floor, room_type), initiator:profiles!initiated_by(full_name), guest_stays(guest_name, check_out)";

export default function TurnoversClient({
  turnovers: initial,
  rooms,
  profile,
}: {
  turnovers: any[];
  rooms: { id: string; room_number: string; status: string }[];
  profile: Profile;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [turnovers, setTurnovers] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ room_id: "", notes: "" });

  const canCreate = ["MANAGER", "SUPERVISOR", "RECEPTION"].includes(profile.role);
  const canAdvance = ["MANAGER", "SUPERVISOR"].includes(profile.role);

  async function initiateTurnover() {
    if (!form.room_id) return;
    setCreating(true);

    const { data } = await supabase
      .from("room_turnovers")
      .insert({
        facility_id: profile.facility_id,
        room_id: form.room_id,
        initiated_by: profile.id, // correct column name (not initiated_by_id)
        notes: form.notes || null,
      })
      .select(TURNOVER_SELECT)
      .single();

    if (data) {
      // Mark room as DIRTY when turnover is initiated
      await supabase.from("rooms").update({ status: "DIRTY" }).eq("id", form.room_id);
      setTurnovers((prev) => [data, ...prev]);
      setShowCreate(false);
      setForm({ room_id: "", notes: "" });
      router.refresh();
    }
    setCreating(false);
  }

  async function advanceStatus(id: string, status: TurnoverStatus) {
    const updates: Record<string, unknown> = { status };
    if (status === "COMPLETED") updates.completed_at = new Date().toISOString();

    const { data } = await supabase
      .from("room_turnovers")
      .update(updates)
      .eq("id", id)
      .select(TURNOVER_SELECT)
      .single();

    if (data) {
      setTurnovers((prev) => prev.map((t) => (t.id === id ? data : t)));
      // Keep room status in sync with the turnover status
      await supabase
        .from("rooms")
        .update({ status: TURNOVER_TO_ROOM_STATUS[status] })
        .eq("id", data.room_id);
      router.refresh();
    }
  }

  // Change #2: turnovers with notes must be flagged to supervisor and maintenance
  const flaggedTurnovers = turnovers.filter((t) => t.notes && t.status !== "COMPLETED");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Flag banner for turnovers with notes */}
      {flaggedTurnovers.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-300 rounded-xl px-5 py-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-yellow-800">
                {flaggedTurnovers.length} turnover{flaggedTurnovers.length > 1 ? "s" : ""} with notes — Supervisor &amp; Maintenance review required
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                Rooms:{" "}
                {flaggedTurnovers.map((t) => `Room ${t.rooms?.room_number}`).join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Room Turnovers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {turnovers.filter((t) => t.status !== "COMPLETED").length} active turnovers
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Initiate Turnover
          </button>
        )}
      </div>

      <div className="space-y-3">
        {turnovers.length === 0 && (
          <div className="card py-12 text-center text-gray-400">No turnovers recorded</div>
        )}
        {turnovers.map((t: any) => (
          <div
            key={t.id}
            className={`card p-5 flex items-center justify-between gap-4 ${
              t.notes && t.status !== "COMPLETED" ? "border-l-4 border-yellow-400" : ""
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900">Room {t.rooms?.room_number}</span>
                <span className="text-xs text-gray-500">{t.rooms?.room_type}</span>
                {/* Change #2: notes flag badge */}
                {t.notes && t.status !== "COMPLETED" && (
                  <span className="badge bg-yellow-100 text-yellow-800 text-xs">
                    Notes — Review Required
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Started {new Date(t.created_at).toLocaleString()}
                {t.initiator && ` · by ${t.initiator.full_name}`}
                {t.guest_stays && ` · Guest: ${t.guest_stays.guest_name}`}
              </div>
              {t.notes && <p className="text-sm text-yellow-800 bg-yellow-50 rounded-lg px-3 py-1.5 mt-1 text-xs">{t.notes}</p>}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`badge ${TURNOVER_STATUS[t.status as TurnoverStatus]?.cls}`}>
                {TURNOVER_STATUS[t.status as TurnoverStatus]?.label}
              </span>
              {canAdvance && NEXT_STATUS[t.status as TurnoverStatus] && (
                <button
                  onClick={() => advanceStatus(t.id, NEXT_STATUS[t.status as TurnoverStatus]!)}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  → {TURNOVER_STATUS[NEXT_STATUS[t.status as TurnoverStatus]!]?.label}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-5">Initiate Room Turnover</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Room *</label>
                <select
                  value={form.room_id}
                  onChange={(e) => setForm((f) => ({ ...f, room_id: e.target.value }))}
                  className="input"
                >
                  <option value="">Select room…</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.room_number} ({r.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={initiateTurnover}
                disabled={creating || !form.room_id}
                className="btn-primary flex-1"
              >
                {creating ? "Initiating…" : "Initiate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
