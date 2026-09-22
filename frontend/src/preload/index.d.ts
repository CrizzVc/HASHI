import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    electronAPI: ElectronAPI & {
      getMediaSessions: () => Promise<any[]>
      mediaControl: (action: string, target?: any) => Promise<any>
      onMediaSessionsChanged: (callback: (sessions: any[]) => void) => () => void
    }
    api: {
      getSystemInfo: () => Promise<{
        platform: string
        arch: string
        cpus: string
        totalMemory: string
        freeMemory: string
        uptime: string
      }>
      launchGame: (gameId: string, exePath: string) => Promise<{
        success: boolean
        tracked: boolean
        startTime: number
        simulated?: boolean
        error?: string
      }>
      selectGameFile: () => Promise<string | null>
      getFileIcon: (filePath: string) => Promise<string | null>
      getGames: () => Promise<any[]>
      saveGames: (games: any[]) => Promise<{ success: boolean; error?: string }>
      onGameExited: (callback: (data: { gameId: string; durationMinutes: number }) => void) => () => void
      onGameSessionStart: (callback: (data: { gameId: string }) => void) => () => void
      // Background image APIs
      selectBackgroundImage: () => Promise<string | null>
      getBackgroundImage: () => Promise<string | null>
      clearBackgroundImage: () => Promise<{ success: boolean }>
      // Wallpaper folder (una sola vez)
      selectWallpaperFolder: () => Promise<{ folder: string; images: Array<{ name: string; path: string; dataUrl: string; mtime: number }> } | null>
      getWallpaperFolder: () => Promise<string | null>
      getWallpaperImages: (folder?: string) => Promise<Array<{ name: string; path: string; dataUrl: string; mtime: number }>>
      getWallpaperPreview: (path: string) => Promise<string | null>
      setWallpaperAsBackground: (sourcePath: string) => Promise<string | null>
      // Profile APIs
      getProfile: () => Promise<{ name: string; avatar: string | null }>
      saveProfile: (profile: { name: string; avatar: string | null }) => Promise<{ success: boolean; error?: string }>
      selectProfileImage: () => Promise<string | null>
      // Store APIs
      getStores: () => Promise<{ id: string; name: string; installed: boolean; exePath: string | null }[]>
      openStore: (storeId: string) => Promise<{ success: boolean; error?: string }>
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>
      getExtensions: () => Promise<Array<{
        id: string
        name: string
        description: string
        version: string
        type: 'external' | 'native' | 'embedded'
        entryUrl: string | null
        viewId: string | null
        backendEntry?: string | null
        sidebar: boolean
        enabled: boolean
      }>>
      setExtensionEnabled: (id: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>
      openExtensionSession: (id: string) => Promise<{ success: boolean; error?: string }>
      closeExtensionSession: (id: string) => Promise<{ success: boolean; error?: string }>
      openExtensionsDirectory: () => Promise<{ success: boolean; error?: string }>
      // Steam account APIs
      getSteamAccount: () => Promise<{
        linked: boolean
        apiKey: string
        steamId: string
        accountName: string
        steamId64: string | null
      }>
      saveSteamAccount: (steamAccount: {
        linked: boolean
        apiKey: string
        steamId: string
        accountName: string
        steamId64: string | null
      }) => Promise<{ success: boolean; error?: string }>
      openSteamOpenId: () => Promise<{
        linked: boolean
        apiKey: string
        steamId: string
        accountName: string
        steamId64: string | null
      }>
      getSteamInstallationStatus: (appIds: string[]) => Promise<Record<string, boolean>>
      getSteamDownloadProgress: () => Promise<Array<{
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
      }>>
      getAppVersion: () => Promise<string>
      checkForUpdates: () => Promise<{ name: string; tipe: string; version: string; link: string }>
      createStartupShortcut: () => Promise<{ success: boolean; error?: string }>
      getStartupStatus: () => Promise<{ enabled: boolean }>
      removeStartupShortcut: () => Promise<{ success: boolean; error?: string }>
      getSystemMedia: () => Promise<{
        hasMedia: boolean
        title?: string
        artist?: string
        albumTitle?: string
        albumArtist?: string
        playbackStatus?: string
        playbackType?: string
        positionSeconds?: number
        endSeconds?: number
        thumbnail?: string
        error?: string
        raw?: any
      }>
      controlSystemMedia: (action: 'play' | 'pause' | 'toggle' | 'next' | 'previous' | 'prev' | string, target?: any) => Promise<{ success: boolean; error?: string }>
      getMediaSessions: () => Promise<any[]>
      mediaControl: (action: string, target?: any) => Promise<any>
      onMediaSessionsChanged: (callback: (sessions: any[]) => void) => () => void
      // Omniconsole
      setOmniconsole: (enabled: boolean) => Promise<void>
      // Backend port management
      getBackendPort: () => Promise<{ port: number }>
      setBackendPort: (port: number) => Promise<{ success: boolean; error?: string }>
      checkPortInUse: (port: number) => Promise<{ inUse: boolean }>
      // Window control
      minimizeWindow: () => Promise<void>
      quitApp: () => Promise<void>
    }
  }
}
