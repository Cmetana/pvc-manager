import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { usersApi, tasksApi, getAdminTelegramId, setAdminTelegramId } from './api'
import type { User } from './types'
import TasksPage from './pages/TasksPage'
import UsersPage from './pages/UsersPage'
import RefsPage from './pages/RefsPage'
import StatsPage from './pages/StatsPage'
import ImportPage from './pages/ImportPage'
import HelpPage from './pages/HelpPage'
import UnassignedPage from './pages/UnassignedPage'
import ReworkPage from './pages/ReworkPage'
import clsx from 'clsx'

const NAV = [
  { path: '/tasks',      label: '📋 Задачі' },
  { path: '/unassigned', label: '🔴 Нерозподілені' },
  { path: '/rework',     label: '⚠️ Переробки' },
  { path: '/users',      label: '👥 Користувачі' },
  { path: '/refs',       label: '📚 Довідники' },
  { path: '/import',     label: '📥 Імпорт' },
  { path: '/help',       label: '🆘 Допомога' },
  { path: '/stats',      label: '📊 Статистика' },
]

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginId, setLoginId] = useState('')
  const [loginError, setLoginError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [reworkCount, setReworkCount] = useState(0)

  useEffect(() => {
    const saved = getAdminTelegramId()
    if (!saved) { setLoading(false); return }
    usersApi.me()
      .then((u) => { if (u.role === 'admin') setUser(u) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Підтягуємо кількість переробок кожні 30 секунд
  useEffect(() => {
    if (!user) return
    const fetchCount = () =>
      tasksApi.list({ status: 'Rework' }).then(t => setReworkCount(t.length)).catch(() => {})
    fetchCount()
    const interval = setInterval(fetchCount, 30_000)
    return () => clearInterval(interval)
  }, [user])

  const handleLogin = async () => {
    setLoginError('')
    if (!loginId.trim()) return
    setAdminTelegramId(loginId.trim())
    try {
      const u = await usersApi.me()
      if (u.role !== 'admin') {
        setLoginError('Цей акаунт не має прав адміна')
        localStorage.removeItem('admin_telegram_id')
        return
      }
      setUser(u)
    } catch {
      setLoginError('Користувача не знайдено. Спочатку напишіть /start боту.')
      localStorage.removeItem('admin_telegram_id')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="card w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1">🏭 PVC Admin</h1>
        <p className="text-gray-400 text-sm text-center mb-6">Система керування дільницею</p>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ваш Telegram ID</label>
        <input
          className="input mb-1"
          placeholder="123456789"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        <p className="text-xs text-gray-400 mb-4">Дізнатись: напишіть @userinfobot в Telegram</p>
        {loginError && <p className="text-red-500 text-sm mb-3">{loginError}</p>}
        <button onClick={handleLogin} className="btn-primary w-full py-2.5">Увійти →</button>
      </div>
    </div>
  )

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={clsx(
          'fixed md:static inset-y-0 left-0 z-30 w-56 bg-white border-r border-gray-200 flex flex-col shrink-0 transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="font-bold text-base">🏭 PVC Admin</h1>
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {user.firstName ?? user.username ?? user.telegramId}
              </p>
            </div>
            <button
              className="md:hidden text-gray-400 hover:text-gray-600 ml-2 p-1 text-lg leading-none"
              onClick={() => setSidebarOpen(false)}
            >
              ✕
            </button>
          </div>
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {NAV.map((n) => (
              <NavLink
                key={n.path}
                to={n.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => clsx(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <span>{n.label}</span>
                {n.path === '/rework' && reworkCount > 0 && (
                  <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {reworkCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={() => { localStorage.removeItem('admin_telegram_id'); setUser(null) }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Вийти
            </button>
          </div>
        </aside>

        {/* Контент */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-600 hover:text-gray-900 p-1 -ml-1"
              aria-label="Відкрити меню"
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
                <rect y="3" width="22" height="2.5" rx="1.25"/>
                <rect y="9.75" width="22" height="2.5" rx="1.25"/>
                <rect y="16.5" width="22" height="2.5" rx="1.25"/>
              </svg>
            </button>
            <span className="font-semibold text-gray-800">🏭 PVC Admin</span>
          </header>

          <main className="flex-1 overflow-y-auto bg-gray-50">
            <Routes>
              <Route path="/" element={<Navigate to="/tasks" replace />} />
              <Route path="/tasks"      element={<TasksPage />} />
              <Route path="/unassigned" element={<UnassignedPage />} />
              <Route path="/rework"     element={<ReworkPage />} />
              <Route path="/users"      element={<UsersPage />} />
              <Route path="/refs"       element={<RefsPage />} />
              <Route path="/import"     element={<ImportPage />} />
              <Route path="/help"       element={<HelpPage />} />
              <Route path="/stats"      element={<StatsPage />} />
            </Routes>
          </main>
        </div>

      </div>
    </BrowserRouter>
  )
}
