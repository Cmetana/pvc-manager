import { useState, useEffect } from 'react'
import { usersApi } from '../api/client'
import type { User } from '../types'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    usersApi.me()
      .then(setUser)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { user, loading, error, setUser }
}
