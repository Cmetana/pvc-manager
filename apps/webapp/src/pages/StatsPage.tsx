import { useState, useEffect } from 'react'
import { statsApi } from '../api/client'
import type { User, DailyStat, TypeStat } from '../types'
import DateFilter, { getDateRange } from '../components/DateFilter'
import type { DateFilter as DateFilterType } from '../components/DateFilter'

interface Props { user: User }

export default function StatsPage({ user }: Props) {
  const [daily, setDaily] = useState<DailyStat[]>([])
  const [byType, setByType] = useState<TypeStat[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilterType>('week')
  const [customDate, setCustomDate] = useState<string>()

  useEffect(() => {
    setLoading(true)
    const range = getDateRange(dateFilter, customDate)
    statsApi.get({ dateFrom: range.dateFrom, dateTo: range.dateTo })
      .then((data) => { setDaily(data.daily); setByType(data.byType) })
      .finally(() => setLoading(false))
  }, [dateFilter, customDate])

  const totalPlan = daily.reduce((s, d) => s + d.plan, 0)
  const totalFact = daily.reduce((s, d) => s + d.fact, 0)
  const pct = totalPlan > 0 ? Math.round((totalFact / totalPlan) * 100) : 0

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-xl font-bold text-tg-text">Статистика</h1>

      <DateFilter
        value={dateFilter}
        customDate={customDate}
        onChange={(f, d) => { setDateFilter(f); setCustomDate(d) }}
      />

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-3 border-tg-button border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Зведена картка */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-tg-hint mb-3">Загальний підсумок</p>
            <div className="flex gap-4">
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-tg-text">{totalFact}</p>
                <p className="text-xs text-tg-hint">Факт СП</p>
              </div>
              <div className="flex-1 text-center border-x border-gray-100">
                <p className="text-2xl font-bold text-tg-text">{totalPlan}</p>
                <p className="text-xs text-tg-hint">План СП</p>
              </div>
              <div className="flex-1 text-center">
                <p className={`text-2xl font-bold ${pct >= 100 ? 'text-green-500' : pct >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {pct}%
                </p>
                <p className="text-xs text-tg-hint">Виконання</p>
              </div>
            </div>

            {/* Прогрес бар */}
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>

          {/* По днях */}
          {daily.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="font-semibold text-tg-text text-sm">По днях</p>
              </div>
              <div className="divide-y divide-gray-50">
                {daily.map((d) => {
                  const dayPct = d.plan > 0 ? Math.round((d.fact / d.plan) * 100) : 0
                  const date = new Date(d.date).toLocaleDateString('uk-UA', {
                    weekday: 'short', day: '2-digit', month: '2-digit'
                  })
                  return (
                    <div key={d.date} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-20 text-xs text-tg-hint">{date}</div>
                      <div className="flex-1">
                        <div className="h-1.5 bg-gray-100 rounded-full">
                          <div
                            className={`h-full rounded-full ${dayPct >= 100 ? 'bg-green-400' : dayPct >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(dayPct, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right min-w-[70px]">
                        <span className="text-sm font-medium text-tg-text">{d.fact}</span>
                        <span className="text-xs text-tg-hint">/{d.plan}</span>
                        <span className="text-xs text-tg-hint ml-1">СП</span>
                      </div>
                      {d.hoursPerSP !== null && (
                        <div className="text-xs text-tg-hint w-14 text-right">
                          {d.hoursPerSP}г/СП
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* По типах */}
          {byType.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="font-semibold text-tg-text text-sm">По типах конструкцій</p>
              </div>
              <div className="divide-y divide-gray-50">
                {byType.sort((a, b) => b.sp - a.sp).map((t) => (
                  <div key={t.typeId} className="px-4 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-tg-text">{t.name}</p>
                      <p className="text-xs text-tg-hint">{t.items} шт.</p>
                    </div>
                    <span className="font-bold text-tg-text">{t.sp} СП</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {daily.length === 0 && byType.length === 0 && (
            <div className="text-center py-16 text-tg-hint">
              <p className="text-4xl mb-3">📊</p>
              <p>Даних за цей період немає</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
