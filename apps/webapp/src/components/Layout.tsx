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
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Нижня навігація — іконка + дворядковий текст */}
      <nav className="fixed bottom-0 left-0 right-0 bg-tg-bg border-t border-gray-200 z-50"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto no-scrollbar">

          <NavLink
            to="/pool"
            className={({ isActive }) =>
              clsx(
                'shrink-0 px-2.5 py-2 rounded-xl text-[11px] font-medium transition-colors flex items-center gap-1.5',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-tg-hint border border-blue-100'
              )
            }
          >
            <span className="text-base leading-none">📋</span>
            <span className="flex flex-col leading-tight text-left">
              <span>Пул</span>
              <span>задач</span>
            </span>
          </NavLink>

          <NavLink
            to="/my"
            className={({ isActive }) =>
              clsx(
                'shrink-0 px-2.5 py-2 rounded-xl text-[11px] font-medium transition-colors flex items-center gap-1.5',
                isActive
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-tg-hint border border-green-100'
              )
            }
          >
            <span className="text-base leading-none">🔧</span>
            <span className="flex flex-col leading-tight text-left">
              <span>Мої</span>
              <span>задачі</span>
            </span>
          </NavLink>

          <NavLink
            to="/stats"
            className={({ isActive }) =>
              clsx(
                'shrink-0 px-2.5 py-2 rounded-xl text-[11px] font-medium transition-colors flex items-center gap-1.5',
                isActive
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-tg-hint border border-green-100'
              )
            }
          >
            <span className="text-base leading-none">📊</span>
            <span>Стат</span>
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                clsx(
                  'shrink-0 px-2.5 py-2 rounded-xl text-[11px] font-medium transition-colors flex items-center gap-1.5',
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-tg-hint border border-purple-100'
                )
              }
            >
              <span className="text-base leading-none">❗</span>
              <span>Брак</span>
            </NavLink>
          )}

        </div>
      </nav>
    </div>
  )
}
