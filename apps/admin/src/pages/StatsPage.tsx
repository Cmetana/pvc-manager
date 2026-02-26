import { useState, useEffect } from 'react'
import { statsApi, usersApi, refsApi, getAdminTelegramId } from '../api'
import type { DailyStat, TypeStat, User, Team } from '../types'
import clsx from 'clsx'

interface WorkerStat {
  userId: number; name: string; teamId: number | null; teamName: string | null
  factSP: number; tasksCount: number; hoursPerSP: number | null
  reworkCount: number; avgReworkMinutes: number | null; lateCount: number
}

async function fetchWorkers(params: string): Promise<WorkerStat[]> {
  const res = await fetch(`/api/stats/workers?${params}`, {
    headers: { 'x-telegram-id': getAdminTelegramId() },
  })
  return res.json()
}

type ActiveTab = 'daily' | 'workers' | 'types'

export default function StatsPage() {
  const [tab, setTab] = useState<ActiveTab>('daily')
  const [daily, setDaily] = useState<DailyStat[]>([])
  const [byType, setByType] = useState<TypeStat[]>([])
  const [workerStats, setWorkerStats] = useState<WorkerStat[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const [dateFrom, setDateFrom] = useState(weekAgo)
  const [dateTo, setDateTo] = useState(today)
  const [userId, setUserId] = useState('')
  const [teamId, setTeamId] = useState('')

  useEffect(() => {
    usersApi.list().then((u) => setUsers(u.filter((x) => x.role === 'worker')))
    refsApi.teams().then(setTeams)
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const p: Record<string, string> = { dateFrom, dateTo }
      if (userId) p.userId = userId
      if (teamId) p.teamId = teamId
      const wParams = new URLSearchParams({ dateFrom, dateTo, ...(teamId ? { teamId } : {}) })
      const [s, w] = await Promise.all([statsApi.get(p), fetchWorkers(wParams.toString())])
      setDaily(s.daily); setByType(s.byType); setWorkerStats(w)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const totalPlan = daily.reduce((s, d) => s + d.plan, 0)
  const totalFact = daily.reduce((s, d) => s + d.fact, 0)
  const pct = totalPlan > 0 ? Math.round((totalFact / totalPlan) * 100) : 0

  const exportCSV = () => {
    const rows = [
      'По днях', 'Дата,План СП,Факт СП,Різниця,год/СП',
      ...daily.map((d) => `${d.date},${d.plan},${d.fact},${d.diff},${d.hoursPerSP ?? ''}`),
      '', 'По типах', 'Тип,Факт СП,Кількість шт.',
      ...byType.map((t) => `"${t.name}",${t.sp},${t.items}`),
      '', 'По працівниках', 'Працівник,Бригада,Факт СП,Задач,год/СП,Переробок,Прострочених',
      ...workerStats.map((w) => `"${w.name}","${w.teamName ?? ''}",${w.factSP},${w.tasksCount},${w.hoursPerSP ?? ''},${w.reworkCount},${w.lateCount}`),
    ]
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `pvc-stats-${dateFrom}-${dateTo}.csv`; a.click()
  }

  const exportXLSX = async () => {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    const addSheet = (name: string, headers: string[], rows: any[][]) => {
      const ws = wb.addWorksheet(name)
      ws.addRow(headers).font = { bold: true }
      rows.forEach((r) => ws.addRow(r))
      ws.columns.forEach((col) => { col.width = 18 })
    }
    addSheet('По днях', ['Дата', 'План СП', 'Факт СП', 'Різниця', 'год/СП'],
      daily.map((d) => [d.date, d.plan, d.fact, d.diff, d.hoursPerSP ?? '']))
    addSheet('По типах', ['Тип конструкції', 'Факт СП', 'Кількість шт.'],
      byType.sort((a, b) => b.sp - a.sp).map((t) => [t.name, t.sp, t.items]))
    addSheet('По працівниках',
      ['Працівник', 'Бригада', 'Факт СП', 'Задач', 'год/СП', 'Переробок', 'Прострочених'],
      workerStats.map((w) => [w.name, w.teamName ?? '—', w.factSP, w.tasksCount, w.hoursPerSP ?? '—', w.reworkCount, w.lateCount]))
    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `pvc-stats-${dateFrom}-${dateTo}.xlsx`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">📊 Статистика</h1>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary">⬇️ CSV</button>
          <button onClick={exportXLSX} className="btn-secondary">⬇️ XLSX</button>
        </div>
      </div>

      {/* Фільтри */}
      <div className="card mb-5 flex flex-wrap gap-3 items-end">
        <div><label className="block text-xs text-gray-500 mb-1">З</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input w-36" /></div>
        <div><label className="block text-xs text-gray-500 mb-1">По</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input w-36" /></div>
        <div><label className="block text-xs text-gray-500 mb-1">Бригада</label>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="input w-40">
            <option value="">Всі бригади</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></div>
        <div><label className="block text-xs text-gray-500 mb-1">Працівник</label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className="input w-44">
            <option value="">Всі</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.firstName ?? u.username}</option>)}
          </select></div>
        <button onClick={load} className="btn-primary">Застосувати</button>
      </div>

      {/* Зведені картки */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Факт СП', value: totalFact, color: 'text-blue-600' },
          { label: 'План СП', value: totalPlan, color: 'text-gray-700' },
          { label: 'Виконання', value: `${pct}%`, color: pct >= 100 ? 'text-green-600' : pct >= 70 ? 'text-yellow-500' : 'text-red-500' },
          { label: 'Задач виконано', value: workerStats.reduce((s, w) => s + w.tasksCount, 0), color: 'text-purple-600' },
        ].map((c) => (
          <div key={c.label} className="card text-center">
            <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Таби */}
      <div className="flex gap-2 mb-5">
        {[{ key: 'daily', l: '📅 По днях' }, { key: 'workers', l: '👷 По працівниках' }, { key: 'types', l: '🏗 По типах' }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as ActiveTab)}
            className={clsx('px-4 py-2 rounded-lg text-sm font-medium', tab === t.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200')}>{t.l}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* По днях */}
          {tab === 'daily' && (daily.length === 0 ? <Empty /> : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b"><tr>
                  {['Дата', 'План СП', 'Факт СП', 'Різниця', 'год/СП', 'Виконання'].map((h) => (
                    <th key={h} className="p-3 text-left text-gray-500 font-medium">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {daily.map((d) => {
                    const p = d.plan > 0 ? Math.round((d.fact / d.plan) * 100) : 0
                    return (
                      <tr key={d.date} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">{new Date(d.date).toLocaleDateString('uk-UA', { weekday: 'short', day: '2-digit', month: '2-digit' })}</td>
                        <td className="p-3">{d.plan}</td>
                        <td className="p-3 font-bold">{d.fact}</td>
                        <td className={clsx('p-3 font-medium', d.diff >= 0 ? 'text-green-600' : 'text-red-500')}>{d.diff >= 0 ? '+' : ''}{d.diff}</td>
                        <td className="p-3 text-gray-500">{d.hoursPerSP ?? '—'}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${p >= 100 ? 'bg-green-400' : p >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${Math.min(p, 100)}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{p}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}

          {/* По працівниках */}
          {tab === 'workers' && (workerStats.length === 0 ? <Empty /> : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b"><tr>
                  {['#', 'Працівник', 'Бригада', 'Факт СП', 'Задач', 'год/СП', 'Переробок', 'Прострочених'].map((h) => (
                    <th key={h} className="p-3 text-left text-gray-500 font-medium">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {workerStats.map((w, i) => (
                    <tr key={w.userId} className="hover:bg-gray-50">
                      <td className="p-3 text-gray-400">{i + 1}</td>
                      <td className="p-3 font-semibold">{w.name}</td>
                      <td className="p-3 text-gray-500">{w.teamName ?? '—'}</td>
                      <td className="p-3 font-bold text-blue-600">{w.factSP}</td>
                      <td className="p-3">{w.tasksCount}</td>
                      <td className="p-3 text-gray-500">{w.hoursPerSP ?? '—'}</td>
                      <td className="p-3">{w.reworkCount > 0 ? <span className="text-orange-600 font-medium">{w.reworkCount}</span> : <span className="text-gray-300">0</span>}</td>
                      <td className="p-3">{w.lateCount > 0 ? <span className="text-red-500 font-medium">{w.lateCount}</span> : <span className="text-gray-300">0</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* По типах */}
          {tab === 'types' && (byType.length === 0 ? <Empty /> : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b"><tr>
                  {['Тип конструкції', 'Факт СП', 'Кількість шт.'].map((h) => (
                    <th key={h} className="p-3 text-left text-gray-500 font-medium">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {byType.sort((a, b) => b.sp - a.sp).map((t) => (
                    <tr key={t.typeId} className="hover:bg-gray-50">
                      <td className="p-3 font-medium">{t.name}</td>
                      <td className="p-3 font-bold text-blue-600">{t.sp}</td>
                      <td className="p-3 text-gray-500">{t.items}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function Empty() {
  return <div className="text-center py-20 text-gray-400"><p className="text-5xl mb-4">📊</p><p>Немає даних за вибраний період</p></div>
}
