"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Room, Profile, RoomStatus, CleaningTaskType } from "@/types/database";
import clsx from "clsx";

const TASK_TYPES: { value: CleaningTaskType; label: string }[] = [
  { value: "STANDARD", label: "Standard" },
  { value: "DEEP_CLEAN", label: "Deep Clean" },
  { value: "TURNOVER", label: "Turnover" },
  { value: "INSPECTION_RECLEAN", label: "Inspection Re-clean" },
];

const STATUS_META: Record<RoomStatus, { label: string; bg: string; text: string; dot: string }> = {
  AVAILABLE:    { label: "Available",    bg: "bg-green-50",  text: "text-green-800",  dot: "bg-green-500"  },
  OCCUPIED:     { label: "Occupied",     bg: "bg-blue-50",   text: "text-blue-800",   dot: "bg-blue-500"   },
  DIRTY:        { label: "Dirty",        bg: "bg-yellow-50", text: "text-yellow-800", dot: "bg-yellow-500" },
  CLEANING:     { label: "Cleaning",     bg: "bg-purple-50", text: "text-purple-800", dot: "bg-purple-500" },
  INSPECTING:   { label: "Inspecting",   bg: "bg-indigo-50", text: "text-indigo-800", dot: "bg-indigo-500" },
  MAINTENANCE:  { label: "Maintenance",  bg: "bg-red-50",    text: "text-red-800",    dot: "bg-red-500"    },
  OUT_OF_ORDER: { label: "Out of Order", bg: "bg-gray-100",  text: "text-gray-700",   dot: "bg-gray-500"   },
};

const ALL_STATUSES = Object.keys(STATUS_META) as RoomStatus[];

type ModalTab = "status" | "assign" | "maintenance";

