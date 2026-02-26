import { useState, useEffect } from 'react'
import { refsApi } from '../api'
import clsx from 'clsx'

interface ConstructType { id: number; code: string; label: string; isActive: boolean }
interface Team { id: number; name: string; teamTypes: { type: ConstructType }[] }

type Tab = 'types' | 'teams'

export default function RefsPage() {
  const [tab, setTab] = useState<Tab>('types')
  const [types, setTypes] = useState<ConstructType[]>([])
  const [teams, setTeams] = useState<Team[]>([])

  const load = async () => {
    const [t, tm] = await Promise.all([
      refsApi.types() as Promise<ConstructType[]>,
      refsApi.teams() as Promise<Team[]>,
    ])
    setTypes(t)
    setTeams(tm)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">📚 Довідники</h1>

      <div className="flex gap-2 mb-6">
        {[{ key: 'types', l: '🏗 Типи конструкцій' }, { key: 'teams', l: '👥 Бригади' }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as Tab)}
            className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === t.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            )}>{t.l}</button>
        ))}
      </div>

      {tab === 'types' && <TypesTab types={types} onRefresh={load} />}
      {tab === 'teams' && <TeamsTab teams={teams} types={types} onRefresh={load} />}
    </div>
  )
}

// ─── Типи конструкцій ─────────────────────────────────────────
function TypesTab({ types, onRefresh }: { types: ConstructType[]; onRefresh: () => void }) {
  const [editing, setEditing] = useState<ConstructType | null>(null)
  const [newCode, setNewCode] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!newCode.trim() || !newLabel.trim()) return
    setSaving(true)
    try {
      await refsApi.createType({ code: newCode, label: newLabel } as any)
      setNewCode(''); setNewLabel('')
      onRefresh()
    } finally { setSaving(false) }
  }

  const handleEdit = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await refsApi.updateType(editing.id, { code: editing.code, label: editing.label })
      setEditing(null)
      onRefresh()
    } finally { setSaving(false) }
  }

  const handleToggle = async (t: ConstructType) => {
    await refsApi.updateType(t.id, { isActive: !t.isActive })
    onRefresh()
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Форма додавання */}
      <div className="card">
        <h3 className="font-semibold mb-3 text-sm text-gray-600">Додати тип</h3>
        <div className="flex gap-3">
          <div className="w-28">
            <label className="block text-xs text-gray-500 mb-1">Код</label>
            <input className="input font-mono uppercase" placeholder="K" maxLength={5}
              value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Назва</label>
            <input className="input" placeholder="Трапеція"
              value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
          </div>
          <div className="flex items-end">
            <button onClick={handleCreate} disabled={saving || !newCode || !newLabel}
              className="btn-primary h-[38px] px-5">
              + Додати
            </button>
          </div>
        </div>
      </div>

      {/* Список */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left text-gray-500 font-medium w-28">Код</th>
              <th className="p-3 text-left text-gray-500 font-medium">Назва</th>
              <th className="p-3 text-left text-gray-500 font-medium w-32">Статус</th>
              <th className="p-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {types.map((t) => (
              <tr key={t.id} className={clsx('hover:bg-gray-50', !t.isActive && 'opacity-50')}>
                {editing?.id === t.id ? (
                  <>
                    <td className="p-2">
                      <input className="input font-mono uppercase text-sm w-full"
                        value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} />
                    </td>
                    <td className="p-2">
                      <input className="input text-sm w-full"
                        value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleEdit()} />
                    </td>
                    <td className="p-2"></td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <button onClick={handleEdit} disabled={saving}
                          className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">✓</button>
                        <button onClick={() => setEditing(null)}
                          className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-300">✕</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-3 font-mono font-bold text-blue-700">{t.code}</td>
                    <td className="p-3 font-medium">{t.label}</td>
                    <td className="p-3">
                      <button onClick={() => handleToggle(t)}
                        className={clsx('text-xs px-2 py-1 rounded-full font-medium',
                          t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {t.isActive ? '✅ Активний' : '⛔ Вимкнено'}
                      </button>
                    </td>
                    <td className="p-3">
                      <button onClick={() => setEditing(t)}
                        className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded">✏️</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Бригади ──────────────────────────────────────────────────
function TeamsTab({ teams, types, onRefresh }: { teams: Team[]; types: ConstructType[]; onRefresh: () => void }) {
  const [editing, setEditing] = useState<{ id: number; name: string; typeIds: number[] } | null>(null)
  const [newName, setNewName] = useState('')
  const [newTypeIds, setNewTypeIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  const toggleType = (typeId: number, arr: number[], setter: (v: number[]) => void) => {
    setter(arr.includes(typeId) ? arr.filter((x) => x !== typeId) : [...arr, typeId])
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await refsApi.createTeam({ name: newName, typeIds: newTypeIds } as any)
      setNewName(''); setNewTypeIds([])
      onRefresh()
    } finally { setSaving(false) }
  }

  const startEdit = (team: Team) => {
    setEditing({ id: team.id, name: team.name, typeIds: team.teamTypes.map((tt) => tt.type.id) })
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await refsApi.updateTeam(editing.id, { name: editing.name, typeIds: editing.typeIds })
      setEditing(null); onRefresh()
    } finally { setSaving(false) }
  }

  const activeTypes = types.filter((t) => t.isActive)

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Форма нової бригади */}
      <div className="card">
        <h3 className="font-semibold mb-3 text-sm text-gray-600">Нова бригада</h3>
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Назва бригади</label>
            <input className="input" placeholder="Команда K"
              value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button onClick={handleCreate} disabled={saving || !newName || newTypeIds.length === 0}
              className="btn-primary h-[38px] px-5">+ Додати</button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-2">Типи конструкцій</label>
          <div className="flex flex-wrap gap-2">
            {activeTypes.map((t) => (
              <button key={t.id} onClick={() => toggleType(t.id, newTypeIds, setNewTypeIds)}
                className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                  newTypeIds.includes(t.id)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300')}>
                <span className="font-mono font-bold">{t.code}</span>
                <span className="ml-1 text-xs opacity-70">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Список бригад */}
      <div className="space-y-3">
        {teams.map((team) => (
          <div key={team.id} className="card">
            {editing?.id === team.id ? (
              <div>
                <input className="input mb-3 font-semibold"
                  value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                <div>
                  <p className="text-xs text-gray-500 mb-2">Типи конструкцій:</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {activeTypes.map((t) => (
                      <button key={t.id}
                        onClick={() => setEditing({ ...editing, typeIds: editing.typeIds.includes(t.id) ? editing.typeIds.filter((x) => x !== t.id) : [...editing.typeIds, t.id] })}
                        className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                          editing.typeIds.includes(t.id)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300')}>
                        <span className="font-mono font-bold">{t.code}</span>
                        <span className="ml-1 text-xs opacity-70">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving} className="btn-primary">💾 Зберегти</button>
                  <button onClick={() => setEditing(null)} className="btn-secondary">Скасувати</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{team.name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {team.teamTypes.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">Типи не призначено</span>
                    ) : team.teamTypes.map((tt) => (
                      <span key={tt.type.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                        <span className="font-mono font-bold">{tt.type.code}</span>
                        <span className="text-blue-500">{tt.type.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={() => startEdit(team)}
                  className="btn-secondary text-xs py-1.5">✏️ Редагувати</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
