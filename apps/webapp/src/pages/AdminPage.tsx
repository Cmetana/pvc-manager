import { useState, useEffect, useCallback } from 'react'
import { tasksApi } from '../api/client'
import type { Task } from '../types'

export default function AdminPage() {
  const [reworks, setReworks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await tasksApi.list({ status: 'Rework' })
      setReworks(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleApprove = async (task: Task) => {
    setApproving(task.id)
    try {
      await tasksApi.changeStatus(task.id, { status: 'InProgress' })
      window.Telegram?.WebApp.hapticFeedback?.notificationOccurred('success')
      await load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setApproving(null)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-tg-text">👑 Адмін</h1>
        <p className="text-sm text-tg-hint">Запити переробки</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-3 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reworks.length === 0 ? (
        <div className="text-center py-16 text-tg-hint">
          <p className="text-4xl mb-3">👍</p>
          <p>Немає задач на переробці</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reworks.map((task) => {
            const dateStr = new Date(task.plannedDate).toLocaleDateString('uk-UA', {
              day: '2-digit', month: '2-digit',
            })
            const requestedAt = task.reworkRequestedAt
              ? new Date(task.reworkRequestedAt).toLocaleString('uk-UA', {
                  day: '2-digit', month: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                })
              : null

            return (
              <div
                key={task.id}
                style={{
                  background: 'var(--tg-theme-bg-color, #fff)',
                  borderRadius: 16,
                  border: '2px solid #FDE68A',
                  padding: '12px 14px',
                  opacity: approving === task.id ? 0.6 : 1,
                }}
              >
                {/* Заголовок */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                      background: '#EFF6FF', color: '#1D4ED8',
                      padding: '2px 8px', borderRadius: 8,
                    }}>
                      {task.type?.code}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #888)' }}>
                      {task.type?.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--tg-theme-hint-color, #888)', fontFamily: 'monospace' }}>
                    #{task.id}
                  </span>
                </div>

                {/* Партія / Комірка */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{task.batch}</span>
                  <span style={{ color: '#9CA3AF' }}>/</span>
                  <span style={{ fontSize: 15 }}>{task.cell}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--tg-theme-hint-color, #888)' }}>
                    📅 {dateStr}
                  </span>
                </div>

                {/* Виконавець */}
                {task.assignee && (
                  <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #888)', marginBottom: 8 }}>
                    👷 {task.assignee.firstName ?? task.assignee.username}
                  </p>
                )}

                {/* Причина переробки */}
                <div style={{
                  background: '#FFFBEB', border: '1px solid #FDE68A',
                  borderRadius: 10, padding: '8px 10px', marginBottom: 10,
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 2 }}>
                    ⚠️ Причина переробки:
                  </p>
                  <p style={{ fontSize: 13, color: '#92400E', margin: 0 }}>
                    {task.reworkComment}
                  </p>
                  {requestedAt && (
                    <p style={{ fontSize: 11, color: '#B45309', marginTop: 4, margin: 0 }}>
                      Запит: {requestedAt}
                    </p>
                  )}
                </div>

                {/* Фото */}
                {task.photoUrl && (
                  <img
                    src={task.photoUrl}
                    alt="фото"
                    style={{
                      width: '100%', maxHeight: 140, objectFit: 'cover',
                      borderRadius: 10, marginBottom: 10, border: '1px solid #E5E7EB',
                    }}
                  />
                )}

                {/* Кнопка підтвердження */}
                <button
                  onClick={() => handleApprove(task)}
                  disabled={approving === task.id}
                  style={{
                    width: '100%', background: approving === task.id ? '#9CA3AF' : '#10B981',
                    color: '#fff', border: 'none', borderRadius: 12,
                    padding: '12px 16px', fontSize: 15, fontWeight: 700,
                    cursor: approving === task.id ? 'not-allowed' : 'pointer',
                  }}
                >
                  {approving === task.id ? '⏳ Підтверджую...' : '✅ Підтвердити — повернути в роботу'}
                </button>
                <p style={{ fontSize: 11, color: 'var(--tg-theme-hint-color, #888)', textAlign: 'center', marginTop: 6, marginBottom: 0 }}>
                  Працівник отримає пуш-повідомлення
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
