import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  launchGame: (gameId: string, exePath: string) => ipcRenderer.invoke('launch-game', gameId, exePath),
  selectGameFile: () => ipcRenderer.invoke('select-game-file'),
  getFileIcon: (filePath: string) => ipcRenderer.invoke('get-file-icon', filePath),
  getGames: () => ipcRenderer.invoke('get-games'),
  saveGames: (games: any[]) => ipcRenderer.invoke('save-games', games),
  onGameExited: (callback: (data: { gameId: string; durationMinutes: number }) => void) => {
    const subscription = (_event: any, data: { gameId: string; durationMinutes: number }) => callback(data)
    ipcRenderer.on('game-exited', subscription)
    return () => {
      ipcRenderer.removeListener('game-exited', subscription)
    }
  },
  onGameSessionStart: (callback: (data: { gameId: string }) => void) => {
    const subscription = (_event: any, data: { gameId: string }) => callback(data)
    ipcRenderer.on('game-session-start', subscription)
    return () => {
      ipcRenderer.removeListener('game-session-start', subscription)
    }
  },
  // Fuerza a recalcular tamaños en el renderer tras un nudge de bounds del
  // main process (workaround del desfase de layout al entrar/salir de
  // fullscreen en monitores 4K con escalado != 100%)
  onForceResizeRecalc: (callback: () => void) => {
    const subscription = (): void => callback()
    ipcRenderer.on('force-resize-recalc', subscription)
    return () => {
      ipcRenderer.removeListener('force-resize-recalc', subscription)
    }
  },
  // Background image APIs
  selectBackgroundImage: () => ipcRenderer.invoke('select-background-image'),
  getBackgroundImage: () => ipcRenderer.invoke('get-background-image'),
  clearBackgroundImage: () => ipcRenderer.invoke('clear-background-image'),
  // Wallpaper folder (una sola vez) — para el botón W
  selectWallpaperFolder: () => ipcRenderer.invoke('select-wallpaper-folder'),
  getWallpaperFolder: () => ipcRenderer.invoke('get-wallpaper-folder'),
  getWallpaperImages: (folder?: string) => ipcRenderer.invoke('get-wallpaper-images', folder),
  setWallpaperAsBackground: (sourcePath: string) => ipcRenderer.invoke('set-wallpaper-as-background', sourcePath),
  getWallpaperPreview: (path: string) => ipcRenderer.invoke('get-wallpaper-preview', path),
  // Profile APIs
  getProfile: () => ipcRenderer.invoke('get-profile'),
  saveProfile: (profile: { name: string; avatar: string | null }) => ipcRenderer.invoke('save-profile', profile),
  selectProfileImage: () => ipcRenderer.invoke('select-profile-image'),
  // Store APIs
  getStores: () => ipcRenderer.invoke('get-stores'),
  openStore: (storeId: string) => ipcRenderer.invoke('open-store', storeId),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  getExtensions: () => ipcRenderer.invoke('get-extensions'),
  setExtensionEnabled: (id: string, enabled: boolean) => ipcRenderer.invoke('set-extension-enabled', id, enabled),
  openExtensionSession: (id: string) => ipcRenderer.invoke('open-extension-session', id),
  closeExtensionSession: (id: string) => ipcRenderer.invoke('close-extension-session', id),
  openExtensionsDirectory: () => ipcRenderer.invoke('open-extensions-directory'),
  // Steam account APIs
  getSteamAccount: () => ipcRenderer.invoke('get-steam-account'),
  saveSteamAccount: (steamAccount: {
    linked: boolean
    apiKey: string
    steamId: string
    accountName: string
    steamId64: string | null
  }) => ipcRenderer.invoke('save-steam-account', steamAccount),
  openSteamOpenId: () => ipcRenderer.invoke('open-steam-openid'),
  getSteamInstallationStatus: (appIds: string[]) => ipcRenderer.invoke('get-steam-installation-status', appIds),
  getSteamDownloadProgress: () => ipcRenderer.invoke('get-steam-download-progress'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  // Startup shortcut APIs
  createStartupShortcut: () => ipcRenderer.invoke('create-startup-shortcut'),
  getStartupStatus: () => ipcRenderer.invoke('get-startup-status'),
  removeStartupShortcut: () => ipcRenderer.invoke('remove-startup-shortcut'),
  // System Media (API del PC) — puente nativo como WPS5
  getSystemMedia: () => ipcRenderer.invoke('get-system-media'),
  controlSystemMedia: (action: string, target?: any) => ipcRenderer.invoke('control-system-media', action, target),
  // WPS5-compat — usado por systemMediaService
  getMediaSessions: () => ipcRenderer.invoke('get-media-sessions'),
  mediaControl: (action: string, target?: any) => ipcRenderer.invoke('media-control', action, target),
  onMediaSessionsChanged: (callback: (sessions: any[]) => void) => {
    const sub = (_event: any, sessions: any[]) => callback(sessions)
    ipcRenderer.on('media-sessions-changed', sub)
    return () => ipcRenderer.removeListener('media-sessions-changed', sub)
  },
  // Omniconsole — prevent launcher from hiding when a game is launched
  setOmniconsole: (enabled: boolean) => ipcRenderer.invoke('set-omniconsole', enabled),
  // Backend port management
  getBackendPort: () => ipcRenderer.invoke('get-backend-port'),
  setBackendPort: (port: number) => ipcRenderer.invoke('set-backend-port', port),
  checkPortInUse: (port: number) => ipcRenderer.invoke('check-port-in-use', port),
  // Window control — minimizeWindow oculta sin cerrar; quitApp cierra de verdad
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  quitApp: () => ipcRenderer.invoke('quit-app')
}

// Compat: WPS5 referencia usa window.electronAPI
const electronAPIExtended = {
  ...electronAPI,
  getMediaSessions: () => ipcRenderer.invoke('get-media-sessions'),
  mediaControl: (action: string, target?: any) => ipcRenderer.invoke('media-control', action, target),
  onMediaSessionsChanged: (callback: (sessions: any[]) => void) => {
    const sub = (_event: any, sessions: any[]) => callback(sessions)
    ipcRenderer.on('media-sessions-changed', sub)
    return () => ipcRenderer.removeListener('media-sessions-changed', sub)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('electronAPI', electronAPIExtended)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.electronAPI = electronAPIExtended
  // @ts-ignore (define in dts)
  window.api = api
}
