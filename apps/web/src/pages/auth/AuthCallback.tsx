import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { handleOAuthCallback } from '@/stores/authStore'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (!accessToken || !refreshToken) {
      setError(params.get('error') || 'Missing authentication tokens')
      return
    }

    handleOAuthCallback(accessToken, refreshToken)
      .then(() => navigate('/', { replace: true }))
      .catch(() => setError('Authentication failed. Please try again.'))
  }, [navigate])

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <a href="/" className="text-sm text-sky-400 hover:text-sky-300">
          Back to home
        </a>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="text-sm text-text/50">Signing in...</p>
    </div>
  )
}
