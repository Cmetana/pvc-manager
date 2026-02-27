import { useState, useEffect, useCallback } from 'react'
import { tasksApi } from '../api/client'
import type { Task, User } from '../types'
import TaskCard from '../components/TaskCard'
import DateFilter, { getDateRange } from '../components/DateFilter'
import type { DateFilter as DateFilterType } from '../components/DateFilter'
import clsx from 'clsx'

interface Props { user: User }

const STATUS_FILTERS = [
  { key: '', label: 'Всі' },
  { key: 'New', label: '🆕 Нові' },
  { key: 'InProgress', label: '🔧 В роботі' },
  { key: 'Rework', label: '⚠️ Переробка' },
  { key: 'Done', label: '✅ Виконано' },
]

export default function PoolPage({ user }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today')
  const [customDate, setCustomDate] = useState<string>()
  const [statusFilter, setStatusFilter] = useState('New')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const range = getDateRange(dateFilter, customDate)
      const params: Record<string, string> = {
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
      }
      if (statusFilter) params.status = statusFilter
      const data = await tasksApi.list(params)
      setTasks(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [dateFilter, customDate, statusFilter])

  useEffect(() => { load() }, [load])

  const handleAction = async (task: Task, action: 'take' | 'done' | 'rework' | 'help') => {
    if (action !== 'take') return
    setActionLoading(task.id)
    try {
      await tasksApi.changeStatus(task.id, { status: 'InProgress' })
      window.Telegram?.WebApp.hapticFeedback?.notificationOccurred('success')
      await load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const totalSP = tasks.reduce((s, t) => s + t.sp, 0)

  return (
    <div className="p-4 space-y-4">
      {/* Заголовок */}
      <div>
        <h1 className="text-xl font-bold text-tg-text">Пул задач</h1>
        {user.team && (
          <p className="text-sm text-tg-hint">{user.team.name}</p>
        )}
      </div>

      {/* Блок командних задач */}
      <div className="rounded-xl bg-blue-50 px-3 pt-2.5 pb-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-3.5 bg-blue-500 rounded-full" />
          <span className="text-xs font-bold text-blue-600 tracking-wide uppercase">
            Командні задачі
          </span>
        </div>

        {/* Фільтр по даті */}
        <DateFilter
          value={dateFilter}
          customDate={customDate}
          onChange={(f, d) => { setDateFilter(f); setCustomDate(d) }}
        />

        {/* Фільтр по статусу */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={clsx(
                'shrink-0 px-3 py-1 rounded-full text-xs font-medium',
                statusFilter === s.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-tg-hint border border-blue-100'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Підсумок */}
      {!loading && tasks.length > 0 && (
        <div className="flex gap-4 text-sm text-tg-hint">
          <span>Задач: <b className="text-tg-text">{tasks.length}</b></span>
          <span>Всього СП: <b className="text-tg-text">{totalSP}</b></span>
        </div>
      )}

      {/* Список */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-3 border-tg-button border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-10 text-red-500">{error}</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 text-tg-hint">
          <p className="text-4xl mb-3">📭</p>
          <p>Задач не знайдено</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className={actionLoading === task.id ? 'opacity-60 pointer-events-none' : ''}>
              <TaskCard task={task} mode="pool" onTake={(t) => handleAction(t, 'take')} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
