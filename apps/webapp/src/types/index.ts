export type Role = 'admin' | 'worker' | 'banned' | 'pending'
export type TaskStatus = 'New' | 'InProgress' | 'Rework' | 'Done'

export interface Team { id: number; name: string }

export interface ConstructType {
  id: number; code: string; label: string; isActive: boolean
}

export interface User {
  id: number; telegramId: string
  username: string | null; firstName: string | null; lastName: string | null
  role: Role; teamId: number | null; team: Team | null
  competencies: { type: ConstructType }[]
}

export interface Task {
  id: number; batch: string; cell: string
  typeId: number; type: ConstructType
  qtyItems: number; impostsPerItem: number
  plannedDate: string; status: TaskStatus
  teamId: number | null; team: Team | null
  assigneeUserId: number | null
  assignee: { id: number; firstName: string | null; username: string | null } | null
  description: string | null; photoUrl: string | null
  createdAt: string; doneAt: string | null
  lateComment: string | null; reworkComment: string | null
  reworkRequestedAt: string | null; reworkApprovedAt: string | null; reworkDoneAt: string | null
  sp: number; isOverdue: boolean
}

export interface DailyStat { date: string; plan: number; fact: number; diff: number; hoursPerSP: number | null }
export interface TypeStat  { typeId: number; name: string; sp: number; items: number }
