export function getAdminTelegramId(): string {
  return localStorage.getItem('admin_telegram_id') || ''
}
export function setAdminTelegramId(id: string) {
  localStorage.setItem('admin_telegram_id', id)
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      'x-telegram-id': getAdminTelegramId(),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export * from './types'

export const tasksApi = {
  list:   (params: Record<string,string> = {}) => apiFetch<any[]>(`/tasks?${new URLSearchParams(params)}`),
  get:    (id: number) => apiFetch<any>(`/tasks/${id}`),
  create: (data: any) => apiFetch<any>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => apiFetch<any>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch(`/tasks/${id}`, { method: 'DELETE' }),
  changeStatus: (id: number, data: any) => apiFetch<any>(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  bulkDate: (ids: number[], plannedDate: string) => apiFetch('/tasks/bulk/date', { method: 'PATCH', body: JSON.stringify({ ids, plannedDate }) }),
  uploadPhoto: async (taskId: number, file: File): Promise<{ photoUrl: string }> => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/tasks/${taskId}/photo`, {
      method: 'POST',
      headers: { 'x-telegram-id': getAdminTelegramId() },
      body: fd,
    })
    if (!res.ok) throw new Error('Помилка завантаження фото')
    return res.json()
  },
}

export const usersApi = {
  me:     () => apiFetch<any>('/users/me'),
  list:   () => apiFetch<any[]>('/users'),
  update: (id: number, data: any) => apiFetch<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}

export const refsApi = {
  types:      () => apiFetch<any[]>('/refs/types'),
  teams:      () => apiFetch<any[]>('/refs/teams'),
  teamsForType: (typeId: number) => apiFetch<any[]>(`/refs/teams/for-type/${typeId}`),
  createType: (data: any) => apiFetch<any>('/refs/types', { method: 'POST', body: JSON.stringify(data) }),
  updateType: (id: number, data: any) => apiFetch<any>(`/refs/types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  createTeam: (data: any) => apiFetch<any>('/refs/teams', { method: 'POST', body: JSON.stringify(data) }),
  updateTeam: (id: number, data: any) => apiFetch<any>(`/refs/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}

export const statsApi = {
  get: (params: Record<string,string> = {}) =>
    apiFetch<{ daily: any[]; byType: any[] }>(`/stats?${new URLSearchParams(params)}`),
}
