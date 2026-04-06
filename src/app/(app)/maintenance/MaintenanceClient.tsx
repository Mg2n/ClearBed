"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile, MaintenancePriority, MaintenanceRequestStatus } from "@/types/database";
import clsx from "clsx";

const PRIORITY_META: Record<MaintenancePriority, { label: string; cls: string }> = {
  LOW:    { label: "Low",    cls: "bg-gray-100 text-gray-700"    },
  MEDIUM: { label: "Medium", cls: "bg-blue-100 text-blue-800"    },
  HIGH:   { label: "High",   cls: "bg-orange-100 text-orange-800"},
  URGENT: { label: "Urgent", cls: "bg-red-100 text-red-800"      },
};

const STATUS_META: Record<MaintenanceRequestStatus, { label: string; cls: string }> = {
  OPEN:        { label: "Open",        cls: "bg-yellow-100 text-yellow-800" },
  IN_PROGRESS: { label: "In Progress", cls: "bg-blue-100 text-blue-800"     },
  COMPLETED:   { label: "Completed",   cls: "bg-green-100 text-green-800"   },
  CANCELLED:   { label: "Cancelled",   cls: "bg-gray-100 text-gray-700"     },
};

// Change #9: Time elapsed helper
function timeElapsed(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
}

const MAINT_SELECT =
  "*, rooms(room_number, floor), work_orders(id, status, notes, assigned_to:profiles!assigned_to(full_name))";

