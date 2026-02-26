import { useState, useEffect, useCallback, useRef } from 'react'
import { tasksApi, refsApi } from '../api'
import clsx from 'clsx'

const STATUS_LABELS: Record<string, string> = {
  New: '🆕 Нове', InProgress: '🔧 В роботі', Rework: '⚠️ Переробка', Done: '✅ Виконано'
}
const STATUS_COLORS: Record<string, string> = {
  New: 'bg-gray-100 text-gray-700', InProgress: 'bg-blue-100 text-blue-700',
  Rework: 'bg-orange-100 text-orange-700', Done: 'bg-green-100 text-green-700',
}

export default function TasksPage() {
  const [tasks, setTasks]   = useState<any[]>([])
  const [types, setTypes]   = useState<any[]>([])
  const [teams, setTeams]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<any | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkModal, setBulkModal] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<{ task: any } | null>(null)

  const [fStatus, setFStatus]     = useState('')
  const [fTeam, setFTeam]         = useState('')
  const [fDateFrom, setFDateFrom] = useState('')
  const [fDateTo, setFDateTo]     = useState('')
  const [fOverdue, setFOverdue]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p: Record<string, string> = {}
      if (fStatus)  p.status   = fStatus
      if (fTeam)    p.teamId   = fTeam
      if (fDateFrom) p.dateFrom = fDateFrom
      if (fDateTo)   p.dateTo   = fDateTo
      if (fOverdue)  p.overdue  = 'true'
      setTasks(await tasksApi.list(p))
    } finally { setLoading(false) }
  }, [fStatus, fTeam, fDateFrom, fDateTo, fOverdue])

  useEffect(() => {
    load()
    refsApi.types().then(setTypes)
    refsApi.teams().then(setTeams)
  }, [load])

  const toggleSelect = (id: number) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleDelete = async (id: number) => {
    if (!confirm('Видалити задачу?')) return
    await tasksApi.delete(id); load()
  }

  const handleApproveRework = async (id: number) => {
    await tasksApi.changeStatus(id, { status: 'InProgress' }); load()
  }

  const totalSP = tasks.reduce((s, t) => s + (t.sp ?? 0), 0)

  return (
    <div className="p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">📋 Задачі</h1>
          <p className="text-gray-500 text-sm mt-0.5">{tasks.length} задач · {totalSP} СП</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={() => setBulkModal(true)} className="btn-secondary">
              📅 Дата ({selected.size})
            </button>
          )}
          <button onClick={() => { setEditing(null); setModal('create') }} className="btn-primary">
            + Нова задача
          </button>
        </div>
      </div>

      {/* Фільтри */}
      <div className="card mb-5 flex flex-wrap gap-3 items-center">
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="input w-36">
          <option value="">Всі статуси</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={fTeam} onChange={e => setFTeam(e.target.value)} className="input w-40">
          <option value="">Всі бригади</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} className="input w-38" />
        <input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} className="input w-38" />
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={fOverdue} onChange={e => setFOverdue(e.target.checked)} />
          Прострочені
        </label>
        <button onClick={load} className="btn-secondary">🔄</button>
      </div>

      {/* Таблиця */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 w-8">
                  <input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(tasks.map(t => t.id)) : new Set())} />
                </th>
                {['Фото', 'ID', 'Партія / Комірка', 'Тип', 'Кіл-ть · СП', 'Дата', 'Статус', 'Бригада', 'Дії'].map(h => (
                  <th key={h} className="p-3 text-left text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tasks.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">Задач не знайдено</td></tr>
              )}
              {tasks.map(task => (
                <tr key={task.id} className={clsx('hover:bg-gray-50', task.isOverdue && 'bg-red-50')}>
                  <td className="p-3">
                    <input type="checkbox" checked={selected.has(task.id)} onChange={() => toggleSelect(task.id)} />
                  </td>

                  {/* Мініатюра фото */}
                  <td className="p-2">
                    {task.photoUrl ? (
                      <button onClick={() => setPhotoPreview({ task })} className="block">
                        <img
                          src={task.photoUrl}
                          alt="фото"
                          className="w-10 h-10 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                        />
                      </button>
                    ) : (
                      <div className="w-10 h-10 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-lg">
                        📷
                      </div>
                    )}
                  </td>

                  <td className="p-3 text-gray-400 font-mono">#{task.id}</td>
                  <td className="p-3 font-semibold">
                    {task.batch}<span className="text-gray-400"> / </span>{task.cell}
                    {task.description && (
                      <p className="text-xs text-gray-400 font-normal mt-0.5 max-w-[160px] truncate">{task.description}</p>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="font-mono font-bold text-blue-700">{task.type?.code}</span>
                    <span className="text-gray-500 ml-1 text-xs">{task.type?.label}</span>
                  </td>
                  <td className="p-3">
                    <span className="font-medium">{task.qtyItems}</span>
                    <span className="text-gray-400 mx-1">шт.</span>
                    <span className="font-bold text-blue-600">{task.sp} СП</span>
                  </td>
                  <td className={clsx('p-3 text-sm', task.isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600')}>
                    {new Date(task.plannedDate).toLocaleDateString('uk-UA')}
                    {task.isOverdue && ' ⚠️'}
                  </td>
                  <td className="p-3">
                    <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[task.status])}>
                      {STATUS_LABELS[task.status]}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500">{task.team?.name ?? '—'}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(task); setModal('edit') }}
                        className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs" title="Редагувати">✏️</button>
                      {task.status === 'Rework' && (
                        <button onClick={() => handleApproveRework(task.id)}
                          className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded text-xs">✅ Переробка</button>
                      )}
                      <button onClick={() => handleDelete(task.id)}
                        className="text-red-400 hover:bg-red-50 px-2 py-1 rounded text-xs">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Модалка задачі */}
      {modal && (
        <TaskModal
          task={editing}
          types={types}
          teams={teams}
          onSave={() => { setModal(null); setEditing(null); load() }}
          onClose={() => { setModal(null); setEditing(null) }}
        />
      )}

      {/* Масова дата */}
      {bulkModal && (
        <BulkDateModal
          ids={[...selected]}
          onSave={() => { setBulkModal(false); setSelected(new Set()); load() }}
          onClose={() => setBulkModal(false)}
        />
      )}

      {/* Прев'ю фото */}
      {photoPreview && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6"
          onClick={() => setPhotoPreview(null)}>
          <div className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <div>
                <span className="font-semibold">{photoPreview.task.batch}/{photoPreview.task.cell}</span>
                <span className="text-gray-400 mx-2">·</span>
                <span className="font-mono text-blue-700">{photoPreview.task.type?.code}</span>
                <span className="text-gray-500 ml-1 text-sm">{photoPreview.task.type?.label}</span>
              </div>
              <button onClick={() => setPhotoPreview(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <img src={photoPreview.task.photoUrl} alt="фото задачі"
              className="w-full max-h-[60vh] object-contain bg-gray-50" />
            {photoPreview.task.description && (
              <p className="px-5 py-3 text-sm text-gray-600 border-t">{photoPreview.task.description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Форма задачі ─────────────────────────────────────────────
function TaskModal({ task, types, teams, onSave, onClose }: {
  task?: any; types: any[]; teams: any[]; onSave: () => void; onClose: () => void
}) {
  const isEdit = !!task
  const [form, setForm] = useState({
    batch:          task?.batch ?? '',
    cell:           task?.cell ?? '',
    typeId:         task?.typeId ?? (types[0]?.id ?? ''),
    qtyItems:       task?.qtyItems ?? 1,
    impostsPerItem: task?.impostsPerItem ?? 0,
    plannedDate:    task?.plannedDate?.split('T')[0] ?? new Date().toISOString().split('T')[0],
    teamId:         task?.teamId ?? '',
    description:    task?.description ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>(task?.photoUrl ?? '')
  const [availableTeams, setAvailableTeams] = useState<any[]>(teams)
  const fileRef = useRef<HTMLInputElement>(null)

  // При зміні типу — оновлюємо доступні бригади
  useEffect(() => {
    if (!form.typeId) return
    refsApi.teamsForType(Number(form.typeId)).then(teamsForType => {
      setAvailableTeams(teamsForType.length > 0 ? teamsForType : [])
      // Якщо поточна бригада не у списку — скидаємо
      if (teamsForType.length === 1) {
        setForm(f => ({ ...f, teamId: teamsForType[0].id }))
      } else if (teamsForType.length === 0) {
        setForm(f => ({ ...f, teamId: '' }))
      }
    })
  }, [form.typeId])

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!form.batch || !form.cell || !form.typeId || !form.plannedDate) {
      setError("Заповніть всі обов'язкові поля"); return
    }
    setSaving(true)
    setError('')
    try {
      const data = {
        ...form,
        typeId: Number(form.typeId),
        qtyItems: Number(form.qtyItems),
        impostsPerItem: Number(form.impostsPerItem),
        teamId: form.teamId ? Number(form.teamId) : undefined,
        description: form.description || undefined,
      }
      let saved: any
      if (isEdit) saved = await tasksApi.update(task.id, data)
      else        saved = await tasksApi.create(data)

      // Завантажуємо фото якщо вибрано
      if (photoFile) {
        await tasksApi.uploadPhoto(saved.id, photoFile)
      }
      onSave()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const sp = (Number(form.impostsPerItem) + 1) * Number(form.qtyItems)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">{isEdit ? '✏️ Редагування задачі' : '+ Нова задача'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Фото */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Фото задачі</label>
            <div className="flex items-start gap-3">
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="preview"
                    className="w-24 h-24 object-cover rounded-xl border border-gray-200" />
                  <button
                    onClick={() => { setPhotoPreview(''); setPhotoFile(null); if (fileRef.current) fileRef.current.value = '' }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center leading-none">
                    ✕
                  </button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-400">
                  <span className="text-2xl">📷</span>
                  <span className="text-xs">Додати</span>
                </button>
              )}
              <div className="flex-1 text-xs text-gray-400 pt-2">
                <p>Фото буде показано в таблиці та надіслано в Telegram при створенні задачі.</p>
                {!photoPreview && (
                  <button onClick={() => fileRef.current?.click()}
                    className="mt-2 text-blue-600 hover:underline">Вибрати файл</button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
            </div>
          </div>

          {/* Партія / Комірка */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Партія *</label>
              <input className="input" value={form.batch}
                onChange={e => setForm({ ...form, batch: e.target.value })} placeholder="П-2024-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Комірка *</label>
              <input className="input" value={form.cell}
                onChange={e => setForm({ ...form, cell: e.target.value })} placeholder="А-01" />
            </div>
          </div>

          {/* Тип */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Тип конструкції *</label>
            <select className="input" value={form.typeId}
              onChange={e => setForm({ ...form, typeId: e.target.value })}>
              <option value="">— Оберіть тип —</option>
              {types.filter(t => t.isActive).map(t => (
                <option key={t.id} value={t.id}>{t.code} — {t.label}</option>
              ))}
            </select>
          </div>

          {/* Кількість + Імпости */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Кількість шт. *</label>
              <input type="number" min={1} className="input" value={form.qtyItems}
                onChange={e => setForm({ ...form, qtyItems: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Імпости на виріб</label>
              <input type="number" min={0} className="input" value={form.impostsPerItem}
                onChange={e => setForm({ ...form, impostsPerItem: Number(e.target.value) })} />
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm text-blue-700 font-medium">
            💎 СП: <strong>{sp}</strong>
            <span className="text-blue-400 ml-2 font-normal text-xs">= ({form.impostsPerItem} + 1) × {form.qtyItems}</span>
          </div>

          {/* Дата */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Планова дата *</label>
            <input type="date" className="input" value={form.plannedDate}
              onChange={e => setForm({ ...form, plannedDate: e.target.value })} />
          </div>

          {/* Бригада — тільки ті що відповідають типу */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Бригада</label>
            {availableTeams.length === 0 ? (
              <div className="input bg-gray-50 text-gray-400 text-sm">
                ⚠️ Немає бригад для цього типу — налаштуйте у Довідниках
              </div>
            ) : availableTeams.length === 1 ? (
              <div className="input bg-green-50 text-green-700 text-sm font-medium">
                ✅ {availableTeams[0].name} (автоматично)
              </div>
            ) : (
              <select className="input" value={form.teamId}
                onChange={e => setForm({ ...form, teamId: e.target.value })}>
                <option value="">— Оберіть бригаду —</option>
                {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </div>

          {/* Опис */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Опис / примітка</label>
            <textarea className="input resize-none" rows={2} value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Додаткова інформація до задачі..." />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="p-5 border-t flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Скасувати</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? '⏳ Збереження...' : isEdit ? '💾 Зберегти' : '✅ Створити'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Масова зміна дати ────────────────────────────────────────
function BulkDateModal({ ids, onSave, onClose }: { ids: number[]; onSave: () => void; onClose: () => void }) {
  const [date, setDate]   = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try { await tasksApi.bulkDate(ids, date); onSave() }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-5 border-b">
          <h2 className="font-bold">📅 Змінити дату ({ids.length} задач)</h2>
        </div>
        <div className="p-5">
          <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="p-5 border-t flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Скасувати</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Збереження...' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  )
}
