import { useState, useEffect, useRef, useCallback } from 'react'

export interface SteamDownloadItem {
  appId: string
  name: string
  bytesToDownload: number
  bytesDownloaded: number
  bytesToStage: number
  bytesStaged: number
  stateFlags: number
  downloading: boolean
  validating: boolean
  paused: boolean
  percent: number
  downloadSpeed: number
}

export interface DownloadCompletion {
  appId: string
  name: string
}

export function useSteamDownloads(pollIntervalMs: number = 1000): {
  downloads: SteamDownloadItem[]
  hasActiveDownloads: boolean
  completedDownloads: DownloadCompletion[]
  dismissCompletion: (appId: string) => void
} {
  const [downloads, setDownloads] = useState<SteamDownloadItem[]>([])
  const [completedDownloads, setCompletedDownloads] = useState<DownloadCompletion[]>([])
  const mountedRef = useRef(true)
  const prevDownloadsRef = useRef<Map<string, SteamDownloadItem>>(new Map())
  const hasActiveDownloadsRef = useRef(false)
  hasActiveDownloadsRef.current = downloads.length > 0
  // Skip completion detection on the first poll: prevMap is empty so every game
  // that was already installed would be treated as a fresh completion.
  const isFirstPollRef = useRef(true)

  const fetchDownloads = useCallback((): void => {
    if (!window.api?.getSteamDownloadProgress) return
    window.api
      .getSteamDownloadProgress()
      .then((result) => {
        if (!mountedRef.current) return
        const list = Array.isArray(result) ? result : []
        setDownloads(list)

        // Detect completions (skip on the very first poll to avoid false positives
        // for games that were already installed before the app opened)
        const prevMap = prevDownloadsRef.current
        const completions: DownloadCompletion[] = []

        if (!isFirstPollRef.current) {
          for (const [appId, prev] of prevMap) {
            // A completion ONLY triggers if the item WAS actively downloading/validating in previous poll
            const wasActivelyDownloading =
              prev.downloading ||
              prev.validating ||
              (prev.bytesToDownload > 0 && prev.bytesDownloaded < prev.bytesToDownload) ||
              (prev.percent > 0 && prev.percent < 100)

            if (wasActivelyDownloading) {
              const current = list.find((d) => d.appId === appId)
              if (!current || (current.percent >= 100 && !current.downloading && !current.validating)) {
                completions.push({ appId, name: prev.name })
              }
            }
          }

          if (completions.length > 0) {
            setCompletedDownloads((prev) => [...prev, ...completions])
          }
        }
        isFirstPollRef.current = false

        const newMap = new Map<string, SteamDownloadItem>()
        for (const d of list) {
          newMap.set(d.appId, d)
        }
        prevDownloadsRef.current = newMap
      })
      .catch((err) => {
        console.error('Error fetching Steam download progress:', err)
      })
  }, [])

  const dismissCompletion = useCallback((appId: string): void => {
    setCompletedDownloads((prev) => prev.filter((c) => c.appId !== appId))
  }, [])

  useEffect(() => {
    mountedRef.current = true

    fetchDownloads()

    let timerId: ReturnType<typeof setTimeout> | null = null

    const scheduleNext = (): void => {
      if (timerId) {
        clearTimeout(timerId)
        timerId = null
      }
      if (!mountedRef.current) return
      // Pausar completamente el sondeo si la ventana está minimizada u oculta
      if (typeof document !== 'undefined' && document.hidden) {
        return
      }
      // Si hay descargas activas, sondeo rápido (1s) para fluidez;
      // si está en reposo sin descargas, sondeo relajado (4s) para evitar I/O y uso de RAM innecesario.
      const delay = hasActiveDownloadsRef.current ? pollIntervalMs : 4000
      timerId = setTimeout(() => {
        if (!mountedRef.current) return
        fetchDownloads()
        scheduleNext()
      }, delay)
    }

    scheduleNext()

    // Reanudar inmediatamente cuando la ventana vuelve a primer plano
    const handleVisibilityChange = (): void => {
      if (typeof document !== 'undefined' && !document.hidden && mountedRef.current) {
        fetchDownloads()
        scheduleNext()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Escuchar eventos en tiempo real desde el proceso principal (fs.watch sobre appmanifest)
    const removeListener = window.electron?.ipcRenderer?.on?.('steam-download-updated', () => {
      if (mountedRef.current) {
        fetchDownloads()
        scheduleNext()
      }
    })

    return () => {
      mountedRef.current = false
      if (timerId) clearTimeout(timerId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (removeListener) removeListener()
    }
  }, [fetchDownloads, pollIntervalMs])

  return {
    downloads,
    hasActiveDownloads: downloads.length > 0,
    completedDownloads,
    dismissCompletion
  }
}
