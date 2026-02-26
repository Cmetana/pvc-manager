import { NavLink } from 'react-router-dom'
import type { User } from '../types'
import clsx from 'clsx'

interface Props {
  user: User
  children: React.ReactNode
}

const tabs = [
  { path: '/pool', emoji: '📋', label: 'Пул задач' },
  { path: '/my', emoji: '🔧', label: 'Мої задачі' },
  { path: '/stats', emoji: '📊', label: 'Статистика' },
]

export default function Layout({ children }: Props) {
  return (
    <div className="flex flex-col h-screen bg-tg-bg">
      {/* Контент */}
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>

      {/* Нижня навігація */}
      <nav className="fixed bottom-0 left-0 right-0 bg-tg-bg border-t border-gray-200 z-50">
        <div className="flex">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                clsx(
                  'flex-1 flex flex-col items-center py-2 text-xs transition-colors',
                  isActive
                    ? 'text-tg-button font-semibold'
                    : 'text-tg-hint'
                )
              }
            >
              <span className="text-2xl leading-tight">{tab.emoji}</span>
              <span className="mt-0.5">{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
