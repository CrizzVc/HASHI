import { app, shell, BrowserWindow, ipcMain, dialog, nativeImage, Tray, Menu, protocol, net } from 'electron'
import { join, dirname, extname, basename, normalize } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import steamLogoAsset from '../renderer/src/assets/tiendas/steamLogo.png?asset'
import hashiLogoAsset from '../renderer/src/assets/images/HASHI_LOGO_BLANCO.svg?asset'
import appIconAsset from '../renderer/src/assets/images/icono.png?asset'
import * as fs from 'fs'
import * as crypto from 'crypto'
import { spawn, fork, execSync, type ChildProcess } from 'child_process'
import * as http from 'http'
import * as nodeNet from 'net'

// Permitir autoplay de video con sonido sin interacción del usuario (boot video)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
import { URL, pathToFileURL } from 'url'

// ── Protocolo personalizado para servir archivos locales fuera del paquete de la app ──
// Chromium bloquea `file://` hacia rutas arbitrarias del sistema (p.ej. la carpeta
// userData) cuando la página no fue cargada desde ese mismo directorio; de ahí el
// error "Not allowed to load local resource". Este esquema privilegiado (con
// soporte de fetch/streaming, necesario para que el <video> pueda hacer seek) sirve
// como puente seguro para reproducir archivos como el boot video.
const MEDIA_PROTOCOL_SCHEME = 'hashi-media'

protocol.registerSchemesAsPrivileged([
  {
    scheme: MEDIA_PROTOCOL_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true
    }
  }
])

// Convierte una ruta absoluta del filesystem en una URL servible por el renderer
// a través del protocolo `hashi-media://`.
function toMediaUrl(absPath: string): string {
  return `${MEDIA_PROTOCOL_SCHEME}://local-file/${encodeURIComponent(absPath)}`
}
import { translations } from '../renderer/src/translations'

const STEAM_API_KEY = 'B1F361EA3C07B455DC8B0D06ED179B00'
const STEAM_OPENID_RETURN_URL = 'http://127.0.0.1:8765/steam-openid'
const STEAM_OPENID_REALM = 'http://127.0.0.1:8765'

interface SteamOpenIdResult {
  linked: boolean
  apiKey: string
  steamId: string
  accountName: string
  steamId64: string | null
}

let steamOpenIdServer: http.Server | null = null
let steamOpenIdResolve: ((value: SteamOpenIdResult) => void) | null = null
let steamOpenIdReject: ((reason?: unknown) => void) | null = null

// ── System Media (windows-media-sessions + win-media-control) como en WPS5 referencia ──
let mainWindowRef: BrowserWindow | null = null
let mediaSessionsUnsubscribe: (() => void) | null = null
let mediaSessionsPollTimer: NodeJS.Timeout | null = null
let windowsMediaSessionsModule: any = null
let winMediaControlModulePromise: Promise<any> | null = null

// ── System tray ──
let tray: Tray | null = null

// ── Backend Express server (proceso hijo) ──
let backendProcess: ChildProcess | null = null
let currentBackendPort = 3000

function getBackendPortConfigPath(): string {
  return join(app.getPath('userData'), 'backend-port.json')
}

function readBackendPort(): number {
  try {
    const raw = JSON.parse(fs.readFileSync(getBackendPortConfigPath(), 'utf8'))
    if (typeof raw.port === 'number' && raw.port > 0 && raw.port < 65536) return raw.port
  } catch { /* ignore */ }
  return 3000
}

function saveBackendPort(port: number): void {
  try {
    fs.writeFileSync(getBackendPortConfigPath(), JSON.stringify({ port }, null, 2), 'utf8')
  } catch { /* ignore */ }
}

function checkPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = nodeNet.createServer()
    server.once('error', () => resolve(true))
    server.once('listening', () => {
      server.close(() => resolve(false))
    })
    server.listen(port)
  })
}

// ── Game session flag — suspende actividades durante gameplay ──
let isGameRunning = false

// ── Omniconsole — prevent launcher from hiding when a game launches ──
let omniconsoleEnabled = false

interface LauncherExtension {
  id: string
  name: string
  description: string
  version: string
  type: 'external' | 'native' | 'embedded'
  entryUrl: string | null
  viewId: string | null
  backendEntry?: string | null
  dirPath?: string
  sidebar: boolean
  enabled: boolean
}

function getExtensionsDirectory(): string {
  return join(app.getPath('userData'), 'extensions')
}

function getBundledExtensionsDirectory(): string {
  return is.dev
    ? join(app.getAppPath(), 'resources', 'extensions')
    : join(process.resourcesPath, 'extensions')
}

function getExtensionsStatePath(): string {
  return join(app.getPath('userData'), 'extensions-state.json')
}

function readExtensionsState(): Record<string, boolean> {
  try {
    const raw = JSON.parse(fs.readFileSync(getExtensionsStatePath(), 'utf8')) as Record<string, unknown>
    const state: Record<string, boolean> = {}
    for (const [id, value] of Object.entries(raw)) {
      if (typeof value === 'boolean') state[id] = value
    }
    return state
  } catch {
    return {}
  }
}

function isSafeExtensionUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'file:'
  } catch {
    return false
  }
}

function readExtensionsFrom(extensionsDir: string): LauncherExtension[] {
  if (!fs.existsSync(extensionsDir)) return []

  try {
    return fs.readdirSync(extensionsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry): LauncherExtension[] => {
        try {
          const manifestPath = join(extensionsDir, entry.name, 'manifest.json')
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, unknown>
          const id = typeof manifest.id === 'string' ? manifest.id : ''
          const name = typeof manifest.name === 'string' ? manifest.name : ''
          const description = typeof manifest.description === 'string' ? manifest.description : ''
          const version = typeof manifest.version === 'string' ? manifest.version : ''
          const rawType = typeof manifest.type === 'string' ? manifest.type : 'external'
          const type = (rawType === 'native' || rawType === 'embedded') ? rawType : 'external'
          const rawEntryUrl = typeof manifest.entryUrl === 'string' ? manifest.entryUrl.trim() : null
          const viewId = typeof manifest.viewId === 'string' ? manifest.viewId : null
          const backendEntry = typeof manifest.backendEntry === 'string'
            ? manifest.backendEntry
            : typeof manifest.backend === 'string'
              ? manifest.backend
              : null
          const sidebar = manifest.sidebar === true
          const enabled = typeof manifest.enabled === 'boolean' ? manifest.enabled : true

          // Auto-detección de frontend local si no se especifica entryUrl o si es solo frontend
          let entryUrl = rawEntryUrl
          if (!entryUrl && type === 'external') {
            const frontendIndex = join(extensionsDir, entry.name, 'frontend', 'index.html')
            const rootIndex = join(extensionsDir, entry.name, 'index.html')
            if (fs.existsSync(frontendIndex)) {
              entryUrl = pathToFileURL(frontendIndex).href
            } else if (fs.existsSync(rootIndex)) {
              entryUrl = pathToFileURL(rootIndex).href
            }
          }

          const validEntry = type === 'external'
            ? (entryUrl !== null && isSafeExtensionUrl(entryUrl))
            : type === 'embedded'
              ? viewId !== null
              : false
          if (!/^[a-z0-9][a-z0-9-]{1,63}$/i.test(id) || !name || !version || !validEntry) return []
          return [{
            id,
            name: name.slice(0, 80),
            description: description.slice(0, 240),
            version: version.slice(0, 32),
            type,
            entryUrl: type === 'external' ? entryUrl : null,
            viewId: type === 'embedded' ? viewId : null,
            backendEntry,
            dirPath: join(extensionsDir, entry.name),
            sidebar,
            enabled
          }]
        } catch {
          return []
        }
      })
  } catch (error) {
    console.warn('[Extensions] No se pudo leer el directorio:', error)
    return []
  }
}

// ── Extension Process Manager ──
const runningExtensionProcesses = new Map<string, ChildProcess>()

