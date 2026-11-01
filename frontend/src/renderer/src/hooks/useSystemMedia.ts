import { useEffect, useState, useRef } from 'react'
import {
  fetchMediaSessions,
  pickNowPlayingSession,
  subscribeMediaSessions,
  SystemMediaSession
} from '../services/systemMediaService'

export function useSystemMedia(isGameRunning: boolean = false): { sessions: SystemMediaSession[]; nowPlaying: SystemMediaSession | null } {
  const [sessions, setSessions] = useState<SystemMediaSession[]>([])
  const [nowPlaying, setNowPlaying] = useState<SystemMediaSession | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const basePositionRef = useRef(0)
  const lastSyncRef = useRef<number>(Date.now())
  const isGameRunningRef = useRef(isGameRunning)

  useEffect(() => {
    isGameRunningRef.current = isGameRunning
  }, [isGameRunning])

  useEffect(() => {
    let mounted = true
    const refresh = (): void => {
      fetchMediaSessions().then((list) => {
        if (mounted) setSessions(list)
      })
    }

    refresh()
    const unsubscribe = subscribeMediaSessions((list) => {
      if (mounted) setSessions(list)
    })

    // Pausar sondeo si el juego está corriendo o si la ventana está minimizada/oculta
    const poll = setInterval(() => {
      if (isGameRunningRef.current || (typeof document !== 'undefined' && document.hidden)) return
      refresh()
    }, 2500)

    const handleVisibilityChange = (): void => {
      if (typeof document !== 'undefined' && !document.hidden && mounted && !isGameRunningRef.current) {
        refresh()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mounted = false
      unsubscribe()
      clearInterval(poll)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    const picked = pickNowPlayingSession(sessions)
    setNowPlaying(picked)
    if (picked) {
      basePositionRef.current = picked.positionMs
      lastSyncRef.current = Date.now()
    }
  }, [sessions])

  useEffect(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    if (!nowPlaying || nowPlaying.playbackStatus !== 'playing') return
    basePositionRef.current = nowPlaying.positionMs
    lastSyncRef.current = Date.now()

    tickRef.current = setInterval(() => {
      // No gastar CPU/RAM tickeando el progreso si la app no está visible o el juego corre
      if (isGameRunningRef.current || (typeof document !== 'undefined' && document.hidden)) return
      const nextPos = basePositionRef.current + (Date.now() - lastSyncRef.current)
      setNowPlaying((prev) => {
        if (!prev || prev.playbackStatus !== 'playing') return prev
        if (prev.durationMs > 0 && nextPos >= prev.durationMs) {
          return { ...prev, positionMs: prev.durationMs }
        }
        return { ...prev, positionMs: nextPos }
      })
    }, 500)

    const handleVisibilityChange = (): void => {
      if (typeof document !== 'undefined' && !document.hidden && nowPlaying && nowPlaying.playbackStatus === 'playing') {
        lastSyncRef.current = Date.now()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [nowPlaying?.id, nowPlaying?.playbackStatus, nowPlaying?.positionMs])

  return { sessions, nowPlaying }
}
