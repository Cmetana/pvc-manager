import { NavLink } from 'react-router-dom'
import type { User } from '../types'
import clsx from 'clsx'

interface Props {
  user: User
  children: React.ReactNode
}

export default function Layout({ user, children }: Props) {
  const isAdmin = user.role === 'admin'

  return (
    <div className="flex flex-col h-screen bg-tg-bg">
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>

      {/* Нижня навігація — компактні pill-кнопки */}
      <nav className="fixed bottom-0 left-0 right-0 bg-tg-bg border-t border-gray-200 z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto no-scrollbar">

          <NavLink
            to="/pool"
            className={({ isActive }) =>
              clsx(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-tg-hint border border-blue-100'
              )
            }
          >
            📋 Пул задач
          </NavLink>

          <NavLink
            to="/my"
            className={({ isActive }) =>
              clsx(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                isActive
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-tg-hint border border-green-100'
              )
            }
          >
            🔧 Мої задачі
          </NavLink>

          <NavLink
            to="/stats"
            className={({ isActive }) =>
              clsx(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                isActive
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-tg-hint border border-green-100'
              )
            }
          >
            📊 Статистика
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                clsx(
                  'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-tg-hint border border-purple-100'
                )
              }
            >
              👑 Переробки
            </NavLink>
          )}

        </div>
      </nav>
    </div>
  )
}
