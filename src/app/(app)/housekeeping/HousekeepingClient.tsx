"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile, CleaningTaskStatus, CleaningTaskType } from "@/types/database";
import clsx from "clsx";

const TASK_STATUS_META: Record<CleaningTaskStatus, { label: string; cls: string }> = {
  PENDING:     { label: "Pending",     cls: "bg-gray-100 text-gray-700"    },
  ASSIGNED:    { label: "Assigned",    cls: "bg-blue-100 text-blue-800"    },
  IN_PROGRESS: { label: "In Progress", cls: "bg-purple-100 text-purple-800"},
  COMPLETED:   { label: "Completed",   cls: "bg-green-100 text-green-800"  },
  CANCELLED:   { label: "Cancelled",   cls: "bg-red-100 text-red-700"      },
};

const TASK_TYPES: CleaningTaskType[] = ["STANDARD", "DEEP_CLEAN", "TURNOVER", "INSPECTION_RECLEAN"];

const TASK_TYPE_LABELS: Record<CleaningTaskType, string> = {
  STANDARD:           "Standard",
  DEEP_CLEAN:         "Deep Clean",
  TURNOVER:           "Turnover",
  INSPECTION_RECLEAN: "Inspection Re-clean",
};

const TASK_SELECT = "*, rooms(room_number, floor, room_type), assignee:profiles!assigned_to(full_name, username)";

