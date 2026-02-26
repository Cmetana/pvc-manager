export interface ConstructType {
  id: number; code: string; label: string; isActive: boolean
}
export interface TeamType {
  type: ConstructType
}
export interface Team {
  id: number; name: string
  teamTypes: TeamType[]
}
export interface UserCompetency {
  type: ConstructType
}
export interface User {
  id: number; telegramId: string; username?: string
  firstName?: string; lastName?: string
  role: 'admin' | 'worker' | 'banned' | 'pending'
  teamId?: number; team?: Team
  competencies: UserCompetency[]
  createdAt: string
}
export interface Task {
  id: number; batch: string; cell: string
  typeId: number; type: ConstructType
  qtyItems: number; impostsPerItem: number
  plannedDate: string; status: string
  teamId?: number; team?: Team
  assigneeUserId?: number; assignee?: { id: number; firstName?: string; username?: string }
  description?: string; photoUrl?: string
  sp: number; isOverdue: boolean
  lateComment?: string; reworkComment?: string
  createdAt: string
}
export interface DailyStat { date: string; plan: number; fact: number; diff: number; hoursPerSP?: number }
export interface TypeStat  { typeId: number; name: string; sp: number; items: number }
// compat
export interface Competency { id: number; code: string; label: string }
