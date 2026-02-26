// Telegram WebApp SDK типи
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string
        initDataUnsafe: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
          }
        }
        ready(): void
        expand(): void
        close(): void
        BackButton: { show(): void; hide(): void; onClick(fn: () => void): void }
        MainButton: {
          text: string
          show(): void
          hide(): void
          onClick(fn: () => void): void
          showProgress(): void
          hideProgress(): void
          setParams(p: { text?: string; is_active?: boolean }): void
        }
        themeParams: Record<string, string>
        colorScheme: 'light' | 'dark'
        hapticFeedback: {
          impactOccurred(style: 'light' | 'medium' | 'heavy'): void
          notificationOccurred(type: 'error' | 'success' | 'warning'): void
        }
      }
    }
  }
}

// Отримуємо Telegram ID поточного юзера
export function getTelegramId(): string {
  const tg = window.Telegram?.WebApp
  if (tg?.initDataUnsafe?.user?.id) {
    return String(tg.initDataUnsafe.user.id)
  }
  // Fallback для розробки в браузері (не в Telegram)
  return localStorage.getItem('dev_telegram_id') || '000000000'
}

// Базовий fetch з авторизацією
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const telegramId = getTelegramId()

  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-id': telegramId,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  return res.json()
}

// ─── Tasks ────────────────────────────────────────────────────
import type { Task, User, DailyStat, TypeStat, ConstructType, Competency, Team } from '../types'

export const tasksApi = {
  list: (params: Record<string, string | boolean> = {}) => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => q.set(k, String(v)))
    return apiFetch<Task[]>(`/tasks?${q}`)
  },

  get: (id: number) => apiFetch<Task>(`/tasks/${id}`),

  create: (data: {
    batch: string; cell: string; typeId: number
    qtyItems: number; impostsPerItem: number; plannedDate: string; teamId?: number
  }) => apiFetch<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: Partial<Task>) =>
    apiFetch<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  changeStatus: (id: number, data: {
    status: Task['status']
    lateComment?: string
    reworkComment?: string
  }) => apiFetch<Task>(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: number) => apiFetch(`/tasks/${id}`, { method: 'DELETE' }),

  bulkDate: (ids: number[], plannedDate: string) =>
    apiFetch('/tasks/bulk/date', { method: 'PATCH', body: JSON.stringify({ ids, plannedDate }) }),
}

// ─── Users ────────────────────────────────────────────────────
export const usersApi = {
  me: () => apiFetch<User>('/users/me'),
  list: () => apiFetch<User[]>('/users'),
  update: (id: number, data: {
    role?: string; teamId?: number | null; competencyIds?: number[]
  }) => apiFetch<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}

// ─── Stats ────────────────────────────────────────────────────
export const statsApi = {
  get: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params)
    return apiFetch<{ daily: DailyStat[]; byType: TypeStat[] }>(`/stats?${q}`)
  },
}

// ─── Refs ─────────────────────────────────────────────────────
export const refsApi = {
  types: () => apiFetch<ConstructType[]>('/refs/types'),
  competencies: () => apiFetch<Competency[]>('/refs/competencies'),
  teams: () => apiFetch<Team[]>('/refs/teams'),

  createType: (data: { name: string; competencyId: number }) =>
    apiFetch<ConstructType>('/refs/types', { method: 'POST', body: JSON.stringify(data) }),

  updateType: (id: number, data: { name?: string; competencyId?: number; isActive?: boolean }) =>
    apiFetch<ConstructType>(`/refs/types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  createCompetency: (data: { code: string; label: string }) =>
    apiFetch<Competency>('/refs/competencies', { method: 'POST', body: JSON.stringify(data) }),

  createTeam: (data: { name: string }) =>
    apiFetch<Team>('/refs/teams', { method: 'POST', body: JSON.stringify(data) }),
}
