import { useState, useEffect, useRef, useCallback } from 'react'

import { onIpcEvent } from '../bridge/api'

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)
  const prevDownloadsRef = useRef<Map<string, SteamDownloadItem>>(new Map())
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

    intervalRef.current = setInterval(() => {
      fetchDownloads()
    }, pollIntervalMs)

    // Listen for real-time updates from main process (fs.watch on appmanifest)
    const removeListener = onIpcEvent('steam-download-updated', () => {
      fetchDownloads()
    })

    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
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
