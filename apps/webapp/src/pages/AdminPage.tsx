import { useState, useEffect, useCallback } from 'react'
import { tasksApi } from '../api/client'
import type { Task } from '../types'
import TaskCard from '../components/TaskCard'

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
    <div className="p-3 space-y-3">
      <div className="rounded-xl bg-orange-50 px-3 pt-2.5 pb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-3.5 bg-orange-500 rounded-full shrink-0" />
          <span className="text-xs font-bold text-orange-600 tracking-wide uppercase">Брак / Переробка</span>
          {!loading && reworks.length > 0 && (
            <span className="text-xs text-orange-400 ml-auto">{reworks.length} зад.</span>
          )}
        </div>
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
        <div>
          {reworks.map((task) => (
            <div key={task.id} className={approving === task.id ? 'opacity-60 pointer-events-none' : ''}>
              <TaskCard task={task} mode="admin" onApprove={handleApprove} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
