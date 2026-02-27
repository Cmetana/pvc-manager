import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTelegram } from './hooks/useTelegram'
import { useUser } from './hooks/useUser'
import Layout from './components/Layout'
import PoolPage from './pages/PoolPage'
import MyTasksPage from './pages/MyTasksPage'
import StatsPage from './pages/StatsPage'
import AdminPage from './pages/AdminPage'
import LoadingScreen from './components/LoadingScreen'
import ErrorScreen from './components/ErrorScreen'

export default function App() {
  useTelegram()
  const { user, loading, error } = useUser()

  if (loading) return <LoadingScreen />

  if (error) {
    const isPending = error.includes('Pending')
    const isBanned = error.includes('Banned')

    if (isPending) return (
      <ErrorScreen
        emoji="⏳"
        title="Очікування підтвердження"
        message="Ваш запит відправлено адміністратору. Як тільки він підтвердить ваш акаунт — ви зможете увійти."
      />
    )
    if (isBanned) return (
      <ErrorScreen
        emoji="🚫"
        title="Доступ заблоковано"
        message="Ваш акаунт заблоковано. Зверніться до адміністратора."
      />
    )

    // Не зареєстрований — підказка
    return (
      <ErrorScreen
        emoji="👋"
        title="Потрібна реєстрація"
        message="Спочатку напишіть /start нашому боту в Telegram щоб зареєструватись."
      />
    )
  }

  if (!user) return <ErrorScreen emoji="❌" title="Помилка" message="Не вдалося завантажити профіль." />

  return (
    <BrowserRouter>
      <Layout user={user}>
        <Routes>
          <Route path="/" element={<Navigate to="/pool" replace />} />
          <Route path="/pool" element={<PoolPage user={user} />} />
          <Route path="/my" element={<MyTasksPage user={user} />} />
          <Route path="/stats" element={<StatsPage user={user} />} />
          {user.role === 'admin' && (
            <Route path="/admin" element={<AdminPage />} />
          )}
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