export default function HousekeepingClient({
  tasks: initialTasks,
  housekeepers,
  rooms,
  profile,
}: {
  tasks: any[];
  housekeepers: { id: string; full_name: string; username: string }[];
  rooms: { id: string; room_number: string; floor: number; status: string }[];
  profile: Profile;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [filterStatus, setFilterStatus] = useState<CleaningTaskStatus | "ALL">("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    room_id: "",
    task_type: "STANDARD" as CleaningTaskType,
    priority: "5",
    notes: "",
    assignee_id: "",
  });

  // Batch assign state (supervisor only)
  const [showBatch, setShowBatch] = useState(false);
  const [batchFloor, setBatchFloor] = useState<string>("");
  const [batchAssigneeId, setBatchAssigneeId] = useState("");
  const [batchSelectedRooms, setBatchSelectedRooms] = useState<string[]>([]);
  const [batchTaskType, setBatchTaskType] = useState<CleaningTaskType>("STANDARD");
  const [batchCreating, setBatchCreating] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Maintenance modal state
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [maintTaskId, setMaintTaskId] = useState<string | null>(null);
  const [maintRoomId, setMaintRoomId] = useState<string | null>(null);
  const [maintForm, setMaintForm] = useState({ title: "", description: "" });
  const [sendingMaint, setSendingMaint] = useState(false);
  const [maintError, setMaintError] = useState<string | null>(null);

  const canManage = ["MANAGER", "SUPERVISOR"].includes(profile.role);
  const isSupervisor = profile.role === "SUPERVISOR";
  const isHousekeeper = profile.role === "HOUSEKEEPER";

  // Change #1: Housekeepers only see their own tasks + unassigned pending
  const visibleTasks = isHousekeeper
    ? tasks.filter(
        (t) => t.assigned_to === profile.id || (t.status === "PENDING" && !t.assigned_to)
      )
    : tasks;

  const filtered =
    filterStatus === "ALL" ? visibleTasks : visibleTasks.filter((t) => t.status === filterStatus);

  // Dirty rooms with no active cleaning task
  const dirtyUnattended = rooms.filter(
    (r) =>
      r.status === "DIRTY" &&
      !tasks.some(
        (t) => t.room_id === r.id && !["COMPLETED", "CANCELLED"].includes(t.status)
      )
  );

  // Unique floors from rooms
  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);

  // Dirty rooms on selected batch floor
  const batchFloorRooms = batchFloor
    ? rooms.filter(
        (r) =>
          r.floor === Number(batchFloor) &&
          r.status === "DIRTY" &&
          !tasks.some((t) => t.room_id === r.id && !["COMPLETED", "CANCELLED"].includes(t.status))
      )
    : [];

  async function createTask() {
    if (!form.room_id) return;
    setCreating(true);
    setCreateError(null);

    const payload: Record<string, unknown> = {
      facility_id: profile.facility_id,
      room_id: form.room_id,
      task_type: form.task_type,
      priority: Number(form.priority),
      notes: form.notes || null,
    };

    // Housekeeper always self-assigns; managers/supervisors can pick anyone
    const assigneeId = isHousekeeper ? profile.id : form.assignee_id;
    if (assigneeId) {
      payload.assigned_to = assigneeId;
      payload.assigned_by = profile.id;
      payload.status = "ASSIGNED";
    }

    const { data: task, error } = await supabase
      .from("cleaning_tasks")
      .insert(payload)
      .select(TASK_SELECT)
      .single();

    if (error) {
      setCreateError(error.message);
    } else if (task) {
      setTasks((prev) => [task, ...prev]);
      setShowCreate(false);
      setForm({ room_id: "", task_type: "STANDARD", priority: "5", notes: "", assignee_id: "" });
      router.refresh();
    }
    setCreating(false);
  }

  // Change #4: Batch assign for supervisor
  async function createBatchTasks() {
    if (!batchSelectedRooms.length) return;
    setBatchCreating(true);
    setBatchError(null);

    const payloads = batchSelectedRooms.map((roomId) => ({
      facility_id: profile.facility_id,
      room_id: roomId,
      task_type: batchTaskType,
      priority: 5,
      assigned_to: batchAssigneeId || null,
      assigned_by: batchAssigneeId ? profile.id : null,
      status: batchAssigneeId ? "ASSIGNED" : "PENDING",
    }));

    const { data: newTasks, error } = await supabase
      .from("cleaning_tasks")
      .insert(payloads)
      .select(TASK_SELECT);

    if (error) {
      setBatchError(error.message);
    } else if (newTasks) {
      setTasks((prev) => [...newTasks, ...prev]);
      setShowBatch(false);
      setBatchFloor("");
      setBatchAssigneeId("");
      setBatchSelectedRooms([]);
      setBatchTaskType("STANDARD");
      router.refresh();
    }
    setBatchCreating(false);
  }

  async function updateTaskStatus(taskId: string, status: CleaningTaskStatus) {
    const updates: Record<string, unknown> = { status };
    if (status === "IN_PROGRESS") updates.started_at = new Date().toISOString();
    if (status === "COMPLETED") updates.completed_at = new Date().toISOString();

    const { data } = await supabase
      .from("cleaning_tasks")
      .update(updates)
      .eq("id", taskId)
      .select(TASK_SELECT)
      .single();

    if (data) setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)));
  }

  async function claimTask(taskId: string) {
    const { data } = await supabase
      .from("cleaning_tasks")
      .update({ assigned_to: profile.id, assigned_by: profile.id, status: "ASSIGNED" })
      .eq("id", taskId)
      .select(TASK_SELECT)
      .single();

    if (data) setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)));
  }

  async function completeTask(taskId: string, roomId: string) {
    const { data } = await supabase
      .from("cleaning_tasks")
      .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
      .eq("id", taskId)
      .select(TASK_SELECT)
      .single();

    if (data) {
      await supabase.from("rooms").update({ status: "AVAILABLE" }).eq("id", roomId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)));
      router.refresh();
    }
  }

  async function sendToMaintenance() {
    if (!maintTaskId || !maintRoomId || !maintForm.title) return;
    setSendingMaint(true);
    setMaintError(null);

    const { error } = await supabase.from("maintenance_requests").insert({
      facility_id: profile.facility_id,
      room_id: maintRoomId,
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

    await supabase.from("rooms").update({ status: "MAINTENANCE" }).eq("id", maintRoomId);

    const { data } = await supabase
      .from("cleaning_tasks")
      .update({ status: "CANCELLED" })
      .eq("id", maintTaskId)
      .select(TASK_SELECT)
      .single();

    if (data) setTasks((prev) => prev.map((t) => (t.id === maintTaskId ? data : t)));

    setShowMaintModal(false);
    setMaintForm({ title: "", description: "" });
    setMaintTaskId(null);
    setMaintRoomId(null);
    setSendingMaint(false);
    router.refresh();
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Housekeeping</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {visibleTasks.filter((t) => !["COMPLETED", "CANCELLED"].includes(t.status)).length} active tasks
          </p>
        </div>
        <div className="flex gap-2">
          {/* Change #4: Batch assign button for supervisor */}
          {isSupervisor && (
            <button
              onClick={() => { setShowBatch(true); setBatchError(null); }}
              className="btn-secondary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3" />
              </svg>
              Batch Assign
            </button>
          )}
          <button
            onClick={() => { setShowCreate(true); setCreateError(null); }}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {isHousekeeper ? "Assign Myself" : "New Task"}
          </button>
        </div>
      </div>

      {/* Dirty rooms needing a task */}
      {dirtyUnattended.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <h2 className="text-sm font-semibold text-gray-700">
              Dirty Rooms Needing Attention ({dirtyUnattended.length})
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {dirtyUnattended.map((room) => (
              <div
                key={room.id}
                className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex flex-col gap-2"
              >
                <span className="font-bold text-gray-900">Room {room.room_number}</span>
                <span className="text-xs text-gray-500">Floor {room.floor}</span>
                <span className="text-xs text-yellow-700 font-medium">Dirty</span>
                {canManage && (
                  <button
                    onClick={() => {
                      setForm((f) => ({ ...f, room_id: room.id }));
                      setShowCreate(true);
                      setCreateError(null);
                    }}
                    className="text-xs py-1 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Assign Task
                  </button>
                )}
                {isHousekeeper && (
                  <button
                    onClick={() => {
                      setForm((f) => ({ ...f, room_id: room.id }));
                      setShowCreate(true);
                      setCreateError(null);
                    }}
                    className="text-xs py-1 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Claim Room
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["ALL", "PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              filterStatus === s
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            )}
          >
            {s === "ALL"
              ? `All (${visibleTasks.length})`
              : `${TASK_STATUS_META[s as CleaningTaskStatus]?.label} (${visibleTasks.filter((t) => t.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="card divide-y divide-gray-100">
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400">No tasks found</div>
        )}
        {filtered.map((task: any) => {
          const assignee = task.assignee;
          const isMyTask = task.assigned_to === profile.id;
          const roomId = task.room_id;

          return (
            <div key={task.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">Room {task.rooms?.room_number}</span>
                  <span className="text-xs text-gray-500">{TASK_TYPE_LABELS[task.task_type as CleaningTaskType] ?? task.task_type}</span>
                  <span className="text-xs text-gray-400">Priority {task.priority}</span>
                </div>
                {task.notes && (
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{task.notes}</p>
                )}
                {assignee && (
                  <p className="text-xs text-blue-600 mt-0.5">Assigned to {assignee.full_name}</p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 flex-wrap justify-end">
                <span className={`badge ${TASK_STATUS_META[task.status as CleaningTaskStatus]?.cls}`}>
                  {TASK_STATUS_META[task.status as CleaningTaskStatus]?.label}
                </span>

                {/* Manager/Supervisor status dropdown */}
                {canManage && !["COMPLETED", "CANCELLED"].includes(task.status) && (
                  <select
                    value={task.status}
                    onChange={(e) => updateTaskStatus(task.id, e.target.value as CleaningTaskStatus)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                  >
                    {(Object.keys(TASK_STATUS_META) as CleaningTaskStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {TASK_STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                )}

                {/* Housekeeper: claim unassigned pending task */}
                {isHousekeeper && task.status === "PENDING" && !task.assigned_to && (
                  <button
                    onClick={() => claimTask(task.id)}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    Claim
                  </button>
                )}

                {/* Housekeeper: start their assigned task */}
                {isHousekeeper && isMyTask && task.status === "ASSIGNED" && (
                  <button
                    onClick={() => updateTaskStatus(task.id, "IN_PROGRESS")}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    Start
                  </button>
                )}

                {/* Housekeeper: complete or send to maintenance */}
                {isHousekeeper && isMyTask && task.status === "IN_PROGRESS" && (
                  <>
                    <button
                      onClick={() => completeTask(task.id, roomId)}
                      className="btn-primary text-xs py-1.5 px-3 bg-green-600 hover:bg-green-700"
                    >
                      Mark Ready
                    </button>
                    <button
                      onClick={() => {
                        setMaintTaskId(task.id);
                        setMaintRoomId(roomId);
                        setMaintForm({ title: "", description: "" });
                        setMaintError(null);
                        setShowMaintModal(true);
                      }}
                      className="text-xs py-1.5 px-3 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50"
                    >
                      Send to Maintenance
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Self-assign modal */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {isHousekeeper ? "Assign Myself to Room" : "Create Cleaning Task"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Room *</label>
                <select
                  value={form.room_id}
                  onChange={(e) => setForm((f) => ({ ...f, room_id: e.target.value }))}
                  className="input"
                >
                  <option value="">Select room…</option>
                  {rooms.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      Room {r.room_number} (Floor {r.floor})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Task Type</label>
                <select
                  value={form.task_type}
                  onChange={(e) => setForm((f) => ({ ...f, task_type: e.target.value as CleaningTaskType }))}
                  className="input"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TASK_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Priority (1 = Highest, 10 = Lowest)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  className="input"
                />
              </div>
              {/* Only show assignee selector for managers/supervisors */}
              {canManage && (
                <div>
                  <label className="label">Assign to</label>
                  <select
                    value={form.assignee_id}
                    onChange={(e) => setForm((f) => ({ ...f, assignee_id: e.target.value }))}
                    className="input"
                  >
                    <option value="">Unassigned</option>
                    {housekeepers.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input"
                  rows={2}
                  placeholder="Add any notes about this task…"
                />
              </div>
              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  {createError}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={createTask}
                className="btn-primary flex-1"
                disabled={creating || !form.room_id}
              >
                {creating ? "Creating…" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Assign modal — supervisor only (change #4) */}
      {showBatch && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowBatch(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-1">Batch Assign Cleaning</h2>
            <p className="text-sm text-gray-500 mb-5">Assign multiple dirty rooms on a floor at once.</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Floor</label>
                  <select
                    value={batchFloor}
                    onChange={(e) => {
                      setBatchFloor(e.target.value);
                      setBatchSelectedRooms([]);
                    }}
                    className="input"
                  >
                    <option value="">Select floor…</option>
                    {floors.map((f) => (
                      <option key={f} value={f}>
                        Floor {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Task Type</label>
                  <select
                    value={batchTaskType}
                    onChange={(e) => setBatchTaskType(e.target.value as CleaningTaskType)}
                    className="input"
                  >
                    {TASK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TASK_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Assign to Housekeeper (optional)</label>
                <select
                  value={batchAssigneeId}
                  onChange={(e) => setBatchAssigneeId(e.target.value)}
                  className="input"
                >
                  <option value="">Leave unassigned</option>
                  {housekeepers.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {batchFloor && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label mb-0">
                      Dirty Rooms on Floor {batchFloor} ({batchFloorRooms.length})
                    </label>
                    {batchFloorRooms.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setBatchSelectedRooms(
                            batchSelectedRooms.length === batchFloorRooms.length
                              ? []
                              : batchFloorRooms.map((r) => r.id)
                          )
                        }
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {batchSelectedRooms.length === batchFloorRooms.length
                          ? "Deselect all"
                          : "Select all"}
                      </button>
                    )}
                  </div>
                  {batchFloorRooms.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">No dirty rooms on this floor</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                      {batchFloorRooms.map((r) => (
                        <label
                          key={r.id}
                          className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={batchSelectedRooms.includes(r.id)}
                            onChange={(e) =>
                              setBatchSelectedRooms((prev) =>
                                e.target.checked
                                  ? [...prev, r.id]
                                  : prev.filter((id) => id !== r.id)
                              )
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm font-medium">Room {r.room_number}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {batchError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  {batchError}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowBatch(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={createBatchTasks}
                disabled={batchCreating || batchSelectedRooms.length === 0}
                className="btn-primary flex-1"
              >
                {batchCreating
                  ? "Creating…"
                  : `Assign ${batchSelectedRooms.length} Room${batchSelectedRooms.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send to Maintenance modal */}
      {showMaintModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowMaintModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-1">Send to Maintenance</h2>
            <p className="text-sm text-gray-500 mb-5">This will flag the room and cancel the cleaning task.</p>
            <div className="space-y-4">
              <div>
                <label className="label">Issue Title *</label>
                <input
                  value={maintForm.title}
                  onChange={(e) => setMaintForm((f) => ({ ...f, title: e.target.value }))}
                  className="input"
                  placeholder="e.g. Broken AC unit"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={maintForm.description}
                  onChange={(e) => setMaintForm((f) => ({ ...f, description: e.target.value }))}
                  className="input"
                  rows={3}
                  placeholder="Describe the issue…"
                />
              </div>
              {maintError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  {maintError}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowMaintModal(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={sendToMaintenance}
                disabled={sendingMaint || !maintForm.title}
                className="flex-1 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {sendingMaint ? "Submitting…" : "Submit to Maintenance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
