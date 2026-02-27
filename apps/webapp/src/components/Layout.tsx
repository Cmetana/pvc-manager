import { NavLink } from 'react-router-dom'
import type { User } from '../types'
import clsx from 'clsx'

interface Props {
  user: User
  children: React.ReactNode
}

export default function Layout({ children }: Props) {
  return (
    <div className="flex flex-col h-screen bg-tg-bg">
      <main className="flex-1 overflow-y-auto pb-28">
        {children}
      </main>

      {/* Нижня навігація */}
      <nav className="fixed bottom-0 left-0 right-0 bg-tg-bg border-t border-gray-200 z-50">
        <div className="flex items-stretch" style={{ minHeight: 60 }}>

          {/* КОМАНДА — командні задачі */}
          <div className="flex-1 flex flex-col items-center justify-end pb-2 pt-1">
            <span className="text-[9px] font-bold tracking-widest text-blue-500 mb-1 leading-none">
              КОМАНДА
            </span>
            <NavLink
              to="/pool"
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center text-xs transition-colors',
                  isActive ? 'text-blue-600 font-semibold' : 'text-tg-hint'
                )
              }
            >
              <span className="text-2xl leading-tight">📋</span>
              <span className="mt-0.5">Пул задач</span>
            </NavLink>
          </div>

          {/* Роздільник */}
          <div className="w-px bg-gray-200 my-2" />

          {/* МОЄ — особисті задачі */}
          <div className="flex-[2] flex flex-col items-center justify-end pb-2 pt-1">
            <span className="text-[9px] font-bold tracking-widest text-green-600 mb-1 leading-none">
              МОЄ
            </span>
            <div className="flex w-full">
              <NavLink
                to="/my"
                className={({ isActive }) =>
                  clsx(
                    'flex-1 flex flex-col items-center text-xs transition-colors',
                    isActive ? 'text-green-600 font-semibold' : 'text-tg-hint'
                  )
                }
              >
                <span className="text-2xl leading-tight">🔧</span>
                <span className="mt-0.5">Мої задачі</span>
              </NavLink>
              <NavLink
                to="/stats"
                className={({ isActive }) =>
                  clsx(
                    'flex-1 flex flex-col items-center text-xs transition-colors',
                    isActive ? 'text-green-600 font-semibold' : 'text-tg-hint'
                  )
                }
              >
                <span className="text-2xl leading-tight">📊</span>
                <span className="mt-0.5">Статистика</span>
              </NavLink>
            </div>
          </div>

        </div>
      </nav>
    </div>
  )
}
