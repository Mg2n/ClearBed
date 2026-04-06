// ── Enums (must match sql/01_schema.sql exactly) ─────────────
export type FacilityType = "HOTEL" | "HOSPITAL";
export type RoleName = "HOUSEKEEPER" | "MAINTENANCE" | "RECEPTION" | "SUPERVISOR" | "MANAGER";
export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "DIRTY" | "CLEANING" | "INSPECTING" | "MAINTENANCE" | "OUT_OF_ORDER";
export type RoomType = "STANDARD" | "DELUXE" | "SUITE" | "PRESIDENTIAL" | "ACCESSIBLE";
export type CleaningTaskStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
// DB enum: STANDARD, DEEP_CLEAN, TURNOVER, INSPECTION_RECLEAN
export type CleaningTaskType = "STANDARD" | "DEEP_CLEAN" | "TURNOVER" | "INSPECTION_RECLEAN";
// DB enum: OPEN, IN_PROGRESS, COMPLETED, CANCELLED  (no RESOLVED)
export type MaintenanceRequestStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
// DB enum: PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED  (no OPEN)
export type WorkOrderStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type InspectionResult = "PASS" | "FAIL" | "CONDITIONAL";
// DB enum: INITIATED, CLEANING, AWAITING_INSPECTION, COMPLETED, FLAGGED_MAINTENANCE
export type TurnoverStatus = "INITIATED" | "CLEANING" | "AWAITING_INSPECTION" | "COMPLETED" | "FLAGGED_MAINTENANCE";
export type GuestStayStatus = "RESERVED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";

export interface Facility {
  id: string; name: string; type: FacilityType;
  address: string | null; contact_email: string | null; contact_phone: string | null;
  require_inspection: boolean; is_active: boolean; created_at: string; updated_at: string;
}
export interface Profile {
  id: string; facility_id: string; role: RoleName; username: string;
  full_name: string | null; is_active: boolean; last_login: string | null;
  created_at: string; updated_at: string;
}
export interface Room {
  id: string; facility_id: string; room_number: string; floor: number | null;
  room_type: RoomType; status: RoomStatus; is_active: boolean;
  notes: string | null; created_at: string; updated_at: string;
}
export interface CleaningTask {
  id: string; facility_id: string; room_id: string; turnover_id: string | null;
  task_type: CleaningTaskType; status: CleaningTaskStatus; priority: number;
  // assigned_to / assigned_by are direct FK columns (no separate task_assignments table)
  assigned_to: string | null; assigned_by: string | null;
  notes: string | null; started_at: string | null; completed_at: string | null;
  created_at: string; updated_at: string;
}
export interface Inspection {
  id: string; facility_id: string; room_id: string; turnover_id: string | null;
  inspected_by: string | null; // column name in DB (was incorrectly inspector_id)
  result: InspectionResult | null; score: number | null;
  notes: string | null; checklist: Record<string, boolean> | null;
  completed_at: string | null; created_at: string; updated_at: string;
}
export interface MaintenanceRequest {
  id: string; facility_id: string; room_id: string;
  reported_by: string | null; // column name in DB (was incorrectly reported_by_id)
  title: string; description: string; priority: MaintenancePriority;
  status: MaintenanceRequestStatus; blocks_room: boolean; resolved_at: string | null;
  created_at: string; updated_at: string;
}
export interface WorkOrder {
  id: string; facility_id: string; request_id: string;
  assigned_to: string | null; assigned_by: string | null; // DB column names (not _id suffix)
  status: WorkOrderStatus; description: string | null;
  started_at: string | null; completed_at: string | null;
  notes: string | null; created_at: string; updated_at: string;
}
export interface RoomTurnover {
  id: string; facility_id: string; room_id: string;
  initiated_by: string | null; // column name in DB (was incorrectly initiated_by_id)
  status: TurnoverStatus; guest_stay_id: string | null;
  initiated_at: string; completed_at: string | null;
  notes: string | null; created_at: string; updated_at: string;
}
export interface GuestStay {
  id: string; facility_id: string; room_id: string; guest_name: string;
  guest_count: number; check_in: string; check_out: string | null;
  is_checked_out: boolean; notes: string | null;
  created_by: string | null; created_at: string; updated_at: string;
}

type R = Record<string, unknown>;
export type Database = {
  public: {
    Tables: {
      facilities:           { Row: Facility;           Insert: R; Update: R };
      profiles:             { Row: Profile;             Insert: R; Update: R };
      rooms:                { Row: Room;                Insert: R; Update: R };
      cleaning_tasks:       { Row: CleaningTask;        Insert: R; Update: R };
      inspections:          { Row: Inspection;          Insert: R; Update: R };
      maintenance_requests: { Row: MaintenanceRequest;  Insert: R; Update: R };
      work_orders:          { Row: WorkOrder;           Insert: R; Update: R };
      room_turnovers:       { Row: RoomTurnover;        Insert: R; Update: R };
      guest_stays:          { Row: GuestStay;           Insert: R; Update: R };
    };
    Enums: {
      facility_type: FacilityType;
      role_name: RoleName;
      room_status: RoomStatus;
    };
  };
};
