'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'

/**
 * Custom hook for real-time Server-Sent Events (SSE).
 * Synchronizes client state with the backend event bus with automatic reconnection.
 */
export function useRealtimeSubscription({ onCaseCreated, onCaseReviewed, onConnected } = {}) {
  const { token, user } = useAuth()
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef(null)

  const handleCaseCreated = useRef(onCaseCreated)
  const handleCaseReviewed = useRef(onCaseReviewed)
  const handleConnected = useRef(onConnected)

  useEffect(() => {
    handleCaseCreated.current = onCaseCreated
    handleCaseReviewed.current = onCaseReviewed
    handleConnected.current = onConnected
  }, [onCaseCreated, onCaseReviewed, onConnected])

  useEffect(() => {
    if (!token || !user || typeof window === 'undefined') {
      return
    }

    let isSubscribed = true
    const sseUrl = `/api/stream?token=${encodeURIComponent(token)}`
    let es = null

    try {
      es = new EventSource(sseUrl)
      eventSourceRef.current = es

      es.addEventListener('open', () => {
        if (isSubscribed) setConnected(true)
      })

      es.addEventListener('connected', (e) => {
        if (!isSubscribed) return
        setConnected(true)
        try {
          const payload = JSON.parse(e.data)
          handleConnected.current?.(payload)
        } catch {
          // ignore parse errors
        }
      })

      es.addEventListener('case_created', (e) => {
        if (!isSubscribed) return
        try {
          const payload = JSON.parse(e.data)
          handleCaseCreated.current?.(payload)
        } catch (err) {
          console.error('[SSE] Failed to parse case_created event:', err)
        }
      })

      es.addEventListener('case_reviewed', (e) => {
        if (!isSubscribed) return
        try {
          const payload = JSON.parse(e.data)
          handleCaseReviewed.current?.(payload)
        } catch (err) {
          console.error('[SSE] Failed to parse case_reviewed event:', err)
        }
      })

      es.addEventListener('error', () => {
        if (isSubscribed) setConnected(false)
      })
    } catch (err) {
      console.warn('[SSE] EventSource connection attempt failed:', err)
    }

    return () => {
      isSubscribed = false
      if (es) {
        es.close()
        eventSourceRef.current = null
      }
      setConnected(false)
    }
  }, [token, user])

  return { isConnected: Boolean(token && user && connected) }
}
