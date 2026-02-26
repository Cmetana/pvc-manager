import { useState, useEffect } from 'react'
import { getAdminTelegramId } from '../api'
import clsx from 'clsx'

interface HelpRequest {
  id: number
  message: string
  category: string
  status: string
  createdAt: string
  user: { id: number; firstName: string | null; username: string | null; telegramId: string }
  task: { id: number; batch: string; cell: string } | null
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-telegram-id': getAdminTelegramId(), ...options.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

const CATEGORY_LABELS: Record<string, string> = {
  materials: '🧱 Матеріали',
  drawing: '📐 Креслення',
  question: '❓ Питання',
  other: '💬 Інше',
}

export default function HelpPage() {
  const [requests, setRequests] = useState<HelpRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'sent' | 'resolved' | ''>('')

  const load = async () => {
    setLoading(true)
    try {
      const params = filter ? `?status=${filter}` : ''
      const data = await apiFetch<HelpRequest[]>(`/help${params}`)
      setRequests(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  const handleResolve = async (id: number) => {
    await apiFetch(`/help/${id}/resolve`, { method: 'PATCH' })
    load()
  }

  const pending = requests.filter((r) => r.status === 'sent').length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🆘 Запити допомоги</h1>
          {pending > 0 && (
            <span className="text-sm text-orange-600 font-medium">{pending} нових запитів</span>
          )}
        </div>
        <button onClick={load} className="btn-secondary">🔄 Оновити</button>
      </div>

      {/* Фільтр */}
      <div className="flex gap-2 mb-5">
        {[
          { key: '', label: 'Всі' },
          { key: 'sent', label: '🔴 Нові' },
          { key: 'resolved', label: '✅ Закриті' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === f.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🆘</p>
          <p>Запитів немає</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className={clsx(
                'card border',
                req.status === 'sent' ? 'border-orange-200 bg-orange-50' : 'border-gray-100'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">#{req.id}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      {CATEGORY_LABELS[req.category] ?? req.category}
                    </span>
                    {req.status === 'resolved' && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">✅ Закрито</span>
                    )}
                  </div>

                  <p className="text-gray-800 mb-3 leading-relaxed">{req.message}</p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span>
                      👤 <strong>{req.user.firstName ?? req.user.username ?? req.user.telegramId}</strong>
                      {req.user.username && ` @${req.user.username}`}
                    </span>
                    {req.task && (
                      <span>
                        📋 Задача <strong>#{req.task.id}</strong> {req.task.batch}/{req.task.cell}
                      </span>
                    )}
                    <span>
                      🕐 {new Date(req.createdAt).toLocaleString('uk-UA', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                {req.status === 'sent' && (
                  <button
                    onClick={() => handleResolve(req.id)}
                    className="shrink-0 btn-secondary text-xs py-1.5"
                  >
                    ✅ Закрити
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