function startExtensionBackend(extension: LauncherExtension): void {
  if (runningExtensionProcesses.has(extension.id)) return
  if (!extension.enabled || !extension.backendEntry || !extension.dirPath) return

  const scriptPath = join(extension.dirPath, extension.backendEntry)
  if (!fs.existsSync(scriptPath)) {
    console.warn(`[Extensions] Backend no encontrado para '${extension.id}': ${scriptPath}`)
    return
  }

  try {
    const child = fork(scriptPath, [], {
      cwd: dirname(scriptPath),
      env: {
        ...process.env,
        PORT: '3001'
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    })

    child.stdout?.on('data', (data) => {
      console.log(`[Ext:${extension.id}] ${data.toString().trim()}`)
    })

    child.stderr?.on('data', (data) => {
      console.error(`[Ext:${extension.id}:error] ${data.toString().trim()}`)
    })

    child.on('error', (err) => {
      console.error(`[Ext:${extension.id}] Error en proceso:`, err.message)
      runningExtensionProcesses.delete(extension.id)
    })

    child.on('exit', (code) => {
      console.log(`[Ext:${extension.id}] Proceso finalizado (código ${code})`)
      runningExtensionProcesses.delete(extension.id)
    })

    runningExtensionProcesses.set(extension.id, child)
    console.log(`[Extensions] Backend auto-iniciado para '${extension.id}'`)
  } catch (err: any) {
    console.error(`[Extensions] Error iniciando backend para '${extension.id}':`, err.message)
  }
}

function startExtensionBackendById(extensionId: string): void {
  const extensions = readExtensions()
  const extension = extensions.find((e) => e.id === extensionId)
  if (extension) {
    startExtensionBackend(extension)
  }
}

function stopExtensionBackend(extensionId: string): void {
  const child = runningExtensionProcesses.get(extensionId)
  if (child && !child.killed) {
    try {
      child.kill()
    } catch (e) {
      console.warn(`[Extensions] Error deteniendo backend '${extensionId}':`, e)
    }
    runningExtensionProcesses.delete(extensionId)
    console.log(`[Extensions] Backend detenido para '${extensionId}'`)
  }
}

function syncExtensionProcesses(): void {
  const extensions = readExtensions()
  const activeIds = new Set(extensions.filter((e) => e.enabled && e.backendEntry).map((e) => e.id))

  // Detener solo los procesos de extensiones que fueron deshabilitadas o eliminadas
  for (const [runningId] of runningExtensionProcesses) {
    if (!activeIds.has(runningId)) {
      stopExtensionBackend(runningId)
    }
  }
}

function stopAllExtensionBackends(): void {
  for (const [, child] of runningExtensionProcesses) {
    if (child && !child.killed) {
      try {
        child.kill()
      } catch { }
    }
  }
  runningExtensionProcesses.clear()
}

function readExtensions(): LauncherExtension[] {
  const state = readExtensionsState()
  const bundled = readExtensionsFrom(getBundledExtensionsDirectory())
  const user = readExtensionsFrom(getExtensionsDirectory())

  const merged = new Map<string, LauncherExtension>()
  for (const ext of bundled) merged.set(ext.id, ext)
  for (const ext of user) merged.set(ext.id, ext)

  return Array.from(merged.values()).map((ext) => ({
    ...ext,
    enabled: state[ext.id] !== undefined ? state[ext.id] : ext.enabled
  }))
}

/**
 * Oculta el launcher mientras se juega.
 * - Con Omniconsole: minimiza normalmente (visible en barra de tareas).
 * - Sin Omniconsole: minimiza + saca de la barra de tareas para que parezca
 *   oculto, pero sin usar win.hide() que hace que herramientas externas
 *   (p.ej. Omniconsole de la comunidad) lo detecten como cerrado y lo
 *   vuelvan a abrir, generando dos instancias al terminar el juego.
 */
function hideForGame(win: BrowserWindow): void {
  if (omniconsoleEnabled) {
    win.minimize()
  } else {
    win.setSkipTaskbar(true)
    win.minimize()
  }
}

/**
 * Restaura el launcher tras finalizar una sesión de juego.
 * Devuelve el ícono a la barra de tareas si se había ocultado.
 */
function showAfterGame(win: BrowserWindow): void {
  win.setSkipTaskbar(false)
  win.show()
  win.focus()
}

function createTray(): void {
  if (tray) return // ya existe

  tray = new Tray(appIconAsset)
  tray.setToolTip('HASHI Launcher')

  const buildMenu = (): Electron.Menu =>
    Menu.buildFromTemplate([
      {
        label: 'Mostrar HASHI',
        click: () => {
          if (mainWindowRef && !mainWindowRef.isDestroyed()) {
            mainWindowRef.setSkipTaskbar(false)
            mainWindowRef.show()
            mainWindowRef.focus()
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Salir',
        click: () => {
          if (mainWindowRef && !mainWindowRef.isDestroyed()) {
            mainWindowRef.removeAllListeners('close')
            mainWindowRef.close()
          }
          tray?.destroy()
          tray = null
          stopBackend()
          stopAllExtensionBackends()
          stopMediaSessionsBridge()
          app.exit(0)
        }
      }
    ])

  tray.setContextMenu(buildMenu())

  // Doble clic en el icono del tray → mostrar ventana
  tray.on('double-click', () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.setSkipTaskbar(false)
      mainWindowRef.show()
      mainWindowRef.focus()
    }
  })
}

function startBackend(port?: number): void {
  if (is.dev) return // En dev se corre manualmente con "npm run dev" en backend/

  const backendDir = join(process.resourcesPath, 'backend')
  const scriptPath = join(backendDir, 'src', 'app.js')
  const resolvedPort = port || readBackendPort()
  currentBackendPort = resolvedPort

  try {
    backendProcess = fork(scriptPath, {
      cwd: backendDir,
      env: {
        ...process.env,
        PORT: String(resolvedPort)
      }
    })

    backendProcess.on('error', (err) => {
      console.error('[Backend] Error starting:', err.message)
    })

    backendProcess.on('exit', (code) => {
      console.log(`[Backend] Process exited with code ${code}`)
      backendProcess = null
    })

    console.log(`[Backend] Started on port ${resolvedPort}`)
  } catch (err: any) {
    console.error('[Backend] Failed to start:', err.message)
  }
}

function stopBackend(): void {
  if (backendProcess && !backendProcess.killed) {
    console.log('[Backend] Stopping...')
    backendProcess.kill()
    backendProcess = null
  }
}

function restartBackend(port: number): void {
  stopBackend()
  startBackend(port)
}

function getWindowsMediaSessionsModule(): any {
  if (windowsMediaSessionsModule) return windowsMediaSessionsModule
  const candidates = [
    'windows-media-sessions',
    join(__dirname, '..', '..', 'node_modules', 'windows-media-sessions'),
    // En producción con asarUnpack, los binarios van a app.asar.unpacked
    join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'windows-media-sessions')
  ]
  for (const cand of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      windowsMediaSessionsModule = require(cand)
      // Sobreescribir la ruta del .exe para apuntar a la copia desempaquetada
      if (windowsMediaSessionsModule && !is.dev) {
        process.env.WINDOWS_MEDIA_SESSIONS_BACKEND = join(
          process.resourcesPath,
          'app.asar.unpacked',
          'node_modules',
          'windows-media-sessions',
          'bin',
          'win-x64',
          'windows-media-sessions-backend.exe'
        )
      }
      return windowsMediaSessionsModule
    } catch { }
  }
  return null
}

function getWinMediaControlModule(): Promise<any> {
  if (process.platform !== 'win32') return Promise.resolve(null)
  if (!winMediaControlModulePromise) {
    winMediaControlModulePromise = import('win-media-control')
      .then((m) => {
        // En producción, win-media-control resuelve sus scripts con import.meta.url
        // que apunta dentro del ASAR — PowerShell no puede leer rutas virtuales del ASAR.
        // Monkey-patch: reemplazamos el módulo con un wrapper que ejecuta los mismos
        // scripts .ps1 pero desde la ruta desempaquetada en app.asar.unpacked.
        if (!is.dev) {
          const unpacked = join(
            process.resourcesPath,
            'app.asar.unpacked',
            'node_modules',
            'win-media-control',
            'scripts'
          )
          const { exec } = require('child_process') as typeof import('child_process')
          const { promisify } = require('util') as typeof import('util')
          const execAsync = promisify(exec)

          const runPs1 = (script: string, params: Record<string, any> = {}): Promise<string> => {
            const scriptPath = join(unpacked, script)
            const hasArray = Object.values(params).some((v) => Array.isArray(v))
            let cmd: string
            if (hasArray) {
              const parts = Object.entries(params).map(([k, v]) => {
                if (Array.isArray(v)) {
                  const arr = v.map((x: any) => `'${String(x).replace(/'/g, "''")}'`).join(',')
                  return `-${k} @(${arr})`
                }
                return `-${k} '${String(v).replace(/'/g, "''")}'`
              })
              cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& '${scriptPath.replace(/'/g, "''")}' ${parts.join(' ')}"`
            } else {
              const parts = Object.entries(params).map(([k, v]) => {
                const esc = String(v).replace(/"/g, '`"')
                return esc.includes(' ') || esc.includes('&') ? `-${k} "${esc}"` : `-${k} ${esc}`
              })
              cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" ${parts.join(' ')}`
            }
            return execAsync(cmd, { windowsHide: true, timeout: 10000 }).then(({ stdout }) => stdout.trim())
          }

          const controlSession = async (action: string): Promise<{ success: string[]; failed: any[] }> => {
            try {
              await runPs1('control-current.ps1', { Action: action })
              return { success: ['Current Session'], failed: [] }
            } catch {
              try {
                await runPs1('simulate-media-key.ps1', { Action: action })
                return { success: [action], failed: [] }
              } catch (err2: any) {
                return { success: [], failed: [{ app: 'MediaKey', reason: err2.message }] }
              }
            }
          }

          return {
            togglePlayPause: (apps?: any) => apps === undefined ? controlSession('TogglePlayPause') : controlSession('TogglePlayPause'),
            next: (apps?: any) => apps === undefined ? controlSession('SkipNext') : controlSession('SkipNext'),
            previous: (apps?: any) => apps === undefined ? controlSession('SkipPrevious') : controlSession('SkipPrevious'),
            play: (apps?: any) => apps === undefined ? controlSession('Play') : controlSession('Play'),
            pause: (apps?: any) => apps === undefined ? controlSession('Pause') : controlSession('Pause'),
          }
        }
        return m
      })
      .catch((err) => {
        console.warn('[MediaControl] win-media-control no disponible:', (err as Error).message)
        winMediaControlModulePromise = null
        return null
      })
  }
  return winMediaControlModulePromise
}

function resolveMediaControlApp(target: any): string | undefined {
  if (!target || typeof target !== 'object') return undefined
  const appName = String(target.appName || '').trim()
  if (appName) {
    const lower = appName.toLowerCase()
    if (lower.includes('chrome') || lower.includes('youtube')) return 'Chrome'
    if (lower.includes('spotify')) return 'Spotify'
    if (lower.includes('firefox')) return 'Firefox'
    if (lower.includes('edge')) return 'Edge'
    if (lower.includes('groove')) return 'Groove'
    return appName
  }
  const aumid = String(target.sourceAppUserModelId || '').trim()
  return aumid || undefined
}

