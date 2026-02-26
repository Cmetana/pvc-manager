import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { usersApi, getAdminTelegramId, setAdminTelegramId } from './api'
import type { User } from './types'
import TasksPage from './pages/TasksPage'
import UsersPage from './pages/UsersPage'
import RefsPage from './pages/RefsPage'
import StatsPage from './pages/StatsPage'
import ImportPage from './pages/ImportPage'
import HelpPage from './pages/HelpPage'
import UnassignedPage from './pages/UnassignedPage'
import clsx from 'clsx'

const NAV = [
  { path: '/tasks',      label: '📋 Задачі' },
  { path: '/unassigned', label: '🔴 Нерозподілені' },
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

  useEffect(() => {
    const saved = getAdminTelegramId()
    if (!saved) { setLoading(false); return }
    usersApi.me()
      .then((u) => { if (u.role === 'admin') setUser(u) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-52 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-100">
            <h1 className="font-bold text-base">🏭 PVC Admin</h1>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {user.firstName ?? user.username ?? user.telegramId}
            </p>
          </div>
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {NAV.map((n) => (
              <NavLink
                key={n.path}
                to={n.path}
                className={({ isActive }) => clsx(
                  'block px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                {n.label}
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
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <Routes>
            <Route path="/" element={<Navigate to="/tasks" replace />} />
            <Route path="/tasks"      element={<TasksPage />} />
            <Route path="/unassigned" element={<UnassignedPage />} />
            <Route path="/users"      element={<UsersPage />} />
            <Route path="/refs"       element={<RefsPage />} />
            <Route path="/import"     element={<ImportPage />} />
            <Route path="/help"       element={<HelpPage />} />
            <Route path="/stats"      element={<StatsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
