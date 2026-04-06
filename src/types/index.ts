// ── Enums ────────────────────────────────────────────────────
export type FacilityType     = 'HOTEL' | 'HOSPITAL'
export type UserRole         = 'MANAGER' | 'SUPERVISOR' | 'HOUSEKEEPER' | 'MAINTENANCE' | 'RECEPTION'
export type RoomStatus       = 'AVAILABLE' | 'OCCUPIED' | 'DIRTY' | 'CLEANING' | 'INSPECTING' | 'MAINTENANCE' | 'OUT_OF_ORDER'
export type RoomType         = 'STANDARD' | 'DELUXE' | 'SUITE' | 'PRESIDENTIAL' | 'ACCESSIBLE'
export type TaskType         = 'STANDARD' | 'DEEP_CLEAN' | 'TURNOVER' | 'INSPECTION_RECLEAN'
export type TaskStatus       = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type PriorityLevel    = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type WorkOrderStatus  = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type TurnoverStatus   = 'INITIATED' | 'CLEANING' | 'AWAITING_INSPECTION' | 'COMPLETED' | 'FLAGGED_MAINTENANCE'
export type InspectionResult = 'PASS' | 'FAIL' | 'CONDITIONAL'

// ── Tables ───────────────────────────────────────────────────
export interface Facility {
  id: string
  name: string
  type: FacilityType
  address: string | null
  contact_email: string | null
  contact_phone: string | null
  require_inspection: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  facility_id: string
  username: string
  full_name: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  facility_id: string
  room_number: string
  floor: number
  room_type: RoomType
  status: RoomStatus
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface GuestStay {
  id: string
  facility_id: string
  room_id: string
  guest_name: string
  guest_count: number
  check_in: string
  check_out: string | null
  is_checked_out: boolean
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  room?: Room
}

export interface RoomTurnover {
  id: string
  facility_id: string
  room_id: string
  guest_stay_id: string | null
  status: TurnoverStatus
  initiated_at: string
  completed_at: string | null
  initiated_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
  room?: Room
  initiator?: Profile
}

export interface CleaningTask {
  id: string
  facility_id: string
  room_id: string
  turnover_id: string | null
  task_type: TaskType
  status: TaskStatus
  priority: number
  assigned_to: string | null
  assigned_by: string | null
  started_at: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  room?: Room
  assignee?: Profile
  assigner?: Profile
}

export interface MaintenanceRequest {
  id: string
  facility_id: string
  room_id: string
  reported_by: string | null
  title: string
  description: string | null
  priority: PriorityLevel
  status: MaintenanceStatus
  blocks_room: boolean
  resolved_at: string | null
  created_at: string
  updated_at: string
  room?: Room
  reporter?: Profile
  work_orders?: WorkOrder[]
}

export interface WorkOrder {
  id: string
  facility_id: string
  request_id: string
  assigned_to: string | null
  assigned_by: string | null
  status: WorkOrderStatus
  description: string | null
  started_at: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  assignee?: Profile
}

export interface Inspection {
  id: string
  facility_id: string
  room_id: string
  turnover_id: string | null
  inspected_by: string | null
  result: InspectionResult | null
  score: number | null
  checklist: Record<string, boolean>
  notes: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  room?: Room
  inspector?: Profile
}

// ── Auth / Session ───────────────────────────────────────────
export interface AuthUser {
  id: string
  email: string
  profile: Profile
  facility: Facility
}

// ── Dashboard ────────────────────────────────────────────────
export interface DashboardKPIs {
  available_rooms: number
  dirty_rooms: number
  active_tasks: number
  open_maintenance: number
  awaiting_inspection: number
  total_rooms: number
}
