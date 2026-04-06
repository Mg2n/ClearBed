import type { RoomStatus, TaskStatus, MaintenanceStatus, TurnoverStatus, InspectionResult, UserRole, PriorityLevel } from '@/types'

export const ROOM_STATUS_COLORS: Record<RoomStatus, string> = {
  AVAILABLE:    'bg-emerald-100 text-emerald-800',
  OCCUPIED:     'bg-blue-100 text-blue-800',
  DIRTY:        'bg-yellow-100 text-yellow-800',
  CLEANING:     'bg-cyan-100 text-cyan-800',
  INSPECTING:   'bg-purple-100 text-purple-800',
  MAINTENANCE:  'bg-orange-100 text-orange-800',
  OUT_OF_ORDER: 'bg-red-100 text-red-800',
}

export const ROOM_STATUS_DOT: Record<RoomStatus, string> = {
  AVAILABLE:    'bg-emerald-500',
  OCCUPIED:     'bg-blue-500',
  DIRTY:        'bg-yellow-500',
  CLEANING:     'bg-cyan-500',
  INSPECTING:   'bg-purple-500',
  MAINTENANCE:  'bg-orange-500',
  OUT_OF_ORDER: 'bg-red-500',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  PENDING:     'bg-gray-100 text-gray-700',
  ASSIGNED:    'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-cyan-100 text-cyan-700',
  COMPLETED:   'bg-emerald-100 text-emerald-700',
  CANCELLED:   'bg-red-100 text-red-700',
}

export const MAINT_STATUS_COLORS: Record<MaintenanceStatus, string> = {
  OPEN:        'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-orange-100 text-orange-700',
  COMPLETED:   'bg-emerald-100 text-emerald-700',
  CANCELLED:   'bg-gray-100 text-gray-700',
}

export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  LOW:    'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH:   'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
}

export const INSPECTION_COLORS: Record<InspectionResult, string> = {
  PASS:        'bg-emerald-100 text-emerald-700',
  FAIL:        'bg-red-100 text-red-700',
  CONDITIONAL: 'bg-yellow-100 text-yellow-700',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  MANAGER:     'Manager',
  SUPERVISOR:  'Supervisor',
  HOUSEKEEPER: 'Room Attendant',
  MAINTENANCE: 'Maintenance',
  RECEPTION:   'Reception',
}

export function canAssignTasks(role: UserRole)   { return ['MANAGER','SUPERVISOR'].includes(role) }
export function canManageUsers(role: UserRole)   { return role === 'MANAGER' }
export function canInspect(role: UserRole)       { return ['MANAGER','SUPERVISOR'].includes(role) }
export function canManageMaint(role: UserRole)   { return ['MANAGER','SUPERVISOR','MAINTENANCE'].includes(role) }

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
}
export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
}
export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
}
