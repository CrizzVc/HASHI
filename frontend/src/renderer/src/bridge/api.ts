import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

/**
 * Puente 1:1 del `preload` de Electron sobre Tauri IPC.
 *
 * - Los comandos Rust se nombran en snake_case (`get_system_info`).
 * - Los argumentos van en camelCase (Tauri 2 los convierte a snake_case por
 *   defecto en el `#[tauri::command]`).
 * - La forma de `window.api` replica exactamente `preload/index.d.ts`.
 */

type Api = Window['api']

type ElectronLike = Window['electron']

export function isTauri(): boolean {
  return '__TAURI_INTERNALS__' in window
}

/**
 * Suscripción a eventos del proceso principal compatible con ambos mundos:
 * en Electron delega en `window.electron.ipcRenderer.on` (payload en args[1]),
 * en Tauri usa `listen`. Devuelve la función de cancelación síncrona
 * (la suscripción Tauri se resuelve en microtask; si se cancela antes, se
 * desuscribe en cuanto esté lista).
 */
export function onIpcEvent<T>(channel: string, callback: (payload: T) => void): () => void {
  const electronIpc = (window as { electron?: ElectronLike }).electron?.ipcRenderer
  if (electronIpc && typeof electronIpc.on === 'function') {
    const unsubscribe = electronIpc.on(channel, (...args: unknown[]) => {
      callback((args.length > 1 ? args[1] : args[0]) as T)
    })
    return typeof unsubscribe === 'function' ? unsubscribe : () => {}
  }
  if (!isTauri()) return () => {}

  let cancelled = false
  let unlisten: UnlistenFn | null = null
  listen<T>(channel, (event) => callback(event.payload))
    .then((fn) => {
      if (cancelled) fn()
      else unlisten = fn
    })
    .catch(() => {})
  return () => {
    cancelled = true
    unlisten?.()
    unlisten = null
  }
}

const api: Api = {
  // ── Sistema / versión ──
  getSystemInfo: () => invoke('get_system_info'),
  getAppVersion: () => invoke('get_app_version'),
  checkForUpdates: () => invoke('check_for_updates'),

  // ── Juegos ──
  getGames: () => invoke('get_games'),
  saveGames: (games) => invoke('save_games', { games }),
  selectGameFile: () => invoke('select_game_file'),
  getFileIcon: (filePath) => invoke('get_file_icon', { filePath }),
  launchGame: (gameId, exePath, launchMethod) =>
    invoke('launch_game', { gameId, exePath, launchMethod: launchMethod ?? null }),
  onGameExited: (callback) => onIpcEvent('game-exited', callback),
  onGameSessionStart: (callback) => onIpcEvent('game-session-start', callback),
  onGameLaunchError: (callback) => onIpcEvent('game-launch-error', callback),
  onForceResizeRecalc: (callback) => onIpcEvent('force-resize-recalc', callback),

  // ── Ventana ──
  setOmniconsole: (enabled) => invoke('set_omniconsole', { enabled }),
  minimizeWindow: () => invoke('minimize_window'),
  quitApp: () => invoke('quit_app'),

  // ── Fondo / wallpaper ──
  selectBackgroundImage: () => invoke('select_background_image'),
  getBackgroundImage: () => invoke('get_background_image'),
  clearBackgroundImage: () => invoke('clear_background_image'),
  selectWallpaperFolder: () => invoke('select_wallpaper_folder'),
  getWallpaperFolder: () => invoke('get_wallpaper_folder'),
  getWallpaperImages: (folder?) => invoke('get_wallpaper_images', { folder }),
  setWallpaperAsBackground: (sourcePath) => invoke('set_wallpaper_as_background', { sourcePath }),
  getWallpaperPreview: (path) => invoke('get_wallpaper_preview', { path }),

  // ── Perfil ──
  getProfile: () => invoke('get_profile'),
  saveProfile: (profile) => invoke('save_profile', { profile }),
  selectProfileImage: () => invoke('select_profile_image'),

  // ── Tiendas / enlaces externos ──
  getStores: () => invoke('get_stores'),
  openStore: (storeId) => invoke('open_store', { storeId }),
  openExternal: (url) => invoke('open_external', { url }),

  // ── Extensiones ──
  getExtensions: () => invoke('get_extensions'),
  setExtensionEnabled: (id, enabled) => invoke('set_extension_enabled', { id, enabled }),
  openExtensionSession: (id) => invoke('open_extension_session', { id }),
  closeExtensionSession: (id) => invoke('close_extension_session', { id }),
  openExtensionsDirectory: () => invoke('open_extensions_directory'),

  // ── Cuenta Steam ──
  getSteamAccount: () => invoke('get_steam_account'),
  saveSteamAccount: (steamAccount) => invoke('save_steam_account', { steamAccount }),
  openSteamOpenId: () => invoke('open_steam_openid'),
  getSteamInstallationStatus: (appIds) => invoke('get_steam_installation_status', { appIds }),
  getSteamDownloadProgress: () => invoke('get_steam_download_progress'),

  // ── Autoarranque ──
  createStartupShortcut: () => invoke('create_startup_shortcut'),
  getStartupStatus: () => invoke('get_startup_status'),
  removeStartupShortcut: () => invoke('remove_startup_shortcut'),

  // ── Puerto del backend ──
  getBackendPort: () => invoke('get_backend_port'),
  setBackendPort: (port) => invoke('set_backend_port', { port }),
  checkPortInUse: (port) => invoke('check_port_in_use', { port }),

  // ── Boot/suspend video ──
  getBootVideoPath: () => invoke('get_boot_video_path'),
  downloadBootVideo: (url, target, videoId?) =>
    invoke('download_boot_video', { url, target, videoId }),
  deleteBootVideo: (target) => invoke('delete_boot_video', { target }),
  onBootVideoProgress: (callback) => onIpcEvent('boot-video-progress', callback),

  // ── Medios del sistema (WPS5-compat) ──
  getSystemMedia: () => invoke('get_system_media'),
  controlSystemMedia: (action, target?) => invoke('control_system_media', { action, target }),
  getMediaSessions: () => invoke('get_media_sessions'),
  mediaControl: (action, target?) => invoke('media_control', { action, target }),
  onMediaSessionsChanged: (callback) => onIpcEvent('media-sessions-changed', callback),

  // ── APIs externas ──
  fetchSteamDeckRepoPosts: () => invoke('steamdeckrepo_fetch_posts')
}

// Auto-instalador: solo en Tauri (en Electron el preload ya expuso `window.api`,
// por lo que no lo sobrescribimos).
if (isTauri() && !window.api) {
  window.api = api
}
