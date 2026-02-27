import { useState, useEffect, useCallback } from 'react'
import { tasksApi } from '../api'

export default function ReworkPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await tasksApi.list({ status: 'Rework' })
      setTasks(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleApprove = async (task: any) => {
    if (!confirm(`Підтвердити переробку задачі #${task.id}?\n\nПрацівник отримає пуш і задача повернеться в його список.`)) return
    setApproving(task.id)
    try {
      await tasksApi.changeStatus(task.id, { status: 'InProgress' })
      await load()
    } catch (e: any) {
      alert('Помилка: ' + e.message)
    } finally {
      setApproving(null)
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">⚠️ Запити переробки</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading ? '...' : tasks.length === 0 ? 'Немає переробок' : `${tasks.length} задач очікують підтвердження`}
          </p>
        </div>
        <button onClick={load} className="btn-secondary text-sm">🔄 Оновити</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">👍</p>
          <p className="text-lg font-medium">Немає задач на переробці</p>
          <p className="text-sm mt-1">Всі задачі в порядку</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => {
            const dateStr = new Date(task.plannedDate).toLocaleDateString('uk-UA', {
              day: '2-digit', month: '2-digit', year: 'numeric'
            })
            const requestedAt = task.reworkRequestedAt
              ? new Date(task.reworkRequestedAt).toLocaleString('uk-UA', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                })
              : null

            return (
              <div
                key={task.id}
                className={`bg-white rounded-2xl border-2 border-orange-200 shadow-sm overflow-hidden ${approving === task.id ? 'opacity-60' : ''}`}
              >
                {/* Заголовок картки */}
                <div className="bg-orange-50 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg text-sm">
                      {task.type?.code}
                    </span>
                    <span className="text-gray-600 text-sm">{task.type?.label}</span>
                    <span className="text-gray-300">·</span>
                    <span className="font-semibold text-gray-800">{task.batch}</span>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-700">{task.cell}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">#{task.id}</span>
                </div>

                <div className="px-4 py-3 space-y-3">
                  {/* Метрики */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span>🔢 {task.qtyItems} шт.</span>
                    {task.impostsPerItem > 0 && <span>📐 {task.impostsPerItem} імп.</span>}
                    <span className="font-bold text-blue-700">💎 {task.sp} СП</span>
                    <span>📅 {dateStr}</span>
                  </div>

                  {/* Виконавець */}
                  {task.assignee && (
                    <div className="text-sm text-gray-600">
                      👷 <span className="font-medium">{task.assignee.firstName ?? task.assignee.username}</span>
                    </div>
                  )}

                  {/* Причина переробки */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs font-semibold text-amber-700 mb-1">📝 Причина переробки:</p>
                    <p className="text-sm text-amber-900">{task.reworkComment ?? '—'}</p>
                    {requestedAt && (
                      <p className="text-xs text-amber-500 mt-1.5">Запит: {requestedAt}</p>
                    )}
                  </div>

                  {/* Фото якщо є */}
                  {task.photoUrl && (
                    <a href={task.photoUrl} target="_blank" rel="noreferrer">
                      <img
                        src={task.photoUrl}
                        alt="фото"
                        className="w-full max-h-40 object-cover rounded-xl border border-gray-200 hover:opacity-90 transition-opacity"
                      />
                    </a>
                  )}

                  {/* Кнопка підтвердження */}
                  <button
                    onClick={() => handleApprove(task)}
                    disabled={approving === task.id}
                    className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
                  >
                    {approving === task.id ? '⏳ Підтверджую...' : '✅ Підтвердити переробку'}
                  </button>
                  <p className="text-xs text-gray-400 text-center -mt-1">
                    Задача повернеться до працівника, він отримає пуш-повідомлення
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