export default function RoomsClient({
  rooms: initialRooms,
  housekeepers,
  profile,
}: {
  rooms: Room[];
  housekeepers: { id: string; full_name: string | null; username: string }[];
  profile: Profile;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [rooms, setRooms] = useState(initialRooms);
  const [filter, setFilter] = useState<RoomStatus | "ALL">("ALL");
  const [updating, setUpdating] = useState<string | null>(null);
  const [selected, setSelected] = useState<Room | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>("status");

  // Assign cleaning task form state
  const [assignForm, setAssignForm] = useState({ assignee_id: "", task_type: "STANDARD" as CleaningTaskType });
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Send to maintenance form state
  const [maintForm, setMaintForm] = useState({ title: "", description: "" });
  const [sendingMaint, setSendingMaint] = useState(false);
  const [maintError, setMaintError] = useState<string | null>(null);

  const canEdit = true;
  const filtered = filter === "ALL" ? rooms : rooms.filter(r => r.status === filter);

  function openRoom(room: Room) {
    setSelected(room);
    setModalTab("status");
    setAssignForm({ assignee_id: "", task_type: "STANDARD" });
    setAssignError(null);
    setMaintForm({ title: "", description: "" });
    setMaintError(null);
  }

  async function updateStatus(roomId: string, status: RoomStatus) {
    setUpdating(roomId);
    const { data, error } = await supabase
      .from("rooms")
      .update({ status })
      .eq("id", roomId)
      .select()
      .single();
    if (!error && data) {
      setRooms(prev => prev.map(r => r.id === roomId ? data : r));
      setSelected(null);
    }
    setUpdating(null);
  }

  async function assignCleaning() {
    if (!selected) return;
    setAssigning(true);
    setAssignError(null);

    const payload: Record<string, unknown> = {
      facility_id: profile.facility_id,
      room_id: selected.id,
      task_type: assignForm.task_type,
      priority: 5,
      status: "PENDING",
    };
    if (assignForm.assignee_id) {
      payload.assigned_to = assignForm.assignee_id;
      payload.assigned_by = profile.id;
      payload.status = "ASSIGNED";
    }

    const { error } = await supabase.from("cleaning_tasks").insert(payload);
    if (error) {
      setAssignError(error.message);
      setAssigning(false);
      return;
    }

    // Update room status to CLEANING
    const { data: updatedRoom } = await supabase
      .from("rooms").update({ status: "CLEANING" }).eq("id", selected.id).select().single();
    if (updatedRoom) setRooms(prev => prev.map(r => r.id === selected.id ? updatedRoom : r));

    setSelected(null);
    setAssigning(false);
    router.refresh();
  }

  async function sendToMaintenance() {
    if (!selected || !maintForm.title) return;
    setSendingMaint(true);
    setMaintError(null);

    const { error } = await supabase.from("maintenance_requests").insert({
      facility_id: profile.facility_id,
      room_id: selected.id,
      title: maintForm.title,
      description: maintForm.description || null,
      priority: "MEDIUM",
      blocks_room: true,
      reported_by: profile.id,
    });

    if (error) {
      setMaintError(error.message);
      setSendingMaint(false);
      return;
    }

    const { data: updatedRoom } = await supabase
      .from("rooms").update({ status: "MAINTENANCE" }).eq("id", selected.id).select().single();
    if (updatedRoom) setRooms(prev => prev.map(r => r.id === selected.id ? updatedRoom : r));

    setSelected(null);
    setSendingMaint(false);
    router.refresh();
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rooms</h1>
          <p className="text-sm text-gray-500 mt-0.5">{rooms.length} rooms total</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter("ALL")}
          className={clsx("px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            filter === "ALL" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          )}
        >
          All ({rooms.length})
        </button>
        {ALL_STATUSES.map(s => {
          const count = rooms.filter(r => r.status === s).length;
          if (count === 0) return null;
          const m = STATUS_META[s];
          return (
            <button key={s}
              onClick={() => setFilter(s)}
              className={clsx("px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                filter === s ? `${m.bg} ${m.text} ring-2 ring-current ring-opacity-30` : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {m.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Rooms grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filtered.map(room => {
          const m = STATUS_META[room.status];
          return (
            <div key={room.id}
              onClick={() => canEdit && openRoom(room)}
              className={clsx(
                "card p-4 cursor-pointer hover:shadow-md transition-all",
                canEdit && "hover:scale-[1.02]",
                m.bg
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-gray-900">{room.room_number}</span>
                <div className={`w-2.5 h-2.5 rounded-full ${m.dot}`} />
              </div>
              <div className="text-xs text-gray-600 mb-1">Floor {room.floor ?? "—"}</div>
              <div className="text-xs font-medium text-gray-700">{room.room_type}</div>
              <div className={clsx("mt-2 text-xs font-medium", m.text)}>{m.label}</div>
              {updating === room.id && (
                <div className="mt-1 text-xs text-gray-400">Updating…</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Room action modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Room {selected.room_number}</h2>
            <p className="text-sm text-gray-500 mb-4">
              Floor {selected.floor ?? "—"} · {selected.room_type} ·{" "}
              <span className={STATUS_META[selected.status].text}>{STATUS_META[selected.status].label}</span>
            </p>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1">
              {([
                { key: "status", label: "Status" },
                { key: "assign", label: "Assign Cleaning" },
                { key: "maintenance", label: "Maintenance" },
              ] as { key: ModalTab; label: string }[]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setModalTab(tab.key)}
                  className={clsx(
                    "flex-1 text-xs font-medium py-1.5 rounded-md transition-colors",
                    modalTab === tab.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Status tab */}
            {modalTab === "status" && (
              <div className="grid grid-cols-2 gap-2">
                {ALL_STATUSES.map(s => {
                  const m = STATUS_META[s];
                  return (
                    <button key={s}
                      onClick={() => updateStatus(selected.id, s)}
                      disabled={updating === selected.id || selected.status === s}
                      className={clsx(
                        "px-3 py-2.5 rounded-lg text-sm font-medium transition-all border",
                        selected.status === s
                          ? `${m.bg} ${m.text} border-current opacity-60 cursor-default`
                          : `hover:${m.bg} ${m.text} border-gray-200 hover:border-current`
                      )}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Assign Cleaning tab */}
            {modalTab === "assign" && (
              <div className="space-y-4">
                <div>
                  <label className="label">Task Type</label>
                  <select
                    value={assignForm.task_type}
                    onChange={e => setAssignForm(f => ({ ...f, task_type: e.target.value as CleaningTaskType }))}
                    className="input"
                  >
                    {TASK_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Assign to Housekeeper</label>
                  <select
                    value={assignForm.assignee_id}
                    onChange={e => setAssignForm(f => ({ ...f, assignee_id: e.target.value }))}
                    className="input"
                  >
                    <option value="">Unassigned (Pending)</option>
                    {housekeepers.map(h => (
                      <option key={h.id} value={h.id}>{h.full_name ?? h.username}</option>
                    ))}
                  </select>
                </div>
                {assignError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{assignError}</div>
                )}
                <p className="text-xs text-gray-400">Room status will be updated to Cleaning.</p>
                <button
                  onClick={assignCleaning}
                  disabled={assigning}
                  className="w-full btn-primary"
                >
                  {assigning ? "Creating…" : "Create Cleaning Task"}
                </button>
              </div>
            )}

            {/* Maintenance tab */}
            {modalTab === "maintenance" && (
              <div className="space-y-4">
                <div>
                  <label className="label">Issue Title *</label>
                  <input
                    value={maintForm.title}
                    onChange={e => setMaintForm(f => ({ ...f, title: e.target.value }))}
                    className="input"
                    placeholder="e.g. Broken AC unit"
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    value={maintForm.description}
                    onChange={e => setMaintForm(f => ({ ...f, description: e.target.value }))}
                    className="input"
                    rows={3}
                    placeholder="Describe the issue…"
                  />
                </div>
                {maintError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{maintError}</div>
                )}
                <p className="text-xs text-gray-400">Room status will be updated to Maintenance.</p>
                <button
                  onClick={sendToMaintenance}
                  disabled={sendingMaint || !maintForm.title}
                  className="w-full px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium disabled:opacity-50"
                >
                  {sendingMaint ? "Submitting…" : "Submit to Maintenance"}
                </button>
              </div>
            )}

            <button onClick={() => setSelected(null)} className="mt-4 w-full btn-secondary">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
