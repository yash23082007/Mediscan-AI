'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const AuthContext = createContext(null)

// Keep auth and all API calls same-origin so Strict HttpOnly refresh cookies
// work across client-side navigations. Next.js rewrites /api/* to the server.
const API_URL = '/api'

export function AuthProvider({ children }) {
  // Access token kept in memory only (SEC7)
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshPromiseRef = useRef(null)

  // Single-flight token refresh using HttpOnly cookie (UI1, SEC3)
  const refreshAuthToken = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current
    }

    refreshPromiseRef.current = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        })

        if (!res.ok) {
          setToken(null)
          setUser(null)
          return null
        }

        const data = await res.json()
        setToken(data.accessToken)
        return data.accessToken
      } catch (e) {
        setToken(null)
        setUser(null)
        return null
      } finally {
        refreshPromiseRef.current = null
      }
    })()

    return refreshPromiseRef.current
  }, [])

  // Check session on mount via HttpOnly cookie refresh
  useEffect(() => {
    let isMounted = true

    async function initSession() {
      try {
        const newToken = await refreshAuthToken()
        if (newToken && isMounted) {
          const profileRes = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${newToken}` },
            credentials: 'include'
          })
          if (profileRes.ok) {
            const profileData = await profileRes.json()
            if (isMounted) setUser(profileData.user)
          }
        }
      } catch (err) {
        console.warn('Initial session check failed:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initSession()
    return () => { isMounted = false }
  }, [refreshAuthToken])

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')

    setToken(data.accessToken)
    setUser(data.user)
    return data
  }

  const registerPatient = async (formData) => {
    const res = await fetch(`${API_URL}/auth/register/patient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      credentials: 'include'
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.details?.[0]?.message || 'Registration failed')

    setToken(data.accessToken)
    setUser(data.user)
    return data
  }

  const logout = useCallback(async () => {
    const currentToken = token
    setToken(null)
    setUser(null)

    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
        credentials: 'include'
      })
    } catch (e) {
      // Ignore network errors on logout
    }
  }, [token])

  // Authenticated fetch with single-flight automatic refresh interceptor (UI1)
  const authFetch = useCallback(async (url, options = {}) => {
    let activeToken = token

    // If no token in memory, try refreshing first
    if (!activeToken) {
      activeToken = await refreshAuthToken()
    }

    // Normalize path to prevent duplicate /api/api
    const normalizedPath = url.startsWith('/api/') ? url.slice(4) : url.startsWith('/api') ? url.slice(4) : url
    const requestUrl = `${API_URL}${normalizedPath.startsWith('/') ? normalizedPath : '/' + normalizedPath}`

    let res = await fetch(requestUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        ...options.headers,
      },
      credentials: 'include'
    })

    // If 401, attempt one token refresh and retry
    if (res.status === 401) {
      const refreshedToken = await refreshAuthToken()
      if (refreshedToken) {
        res = await fetch(requestUrl, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${refreshedToken}`,
            ...options.headers,
          },
          credentials: 'include'
        })
      } else {
        await logout()
        throw new Error('Session expired. Please log in again.')
      }
    }

    return res
  }, [refreshAuthToken, logout, token])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, registerPatient, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

const defaultAuthContext = {
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  registerPatient: async () => {},
  logout: async () => {},
  authFetch: async () => new Response()
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  return ctx || defaultAuthContext
}