async function sendMediaControlAction(action: string, target: any): Promise<any> {
  if (process.platform !== 'win32') return { success: false }
  const media = await getWinMediaControlModule()
  if (!media) return { success: false, error: 'win-media-control unavailable' }
  const fnByAction: Record<string, any> = {
    play_pause: media.togglePlayPause,
    play: media.togglePlayPause,
    pause: media.togglePlayPause,
    toggle: media.togglePlayPause,
    next: media.next,
    prev: media.previous,
    previous: media.previous
  }
  const fn = fnByAction[action]
  if (!fn) return { success: false, error: 'unknown action' }
  const app = resolveMediaControlApp(target)
  try {
    let result = app !== undefined ? await fn(app) : await fn()
    let ok = Array.isArray(result?.success) && result.success.length > 0
    if (!ok && app !== undefined) {
      result = await fn()
      ok = Array.isArray(result?.success) && result.success.length > 0
    }
    setTimeout(broadcastMediaSessions, 350)
    return { success: ok, ...result }
  } catch (err: any) {
    console.warn('[MediaControl]', action, err.message)
    return { success: false, error: err.message }
  }
}

async function fetchMediaSessionsForRenderer(): Promise<any[]> {
  let sessions: any[] = []
  const mediaModule = getWindowsMediaSessionsModule()
  if (process.platform === 'win32' && mediaModule?.getAllSessions) {
    try {
      sessions = await mediaModule.getAllSessions()
    } catch (err: any) {
      console.warn('[MediaSessions] fetch:', err.message)
    }
  }
  return sessions
}

function broadcastMediaSessions(): void {
  if (isGameRunning) return
  fetchMediaSessionsForRenderer()
    .then((sessions) => {
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('media-sessions-changed', sessions)
      }
    })
    .catch((err: any) => console.warn('[MediaSessions] broadcast:', err.message))
}

function startMediaSessionsBridge(): void {
  if (process.platform !== 'win32') return
  const mediaModule = getWindowsMediaSessionsModule()
  if (!mediaModule) {
    console.warn('[MediaSessions] Paquete no instalado. Ejecuta: npm install windows-media-sessions')
    mediaSessionsPollTimer = setInterval(broadcastMediaSessions, 2500)
    return
  }
  try {
    broadcastMediaSessions()
    if (mediaModule.onSessionsChanged) {
      mediaSessionsUnsubscribe = mediaModule.onSessionsChanged(() => broadcastMediaSessions())
    }
    mediaSessionsPollTimer = setInterval(broadcastMediaSessions, 2500)
  } catch (err: any) {
    console.warn('[MediaSessions] No disponible:', err.message)
    mediaSessionsPollTimer = setInterval(broadcastMediaSessions, 2500)
  }
}

function stopMediaSessionsBridge(): void {
  if (mediaSessionsPollTimer) {
    clearInterval(mediaSessionsPollTimer)
    mediaSessionsPollTimer = null
  }
  if (mediaSessionsUnsubscribe) {
    mediaSessionsUnsubscribe()
    mediaSessionsUnsubscribe = null
  }
  const mediaModule = getWindowsMediaSessionsModule()
  if (mediaModule?.shutdown) mediaModule.shutdown().catch(() => { })
}

// ── Suspend / Resume activities during gameplay ──
function suspendActivities(): void {
  stopMediaSessionsBridge()
}

function resumeActivities(): void {
  startMediaSessionsBridge()
}

function assetToDataUri(assetPath: string): string {
  const buf = fs.readFileSync(assetPath)
  const ext = extname(assetPath).toLowerCase()
  const mimeMap: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' }
  const mime = mimeMap[ext] || 'application/octet-stream'
  return `data:${mime};base64,${buf.toString('base64')}`
}