export default function MaintenanceClient({
  requests: initialReqs,
  maintStaff,
  rooms,
  profile,
}: {
  requests: any[];
  maintStaff: { id: string; full_name: string }[];
  rooms: { id: string; room_number: string }[];
  profile: Profile;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [requests, setRequests] = useState(initialReqs);
  const [filterStatus, setFilterStatus] = useState<MaintenanceRequestStatus | "ALL">("ALL");

  // Create request state (hidden from MAINTENANCE role — change #7)
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    room_id: "",
    title: "",
    description: "",
    priority: "MEDIUM" as MaintenancePriority,
    blocks_room: false,
  });

  // Solution modal state (change #7: MAINTENANCE writes solution)
  const [showSolution, setShowSolution] = useState(false);
  const [solutionReqId, setSolutionReqId] = useState<string | null>(null);
  const [solutionText, setSolutionText] = useState("");
  const [submittingSolution, setSubmittingSolution] = useState(false);
  const [solutionError, setSolutionError] = useState<string | null>(null);

  const isMaintenance = profile.role === "MAINTENANCE";
  // Change #7: MAINTENANCE role can manage status but NOT report issues
  const canManage = ["MANAGER", "SUPERVISOR", "MAINTENANCE"].includes(profile.role);
  // Only non-MAINTENANCE roles can report issues
  const canReport = !isMaintenance;

  const filtered = filterStatus === "ALL" ? requests : requests.filter((r) => r.status === filterStatus);

  async function createRequest() {
    if (!form.room_id || !form.title || !form.description) return;
    setCreating(true);
    setCreateError(null);

    const { data, error } = await supabase
      .from("maintenance_requests")
      .insert({
        facility_id: profile.facility_id,
        room_id: form.room_id,
        title: form.title,
        description: form.description,
        priority: form.priority,
        blocks_room: form.blocks_room,
        reported_by: profile.id,
      })
      .select(MAINT_SELECT)
      .single();

    if (error) {
      setCreateError(error.message);
    } else if (data) {
      if (form.blocks_room) {
        await supabase.from("rooms").update({ status: "MAINTENANCE" }).eq("id", form.room_id);
      }
      setRequests((prev) => [data, ...prev]);
      setShowCreate(false);
      setForm({ room_id: "", title: "", description: "", priority: "MEDIUM", blocks_room: false });
      router.refresh();
    }
    setCreating(false);
  }

  async function updateStatus(id: string, status: MaintenanceRequestStatus) {
    const updates: Record<string, unknown> = { status };
    if (status === "COMPLETED") updates.resolved_at = new Date().toISOString();

    const { data } = await supabase
      .from("maintenance_requests")
      .update(updates)
      .eq("id", id)
      .select(MAINT_SELECT)
      .single();

    if (data) {
      setRequests((prev) => prev.map((r) => (r.id === id ? data : r)));
    }
  }

  // Change #7: MAINTENANCE writes solution via work_order
  async function submitSolution() {
    if (!solutionReqId || !solutionText.trim()) return;
    setSubmittingSolution(true);
    setSolutionError(null);

    const { error } = await supabase.from("work_orders").insert({
      facility_id: profile.facility_id,
      request_id: solutionReqId,
      assigned_to: profile.id,
      assigned_by: profile.id,
      status: "COMPLETED",
      notes: solutionText.trim(),
      completed_at: new Date().toISOString(),
    });

    if (error) {
      setSolutionError(error.message);
      setSubmittingSolution(false);
      return;
    }

    // Refresh the request to show updated work_orders
    const { data } = await supabase
      .from("maintenance_requests")
      .select(MAINT_SELECT)
      .eq("id", solutionReqId)
      .single();

    if (data) setRequests((prev) => prev.map((r) => (r.id === solutionReqId ? data : r)));

    setShowSolution(false);
    setSolutionText("");
    setSolutionReqId(null);
    setSubmittingSolution(false);
    router.refresh();
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {requests.filter((r) => r.status === "OPEN").length} open requests
          </p>
        </div>
        {/* Change #7: hide Report Issue for MAINTENANCE role */}
        {canReport && (
          <button
            onClick={() => { setShowCreate(true); setCreateError(null); }}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Report Issue
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["ALL", "OPEN", "IN_PROGRESS", "COMPLETED"] as const).map((s) => (
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
              ? `All (${requests.length})`
              : `${STATUS_META[s as MaintenanceRequestStatus]?.label} (${requests.filter((r) => r.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Requests */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="card py-12 text-center text-gray-400">No maintenance requests</div>
        )}
        {filtered.map((req: any) => {
          const isHighPriority = ["HIGH", "URGENT"].includes(req.priority);
          // Change #8: HIGH/URGENT can't be cancelled
          const allowedStatuses = (Object.keys(STATUS_META) as MaintenanceRequestStatus[]).filter(
            (s) => !(isHighPriority && s === "CANCELLED")
          );
          // Solutions written by maintenance staff
          const solutions = (req.work_orders ?? []).filter((wo: any) => wo.notes);

          return (
            <div key={req.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-gray-900">{req.title}</h3>
                    {req.blocks_room && (
                      <span className="badge bg-red-100 text-red-800 text-xs">Blocks Room</span>
                    )}
                    {isHighPriority && (
                      <span className="badge bg-orange-50 text-orange-700 border border-orange-200 text-xs">
                        Cannot Cancel
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{req.description}</p>

                  {/* Change #9: time elapsed */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span>Room {req.rooms?.room_number}</span>
                    <span title={new Date(req.created_at).toLocaleString()}>
                      Opened {timeElapsed(req.created_at)}
                    </span>
                    {req.status === "IN_PROGRESS" && req.work_orders?.length > 0 && (
                      <span className="text-blue-600">In progress</span>
                    )}
                    {req.work_orders?.length > 0 && (
                      <span>{req.work_orders.length} work order(s)</span>
                    )}
                  </div>

                  {/* Show solutions written by maintenance */}
                  {solutions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {solutions.map((wo: any) => (
                        <div
                          key={wo.id}
                          className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800"
                        >
                          <span className="font-medium">Solution: </span>
                          {wo.notes}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  <span className={`badge ${PRIORITY_META[req.priority as MaintenancePriority]?.cls}`}>
                    {PRIORITY_META[req.priority as MaintenancePriority]?.label}
                  </span>
                  <span className={`badge ${STATUS_META[req.status as MaintenanceRequestStatus]?.cls}`}>
                    {STATUS_META[req.status as MaintenanceRequestStatus]?.label}
                  </span>

                  {/* Change #8: status dropdown excludes CANCELLED for HIGH/URGENT */}
                  {canManage && !["COMPLETED", "CANCELLED"].includes(req.status) && (
                    <select
                      value={req.status}
                      onChange={(e) => updateStatus(req.id, e.target.value as MaintenanceRequestStatus)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                    >
                      {allowedStatuses
                        .filter((s) => s !== "CANCELLED" || !isHighPriority)
                        .map((s) => (
                          <option key={s} value={s}>
                            {STATUS_META[s].label}
                          </option>
                        ))}
                    </select>
                  )}

                  {/* Change #7: Write Solution button for MAINTENANCE role */}
                  {isMaintenance && !["COMPLETED", "CANCELLED"].includes(req.status) && (
                    <button
                      onClick={() => {
                        setSolutionReqId(req.id);
                        setSolutionText("");
                        setSolutionError(null);
                        setShowSolution(true);
                      }}
                      className="text-xs py-1.5 px-3 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 font-medium"
                    >
                      Write Solution
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create modal — only visible to non-MAINTENANCE roles */}
      {showCreate && canReport && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-5">Report Maintenance Issue</h2>
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
                      Room {r.room_number}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="input"
                  placeholder="e.g. Broken AC unit"
                />
              </div>
              <div>
                <label className="label">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="input"
                  rows={3}
                />
              </div>
              <div>
                <label className="label">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as MaintenancePriority }))}
                  className="input"
                >
                  {(Object.keys(PRIORITY_META) as MaintenancePriority[]).map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_META[p].label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.blocks_room}
                  onChange={(e) => setForm((f) => ({ ...f, blocks_room: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-700">
                  This issue blocks the room from being occupied
                </span>
              </label>
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
                onClick={createRequest}
                disabled={creating || !form.room_id || !form.title || !form.description}
                className="btn-primary flex-1"
              >
                {creating ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Write Solution modal — change #7 */}
      {showSolution && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSolution(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-1">Write Solution</h2>
            <p className="text-sm text-gray-500 mb-5">
              Describe what was done to resolve this issue.
            </p>
            <div className="space-y-4">
              <div>
                <label className="label">Solution *</label>
                <textarea
                  value={solutionText}
                  onChange={(e) => setSolutionText(e.target.value)}
                  className="input"
                  rows={4}
                  placeholder="Describe the fix applied…"
                  autoFocus
                />
              </div>
              {solutionError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  {solutionError}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowSolution(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={submitSolution}
                disabled={submittingSolution || !solutionText.trim()}
                className="btn-primary flex-1 bg-green-600 hover:bg-green-700"
              >
                {submittingSolution ? "Saving…" : "Save Solution"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
