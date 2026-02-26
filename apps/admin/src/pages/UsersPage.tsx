import { useState, useEffect } from 'react'
import { usersApi, refsApi } from '../api'
import type { User, Team } from '../types'
import clsx from 'clsx'

interface ConstructType { id: number; code: string; label: string }

const ROLE_LABELS: Record<string, string> = {
  admin: '👑 Адмін', worker: '👷 Працівник', banned: '🚫 Заблок.', pending: '⏳ Очікує'
}
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700', worker: 'bg-blue-100 text-blue-700',
  banned: 'bg-red-100 text-red-700', pending: 'bg-yellow-100 text-yellow-700',
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [types, setTypes] = useState<ConstructType[]>([])
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({ role: '', teamId: '', typeIds: [] as number[] })
  const [saving, setSaving] = useState(false)

  const load = () => {
    usersApi.list().then(setUsers)
    refsApi.teams().then(setTeams as any)
    refsApi.types().then(setTypes as any)
  }

  useEffect(load, [])

  const pending = users.filter((u) => u.role === 'pending')
  const active  = users.filter((u) => u.role !== 'pending')

  const startEdit = (u: User) => {
    setEditing(u)
    setForm({
      role: u.role,
      teamId: u.teamId ? String(u.teamId) : '',
      // typeIds з competencies (нова структура: competency → type)
      typeIds: (u.competencies as any[]).map((c: any) => c.type?.id ?? c.competency?.id).filter(Boolean),
    })
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const updated = await (usersApi.update(editing.id, {
        role: form.role,
        teamId: form.teamId ? Number(form.teamId) : null,
        typeIds: form.typeIds,  // ← нова назва замість competencyIds
      } as any) as any)
      setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u))
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  const toggleType = (id: number) => {
    setForm((prev) => ({
      ...prev,
      typeIds: prev.typeIds.includes(id) ? prev.typeIds.filter((x) => x !== id) : [...prev.typeIds, id],
    }))
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">👥 Користувачі</h1>

      {/* Лист очікування */}
      {pending.length > 0 && (
        <div className="card mb-5 border-yellow-200 bg-yellow-50">
          <h2 className="font-semibold text-yellow-800 mb-3">⏳ Лист очікування ({pending.length})</h2>
          <div className="space-y-2">
            {pending.map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3">
                <div>
                  <span className="font-medium">{u.firstName ?? 'Без імені'}</span>
                  {u.username && <span className="text-gray-400 ml-2">@{u.username}</span>}
                  <span className="text-gray-300 mx-2">·</span>
                  <span className="text-xs text-gray-400">ID: {u.telegramId}</span>
                </div>
                <button onClick={() => startEdit(u)} className="btn-primary text-xs py-1">Призначити →</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Таблиця */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Користувач', 'Роль', 'Бригада', 'Компетенції (типи)', 'Дії'].map((h) => (
                <th key={h} className="p-3 text-left text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {active.map((u) => {
              const userTypes: ConstructType[] = (u.competencies as any[])
                .map((c: any) => c.type ?? c.competency)
                .filter(Boolean)
              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-medium">{u.firstName ?? '—'}</div>
                    {u.username && <div className="text-xs text-gray-400">@{u.username}</div>}
                  </td>
                  <td className="p-3">
                    <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', ROLE_COLORS[u.role])}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500">{u.team?.name ?? '—'}</td>
                  <td className="p-3">
                    {userTypes.length === 0 ? (
                      <span className="text-gray-300 text-xs italic">не призначено</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {userTypes.map((t) => (
                          <span key={t.id} className="inline-flex items-center px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono font-bold">
                            {t.code}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <button onClick={() => startEdit(u)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs">✏️</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Модалка редагування */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b">
              <h2 className="font-bold text-lg">{editing.firstName ?? editing.username ?? 'Користувач'}</h2>
              <p className="text-xs text-gray-400">ID: {editing.telegramId}</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Роль */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Роль</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="admin">👑 Адмін</option>
                  <option value="worker">👷 Працівник</option>
                  <option value="banned">🚫 Заблокувати</option>
                </select>
              </div>

              {/* Бригада */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Бригада</label>
                <select className="input" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
                  <option value="">— Без бригади —</option>
                  {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {/* Компетенції (типи конструкцій) */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Компетенції — які типи може виконувати
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Тільки задачі цих типів будуть доступні для взяття
                </p>
                <div className="flex flex-wrap gap-2">
                  {types.map((t: ConstructType) => (
                    <button key={t.id} onClick={() => toggleType(t.id)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                        form.typeIds.includes(t.id)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      )}>
                      <span className="font-mono font-bold">{t.code}</span>
                      <span className="text-xs ml-1 opacity-75">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t flex gap-3">
              <button onClick={() => setEditing(null)} className="btn-secondary flex-1">Скасувати</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Збереження...' : 'Зберегти'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
