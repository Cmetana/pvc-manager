import { useState, useEffect, useCallback } from 'react'
import { tasksApi } from '../api/client'
import type { Task, User } from '../types'
import TaskCard from '../components/TaskCard'
import CommentModal from '../components/CommentModal'
import clsx from 'clsx'

interface Props { user: User }

type Tab = 'InProgress' | 'Rework' | 'Done'

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'InProgress', label: 'В роботі', emoji: '🔧' },
  { key: 'Rework',     label: 'Переробка', emoji: '⚠️' },
  { key: 'Done',       label: 'Виконано',  emoji: '✅' },
]

type ModalState =
  | { type: 'late'; task: Task }
  | { type: 'rework'; task: Task }
  | null

export default function MyTasksPage({}: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('InProgress')
  const [modal, setModal] = useState<ModalState>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await tasksApi.list({ mine: true })
      setTasks(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = tasks.filter((t) => t.status === tab)

  const handleAction = async (task: Task, action: 'done' | 'rework') => {
    if (action === 'done') {
      if (task.isOverdue) {
        setModal({ type: 'late', task })
      } else {
        await doMarkDone(task, '')
      }
    } else if (action === 'rework') {
      setModal({ type: 'rework', task })
    }
  }

  const doMarkDone = async (task: Task, lateComment: string) => {
    setActionLoading(task.id)
    try {
      await tasksApi.changeStatus(task.id, {
        status: 'Done',
        ...(lateComment ? { lateComment } : {}),
      })
      window.Telegram?.WebApp.hapticFeedback?.notificationOccurred('success')
      setModal(null)
      await load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const doRework = async (task: Task, reworkComment: string) => {
    setActionLoading(task.id)
    try {
      await tasksApi.changeStatus(task.id, { status: 'Rework', reworkComment })
      window.Telegram?.WebApp.hapticFeedback?.notificationOccurred('warning')
      setModal(null)
      await load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  // Таб кунти
  const counts: Record<Tab, number> = {
    InProgress: tasks.filter((t) => t.status === 'InProgress').length,
    Rework: tasks.filter((t) => t.status === 'Rework').length,
    Done: tasks.filter((t) => t.status === 'Done').length,
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-tg-text">Мої задачі</h1>

      {/* Таби */}
      <div className="flex gap-1 bg-tg-secondary rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'flex-1 py-2 rounded-lg text-sm font-medium transition-colors relative',
              tab === t.key
                ? 'bg-tg-bg text-tg-text shadow-sm'
                : 'text-tg-hint'
            )}
          >
            {t.emoji} {t.label}
            {counts[t.key] > 0 && (
              <span className={clsx(
                'absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1',
                t.key === 'Rework' ? 'bg-orange-400 text-white' : 'bg-tg-button text-white'
              )}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Список */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-3 border-tg-button border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-tg-hint">
          <p className="text-4xl mb-3">
            {tab === 'InProgress' ? '😴' : tab === 'Rework' ? '👍' : '📝'}
          </p>
          <p>
            {tab === 'InProgress' ? 'Немає активних задач' :
             tab === 'Rework' ? 'Немає задач на переробці' : 'Немає виконаних задач'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => (
            <div key={task.id} className={actionLoading === task.id ? 'opacity-60 pointer-events-none' : ''}>
              <TaskCard
                task={task}
                mode="my"
                onDone={(t)   => handleAction(t, 'done')}
                onRework={(t) => handleAction(t, 'rework')}
              />
            </div>
          ))}
        </div>
      )}

      {/* Модалки */}
      {modal?.type === 'late' && (
        <CommentModal
          title="⚠️ Задача прострочена"
          placeholder="Вкажіть причину прострочки..."
          onConfirm={(comment) => doMarkDone(modal.task, comment)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === 'rework' && (
        <CommentModal
          title="⚠️ Відправити на переробку"
          placeholder="Опишіть причину переробки..."
          onConfirm={(comment) => doRework(modal.task, comment)}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}