function ensureSteamOpenIdServer(): void {
  if (steamOpenIdServer) return

  steamOpenIdServer = http.createServer((req: any, res: any) => {
    const requestUrl = new URL(req.url || '/', STEAM_OPENID_RETURN_URL)
    const mode = requestUrl.searchParams.get('openid.mode')
    const identity = requestUrl.searchParams.get('openid.identity') || requestUrl.searchParams.get('openid.claimed_id')

    const hashiLogoDataUri = assetToDataUri(hashiLogoAsset)
    const steamLogoDataUri = assetToDataUri(steamLogoAsset)
    const t = translations['es']

    if (requestUrl.pathname === '/steam-openid' && mode === 'id_res' && identity) {
      const steamIdMatch = identity.match(/\/id\/(\d+)/)
      const steamId = steamIdMatch ? steamIdMatch[1] : null

      if (steamId) {
        const payload = {
          linked: true,
          apiKey: STEAM_API_KEY,
          steamId,
          accountName: `Steam ${steamId}`,
          steamId64: steamId
        }

        const steamAccountPath = join(app.getPath('userData'), 'steam-account.json')
        fs.writeFileSync(steamAccountPath, JSON.stringify(payload, null, 2), 'utf8')

        if (steamOpenIdResolve) {
          steamOpenIdResolve(payload)
        }
        steamOpenIdResolve = null
        steamOpenIdReject = null

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="${hashiLogoDataUri}">
<title>Steam conectado</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: #1E1E1E; color: #fff;
  }
  .container { text-align: center; max-width: 600px; padding: 40px; }

  .layout { display: flex; align-items: center; justify-content: center; gap: 32px; margin-bottom: 32px; }
  .hashi-logo img { width: 130px; height: 130px; object-fit: contain; }
  .steam-logo img { width: 130px; height: 130px; object-fit: contain; }
  .divider { font-size: 36px; font-weight: 700; color: #555; }

  .title { font-size: 24px; font-weight: 400; color: #fff; margin-bottom: 16px; }

  .subtitle { font-size: 14px; color: #aaa; line-height: 1.6; }
  .subtitle a { color: #66c0f4; text-decoration: none; font-weight: 500; }
  .subtitle a:hover { text-decoration: underline; }

  .links { margin-top: 24px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; }
  .links span { color: #555; }
  .links a { color: #888; text-decoration: none; font-weight: 500; }
  .links a:hover { color: #fff; }

  .fade-in { opacity: 0; animation: fadeIn 0.5s ease forwards; }
  .fade-in-d1 { animation-delay: 0.1s; }
  .fade-in-d2 { animation-delay: 0.2s; }
  .fade-in-d3 { animation-delay: 0.35s; }

  @keyframes fadeIn { to { opacity: 1; } }
</style>
</head>
<body>
  <div class="container">
    <div class="layout fade-in">
      <div class="hashi-logo">
        <img src="${hashiLogoDataUri}" alt="Hashi">
      </div>
      <span class="divider">×</span>
      <div class="steam-logo">
        <img src="${steamLogoDataUri}" alt="Steam">
      </div>
    </div>
    <h1 class="title fade-in fade-in-d1">${t.steamConected}</h1>
    <p class="subtitle fade-in fade-in-d2">${t.steamCloseConnection1} <a href="#" onclick="window.close()">${t.steamCloseConnection2}</a>.</p>
    <div class="links fade-in fade-in-d3">
      <a href="https://store.steampowered.com" target="_blank">Steam Store</a>
      <span>|</span>
      <a href="https://steamcommunity.com" target="_blank">Community</a>
    </div>
  </div>
</body>
</html>`)
        return
      }
    }

    if (steamOpenIdReject) {
      steamOpenIdReject(new Error(`No se pudo completar la autenticación de Steam.`))
    }
    steamOpenIdResolve = null
    steamOpenIdReject = null

    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="${hashiLogoDataUri}">
<title>Steam - Error</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: #1E1E1E; color: #fff;
  }
  .container { text-align: center; max-width: 600px; padding: 40px; }

  .layout { display: flex; align-items: center; justify-content: center; gap: 32px; margin-bottom: 32px; }
  .hashi-logo img { width: 80px; height: 80px; object-fit: contain; }
  .steam-logo img { width: 80px; height: 80px; object-fit: contain; }
  .divider { font-size: 36px; font-weight: 700; color: #555; }

  .title { font-size: 24px; font-weight: 400; color: #fff; margin-bottom: 16px; }

  .subtitle { font-size: 14px; color: #aaa; line-height: 1.6; }
  .subtitle a { color: #66c0f4; text-decoration: none; font-weight: 500; }
  .subtitle a:hover { text-decoration: underline; }

  .links { margin-top: 24px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; }
  .links span { color: #555; }
  .links a { color: #888; text-decoration: none; font-weight: 500; }
  .links a:hover { color: #fff; }

  .fade-in { opacity: 0; animation: fadeIn 0.5s ease forwards; }
  .fade-in-d1 { animation-delay: 0.1s; }
  .fade-in-d2 { animation-delay: 0.2s; }
  .fade-in-d3 { animation-delay: 0.35s; }

  @keyframes fadeIn { to { opacity: 1; } }
</style>
</head>
<body>
  <div class="container">
    <div class="layout fade-in">
      <div class="hashi-logo">
        <img src="${hashiLogoDataUri}" alt="Hashi">
      </div>
      <span class="divider">×</span>
      <div class="steam-logo">
        <img src="${steamLogoDataUri}" alt="Steam">
      </div>
    </div>
    <h1 class="title fade-in fade-in-d1">${t.steamNotConected}</h1>
    <p class="subtitle fade-in fade-in-d2">${t.steamLoginFailedDesc1} <a href="#" onclick="window.close()">${t.steamLoginFailedDesc2}</a>.</p>
    <div class="links fade-in fade-in-d3">
      <a href="https://help.steampowered.com" target="_blank">Steam Support</a>
      <span>|</span>
      <a href="https://store.steampowered.com" target="_blank">Steam Store</a>
    </div>
  </div>
</body>
</html>`)
  })

  steamOpenIdServer.listen(8765, '127.0.0.1')
}

// ── Single-instance lock — evita que arrancar el exe dos veces (p.ej. acceso
// directo de inicio de Windows con la app ya abierta) genere una segunda ventana.
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Si alguien intenta abrir una segunda instancia, foca la existente.
    if (mainWindowRef) {
      if (mainWindowRef.isMinimized()) mainWindowRef.restore()
      mainWindowRef.setSkipTaskbar(false)
      mainWindowRef.show()
      mainWindowRef.focus()
    }
  })
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1380,
    height: 830,
    minWidth: 1366,
    minHeight: 768,
    show: false,
    fullscreen: true,
    autoHideMenuBar: true,
    icon: appIconAsset,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (!isGameRunning) {
      mainWindow.show()
    }
  })

  // Guard: prevent window from being shown while a game is running.
  // Usamos hideForGame() en vez de hide() para que herramientas externas
  // no detecten la ventana como cerrada y la vuelvan a abrir.
  mainWindow.on('show', () => {
    if (isGameRunning && !omniconsoleEnabled) {
      hideForGame(mainWindow)
    }
  })

  // ── Workaround: en monitores 4K con escalado != 100%, Chromium a veces no
  // recalcula bien el layout/DPI al entrar o salir de fullscreen (F11 usa el
  // menú por defecto de Electron -> mainWindow.setFullScreen()). Forzamos un
  // "nudge" de los bounds para que repinte con las dimensiones correctas, y
  // avisamos al renderer para que recalcule lo que dependa de window size.
  const forceLayoutRefresh = (): void => {
    if (mainWindow.isDestroyed()) return
    const bounds = mainWindow.getBounds()
    // Un cambio de 1px y su reversión inmediata basta para forzar el repintado
    mainWindow.setBounds({ ...bounds, width: bounds.width + 1 })
    setTimeout(() => {
      if (mainWindow.isDestroyed()) return
      mainWindow.setBounds(bounds)
      mainWindow.webContents.send('force-resize-recalc')
    }, 30)
  }

  // ── Interceptar cierre: nunca destruir la ventana, solo minimizar y ocultar
  // el ícono de la barra de tareas. El usuario sale desde el botón "Salir"
  // explícito (que llama a window.api.quitApp()) o cerrando desde la barra
  // de tareas del propio sistema si lo minimiza completamente.
  mainWindow.on('close', (e) => {
    if (!mainWindow.isDestroyed()) {
      e.preventDefault()
      mainWindow.setSkipTaskbar(true)
      mainWindow.minimize()
    }
  })

  mainWindow.on('enter-full-screen', forceLayoutRefresh)
  mainWindow.on('leave-full-screen', forceLayoutRefresh)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-finish-load', () => {
    broadcastMediaSessions()
  })

  mainWindowRef = mainWindow

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // ── Handler del protocolo hashi-media:// ──
  // Sirve archivos locales (boot video, etc.) fuera del paquete de la app.
  // Restringido a la carpeta userData: nunca expone el resto del filesystem.
  protocol.handle(MEDIA_PROTOCOL_SCHEME, async (request) => {
    try {
      const requestUrl = new URL(request.url)
      const encodedPath = requestUrl.pathname.replace(/^\//, '')
      const decodedPath = decodeURIComponent(encodedPath)
      const filePath = normalize(decodedPath)

      const userDataDir = normalize(app.getPath('userData'))
      if (!filePath.toLowerCase().startsWith(userDataDir.toLowerCase())) {
        return new Response('Forbidden', { status: 403 })
      }
      if (!fs.existsSync(filePath)) {
        return new Response('Not found', { status: 404 })
      }

      // net.fetch sobre una file:// URL respeta Range headers, lo que permite
      // hacer seek en el <video> en vez de tener que cargarlo entero primero.
      return await net.fetch(pathToFileURL(filePath).toString())
    } catch (error) {
      console.error('[hashi-media] Error sirviendo archivo:', error)
      return new Response('Internal error', { status: 500 })
    }
  })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handlers
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('get-system-info', () => {
    const os = require('os')
    return {
      platform: process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux',
      arch: process.arch,
      cpus: os.cpus()[0]?.model || 'Procesador Desconocido',
      totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
      freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + ' GB',
      uptime: Math.round(os.uptime() / 3600) + ' horas'
    }
  })

  const getGamesPath = (): string => {
    return join(app.getPath('userData'), 'games.json')
  }

  ipcMain.handle('get-games', async () => {
    const gamesPath = getGamesPath()
    if (fs.existsSync(gamesPath)) {
      try {
        const data = fs.readFileSync(gamesPath, 'utf8')
        return JSON.parse(data)
      } catch (e) {
        console.error('Error reading games.json', e)
        return []
      }
    }
    return []
  })

  ipcMain.handle('save-games', async (_event, games) => {
    try {
      const gamesPath = getGamesPath()
      fs.writeFileSync(gamesPath, JSON.stringify(games, null, 2), 'utf8')
      return { success: true }
    } catch (e: any) {
      console.error('Error writing games.json', e)
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('select-game-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Ejecutables y Accesos Directos', extensions: ['exe', 'lnk', 'bat', 'cmd', 'sh', 'app'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ]
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  ipcMain.handle('get-file-icon', async (_event, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) return null
      const iconImage = await app.getFileIcon(filePath, { size: 'large' })
      return iconImage.toDataURL()
    } catch (err) {
      console.error('Error getting file icon:', err)
      return null
    }
  })

  // ── Steam game process monitoring ──
  const KNOWN_STEAM_PROCESSES = new Set([
    'steam.exe', 'steamwebhelper.exe', 'gameoverlayui.exe', 'cef.helper.exe',
    'crashhandler.exe', 'steamservice.exe'
  ])

  function getProcessNames(): Set<string> {
    const names = new Set<string>()
    try {
      const out = execSync('tasklist /FO CSV /NH', { encoding: 'utf8', timeout: 5000 })
      for (const line of out.split('\n')) {
        const match = line.match(/"([^"]+)"/)
        if (match) names.add(match[1].toLowerCase())
      }
    } catch { /* ignore */ }
    return names
  }

  function findGameExeFromManifest(appId: string): string[] {
    const exes: string[] = []
    try {
      const steamRoots = getSteamPaths()
      for (const root of steamRoots) {
        const manifestPath = join(root, 'steamapps', `appmanifest_${appId}.acf`)
        if (!fs.existsSync(manifestPath)) continue
        const content = fs.readFileSync(manifestPath, 'utf8')
        const installdirMatch = content.match(/"installdir"\s+"([^"]+)"/)
        if (!installdirMatch) continue
        const gameDir = join(root, 'steamapps', 'common', installdirMatch[1])
        if (!fs.existsSync(gameDir)) continue
        const walk = (dir: string): void => {
          try {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
              const fullPath = join(dir, entry.name)
              if (entry.isDirectory()) walk(fullPath)
              else if (entry.name.toLowerCase().endsWith('.exe')) exes.push(basename(fullPath).toLowerCase())
            }
          } catch { /* ignore */ }
        }
        walk(gameDir)
        if (exes.length > 0) break
      }
    } catch { /* ignore */ }
    return exes
  }

  function monitorSteamGameProcess(appId: string, win: BrowserWindow, gameId: string, startTime: number): void {
    const beforeProcs = getProcessNames()
    const knownSteam = new Set<string>(KNOWN_STEAM_PROCESSES)

    // Try to find specific exe names from manifest
    const manifestExes = findGameExeFromManifest(appId)
    const specificExes = new Set(manifestExes)

    let gameDetected = false
    let stableCount = 0

    const interval = setInterval(() => {
      if (!isGameRunning) { clearInterval(interval); return }

      const currentProcs = getProcessNames()

      if (!gameDetected) {
        // Look for new process that isn't Steam itself
        for (const name of currentProcs) {
          if (!beforeProcs.has(name) && !knownSteam.has(name)) {
            // Either match specific exe from manifest, or any new .exe
            if (specificExes.size === 0 || specificExes.has(name)) {
              gameDetected = true
              specificExes.add(name) // Lock to this specific process
              break
            }
          }
        }
        // Fallback: if specific exe wasn't found, check for any new non-steam process
        if (!gameDetected) {
          for (const name of currentProcs) {
            if (!beforeProcs.has(name) && !knownSteam.has(name) && name.endsWith('.exe')) {
              gameDetected = true
              specificExes.add(name)
              break
            }
          }
        }
        return
      }

      // Game was detected — check if it's still running
      let gameStillRunning = false
      for (const name of specificExes) {
        if (currentProcs.has(name)) { gameStillRunning = true; break }
      }

      if (!gameStillRunning) {
        stableCount++
        // Wait 2 consecutive checks (10s) to avoid false positives
        if (stableCount >= 2) {
          clearInterval(interval)
          isGameRunning = false
          resumeActivities()
          if (win && !win.isDestroyed()) {
            showAfterGame(win)
            const durationMinutes = Math.round((Date.now() - startTime) / 60000)
            win.webContents.send('game-exited', { gameId, durationMinutes: Math.max(1, durationMinutes) })
          }
        }
      } else {
        stableCount = 0
      }
    }, 5000)

    // Safety timeout: 4 hours
    setTimeout(() => clearInterval(interval), 4 * 60 * 60 * 1000)
  }

  ipcMain.handle('launch-game', async (event, gameId: string, exePath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)

    try {
      const hasExecutable = exePath && exePath.trim() !== ''
      const isSteamProtocol = /^steam:\/\//i.test(exePath)
      const fileExists = isSteamProtocol ? false : hasExecutable ? fs.existsSync(exePath) : false
      const ext = hasExecutable && fileExists ? extname(exePath).toLowerCase() : ''
      const isTrackedExe = hasExecutable && fileExists && ext !== '.lnk' && ext !== '.url' && !isSteamProtocol

      const startTime = Date.now()

      if (isTrackedExe) {
        // Juego real (.exe) — ocultar launcher y suspender actividades
        isGameRunning = true
        suspendActivities()
        if (win && !win.isDestroyed()) {
          hideForGame(win)
        }
        if (win && !win.isDestroyed()) {
          win.webContents.send('game-session-start', { gameId })
        }

        const child = spawn(`"${exePath}"`, [], {
          detached: true,
          shell: true,
          cwd: dirname(exePath)
        })

        child.unref()

        child.on('exit', () => {
          isGameRunning = false
          resumeActivities()
          if (win && !win.isDestroyed()) {
            showAfterGame(win)
            const durationMinutes = Math.round((Date.now() - startTime) / 60000)
            win.webContents.send('game-exited', { gameId, durationMinutes: Math.max(1, durationMinutes) })
          }
        })

        return { success: true, tracked: true, startTime }
      }

      // No-tracked: hide for Steam, minimize for others
      if (isSteamProtocol) {
        const isInstall = /^steam:\/\/install\//i.test(exePath)
        if (isInstall) {
          // steam://install — solo abrir Steam, no ocultar el launcher
          await shell.openExternal(exePath)
          return { success: true, tracked: false, startTime, steamProtocol: true, installOnly: true }
        }
        isGameRunning = true
        suspendActivities()
        if (win && !win.isDestroyed()) {
          hideForGame(win)
        }
        if (win && !win.isDestroyed()) {
          win.webContents.send('game-session-start', { gameId })
        }
        const appIdMatch = exePath.match(/\/(\d+)/)
        const steamAppId = appIdMatch ? appIdMatch[1] : ''
        await shell.openExternal(exePath)
        for (const delay of [0, 500, 1500, 3000]) {
          setTimeout(() => {
            if (isGameRunning && win && !win.isDestroyed()) {
              hideForGame(win)
            }
          }, delay)
        }
        if (steamAppId && win && !win.isDestroyed()) {
          monitorSteamGameProcess(steamAppId, win, gameId, startTime)
        }
        return { success: true, tracked: false, startTime, steamProtocol: true }
      }

      if (win) {
        win.minimize()
      }

      if (!hasExecutable || !fileExists) {
        setTimeout(() => {
          if (win && !win.isDestroyed()) {
            win.restore()
            win.focus()
            const simulatedMinutes = Math.floor(Math.random() * 4) + 2
            win.webContents.send('game-exited', { gameId, durationMinutes: simulatedMinutes })
          }
        }, 4000)
        return { success: true, tracked: false, startTime, simulated: true }
      }

      if (ext === '.lnk' || ext === '.url') {
        await shell.openPath(exePath)
        setTimeout(() => {
          if (win && !win.isDestroyed()) {
            win.restore()
            win.focus()
            const simulatedMinutes = Math.floor(Math.random() * 8) + 3
            win.webContents.send('game-exited', { gameId, durationMinutes: simulatedMinutes })
          }
        }, 6000)
        return { success: true, tracked: false, startTime }
      }

      return { success: true, tracked: false, startTime }
    } catch (error: any) {
      console.error('Error launching game:', error)
      if (win && !win.isDestroyed() && !isGameRunning) {
        win.restore()
        win.focus()
      }
      return { success: false, error: error.message }
    }
  })

  // ── Background image handlers ──
  const getBackgroundPath = (): string => {
    return join(app.getPath('userData'), 'background')
  }

  ipcMain.handle('select-background-image', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const srcPath = result.filePaths[0]
    const ext = extname(srcPath).toLowerCase()
    const destPath = getBackgroundPath() + ext

    // Remove any existing background files
    const bgBase = getBackgroundPath()
    for (const possibleExt of ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']) {
      const p = bgBase + possibleExt
      if (fs.existsSync(p)) {
        fs.unlinkSync(p)
      }
    }

    // Copy the new image to userData
    fs.copyFileSync(srcPath, destPath)

    // Read and return as data URL
    const data = fs.readFileSync(destPath)
    const mimeType = ext === '.png' ? 'image/png'
      : ext === '.webp' ? 'image/webp'
        : ext === '.gif' ? 'image/gif'
          : ext === '.bmp' ? 'image/bmp'
            : 'image/jpeg'
    return `data:${mimeType};base64,${data.toString('base64')}`
  })

  ipcMain.handle('set-omniconsole', (_event, enabled: boolean) => {
    omniconsoleEnabled = enabled
  })

  // ── Minimize window — oculta launcher sin cerrarlo
  ipcMain.handle('minimize-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win && !win.isDestroyed()) {
      win.setSkipTaskbar(true)
      win.minimize()
    }
  })

  // ── Quit app — cierre explícito solicitado por el usuario desde "Salir"
  ipcMain.handle('quit-app', () => {
    // Limpiar listeners de 'close' para que app.quit() no quede bloqueado
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.removeAllListeners('close')
      mainWindowRef.close()
    }
    tray?.destroy()
    tray = null
    stopBackend()
    stopAllExtensionBackends()
    stopMediaSessionsBridge()
    // app.exit() termina el proceso sin esperar eventos de ventana
    app.exit(0)
  })

  ipcMain.handle('get-background-image', async () => {
    const bgBase = getBackgroundPath()
    for (const ext of ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']) {
      const p = bgBase + ext
      if (fs.existsSync(p)) {
        const data = fs.readFileSync(p)
        const mimeType = ext === '.png' ? 'image/png'
          : ext === '.webp' ? 'image/webp'
            : ext === '.gif' ? 'image/gif'
              : ext === '.bmp' ? 'image/bmp'
                : 'image/jpeg'
        return `data:${mimeType};base64,${data.toString('base64')}`
      }
    }
    return null
  })

  ipcMain.handle('clear-background-image', async () => {
    const bgBase = getBackgroundPath()
    for (const ext of ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']) {
      const p = bgBase + ext
      if (fs.existsSync(p)) {
        fs.unlinkSync(p)
      }
    }
    return { success: true }
  })

  // ── Wallpaper folder (una sola vez) — optimizado con thumbnails cacheados ──
  const getWallpaperFolderConfigPath = (): string => join(app.getPath('userData'), 'wallpaper-folder.json')
  const WALLPAPER_THUMB_CACHE_DIR = join(app.getPath('userData'), 'wallpaper-thumb-cache')
  const WALLPAPER_THUMB_MAX_WIDTH = 360
  const WALLPAPER_THUMB_QUALITY = 72
  const ensureWallpaperThumbCache = (): void => {
    if (!fs.existsSync(WALLPAPER_THUMB_CACHE_DIR)) fs.mkdirSync(WALLPAPER_THUMB_CACHE_DIR, { recursive: true })
  }
  const getWallpaperThumbPath = (sourcePath: string, mtime: number): string => {
    const hash = crypto.createHash('md5').update(`${sourcePath}|${mtime}|${WALLPAPER_THUMB_MAX_WIDTH}`).digest('hex')
    return join(WALLPAPER_THUMB_CACHE_DIR, `${hash}.jpg`)
  }
  const getWallpaperThumbDataUrl = (sourcePath: string, mtime: number): string | null => {
    try {
      ensureWallpaperThumbCache()
      const cachePath = getWallpaperThumbPath(sourcePath, mtime)
      if (fs.existsSync(cachePath)) {
        const data = fs.readFileSync(cachePath)
        return `data:image/jpeg;base64,${data.toString('base64')}`
      }
      const img = nativeImage.createFromPath(sourcePath)
      if (img.isEmpty()) return null
      const { width, height } = img.getSize()
      let thumb = img
      if (width > WALLPAPER_THUMB_MAX_WIDTH) {
        const h = Math.max(1, Math.round(height * (WALLPAPER_THUMB_MAX_WIDTH / width)))
        thumb = img.resize({ width: WALLPAPER_THUMB_MAX_WIDTH, height: h, quality: 'best' })
      }
      const jpeg = thumb.toJPEG(WALLPAPER_THUMB_QUALITY)
      try { fs.writeFileSync(cachePath, jpeg) } catch { }
      return `data:image/jpeg;base64,${jpeg.toString('base64')}`
    } catch { return null }
  }
  const collectWallpaperImages = (folder: string): Array<{ name: string; path: string; dataUrl: string; mtime: number }> => {
    const out: Array<{ name: string; path: string; dataUrl: string; mtime: number }> = []
    try {
      const files = fs.readdirSync(folder)
      for (const file of files) {
        const ext = extname(file).toLowerCase()
        if (!['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'].includes(ext)) continue
        const fullPath = join(folder, file)
        try {
          const stat = fs.statSync(fullPath)
          // Usa thumbnail cacheado para el row (rápido), solo fallback a original si falla
          const thumb = getWallpaperThumbDataUrl(fullPath, stat.mtimeMs)
          let dataUrl: string | null = thumb
          if (!dataUrl) {
            const data = fs.readFileSync(fullPath)
            const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : ext === '.bmp' ? 'image/bmp' : 'image/jpeg'
            dataUrl = `data:${mime};base64,${data.toString('base64')}`
          }
          out.push({ name: file, path: fullPath, dataUrl, mtime: stat.mtimeMs })
        } catch { }
      }
      out.sort((a, b) => b.mtime - a.mtime)
    } catch { }
    return out
  }
  ipcMain.handle('select-wallpaper-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (result.canceled || !result.filePaths.length) return null
    const folder = result.filePaths[0]
    try { fs.writeFileSync(getWallpaperFolderConfigPath(), JSON.stringify({ folder }, null, 2), 'utf8') } catch { }
    const images = collectWallpaperImages(folder)
    return { folder, images }
  })
  ipcMain.handle('get-wallpaper-folder', async () => {
    const p = getWallpaperFolderConfigPath()
    if (fs.existsSync(p)) {
      try { const d = JSON.parse(fs.readFileSync(p, 'utf8')); return d.folder || null } catch { return null }
    }
    return null
  })
  ipcMain.handle('get-wallpaper-images', async (_event, folderArg?: string) => {
    let folder: string | null = folderArg || null
    if (!folder) {
      const p = getWallpaperFolderConfigPath()
      if (fs.existsSync(p)) {
        try { folder = JSON.parse(fs.readFileSync(p, 'utf8')).folder } catch { }
      }
    }
    if (!folder || !fs.existsSync(folder)) return []
    return collectWallpaperImages(folder)
  })
  ipcMain.handle('set-wallpaper-as-background', async (_event, sourcePath: string) => {
    if (!sourcePath || !fs.existsSync(sourcePath)) return null
    const ext = extname(sourcePath).toLowerCase()
    const destPath = getBackgroundPath() + ext
    const bgBase = getBackgroundPath()
    for (const e of ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']) {
      const p = bgBase + e
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p) } catch { }
      }
    }
    try {
      fs.copyFileSync(sourcePath, destPath)
      const data = fs.readFileSync(destPath)
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : ext === '.bmp' ? 'image/bmp' : 'image/jpeg'
      return `data:${mime};base64,${data.toString('base64')}`
    } catch (err) {
      console.error('Error setting wallpaper as background:', err)
      return null
    }
  })

  // ── Preview en alta resolución para el fondo grande al navegar el wallpaper row ──
  // Optimizado con preview HD redimensionada (1080p) y cacheada en disco con fs async
  const WALLPAPER_PREVIEW_CACHE_DIR = join(app.getPath('userData'), 'wallpaper-preview-cache')
  const WALLPAPER_PREVIEW_MAX_WIDTH = 1920
  const WALLPAPER_PREVIEW_QUALITY = 82
  const ensureWallpaperPreviewCache = (): void => {
    if (!fs.existsSync(WALLPAPER_PREVIEW_CACHE_DIR)) fs.mkdirSync(WALLPAPER_PREVIEW_CACHE_DIR, { recursive: true })
  }
  const getWallpaperPreviewPath = (sourcePath: string, mtime: number): string => {
    const hash = crypto.createHash('md5').update(`${sourcePath}|${mtime}|${WALLPAPER_PREVIEW_MAX_WIDTH}`).digest('hex')
    return join(WALLPAPER_PREVIEW_CACHE_DIR, `${hash}.jpg`)
  }

  ipcMain.handle('get-wallpaper-preview', async (_event, sourcePath: string) => {
    if (!sourcePath || !fs.existsSync(sourcePath)) return null
    try {
      ensureWallpaperPreviewCache()
      const stat = await fs.promises.stat(sourcePath)
      const cachePath = getWallpaperPreviewPath(sourcePath, stat.mtimeMs)
      if (fs.existsSync(cachePath)) {
        const data = await fs.promises.readFile(cachePath)
        return `data:image/jpeg;base64,${data.toString('base64')}`
      }
      const img = nativeImage.createFromPath(sourcePath)
      if (img.isEmpty()) return null
      const { width, height } = img.getSize()
      let preview = img
      if (width > WALLPAPER_PREVIEW_MAX_WIDTH) {
        const h = Math.max(1, Math.round(height * (WALLPAPER_PREVIEW_MAX_WIDTH / width)))
        preview = img.resize({ width: WALLPAPER_PREVIEW_MAX_WIDTH, height: h, quality: 'best' })
      }
      const jpeg = preview.toJPEG(WALLPAPER_PREVIEW_QUALITY)
      fs.promises.writeFile(cachePath, jpeg).catch(() => { })
      return `data:image/jpeg;base64,${jpeg.toString('base64')}`
    } catch (err) {
      console.error('Error reading wallpaper preview:', err)
      return null
    }
  })

  // ── User profile handlers ──
  const getProfilePath = (): string => {
    return join(app.getPath('userData'), 'profile.json')
  }

  ipcMain.handle('get-profile', async () => {
    const profilePath = getProfilePath()
    if (fs.existsSync(profilePath)) {
      try {
        const data = fs.readFileSync(profilePath, 'utf8')
        return JSON.parse(data)
      } catch (e) {
        console.error('Error reading profile.json', e)
        return { name: '', avatar: null }
      }
    }
    return { name: '', avatar: null }
  })

  ipcMain.handle('save-profile', async (_event, profile: { name: string; avatar: string | null }) => {
    try {
      const profilePath = getProfilePath()
      fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), 'utf8')
      return { success: true }
    } catch (e: any) {
      console.error('Error writing profile.json', e)
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('select-profile-image', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    try {
      const data = fs.readFileSync(result.filePaths[0])
      const ext = extname(result.filePaths[0]).toLowerCase()
      const mimeType = ext === '.png' ? 'image/png'
        : ext === '.webp' ? 'image/webp'
          : ext === '.gif' ? 'image/gif'
            : ext === '.bmp' ? 'image/bmp'
              : 'image/jpeg'
      return `data:${mimeType};base64,${data.toString('base64')}`
    } catch (err) {
      console.error('Error reading profile image:', err)
      return null
    }
  })

  // ── Store detection & opening ──
  const STORES = [
    {
      id: 'steam',
      name: 'Steam',
      exeCandidates: [
        'C:\\Program Files (x86)\\Steam\\steam.exe',
        'C:\\Program Files\\Steam\\steam.exe',
        process.env.ProgramFiles + '\\Steam\\steam.exe',
        (process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)') + '\\Steam\\steam.exe'
      ]
    },
    {
      id: 'epic',
      name: 'Epic Games',
      exeCandidates: [
        (process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)') + '\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe',
        (process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)') + '\\Epic Games\\Launcher\\Portal\\Binaries\\Win32\\EpicGamesLauncher.exe',
        process.env.ProgramFiles + '\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe'
      ]
    },
    {
      id: 'gog',
      name: 'GOG Galaxy',
      exeCandidates: [
        (process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)') + '\\GOG Galaxy\\GalaxyClient.exe',
        process.env.ProgramFiles + '\\GOG Galaxy\\GalaxyClient.exe',
        (process.env.LocalAppData || process.env.APPDATA || '') + '\\GOG.com\\Galaxy\\GalaxyClient.exe'
      ]
    }
  ]

  const findStoreExe = (store): string | null => {
    for (const candidate of store.exeCandidates) {
      try {
        if (candidate && fs.existsSync(candidate)) return candidate
      } catch {
        // ignore
      }
    }
    return null
  }

  ipcMain.handle('get-stores', async () => {
    return STORES.map((store) => {
      const exePath = findStoreExe(store)
      return {
        id: store.id,
        name: store.name,
        installed: !!exePath,
        exePath
      }
    })
  })

  ipcMain.handle('open-store', async (_event, storeId: string) => {
    const store = STORES.find((s) => s.id === storeId)
    if (!store) return { success: false, error: 'Tienda desconocida' }
    const exePath = findStoreExe(store)
    if (!exePath) return { success: false, error: 'Tienda no instalada' }
    try {
      const error = await shell.openPath(exePath)
      return error ? { success: false, error } : { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('open-external', async (_event, url: string) => {
    if (typeof url !== 'string' || !/^(https?:\/\/|steam:)/i.test(url)) {
      return { success: false, error: 'URL no permitida' }
    }
    try {
      await shell.openExternal(url)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('get-extensions', () => {
    const exts = readExtensions()
    syncExtensionProcesses()
    return exts
  })
  ipcMain.handle('set-extension-enabled', (_, id: string, enabled: boolean) => {
    try {
      const state = readExtensionsState()
      state[id] = enabled
      fs.writeFileSync(getExtensionsStatePath(), JSON.stringify(state, null, 2), 'utf8')
      syncExtensionProcesses()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
  ipcMain.handle('open-extension-session', async (_, id: string) => {
    startExtensionBackendById(id)
    return { success: true }
  })
  ipcMain.handle('close-extension-session', async (_, id: string) => {
    stopExtensionBackend(id)
    return { success: true }
  })
  ipcMain.handle('open-extensions-directory', async () => {
    try {
      const dir = getExtensionsDirectory()
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      await shell.openPath(dir)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Startup shortcut handlers ──
  ipcMain.handle('create-startup-shortcut', async () => {
    try {
      if (process.platform === 'win32') {
        const startupDir = join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
        const shortcutPath = join(startupDir, 'HASHI.lnk')
        const target = process.execPath
        shell.writeShortcutLink(shortcutPath, 'create', {
          target,
          description: 'HASHI Launcher',
          cwd: dirname(target)
        })
        app.setLoginItemSettings({
          openAtLogin: true,
          path: target
        })
        return { success: true }
      }
      return { success: false, error: 'No soportado' }
    } catch (err: any) {
      console.error('Error creating startup shortcut:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('get-startup-status', async () => {
    try {
      if (process.platform === 'win32') {
        const startupDir = join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
        const shortcutPath = join(startupDir, 'HASHI.lnk')
        const exists = fs.existsSync(shortcutPath)
        const loginSettings = app.getLoginItemSettings()
        return { enabled: exists || loginSettings.openAtLogin }
      }
      return { enabled: false }
    } catch {
      return { enabled: false }
    }
  })

  ipcMain.handle('remove-startup-shortcut', async () => {
    try {
      if (process.platform === 'win32') {
        const startupDir = join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
        const shortcutPath = join(startupDir, 'HASHI.lnk')
        if (fs.existsSync(shortcutPath)) {
          fs.unlinkSync(shortcutPath)
        }
        app.setLoginItemSettings({ openAtLogin: false })
        return { success: true }
      }
      return { success: false }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  const getSteamPaths = (): string[] => {
    const candidates = new Set<string>()

    const addPath = (value?: string): void => {
      if (!value) return
      const normalized = value.replace(/\\/g, '/').replace(/\/+$/, '')
      if (normalized) candidates.add(normalized.replace(/\//g, '\\'))
    }

    for (const drive of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')) {
      const root = `${drive}:\\`
      if (!fs.existsSync(root)) continue
      addPath(root)
      addPath(join(root, 'Steam'))
      addPath(join(root, 'steam'))
      addPath(join(root, 'Games', 'Steam'))
      addPath(join(root, 'Games', 'steam'))
    }

    const defaults = [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam',
      process.env.ProgramFiles ? `${process.env.ProgramFiles}\\Steam` : '',
      process.env['ProgramFiles(x86)'] ? `${process.env['ProgramFiles(x86)']}\\Steam` : '',
      process.env.LocalAppData ? `${process.env.LocalAppData}\\Steam` : ''
    ]
    defaults.forEach((value) => addPath(value))

    const steamRoots: string[] = []
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        steamRoots.push(candidate)
        continue
      }

      const possibleSteamFolders = [
        candidate,
        join(candidate, 'Steam'),
        join(candidate, 'steam'),
        join(candidate, 'Games', 'Steam'),
        join(candidate, 'Games', 'steam')
      ]

      for (const folder of possibleSteamFolders) {
        if (fs.existsSync(folder)) steamRoots.push(folder)
      }
    }

    const finalRoots: string[] = []
    for (const root of Array.from(new Set(steamRoots))) {
      if (!root || !fs.existsSync(root)) continue
      finalRoots.push(root)

      const libraryFoldersPath = join(root, 'steamapps', 'libraryfolders.vdf')
      if (!fs.existsSync(libraryFoldersPath)) continue

      try {
        const content = fs.readFileSync(libraryFoldersPath, 'utf8')
        const matches = [...content.matchAll(/\"([^\"]+)\"\s+\"([^\"]+)\"/g)]
        for (const [, , value] of matches) {
          if (!value || !value.includes(':')) continue
          const normalized = value.replace(/\\/g, '/').replace(/\/+$/, '')
          const folder = normalized.replace(/\//g, '\\')
          if (folder && fs.existsSync(folder)) finalRoots.push(folder)
        }
      } catch {
        // ignore malformed libraryfolders.vdf
      }
    }

    return Array.from(new Set(finalRoots.filter((root) => !!root && fs.existsSync(root))))
  }

  ipcMain.handle('get-steam-installation-status', async (_event, appIds: string[]) => {
    const uniqueAppIds = Array.from(new Set((appIds || []).filter(Boolean).map((id) => String(id))))
    if (uniqueAppIds.length === 0) return {}

    const result: Record<string, boolean> = {}
    const steamRoots = getSteamPaths()

    for (const appId of uniqueAppIds) {
      result[appId] = steamRoots.some((root) => {
        const manifestCandidates = [
          join(root, 'steamapps', `appmanifest_${appId}.acf`),
          join(root, 'Steam', 'steamapps', `appmanifest_${appId}.acf`),
          join(root, 'steam', 'steamapps', `appmanifest_${appId}.acf`)
        ]
        return manifestCandidates.some((manifestPath) => fs.existsSync(manifestPath))
      })
    }

    return result
  })

  // ── Steam download progress (real-time via content_log.txt + fs.watch) ──
  interface SteamDownloadProgress {
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

  // Cache for real-time download info parsed from content_log.txt
  const downloadInfoCache = new Map<string, { downloaded: number; total: number; speed: number; updated: number }>()

  function parseContentLogForDownloads(): void {
    const steamRoots = getSteamPaths()
    for (const root of steamRoots) {
      const logPath = join(root, 'logs', 'content_log.txt')
      if (!fs.existsSync(logPath)) continue

      try {
        const stat = fs.statSync(logPath)
        // Read last 512KB for better coverage
        const readSize = Math.min(stat.size, 512 * 1024)
        const fd = fs.openSync(logPath, 'r')
        const buffer = Buffer.alloc(readSize)
        fs.readSync(fd, buffer, 0, readSize, stat.size - readSize)
        fs.closeSync(fd)

        const content = buffer.toString('utf8')
        const lines = content.split('\n')

        // Parse download rate (use the last one)
        let lastSpeed = 0
        for (let i = lines.length - 1; i >= 0; i--) {
          const speedMatch = lines[i].match(/Current download rate:\s*([\d.]+)\s*Mbps/)
          if (speedMatch) {
            lastSpeed = parseFloat(speedMatch[1])
            break
          }
        }

        // Parse ALL update started lines, keep the LAST one per AppID (only recent logs)
        const appUpdates = new Map<string, { downloaded: number; total: number; timestamp: number }>()
        const finishedAppIds = new Set<string>()
        const now = Date.now()
        const MAX_LOG_AGE_MS = 15 * 60 * 1000

        for (const line of lines) {
          const finishedMatch = line.match(/AppID\s+(\d+)\s+update (finished|canceled)/i)
          if (finishedMatch) {
            finishedAppIds.add(finishedMatch[1])
            appUpdates.delete(finishedMatch[1])
            downloadInfoCache.delete(finishedMatch[1])
            continue
          }

          const match = line.match(/AppID\s+(\d+)\s+update started\s*:\s*download\s+(\d+)\/(\d+)/)
          if (match) {
            const appId = match[1]
            const downloaded = parseInt(match[2], 10)
            const total = parseInt(match[3], 10)
            // Extract timestamp from line
            const tsMatch = line.match(/^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]/)
            let timestamp = now
            if (tsMatch) {
              const parsed = new Date(tsMatch[1]).getTime()
              if (!isNaN(parsed)) timestamp = parsed
            }
            if (now - timestamp <= MAX_LOG_AGE_MS && !finishedAppIds.has(appId)) {
              appUpdates.set(appId, { downloaded, total, timestamp })
            }
          }
        }

        // Update cache with latest info
        for (const [appId, info] of appUpdates) {
          const existing = downloadInfoCache.get(appId)
          // Only update if this is newer or if we don't have data
          if (!existing || info.timestamp >= existing.updated) {
            // Estimate current progress based on time elapsed and speed
            const elapsedMs = now - info.timestamp
            const elapsedSec = elapsedMs / 1000
            const speedBytesPerSec = (lastSpeed * 1_000_000) / 8
            const estimatedAdditional = speedBytesPerSec * elapsedSec
            const estimatedDownloaded = Math.min(info.total, info.downloaded + estimatedAdditional)

            downloadInfoCache.set(appId, {
              downloaded: estimatedDownloaded,
              total: info.total,
              speed: lastSpeed,
              updated: now
            })
          } else {
            // Existing entry is newer, just update speed and estimate
            const elapsedMs = now - existing.updated
            const elapsedSec = elapsedMs / 1000
            const speedBytesPerSec = (lastSpeed * 1_000_000) / 8
            const estimatedAdditional = speedBytesPerSec * elapsedSec
            existing.downloaded = Math.min(existing.total, existing.downloaded + estimatedAdditional)
            existing.speed = lastSpeed
            existing.updated = now
          }
        }

        // Clean up old cached entries
        for (const [appId, info] of downloadInfoCache) {
          if (!appUpdates.has(appId) && (now - info.updated > MAX_LOG_AGE_MS || info.downloaded >= info.total)) {
            downloadInfoCache.delete(appId)
          } else if (!appUpdates.has(appId) && info.speed > 0 && info.downloaded < info.total) {
            const elapsedMs = now - info.updated
            const elapsedSec = elapsedMs / 1000
            const speedBytesPerSec = (info.speed * 1_000_000) / 8
            const estimatedAdditional = speedBytesPerSec * elapsedSec
            info.downloaded = Math.min(info.total, info.downloaded + estimatedAdditional)
            info.updated = now
          }
        }
      } catch {
        // ignore errors
      }
    }
  }

  // Watch steamapps directories for appmanifest changes
  const watchedDirs = new Set<string>()
  const downloadWatchers: fs.FSWatcher[] = []

  function setupDownloadWatchers(): void {
    const steamRoots = getSteamPaths()
    for (const root of steamRoots) {
      const steamappsDir = join(root, 'steamapps')
      if (watchedDirs.has(steamappsDir) || !fs.existsSync(steamappsDir)) continue
      watchedDirs.add(steamappsDir)

      try {
        const watcher = fs.watch(steamappsDir, { persistent: false }, (_eventType, filename) => {
          if (filename && filename.startsWith('appmanifest_') && filename.endsWith('.acf')) {
            // Trigger immediate re-read of content_log.txt
            parseContentLogForDownloads()
            // Notify renderer
            if (mainWindowRef && !mainWindowRef.isDestroyed()) {
              mainWindowRef.webContents.send('steam-download-updated')
            }
          }
        })
        downloadWatchers.push(watcher)
      } catch {
        // ignore
      }
    }
  }

  setupDownloadWatchers()

  // Backup timer: re-parse content_log.txt every 2 seconds for smooth progress
  const downloadParseInterval = setInterval(() => {
    parseContentLogForDownloads()
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('steam-download-updated')
    }
  }, 2000)

  app.on('before-quit', () => {
    clearInterval(downloadParseInterval)
  })

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('check-for-updates', async () => {
    const https = await import('https')
    return new Promise((resolve, reject) => {
      https.get('https://crizzvc.github.io/Hashi-API/api.json', (res) => {
        if (res.statusCode !== 200) {
          reject(new Error('Error en la red'))
          return
        }
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch {
            reject(new Error('Error parseando JSON'))
          }
        })
      }).on('error', reject)
    })
  })

  ipcMain.handle('get-steam-download-progress', async () => {
    const steamRoots = getSteamPaths()
    const downloads: SteamDownloadProgress[] = []

    // Parse content_log.txt for real-time data
    parseContentLogForDownloads()

    for (const root of steamRoots) {
      const steamappsDir = join(root, 'steamapps')
      if (!fs.existsSync(steamappsDir)) continue

      try {
        const files = fs.readdirSync(steamappsDir)
        for (const file of files) {
          const match = file.match(/^appmanifest_(\d+)\.acf$/)
          if (!match) continue

          const appId = match[1]
          const manifestPath = join(steamappsDir, file)

          try {
            const content = fs.readFileSync(manifestPath, 'utf8')

            const get = (key: string): string => {
              const m = content.match(new RegExp(`"${key}"\\s+"([^"]*)"`))
              return m ? m[1] : ''
            }

            const name = get('name')
            const bytesToDownload = parseInt(get('BytesToDownload') || '0', 10) || 0
            const bytesDownloaded = parseInt(get('BytesDownloaded') || '0', 10) || 0
            const bytesToStage = parseInt(get('BytesToStage') || '0', 10) || 0
            const bytesStaged = parseInt(get('BytesStaged') || '0', 10) || 0
            const stateFlags = parseInt(get('StateFlags') || '0', 10) || 0

            const downloading = (stateFlags & 0x100000) !== 0
            const validating = (stateFlags & 0x200000) !== 0
            const paused = (stateFlags & 0x8) !== 0
            const isStaging = (stateFlags & 0x400000) !== 0

            // Get real-time info from content_log.txt cache
            const realTimeInfo = downloadInfoCache.get(appId)

            let total: number
            let downloaded: number

            if (realTimeInfo && realTimeInfo.total > 0) {
              // Use real-time data from content_log.txt
              total = realTimeInfo.total
              downloaded = realTimeInfo.downloaded
            } else if (isStaging && bytesToStage > 0) {
              // Use staging info from appmanifest
              total = bytesToStage
              downloaded = bytesStaged
            } else if (bytesToDownload > 0) {
              total = bytesToDownload
              downloaded = bytesDownloaded
            } else {
              total = 0
              downloaded = 0
            }

            const percent = total > 0 ? Math.min(100, (downloaded / total) * 100) : 0
            const downloadSpeed = realTimeInfo?.speed || 0

            const isActuallyDownloading = downloading || validating || isStaging
            const isPaused = paused && ((bytesToDownload > 0 && bytesDownloaded < bytesToDownload) || (bytesToStage > 0 && bytesStaged < bytesToStage))
            const hasUnfinishedBytes = (bytesToDownload > 0 && bytesDownloaded < bytesToDownload) || (bytesToStage > 0 && bytesStaged < bytesToStage)

            const isActive = isActuallyDownloading || isPaused || hasUnfinishedBytes

            if (isActive) {
              downloads.push({
                appId,
                name,
                bytesToDownload,
                bytesDownloaded,
                bytesToStage,
                bytesStaged,
                stateFlags,
                downloading: downloading || (isActuallyDownloading && percent < 100),
                validating,
                paused,
                percent,
                downloadSpeed
              })
            }
          } catch {
            // ignore malformed manifest
          }
        }
      } catch {
        // ignore unreadable directory
      }
    }

    return downloads
  })

  const getSteamAccountPath = (): string => {
    return join(app.getPath('userData'), 'steam-account.json')
  }

  ipcMain.handle('get-steam-account', async () => {
    const steamAccountPath = getSteamAccountPath()
    if (fs.existsSync(steamAccountPath)) {
      try {
        const data = fs.readFileSync(steamAccountPath, 'utf8')
        return JSON.parse(data)
      } catch (e) {
        console.error('Error reading steam-account.json', e)
        return {
          linked: false,
          apiKey: '',
          steamId: '',
          accountName: '',
          steamId64: null
        }
      }
    }
    return {
      linked: false,
      apiKey: '',
      steamId: '',
      accountName: '',
      steamId64: null
    }
  })

  ipcMain.handle('save-steam-account', async (_event, steamAccount: {
    linked: boolean
    apiKey: string
    steamId: string
    accountName: string
    steamId64: string | null
  }) => {
    try {
      const steamAccountPath = getSteamAccountPath()
      fs.writeFileSync(steamAccountPath, JSON.stringify(steamAccount, null, 2), 'utf8')
      return { success: true }
    } catch (e: any) {
      console.error('Error writing steam-account.json', e)
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('open-steam-openid', async () => {
    ensureSteamOpenIdServer()

    return await new Promise<{
      linked: boolean
      apiKey: string
      steamId: string
      accountName: string
      steamId64: string | null
    }>((resolve, reject) => {
      steamOpenIdResolve = resolve as (value: {
        linked: boolean
        apiKey: string
        steamId: string
        accountName: string
        steamId64: string | null
      }) => void
      steamOpenIdReject = reject

      const openIdUrl = new URL('https://steamcommunity.com/openid/login')
      openIdUrl.searchParams.set('openid.ns', 'http://specs.openid.net/auth/2.0')
      openIdUrl.searchParams.set('openid.mode', 'checkid_setup')
      openIdUrl.searchParams.set('openid.return_to', STEAM_OPENID_RETURN_URL)
      openIdUrl.searchParams.set('openid.realm', STEAM_OPENID_REALM)
      openIdUrl.searchParams.set('openid.identity', 'http://specs.openid.net/auth/2.0/identifier_select')
      openIdUrl.searchParams.set('openid.claimed_id', 'http://specs.openid.net/auth/2.0/identifier_select')

      void shell.openExternal(openIdUrl.toString())
    })
  })

  // ── System Media IPC (bridge nativo como WPS5) ──
  ipcMain.handle('get-media-sessions', async () => {
    try {
      return await fetchMediaSessionsForRenderer()
    } catch (err: any) {
      console.warn('[MediaSessions] get-media-sessions:', err.message)
      return []
    }
  })

  ipcMain.handle('media-control', async (_event, action: string, target: any) => {
    if (!['play_pause', 'next', 'prev', 'play', 'pause', 'toggle', 'previous'].includes(action)) return { success: false }
    // normaliza a play_pause para los handlers del WPS5
    const norm = action === 'play' || action === 'pause' || action === 'toggle' ? 'play_pause' : action === 'previous' ? 'prev' : action
    return sendMediaControlAction(norm, target)
  })

  // Compat wrappers para el MusicPlayer actual (getSystemMedia / controlSystemMedia)
  ipcMain.handle('get-system-media', async () => {
    const sessions = await fetchMediaSessionsForRenderer()
    if (sessions.length === 0) return { hasMedia: false }
    const first = sessions[0]
    return {
      hasMedia: true,
      title: first.title,
      artist: first.artist,
      albumTitle: first.albumTitle,
      thumbnail: first.thumbnail,
      playbackStatus: first.playbackStatus,
      positionSeconds: (first.timeline?.positionMs ?? 0) / 1000,
      endSeconds: (first.timeline?.durationMs ?? 0) / 1000,
      raw: sessions
    }
  })
  ipcMain.handle('control-system-media', async (_event, action: string, target: any) => {
    const norm = action === 'play' || action === 'pause' || action === 'toggle' ? 'play_pause' : action === 'previous' ? 'prev' : action
    return sendMediaControlAction(norm, target)
  })

  // ── Backend port management ──
  ipcMain.handle('get-backend-port', () => {
    return { port: currentBackendPort }
  })

  ipcMain.handle('set-backend-port', async (_event, port: number) => {
    if (port < 1 || port > 65535) {
      return { success: false, error: 'Invalid port number' }
    }

    const inUse = await checkPortInUse(port)
    if (inUse) {
      return { success: false, error: 'port_in_use' }
    }

    saveBackendPort(port)
    restartBackend(port)
    return { success: true }
  })

  ipcMain.handle('check-port-in-use', async (_event, port: number) => {
    return { inUse: await checkPortInUse(port) }
  })

  // ── Boot Video management ──
  ipcMain.handle('get-boot-video-path', () => {
    const splashDir = join(app.getPath('userData'), 'splash')
    const bootPath = join(splashDir, 'boot.webm')
    const suspendPath = join(splashDir, 'suspend.webm')
    return {
      boot: fs.existsSync(bootPath) ? toMediaUrl(bootPath) : null,
      suspend: fs.existsSync(suspendPath) ? toMediaUrl(suspendPath) : null
    }
  })

  ipcMain.handle('download-boot-video', async (_event, url: string, target: string) => {
    try {
      if (target !== 'boot' && target !== 'suspend') {
        return { success: false, error: `Target inválido: ${target}` }
      }
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        return { success: false, error: 'URL de descarga inválida.' }
      }

      const splashDir = join(app.getPath('userData'), 'splash')
      if (!fs.existsSync(splashDir)) {
        fs.mkdirSync(splashDir, { recursive: true })
      }

      const response = await fetch(url)
      if (!response.ok) {
        return { success: false, error: `SteamDeckRepo respondió ${response.status} ${response.statusText}` }
      }

      const arrayBuffer = await response.arrayBuffer()
      const destPath = join(splashDir, `${target}.webm`)
      const tmpPath = `${destPath}.tmp`
      fs.writeFileSync(tmpPath, Buffer.from(arrayBuffer))
      fs.renameSync(tmpPath, destPath)

      return { success: true, path: toMediaUrl(destPath) }
    } catch (error: any) {
      console.error('Error downloading boot video:', error)
      return { success: false, error: error?.message || String(error) }
    }
  })

  ipcMain.handle('delete-boot-video', async (_event, target: string) => {
    try {
      const splashDir = join(app.getPath('userData'), 'splash')
      const filePath = join(splashDir, `${target}.webm`)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        return { success: true }
      }
      return { success: false, error: 'Archivo no encontrado' }
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) }
    }
  })

  // ── SteamDeckRepo API (runs in main process to avoid CSP) ──
  ipcMain.handle('steamdeckrepo-fetch-posts', async () => {
    try {
      const response = await fetch('https://steamdeckrepo.com/api/posts/all', {
        method: 'GET',
        headers: { Accept: 'application/json', 'User-Agent': 'HASHI/1.0' }
      })
      if (response.status === 429) return { success: false, error: 'Rate limit exceeded' }
      if (!response.ok) return { success: false, error: `${response.status} ${response.statusText}` }
      const data = await response.json()
      return { success: true, posts: data.posts || [] }
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) }
    }
  })

  startBackend()
  syncExtensionProcesses()
  startMediaSessionsBridge()
  createTray()
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  stopBackend()
  stopAllExtensionBackends()
  stopMediaSessionsBridge()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  tray?.destroy()
  tray = null
  stopBackend()
  stopAllExtensionBackends()
  stopMediaSessionsBridge()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.