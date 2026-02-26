import { useState, useEffect } from 'react'
import { getAdminTelegramId } from '../api'
import type { Task, Team } from '../types'
import clsx from 'clsx'

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-telegram-id': getAdminTelegramId(), ...options.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

export default function UnassignedPage() {
  const [tasks, setTasks] = useState<(Task & { sp: number; isOverdue: boolean })[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [tasksData, teamsData] = await Promise.all([
        apiFetch<Task[]>('/stats/unassigned'),
        apiFetch<Team[]>('/refs/teams'),
      ])
      setTasks(tasksData as any)
      setTeams(teamsData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAssign = async (taskId: number, teamId: number) => {
    setAssigning(taskId)
    try {
      await apiFetch(`/stats/unassigned/${taskId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ teamId }),
      })
      load()
    } finally {
      setAssigning(null)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">🔴 Нерозподілені задачі</h1>
        <button onClick={load} className="btn-secondary">🔄</button>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Задачі без призначеної бригади — виникають коли тип конструкції не має відповідної компетенції у жодного працівника.
      </p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">✅</p>
          <p className="text-gray-500">Всі задачі розподілені!</p>
        </div>
      ) : (
        <>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5 text-orange-700 text-sm">
            ⚠️ <strong>{tasks.length} задач</strong> не мають призначеної бригади. Призначте їх вручну нижче,
            або налаштуйте компетенції для типів у розділі "Довідники".
          </div>

          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['ID', 'Партія / Комірка', 'Тип', 'СП', 'Дата', 'Компетенція', 'Призначити бригаду'].map((h) => (
                    <th key={h} className="p-3 text-left text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tasks.map((task) => (
                  <tr key={task.id} className={clsx('hover:bg-gray-50', task.isOverdue && 'bg-red-50')}>
                    <td className="p-3 text-gray-400">#{task.id}</td>
                    <td className="p-3 font-medium">{task.batch} / {task.cell}</td>
                    <td className="p-3 text-gray-600">{task.type.label}</td>
                    <td className="p-3 font-bold">{task.sp}</td>
                    <td className={clsx('p-3 text-sm', task.isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500')}>
                      {new Date(task.plannedDate).toLocaleDateString('uk-UA')}
                      {task.isOverdue && ' ⚠️'}
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {task.type.code}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {teams.map((team) => (
                          <button
                            key={team.id}
                            onClick={() => handleAssign(task.id, team.id)}
                            disabled={assigning === task.id}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            {team.name}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
