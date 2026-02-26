import { useState } from 'react'
import clsx from 'clsx'
import { getAdminTelegramId } from '../api'

interface PreviewRow {
  row: number
  data: {
    batch: string; cell: string; type: string
    qtyItems: number; impostsPerItem: number; plannedDate: string
  }
  typeFound: boolean
  errors: string[]
}

interface PreviewResult {
  totalRows: number
  preview: PreviewRow[]
  validRows: number
  invalidRows: number
}

const DEFAULT_MAPPING = { batch: 'A', cell: 'B', type: 'C', qtyItems: 'D', impostsPerItem: 'E', plannedDate: 'F' }

async function apiFetch(path: string, body: object) {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-telegram-id': getAdminTelegramId() },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
  return data
}

export default function ImportPage() {
  const [url, setUrl] = useState('')
  const [sheetName, setSheetName] = useState('Sheet1')
  const [hasHeader, setHasHeader] = useState(true)
  const [mapping, setMapping] = useState(DEFAULT_MAPPING)
  const [mode, setMode] = useState<'add' | 'update'>('add')

  const [step, setStep] = useState<'form' | 'preview' | 'done'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null)

  const payload = { url, sheetName, mapping, hasHeader, mode }

  const handlePreview = async () => {
    setLoading(true); setError('')
    try {
      const data = await apiFetch('/import/preview', payload)
      setPreview(data)
      setStep('preview')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!confirm(`Імпортувати ${preview?.validRows} задач?`)) return
    setLoading(true); setError('')
    try {
      const data = await apiFetch('/import/execute', payload)
      setResult(data)
      setStep('done')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setStep('form'); setPreview(null); setResult(null); setError('') }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">📥 Імпорт Google Sheets</h1>
      <p className="text-gray-500 text-sm mb-6">
        Таблиця має бути відкрита для перегляду (Файл → Поділитися → Всі в інтернеті)
      </p>

      {/* Кроки */}
      <div className="flex gap-3 mb-8">
        {[{ n: 1, label: 'Налаштування' }, { n: 2, label: 'Прев\'ю' }, { n: 3, label: 'Готово' }].map(({ n, label }) => (
          <div key={n} className="flex items-center gap-2">
            <div className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold',
              (step === 'form' && n === 1) || (step === 'preview' && n === 2) || (step === 'done' && n === 3)
                ? 'bg-blue-600 text-white'
                : n < (step === 'preview' ? 2 : step === 'done' ? 3 : 1)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
            )}>
              {n}
            </div>
            <span className={clsx('text-sm', step === 'form' && n === 1 ? 'font-medium' : 'text-gray-400')}>{label}</span>
            {n < 3 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* КРОК 1: Форма */}
      {step === 'form' && (
        <div className="space-y-5">
          <div className="card">
            <h2 className="font-semibold mb-4">🔗 Джерело даних</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">URL Google Sheets *</label>
                <input
                  className="input"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Назва аркуша</label>
                  <input className="input" placeholder="Sheet1" value={sheetName} onChange={(e) => setSheetName(e.target.value)} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                    <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} className="w-4 h-4" />
                    Перший рядок — заголовки
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-1">📐 Маппінг колонок</h2>
            <p className="text-xs text-gray-400 mb-4">Вкажіть літеру колонки для кожного поля (A, B, C...)</p>
            <div className="grid grid-cols-3 gap-3">
              {(Object.entries(mapping) as [keyof typeof mapping, string][]).map(([field, col]) => {
                const labels: Record<string, string> = {
                  batch: 'Партія', cell: 'Комірка', type: 'Тип конструкції',
                  qtyItems: 'Кількість шт.', impostsPerItem: 'Імпости', plannedDate: 'Планова дата',
                }
                return (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{labels[field]}</label>
                    <input
                      className="input text-center font-mono uppercase"
                      maxLength={2}
                      value={col}
                      onChange={(e) => setMapping({ ...mapping, [field]: e.target.value.toUpperCase() })}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-3">⚙️ Режим імпорту</h2>
            <div className="flex gap-3">
              {[
                { key: 'add', label: '➕ Тільки додати нові', desc: 'Дублікати ігноруються' },
                { key: 'update', label: '🔄 Додати + оновити', desc: 'Оновлює по Партія+Комірка' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setMode(opt.key as 'add' | 'update')}
                  className={clsx(
                    'flex-1 p-3 rounded-xl border-2 text-left transition-colors',
                    mode === opt.key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>}

          <button
            onClick={handlePreview}
            disabled={!url || loading}
            className="btn-primary w-full py-3"
          >
            {loading ? '⏳ Завантаження...' : '👁 Переглянути дані →'}
          </button>
        </div>
      )}

      {/* КРОК 2: Прев'ю */}
      {step === 'preview' && preview && (
        <div className="space-y-5">
          {/* Зведення */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center border-blue-200 bg-blue-50">
              <p className="text-2xl font-bold text-blue-600">{preview.totalRows}</p>
              <p className="text-xs text-gray-500">Всього рядків</p>
            </div>
            <div className="card text-center border-green-200 bg-green-50">
              <p className="text-2xl font-bold text-green-600">{preview.validRows}</p>
              <p className="text-xs text-gray-500">Валідних</p>
            </div>
            <div className="card text-center border-red-200 bg-red-50">
              <p className="text-2xl font-bold text-red-500">{preview.invalidRows}</p>
              <p className="text-xs text-gray-500">З помилками</p>
            </div>
          </div>

          {/* Таблиця прев'ю */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <span className="font-semibold">Прев'ю (перші {preview.preview.length} рядків)</span>
              {preview.invalidRows > 0 && (
                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                  ⚠️ Рядки з помилками будуть пропущені
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Рядок', 'Партія', 'Комірка', 'Тип', 'Кіл-ть', 'Імп.', 'Дата', 'Статус'].map((h) => (
                      <th key={h} className="p-2 text-left text-gray-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {preview.preview.map((row) => (
                    <tr key={row.row} className={clsx(row.errors.length > 0 ? 'bg-red-50' : 'hover:bg-gray-50')}>
                      <td className="p-2 text-gray-400 text-xs">#{row.row}</td>
                      <td className="p-2 font-medium">{row.data.batch || '—'}</td>
                      <td className="p-2">{row.data.cell || '—'}</td>
                      <td className={clsx('p-2 text-xs', !row.typeFound ? 'text-red-500 font-medium' : '')}>{row.data.type || '—'}</td>
                      <td className="p-2">{row.data.qtyItems || '—'}</td>
                      <td className="p-2">{row.data.impostsPerItem}</td>
                      <td className="p-2 text-xs">{row.data.plannedDate || '—'}</td>
                      <td className="p-2">
                        {row.errors.length === 0
                          ? <span className="text-green-600 text-xs">✅ OK</span>
                          : <span className="text-red-500 text-xs" title={row.errors.join('\n')}>❌ {row.errors[0]}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>}

          <div className="flex gap-3">
            <button onClick={reset} className="btn-secondary flex-1">← Назад</button>
            <button
              onClick={handleImport}
              disabled={preview.validRows === 0 || loading}
              className="btn-primary flex-1 py-3"
            >
              {loading ? '⏳ Імпортуємо...' : `✅ Імпортувати ${preview.validRows} задач`}
            </button>
          </div>
        </div>
      )}

      {/* КРОК 3: Готово */}
      {step === 'done' && result && (
        <div className="space-y-5">
          <div className="card text-center">
            <p className="text-5xl mb-4">🎉</p>
            <h2 className="text-xl font-bold mb-4">Імпорт завершено!</h2>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-2xl font-bold text-green-600">{result.created}</p>
                <p className="text-sm text-gray-400">Створено</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                <p className="text-sm text-gray-400">Оновлено</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-400">{result.skipped}</p>
                <p className="text-sm text-gray-400">Пропущено</p>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="card border-red-200">
              <h3 className="font-semibold text-red-700 mb-2">⚠️ Помилки ({result.errors.length})</h3>
              <ul className="space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-sm text-red-600">• {e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="btn-secondary flex-1">Новий імпорт</button>
            <a href="/tasks" className="btn-primary flex-1 text-center">Перейти до задач →</a>
          </div>
        </div>
      )}
    </div>
  )
}
