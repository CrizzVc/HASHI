import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  PlayIcon,
  PlusIcon,
  SystemIcon,
  CloseIcon,
  WifiIcon,
  BatteryIcon,
  StoreIcon,
  SettingsIcon,
  PowerIcon,
  TrashIcon,
  EditIcon,
  FolderIcon,
  DesktopIcon,
  UpdateIcon,
  CheckIcon,
  PaletteIcon,
  HomeIcon,
  DownloadIcon,
  ExtensionIcon,
  HelpIcon,
  GlobeIcon
} from './components/Icons'

import { translations, Language, t as tInterp } from './translations'

import MusicPlayer from './components/MusicPlayer'
import NotificationContainer from './components/NotificationContainer'
import DownloadCompleteNotification from './components/DownloadCompleteNotification'
import { DownloadsModal } from './components/DownloadsModal'
import { ModalHelper } from './components/ModalHelper'

import MultimediaView from './components/MultimediaView';
import MediaDetailView, { MediaItem } from './components/MediaDetailView';
import { useFriendNotifications } from './hooks/useFriendNotifications'
import { useSteamDownloads } from './hooks/useSteamDownloads'
import TrophiesView from './components/TrophiesView'


import steamLogo from './assets/tiendas/steamLogo.png'
import steamIcon from './assets/tiendas/steamIcon.png'
import epicLogo from './assets/tiendas/EpicLogo.png'
import gogLogo from './assets/tiendas/gogLogo.png'
import steamBanner from './assets/tiendas/steamBanner.png'
import epicBanner from './assets/tiendas/EpicBanner.png'
import gogBanner from './assets/tiendas/gogBanner.png'
import RatingE from './assets/ratings/E.png'
import RatingE10 from './assets/ratings/E10.png'
import RatingT from './assets/ratings/T.png'
import RatingM from './assets/ratings/M.png'

const APP_VERSION = '1.0.0'

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}
import RatingAO from './assets/ratings/AO.png'
import RatingRP from './assets/ratings/RP.png'
import RatingRP17 from './assets/ratings/RP17.png'
import installIcon from './assets/images/install.png'
import controllerImg from './assets/images/controller.png'
import defaultHomeBackground from './assets/images/background-defauld.jpg'
import appDefaultIcon from './assets/images/icono.png'
import { useSystemMedia } from './hooks/useSystemMedia'
import hashiLogo from '../src/assets/images/HASHI_LOGO_BLANCO.svg'
import {
  playMove,
  playEnter,
  playEnterGame,
  playClose,
  playControllerConnected,
  playControllerDisconnected,
  playPages,
  playHome
} from './services/soundService'
import { useGamepadNavigation } from './hooks/useGamepadNavigation'

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */
interface Game {
  id: string
  name: string
  exePath: string
  iconDataUrl: string | null
  playtimeMinutes: number
  lastPlayed: string | null
  createdAt: string
  color: string
  steamAppId?: string | null
  isSteam?: boolean
  // SteamGridDB fields
  steamGridId?: number | null
  gridImageUrl?: string | null
  squareGridImageUrl?: string | null
  heroImageUrl?: string | null
  logoImageUrl?: string | null
}

type QuickAppKind = 'game' | 'program'

interface QuickApp {
  id: string
  name: string
  exePath: string
  artworkUrl: string | null
  iconDataUrl: string | null
  lastPlayed: string | null
  createdAt: string
  kind: QuickAppKind
}

type ModalType = 'specs' | 'addGame' | 'editGame' | 'library' | 'settings' | 'steamgrid' | 'extensions' | null

type DetailFocusId = 'back' | 'shotPrev' | 'shotNext' | 'achievements' | 'play' | 'edit'

interface SteamAchievement {
  apiname: string
  achieved: number
  unlocktime: number
  name?: string
  displayName?: string
  description?: string | null
  icon?: string | null
  icongray?: string | null
}

interface LauncherExtension {
  id: string
  name: string
  description: string
  version: string
  type: 'external' | 'native'
  entryUrl: string | null
  nativeView: 'multimedia' | null
  sidebar: boolean
  enabled: boolean
}

interface MultimediaCard {
  id: number
  title: string
  season: string
  episode: string
  progress: number
  posterImage?: string | null
  episodeImage?: string | null
  animeUrl?: string | null
}

interface Store {
  id: string
  name: string
  installed: boolean
  exePath: string | null
}

interface SystemInfo {
  platform: string
  arch: string
  cpus: string
  totalMemory: string
  freeMemory: string
  uptime: string
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  gameId: string | null
}

interface SteamGridGame {
  id: number
  name: string
  types: string[]
  verified: boolean
}

interface SteamGridImage {
  id: number
  url: string
  thumb: string
  style: string
  width: number
  height: number
}

const DEFAULT_STEAM_API_KEY = 'B1F361EA3C07B455DC8B0D06ED179B00'
const QUICK_APPS_STORAGE_KEY = 'gbl-quick-apps'
const HELPER_MODAL_STORAGE_KEY = 'gbl_has_seen_helper_modal'

interface FeaturedLibraryGame {
  gameId: string
  name: string
  coverUrl: string
}

const DEFAULT_FEATURED_GAMES: FeaturedLibraryGame[] = [
  {
    gameId: 'default-descenders',
    name: 'Descenders',
    coverUrl: 'https://cdn2.steamgriddb.com/thumb/7dbdfd71d964683a8bcbe6f5f5b85eb9.jpg'
  },
  {
    gameId: 'default-astroneer',
    name: 'Astroneer',
    coverUrl: 'https://cdn2.steamgriddb.com/thumb/48b505846f30602aaff7e2d336720e6d.jpg'
  },
  {
    gameId: 'default-seaofthieves',
    name: 'Sea of Thieves',
    coverUrl: 'https://cdn2.steamgriddb.com/thumb/055c25fa28c4eb8c6bb0672e557eef80.jpg'
  }
]

const continueWatching: MultimediaCard[] = [
  { id: 1, title: 'Ciudad de Cristal', season: '1', episode: '4', progress: 62 },
  { id: 2, title: 'El Último Faro', season: '1', episode: '1', progress: 0 },
  { id: 3, title: 'Rutas Perdidas', season: '2', episode: '7', progress: 35 },
  { id: 4, title: 'Marea Negra', season: '1', episode: '1', progress: 0 },
  { id: 5, title: 'Sombra de Acero', season: '1', episode: '1', progress: 80 },
];



interface SteamAccount {
  linked: boolean
  apiKey: string
  steamId: string
  accountName: string
  steamId64: string | null
}

interface SteamLibraryGame {
  appid: string
  name: string
  playtime_forever: number
  img_icon_url: string
  img_logo_url: string
  img_capsule: string
  has_community_visible_stats: boolean
  installed: boolean
  steamGridId?: number | null
  gridImageUrl?: string | null
  squareGridImageUrl?: string | null
  heroImageUrl?: string | null
  logoImageUrl?: string | null
  iconDataUrl?: string | null
}

interface SteamFriend {
  steamid: string
  personaname: string
  avatar?: string | null
  avatarfull?: string | null
  profileurl?: string | null
  personastate?: number
  gameid?: string | null
  gameextrainfo?: string | null
}

type SteamGridArtType = 'grids' | 'square_grids' | 'heroes' | 'logos' | 'icons'
type LibrarySource = 'local' | 'steam'

function isFriendActive(friend: SteamFriend): boolean {
  return Boolean(friend.gameextrainfo) || Number(friend.personastate) > 0
}

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */
const GAME_COLORS = [
  '#6b7280', '#9ca3af', '#d1d5db', '#4b5563', '#374151',
  '#a3a3a3', '#737373', '#525252', '#e5e7eb', '#78716c'
]

const BACKEND_URL = 'http://localhost:3000'
const RECENT_GAMES_LIMIT = 15
const STEAM_ARTWORK_STORAGE_KEY = 'gbl-steam-artwork'
const DEFAULT_STORE_STORAGE_KEY = 'gbl-default-store'
const FORGOTTEN_DOWNLOADS_KEY = 'gbl-forgotten-downloads'
const OMNICONSOLE_STORAGE_KEY = 'gbl-omniconsole'

function getStoredSteamArtwork(): Record<string, Pick<SteamLibraryGame, 'gridImageUrl' | 'squareGridImageUrl' | 'heroImageUrl' | 'logoImageUrl' | 'iconDataUrl'>> {
  try {
    const stored = localStorage.getItem(STEAM_ARTWORK_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function getStoredQuickApps(): QuickApp[] {
  try {
    const stored = localStorage.getItem(QUICK_APPS_STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((app): app is QuickApp => !!app && typeof app.id === 'string' && typeof app.name === 'string' && typeof app.exePath === 'string')
      // Compat: apps guardadas antes de introducir "kind" se tratan como 'game' (comportamiento previo)
      .map((app) => ({ ...app, kind: app.kind === 'program' ? 'program' : 'game' }))
  } catch {
    return []
  }
}

const sortGamesByNewestFirst = (items: Game[]): Game[] =>
  [...items].sort((a, b) => {
    // El último jugado va primero; si no tiene lastPlayed se usa createdAt
    const aDate = new Date(a.lastPlayed || a.createdAt || 0).getTime()
    const bDate = new Date(b.lastPlayed || b.createdAt || 0).getTime()
    return bDate - aDate
  })

const getRecentGames = (items: Game[]): Game[] => sortGamesByNewestFirst(items).slice(0, RECENT_GAMES_LIMIT)

// Cuenta las columnas reales del grid midiendo el offsetTop de los items ya
// renderizados (todos los de la primera fila comparten el mismo offsetTop).
// Es más confiable que parsear getComputedStyle(...).gridTemplateColumns:
// ese string cambia de formato entre breakpoints responsive (5 columnas vs
// 2 en pantallas chicas) y puede leerse en un instante en que el layout
// todavía no terminó de asentarse, dando un columnCount desincronizado
// entre el handler de teclado y el efecto de scroll — eso es lo que hacía
// que la navegación funcionara bien en la 1ra fila (sin necesidad de
// desplazamiento) y se rompiera al entrar a la 2da (donde sí se dispara el
// cálculo de scroll con un columnCount potencialmente distinto).
function getGridColumnCount(grid: HTMLElement): number {
  const items = grid.querySelectorAll<HTMLElement>('.library-item')
  if (items.length === 0) return 1
  const firstTop = items[0].offsetTop
  let count = 0
  for (const item of items) {
    if (item.offsetTop !== firstTop) break
    count++
  }
  return count || 1
}

const STORE_IMAGES: Record<string, { banner: string; logo: string }> = {
  steam: { banner: steamBanner, logo: steamLogo },
  epic: { banner: epicBanner, logo: epicLogo },
  gog: { banner: gogBanner, logo: gogLogo }
}

function storeCapsuleImage(id: string): string | null {
  return STORE_IMAGES[id]?.banner || null
}

function storeLogoImage(id: string): string | null {
  return STORE_IMAGES[id]?.logo || null
}

function randomColor(): string {
  return GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)]
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

async function fetchAutoArtworkUrl(appName: string): Promise<string | null> {
  try {
    const searchRes = await fetch(`${BACKEND_URL}/api/steamgrid/search?term=${encodeURIComponent(appName)}`)
    if (!searchRes.ok) return null

    const searchData = await searchRes.json()
    if (!Array.isArray(searchData) || searchData.length === 0) return null

    const gameId = searchData[0].id
    const squareGridsRes = await fetch(`${BACKEND_URL}/api/steamgrid/square_grids/${gameId}`)
    if (squareGridsRes.ok) {
      const squareGrids = await squareGridsRes.json()
      if (Array.isArray(squareGrids) && squareGrids.length > 0 && squareGrids[0].url) {
        return squareGrids[0].url
      }
    }

    const gridsRes = await fetch(`${BACKEND_URL}/api/steamgrid/grids/${gameId}`)
    if (!gridsRes.ok) return null
    const grids = await gridsRes.json()
    return Array.isArray(grids) && grids.length > 0 ? grids[0].url || null : null
  } catch (err) {
    console.error('Error auto-fetching artwork:', err)
    return null
  }
}

/* ────────────────────────────────────────────
   SearchIcon component (inline)
   ──────────────────────────────────────────── */
function SearchIcon({ size = 20 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function ImageIcon({ size = 20 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function ChevronLeftIcon({ size = 20 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon({ size = 20 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function ChevronDownIcon({ size = 20 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function MoreIcon({ size = 20 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  )
}

function TrophyIcon({ size = 22 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4z" />
      <path d="M8 6H5.5A2.5 2.5 0 0 0 8 8.5" />
      <path d="M16 6h2.5A2.5 2.5 0 0 1 16 8.5" />
      <path d="M12 11v3" />
      <path d="M9 20h6" />
      <path d="M10 17h4v3h-4z" />
    </svg>
  )
}

const RATING_IMAGES: Record<string, string> = {
  E: RatingE,
  E10: RatingE10,
  T: RatingT,
  M: RatingM,
  AO: RatingAO,
  RP: RatingRP,
  RP17: RatingRP17,
  EVERYONE: RatingE,
  EVERYONE10: RatingE10,
  TEEN: RatingT,
  MATURE: RatingM,
  ADULTSONLY: RatingAO,
  RATINGPENDING: RatingRP
}

function getRatingImage(rating: string | null): string {
  if (!rating) return RatingRP
  const normalized = rating.replace('+', '').toUpperCase()
  const img = RATING_IMAGES[normalized]
  return img || RatingRP
}

/* ────────────────────────────────────────────
   App
   ──────────────────────────────────────────── */
function App(): React.JSX.Element {
  const [games, setGames] = useState<Game[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [homeCardMode, setHomeCardMode] = useState<'main' | 'bottom' | 'quick-apps'>('main')
  const [quickAppFocusIndex, setQuickAppFocusIndex] = useState<number>(0)
  const [bottomCardIndex, setBottomCardIndex] = useState<number>(0)
  const [runningGameId, setRunningGameId] = useState<string | null>(null)
  const [isGameRunning, setIsGameRunning] = useState(false)
  const [downloadingGameId, setDownloadingGameId] = useState<string | null>(null)
  const isGameRunningRef = useRef(false)
  const [clock, setClock] = useState('')
  const [modal, setModal] = useState<ModalType>(null)
  const [nativeView, setNativeView] = useState<'multimedia' | null>(null)
  const [multimediaExtensionId, setMultimediaExtensionId] = useState<string | null>(null)
  const [animeAV1Latest, setAnimeAV1Latest] = useState<MultimediaCard[]>([])
  const [mediaDetail, setMediaDetail] = useState<MediaItem | null>(null)
  const [extensions, setExtensions] = useState<LauncherExtension[]>([])
  const [showDownloadsModal, setShowDownloadsModal] = useState(false)
  const [libraryView, setLibraryView] = useState(false)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    gameId: null
  })

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarIndex, setSidebarIndex] = useState(0)
  const [librarySource, setLibrarySource] = useState<LibrarySource>('local')
  const [librarySearch, setLibrarySearch] = useState('')
  const [selectedSteamAppId, setSelectedSteamAppId] = useState<string | null>(null)
  const [steamAccount, setSteamAccount] = useState<SteamAccount>({
    linked: false,
    apiKey: DEFAULT_STEAM_API_KEY,
    steamId: '',
    accountName: '',
    steamId64: null
  })
  const [steamFriends, setSteamFriends] = useState<SteamFriend[]>([])
  const [selectedFriend, setSelectedFriend] = useState<SteamFriend | null>(null)
  const [selectedFriendBackground, setSelectedFriendBackground] = useState<string | null>(null)
  const [steamLibrary, setSteamLibrary] = useState<SteamLibraryGame[]>([])
  // Ref para acceder al valor actual de steamLibrary dentro de callbacks memoizados
  // sin generar dependencias circulares en useCallback
  const steamLibraryRef = useRef<SteamLibraryGame[]>([])
  useEffect(() => { steamLibraryRef.current = steamLibrary }, [steamLibrary])
  const [steamLibraryLoading, setSteamLibraryLoading] = useState(false)

  // Background image state
  const [backgroundImage, setBackgroundImage] = useState<string | null>(defaultHomeBackground)

  // Quick access apps state
  const [quickApps, setQuickApps] = useState<QuickApp[]>(getStoredQuickApps())
  // Paso intermedio: tras elegir el ejecutable, se pregunta si es Juego o Programa
  // antes de guardar (evita segunda ventana de explorador y define el comportamiento al lanzar)
  const [pendingQuickApp, setPendingQuickApp] = useState<{
    mode: 'add' | 'edit'
    editId?: string
    filePath: string
    name: string
    iconDataUrl: string | null
    autoArtworkUrl: string | null
  } | null>(null)

  // User profile state
  const [profileName, setProfileName] = useState('')
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null)

  // Settings modal state
  const [settingsTab, setSettingsTab] = useState<'inicio' | 'personalizacion' | 'ayuda'>('inicio')
  const [language, setLanguage] = useState<Language>(() => {
    try {
      return (localStorage.getItem('gbl-language') as Language) || 'es'
    } catch {
      return 'es'
    }
  })

  const t = translations[language] || translations.es

  const loadExtensions = useCallback(async (): Promise<void> => {
    try {
      setExtensions(await window.api.getExtensions())
    } catch (error) {
      console.error('No se pudieron cargar las extensiones:', error)
      setExtensions([])
    }
  }, [])

  const openExtension = useCallback((extension: LauncherExtension): void => {
    if (extension.type === 'native' && extension.nativeView) {
      const defaultSource = extensions.find((item) => item.id === 'animeav1' && item.enabled)
      setMultimediaExtensionId(extension.id === 'multimedia' && defaultSource ? defaultSource.id : extension.id)
      setNativeView(extension.nativeView)
      return
    }
    if (extension.entryUrl) void window.api.openExternal(extension.entryUrl)
  }, [extensions])

  useEffect(() => {
    void loadExtensions()
  }, [loadExtensions])

  const sidebarExtensions = useMemo(
    () => extensions.filter((extension) => extension.sidebar && extension.enabled),
    [extensions]
  )

  const handleLanguageChange = (newLang: Language): void => {
    setLanguage(newLang)
    try {
      localStorage.setItem('gbl-language', newLang)
    } catch (e) {
      console.error('Error saving language setting:', e)
    }
  }

  const handleLanguageToggle = (): void => {
    handleLanguageChange(language === 'es' ? 'en' : 'es')
  }

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<string | null>(null)
  const [updateLink, setUpdateLink] = useState<string | null>(null)
  const [settingsWallpaperPage, setSettingsWallpaperPage] = useState(0)
  const [, setLogoClicks] = useState(0)
  const [logoIsRed, setLogoIsRed] = useState(false)
  const logoWrapRef = useRef<HTMLDivElement>(null)
  const [defaultStore, setDefaultStore] = useState<string>(() => {
    try { return localStorage.getItem(DEFAULT_STORE_STORAGE_KEY) || 'steam' } catch { return 'steam' }
  })
  const [omniconsole, setOmniconsole] = useState<boolean>(() => {
    try { return localStorage.getItem(OMNICONSOLE_STORAGE_KEY) === 'true' } catch { return false }
  })

  // Sync omniconsole setting to main process on mount and when changed
  useEffect(() => {
    window.api.setOmniconsole(omniconsole)
  }, [omniconsole])

  // Add / Edit game form state
  const [formName, setFormName] = useState('')
  const [formExePath, setFormExePath] = useState('')
  const [formIconUrl, setFormIconUrl] = useState<string | null>(null)
  const [formLaunchArgs, setFormLaunchArgs] = useState('')
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [editGameTab, setEditGameTab] = useState<'inicio' | 'personalizacion' | 'detalles' | 'eliminar'>('inicio')

  // SteamGridDB state
  const [sgdbSearch, setSgdbSearch] = useState('')
  const [sgdbResults, setSgdbResults] = useState<SteamGridGame[]>([])
  const [sgdbLoading, setSgdbLoading] = useState(false)
  const [sgdbSelectedGame, setSgdbSelectedGame] = useState<SteamGridGame | null>(null)
  const [sgdbArtType, setSgdbArtType] = useState<SteamGridArtType>('grids')
  const [sgdbImages, setSgdbImages] = useState<SteamGridImage[]>([])
  const [sgdbImagesLoading, setSgdbImagesLoading] = useState(false)
  const [sgdbTargetGameId, setSgdbTargetGameId] = useState<string | null>(null)
  const [sgdbSelections, setSgdbSelections] = useState<Record<SteamGridArtType, SteamGridImage | null>>({
    square_grids: null,
    grids: null,
    heroes: null,
    logos: null,
    icons: null
  })

  // Arriba del componente, junto a tus otros datos/estado:
  const heroSlides = [
    {
      id: 1,
      title: 'Chainsaw Man - The Movie: Reze Arc',
      rating: '18+',
      genre: 'Anime, Acción, Terror',
      year: '2025',
      description: 'En el caótico corazón de Tokio, Denji, un adolescente acosado por las deudas, une su cuerpo con un demonio motosierra para sobrevivir. Como Chainsaw Man, una bestia híbrida que puede cortar cualquier cosa, se embarca en una brutal misión para cazar demonios y ganarse la vida, enfrentándose a fuerzas sobrenaturales que amenazan con desgarrar la realidad.',
      backdrop: 'https://image.tmdb.org/t/p/original/wWQ3l19pcRrAJzqZ5Etq0RimDFf.jpg',
    },
    {
      id: 2,
      title: 'Jujutsu Kaisen',
      rating: '18+',
      genre: 'Anime, Acción, Sobrenatural',
      year: '2020',
      description: 'Yuji Itadori, un estudiante de secundaria con una fuerza física increíble, se traga un objeto maldito para salvar a sus amigos y se convierte en el anfitrión de un poderoso maldición, Ryomen Sukuna. Ahora, junto a un grupo de hechiceros, deberá navegar por un mundo oculto lleno de maldiciones y demonios, mientras lucha por controlar a Sukuna y proteger a la humanidad.',
      backdrop: 'https://image.tmdb.org/t/p/original/bbkuD7JQAEOmLr6fnM6Vvwc2Xgy.jpg',
    },
    {
      id: 3,
      title: 'Re:ZERO -Starting Life in Another World',
      rating: '18+',
      genre: 'Anime, Drama, Fantasía',
      year: '2016',
      description: 'En un mundo donde la magia es real, Subaru Natsuki es transportado misteriosamente y descubre que puede "Retornar por la muerte", reviviendo en puntos clave tras morir. Ahora debe usar esta habilidad para salvar a Emilia, una hermosa híbrido de elfo, y a sus amigos de un destino terrible.',
      backdrop: 'https://image.tmdb.org/t/p/original/j6K2ugp5ZrnQtSRS1hg7PxwCMkM.jpg',
    },
  ];

  const [activeSlide, setActiveSlide] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [multimediaFocus, setMultimediaFocus] = useState<'hero' | 'continue'>('hero');
  const [continueWatchingIndex, setContinueWatchingIndex] = useState(0);


  useEffect(() => {
    if (nativeView !== 'multimedia' || multimediaExtensionId !== 'animeav1') return

    const controller = new AbortController()
    void fetch('http://localhost:3000/api/animeav1/latest', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`AnimeAV1 respondió con ${response.status}`)
        return response.json() as Promise<{ success?: boolean; data?: Array<{ title?: string; episode?: string; posterImage?: string | null; episodeImage?: string | null; animeUrl?: string | null }> }>
      })
      .then((payload) => {
        if (!payload.success || !Array.isArray(payload.data)) return
        const latest = payload.data
          .filter((item) => item.title)
          .map((item, index): MultimediaCard => ({
            id: index + 1,
            title: item.title!.trim(),
            season: '—',
            episode: String(item.episode || '—').replace(/^episodio\s*/i, ''),
            progress: 0,
            posterImage: item.posterImage || null,
            episodeImage: item.episodeImage || null,
            animeUrl: item.animeUrl || null
          }))
        if (latest.length > 0) setAnimeAV1Latest(latest)
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== 'AbortError') console.error('No se pudo cargar AnimeAV1:', error)
      })

    return () => controller.abort()
  }, [nativeView, multimediaExtensionId])

  // Reinicia el foco de la vista multimedia cada vez que se abre
  useEffect(() => {
    if (nativeView === 'multimedia') {
      setMultimediaFocus('hero')
      setContinueWatchingIndex(0)
    }
  }, [nativeView])

  // Evita que el resto de vistas (fondo, hero del launcher, etc.) se muevan
  // mientras la vista multimedia está abierta encima
  useEffect(() => {
    if (!nativeView) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [nativeView])

  const heroItem = heroSlides[activeSlide];
  const multimediaCards = multimediaExtensionId === 'animeav1' && animeAV1Latest.length > 0
    ? animeAV1Latest
    : continueWatching
  const multimediaSources = useMemo(() => [
    { id: 'multimedia', name: 'Multimedia' },
    ...extensions
      .filter((extension) => extension.nativeView === 'multimedia' && extension.id !== 'multimedia' && !extension.sidebar && extension.enabled)
      .map((extension) => ({ id: extension.id, name: extension.name }))
  ], [extensions])

  // Computes the 3 most recently added games dynamically
  const last3AddedGames = useMemo(() => {
    const list: Array<{ id: string; name: string; coverUrl: string; createdAtTime: number }> = []

    games.forEach((g) => {
      const t = g.createdAt ? new Date(g.createdAt).getTime() : 0
      list.push({
        id: g.id,
        name: g.name,
        coverUrl: g.gridImageUrl || g.squareGridImageUrl || g.heroImageUrl || g.iconDataUrl || '',
        createdAtTime: t
      })
    })

    steamLibrary.forEach((sg) => {
      const steamId = `steam-${sg.appid}`
      if (!list.some((item) => item.id === steamId)) {
        list.push({
          id: steamId,
          name: sg.name,
          coverUrl: sg.gridImageUrl || sg.squareGridImageUrl || `https://cdn.cloudflare.steamstatic.com/steam/apps/${sg.appid}/library_600x900_2x.jpg`,
          createdAtTime: 0
        })
      }
    })

    // Sort newest added first
    const sorted = [...list].sort((a, b) => b.createdAtTime - a.createdAtTime)

    const result: Array<{ id: string; name: string; coverUrl: string }> = []
    for (let i = 0; i < 3; i++) {
      if (sorted[i]) {
        result.push({
          id: sorted[i].id,
          name: sorted[i].name,
          coverUrl: sorted[i].coverUrl
        })
      } else {
        const def = DEFAULT_FEATURED_GAMES[i]
        result.push({
          id: def.gameId,
          name: def.name,
          coverUrl: def.coverUrl
        })
      }
    }
    return result
  }, [games, steamLibrary])

  // Store carousel state
  const [stores, setStores] = useState<Store[]>([])
  const [currentStoreIndex, setCurrentStoreIndex] = useState(0)
  const [storeHover, setStoreHover] = useState(false)

  // Game details view state
  const [detailGameId, setDetailGameId] = useState<string | null>(null)
  const [detailAccent, setDetailAccent] = useState<string>('#ffffff')
  const [detailScreenshots, setDetailScreenshots] = useState<Array<{ path_full: string; path_thumbnail: string }>>([])
  const [detailLoadingShots, setDetailLoadingShots] = useState(false)
  const [detailShotIndex, setDetailShotIndex] = useState(0)
  const [detailFocus, setDetailFocus] = useState<DetailFocusId>('play')
  const [detailAchievements, setDetailAchievements] = useState<SteamAchievement[]>([])
  const [achievementsView, setAchievementsView] = useState(false)
  const [achievementListIndex, setAchievementListIndex] = useState(0)
  const [detailInfo, setDetailInfo] = useState<{
    description: string | null
    developer: string | null
    publisher: string | null
    releaseDate: string | null
    reviewsRecent: { summary: string; count: number } | null
    reviewsAll: { summary: string; count: number } | null
    reviewsPositive: { summary: string; count: number } | null
    reviewsNegative: { summary: string; count: number } | null
    tags: string[]
    metacritic: { score: number; url: string | null } | null
    rating: { board: string; rating: string | null; descriptors: string[] } | null
  } | null>(null)
  const [detailInfoLoading, setDetailInfoLoading] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: window.outerWidth, height: window.outerHeight })

  // Helper Modal state (first time launch tutorial)
  const [showHelperModal, setShowHelperModal] = useState<boolean>(() => {
    try {
      const hasSeen = localStorage.getItem(HELPER_MODAL_STORAGE_KEY)
      return hasSeen !== 'true'
    } catch {
      return true
    }
  })

  const gamesRowRef = useRef<HTMLDivElement>(null)
  const libraryGridRef = useRef<HTMLDivElement>(null)
  // Offset actual del grid (translateY en px, negativo = scrolleado hacia abajo)
  const libraryTranslateYRef = useRef<number>(0)
  const wipeDirectionRef = useRef<1 | -1>(1)
  const previousHomeSelectedGameIdRef = useRef<string | null>(null)
  const detailFromLibraryRef = useRef(false)
  const lastNavTimeRef = useRef(0)
  const detailBottomFocusRef = useRef<DetailFocusId>('play')

  const visibleGames = useMemo(() => getRecentGames(games), [games])
  const sortedLibraryGames = useMemo(() => sortGamesByNewestFirst(games), [games])
  const sortedSteamFriends = useMemo(
    () => [...steamFriends].sort((a, b) => Number(isFriendActive(b)) - Number(isFriendActive(a)) || a.personaname.localeCompare(b.personaname)),
    [steamFriends]
  )
  const friendsAvatarSlots = useMemo(
    () => Array.from({ length: 5 }, (_, index) => sortedSteamFriends[index] ?? null),
    [sortedSteamFriends]
  )
  const otherFriends = useMemo(
    () => sortedSteamFriends.filter((friend) => friend.steamid !== selectedFriend?.steamid),
    [selectedFriend, sortedSteamFriends]
  )
  const steamLibraryArtUrl = useCallback((appid: string): string => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900_2x.jpg`, [])
  const steamHeroUrl = useCallback((appid: string): string => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_hero.jpg`, [])
  const steamLogoUrl = useCallback((appid: string): string => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/logo.png`, [])

  const rawSelectedGame = games.find((g) => g.id === selectedGameId) || null
  const selectedGame = useMemo<Game | null>(() => {
    if (!rawSelectedGame) return null
    if (rawSelectedGame.isSteam || rawSelectedGame.steamAppId || rawSelectedGame.id.startsWith('steam-')) {
      const appid = rawSelectedGame.steamAppId || rawSelectedGame.id.replace(/^steam-/, '')
      const storedArtwork = getStoredSteamArtwork()[appid] || {}
      return {
        ...rawSelectedGame,
        gridImageUrl: storedArtwork.gridImageUrl ?? rawSelectedGame.gridImageUrl ?? steamLibraryArtUrl(appid),
        squareGridImageUrl: storedArtwork.squareGridImageUrl ?? rawSelectedGame.squareGridImageUrl ?? null,
        heroImageUrl: storedArtwork.heroImageUrl ?? rawSelectedGame.heroImageUrl ?? steamHeroUrl(appid),
        logoImageUrl: storedArtwork.logoImageUrl ?? rawSelectedGame.logoImageUrl ?? steamLogoUrl(appid),
        iconDataUrl: storedArtwork.iconDataUrl ?? rawSelectedGame.iconDataUrl ?? null
      }
    }
    return rawSelectedGame
  }, [rawSelectedGame, steamLibraryArtUrl, steamHeroUrl, steamLogoUrl])

  const filteredSteamLibrary = useMemo(
    () => steamLibrary.filter((game) => !librarySearch || game.name.toLowerCase().includes(librarySearch.toLowerCase())),
    [steamLibrary, librarySearch]
  )
  const filteredLocalGames = useMemo(
    () => sortedLibraryGames.filter((game) => !librarySearch || game.name.toLowerCase().includes(librarySearch.toLowerCase())),
    [sortedLibraryGames, librarySearch]
  )
  const selectedSteamGame = useMemo(
    () => filteredSteamLibrary.find((game) => String(game.appid) === selectedSteamAppId) ?? filteredSteamLibrary[0] ?? null,
    [selectedSteamAppId, filteredSteamLibrary]
  )
  const librarySelectedGame = filteredLocalGames.find((g) => g.id === selectedGameId) || filteredLocalGames[0] || null
  const detailGame = useMemo<Game | null>(() => {
    const localGame = games.find((g) => g.id === detailGameId) || null
    if (localGame) {
      if (localGame.isSteam || localGame.steamAppId || localGame.id.startsWith('steam-')) {
        const appid = localGame.steamAppId || localGame.id.replace(/^steam-/, '')
        const storedArtwork = getStoredSteamArtwork()[appid] || {}
        return {
          ...localGame,
          gridImageUrl: storedArtwork.gridImageUrl ?? localGame.gridImageUrl ?? steamLibraryArtUrl(appid),
          squareGridImageUrl: storedArtwork.squareGridImageUrl ?? localGame.squareGridImageUrl ?? null,
          heroImageUrl: storedArtwork.heroImageUrl ?? localGame.heroImageUrl ?? steamHeroUrl(appid),
          logoImageUrl: storedArtwork.logoImageUrl ?? localGame.logoImageUrl ?? steamLogoUrl(appid),
          iconDataUrl: storedArtwork.iconDataUrl ?? localGame.iconDataUrl ?? null
        }
      }
      return localGame
    }

    if (!detailGameId || !detailGameId.startsWith('steam-')) return null

    const appid = detailGameId.replace(/^steam-/, '')
    const steamGame = steamLibrary.find((game) => String(game.appid) === appid)
    if (!steamGame) return null

    return {
      id: `steam-${steamGame.appid}`,
      name: steamGame.name,
      exePath: `steam://rungameid/${steamGame.appid}`,
      playtimeMinutes: Math.round(steamGame.playtime_forever / 60),
      lastPlayed: null,
      createdAt: new Date().toISOString(),
      color: '#66b2ff',
      steamAppId: String(steamGame.appid),
      isSteam: true,
      iconDataUrl: steamGame.iconDataUrl || null,
      gridImageUrl: steamGame.gridImageUrl || steamLibraryArtUrl(steamGame.appid),
      heroImageUrl: steamGame.heroImageUrl || steamHeroUrl(steamGame.appid),
      logoImageUrl: steamGame.logoImageUrl || steamLogoUrl(steamGame.appid)
    }
  }, [detailGameId, games, steamLibrary, steamLibraryArtUrl, steamHeroUrl, steamLogoUrl])
  const currentLibraryItems = useMemo(
    () => (librarySource === 'steam' ? filteredSteamLibrary : filteredLocalGames),
    [librarySource, filteredSteamLibrary, filteredLocalGames]
  )
  const currentLibraryCount = currentLibraryItems.length
  const compactDetailReviewLayout = windowSize.width < 1740 || windowSize.height < 910
  const smallDetailLayout = windowSize.width < 1366 || windowSize.height < 768
  const quickAppSlots = useMemo(() => Array.from({ length: 4 }, (_, index) => quickApps[index] ?? null), [quickApps])

  // En la vista principal de Home seguimos estando "enfocados" aunque el usuario
  // haya seleccionado un juego concreto del row: eso permite que el touchpad y la
  // navegación del mando puedan moverse también a las mini tarjetas del carp.
  const isHomeFocused =
    !libraryView && !detailGameId && modal === null && (
      selectedGameId === 'library' ||
      !selectedGameId ||
      visibleGames.some((game) => game.id === selectedGameId)
    )

  const [wallpaperFolder, setWallpaperFolder] = useState<string | null>(null)
  const [wallpaperImages, setWallpaperImages] = useState<Array<{ name: string; path: string; dataUrl: string; mtime: number }>>([])
  const [wallpaperMode, setWallpaperMode] = useState(false)
  const [wallpaperIndex, setWallpaperIndex] = useState(0)
  const [isWallpaperAnimating, setIsWallpaperAnimating] = useState(false)

  // Solo la card de Home (biblioteca), no juegos, bottom row ni wallpapers.
  const isHomeCardFocused =
    isHomeFocused &&
    !wallpaperMode &&
    !sidebarOpen &&
    homeCardMode === 'main' &&
    (selectedGameId === 'library' || selectedGameId === null)

  useEffect(() => {
    if (!isHomeFocused || libraryView || detailGameId || modal !== null) {
      setHomeCardMode('main')
      setBottomCardIndex(0)
    }
  }, [isHomeFocused, libraryView, detailGameId, modal])

  // ── Inactividad: 2 min en la card de Home agranda el player;
  // se vuelve a encoger solo al presionar fuera del reproductor (no por cualquier movimiento)
  const [isIdle, setIsIdle] = useState(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const preserveIdleRef = useRef(false)

  const showIdleMode = isIdle && isHomeCardFocused

  const scheduleIdle = useCallback(() => {
    if (!isHomeCardFocused) return
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => setIsIdle(true), 120000)
  }, [isHomeCardFocused])

  const exitIdle = useCallback(() => {
    setIsIdle(false)
    scheduleIdle()
  }, [scheduleIdle])

  const enterHomeIdle = useCallback(() => {
    preserveIdleRef.current = true
    setLibraryView(false)
    setDetailGameId(null)
    setModal(null)
    setSidebarOpen(false)
    setWallpaperMode(false)
    setHomeCardMode('main')
    setSelectedGameId('library')
    setIsIdle(true)
  }, [])

  // Antes de estar en idle: cualquier actividad retrasa el agrandado, pero no lo encoge
  useEffect(() => {
    if (showIdleMode) return
    if (!isHomeCardFocused) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      return
    }
    scheduleIdle()
    const resetOnly = (): void => {
      // solo reprograma el timer, no toca isIdle (que ya es false)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => setIsIdle(true), 120000)
    }
    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart']
    events.forEach((ev) => window.addEventListener(ev, resetOnly, { passive: true }))
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetOnly))
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [scheduleIdle, showIdleMode, isHomeCardFocused])

  // En idle: solo un click/touch fuera del reproductor lo encoge
  useEffect(() => {
    if (!showIdleMode) return
    const handleOutside = (e: Event): void => {
      const target = e.target as HTMLElement | null
      if (!target) return
      // si el click cae dentro del reproductor, no hacer nada
      if (target.closest('.music-player, .music-player-wrapper')) return
      exitIdle()
    }
    // click + touch para cubrir desktop/touch
    window.addEventListener('click', handleOutside, true)
    window.addEventListener('touchstart', handleOutside, true)
    // también permitir Esc para salir si el usuario lo espera
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') exitIdle()
    }
    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('click', handleOutside, true)
      window.removeEventListener('touchstart', handleOutside, true)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [showIdleMode, exitIdle])

  // Salir de idle al dejar la card de Home / modal / biblioteca
  useEffect(() => {
    if (preserveIdleRef.current) {
      preserveIdleRef.current = false
      return
    }
    if (modal !== null || detailGameId || libraryView || !isHomeCardFocused) setIsIdle(false)
  }, [modal, detailGameId, libraryView, isHomeCardFocused])

  // ── Friends card: música actual para botón Fecha + estado del control ──
  const { nowPlaying: friendsNowPlaying } = useSystemMedia(isGameRunning)
  const friendsMusicTitle = friendsNowPlaying?.title?.trim() ? friendsNowPlaying.title : t.noMusic
  const [isControllerConnected, setIsControllerConnected] = useState(false)

  // ── Friend notifications: detect when friends start playing games ──
  const { notifications, dismissNotification } = useFriendNotifications({
    friends: steamFriends,
    enabled: steamAccount.linked
  })

  // ── Steam download progress ──
  const { downloads: steamDownloads, completedDownloads, dismissCompletion } = useSteamDownloads(1000)

  // ── Download completion notifications ──
  const [downloadNotifications, setDownloadNotifications] = useState<Array<{ id: string; name: string; appId: string; iconUrl: string | null }>>([])
  const [downloadContextMenu, setDownloadContextMenu] = useState<{ visible: boolean; x: number; y: number; appId: string | null }>({ visible: false, x: 0, y: 0, appId: null })
  const [forgottenDownloads, setForgottenDownloads] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(FORGOTTEN_DOWNLOADS_KEY)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch { return new Set() }
  })
  // Ref to track which appIds already have a visible notification — avoids putting
  // downloadNotifications in the effect's deps array which would create an infinite loop.
  const notifiedAppIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (completedDownloads.length === 0) return
    for (const comp of completedDownloads) {
      // Avoid duplicates using a ref so we don't need downloadNotifications in deps
      if (notifiedAppIdsRef.current.has(comp.appId)) {
        dismissCompletion(comp.appId)
        continue
      }
      notifiedAppIdsRef.current.add(comp.appId)
      const iconUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${comp.appId}/header.jpg`
      // Try to get custom icon from steam library
      const steamGame = steamLibrary.find((g) => String(g.appid) === comp.appId)
      const finalIcon = steamGame?.iconDataUrl || iconUrl
      setDownloadNotifications((prev) => [
        ...prev,
        { id: `dl-notif-${comp.appId}-${Date.now()}`, name: comp.name, appId: comp.appId, iconUrl: finalIcon }
      ])
      // Clear downloadingGameId for this game
      if (downloadingGameId === `steam-${comp.appId}`) {
        setDownloadingGameId(null)
      }
      dismissCompletion(comp.appId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedDownloads, dismissCompletion, downloadingGameId, steamLibrary])

  const dismissDownloadNotification = useCallback((id: string) => {
    setDownloadNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const controllerStateRef = useRef<boolean | null>(null)
  useGamepadNavigation(isControllerConnected && !runningGameId && !isGameRunning)
  useEffect(() => {
    // Reproduce sonido de inicio (home.mp3) al abrir la app
    playHome()
  }, [])

  useEffect(() => {
    const syncControllerStatus = (connected: boolean): void => {
      if (controllerStateRef.current === connected) {
        setIsControllerConnected(connected)
        return
      }
      const isInitial = controllerStateRef.current === null
      controllerStateRef.current = connected
      setIsControllerConnected(connected)
      if (isInitial) {
        if (connected) playControllerConnected()
        return
      }
      if (connected) {
        playControllerConnected()
      } else {
        playControllerDisconnected()
      }
    }

    const check = (): void => {
      if (isGameRunningRef.current) return
      try {
        const pads = navigator.getGamepads ? navigator.getGamepads() : []
        const connected = Array.from(pads || []).some((p) => !!p)
        syncControllerStatus(connected)
      } catch {
        syncControllerStatus(false)
      }
    }

    check()
    const onConnect = (): void => syncControllerStatus(true)
    const onDisconnect = (): void => check()
    window.addEventListener('gamepadconnected', onConnect)
    window.addEventListener('gamepaddisconnected', onDisconnect)
    const interval = window.setInterval(check, 1500)
    return () => {
      window.removeEventListener('gamepadconnected', onConnect)
      window.removeEventListener('gamepaddisconnected', onDisconnect)
      window.clearInterval(interval)
    }
  }, [])

  // ── Wallpaper folder — W (solo Home) / artwork en juego ──
  const wallpaperRowRef = useRef<HTMLDivElement>(null)
  const isWallpaperMode = wallpaperMode && isHomeFocused && wallpaperImages.length > 0
  const selectedWallpaper = isWallpaperMode ? wallpaperImages[wallpaperIndex] ?? null : null

  // Función para cambiar el índice con animación
  const changeWallpaperIndex = useCallback((newIndex: number | ((prev: number) => number)) => {
    setIsWallpaperAnimating(true)
    setWallpaperIndex(newIndex)
    // Remover la clase después de que termine la transición
    setTimeout(() => setIsWallpaperAnimating(false), 350)
  }, [])

  // El dataUrl de wallpaperImages es el thumbnail cacheado (360px, pensado para las
  // cards chicas); usarlo también como fondo a pantalla completa se ve pixelado.
  // get-wallpaper-preview lee el archivo original en el proceso principal (sin
  // copiarlo ni tocar el fondo guardado) y acá lo cacheamos en memoria por path
  // para no releerlo del disco cada vez que se vuelve a pasar por esa wallpaper.
  const wallpaperPreviewCacheRef = useRef<Map<string, string>>(new Map())
  const [wallpaperBgHiRes, setWallpaperBgHiRes] = useState<string | null>(null)

  // Pre-cargar en memoria los previews HD de las wallpapers adyacentes para navegación instantánea
  useEffect(() => {
    if (!isWallpaperMode || wallpaperImages.length === 0) return
    const indicesToPrefetch = [
      wallpaperIndex,
      wallpaperIndex + 1,
      wallpaperIndex - 1,
      wallpaperIndex + 2,
      wallpaperIndex - 2
    ].filter((i) => i >= 0 && i < wallpaperImages.length)

    indicesToPrefetch.forEach((idx) => {
      const item = wallpaperImages[idx]
      if (!item?.path || wallpaperPreviewCacheRef.current.has(item.path)) return
      window.api.getWallpaperPreview(item.path).then((dataUrl) => {
        if (dataUrl) {
          wallpaperPreviewCacheRef.current.set(item.path, dataUrl)
          const img = new Image()
          img.src = dataUrl
          if (img.decode) img.decode().catch(() => { })
          if (idx === wallpaperIndex) {
            setWallpaperBgHiRes(dataUrl)
          }
        }
      }).catch(() => { })
    })
  }, [isWallpaperMode, wallpaperIndex, wallpaperImages])

  useEffect(() => {
    const path = selectedWallpaper?.path
    if (!path) {
      setWallpaperBgHiRes(null)
      return undefined
    }
    const cached = wallpaperPreviewCacheRef.current.get(path)
    if (cached) {
      setWallpaperBgHiRes(cached)
      return undefined
    }
    let cancelled = false
    window.api.getWallpaperPreview(path)
      .then((dataUrl: string | null) => {
        if (cancelled) return
        if (dataUrl) {
          wallpaperPreviewCacheRef.current.set(path, dataUrl)
          setWallpaperBgHiRes(dataUrl)
        }
      })
      .catch((err: unknown) => {
        console.error('Error cargando preview HD del wallpaper:', err)
      })
    return (): void => { cancelled = true }
  }, [selectedWallpaper?.path])

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const folder = await window.api.getWallpaperFolder()
        if (folder) {
          setWallpaperFolder(folder)
          const imgs = await window.api.getWallpaperImages(folder)
          setWallpaperImages(imgs)
        }
      } catch { }
    }
    load()
  }, [])

  useEffect(() => {
    if (!isHomeFocused) setWallpaperMode(false)
  }, [isHomeFocused])

  useEffect(() => {
    if (modal === 'settings' && wallpaperImages.length > 0 && backgroundImage) {
      const activeIdx = wallpaperImages.findIndex(
        (item) => backgroundImage === item.dataUrl || backgroundImage?.includes(item.name)
      )
      if (activeIdx >= 0) {
        setSettingsWallpaperPage(Math.floor(activeIdx / 4))
      }
    }
  }, [modal, settingsTab, wallpaperImages, backgroundImage])

  // ── Clock ──
  useEffect(() => {
    const tick = (): void => {
      if (isGameRunningRef.current) return
      const now = new Date()
      setClock(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      )
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])



  // ── Track current window size for compact detail layout ──
  useEffect(() => {
    const updateWindowSize = (): void => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    updateWindowSize()
    window.addEventListener('resize', updateWindowSize)
    return () => window.removeEventListener('resize', updateWindowSize)
  }, [])

  // ── Load games from disk ──
  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const stored = await window.api.getGames()
        if (Array.isArray(stored) && stored.length > 0) {
          const normalizedGames = stored.map((game) => ({
            ...game,
            createdAt: game.createdAt || game.lastPlayed || new Date().toISOString()
          }))
          setGames(normalizedGames)
          setSelectedGameId('library')
        }
      } catch (err) {
        console.error('Error loading games:', err)
      }
    }
    load()
  }, [])

  // ── Load background image ──
  useEffect(() => {
    const loadBg = async (): Promise<void> => {
      try {
        const bg = await window.api.getBackgroundImage()
        if (bg) setBackgroundImage(bg)
      } catch (err) {
        console.error('Error loading background:', err)
      }
    }
    loadBg()
  }, [])

  // ── Load user profile ──
  useEffect(() => {
    const loadProfile = async (): Promise<void> => {
      try {
        const profile = await window.api.getProfile()
        if (profile) {
          setProfileName(profile.name || '')
          setProfileAvatar(profile.avatar || null)
        }
      } catch (err) {
        console.error('Error loading profile:', err)
      }
    }
    loadProfile()
  }, [])

  // ── Load installed stores ──
  useEffect(() => {
    const loadStores = async (): Promise<void> => {
      try {
        const storeList = await window.api.getStores()
        if (Array.isArray(storeList) && storeList.length > 0) {
          setStores(storeList)
          setCurrentStoreIndex(0)
        }
      } catch (err) {
        console.error('Error loading stores:', err)
      }
    }
    loadStores()
  }, [])

  // ── Load Steam linkage and library ──
  useEffect(() => {
    const loadSteamAccount = async (): Promise<void> => {
      try {
        const account = await window.api.getSteamAccount()
        console.log(`[App] Loaded Steam account: linked=${account?.linked}, steamId=${account?.steamId}, steamId64=${account?.steamId64}, accountName=${account?.accountName}`)
        setSteamAccount({
          linked: !!account?.linked,
          apiKey: account?.apiKey || DEFAULT_STEAM_API_KEY,
          steamId: account?.steamId || '',
          accountName: account?.accountName || '',
          steamId64: account?.steamId64 || null
        })
      } catch (err) {
        console.error('Error loading Steam account:', err)
      }
    }
    loadSteamAccount()
  }, [])

  const loadSteamLibrary = useCallback(async (): Promise<void> => {
    if (!steamAccount.linked || !steamAccount.apiKey || !steamAccount.steamId) return

    setSteamLibraryLoading(true)
    try {
      const query = new URLSearchParams({
        key: steamAccount.apiKey,
        steamId: steamAccount.steamId
      })

      const res = await fetch(`${BACKEND_URL}/api/steam/library?${query.toString()}`)
      if (!res.ok) return
      const games = await res.json()
      const normalizedGames = (Array.isArray(games) ? games : []).map((game: SteamLibraryGame) => ({
        ...game,
        appid: String(game.appid),
        installed: Boolean(game.installed),
        ...(getStoredSteamArtwork()[String(game.appid)] || {})
      }))

      const appIds = normalizedGames.map((game) => game.appid)
      const installStatus = window.api?.getSteamInstallationStatus
        ? await window.api.getSteamInstallationStatus(appIds)
        : {}
      const finalGames = normalizedGames.map((game) => {
        // Preservar artwork que estaba en memoria pero no en localStorage
        // (ej. URLs de CDN de Steam asignadas dinámicamente o de SteamGridDB en sesiones previas)
        const inMemory = steamLibraryRef.current.find((g) => g.appid === game.appid)
        const storedArtwork = getStoredSteamArtwork()[String(game.appid)] || {}
        return {
          ...game,
          installed: Boolean(installStatus?.[game.appid]) || Boolean(game.installed),
          gridImageUrl: storedArtwork.gridImageUrl ?? inMemory?.gridImageUrl ?? game.gridImageUrl ?? steamLibraryArtUrl(game.appid),
          squareGridImageUrl: storedArtwork.squareGridImageUrl ?? inMemory?.squareGridImageUrl ?? game.squareGridImageUrl ?? null,
          heroImageUrl: storedArtwork.heroImageUrl ?? inMemory?.heroImageUrl ?? game.heroImageUrl ?? steamHeroUrl(game.appid),
          logoImageUrl: storedArtwork.logoImageUrl ?? inMemory?.logoImageUrl ?? game.logoImageUrl ?? steamLogoUrl(game.appid),
          iconDataUrl: storedArtwork.iconDataUrl ?? inMemory?.iconDataUrl ?? game.iconDataUrl ?? null,
        }
      })

      let hidden: string[] = []
      try {
        hidden = JSON.parse(localStorage.getItem('gbl_hidden_steam_apps') || '[]')
      } catch { }
      const visibleGames = finalGames.filter((g) => !hidden.includes(String(g.appid)))

      setSteamLibrary(visibleGames)
      if (librarySource === 'steam' && visibleGames.length > 0) {
        setSelectedSteamAppId(String(visibleGames[0].appid))
      }
    } catch (err) {
      console.error('Error loading Steam library:', err)
      setSteamLibrary([])
    } finally {
      setSteamLibraryLoading(false)
    }
  }, [librarySource, steamAccount, steamLibraryArtUrl, steamHeroUrl, steamLogoUrl])

  // ── Refresh steam library when download completes ──
  const prevCompletedRef = useRef<string>('')
  useEffect(() => {
    if (completedDownloads.length === 0) return
    const key = completedDownloads.map((c) => c.appId).join(',')
    if (key === prevCompletedRef.current) return
    prevCompletedRef.current = key
    // Re-fetch library to update installed status
    if (steamAccount.linked && steamAccount.apiKey && steamAccount.steamId) {
      void loadSteamLibrary()
    }
  }, [completedDownloads, steamAccount, loadSteamLibrary])

  const loadSteamFriends = useCallback(async (): Promise<void> => {
    if (!steamAccount.linked || !steamAccount.apiKey || !steamAccount.steamId) {
      setSteamFriends([])
      return
    }

    try {
      const query = new URLSearchParams({
        key: steamAccount.apiKey,
        steamId: steamAccount.steamId
      })

      const res = await fetch(`${BACKEND_URL}/api/steam/friends?${query.toString()}`)
      if (!res.ok) {
        setSteamFriends([])
        return
      }

      const friends = await res.json()
      const normalizedFriends = (Array.isArray(friends) ? friends : [])
        .map((friend: SteamFriend) => ({
          steamid: String(friend.steamid),
          personaname: friend.personaname || 'Steam friend',
          avatar: friend.avatar || null,
          avatarfull: friend.avatarfull || friend.avatar || null,
          profileurl: friend.profileurl || null,
          personastate: Number(friend.personastate || 0),
          gameid: friend.gameid || null,
          gameextrainfo: friend.gameextrainfo || null
        }))
        .filter((friend) => Boolean(friend.avatarfull))

      setSteamFriends(normalizedFriends)
    } catch (err) {
      console.error('Error loading Steam friends:', err)
      setSteamFriends([])
    }
  }, [steamAccount])

  useEffect(() => {
    if (steamAccount.linked) {
      void loadSteamLibrary()
      void loadSteamFriends()
      const friendsRefresh = window.setInterval(() => { void loadSteamFriends() }, 10000)
      return () => window.clearInterval(friendsRefresh)
    } else {
      setSteamLibrary([])
      setSteamFriends([])
      setSelectedSteamAppId(null)
    }
    return undefined
  }, [steamAccount, loadSteamLibrary, loadSteamFriends])

  useEffect(() => {
    if (!selectedFriend) {
      setSelectedFriendBackground(null)
      return
    }

    let cancelled = false
    setSelectedFriendBackground(null)
    fetch(`${BACKEND_URL}/api/steam/friends/${selectedFriend.steamid}/background`)
      .then((response) => response.ok ? response.json() : null)
      .then((data: { background?: string | null } | null) => {
        if (!cancelled) setSelectedFriendBackground(data?.background || null)
      })
      .catch(() => {
        if (!cancelled) setSelectedFriendBackground(null)
      })

    return () => { cancelled = true }
  }, [selectedFriend])

  // ── Store carousel auto-advance (paused on hover) ──
  useEffect(() => {
    if (stores.length <= 1 || storeHover) return
    const interval = setInterval(() => {
      if (isGameRunningRef.current) return
      setCurrentStoreIndex((prev) => (prev + 1) % stores.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [stores.length, storeHover])

  // ── Listen for game-exited events from main process ──
  useEffect(() => {
    const unsubscribe = window.api.onGameExited((data) => {
      setRunningGameId(null)
      setIsGameRunning(false)
      isGameRunningRef.current = false
      setGames((prev) => {
        const updated = prev.map((g) =>
          g.id === data.gameId
            ? {
              ...g,
              playtimeMinutes: g.playtimeMinutes + data.durationMinutes,
              lastPlayed: new Date().toISOString()
            }
            : g
        )
        window.api.saveGames(updated)
        return updated
      })
    })
    return unsubscribe
  }, [])

  // ── Listen for game-session-start (launcher hides, suspend activities) ──
  useEffect(() => {
    const unsubscribe = window.api.onGameSessionStart((data) => {
      isGameRunningRef.current = true
      setIsGameRunning(true)
      // Navegar al detail del juego que acaba de iniciar
      if (data?.gameId) {
        setLibraryView(false)
        setDetailGameId(data.gameId)
      }
    })
    return unsubscribe
  }, [])

  // ── Extract an accent color from the detail game's hero image ──
  useEffect(() => {
    if (!detailGame?.heroImageUrl) {
      setDetailAccent('#0c0c0c')
      return
    }
    let cancelled = false
    const img = new Image()
    // NOTE: intentionally NOT setting img.crossOrigin — most image CDNs (SteamGridDB
    // included) don't send Access-Control-Allow-Origin, so requesting CORS mode just
    // makes the browser refuse to load the image at all. Loading it "normally" instead
    // taints the canvas, which means getImageData() below will throw a SecurityError —
    // that's expected and handled by the catch block, which falls back to a neutral color.
    img.onload = () => {
      if (cancelled) return
      try {
        const canvas = document.createElement('canvas')
        const w = (canvas.width = 32)
        const h = (canvas.height = 32)
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, w, h)
        const { data } = ctx.getImageData(0, 0, w, h)
        let r = 0
        let g = 0
        let b = 0
        let count = 0
        // Sample the lower portion of the image, which is where the gradient blends in
        for (let y = Math.floor(h * 0.55); y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4
            r += data[i]
            g += data[i + 1]
            b += data[i + 2]
            count++
          }
        }
        r = Math.round(r / count)
        g = Math.round(g / count)
        b = Math.round(b / count)
        if (!cancelled) setDetailAccent(`rgb(${r}, ${g}, ${b})`)
      } catch {
        // Canvas is tainted by a cross-origin image with no CORS headers — expected, fall back silently.
        if (!cancelled) setDetailAccent('#0c0c0c')
      }
    }
    img.onerror = () => {
      if (!cancelled) setDetailAccent('#0c0c0c')
    }
    img.src = detailGame.heroImageUrl
    return () => {
      cancelled = true
    }
  }, [detailGame?.heroImageUrl])

  // ── Fetch Steam screenshots + details for the detail game ──
  useEffect(() => {
    if (!detailGame) {
      setDetailScreenshots([])
      setDetailInfo(null)
      setDetailShotIndex(0)
      setDetailAchievements([])
      return
    }
    let cancelled = false
    const loadDetails = async (): Promise<void> => {
      setDetailLoadingShots(true)
      setDetailInfoLoading(true)
      setDetailScreenshots([])
      setDetailInfo(null)
      setDetailShotIndex(0)
      setDetailAchievements([])
      try {
        // Steam entries already carry their AppID; local games still resolve by name.
        let appid = detailGame.steamAppId
        if (!appid) {
          const resolveRes = await fetch(
            `${BACKEND_URL}/api/steam/resolve?term=${encodeURIComponent(detailGame.name)}&lang=${language}`
          )
          if (!resolveRes.ok) return
          const resolved = await resolveRes.json()
          appid = resolved?.appid
        }
        if (!appid) return

        const canFetchAchievements = Boolean(
          steamAccount.apiKey
        )

        const [shotsRes, detailsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/steam/screenshots/${appid}?lang=${language}`),
          fetch(`${BACKEND_URL}/api/steam/details/${appid}?lang=${language}`)
        ])

        if (!cancelled && shotsRes.ok) {
          const shots = await shotsRes.json()
          if (Array.isArray(shots)) {
            setDetailScreenshots(shots)
          }
        }
        if (!cancelled && detailsRes.ok) {
          const details = await detailsRes.json()
          if (details) setDetailInfo(details)
        }

        // Fetch achievements via backend (CSP blocks direct Steam API calls from renderer)
        if (!cancelled && canFetchAchievements) {
          try {
            const steamIdParam = steamAccount.steamId64 || steamAccount.steamId || ''
            console.log(`[App] Fetching achievements: appid=${appid}, steamId=${steamIdParam}, apiKey=${steamAccount.apiKey ? '***' : 'missing'}`)
            const achParams = new URLSearchParams({
              key: steamAccount.apiKey,
              appid: String(appid),
              lang: language
            })
            if (steamIdParam) achParams.set('steamId', steamIdParam)
            const achRes = await fetch(
              `${BACKEND_URL}/api/steam/achievements?${achParams.toString()}`
            )
            if (!cancelled && achRes.ok) {
              const achData = await achRes.json()
              const achList = achData?.achievements
              console.log(`[App] Achievements response: ${achList?.length || 0} total, ${achList?.filter((a: any) => a.achieved)?.length || 0} unlocked`)
              if (Array.isArray(achList)) {
                setDetailAchievements(
                  achList.map((a: any) => ({
                    apiname: String(a.apiname || ''),
                    achieved: a.achieved ? 1 : 0,
                    unlocktime: Number(a.unlocktime || 0),
                    name: a.name || a.displayName || a.apiname || '',
                    displayName: a.displayName || a.name || a.apiname || '',
                    description: a.description || null,
                    icon: a.icon || null,
                    icongray: a.icongray || null
                  }))
                )
              }
            }
          } catch (achErr) {
            console.error('Error fetching achievements via backend:', achErr)
          }
        }
      } catch (err) {
        console.error('Error obteniendo información de Steam:', err)
      } finally {
        if (!cancelled) {
          setDetailLoadingShots(false)
          setDetailInfoLoading(false)
        }
      }
    }
    loadDetails()
    return () => {
      cancelled = true
    }
  }, [detailGameId, language, steamAccount.linked, steamAccount.apiKey, steamAccount.steamId, steamAccount.steamId64])

  useEffect(() => {
    if (!detailGameId) return
    setDetailFocus('play')
    detailBottomFocusRef.current = 'play'
    setAchievementsView(false)
    setAchievementListIndex(0)
  }, [detailGameId])

  // ── Close detail view with Escape (sonido close) ──
  useEffect(() => {
    if (!detailGameId) return
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      if (achievementsView) return
      playClose()
      if (detailFromLibraryRef.current) {
        detailFromLibraryRef.current = false
        setDetailGameId(null)
        setLibraryView(true)
      } else {
        setDetailGameId(null)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [detailGameId, achievementsView])

  // ── Persist games ──
  const saveGames = useCallback(
    (newGames: Game[]) => {
      setGames(newGames)
      window.api.saveGames(newGames)
    },
    []
  )

  const saveQuickApps = useCallback((newApps: QuickApp[]) => {
    setQuickApps(newApps)
    localStorage.setItem(QUICK_APPS_STORAGE_KEY, JSON.stringify(newApps))
  }, [])

  // ── Select game file ──
  const handleBrowse = useCallback(async () => {
    const filePath = await window.api.selectGameFile()
    if (filePath) {
      setFormExePath(filePath)
      const icon = await window.api.getFileIcon(filePath)
      if (icon) setFormIconUrl(icon)
      if (!formName) {
        const filename = filePath.split(/[\\/]/).pop() || ''
        const nameWithoutExt = filename.replace(/\.[^.]+$/, '')
        setFormName(nameWithoutExt)
      }
    }
  }, [formName])

  // Solo abre el explorador de archivos UNA vez. El artwork se resuelve
  // automáticamente (SteamGridDB / icono del .exe); ya no se pide una segunda
  // imagen manualmente aquí (eso generaba el "segundo explorador").
  const handleAddQuickApp = useCallback(async () => {
    const filePath = await window.api.selectGameFile()
    if (!filePath) return

    const iconDataUrl = await window.api.getFileIcon(filePath)
    const fileName = filePath.split(/[\\/]/).pop() || 'App'
    const appName = fileName.replace(/\.[^.]+$/, '') || 'App'
    const autoArtworkUrl = await fetchAutoArtworkUrl(appName)

    setPendingQuickApp({
      mode: 'add',
      filePath,
      name: appName,
      iconDataUrl: iconDataUrl || null,
      autoArtworkUrl
    })
  }, [])

  const handleEditQuickApp = useCallback(async (appId: string) => {
    const target = quickApps.find((app) => app.id === appId)
    if (!target) return

    const filePath = await window.api.selectGameFile()
    if (!filePath) return

    const iconDataUrl = await window.api.getFileIcon(filePath)
    const appName = filePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || target.name
    const autoArtworkUrl = await fetchAutoArtworkUrl(appName)

    setPendingQuickApp({
      mode: 'edit',
      editId: appId,
      filePath,
      name: appName,
      iconDataUrl: iconDataUrl || target.iconDataUrl || null,
      autoArtworkUrl
    })
  }, [quickApps])

  // Confirma el tipo (Juego / Programa) elegido en el modal y persiste la app rápida
  const finalizeQuickApp = useCallback((kind: QuickAppKind) => {
    if (!pendingQuickApp) return

    if (pendingQuickApp.mode === 'add') {
      const newApp: QuickApp = {
        id: generateId(),
        name: pendingQuickApp.name,
        exePath: pendingQuickApp.filePath,
        artworkUrl: pendingQuickApp.autoArtworkUrl || pendingQuickApp.iconDataUrl || null,
        iconDataUrl: pendingQuickApp.iconDataUrl,
        lastPlayed: null,
        createdAt: new Date().toISOString(),
        kind
      }
      saveQuickApps([...quickApps, newApp])
    } else if (pendingQuickApp.editId) {
      const updatedApps = quickApps.map((app) => app.id === pendingQuickApp.editId
        ? {
          ...app,
          name: pendingQuickApp.name,
          exePath: pendingQuickApp.filePath,
          iconDataUrl: pendingQuickApp.iconDataUrl || app.iconDataUrl,
          artworkUrl: pendingQuickApp.autoArtworkUrl || app.artworkUrl,
          kind
        }
        : app)
      saveQuickApps(updatedApps)
    }

    setPendingQuickApp(null)
  }, [pendingQuickApp, quickApps, saveQuickApps])

  const handleLaunchQuickApp = useCallback(async (app: QuickApp) => {
    const now = new Date().toISOString()

    // Programas: se abren directo, sin crear una entrada en "games", así que
    // nunca aparecen en el row de recientes/biblioteca y por lo tanto nunca
    // disparan el Detail View de juegos.
    if (app.kind === 'program') {
      saveQuickApps(quickApps.map((a) => (a.id === app.id ? { ...a, lastPlayed: now } : a)))
      playEnter()
      try {
        await window.api.launchGame(`quick-${app.id}`, app.exePath)
      } catch (err) {
        console.error('Error launching program:', err)
      }
      return
    }

    // Juegos: comportamiento original — crean/actualizan una entrada en "games"
    // (id `quick-<id>`) para que aparezcan en recientes y puedan abrir el Detail View.
    const quickGameId = `quick-${app.id}`
    const newGame: Game = {
      id: quickGameId,
      name: app.name,
      exePath: app.exePath,
      iconDataUrl: app.iconDataUrl,
      playtimeMinutes: 0,
      lastPlayed: now,
      createdAt: now,
      color: randomColor(),
      gridImageUrl: app.artworkUrl || app.iconDataUrl || null,
      heroImageUrl: app.artworkUrl || app.iconDataUrl || null,
      logoImageUrl: null,
      steamAppId: null,
      isSteam: false
    }

    setGames((prevGames) => {
      const existingIndex = prevGames.findIndex((g) => g.id === quickGameId)
      const updatedGames = existingIndex >= 0
        ? prevGames.map((g) => g.id === quickGameId ? { ...g, ...newGame, lastPlayed: now } : g)
        : [...prevGames, newGame]

      window.api.saveGames(updatedGames)
      return updatedGames
    })

    saveQuickApps(quickApps.map((a) => (a.id === app.id ? { ...a, lastPlayed: now } : a)))
    setSelectedGameId(quickGameId)
    setRunningGameId(quickGameId)
    playEnterGame()

    try {
      await window.api.launchGame(quickGameId, app.exePath)
    } catch (err) {
      console.error('Error launching quick app:', err)
      setRunningGameId(null)
    }
  }, [quickApps, saveQuickApps])

  // ── Add game ──
  const handleAddGame = useCallback(async () => {
    if (!formName.trim()) return
    const newGame: Game = {
      id: generateId(),
      name: formName.trim(),
      exePath: formExePath.trim(),
      iconDataUrl: formIconUrl,
      playtimeMinutes: 0,
      lastPlayed: null,
      createdAt: new Date().toISOString(),
      color: randomColor(),
      steamGridId: null,
      gridImageUrl: null,
      heroImageUrl: null,
      logoImageUrl: null
    }

    // Auto-fetch artwork
    try {
      const searchRes = await fetch(`${BACKEND_URL}/api/steamgrid/search?term=${encodeURIComponent(newGame.name)}`)
      if (searchRes.ok) {
        const searchData = await searchRes.json()
        if (Array.isArray(searchData) && searchData.length > 0) {
          const gameId = searchData[0].id
          newGame.steamGridId = gameId

          const [squareGridsRes, gridsRes, heroesRes, logosRes] = await Promise.all([
            fetch(`${BACKEND_URL}/api/steamgrid/square_grids/${gameId}`),
            fetch(`${BACKEND_URL}/api/steamgrid/grids/${gameId}`),
            fetch(`${BACKEND_URL}/api/steamgrid/heroes/${gameId}`),
            fetch(`${BACKEND_URL}/api/steamgrid/logos/${gameId}`)
          ])

          if (squareGridsRes.ok) {
            const squareGrids = await squareGridsRes.json()
            if (squareGrids && squareGrids.length > 0) newGame.gridImageUrl = squareGrids[0].url
          }
          if (!newGame.gridImageUrl && gridsRes.ok) {
            const grids = await gridsRes.json()
            if (grids && grids.length > 0) newGame.gridImageUrl = grids[0].url
          }
          if (heroesRes.ok) {
            const heroes = await heroesRes.json()
            if (heroes && heroes.length > 0) newGame.heroImageUrl = heroes[0].url
          }
          if (logosRes.ok) {
            const logos = await logosRes.json()
            if (logos && logos.length > 0) newGame.logoImageUrl = logos[0].url
          }
        }
      }
    } catch (err) {
      console.error('Error auto-fetching artwork:', err)
    }

    setGames((prevGames) => {
      const newGames = [...prevGames, newGame]
      window.api.saveGames(newGames)
      return newGames
    })
    setSelectedGameId(newGame.id)
    setModal(null)
    resetForm()
  }, [formName, formExePath, formIconUrl])

  // ── Edit game ──
  const handleEditGame = useCallback(() => {
    if (!formName.trim() || !editingGameId) return
    const newGames = games.map((g) =>
      g.id === editingGameId
        ? {
          ...g,
          name: formName.trim(),
          exePath: formExePath.trim(),
          iconDataUrl: formIconUrl ?? g.iconDataUrl
        }
        : g
    )
    saveGames(newGames)
    setModal(null)
    resetForm()
  }, [formName, formExePath, formIconUrl, editingGameId, games, saveGames])

  // ── Delete game ──
  const handleDeleteGame = useCallback(
    (gameId: string) => {
      if (gameId.startsWith('steam-')) {
        const appid = gameId.replace(/^steam-/, '')
        setSteamLibrary((prev) => prev.filter((g) => String(g.appid) !== String(appid)))
        if (selectedSteamAppId === appid) {
          setSelectedSteamAppId(null)
        }
        if (detailGameId === gameId) {
          setDetailGameId(null)
        }
        try {
          const hidden = JSON.parse(localStorage.getItem('gbl_hidden_steam_apps') || '[]')
          if (!hidden.includes(appid)) {
            localStorage.setItem('gbl_hidden_steam_apps', JSON.stringify([...hidden, appid]))
          }
        } catch (e) {
          console.error(e)
        }
        return
      }
      const newGames = games.filter((g) => g.id !== gameId)
      saveGames(newGames)
      if (selectedGameId === gameId) {
        setSelectedGameId(newGames.length > 0 ? newGames[0].id : null)
      }
      if (detailGameId === gameId) {
        setDetailGameId(null)
      }
    },
    [games, selectedGameId, selectedSteamAppId, detailGameId, saveGames]
  )

  // ── Launch game ──
  const handleLaunchGame = useCallback(async (overrideGameId?: string) => {
    // Resolver objetivo: prioriza override (corrige bug de estado stale en Steam), luego detail, luego selección
    let launchTarget: Game | null = null

    const resolveSteamTarget = (appid: string): Game | null => {
      const existingInGames = games.find((g) => g.id === `steam-${appid}` || g.steamAppId === String(appid))
      const steamG = steamLibrary.find((g) => String(g.appid) === String(appid))
      if (!steamG && !existingInGames) return null
      const installed = steamG ? Boolean(steamG.installed) : true
      const storedArtwork = getStoredSteamArtwork()[String(appid)] || {}

      return {
        id: `steam-${appid}`,
        name: existingInGames?.name || steamG?.name || `Steam App ${appid}`,
        exePath: installed ? `steam://rungameid/${appid}` : `steam://install/${appid}`,
        playtimeMinutes: existingInGames?.playtimeMinutes ?? (steamG ? Math.round(steamG.playtime_forever / 60) : 0),
        lastPlayed: existingInGames?.lastPlayed ?? null,
        createdAt: existingInGames?.createdAt || new Date().toISOString(),
        color: existingInGames?.color || '#66b2ff',
        steamAppId: String(appid),
        isSteam: true,
        steamGridId: existingInGames?.steamGridId ?? steamG?.steamGridId ?? null,
        iconDataUrl: storedArtwork.iconDataUrl ?? existingInGames?.iconDataUrl ?? steamG?.iconDataUrl ?? null,
        gridImageUrl: storedArtwork.gridImageUrl ?? existingInGames?.gridImageUrl ?? steamG?.gridImageUrl ?? steamLibraryArtUrl(appid),
        squareGridImageUrl: storedArtwork.squareGridImageUrl ?? existingInGames?.squareGridImageUrl ?? steamG?.squareGridImageUrl ?? null,
        heroImageUrl: storedArtwork.heroImageUrl ?? existingInGames?.heroImageUrl ?? steamG?.heroImageUrl ?? steamLibraryArtUrl(appid),
        logoImageUrl: storedArtwork.logoImageUrl ?? existingInGames?.logoImageUrl ?? steamG?.logoImageUrl ?? null
      } as Game
    }

    if (overrideGameId) {
      if (overrideGameId.startsWith('steam-')) {
        launchTarget = resolveSteamTarget(overrideGameId.replace(/^steam-/, '')) ?? detailGame
      } else {
        launchTarget = games.find((g) => g.id === overrideGameId) ?? null
      }
    } else if (detailGame) {
      // Si hay detalle abierto, ese es el objetivo (corrige Steam que abría otro juego)
      if (detailGame.isSteam) {
        const steamResolved = resolveSteamTarget(String(detailGame.steamAppId || detailGame.id.replace(/^steam-/, '')))
        launchTarget = steamResolved ?? detailGame
        // asegurar exePath correcto según instalado
        if (launchTarget && launchTarget.isSteam) {
          const appid = String(launchTarget.steamAppId || '')
          const inst = steamLibrary.some((g) => String(g.appid) === appid && g.installed)
          launchTarget = { ...launchTarget, exePath: inst ? `steam://rungameid/${appid}` : `steam://install/${appid}` }
        }
      } else {
        launchTarget = detailGame
      }
    } else if (libraryView && librarySource === 'steam' && selectedSteamGame) {
      launchTarget = resolveSteamTarget(selectedSteamGame.appid)
    } else {
      launchTarget = selectedGame ?? (selectedSteamGame ? resolveSteamTarget(selectedSteamGame.appid) : null)
    }

    if (!launchTarget) return

    playEnterGame()

    if (!launchTarget.isSteam) {
      setGames((prev) => {
        if (!prev.some((g) => g.id === launchTarget!.id)) return prev
        const updated = prev.map((g) =>
          g.id === launchTarget!.id ? { ...g, lastPlayed: new Date().toISOString() } : g
        )
        window.api.saveGames(updated)
        return updated
      })
    } else {
      const appid = String(launchTarget.steamAppId || launchTarget.id.replace(/^steam-/, ''))
      const inst = steamLibrary.some((g) => String(g.appid) === appid && g.installed)
      const steamGame = steamLibrary.find((g) => String(g.appid) === appid)
      const storedArtwork = getStoredSteamArtwork()[appid] || {}
      const now = new Date().toISOString()
      launchTarget = { ...launchTarget, exePath: inst ? `steam://rungameid/${appid}` : `steam://install/${appid}` }
      setGames((prev) => {
        const existingGame = prev.find((g) => g.id === `steam-${appid}` || g.steamAppId === appid)
        const entry: Game = {
          id: `steam-${appid}`,
          name: existingGame?.name || steamGame?.name || launchTarget!.name,
          exePath: launchTarget!.exePath,
          iconDataUrl: storedArtwork.iconDataUrl ?? existingGame?.iconDataUrl ?? launchTarget!.iconDataUrl ?? steamGame?.iconDataUrl ?? null,
          playtimeMinutes: existingGame?.playtimeMinutes ?? launchTarget!.playtimeMinutes,
          lastPlayed: now,
          createdAt: existingGame?.createdAt || launchTarget!.createdAt || now,
          color: existingGame?.color || launchTarget!.color,
          steamAppId: appid,
          isSteam: true,
          steamGridId: existingGame?.steamGridId ?? launchTarget!.steamGridId ?? null,
          gridImageUrl: storedArtwork.gridImageUrl ?? existingGame?.gridImageUrl ?? launchTarget!.gridImageUrl ?? steamGame?.gridImageUrl ?? steamLibraryArtUrl(appid),
          squareGridImageUrl: storedArtwork.squareGridImageUrl ?? existingGame?.squareGridImageUrl ?? launchTarget!.squareGridImageUrl ?? steamGame?.squareGridImageUrl ?? null,
          heroImageUrl: storedArtwork.heroImageUrl ?? existingGame?.heroImageUrl ?? launchTarget!.heroImageUrl ?? steamGame?.heroImageUrl ?? steamLibraryArtUrl(appid),
          logoImageUrl: storedArtwork.logoImageUrl ?? existingGame?.logoImageUrl ?? launchTarget!.logoImageUrl ?? steamGame?.logoImageUrl ?? null
        }

        const updated = prev.some((g) => g.id === entry.id)
          ? prev.map((g) => g.id === entry.id ? { ...g, ...entry } : g)
          : [...prev, entry]

        window.api.saveGames(updated)
        return updated
      })
    }

    const isInstall = /^steam:\/\/install\//i.test(launchTarget.exePath)
    if (isInstall) {
      setDownloadingGameId(launchTarget.id)
    } else {
      setRunningGameId(launchTarget.id)
    }
    try {
      await window.api.launchGame(launchTarget.id, launchTarget.exePath)
    } catch (err) {
      console.error('Error launching game:', err)
      setRunningGameId(null)
      setDownloadingGameId(null)
    }
  }, [selectedGame, selectedSteamGame, steamLibrary, steamLibraryArtUrl, games, detailGame, libraryView, librarySource])

  // ── Open specs modal ──
  const handleOpenSpecs = useCallback(async () => {
    try {
      playEnter()
      const info = await window.api.getSystemInfo()
      setSystemInfo(info)
      setModal('specs')
    } catch (err) {
      console.error('Error fetching system info:', err)
    }
  }, [])

  // ── Open add game modal ──
  const openAddGameModal = useCallback(() => {
    playEnter()
    resetForm()
    setModal('addGame')
  }, [])

  const openLibraryView = useCallback(() => {
    playEnter()
    setDetailGameId(null)
    previousHomeSelectedGameIdRef.current = selectedGameId
    setSelectedGameId(sortedLibraryGames[0]?.id ?? null)
    setLibraryView(true)
  }, [sortedLibraryGames, selectedGameId])

  // ── Open edit game modal ──
  const openEditGameModal = useCallback(
    (gameId: string) => {
      setEditGameTab('inicio')
      const game = games.find((g) => g.id === gameId)
      if (!game) {
        if (gameId.startsWith('steam-')) {
          const appid = gameId.replace(/^steam-/, '')
          const steamGame = steamLibrary.find((g) => String(g.appid) === String(appid))
          if (steamGame) {
            setEditingGameId(gameId)
            setFormName(steamGame.name)
            setFormExePath(steamGame.installed ? `steam://rungameid/${steamGame.appid}` : `steam://install/${steamGame.appid}`)
            setFormIconUrl(steamGame.iconDataUrl || null)
            setFormLaunchArgs('')
            setModal('editGame')
            return
          }
        }
        return
      }
      setEditingGameId(gameId)
      setFormName(game.name)
      setFormExePath(game.exePath)
      setFormIconUrl(game.iconDataUrl)
      setFormLaunchArgs('')
      setModal('editGame')
    },
    [games, steamLibrary]
  )

  const resetForm = (): void => {
    setFormName('')
    setFormExePath('')
    setFormIconUrl(null)
    setFormLaunchArgs('')
    setEditingGameId(null)
    setEditGameTab('inicio')
  }

  // ── Context menu handler ──
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, gameId: string) => {
      e.preventDefault()
      e.stopPropagation()
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        gameId
      })
    },
    []
  )

  // ── Background image handlers ──
  const handleSelectBackground = useCallback(async () => {
    try {
      const dataUrl = await window.api.selectBackgroundImage()
      if (dataUrl) {
        setBackgroundImage(dataUrl)
      }
    } catch (err) {
      console.error('Error selecting background:', err)
    }
  }, [])

  const handleClearBackground = useCallback(async () => {
    try {
      await window.api.clearBackgroundImage()
      setBackgroundImage(null)
    } catch (err) {
      console.error('Error clearing background:', err)
    }
  }, [])

  // ── Profile handlers ──
  const handleSelectProfileImage = useCallback(async () => {
    try {
      const dataUrl = await window.api.selectProfileImage()
      if (dataUrl) {
        setProfileAvatar(dataUrl)
        await window.api.saveProfile({ name: profileName, avatar: dataUrl })
      }
    } catch (err) {
      console.error('Error selecting profile image:', err)
    }
  }, [profileName])

  const handleSaveProfileName = useCallback(
    async (name: string) => {
      setProfileName(name)
      await window.api.saveProfile({ name, avatar: profileAvatar })
    },
    [profileAvatar]
  )



  const handleCheckForUpdates = useCallback(async () => {
    setIsCheckingUpdate(true)
    setUpdateMessage(null)
    setUpdateLink(null)
    try {
      const data = await window.api.checkForUpdates()
      const apiVersion = data.version
      const downloadLink = data.link
      const cmp = compareVersions(apiVersion, APP_VERSION)
      if (cmp > 0) {
        setUpdateMessage(`Nueva versión encontrada: v${apiVersion}`)
        setUpdateLink(downloadLink)
      } else {
        setUpdateMessage('HASHI está actualizado')
        setTimeout(() => setUpdateMessage(null), 4000)
      }
    } catch {
      setUpdateMessage('Error al buscar actualizaciones')
      setTimeout(() => setUpdateMessage(null), 4000)
    } finally {
      setIsCheckingUpdate(false)
    }
  }, [])

  const handleOpenWallpaperFolderPicker = useCallback(async () => {
    try {
      const res = await window.api.selectWallpaperFolder?.()
      if (res?.folder && Array.isArray(res.images)) {
        setWallpaperFolder(res.folder)
        setWallpaperImages(res.images)
        setWallpaperIndex(0)
      } else if (res?.folder) {
        const imgs = await window.api.getWallpaperImages?.(res.folder)
        setWallpaperFolder(res.folder)
        setWallpaperImages(imgs || [])
        setWallpaperIndex(0)
      }
    } catch (err) {
      console.error('Error selecting wallpaper folder:', err)
    }
  }, [])

  const handleSelectWallpaperFromFolder = useCallback(async (imgPath: string, fallbackDataUrl: string) => {
    try {
      const dataUrl = await window.api.setWallpaperAsBackground?.(imgPath)
      setBackgroundImage(dataUrl || fallbackDataUrl)
    } catch (err) {
      console.error('Error fijando fondo:', err)
      setBackgroundImage(fallbackDataUrl)
    }
  }, [])

  // ── Store carousel handlers ──
  const handleOpenStore = useCallback(
    async (storeId: string) => {
      const store = stores.find((s) => s.id === storeId)
      if (!store || !store.installed) return
      try {
        await window.api.openStore(storeId)
      } catch (err) {
        console.error('Error opening store:', err)
      }
    },
    [stores]
  )

  const handleStoreSelect = useCallback((index: number) => {
    setCurrentStoreIndex(index)
  }, [])

  const handleSteamOpenIdLink = useCallback(async () => {
    try {
      const result = await window.api.openSteamOpenId()
      if (!result?.linked || !result.steamId) {
        return
      }

      const payload = {
        linked: true,
        apiKey: result.apiKey || DEFAULT_STEAM_API_KEY,
        steamId: result.steamId,
        accountName: result.accountName || result.steamId,
        steamId64: result.steamId64 || result.steamId
      }

      await window.api.saveSteamAccount(payload)
      setSteamAccount(payload)
      setLibrarySource('steam')
      setModal(null)
    } catch (err) {
      console.error('Error vinculando Steam con OpenID:', err)
    }
  }, [])

  const handleSteamUnlink = useCallback(async () => {
    const payload = {
      linked: false,
      apiKey: DEFAULT_STEAM_API_KEY,
      steamId: '',
      accountName: '',
      steamId64: null
    }
    await window.api.saveSteamAccount(payload)
    setSteamAccount(payload)
    setLibrarySource('local')
  }, [])

  // ── SteamGridDB handlers ──
  const handleSgdbSearch = useCallback(async () => {
    if (!sgdbSearch.trim()) return
    setSgdbLoading(true)
    setSgdbResults([])
    setSgdbSelectedGame(null)
    setSgdbImages([])
    try {
      const res = await fetch(`${BACKEND_URL}/api/steamgrid/search?term=${encodeURIComponent(sgdbSearch.trim())}`)
      if (!res.ok) throw new Error('Error buscando en SteamGridDB')
      const data = await res.json()
      setSgdbResults(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('SteamGridDB search error:', err)
    } finally {
      setSgdbLoading(false)
    }
  }, [sgdbSearch])

  const handleSgdbSelectGame = useCallback(async (game: SteamGridGame) => {
    setSgdbSelectedGame(game)
    setSgdbImagesLoading(true)
    setSgdbImages([])
    try {
      const res = await fetch(`${BACKEND_URL}/api/steamgrid/${sgdbArtType}/${game.id}`)
      if (!res.ok) throw new Error('Error obteniendo imágenes')
      const data = await res.json()
      setSgdbImages(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('SteamGridDB images error:', err)
    } finally {
      setSgdbImagesLoading(false)
    }
  }, [sgdbArtType])

  const handleSgdbChangeArtType = useCallback(async (type: SteamGridArtType) => {
    setSgdbArtType(type)
    if (!sgdbSelectedGame) return
    setSgdbImagesLoading(true)
    setSgdbImages([])
    try {
      const res = await fetch(`${BACKEND_URL}/api/steamgrid/${type}/${sgdbSelectedGame.id}`)
      if (!res.ok) throw new Error('Error obteniendo imágenes')
      const data = await res.json()
      setSgdbImages(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('SteamGridDB images error:', err)
    } finally {
      setSgdbImagesLoading(false)
    }
  }, [sgdbSelectedGame])

  const resetSgdbState = useCallback(() => {
    setSgdbSearch('')
    setSgdbResults([])
    setSgdbSelectedGame(null)
    setSgdbImages([])
    setSgdbTargetGameId(null)
    setSgdbSelections({ square_grids: null, grids: null, heroes: null, logos: null, icons: null })
  }, [])

  const handleSgdbToggleImage = useCallback((image: SteamGridImage) => {
    setSgdbSelections((prev) => ({
      ...prev,
      [sgdbArtType]: prev[sgdbArtType]?.id === image.id ? null : image
    }))
  }, [sgdbArtType])

  const handleSgdbSaveSelections = useCallback(() => {
    if (!sgdbTargetGameId || !sgdbSelectedGame) return

    const fieldMap: [SteamGridArtType, string][] = [
      ['square_grids', 'squareGridImageUrl'],
      ['grids', 'gridImageUrl'],
      ['heroes', 'heroImageUrl'],
      ['logos', 'logoImageUrl'],
      ['icons', 'iconDataUrl']
    ]

    const updates: Record<string, string> = {}
    for (const [artType, artField] of fieldMap) {
      const selected = sgdbSelections[artType]
      if (selected) {
        updates[artField] = selected.url
      }
    }

    if (Object.keys(updates).length === 0) {
      setModal(null)
      resetSgdbState()
      return
    }

    if (sgdbTargetGameId.startsWith('steam-')) {
      const steamAppId = sgdbTargetGameId.replace(/^steam-/, '')
      setSteamLibrary((previousGames) =>
        previousGames.map((game) =>
          String(game.appid) === steamAppId ? { ...game, ...updates } : game
        )
      )
      const artwork = getStoredSteamArtwork()
      artwork[steamAppId] = {
        ...(artwork[steamAppId] || {}),
        ...updates
      }
      localStorage.setItem(STEAM_ARTWORK_STORAGE_KEY, JSON.stringify(artwork))

      setGames((prevGames) => {
        if (!prevGames.some((g) => g.id === sgdbTargetGameId || g.steamAppId === steamAppId)) {
          return prevGames
        }
        const updated = prevGames.map((g) =>
          g.id === sgdbTargetGameId || g.steamAppId === steamAppId
            ? { ...g, ...updates, steamGridId: sgdbSelectedGame.id }
            : g
        )
        window.api.saveGames(updated)
        return updated
      })
    } else if (sgdbTargetGameId.startsWith('quick-')) {
      const quickId = sgdbTargetGameId.replace(/^quick-/, '')
      const quickUpdates: Record<string, string> = {}
      if (updates.iconDataUrl) quickUpdates.iconDataUrl = updates.iconDataUrl
      if (updates.gridImageUrl || updates.squareGridImageUrl) {
        quickUpdates.artworkUrl = updates.gridImageUrl || updates.squareGridImageUrl || ''
      }

      if (Object.keys(quickUpdates).length > 0) {
        setQuickApps((prevApps) => {
          const updatedApps = prevApps.map((app) =>
            app.id === quickId ? { ...app, ...quickUpdates } : app
          )
          saveQuickApps(updatedApps)
          return updatedApps
        })
      }
      setGames((prevGames) => {
        if (!prevGames.some((g) => g.id === sgdbTargetGameId)) return prevGames
        const updated = prevGames.map((g) =>
          g.id === sgdbTargetGameId
            ? { ...g, ...updates, steamGridId: sgdbSelectedGame.id }
            : g
        )
        window.api.saveGames(updated)
        return updated
      })
    } else {
      setGames((prevGames) => {
        const updated = prevGames.map((g) =>
          g.id === sgdbTargetGameId
            ? { ...g, ...updates, steamGridId: sgdbSelectedGame.id }
            : g
        )
        window.api.saveGames(updated)
        return updated
      })
    }

    setModal(null)
    resetSgdbState()
  }, [
    sgdbTargetGameId,
    sgdbSelectedGame,
    sgdbSelections,
    resetSgdbState,
    saveQuickApps
  ])

  const openSteamGridModal = useCallback((gameId: string) => {
    if (gameId.startsWith('steam-')) {
      const steamAppId = gameId.replace(/^steam-/, '')
      const steamGame = steamLibrary.find((game) => String(game.appid) === steamAppId)
      if (!steamGame) return
      setSgdbTargetGameId(gameId)
      setSgdbSearch(steamGame.name)
      setSgdbArtType('grids')
      setSgdbResults([])
      setSgdbSelectedGame(null)
      setSgdbImages([])
      setModal('steamgrid')
      return
    }

    if (gameId.startsWith('quick-')) {
      // La app rápida es la fuente de verdad del nombre/artwork, exista o no
      // todavía una entrada en "games" (solo se crea al lanzarla la primera vez).
      const quickId = gameId.replace(/^quick-/, '')
      const quickApp = quickApps.find((app) => app.id === quickId)
      if (!quickApp) return
      setSgdbTargetGameId(gameId)
      setSgdbSearch(quickApp.name)
      setSgdbArtType('grids')
      setSgdbResults([])
      setSgdbSelectedGame(null)
      setSgdbImages([])
      setModal('steamgrid')
      return
    }

    const game = games.find((g) => g.id === gameId)
    if (!game) return
    setSgdbTargetGameId(gameId)
    setSgdbSearch(game.name)
    setSgdbArtType('grids')
    setSgdbResults([])
    setSgdbSelectedGame(null)
    setSgdbImages([])
    setModal('steamgrid')
  }, [games, steamLibrary, quickApps])

  const handleWallpaperButton = useCallback(async () => {
    // En juego: mismo botón edita artwork del juego enfocado
    if (!isHomeFocused) {
      const targetId = detailGameId ?? (selectedGameId && selectedGameId !== 'library' ? selectedGameId : null) ?? (selectedGame ? selectedGame.id : null) ?? (detailGame ? detailGame.id : null)
      if (targetId) {
        openSteamGridModal(targetId)
      }
      window.setTimeout(() => (document.activeElement as HTMLElement)?.blur(), 0)
      return
    }
    // En Home: toggle row de wallpapers (solo Home)
    if (wallpaperFolder && wallpaperImages.length > 0) {
      setWallpaperMode((v) => !v)
      window.setTimeout(() => (document.activeElement as HTMLElement)?.blur(), 0)
      return
    }
    try {
      const res = await window.api.selectWallpaperFolder()
      if (res?.folder && Array.isArray(res.images)) {
        setWallpaperFolder(res.folder)
        setWallpaperImages(res.images)
        changeWallpaperIndex(0)
        setWallpaperMode(true)
      } else if (res?.folder) {
        const imgs = await window.api.getWallpaperImages(res.folder)
        setWallpaperFolder(res.folder)
        setWallpaperImages(imgs)
        changeWallpaperIndex(0)
        if (imgs.length > 0) setWallpaperMode(true)
      }
    } catch (err) {
      console.error('Error seleccionando carpeta de wallpapers:', err)
    } finally {
      window.setTimeout(() => (document.activeElement as HTMLElement)?.blur(), 0)
    }
  }, [isHomeFocused, detailGameId, selectedGameId, selectedGame, detailGame, wallpaperFolder, wallpaperImages.length, openSteamGridModal])

  const handleChooseWallpaperAsHome = useCallback(async (idx?: number) => {
    const targetIdx = typeof idx === 'number' ? idx : wallpaperIndex
    const img = wallpaperImages[targetIdx]
    if (!img) return
    try {
      const dataUrl = await window.api.setWallpaperAsBackground(img.path)
      setBackgroundImage(dataUrl || img.dataUrl)
      setWallpaperMode(false)
    } catch (err) {
      console.error('Error fijando fondo:', err)
      setBackgroundImage(img.dataUrl)
      setWallpaperMode(false)
    } finally {
      window.setTimeout(() => (document.activeElement as HTMLElement)?.blur(), 0)
    }
  }, [wallpaperImages, wallpaperIndex])

  // ── Keyboard Navigation (con sonidos UI) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (contextMenu.visible && (e.key === 'ContextMenu' || e.key === 'Escape')) {
        e.preventDefault()
        setContextMenu((prev) => ({ ...prev, visible: false }))
        return
      }
      if (downloadContextMenu.visible && (e.key === 'ContextMenu' || e.key === 'Escape')) {
        e.preventDefault()
        setDownloadContextMenu({ visible: false, x: 0, y: 0, appId: null })
        return
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur()
        }
        return
      }

      if (selectedFriend) {
        const friendIndex = sortedSteamFriends.findIndex((friend) => friend.steamid === selectedFriend.steamid)
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault()
          const next = Math.min(friendIndex + 1, sortedSteamFriends.length - 1)
          if (next !== friendIndex) {
            playMove()
            setSelectedFriend(sortedSteamFriends[next])
          }
          return
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault()
          const previous = Math.max(friendIndex - 1, 0)
          if (previous !== friendIndex) {
            playMove()
            setSelectedFriend(sortedSteamFriends[previous])
          }
          return
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          playEnter()
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          playClose()
          setSelectedFriend(null)
          return
        }
      }

      if (e.key === 'Start') {
        e.preventDefault()
        playEnter()
        setSidebarOpen(true)
        return
      }

      if (e.key === 'GamepadTouchpad') {
        e.preventDefault()
        if (isHomeCardFocused) {
          setIsIdle((prev) => !prev)
        } else {
          enterHomeIdle()
        }
        return
      }

      if (libraryView) {
        if (e.key === 'Escape') {
          e.preventDefault()
          playClose()
          setSelectedGameId(previousHomeSelectedGameIdRef.current)
          setLibraryView(false)
        }
        if (e.key === 'BrowserBack' || e.key === 'BrowserForward') {
          e.preventDefault()
          const nextSource: LibrarySource = e.key === 'BrowserBack' ? 'local' : 'steam'
          if (nextSource !== librarySource) {
            playPages()
            setLibrarySource(nextSource)
            if (nextSource === 'steam' && steamLibrary.length > 0) {
              setSelectedSteamAppId(String(steamLibrary[0].appid))
            } else if (nextSource === 'local' && sortedLibraryGames.length > 0) {
              setSelectedGameId(sortedLibraryGames[0]?.id ?? null)
            }
          }
          return
        }
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowDown') && currentLibraryItems.length > 0) {
          e.preventDefault()
          const currentIndex = librarySource === 'steam'
            ? Math.max(0, currentLibraryItems.findIndex((game) => String((game as SteamLibraryGame).appid) === selectedSteamAppId))
            : Math.max(0, currentLibraryItems.findIndex((game) => 'id' in game && game.id === selectedGameId))
          const columnCount = libraryGridRef.current
            ? getGridColumnCount(libraryGridRef.current)
            : 1
          const step = e.key === 'ArrowUp' ? -columnCount : e.key === 'ArrowDown' ? columnCount : e.key === 'ArrowLeft' ? -1 : 1
          const nextIndex = Math.max(0, Math.min(currentLibraryItems.length - 1, currentIndex + step))
          if (nextIndex !== currentIndex) playMove()
          if (librarySource === 'steam') {
            const nextGame = currentLibraryItems[nextIndex] as SteamLibraryGame
            const nextAppId = String(nextGame.appid)
            setSelectedSteamAppId(nextAppId)
            const target = document.getElementById(`library-game-${nextAppId}`)
            // preventScroll: el contenedor de la grilla usa scroll manual vía
            // transform (translateY); si el focus dispara el auto-scroll
            // nativo del navegador sobre el ancestro con overflow:hidden,
            // ambos desplazamientos se pisan y la grilla queda desalineada.
            target?.focus({ preventScroll: true })
          } else {
            const nextGame = currentLibraryItems[nextIndex] as Game
            if (nextGame?.id) {
              setSelectedGameId(nextGame.id)
              const target = document.getElementById(`library-game-${nextGame.id}`)
              target?.focus({ preventScroll: true })
            }
          }
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          if (librarySource === 'steam' && selectedSteamAppId) {
            const steamGame = steamLibrary.find((game) => String(game.appid) === selectedSteamAppId)
            if (steamGame) {
              playEnter()
              detailFromLibraryRef.current = true
              setLibraryView(false)
              setDetailGameId(`steam-${steamGame.appid}`)
            }
            return
          }
          if (librarySelectedGame) {
            playEnter()
            detailFromLibraryRef.current = true
            setLibraryView(false)
            setDetailGameId(librarySelectedGame.id)
          }
        }
        return
      }
      if (modal !== null) {
        if (e.key === 'Escape') {
          e.preventDefault()
          playClose()
          setModal(null)
        }
        return
      }

      if (nativeView === 'multimedia' && !sidebarOpen) {
        if (e.key === 'Escape') {
          e.preventDefault()
          playEnter()
          setSidebarOpen(true)
          return
        }

        if (multimediaFocus === 'hero') {
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            playMove()
            setIsHeroPaused(true)
            setActiveSlide((prev) => (prev + 1) % heroSlides.length)
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            playMove()
            setIsHeroPaused(true)
            setActiveSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (multimediaCards.length > 0) {
              playMove()
              setMultimediaFocus('continue')
            }
          }
        } else {
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            const next = Math.min(continueWatchingIndex + 1, multimediaCards.length - 1)
            if (next !== continueWatchingIndex) {
              playMove()
              setContinueWatchingIndex(next)
            }
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            const previous = Math.max(continueWatchingIndex - 1, 0)
            if (previous !== continueWatchingIndex) {
              playMove()
              setContinueWatchingIndex(previous)
            }
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            playMove()
            setMultimediaFocus('hero')
          }
        }
        return
      }

      if (nativeView && !sidebarOpen) {
        if (e.key === 'Escape') {
          e.preventDefault()
          playClose()
          setNativeView(null)
        }
        return
      }

      if (e.key === 'ContextMenu') {
        e.preventDefault()

        if (libraryView && librarySource === 'steam' && selectedSteamAppId) {
          setContextMenu({ visible: true, x: window.innerWidth * 0.52, y: window.innerHeight * 0.42, gameId: `steam-${selectedSteamAppId}` })
          return
        }
        if (libraryView && librarySelectedGame) {
          setContextMenu({ visible: true, x: window.innerWidth * 0.52, y: window.innerHeight * 0.42, gameId: librarySelectedGame.id })
          return
        }
        if (isHomeFocused && homeCardMode === 'quick-apps' && quickAppSlots[quickAppFocusIndex]) {
          setContextMenu({ visible: true, x: window.innerWidth * 0.55, y: window.innerHeight * 0.45, gameId: `quick-${quickAppSlots[quickAppFocusIndex]!.id}` })
          return
        }
        if (selectedGameId && selectedGameId !== 'library') {
          setContextMenu({ visible: true, x: window.innerWidth * 0.55, y: window.innerHeight * 0.45, gameId: selectedGameId })
        }
        return
      }

      if (sidebarOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSidebarIndex((prev) => {
            const next = Math.min(prev + 1, 6)
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSidebarIndex((prev) => {
            const next = Math.max(prev - 1, 0)
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'Enter') {
          e.preventDefault()
          playEnter()
          if (sidebarIndex === 0) { setNativeView(null); playHome() }
          else if (sidebarIndex === 1) openAddGameModal()
          else if (sidebarIndex === 2) handleOpenStore(defaultStore)
          else if (sidebarIndex === 3) handleOpenSpecs()
          else if (sidebarIndex === 4) setShowDownloadsModal(true)
          else if (sidebarIndex === 5) setModal('extensions')
          else if (sidebarIndex === 6) setModal('settings')
          else if (sidebarIndex === 7) window.api.quitApp()
          setSidebarOpen(false)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Escape') {
          e.preventDefault()
          playClose()
          setSidebarOpen(false)
        }
      } else if (isWallpaperMode) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          changeWallpaperIndex((prev) => {
            const next = Math.min(prev + 1, wallpaperImages.length - 1)
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          changeWallpaperIndex((prev) => {
            const next = Math.max(prev - 1, 0)
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'Escape') {
          e.preventDefault()
          playClose()
          setWallpaperMode(false)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          playEnter()
          void handleChooseWallpaperAsHome()
        }
      } else if (isHomeFocused && homeCardMode === 'quick-apps') {
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          setQuickAppFocusIndex((prev) => {
            const next = prev === 0 ? 1 : prev === 2 ? 3 : prev
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          setQuickAppFocusIndex((prev) => {
            const next = prev === 1 ? 0 : prev === 3 ? 2 : prev
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          setQuickAppFocusIndex((prev) => {
            const next = prev === 0 ? 2 : prev === 1 ? 3 : prev
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (quickAppFocusIndex < 2) {
            playClose()
            setHomeCardMode('bottom')
          } else {
            setQuickAppFocusIndex((prev) => {
              const next = prev === 2 ? 0 : prev === 3 ? 1 : prev
              if (next !== prev) playMove()
              return next
            })
          }
        } else if (e.key === 'Escape') {
          e.preventDefault()
          playClose()
          setHomeCardMode('bottom')
        } else if (e.key === 'Enter') {
          e.preventDefault()
          const app = quickAppSlots[quickAppFocusIndex]
          if (app) {
            playEnter()
            void handleLaunchQuickApp(app)
          } else {
            playEnter()
            void handleAddQuickApp()
          }
        }
      } else if (isHomeFocused && homeCardMode === 'bottom') {
        const bottomCardCount = 5
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          setBottomCardIndex((prev) => {
            const next = (prev + 1) % bottomCardCount
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          setBottomCardIndex((prev) => {
            const next = (prev - 1 + bottomCardCount) % bottomCardCount
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setHomeCardMode('main')
        } else if (e.key === 'Enter') {
          e.preventDefault()
          if (bottomCardIndex === 0) {
            playEnter()
            openLibraryView()
          } else if (bottomCardIndex === 1) {
            const store = stores[currentStoreIndex]
            if (store) {
              playEnter()
              void handleOpenStore(store.id)
            }
          } else if (bottomCardIndex === 2) {
            playEnter()
            setModal('settings')
          } else if (bottomCardIndex === 3) {
            playEnter()
            setHomeCardMode('quick-apps')
            setQuickAppFocusIndex(0)
          } else if (bottomCardIndex === 4) {
            const firstFriend = sortedSteamFriends[0]
            if (firstFriend) {
              playEnter()
              setSelectedFriend(firstFriend)
            }
          }
        } else if (e.key === 'Escape') {
          e.preventDefault()
          playClose()
          setHomeCardMode('main')
        }
      } else {
        // Si el detail está abierto, navegar con flechas
        if (detailGameId) {
          if (e.key === 'Escape') {
            e.preventDefault()
            playClose()
            if (achievementsView) {
              setAchievementsView(false)
              return
            }
            if (detailFromLibraryRef.current) {
              detailFromLibraryRef.current = false
              setDetailGameId(null)
              setLibraryView(true)
            } else {
              setDetailGameId(null)
            }
            return
          }

          const hasShots = detailScreenshots.length > 1
          const bottomRow: DetailFocusId[] = hasShots
            ? ['shotPrev', 'shotNext', 'achievements', 'play', 'edit']
            : ['achievements', 'play', 'edit']

          const moveDetailFocus = (next: DetailFocusId): void => {
            if (next === detailFocus) return
            playMove()
            if (next !== 'back') detailBottomFocusRef.current = next
            setDetailFocus(next)
          }

          if (achievementsView) {
            if (e.key === 'Escape') {
              e.preventDefault()
              playClose()
              setAchievementsView(false)
            } else if (e.key === 'ArrowRight' && detailAchievements.length > 0) {
              e.preventDefault()
              setAchievementListIndex((prev) => {
                const next = Math.min(prev + 1, detailAchievements.length - 1)
                if (next !== prev) playMove()
                return next
              })
            } else if (e.key === 'ArrowLeft' && detailAchievements.length > 0) {
              e.preventDefault()
              setAchievementListIndex((prev) => {
                const next = Math.max(prev - 1, 0)
                if (next !== prev) playMove()
                return next
              })
            }
            return
          }

          if (e.key === 'ArrowRight') {
            e.preventDefault()
            const i = bottomRow.indexOf(detailFocus)
            if (i >= 0 && i < bottomRow.length - 1) moveDetailFocus(bottomRow[i + 1])
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            const i = bottomRow.indexOf(detailFocus)
            if (i > 0) moveDetailFocus(bottomRow[i - 1])
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (detailFocus === 'back') {
              const remembered = detailBottomFocusRef.current
              moveDetailFocus(bottomRow.includes(remembered) ? remembered : 'play')
            }
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (bottomRow.includes(detailFocus)) moveDetailFocus('back')
          } else if (e.key === 'Enter') {
            e.preventDefault()
            playEnter()
            if (detailFocus === 'back') {
              if (detailFromLibraryRef.current) {
                detailFromLibraryRef.current = false
                setDetailGameId(null)
                setLibraryView(true)
              } else {
                setDetailGameId(null)
              }
            } else if (hasShots && detailFocus === 'shotPrev') {
              handlePrevShot()
            } else if (hasShots && detailFocus === 'shotNext') {
              handleNextShot()
            } else if (detailFocus === 'achievements') {
              setAchievementListIndex(0)
              setAchievementsView(true)
            } else if (detailFocus === 'play') {
              if (detailGame) handleLaunchGame(detailGame.id)
            } else if (detailFocus === 'edit') {
              if (detailGame?.id) openEditGameModal(detailGame.id)
            }
          }
          return
        }

        const gameIds = ['library', ...visibleGames.map(g => g.id)]
        const currentIndex = gameIds.indexOf(selectedGameId || 'library')
        const now = performance.now()
        const NAV_COOLDOWN = 150

        if (e.key === 'ArrowRight') {
          e.preventDefault()
          if (currentIndex < gameIds.length - 1 && now - lastNavTimeRef.current > NAV_COOLDOWN) {
            lastNavTimeRef.current = now
            playMove()
            wipeDirectionRef.current = 1
            setSelectedGameId(gameIds[currentIndex + 1])
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          if (currentIndex > 0 && now - lastNavTimeRef.current > NAV_COOLDOWN) {
            lastNavTimeRef.current = now
            playMove()
            wipeDirectionRef.current = -1
            setSelectedGameId(gameIds[currentIndex - 1])
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          setHomeCardMode('bottom')
          setBottomCardIndex(0)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          if (selectedGameId === 'library' || !selectedGameId) {
            playEnter()
            openLibraryView()
          } else if (selectedGameId) {
            playEnter()
            setDetailGameId(selectedGameId)
          }
        } else if (e.key === 'Escape') {
          e.preventDefault()
          playEnter()
          setSidebarOpen(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [libraryView, games, librarySelectedGame, selectedGameId, sidebarOpen, sidebarIndex, modal, nativeView, visibleGames, handleLaunchGame, openLibraryView, openAddGameModal, handleOpenSpecs, openExtension, sidebarExtensions, isWallpaperMode, wallpaperImages.length, handleChooseWallpaperAsHome, detailGameId, detailFocus, detailScreenshots.length, detailGame, detailAchievements.length, achievementsView, librarySource, currentLibraryItems, selectedSteamAppId, steamLibrary, contextMenu.visible, selectedFriend, sortedSteamFriends, isHomeFocused, isHomeCardFocused, enterHomeIdle, quickAppFocusIndex, quickAppSlots, homeCardMode, bottomCardIndex, stores, currentStoreIndex, handleOpenStore, handleLaunchQuickApp, handleAddQuickApp, multimediaFocus, continueWatchingIndex, heroSlides.length, multimediaCards.length, openEditGameModal])

  // ── Detail view handlers (con sonidos) ──
  const handleCloseDetail = useCallback(() => {
    playClose()
    if (detailFromLibraryRef.current) {
      detailFromLibraryRef.current = false
      setDetailGameId(null)
      setLibraryView(true)
    } else {
      setDetailGameId(null)
    }
  }, [])

  const openDetailView = useCallback((gameId: string) => {
    playEnter()
    setDetailFocus('play')
    detailBottomFocusRef.current = 'play'
    if (gameId.startsWith('steam-')) {
      const appid = gameId.replace(/^steam-/, '')
      setSelectedSteamAppId(appid)
      setSelectedGameId(null)
      setDetailGameId(gameId)
      return
    }

    setSelectedGameId(gameId)
    setDetailGameId(gameId)
  }, [])

  useEffect(() => {
    if (!gamesRowRef.current) return

    const targetId = selectedGameId === 'library' ? 'btn-library' : selectedGameId ? `game-card-${selectedGameId}` : null
    if (!targetId) return

    const target = document.getElementById(targetId)
    if (!target) return

    const row = gamesRowRef.current
    const targetLeft = target.offsetLeft
    const targetWidth = target.offsetWidth
    const rowWidth = row.clientWidth
    const desiredLeft = targetLeft - (rowWidth - targetWidth) / 2

    row.scrollTo({
      left: Math.max(0, desiredLeft),
      behavior: 'smooth'
    })
  }, [selectedGameId, visibleGames])

  useEffect(() => {
    if (!libraryView) return
    // Resetear translateY al cambiar fuente o entrar a la biblioteca
    libraryTranslateYRef.current = 0
    if (libraryGridRef.current) {
      libraryGridRef.current.style.transition = 'none'
      libraryGridRef.current.style.transform = 'translateY(0px)'
      libraryGridRef.current.parentElement?.classList.remove('has-scrolled')
    }
  }, [libraryView, librarySource])

  useEffect(() => {
    if (!libraryView || !libraryGridRef.current) return
    const grid = libraryGridRef.current
    const selectedId = librarySource === 'steam' ? selectedSteamAppId : selectedGameId
    if (!selectedId) return

    const currentIndex = librarySource === 'steam'
      ? currentLibraryItems.findIndex((game) => String((game as SteamLibraryGame).appid) === selectedId)
      : currentLibraryItems.findIndex((game) => 'id' in game && game.id === selectedId)
    if (currentIndex < 0) return

    const columnCount = getGridColumnCount(grid)
    const items = grid.querySelectorAll<HTMLElement>('.library-item')
    const firstItem = items[0]
    if (!firstItem) return
    const secondRowItem = items[columnCount] as HTMLElement | undefined
    const rowHeight = secondRowItem
      ? secondRowItem.offsetTop - firstItem.offsetTop
      : firstItem.offsetHeight + 16 // fallback: altura + gap

    const currentRow = Math.floor(currentIndex / columnCount)
    const panelHeight = grid.parentElement?.clientHeight ?? 0
    const visibleRows = Math.max(1, Math.floor(panelHeight / rowHeight))

    // Cálculo DIRECTO (no acumulativo): la fila que queda arriba del
    // viewport se deriva solo de currentRow/visibleRows, sin depender de
    // "cuánto se había scrolleado antes". La versión anterior arrastraba
    // el translateY previo como punto de partida (firstVisibleRow =
    // currentOffset / rowHeight) y con un rowHeight medido un frame antes
    // de que el layout terminara de asentarse (p.ej. durante la animación
    // de entrada de .library-source-panel) ese arrastre podía quedar
    // pegado en un valor que no correspondía a ningún múltiplo real de
    // fila (de ahí el -8px inicial en vez de 0). Recalculando siempre
    // desde cero, el resultado siempre es un múltiplo exacto de rowHeight:
    // 0 mientras currentRow entra en la ventana visible desde la fila 0, y
    // -(currentRow - visibleRows + 1) * rowHeight en cuanto se sale de ella.
    const topVisibleRow = currentRow < visibleRows ? 0 : currentRow - visibleRows + 1
    const targetTranslateY = -(topVisibleRow * rowHeight)

    if (Math.round(targetTranslateY) !== Math.round(libraryTranslateYRef.current)) {
      libraryTranslateYRef.current = targetTranslateY
      grid.style.transition = 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)'
      grid.style.transform = `translateY(${targetTranslateY}px)`
    }

    // Clase que activa la sombra superior cuando el grid está scrolleado
    const panel = grid.parentElement
    if (panel) {
      if (libraryTranslateYRef.current < 0) {
        panel.classList.add('has-scrolled')
      } else {
        panel.classList.remove('has-scrolled')
      }
    }
  }, [currentLibraryItems, librarySource, libraryView, selectedGameId, selectedSteamAppId])

  const handlePrevShot = useCallback(() => {
    setDetailShotIndex((prev) =>
      detailScreenshots.length ? (prev - 1 + detailScreenshots.length) % detailScreenshots.length : 0
    )
  }, [detailScreenshots.length])

  const handleNextShot = useCallback(() => {
    setDetailShotIndex((prev) =>
      detailScreenshots.length ? (prev + 1) % detailScreenshots.length : 0
    )
  }, [detailScreenshots.length])

  // ── Detail view background style (accent color derived from hero image) ──
  const detailBgStyle: React.CSSProperties = detailGame?.heroImageUrl
    ? {
      backgroundImage: `linear-gradient(transparent 5%, rgb(12, 12, 12) 57%, rgb(12, 12, 12) 100%), url(${detailGame.heroImageUrl})`,
      backgroundSize: 'contain',
      backgroundPosition: 'top',
      backgroundRepeat: 'no-repeat',
      backgroundColor: detailAccent
    }
    : { background: 'var(--gbl-bg-primary)' }

  // ── Background style (con crossfade sin destello negro) ──
  const wallpaperBg = isWallpaperMode && selectedWallpaper
    ? (wallpaperPreviewCacheRef.current.get(selectedWallpaper.path) || wallpaperBgHiRes || selectedWallpaper.dataUrl)
    : null
  const bgStyle = wallpaperBg
    ? {
      backgroundImage: `linear-gradient(to bottom, rgba(12,12,12,0.1) 0%, rgba(12,12,12,0.18) 45%, rgba(12,12,12,0.45) 100%), url(${wallpaperBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }
    : selectedGame?.heroImageUrl
      ? {
        backgroundImage: `linear-gradient(to bottom, transparent 20%, var(--gbl-bg-primary) 56%), url(${selectedGame.heroImageUrl})`,
        backgroundSize: 'contain',
        backgroundPosition: 'top',
        backgroundRepeat: 'no-repeat'
      }
      : backgroundImage
        ? {
          backgroundImage: `linear-gradient(to bottom, rgba(12,12,12,0.55) 0%, rgba(12,12,12,0.4) 40%, rgba(12,12,12,0.7) 70%, rgba(12,12,12,0.92) 100%), url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }
        : selectedGame
          ? {
            background: `radial-gradient(ellipse at 50% 60%, ${selectedGame.color}15 0%, transparent 60%), var(--gbl-bg-primary)`
          }
          : {
            backgroundImage: `linear-gradient(to bottom, rgba(12,12,12,0.4) 0%, rgba(12,12,12,0.6) 45%, rgba(12,12,12,0.92) 100%), url(${defaultHomeBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }

  // Crossfade launcher-bg con wipe circular direccional (estilo PS5)
  const [bgCurrStyle, setBgCurrStyle] = useState<React.CSSProperties>(bgStyle)
  const [bgPrevStyle, setBgPrevStyle] = useState<React.CSSProperties | null>(null)
  const bgKeyRef = useRef<string>('')
  const wipeRafRef = useRef<number>(0)
  const bgKey = wallpaperBg ? `wall:${selectedWallpaper?.path || wallpaperBg.slice(0, 80)}` : selectedGame?.heroImageUrl ? `hero:${selectedGame.heroImageUrl}` : backgroundImage ? `custom:${backgroundImage.slice(0, 80)}` : selectedGame ? `color:${selectedGame.color}` : 'default'
  useEffect(() => {
    if (bgKeyRef.current === bgKey) {
      setBgCurrStyle(bgStyle)
      return undefined
    }
    const prev = bgCurrStyle
    const next = bgStyle

    if (isWallpaperMode) {
      // En modo selector de fondos: cambio inmediato sin delay ni espera de Image()
      bgKeyRef.current = bgKey
      setBgPrevStyle({ ...prev, zIndex: 2, transition: 'opacity 0.22s ease-out', opacity: 0 })
      setBgCurrStyle({ ...next, zIndex: 1, opacity: 1 })
      const t = window.setTimeout(() => setBgPrevStyle(null), 240)
      return (): void => window.clearTimeout(t)
    }

    const dir = wipeDirectionRef.current
    const heroUrl = selectedGame?.heroImageUrl
    const buildMask = (originX: string, p: number): string =>
      `radial-gradient(circle at ${originX} 50%, black ${p}%, transparent ${p + 100}%)`
    const doSwap = (): void => {
      const duration = 600
      const ease = (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      const startTime = performance.now()
      const originX = dir === 1 ? '0%' : '100%'
      // Prev layer ON TOP: mask shrinks to reveal new layer underneath
      setBgPrevStyle({ ...prev, zIndex: 2 })
      // New layer UNDERNEATH: hidden by prev, revealed as prev mask shrinks
      setBgCurrStyle({ ...next, zIndex: 1 })
      bgKeyRef.current = bgKey
      const animate = (now: number): void => {
        const elapsed = now - startTime
        const raw = Math.min(elapsed / duration, 1)
        const fade = ease(raw)
        // Prev layer progress: 1→0 (visible→hidden mask)
        const prevP = Math.round((1 - fade) * 250 - 100)
        const prevMask = buildMask(originX, prevP)
        setBgPrevStyle(s => s ? {
          ...s,
          WebkitMaskImage: prevMask,
          maskImage: prevMask,
        } : s)
        if (raw < 1) {
          wipeRafRef.current = requestAnimationFrame(animate)
        } else {
          setBgPrevStyle(null)
        }
      }
      cancelAnimationFrame(wipeRafRef.current)
      wipeRafRef.current = requestAnimationFrame(animate)
    }
    if (heroUrl) {
      const img = new Image()
      let done = false
      const finish = (): void => { if (!done) { done = true; doSwap() } }
      img.onload = finish
      img.onerror = finish
      img.src = heroUrl
      if (img.complete) finish()
      const fallback = window.setTimeout(finish, 800)
      return (): void => { done = true; window.clearTimeout(fallback); cancelAnimationFrame(wipeRafRef.current) }
    } else {
      doSwap()
      return undefined
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgKey])

  // Biblioteca: hero con crossfade también
  const libraryHeroUrl = librarySource === 'steam' ? steamBanner : (librarySelectedGame?.heroImageUrl ?? null)
  const [libPrevUrl, setLibPrevUrl] = useState<string | null>(null)
  const [libCurrUrl, setLibCurrUrl] = useState<string | null>(libraryHeroUrl)
  const libKeyRef = useRef<string | null>(libraryHeroUrl)
  useEffect(() => {
    if (libKeyRef.current === libraryHeroUrl) return undefined
    const prev = libCurrUrl
    const next = libraryHeroUrl
    const doSwapLib = (): void => {
      setLibPrevUrl(prev)
      setLibCurrUrl(next)
      libKeyRef.current = next
      window.setTimeout(() => setLibPrevUrl(null), 300)
    }
    if (next) {
      const img = new Image()
      let done = false
      const finish = (): void => { if (!done) { done = true; doSwapLib() } }
      img.onload = finish
      img.onerror = finish
      img.src = next
      if (img.complete) finish()
      const fb = window.setTimeout(finish, 800)
      return (): void => { done = true; window.clearTimeout(fb) }
    } else {
      doSwapLib()
      return undefined
    }
  }, [libraryHeroUrl, libCurrUrl])

  const steamDetailIsInstalled = Boolean(
    detailGame?.isSteam && detailGame.steamAppId && steamLibrary.some((game) => String(game.appid) === detailGame.steamAppId && game.installed)
  )

  return (
    <div className={`launcher ${showIdleMode ? 'idle' : ''} ${isWallpaperMode ? 'wallpaper-mode' : ''}`}>
      {/* ── Sidebar ── */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* <section className={`sidebar-bottom ${sidebarOpen ? 'open' : ''}`}>
          <button className={`sidebar-item ${sidebarIndex === 9 ? 'focused' : ''}`}
            onClick={() => { setNativeView(null); setSidebarOpen(false); }}
            style={{
              border: '1px solid black', width: "50px", height: "50px", borderRadius: "100px", padding: "15px"
            }}>

            <div className="sidebar-item-icon"><HomeIcon size={18} /></div>
          </button>

          <button className={`sidebar-item ${sidebarIndex === 10 ? 'focused' : ''}`}
            onClick={() => { openAddGameModal(); setSidebarOpen(false); }}
            style={{
              border: '1px solid black', width: "50px", height: "50px", borderRadius: "100px", padding: "15px"
            }}>
            <div className="sidebar-item-icon"><PlusIcon size={18} /></div>
          </button>
        </section> */}

        <div className="sidebar-title" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src={hashiLogo} alt="Hashi" className="app-icon" style={{ width: '64px', height: '64px' }} />
          <h1 style={{ fontWeight: 'bold' }}>
            HASHI
          </h1>
        </div>
        <button className={`sidebar-item ${sidebarIndex === 0 ? 'focused' : ''}`} onClick={() => { setNativeView(null); playHome(); setSidebarOpen(false); }}>
          <div className="sidebar-item-icon"><HomeIcon size={18} /></div> {t.home}
        </button>
        <button className={`sidebar-item ${sidebarIndex === 1 ? 'focused' : ''}`} onClick={() => { openAddGameModal(); setSidebarOpen(false); }}>
          <div className="sidebar-item-icon"><PlusIcon size={18} /></div> {t.addGame}
        </button>
        <button className={`sidebar-item ${sidebarIndex === 2 ? 'focused' : ''}`} onClick={() => { handleOpenStore(defaultStore); setSidebarOpen(false); }}>
          <div className="sidebar-item-icon"><StoreIcon size={18} /></div> {t.store}
        </button>
        <button className={`sidebar-item ${sidebarIndex === 3 ? 'focused' : ''}`} onClick={() => { handleOpenSpecs(); setSidebarOpen(false); }}>
          <div className="sidebar-item-icon"><SystemIcon size={18} /></div> {t.specs}
        </button>
        <button className={`sidebar-item ${sidebarIndex === 4 ? 'focused' : ''}`} onClick={() => { setShowDownloadsModal(true); setSidebarOpen(false); }}>
          <div className="sidebar-item-icon"><DownloadIcon size={18} /></div> {t.downloads}
        </button>
        <button className={`sidebar-item ${sidebarIndex === 5 ? 'focused' : ''}`} onClick={() => { setModal('extensions'); setSidebarOpen(false); }}>
          <div className="sidebar-item-icon"><ExtensionIcon size={18} /></div> {t.extensions}
        </button>
        <button className={`sidebar-item ${sidebarIndex === 6 ? 'focused' : ''}`} onClick={() => { setModal('settings'); setSidebarOpen(false); }}>
          <div className="sidebar-item-icon"><SettingsIcon size={18} /></div> {t.settings}
        </button>
        <div style={{ marginTop: 'auto' }}>
          <button className={`sidebar-item ${sidebarIndex === 7 ? 'focused' : ''}`} onClick={() => window.api.quitApp()}>
            <div className="sidebar-item-icon"><PowerIcon size={18} /></div> {t.exit}
          </button>
        </div>
      </div>

      {/* Fondo con wipe direccional: prev se desvanece mientras la nueva hero se revela con radial-gradient */}
      <div className="launcher-bg-wrapper">
        {bgPrevStyle && (
          <div key="bg-prev" className="launcher-bg" style={bgPrevStyle} aria-hidden />
        )}
        <div key="bg-curr" className="launcher-bg" style={bgCurrStyle} />
      </div>


      {/* ── Header ── */}
      <header className="header-bar">
        <div className="header-left">
          <div className="user-avatar" onClick={() => { if (!sidebarOpen) { playEnter(); setSidebarOpen(true) } else { playClose(); setSidebarOpen(false) } }} style={{ cursor: 'pointer', overflow: 'hidden' }}>
            <img
              src={profileAvatar || appDefaultIcon}
              alt="Foto de perfil"
              className="user-avatar-img"
              draggable={false}
            />
          </div>
          <div className="header-greeting">
            <span className="header-greeting-name">
              {profileName.trim() ? profileName.trim() : 'HASHI'}
            </span>
            <span className="header-greeting-sub">
              {games.length} {games.length === 1 ? t.gameSingular : t.gamePlural}
            </span>
          </div>
        </div>
        <div className="header-right">
          {steamDownloads.filter((dl) => !forgottenDownloads.has(dl.appId)).length > 0 && (() => {
            const visibleDl = steamDownloads.filter((dl) => !forgottenDownloads.has(dl.appId))[0]
            return (
              <div className="header-download-indicator" onClick={() => setShowDownloadsModal(true)} style={{ cursor: 'pointer' }}>
                <span className="header-download-name">{visibleDl.name}</span>
                <span className="header-download-percent">{visibleDl.percent.toFixed(1)}%</span>
              </div>
            )
          })()}
          <WifiIcon size={18} className="header-icon" />
          <BatteryIcon size={18} className="header-icon" />
          <span className="header-clock">{clock}</span>
        </div>
      </header>

      {nativeView === 'multimedia' && (
        <MultimediaView
          heroItem={heroItem}
          // heroSlides={heroSlides}
          activeSlide={activeSlide}
          setActiveSlide={setActiveSlide}
          continueWatching={multimediaCards}
          setNativeView={setNativeView}
          isHeroPaused={isHeroPaused}
          setIsHeroPaused={setIsHeroPaused}
          profileAvatar={profileAvatar || appDefaultIcon}
          profileName={profileName.trim() ? profileName.trim() : 'HASHI'}
          onProfileClick={() => { if (!sidebarOpen) { playEnter(); setSidebarOpen(true) } else { playClose(); setSidebarOpen(false) } }}
          focusedSection={multimediaFocus}
          continueWatchingIndex={continueWatchingIndex}
          railTitle={multimediaExtensionId === 'animeav1' ? 'AnimeAV1' : undefined}
          railSubtitle={multimediaExtensionId === 'animeav1' ? 'Últimos episodios' : undefined}
          hideFocusedCardTitle={multimediaExtensionId === 'animeav1'}
          activeSourceId={multimediaExtensionId || 'multimedia'}
          sources={multimediaSources}
          onSourceChange={(sourceId) => { setMultimediaExtensionId(sourceId); setContinueWatchingIndex(0) }}
          onEpisodeClick={(item) => setMediaDetail(item)}
        />
      )}
      {mediaDetail && <MediaDetailView item={mediaDetail} onClose={() => setMediaDetail(null)} />}

      {/* ── Hero section ── */}
      <section className="hero-section">
        {selectedGame && (
          <div className="hero-content">
            {selectedGame.logoImageUrl ? (
              <img src={selectedGame.logoImageUrl} alt={selectedGame.name} className="hero-logo" draggable={false} />
            ) : (
              <h1 className="hero-title">{selectedGame.name}</h1>
            )}
            <div className="hero-meta">
              <span>{formatPlaytime(selectedGame.playtimeMinutes)} {t.minutesPlayed}</span>
              {selectedGame.lastPlayed && (
                <>
                  <div className="hero-meta-dot" />
                  <span>
                    {t.lastTime}:{' '}
                    {new Date(selectedGame.lastPlayed).toLocaleDateString(language, {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

      </section>

      {/* ── Music Player — arriba del row de juegos, máx 400W, usa API del PC ── */}
      {(isHomeCardFocused || showIdleMode) && (
        <MusicPlayer isVisible={isHomeCardFocused && !showIdleMode} isIdle={showIdleMode} isGameRunning={isGameRunning} language={language} />
      )}

      {/* ── Wallpaper row (solo Home, tras elegir carpeta con W) — Enter/doble click fija fondo Home ──
          Ventana visible de 5: 2 anteriores, la enfocada en el centro, 2 próximas. Además se
          mantienen montadas (pero invisibles, clase "hidden") las cards en distancia 3, como
          buffer: así cuando entran a la ventana de 5 lo hacen con una transición suave de
          posición/opacidad en vez de aparecer de golpe (y al salir, se desvanecen en vez de
          desmontarse instantáneamente). */}
      {isWallpaperMode && (
        <div className="wallpaper-row-container">
          <div className="wallpaper-row" ref={wallpaperRowRef}>
            {wallpaperImages.map((img, idx) => {
              const distance = idx - wallpaperIndex
              const absDistance = Math.abs(distance)
              if (absDistance > 3) return null
              const proximity = distance === 0 ? 'center' : absDistance === 1 ? 'near' : absDistance === 2 ? 'far' : 'hidden'
              return (
                <div
                  key={img.path}
                  id={`wallpaper-card-${idx}`}
                  className={`wallpaper-card ${proximity} ${idx === wallpaperIndex ? 'selected' : ''} ${isWallpaperAnimating ? 'animating' : ''}`}
                  onClick={() => changeWallpaperIndex(idx)}
                  onDoubleClick={() => handleChooseWallpaperAsHome(idx)}

                >
                  <img src={img.dataUrl} alt={img.name} className="wallpaper-card-img" draggable={false} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Game cards row ── */}
      <div className="games-row-container">
        <div className="games-row" ref={gamesRowRef}>
          {/* Library card */}
          <div
            className={`game-card library-card ${homeCardMode === 'main' && (selectedGameId === 'library' || (!selectedGameId && games.length === 0)) ? 'selected' : ''}`}
            onClick={() => {
              if (selectedGameId === 'library') openLibraryView()
              else setSelectedGameId('library');
            }}
            onDoubleClick={openLibraryView}
            id="btn-library"

          >
            <div className="library-card-content">
              <div className="library-card-icon-wrapper">
                <svg width="64px" height="64px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fillRule="evenodd" clipRule="evenodd" d="M12 3.1875L21.4501 10.275L21.0001 11.625H20.25V20.25H3.75005V11.625H3.00005L2.55005 10.275L12 3.1875ZM5.25005 10.125V18.75H18.75V10.125L12 5.0625L5.25005 10.125Z" fill="#ffffff" ></path> </g></svg>
              </div>
            </div>
          </div>

          {visibleGames.map((game) => (
            <div
              key={game.id}
              className={`game-card ${homeCardMode === 'main' && selectedGameId === game.id ? 'selected' : ''}`}
              onClick={() => openDetailView(game.id)}
              onDoubleClick={() => handleLaunchGame(game.id)}
              onContextMenu={(e) => handleContextMenu(e, game.id)}

              id={`game-card-${game.id}`}
            >
              {runningGameId === game.id && <div className="running-badge" />}
              {game.squareGridImageUrl || game.gridImageUrl ? (
                <img
                  src={game.squareGridImageUrl || game.gridImageUrl!}
                  alt={game.name}
                  className="game-card-cover"
                  draggable={false}
                  onError={(e) => {
                    const target = e.currentTarget
                    if (game.steamAppId && !target.dataset.fallback) {
                      target.dataset.fallback = 'true'
                      target.src = steamLibraryArtUrl(game.steamAppId)
                    }
                  }}
                />
              ) : game.iconDataUrl ? (
                <img
                  src={game.iconDataUrl}
                  alt={game.name}
                  className="game-card-icon"
                  draggable={false}
                />
              ) : (
                <div
                  className="game-card-placeholder"
                  style={{ background: `linear-gradient(135deg, ${game.color}30, ${game.color}15)` }}
                >
                  {game.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="bottom-row">
        <div
          className={`dashboard-container bottom-card ${homeCardMode === 'bottom' && bottomCardIndex === 0 ? 'selected' : ''}`}
          onClick={() => {
            setHomeCardMode('bottom')
            setBottomCardIndex(0)
            openLibraryView()
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            openLibraryView()
          }}
          style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
        >
          <div className="dashboard">
            {/* Tarjeta 1: Mis juegos y aplicaciones */}
            <div className="tile apps-tile" style={{ '--layer': 4 } as React.CSSProperties}>
              <div className="library-icon">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>

            {/* Tarjetas 2, 3, 4: Portadas de los 3 últimos juegos añadidos */}
            {last3AddedGames.map((item, index) => {
              const layer = 3 - index
              return (
                <div
                  key={`featured-${item.id || index}`}
                  className="tile game-tile"
                  style={{
                    backgroundImage: item.coverUrl ? `url("${item.coverUrl}")` : undefined,
                    '--layer': layer
                  } as React.CSSProperties}
                >
                  <div className="game-overlay"></div>
                </div>
              )
            })}
          </div>

          {/* Texto superpuesto al frente de todo */}
          <div className="floating-title">My games & apps</div>
        </div>
        <div
          className={`bottom-card store-card ${homeCardMode === 'bottom' && bottomCardIndex === 1 ? 'selected' : ''}`}
          id="btn-store"
          onMouseEnter={() => setStoreHover(true)}
          onMouseLeave={() => setStoreHover(false)}
        >
          <div className="store-carousel">
            {stores.map((store, index) => {
              const active = index === currentStoreIndex
              const capsuleImg = storeCapsuleImage(store.id)
              const logoImg = storeLogoImage(store.id)
              return (
                <div
                  key={store.id}
                  className={`store-capsule ${active ? 'active' : ''} ${store.installed ? '' : 'not-installed'}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (active) {
                      handleOpenStore(store.id)
                    } else {
                      handleStoreSelect(index)
                    }
                  }}

                >
                  {capsuleImg && (
                    <img
                      src={capsuleImg}
                      alt={store.name}
                      className="store-capsule-bg"
                      draggable={false}
                    />
                  )}
                  <div className="store-capsule-overlay" />
                  {logoImg ? (
                    <img src={logoImg} alt={store.name} className="store-capsule-logo" draggable={false} />
                  ) : (
                    <div className="store-capsule-icon">
                      <StoreIcon size={20} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="store-dots">
            {stores.map((store, index) => (
              <button
                key={store.id}
                className={`store-dot ${index === currentStoreIndex ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  handleStoreSelect(index)
                }}
                aria-label={store.name}
              />
            ))}
          </div>
        </div>

        <div className="box-cards">


          <div className={`bottom-card-square ${homeCardMode === 'bottom' && bottomCardIndex === 2 ? 'selected' : ''}`} onClick={() => { setHomeCardMode('bottom'); setBottomCardIndex(2); setModal('settings') }} id="btn-settings">
            <SettingsIcon size={70} className="bottom-card-icon" />
          </div>

          <div className={`bottom-card-square carp ${homeCardMode === 'bottom' && bottomCardIndex === 3 ? 'selected' : ''}`}>
            {Array.from({ length: 4 }).map((_, index) => {
              const app = quickApps[index]

              if (!app) {
                const isQuickAppFocused = homeCardMode === 'quick-apps' && quickAppFocusIndex === index
                return (
                  <button
                    key={`quick-app-add-${index}`}
                    type="button"
                    className={`quick-app-card quick-app-add-card ${isQuickAppFocused ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setHomeCardMode('quick-apps')
                      setQuickAppFocusIndex(index)
                      void handleAddQuickApp()
                    }}
                    aria-label="Agregar app rápida"
                  >
                    <PlusIcon size={28} />
                  </button>
                )
              }

              const isQuickAppFocused = homeCardMode === 'quick-apps' && quickAppFocusIndex === index

              return (
                <div
                  key={app.id}
                  className={`quick-app-card ${isQuickAppFocused ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setHomeCardMode('quick-apps')
                    setQuickAppFocusIndex(index)
                    void handleLaunchQuickApp(app)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleContextMenu(e, `quick-${app.id}`)
                  }}
                >
                  {app.artworkUrl ? (
                    <img src={app.artworkUrl} alt={app.name} draggable={false} />
                  ) : (
                    <div className="quick-app-fallback">{app.name.charAt(0).toUpperCase()}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className={`bottom-card friends-exit-card ${homeCardMode === 'bottom' && bottomCardIndex === 4 ? 'selected' : ''} ${windowSize.width === 1380 && windowSize.height === 830 ? 'minimal' : ''}`} id="btn-exit">
          <div className="friends-card-left">
            <div className="friends-ring-wrap">
              <svg width="110" height="110" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="10" />
                {isControllerConnected && (
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="rgba(255,255,255,0.92)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - 0.79)}`}
                    transform="rotate(-90 60 60)"
                    style={{ opacity: 0.95 }}
                  />
                )}
              </svg>
              <div className="friends-ring-center">
                <img src={controllerImg} alt="controller" className="friends-ring-img" draggable={false} />
                <span className="friends-ring-pct">79%</span>
              </div>
            </div>
          </div>
          <div className="friends-card-divider" />
          <div className="friends-card-right">
            {/* <div className="friends-header">
              <SteamIcon size={14} className="friends-steam-icon" />
              <span>friends</span>
            </div> */}
            <div className="friends-avatars">
              {friendsAvatarSlots.map((friend, index) => (
                <div
                  key={friend ? friend.steamid : `friend-slot-${index}`}
                  className={`friend-avatar ${friend ? '' : 'empty'} ${friend && isFriendActive(friend) ? 'active' : ''}`}
                  style={{ zIndex: 5 - index }}
                  onClick={friend ? () => { playEnter(); setSelectedFriend(friend) } : undefined}
                  onKeyDown={friend ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      playEnter()
                      setSelectedFriend(friend)
                    }
                  } : undefined}
                  role={friend ? 'button' : undefined}
                  tabIndex={friend ? 0 : undefined}
                >
                  {friend ? (
                    <>
                      <img
                        src={friend.avatarfull || friend.avatar || ''}
                        alt={friend.personaname}
                        className="friend-avatar-image"
                        draggable={false}
                      />
                      {isFriendActive(friend) && <span className="friend-avatar-status" aria-label="Activo" />}
                    </>
                  ) : (
                    <span className="friend-avatar-empty" />
                  )}
                </div>
              ))}
            </div>
            <div className="friends-actions-grid">
              {windowSize.width < 1600 ? (
                <>
                  <div className="friends-row compact">
                    <button
                      className="friends-btn fecha-btn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {friendsMusicTitle}
                    </button>
                  </div>
                  <div className="friends-row compact">
                    <button
                      className="friends-btn w-btn"
                      onClick={(e) => { e.stopPropagation(); handleWallpaperButton() }}
                      id="btn-wallpaper"
                    >
                      <ImageIcon size={16} />
                    </button>
                    <button className="friends-btn salir-btn" onClick={() => window.api.quitApp()}>
                      Salir
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="friends-row">
                    <button
                      className="friends-btn fecha-btn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {friendsMusicTitle}
                    </button>
                    <button
                      className="friends-btn w-btn"
                      onClick={(e) => { e.stopPropagation(); handleWallpaperButton() }}
                      id="btn-wallpaper"
                    >
                      <ImageIcon size={16} />
                    </button>
                  </div>
                  <div className="friends-row">
                    <button className="friends-btn es-btn" onClick={(e) => { e.stopPropagation(); handleLanguageToggle() }}>
                      {language === 'es' ? 'ES' : 'EN'}
                    </button>
                    <button className="friends-btn salir-btn" onClick={() => window.api.quitApp()}>
                      {t.exit}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedFriend && (
        <div className="friend-panel-layer" role="presentation">
          <button
            className="friend-panel-backdrop"
            aria-label="Cerrar panel de amigo"
            onClick={() => setSelectedFriend(null)}
          />
          <aside className="friend-panel" aria-label={`Perfil de ${selectedFriend.personaname}`}>
            <button className="friend-panel-close" onClick={() => setSelectedFriend(null)}>
              <CloseIcon size={18} />
            </button>
            <div className="friend-panel-cover">
              <img
                src={selectedFriendBackground || selectedFriend.avatarfull || selectedFriend.avatar || ''}
                alt={selectedFriend.personaname}
                className="friend-panel-cover-image"
                draggable={false}
              />
            </div>
            <div className="friend-panel-identity">
              <div className="friend-panel-avatar-wrap">
                <img
                  src={selectedFriend.avatarfull || selectedFriend.avatar || ''}
                  alt=""
                  className="friend-panel-avatar"
                  draggable={false}
                />
                <span className={`friend-panel-status ${isFriendActive(selectedFriend) ? 'active' : ''}`} />
              </div>
              <div className="friend-panel-identity-text">
                <h2>{selectedFriend.personaname}</h2>
                <p className={`friend-panel-presence ${isFriendActive(selectedFriend) ? 'active' : ''}`}>
                  {isFriendActive(selectedFriend) ? t.connected : t.disconnected}
                </p>
              </div>
            </div>
            <p className={`friend-panel-activity ${selectedFriend.gameextrainfo ? 'playing' : ''}`}>
              {selectedFriend.gameextrainfo
                ? `${t.activeGame} ${selectedFriend.gameextrainfo}`
                : isFriendActive(selectedFriend)
                  ? t.activeNoGame
                  : t.offlineDesc}
            </p>
            <button
              className="friend-panel-action"
              onClick={async () => {
                playEnter()
                const profileUrl = selectedFriend.profileurl || `https://steamcommunity.com/profiles/${selectedFriend.steamid}`
                const result = await window.api.openExternal(`steam://url/SteamIDPage/${selectedFriend.steamid}`)
                if (!result.success) {
                  const steamUrlResult = await window.api.openExternal(`steam://openurl/${profileUrl}`)
                  if (!steamUrlResult.success) await window.api.openExternal(profileUrl)
                }
              }}
            >
              {t.viewProfile}
            </button>
            {otherFriends.length > 0 && (
              <div className="friend-panel-list">
                <h3>{t.otherFriends}</h3>
                {otherFriends.map((friend) => (
                  <button
                    key={friend.steamid}
                    className="friend-panel-friend-card"
                    onClick={() => {
                      playEnter()
                      setSelectedFriend(friend)
                    }}
                  >
                    <img
                      src={friend.avatarfull || friend.avatar || ''}
                      alt=""
                      className="friend-panel-friend-avatar"
                      draggable={false}
                    />
                    <span className="friend-panel-friend-info">
                      <strong>{friend.personaname}</strong>
                      <small className={isFriendActive(friend) ? 'active' : ''}>
                        {friend.gameextrainfo || (isFriendActive(friend) ? t.active : t.disconnected)}
                      </small>
                    </span>
                    <span className={`friend-panel-friend-dot ${isFriendActive(friend) ? 'active' : ''}`} />
                  </button>
                ))}
              </div>
            )}
            {selectedFriend.gameid && (
              <button
                className="friend-panel-action primary"
                onClick={async () => {
                  playEnter()
                  await window.api.openExternal(`steam://rungameid/${selectedFriend.gameid}`)
                }}
              >
                {t.joinGame}
              </button>
            )}
          </aside>
        </div>
      )}

      {/* ── Context Menu ── */}
      {contextMenu.visible && contextMenu.gameId && (() => {
        const isSteam = contextMenu.gameId!.startsWith('steam-')
        const isQuickApp = contextMenu.gameId!.startsWith('quick-') && !games.some((g) => g.id === contextMenu.gameId)
        const steamAppId = isSteam ? contextMenu.gameId!.replace(/^steam-/, '') : null
        const steamGame = isSteam ? steamLibrary.find((g) => String(g.appid) === String(steamAppId)) : null
        const steamInstalled = steamGame ? Boolean(steamGame.installed) : false
        const quickAppId = contextMenu.gameId!.startsWith('quick-') ? contextMenu.gameId!.replace(/^quick-/, '') : null
        const quickAppTarget = quickAppId ? quickApps.find((a) => a.id === quickAppId) : null
        return (
          <div
            className="context-menu-backdrop"
            onClick={() => setContextMenu((p) => ({ ...p, visible: false }))}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu((p) => ({ ...p, visible: false }))
            }}
          >
            <div
              className="context-menu"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="context-menu-item"
                onClick={() => {
                  const id = contextMenu.gameId!
                  setContextMenu((p) => ({ ...p, visible: false }))
                  if (quickAppTarget) {
                    void handleLaunchQuickApp(quickAppTarget)
                    return
                  }
                  // Actualiza selección visual según tipo
                  if (isSteam && steamAppId) setSelectedSteamAppId(String(steamAppId))
                  else setSelectedGameId(id)
                  handleLaunchGame(id)
                }}
              >
                <PlayIcon size={16} />{' '}
                {isSteam && !steamInstalled
                  ? t.btnDownload
                  : quickAppTarget?.kind === 'program'
                    ? t.BtnEnter
                    : t.btnPlay}
              </button>
              {!isQuickApp && !quickAppTarget && (
                <button
                  className="context-menu-item"
                  onClick={() => {
                    if (contextMenu.gameId) openEditGameModal(contextMenu.gameId)
                    setContextMenu((p) => ({ ...p, visible: false }))
                  }}
                >
                  <EditIcon size={16} /> {t.BtnEdit}
                </button>
              )}
              {quickAppTarget && (
                <button
                  className="context-menu-item"
                  onClick={() => {
                    if (quickAppId) void handleEditQuickApp(quickAppId)
                    setContextMenu((p) => ({ ...p, visible: false }))
                  }}
                >
                  <EditIcon size={16} /> Cambiar archivo
                </button>
              )}
              <button
                className="context-menu-item"
                onClick={() => {
                  if (contextMenu.gameId) openSteamGridModal(contextMenu.gameId)
                  setContextMenu((p) => ({ ...p, visible: false }))
                }}
              >
                <ImageIcon size={16} /> {t.btnSearchArtwork}
              </button>
              <div className="context-menu-separator" />
              <button
                className="context-menu-item danger"
                onClick={() => {
                  if (quickAppId && quickAppTarget) {
                    saveQuickApps(quickApps.filter((a) => a.id !== quickAppId))
                  } else if (contextMenu.gameId) {
                    handleDeleteGame(contextMenu.gameId)
                  }
                  setContextMenu((p) => ({ ...p, visible: false }))
                }}
              >
                <TrashIcon size={16} /> {t.cmDelete}
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── Detail View ── */}
      {detailGame && (
        <div className="detail-view">
          <div
            key={detailGame.heroImageUrl || detailGame.id}
            className="detail-bg fade-in-bg"
            style={detailBgStyle}
          />
          <button className={`detail-back-button detail-focusable${detailFocus === 'back' ? ' detail-focused' : ''}`} onClick={handleCloseDetail}>
            <ChevronLeftIcon size={18} /> {t.btnBack}
          </button>

          <div className="detail-hero-section">
            <div className="detail-hero-top">
              <div className="detail-hero-content">
                {detailGame.logoImageUrl ? (
                  <img
                    src={detailGame.logoImageUrl}
                    alt={detailGame.name}
                    className="hero-logo"
                    draggable={false}
                  />
                ) : (
                  <h1 className="hero-title">{detailGame.name}</h1>
                )}
              </div>

              {detailGame && (detailGame as any).steamAppId && (
                <div
                  className={`detail-achievements-card detail-focusable${detailFocus === 'achievements' ? ' detail-focused' : ''}`}
                  onClick={() => { setAchievementListIndex(0); setAchievementsView(true) }}
                >
                  <div className="detail-achievements-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                      <path d="M4 22h16" />
                      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
                      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                    </svg>
                  </div>
                  <div className="detail-achievements-info">
                    <span className="detail-achievements-count">
                      {detailAchievements.filter((a) => a.achieved).length}/{detailAchievements.length || '…'}
                    </span>
                    <span className="detail-achievements-label">{t.achievements}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="detail-actions-row">

              <span className="detail-playtime">
                {formatPlaytime(detailGame.playtimeMinutes)} {t.minutesPlayed}
                {detailGame.lastPlayed && (
                  <>
                    {' '}
                    · {t.lastTime}:{' '}
                    {new Date(detailGame.lastPlayed).toLocaleDateString(language, {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="detail-info-row">
            {/* Screenshot carousel */}
            <div className="detail-carousel">
              {detailLoadingShots && (
                <div className="shimmer shimmer-carousel" />
              )}
              {!detailLoadingShots && detailScreenshots.length === 0 && (
                <div className="detail-carousel-status">
                  {t.noScreenshotsFound}
                </div>
              )}
              {!detailLoadingShots && detailScreenshots.length > 0 && (
                <>
                  <img
                    key={detailShotIndex}
                    src={detailScreenshots[detailShotIndex].path_full}
                    alt={tInterp(t.screenshotAlt, { current: detailShotIndex + 1, gameName: detailGame.name })}
                    className="detail-carousel-image"
                    draggable={false}
                  />
                  {detailScreenshots.length > 1 && (
                    <>
                      <button
                        className={`detail-carousel-nav prev detail-focusable${detailFocus === 'shotPrev' ? ' detail-focused' : ''}`}
                        onClick={handlePrevShot}
                        aria-label={t.prevScreenshot}
                      >
                        <ChevronLeftIcon size={20} />
                      </button>
                      <button
                        className={`detail-carousel-nav next detail-focusable${detailFocus === 'shotNext' ? ' detail-focused' : ''}`}
                        onClick={handleNextShot}
                        aria-label={t.nextScreenshot}
                      >
                        <ChevronRightIcon size={20} />
                      </button>
                      <div className="detail-carousel-dots">
                        {detailScreenshots.map((_, i) => (
                          <button
                            key={i}
                            className={`detail-carousel-dot ${i === detailShotIndex ? 'active' : ''}`}
                            onClick={() => setDetailShotIndex(i)}
                            aria-label={tInterp(t.screenshotNumber, { number: i + 1 })}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Description, then a real-style Metacritic + rating card below it */}
            <div className="detail-side-panel">
              <div className="detail-description">
                <h3 className="detail-section-title">{t.aboutTheGame}</h3>
                {detailInfoLoading && (
                  <div className="detail-description-text" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="shimmer shimmer-text" />
                    <div className="shimmer shimmer-text" />
                    <div className="shimmer shimmer-text short" />
                  </div>
                )}
                {!detailInfoLoading && detailInfo?.description && (
                  <p className="detail-description-text">{detailInfo.description}</p>
                )}
                {!detailInfoLoading && !detailInfo?.description && (
                  <p className="detail-description-text muted">{t.noDescriptionAvailable}</p>
                )}
              </div>

              {!smallDetailLayout && <div className="detail-meta-section2" style={{ maxWidth: '400px' }}>
                {detailInfo?.metacritic && (
                  <a
                    className="metacritic-widget"
                    href={detailInfo.metacritic.url || undefined}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      if (!detailInfo.metacritic?.url) e.preventDefault()
                    }}
                  >
                    {/* <span
                      className={`metacritic-widget-score ${detailInfo.metacritic.score >= 75
                        ? 'good'
                        : detailInfo.metacritic.score >= 50
                          ? 'mixed'
                          : 'bad'
                        }`}
                    >
                      {detailInfo.metacritic.score}
                    </span> */}
                    {/* <div className="metacritic-widget-body">
                      <div className="metacritic-widget-brand">
                        <img src="https://store.fastly.steamstatic.com/public/images/v6/mc_logo_no_text.png" alt="" />
                        <span className="metacritic-widget-name">metacritic</span>
                      </div>
                      <span className="metacritic-widget-link">Leer las reseñas ↗</span>
                    </div> */}
                  </a>
                )}

                {detailInfo?.rating && (detailInfo.rating.rating || detailInfo.rating.descriptors.length > 0) && (
                  <div className="rating-widget">
                    {/* <div className="rating-widget-badge">
                      <span className="rating-widget-badge-top">
                        {formatRatingBadge(detailInfo.rating.rating, detailInfo.rating.board).top}
                      </span>
                      <span className="rating-widget-badge-letter">
                        {formatRatingBadge(detailInfo.rating.rating, detailInfo.rating.board).letter}
                      </span>
                      <span className="rating-widget-badge-board">{detailInfo.rating.board}</span>
                    </div> */}
                    <img src={getRatingImage(detailInfo.rating.rating)} alt="" style={{ width: '80px' }} />
                    <div className="rating-widget-body">
                      {detailInfo.rating.descriptors.length > 0 && (
                        <ul className="rating-widget-descriptors">
                          {detailInfo.rating.descriptors.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      )}
                      <span className="rating-widget-caption">
                        {tInterp(t.ageRatingFor, { board: detailInfo.rating.board })}
                      </span>
                    </div>
                  </div>
                )}
              </div>}
            </div>

            {/* Reviews, then release info, then tags */}
            <div className={`detail-ratings-panel ${smallDetailLayout ? 'esrb-only' : ''}`}>
              {detailInfoLoading && (
                <div className="detail-meta-section">
                  <div className="shimmer-meta-row"><div className="shimmer shimmer-meta-label" /><div className="shimmer shimmer-meta-value" /></div>
                  <div className="shimmer-meta-row"><div className="shimmer shimmer-meta-label" /><div className="shimmer shimmer-meta-value" /></div>
                  <div className="shimmer-meta-row"><div className="shimmer shimmer-meta-label" /><div className="shimmer shimmer-meta-value" /></div>
                  <div className="shimmer-meta-row"><div className="shimmer shimmer-meta-label" /><div className="shimmer shimmer-meta-value" /></div>
                  <div className="shimmer-tags-row" style={{ marginTop: '12px' }}>
                    <div className="shimmer shimmer-tag" />
                    <div className="shimmer shimmer-tag" />
                    <div className="shimmer shimmer-tag" />
                    <div className="shimmer shimmer-tag" />
                    <div className="shimmer shimmer-tag" />
                  </div>
                </div>
              )}
              {!detailInfoLoading && smallDetailLayout ? (
                detailInfo?.rating && (detailInfo.rating.rating || detailInfo.rating.descriptors.length > 0) && (
                  <div className="rating-widget">
                    <img src={getRatingImage(detailInfo.rating.rating)} alt="" style={{ width: '80px' }} />
                    <div className="rating-widget-body">
                      {detailInfo.rating.descriptors.length > 0 && (
                        <ul className="rating-widget-descriptors">
                          {detailInfo.rating.descriptors.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      )}
                      <span className="rating-widget-caption">
                        {tInterp(t.ageRatingFor, { board: detailInfo.rating.board })}
                      </span>
                    </div>
                  </div>
                )
              ) : compactDetailReviewLayout ? (
                <>
                  {(detailInfo?.reviewsPositive || detailInfo?.reviewsNegative) && (
                    <div className="detail-meta-section">
                      {detailInfo?.reviewsPositive && (
                        <div className="detail-meta-row">
                          <span className="detail-meta-label">{t.positiveReviews}</span>
                          <span className="detail-meta-value link">
                            {detailInfo.reviewsPositive.summary} ({detailInfo.reviewsPositive.count})
                          </span>
                        </div>
                      )}
                      {detailInfo?.reviewsNegative && (
                        <div className="detail-meta-row">
                          <span className="detail-meta-label">{t.negativeReviews}</span>
                          <span className="detail-meta-value link">
                            {detailInfo.reviewsNegative.summary} ({detailInfo.reviewsNegative.count})
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {detailInfo?.developer && (
                    <div className="detail-meta-section">
                      <div className="detail-meta-row">
                        <span className="detail-meta-label">Desarrollador</span>
                        <span className="detail-meta-value link">{detailInfo.developer}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {(detailInfo?.reviewsRecent || detailInfo?.reviewsAll) && (
                    <div className="detail-meta-section">
                      {detailInfo?.reviewsRecent && (
                        <div className="detail-meta-row">
                          <span className="detail-meta-label">{t.recentReviews}</span>
                          <span className="detail-meta-value link">
                            {detailInfo.reviewsRecent.summary} ({detailInfo.reviewsRecent.count})
                          </span>
                        </div>
                      )}
                      {detailInfo?.reviewsAll && (
                        <div className="detail-meta-row">
                          <span className="detail-meta-label">{t.allReviews}</span>
                          <span className="detail-meta-value link">
                            {detailInfo.reviewsAll.summary} ({detailInfo.reviewsAll.count})
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {(detailInfo?.developer || detailInfo?.publisher || detailInfo?.releaseDate) && (
                    <div className="detail-meta-section">
                      {detailInfo?.releaseDate && (
                        <div className="detail-meta-row">
                          <span className="detail-meta-label">{t.releaseDate}</span>
                          <span className="detail-meta-value">{detailInfo.releaseDate}</span>
                        </div>
                      )}
                      {detailInfo?.developer && (
                        <div className="detail-meta-row">
                          <span className="detail-meta-label">{t.developer}</span>
                          <span className="detail-meta-value link">{detailInfo.developer}</span>
                        </div>
                      )}
                      {detailInfo?.publisher && (
                        <div className="detail-meta-row">
                          <span className="detail-meta-label">{t.publisher}</span>
                          <span className="detail-meta-value link">{detailInfo.publisher}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {detailInfo?.tags && detailInfo.tags.length > 0 && (
                    <div className="detail-meta-section">
                      <div className="detail-meta-tags-track">
                        <div className="detail-meta-tags detail-meta-tags-scroll">
                          {detailInfo.tags.map((tag) => (
                            <span key={`a-${tag}`} className="detail-tag-pill">{tag}</span>
                          ))}
                          {detailInfo.tags.map((tag) => (
                            <span key={`b-${tag}`} className="detail-tag-pill">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* BOTON DE JUGAR!!!!! */}
            <div className="detail-play-actions">
              {(() => {
                const isRunning = runningGameId === detailGame.id
                const isDownloading = downloadingGameId === detailGame.id
                const activeDownload = detailGame.steamAppId
                  ? steamDownloads.find((d) => d.appId === detailGame.steamAppId)
                  : null
                const showProgress = isDownloading && activeDownload && activeDownload.percent > 0

                return (
                  <button
                    className={`btn-play btn-play-detail detail-focusable${detailFocus === 'play' ? ' detail-focused' : ''} ${isRunning ? 'running' : ''} ${isDownloading ? 'downloading' : ''}`}
                    onClick={() => handleLaunchGame(detailGame.id)}
                  >
                    {isRunning ? (
                      <>
                        <PlayIcon size={20} />
                        {t.running}
                      </>
                    ) : showProgress ? (
                      <div className="btn-play-progress-content">
                        <div className="btn-play-progress-bar">
                          <div
                            className="btn-play-progress-fill"
                            style={{ width: `${activeDownload.percent}%` }}
                          />
                        </div>
                        <span className="btn-play-progress-text">{activeDownload.percent.toFixed(1)}%</span>
                      </div>
                    ) : isDownloading ? (
                      <>
                        <PlayIcon size={20} />
                        {t.downloading}
                      </>
                    ) : detailGame.isSteam && !steamDetailIsInstalled ? (
                      <>
                        <PlayIcon size={20} />
                        {t.download}
                      </>
                    ) : (
                      <>
                        <PlayIcon size={20} />
                        {t.play}
                      </>
                    )}
                  </button>
                )
              })()}
              <button
                className={`detail-edit-button detail-focusable${detailFocus === 'edit' ? ' detail-focused' : ''}`}
                onClick={() => {
                  if (detailGame.id) openEditGameModal(detailGame.id)
                  setContextMenu((p) => ({ ...p, visible: false }))
                }}
                aria-label={t.editGame}
              >
                <MoreIcon size={20} />
              </button>
            </div>

          </div>

          {/* ── Achievements List Overlay ── */}
          {achievementsView && detailGame && (
            <TrophiesView
              gameName={detailGame.name}
              coverUrl={detailGame.squareGridImageUrl || detailGame.gridImageUrl || detailGame.iconDataUrl}
              logoUrl={detailGame.logoImageUrl}
              heroUrl={detailGame.heroImageUrl}
              steamAppId={detailGame.steamAppId}
              achievements={detailAchievements}
              loading={detailInfoLoading}
              selectedIndex={achievementListIndex}
              language={language}
              onClose={() => setAchievementsView(false)}
            />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODALS
          ══════════════════════════════════════════ */}

      {/* ── Specs Modal ── */}
      {modal === 'specs' && systemInfo && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Especificaciones del Sistema</h2>
              <button className="modal-close" onClick={() => setModal(null)}>
                <CloseIcon size={20} />
              </button>
            </div>
            <div className="specs-grid">
              <div className="spec-item">
                <div className="spec-label">Sistema Operativo</div>
                <div className="spec-value">{systemInfo.platform}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Arquitectura</div>
                <div className="spec-value">{systemInfo.arch}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Procesador</div>
                <div className="spec-value">{systemInfo.cpus}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Memoria Total</div>
                <div className="spec-value">{systemInfo.totalMemory}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Memoria Libre</div>
                <div className="spec-value">{systemInfo.freeMemory}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Tiempo Activo</div>
                <div className="spec-value">{systemInfo.uptime}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick App: elegir tipo (Juego / Programa) ── */}
      {pendingQuickApp && (
        <div className="modal-overlay" onClick={() => setPendingQuickApp(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">¿Qué es "{pendingQuickApp.name}"?</h2>
              <button className="modal-close" onClick={() => setPendingQuickApp(null)}>
                <CloseIcon size={20} />
              </button>
            </div>
            {(pendingQuickApp.autoArtworkUrl || pendingQuickApp.iconDataUrl) && (
              <div className="icon-preview">
                <img src={pendingQuickApp.autoArtworkUrl || pendingQuickApp.iconDataUrl || ''} alt={pendingQuickApp.name} />
                <span className="icon-preview-text">Artwork detectado automáticamente</span>
              </div>
            )}
            <p className="settings-profile-hint" style={{ margin: '14px 0' }}>
              Los <strong>juegos</strong> aparecen en recientes/biblioteca y al seleccionarlos abren la pantalla de
              detalles. Los <strong>programas</strong> se abren directo con un clic, sin pantalla de detalles.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setPendingQuickApp(null)}>
                Cancelar
              </button>
              <button className="btn-secondary" onClick={() => finalizeQuickApp('program')}>
                Es un Programa
              </button>
              <button className="btn-primary" onClick={() => finalizeQuickApp('game')}>
                Es un Juego
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Game Modal ── */}
      {modal === 'addGame' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{t.modalAddTitle}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>
                <CloseIcon size={20} />
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">{t.labelGameName}</label>
              <input
                className="form-input"
                type="text"
                placeholder="Ej: Minecraft, GTA V..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
                id="input-game-name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t.labelExePath}</label>
              <div className="form-file-row">
                <input
                  className="form-input"
                  type="text"
                  placeholder={t.browseFile}
                  value={formExePath}
                  onChange={(e) => setFormExePath(e.target.value)}
                  id="input-game-path"
                />
                <button className="btn-browse" onClick={handleBrowse}>
                  <FolderIcon size={16} />
                </button>
              </div>
            </div>
            {formIconUrl && (
              <div className="icon-preview">
                <img src={formIconUrl} alt="Icono del juego" />
                <span className="icon-preview-text">Icono extraído automáticamente</span>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(null)}>
                {t.btnCancel}
              </button>
              <button
                className="btn-primary"
                onClick={handleAddGame}
                disabled={!formName.trim()}
                id="btn-save-game"
              >
                {t.btnSave}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Game Modal ── */}
      {modal === 'editGame' && (() => {
        const isSteamEdit = editingGameId?.startsWith('steam-')
        const currentTargetGame = games.find((g) => g.id === editingGameId) || (
          isSteamEdit ? steamLibrary.find((g) => `steam-${g.appid}` === editingGameId) : null
        )
        const gameCoverBg = (currentTargetGame as any)?.heroImageUrl || (currentTargetGame as any)?.gridImageUrl || null

        return (
          <div className="modal-overlay settings-modal-overlay" onClick={() => setModal(null)}>
            <div className="settings-modal edit-game-settings-modal" onClick={(e) => e.stopPropagation()}>
              {/* Left Sidebar */}
              <aside className="settings-sidebar">
                <div className="settings-sidebar-header">
                  <div
                    className="settings-sidebar-header-bg"
                    style={gameCoverBg ? { backgroundImage: `url(${gameCoverBg})` } : undefined}
                  />
                  <div className="settings-sidebar-header-overlay" />
                  <h2 className="settings-sidebar-title">{t.settings}</h2>
                </div>

                <nav className="settings-sidebar-nav">
                  <button
                    type="button"
                    className={`settings-nav-item ${editGameTab === 'inicio' ? 'active' : ''}`}
                    onClick={() => setEditGameTab('inicio')}
                  >
                    <span>{t.tabHome}</span>
                  </button>
                  <button
                    type="button"
                    className={`settings-nav-item ${editGameTab === 'personalizacion' ? 'active' : ''}`}
                    onClick={() => setEditGameTab('personalizacion')}
                  >
                    <span>{t.tabCustomization}</span>
                  </button>
                  <button
                    type="button"
                    className={`settings-nav-item ${editGameTab === 'detalles' ? 'active' : ''}`}
                    onClick={() => setEditGameTab('detalles')}
                  >
                    <span>{t.tabInstallation}</span>
                  </button>
                  <button
                    type="button"
                    className={`settings-nav-item danger-tab ${editGameTab === 'eliminar' ? 'active' : ''}`}
                    onClick={() => setEditGameTab('eliminar')}
                  >
                    <span>{t.modalTabDanger}</span>
                  </button>
                </nav>
              </aside>

              {/* Right Content Area */}
              <main className="settings-content-area edit-game-content-area">

                {/* Tab: Inicio */}
                {editGameTab === 'inicio' && (
                  <div className="settings-tab-panel">
                    <div className="edit-game-field-block">
                      <label className="edit-game-field-title">{t.labelGameName}</label>
                      <input
                        className="form-input edit-game-input"
                        type="text"
                        placeholder={t.labelGameName}
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        readOnly={isSteamEdit}
                      />
                    </div>

                    <div className="edit-game-field-block">
                      <label className="edit-game-field-title">{t.exeLabel}</label>
                      <span className="edit-game-field-subtitle">{t.exeDesc}"</span>
                      <div className="edit-game-input-row">
                        <input
                          className="form-input edit-game-input"
                          style={{ flex: 1 }}
                          type="text"
                          placeholder="Ruta al .exe o acceso directo"
                          value={formExePath}
                          onChange={(e) => setFormExePath(e.target.value)}
                          readOnly={isSteamEdit}
                        />
                        {!isSteamEdit && (
                          <button
                            type="button"
                            className="btn-browse-action"
                            onClick={handleBrowse}
                            title="Examinar archivo"
                          >
                            <FolderIcon size={16} />
                          </button>
                        )}
                        {formExePath && !isSteamEdit && (
                          <button
                            type="button"
                            className="btn-clear-action"
                            onClick={() => setFormExePath('')}
                            title="Borrar ruta"
                          >
                            <TrashIcon size={14} /> {t.deletePath}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="edit-game-field-block">
                      <label className="edit-game-field-title">{t.shortcutsSubTitle}</label>
                      <span className="edit-game-field-subtitle">{t.shortcutsSubTitleDesc}</span>
                      <div className="edit-game-shortcuts-row">
                        <button
                          type="button"
                          className="edit-game-shortcut-btn"
                          onClick={() => { }}
                        >
                          <DesktopIcon size={16} /> {t.cmDesktopShortcut}
                        </button>
                        <button
                          type="button"
                          className="edit-game-shortcut-btn"
                          onClick={() => {
                            if (isSteamEdit && currentTargetGame) {
                              window.api?.openExternal?.(`steam://rungameid/${(currentTargetGame as any).appid || (currentTargetGame as any).steamAppId}`)
                            }
                          }}
                        >
                          <StoreIcon size={16} /> {t.createSteamShortcut}
                        </button>
                        <button
                          type="button"
                          className="edit-game-shortcut-btn"
                          onClick={() => { }}
                        >
                          {t.createHomeMenu}
                        </button>
                      </div>
                    </div>

                    <div className="edit-game-field-block">
                      <label className="edit-game-field-title">{t.optionsToStart}</label>
                      <span className="edit-game-field-subtitle">{t.advancedOptions}</span>
                      <div className="edit-game-input-row">
                        <input
                          className="form-input edit-game-input"
                          style={{ flex: 1 }}
                          type="text"
                          placeholder={t.advencePlaceholder}
                          value={formLaunchArgs}
                          onChange={(e) => setFormLaunchArgs(e.target.value)}
                        />
                        {formLaunchArgs && (
                          <button
                            type="button"
                            className="btn-clear-action"
                            onClick={() => setFormLaunchArgs('')}
                            title={t.deleteArgs}
                          >
                            <TrashIcon size={14} /> {t.deleteArgs}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Personalización */}
                {editGameTab === 'personalizacion' && (
                  <div className="settings-tab-panel">
                    <div className="edit-game-field-block">
                      <label className="edit-game-field-title">{t.personalizationArtwork}</label>
                      <span className="edit-game-field-subtitle">{t.artworkPersonalizationSub}</span>
                      <div style={{ marginTop: '10px', marginBottom: '14px' }}>
                        <button
                          type="button"
                          className="btn-primary edit-game-sgdb-btn"
                          onClick={() => {
                            if (editingGameId) openSteamGridModal(editingGameId)
                          }}
                          style={{ background: "#111114", border: "solid 1px #3a3a3a3f" }}
                        >
                          <ImageIcon size={18} /> {t.searchSteamGridDB}
                        </button>
                      </div>
                    </div>

                    <div className="edit-artwork-preview-grid">
                      <div className="edit-artwork-card" onClick={() => editingGameId && openSteamGridModal(editingGameId)}>
                        <span className="edit-artwork-label">{t.grid11}</span>
                        <div className="edit-artwork-img-box grid-square">
                          {(currentTargetGame as any)?.squareGridImageUrl ? (
                            <img src={(currentTargetGame as any).squareGridImageUrl} alt="Grid 1:1" draggable={false} />
                          ) : (
                            <div className="edit-artwork-empty">{t.noGrid11}</div>
                          )}
                        </div>
                        <button type="button" className="btn-secondary edit-artwork-btn">
                          <EditIcon size={14} /> {t.changeGrid11}
                        </button>
                      </div>

                      <div className="edit-artwork-card" onClick={() => editingGameId && openSteamGridModal(editingGameId)}>
                        <span className="edit-artwork-label">{t.cover} (card "My games & apps")</span>
                        <div className="edit-artwork-img-box grid">
                          {(currentTargetGame as any)?.gridImageUrl ? (
                            <img src={(currentTargetGame as any).gridImageUrl} alt="Grid" draggable={false} />
                          ) : (
                            <div className="edit-artwork-empty">{t.noCover}</div>
                          )}
                        </div>
                        <button type="button" className="btn-secondary edit-artwork-btn">
                          <EditIcon size={14} /> {t.changeCover}
                        </button>
                      </div>

                      <div className="edit-artwork-card" onClick={() => editingGameId && openSteamGridModal(editingGameId)}>
                        <span className="edit-artwork-label">Banner (Hero 1920x620)</span>
                        <div className="edit-artwork-img-box hero">
                          {(currentTargetGame as any)?.heroImageUrl ? (
                            <img src={(currentTargetGame as any).heroImageUrl} alt="Hero" draggable={false} />
                          ) : (
                            <div className="edit-artwork-empty">{t.noBanner}</div>
                          )}
                        </div>
                        <button type="button" className="btn-secondary edit-artwork-btn">
                          <EditIcon size={14} /> {t.changeBanner}
                        </button>
                      </div>

                      <div className="edit-artwork-card" onClick={() => editingGameId && openSteamGridModal(editingGameId)}>
                        <span className="edit-artwork-label">logo (Transparente)</span>
                        <div className="edit-artwork-img-box logo">
                          {(currentTargetGame as any)?.logoImageUrl ? (
                            <img src={(currentTargetGame as any).logoImageUrl} alt="Logo" draggable={false} />
                          ) : (
                            <div className="edit-artwork-empty">{t.noLogo}</div>
                          )}
                        </div>
                        <button type="button" className="btn-secondary edit-artwork-btn">
                          <EditIcon size={14} /> {t.changeLogo}
                        </button>
                      </div>

                      <div className="edit-artwork-card" onClick={() => editingGameId && openSteamGridModal(editingGameId)}>
                        <span className="edit-artwork-label">{t.icon}</span>
                        <div className="edit-artwork-img-box icon">
                          {formIconUrl || (currentTargetGame as any)?.iconDataUrl ? (
                            <img src={formIconUrl || (currentTargetGame as any).iconDataUrl} alt="Icon" draggable={false} />
                          ) : (
                            <div className="edit-artwork-empty">{t.noIcon}</div>
                          )}
                        </div>
                        <button type="button" className="btn-secondary edit-artwork-btn">
                          <EditIcon size={14} /> {t.changeIcon}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Detalles */}
                {editGameTab === 'detalles' && (
                  <div className="settings-tab-panel">
                    <div className="edit-game-field-block">
                      <label className="edit-game-field-title">{t.settingsInstallationTitle}</label>
                      <span className="edit-game-field-subtitle">{t.settingsInstallationDescription}</span>
                      <div className="settings-app-stats-grid" style={{ marginTop: '16px' }}>
                        <div className="settings-stat-box">
                          <span className="settings-stat-label">{t.tipeDefaultInstallation}</span>
                          <span className="settings-stat-val">{isSteamEdit ? 'Steam' : 'Local / Manual'}</span>
                        </div>
                        <div className="settings-stat-box">
                          <span className="settings-stat-label">{t.timePlayed}</span>
                          <span className="settings-stat-val">{formatPlaytime((currentTargetGame as any)?.playtimeMinutes || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Eliminar */}
                {editGameTab === 'eliminar' && (
                  <div className="settings-tab-panel">
                    <div className="edit-game-field-block danger-block">
                      <label className="edit-game-field-title" style={{ color: '#ff5c5c' }}>{t.deleteGame}</label>
                      <span className="edit-game-field-subtitle">
                        {t.deleteGameSubtitle1}" {formName} " {t.deleteGameSubtitle2}
                      </span>
                      <div style={{ marginTop: '20px' }}>
                        <button
                          type="button"
                          className="btn-danger"
                          style={{ padding: '10px 24px', fontSize: '14px' }}
                          onClick={() => {
                            if (editingGameId) handleDeleteGame(editingGameId)
                            setModal(null)
                            resetForm()
                          }}
                        >
                          <TrashIcon size={16} /> {t.deleteBtnLibrary}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer buttons */}
                <div className="edit-game-footer">
                  <button type="button" className="btn-secondary" style={{ background: "#111114" }} onClick={() => setModal(null)}>
                    {t.btnCancel}
                  </button>
                  {!isSteamEdit && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleEditGame}
                      disabled={!formName.trim()}
                    >
                      {t.btnSave}
                    </button>
                  )}
                </div>
              </main>
            </div>
          </div>
        )
      })()}

      {/* ── Library View ── */}
      {libraryView && (
        <section className="library-view" aria-label="Biblioteca">
          {librarySource === 'steam' && !steamAccount.linked ? (
            <div className="library-empty library-view-empty">
              Vincula tu cuenta de Steam desde Ajustes para ver tu biblioteca.
            </div>
          ) : (
            <>
              <div className="library-hero">
                {libPrevUrl && (
                  <div
                    key={`lib-prev-${libPrevUrl}`}
                    className="library-hero-bg prev"
                    style={{ backgroundImage: `linear-gradient(to top, rgba(12, 12, 12, 0.98) 0%, rgba(12, 12, 12, 0.7) 42%, rgba(12, 12, 12, 0.08) 100%), url(${libPrevUrl})` }}
                    aria-hidden
                  />
                )}
                <div
                  key={`lib-curr-${libCurrUrl ?? 'empty'}`}
                  className="library-hero-bg current"
                  style={libCurrUrl ? { backgroundImage: `linear-gradient(to top, rgba(12, 12, 12, 0.98) 0%, rgba(12, 12, 12, 0.7) 42%, rgba(12, 12, 12, 0.08) 100%), url(${libCurrUrl})` } : undefined}
                />
                <div className="library-hero-content">
                  <button className="library-back-button" onClick={() => {
                    playClose()
                    setSelectedGameId(previousHomeSelectedGameIdRef.current)
                    setLibraryView(false)
                    setLibrarySearch('')
                  }}>
                    <ChevronLeftIcon size={20} /> {t.btnBack}
                  </button>
                  <div className="library-title-row">
                    <button
                      type="button"
                      className={`library-view-platform ${librarySource === 'local' ? 'active' : 'muted'}`}
                      onClick={() => {
                        if (librarySource !== 'local') {
                          playPages()
                          setLibrarySource('local')
                        }
                      }}
                    >
                      {t.library}
                    </button>
                    <span className="library-view-divider">|</span>
                    <button
                      type="button"
                      className={`library-view-platform ${librarySource === 'steam' ? 'active' : 'muted'}`}
                      onClick={() => {
                        if (steamAccount.linked) {
                          if (librarySource !== 'steam') {
                            playPages()
                            setLibrarySource('steam')
                          }
                        } else {
                          setModal('settings')
                        }
                      }}
                    >
                      Steam
                    </button>
                  </div>
                  <p className="library-view-subtitle">
                    {librarySource === 'steam' && steamLibraryLoading
                      ? t.loadingGames
                      : `${currentLibraryCount} ${currentLibraryCount === 1 ? t.gameSingular : t.gamePlural}`}
                  </p>
                  <div className="library-actions-row">
                    <div className="library-search-bar">
                      <input
                        type="text"
                        className="library-search-input"
                        placeholder={t.searchPlaceholder}
                        value={librarySearch}
                        onChange={(e) => setLibrarySearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const filtered = librarySource === 'steam'
                              ? steamLibrary.filter((game) => !librarySearch || game.name.toLowerCase().includes(librarySearch.toLowerCase()))
                              : sortedLibraryGames.filter((game) => !librarySearch || game.name.toLowerCase().includes(librarySearch.toLowerCase()))
                            if (filtered.length > 0) {
                              const first = filtered[0]
                              if (librarySource === 'steam') {
                                setSelectedSteamAppId(String((first as SteamLibraryGame).appid))
                              } else {
                                setSelectedGameId((first as Game).id)
                              }
                            }
                            const firstArticle = libraryGridRef.current?.querySelector('.library-item') as HTMLElement | null
                            if (firstArticle) {
                              firstArticle.tabIndex = 0
                              // Sin scrollIntoView manual: la grilla ya se
                              // reposiciona sola vía transform (translateY)
                              // en el useEffect que sigue a selectedGameId /
                              // selectedSteamAppId. Llamar scrollIntoView acá
                              // además haría que el navegador mueva el
                              // scrollTop nativo del panel (aunque tenga
                              // overflow:hidden), duplicando el desplazamiento.
                              firstArticle.focus({ preventScroll: true })
                            }
                          }
                        }}
                      />
                    </div>
                    {librarySource === 'local' && (
                      <button className="btn-primary library-add-button" onClick={openAddGameModal}>
                        <PlusIcon size={16} /> {t.addGame}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div key={librarySource} className="library-source-panel">
                <div className="library-grid library-view-grid" ref={libraryGridRef}>
                  {librarySource === 'steam' ? (
                    steamLibraryLoading ? (
                      Array.from({ length: 15 }).map((_, i) => (
                        <div key={`steam-skeleton-${i}`} className="library-item-skeleton" />
                      ))
                    ) : filteredSteamLibrary.length === 0 ? (
                      <div className="library-empty library-view-empty">
                        No se encontraron juegos en tu biblioteca de Steam.
                      </div>
                    ) : (
                      filteredSteamLibrary.map((game) => (
                        <article
                          key={game.appid}
                          id={`library-game-${game.appid}`}
                          tabIndex={0}
                          className={`library-item steam-library-item ${selectedSteamAppId === game.appid ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedSteamAppId(game.appid)
                            setDetailGameId(`steam-${game.appid}`)
                          }}
                          onFocus={() => {
                            setSelectedSteamAppId(game.appid)
                          }}
                          onDoubleClick={() => handleLaunchGame(`steam-${game.appid}`)}
                          onContextMenu={(e) => handleContextMenu(e, `steam-${game.appid}`)}
                        >
                          <div className="library-item-art steam-library-art">
                            <img
                              src={game.squareGridImageUrl || game.gridImageUrl || steamLibraryArtUrl(game.appid)}
                              alt={game.name}
                              className={`library-item-cover ${game.installed ? 'installed' : 'not-installed'}`}
                              draggable={false}
                              onError={(e) => {
                                const target = e.currentTarget
                                if (!target.dataset.fallback) {
                                  target.dataset.fallback = 'true'
                                  target.src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`
                                }
                              }}
                            />
                            {!game.installed && (
                              <img
                                src={installIcon}
                                alt="Descargar"
                                className="library-item-download-badge"
                                draggable={false}
                              />
                            )}
                          </div>
                          <div className="library-item-info">
                            <span className="library-item-name">{game.name}</span>
                            <span className="library-item-playtime">
                              {formatPlaytime(Math.round(game.playtime_forever / 60))} {t.minutesPlayed}
                            </span>
                          </div>
                          <div className="library-item-actions">
                            <button
                              className="library-action-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                setContextMenu({ visible: true, x: rect.left, y: rect.bottom + 6, gameId: `steam-${game.appid}` })
                              }}
                            >
                              <MoreIcon size={14} />
                            </button>
                          </div>
                        </article>
                      ))
                    )
                  ) : filteredLocalGames.length === 0 ? (
                    <div className="library-empty library-view-empty">
                      No se encontraron juegos en tu biblioteca.
                    </div>
                  ) : (
                    filteredLocalGames.map((game) => (
                      <article
                        key={game.id}
                        id={`library-game-${game.id}`}
                        tabIndex={0}
                        className={`library-item ${librarySelectedGame?.id === game.id ? 'selected' : ''}`}
                        onClick={() => setSelectedGameId(game.id)}
                        onFocus={() => {
                          setSelectedGameId(game.id)
                        }}
                        onDoubleClick={() => { detailFromLibraryRef.current = true; setLibraryView(false); openDetailView(game.id) }}
                      >
                        <div className="library-item-art">
                          {game.squareGridImageUrl || game.gridImageUrl ? (
                            <img src={game.squareGridImageUrl || game.gridImageUrl!} alt={game.name} className="library-item-cover" draggable={false} />
                          ) : game.iconDataUrl ? (
                            <img src={game.iconDataUrl} alt={game.name} className="library-item-icon" draggable={false} />
                          ) : (
                            <div className="game-card-placeholder" style={{ background: `linear-gradient(135deg, ${game.color}30, ${game.color}15)` }}>
                              {game.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="library-item-info">
                          {game.logoImageUrl ? (
                            <img src={game.logoImageUrl} alt={game.name} className="library-item-logo" draggable={false} />
                          ) : (
                            <span className="library-item-name">{game.name}</span>
                          )}
                          <span className="library-item-playtime">{formatPlaytime(game.playtimeMinutes)} {t.minutesPlayed}</span>
                        </div>
                        <div className="library-item-actions">
                          <button className="library-action-btn" onClick={(e) => { e.stopPropagation(); openEditGameModal(game.id) }}>
                            <EditIcon size={14} />
                          </button>
                          <button className="library-action-btn" onClick={(e) => { e.stopPropagation(); openSteamGridModal(game.id) }}>
                            <ImageIcon size={14} />
                          </button>
                          <button className="library-action-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteGame(game.id) }}>
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      )}



      {/* ── Settings Modal ── */}
      {modal === 'settings' && (
        <div className="modal-overlay settings-modal-overlay" onClick={() => setModal(null)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            {/* Left Sidebar */}
            <aside className="settings-sidebar">
              <div className="settings-sidebar-header">
                <div className="settings-sidebar-header-bg" />
                <div className="settings-sidebar-header-overlay" />
                <h2 className="settings-sidebar-title">{t.settings}</h2>
              </div>

              <nav className="settings-sidebar-nav">
                <button
                  type="button"
                  className={`settings-nav-item ${settingsTab === 'inicio' ? 'active' : ''}`}
                  onClick={() => setSettingsTab('inicio')}
                >
                  <HomeIcon size={18} className="settings-nav-icon" />
                  <span>{t.tabHome}</span>
                </button>
                <button
                  type="button"
                  className={`settings-nav-item ${settingsTab === 'personalizacion' ? 'active' : ''}`}
                  onClick={() => setSettingsTab('personalizacion')}
                >
                  <PaletteIcon size={18} className="settings-nav-icon" />
                  <span>{t.tabCustomization}</span>
                </button>
                <button
                  type="button"
                  className={`settings-nav-item ${settingsTab === 'ayuda' ? 'active' : ''}`}
                  onClick={() => setSettingsTab('ayuda')}
                >
                  <HelpIcon size={18} className="settings-nav-icon" />
                  <span>{t.tabHelp}</span>
                </button>
              </nav>
            </aside>

            {/* Right Content Area */}
            <main className="settings-content-area">
              {settingsTab === 'inicio' && (
                <div className="settings-tab-panel">
                  {/* Top program info row */}
                  <div className="settings-hero-card">
                    <div
                      className={`settings-app-logo-wrap${logoIsRed ? ' settings-app-logo-red' : ''}`}
                      ref={logoWrapRef}
                      onClick={(e) => {
                        if (logoIsRed) return
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        const x = e.clientX - rect.left
                        const y = e.clientY - rect.top
                        const ripple = document.createElement('span')
                        ripple.className = 'settings-logo-ripple'
                        ripple.style.left = `${x}px`
                        ripple.style.top = `${y}px`
                        e.currentTarget.appendChild(ripple)
                        ripple.addEventListener('animationend', () => ripple.remove())
                        setLogoClicks((prev) => {
                          const next = prev + 1
                          if (next >= 10) setLogoIsRed(true)
                          return next
                        })
                      }}
                      style={{ cursor: logoIsRed ? 'default' : 'pointer' }}
                    >
                      <img src={hashiLogo} alt="HASHI Logo" className="settings-app-logo" draggable={false} />
                    </div>
                    <div className="settings-app-meta">
                      <div className="settings-app-title-row">
                        <span className="settings-app-name">HASHI</span>
                        <span className="settings-version-badge">v{APP_VERSION}</span>
                      </div>
                      <div className="settings-app-stats-grid">
                        <div className="settings-stat-box">
                          <span className="settings-stat-label">{t.gamesAdd}</span>
                          <span className="settings-stat-val">{games.length}</span>
                        </div>
                        <div className="settings-stat-box">
                          <span className="settings-stat-label">{t.timePlayedSetting}</span>
                          <span className="settings-stat-val">
                            {formatPlaytime(games.reduce((sum, g) => sum + g.playtimeMinutes, 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action row (3 options) */}
                  <div className="settings-section">
                    <h3 className="settings-section-title">{t.shortcutsTitle}</h3>
                    <p className="settings-section-subtitle">{t.shortcutsSubtitle}</p>

                    <div className="settings-actions-row">
                      {/* Option 1: Select de Idiomas (El recuadro completo es el select) */}
                      <div className="settings-action-btn settings-action-select-card">
                        <div className="settings-action-icon-wrap">
                          <GlobeIcon size={20} />
                        </div>
                        <div className="settings-action-text-col">
                          <span className="settings-action-title">{t.languageTitle}</span>
                          <span className="settings-action-desc">
                            {language === 'es' ? t.spanish : t.english}
                          </span>
                        </div>
                        <span style={{ color: 'rgba(255, 255, 255, 0.45)', marginLeft: 'auto', flexShrink: 0 }}>
                          <ChevronDownIcon size={14} />
                        </span>
                        <select
                          className="settings-action-select-overlay"
                          value={language}
                          onChange={(e) => handleLanguageChange(e.target.value as Language)}
                        >
                          <option value="es">{t.spanish}</option>
                          <option value="en">{t.english}</option>
                        </select>
                      </div>

                      {/* Option 2: Steam Link */}
                      <button
                        type="button"
                        className={`settings-action-btn ${steamAccount.linked ? 'active' : ''}`}
                        onClick={handleSteamOpenIdLink}
                      >
                        <div className="settings-action-icon-wrap">
                          <img src={steamIcon} alt="steam" style={{ width: '100%', height: '100%' }} />
                        </div>
                        <div className="settings-action-text-col">
                          <span className="settings-action-title">
                            {steamAccount.linked
                              ? (steamAccount.accountName && !steamAccount.accountName.toLowerCase().startsWith('steam 76561') && !/^\d{17}$/.test(steamAccount.accountName)
                                ? steamAccount.accountName
                                : 'Steam')
                              : t.linkSteam}
                          </span>
                          <span className="settings-action-desc">
                            {steamAccount.linked ? t.steamLinked : t.createSteamShortcut}
                          </span>
                        </div>
                        {steamAccount.linked && <CheckIcon size={16} className="settings-action-check" />}
                      </button>

                      {/* Option 3: Search Update */}
                      <button
                        type="button"
                        className={`settings-action-btn ${isCheckingUpdate ? 'loading' : ''} ${updateLink ? 'has-update' : ''}`}
                        onClick={updateLink ? () => window.api.openExternal(updateLink) : handleCheckForUpdates}
                        disabled={isCheckingUpdate}
                      >
                        <div className="settings-action-icon-wrap">
                          <UpdateIcon size={20} className={isCheckingUpdate ? 'spin-icon' : ''} />
                        </div>
                        <div className="settings-action-text-col">
                          <span className="settings-action-title">
                            {isCheckingUpdate ? t.checkingUpdates : updateLink ? t.downloadUpdate : t.checkUpdates}
                          </span>
                          <span className="settings-action-desc">
                            {updateMessage ? updateMessage : t.checkNewVersions}
                          </span>
                        </div>
                      </button>
                    </div>

                    {steamAccount.linked && (
                      <div className="settings-steam-account-bar">
                        <span>{t.steamLinked}: <strong>{steamAccount.accountName || steamAccount.steamId}</strong></span>
                        <button type="button" className="settings-btn-link danger" onClick={handleSteamUnlink}>
                          {t.unlink}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="settings-section">
                    <h3 className="settings-section-title">{t.otherTitle}</h3>
                    <p className="settings-section-subtitle">{t.otherSubtitle}</p>

                    <div className="settings-other-row">
                      <span className="settings-other-label">{t.defaultStore}</span>
                      <select
                        className="settings-other-select"
                        value={defaultStore}
                        onChange={(e) => {
                          const val = e.target.value
                          setDefaultStore(val)
                          try { localStorage.setItem(DEFAULT_STORE_STORAGE_KEY, val) } catch { }
                        }}
                      >
                        <option value="steam">Steam</option>
                        <option value="epic">Epic Games</option>
                        <option value="gog">GOG</option>
                      </select>
                    </div>

                    <div className="settings-other-row">
                      <span className="settings-other-label">{t.omniconsoleTitle}</span>
                      <button
                        type="button"
                        className={`settings-toggle-btn ${omniconsole ? 'active' : ''}`}
                        onClick={() => {
                          const next = !omniconsole
                          setOmniconsole(next)
                          try { localStorage.setItem(OMNICONSOLE_STORAGE_KEY, String(next)) } catch { }
                        }}
                      >
                        <span className="settings-toggle-track">
                          <span className="settings-toggle-thumb" />
                        </span>
                      </button>
                    </div>
                    <p className="settings-section-subtitle" style={{ marginTop: '-0.5rem' }}>{t.omniconsoleDesc}</p>
                  </div>
                </div>
              )}

              {settingsTab === 'personalizacion' && (
                <div className="settings-tab-panel">
                  {/* Current Background Preview - Flush to top & sides */}
                  <div className="settings-wallpaper-hero-preview">
                    <img
                      src={backgroundImage || defaultHomeBackground}
                      alt="Fondo actual"
                      className="settings-wallpaper-hero-img"
                    />
                    <div className="settings-wallpaper-hero-overlay">
                      <div className="settings-wallpaper-hero-info">
                        <span className="settings-wallpaper-badge">
                          {backgroundImage ? t.customBackground : t.defaultBackground}
                        </span>
                      </div>
                      <div className="settings-wallpaper-hero-actions">
                        <button
                          type="button"
                          className="btn-secondary settings-mini-btn"
                          onClick={handleSelectBackground}
                        >
                          <ImageIcon size={14} /> {t.changeBackground}
                        </button>
                        {backgroundImage && (
                          <button
                            type="button"
                            className="btn-danger settings-mini-btn"
                            onClick={handleClearBackground}
                          >
                            {t.restoreBackground}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-secondary settings-mini-btn"
                          onClick={handleOpenWallpaperFolderPicker}
                        >
                          <FolderIcon size={14} /> {t.chooseFolder}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Small wallpaper cards paginated 4 by 4 */}
                  {(() => {
                    const totalWallpaperPages = Math.max(1, Math.ceil((wallpaperImages?.length || 0) / 4))
                    const currentWallpaperPage = Math.min(settingsWallpaperPage, totalWallpaperPages - 1)
                    const paginatedWallpapers = (wallpaperImages || []).slice(
                      currentWallpaperPage * 4,
                      currentWallpaperPage * 4 + 4
                    )

                    return (
                      <div className="settings-folder-wallpapers-section">
                        <div className="settings-folder-wallpapers-header">
                          <div className="settings-folder-header-left">
                            <span className="settings-folder-wallpapers-title">{t.folderBackgrounds}</span>
                            {wallpaperImages && wallpaperImages.length > 0 && (
                              <span className="settings-wallpaper-count-badge">
                                {wallpaperImages.length} {wallpaperImages.length === 1 ? t.backgroundCountSingular : t.backgroundCountPlural}
                              </span>
                            )}
                          </div>

                          <div className="settings-folder-header-right">
                            {wallpaperFolder && (
                              <span className="settings-folder-path" title={wallpaperFolder}>
                                {wallpaperFolder}
                              </span>
                            )}
                            {wallpaperImages && wallpaperImages.length > 4 && (
                              <div className="settings-wallpaper-pagination">
                                <button
                                  type="button"
                                  className="settings-wallpaper-page-btn"
                                  onClick={() => setSettingsWallpaperPage((p) => Math.max(0, p - 1))}
                                  disabled={currentWallpaperPage === 0}
                                  title="Página anterior"
                                >
                                  <ChevronLeftIcon size={14} />
                                </button>
                                <span className="settings-wallpaper-page-indicator">
                                  {currentWallpaperPage + 1} / {totalWallpaperPages}
                                </span>
                                <button
                                  type="button"
                                  className="settings-wallpaper-page-btn"
                                  onClick={() => setSettingsWallpaperPage((p) => Math.min(totalWallpaperPages - 1, p + 1))}
                                  disabled={currentWallpaperPage >= totalWallpaperPages - 1}
                                  title="Página siguiente"
                                >
                                  <ChevronRightIcon size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {wallpaperImages && wallpaperImages.length > 0 ? (
                          <div className="settings-wallpaper-cards-grid">
                            {paginatedWallpapers.map((item, idx) => {
                              const isCurrent = backgroundImage === item.dataUrl || backgroundImage?.includes(item.name)
                              return (
                                <button
                                  key={item.path || idx}
                                  type="button"
                                  className={`settings-wallpaper-card-item ${isCurrent ? 'selected' : ''}`}
                                  onClick={() => handleSelectWallpaperFromFolder(item.path, item.dataUrl)}
                                  title={item.name}
                                >
                                  <img
                                    src={item.dataUrl}
                                    alt={item.name}
                                    className="settings-wallpaper-card-thumb"
                                    loading="lazy"
                                  />
                                  {isCurrent && (
                                    <div className="settings-wallpaper-card-active-badge">
                                      <CheckIcon size={12} />
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="settings-wallpaper-empty-card" onClick={handleOpenWallpaperFolderPicker}>
                            <FolderIcon size={20} />
                            <span>Haz clic aquí para seleccionar una carpeta con fondos</span>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Profile section */}
                  <div className="settings-section">
                    <h3 className="settings-section-title">{t.profileTitle}</h3>
                    <div className="settings-profile-row">
                      <div
                        className="settings-profile-avatar"
                        onClick={handleSelectProfileImage}
                        title="Haz clic para cambiar tu foto"
                      >
                        <img
                          src={profileAvatar || appDefaultIcon}
                          alt="Foto de perfil"
                          className="user-avatar-img"
                          draggable={false}
                        />
                        <div className="settings-profile-avatar-overlay">
                          <ImageIcon size={20} />
                        </div>
                      </div>
                      <div className="settings-profile-fields">
                        <label className="form-label">{t.username}</label>
                        <input
                          className="form-input"
                          placeholder="Nombre de usuario"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          onBlur={(e) => handleSaveProfileName(e.target.value.trim())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              ; (e.target as HTMLInputElement).blur()
                            }
                          }}
                        />
                        <p className="settings-profile-hint">
                          {t.usernameDesc}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'ayuda' && (
                <div className="settings-tab-panel">
                  <div className="settings-section">
                    <h3 className="settings-section-title">{t.helpTitle}</h3>
                    <p className="settings-section-subtitle">
                      {t.helpSubtitle}
                    </p>

                    <div className="settings-helpers-grid">
                      <div
                        className="settings-helper-card"
                        onClick={() => {
                          setShowHelperModal(true)
                        }}
                      >
                        <div className="settings-helper-card-header">
                          <span className="settings-helper-badge">Tutorial</span>
                          <span className="settings-helper-tag">HASHI v{APP_VERSION}</span>
                        </div>
                        <div className="settings-helper-card-body">
                          <h4 className="settings-helper-title">{t.welcomeTutorial}</h4>
                          <p className="settings-helper-desc">
                            {t.welcomeDescription}
                          </p>
                        </div>
                        <div className="settings-helper-card-footer">
                          <button
                            type="button"
                            className="btn-primary settings-mini-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowHelperModal(true)
                            }}
                          >
                            {t.viewTutorial}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      )}

      {/* ── SteamGridDB Modal ── */}
      {modal === 'steamgrid' && (
        <div className="modal-overlay" onClick={() => { setModal(null); resetSgdbState() }}>
          <div className="modal sgdb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{t.searchSteamGridDB}</h2>
              <button className="modal-close" onClick={() => { setModal(null); resetSgdbState() }}>
                <CloseIcon size={20} />
              </button>
            </div>

            {/* Search bar */}
            <div className="sgdb-search-row">
              <div className="form-file-row">
                <input
                  className="form-input"
                  type="text"
                  placeholder="Nombre del juego..."
                  value={sgdbSearch}
                  onChange={(e) => setSgdbSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSgdbSearch()}
                />
                <button className="btn-secondary" onClick={handleSgdbSearch} disabled={sgdbLoading}>
                  <SearchIcon size={14} /> {sgdbLoading ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>

            {/* Results list */}
            {sgdbResults.length > 0 && !sgdbSelectedGame && (
              <div className="sgdb-results-list">
                <div className="sgdb-results-title">Selecciona un juego:</div>
                {sgdbResults.map((game) => (
                  <button
                    key={game.id}
                    className="sgdb-result-item"
                    onClick={() => handleSgdbSelectGame(game)}
                  >
                    <span>{game.name}</span>
                    {game.verified && <span className="sgdb-verified-badge">Verificado</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Selected game art grid */}
            {sgdbSelectedGame && (
              <>
                <div className="sgdb-game-header">
                  <span className="sgdb-game-name">{sgdbSelectedGame.name}</span>
                  <button
                    className="btn-secondary sgdb-back-btn"
                    onClick={() => {
                      setSgdbSelectedGame(null)
                      setSgdbImages([])
                      setSgdbSelections({ square_grids: null, grids: null, heroes: null, logos: null, icons: null })
                    }}
                  >
                    {t.btnBack}
                  </button>
                </div>

                <div className="sgdb-tabs">
                  {(['square_grids', 'grids', 'heroes', 'logos', 'icons'] as SteamGridArtType[]).map((type) => (
                    <button
                      key={type}
                      className={`sgdb-tab ${sgdbArtType === type ? 'active' : ''}`}
                      onClick={() => handleSgdbChangeArtType(type)}
                    >
                      {type === 'grids' ? 'Portadas' :
                        type === 'square_grids' ? 'Grids 1:1' :
                          type === 'heroes' ? 'Banners' :
                            type === 'logos' ? 'Logos' : 'Iconos'}
                      {sgdbSelections[type] && <span className="sgdb-tab-dot" />}
                    </button>
                  ))}
                </div>

                {sgdbImagesLoading && <div className="sgdb-loading">Cargando imágenes...</div>}

                <div className="sgdb-images-grid">
                  {sgdbImages.map((img) => (
                    <div
                      key={img.id}
                      className={`sgdb-image-card ${sgdbSelections[sgdbArtType]?.id === img.id ? 'selected' : ''}`}
                      onClick={() => handleSgdbToggleImage(img)}
                    >
                      <img
                        src={img.thumb || img.url}
                        alt="Artwork"
                        draggable={false}
                        loading="lazy"
                      />
                    </div>
                  ))}
                  {!sgdbImagesLoading && sgdbImages.length === 0 && (
                    <div className="sgdb-no-images">No se encontraron imágenes</div>
                  )}
                </div>

                {Object.values(sgdbSelections).some((s) => s !== null) && (
                  <div className="sgdb-save-row">
                    <button className="btn-primary sgdb-save-btn" onClick={handleSgdbSaveSelections}>
                      Guardar ({Object.values(sgdbSelections).filter((s) => s !== null).length})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Extensions Modal ── */}
      {modal === 'extensions' && (
        <div className="modal-overlay extensions-modal-overlay" onClick={() => setModal(null)}>
          <div className="extensions-modal" onClick={(e) => e.stopPropagation()}>
            <div className="extensions-header">
              <div>
                <p className="extensions-eyebrow">HASHI</p>
                <h2>{t.extensions}</h2>
                <p>Gestiona las extensiones instaladas en tu launcher.</p>
              </div>
              <button className="extensions-close" onClick={() => setModal(null)}>
                <CloseIcon size={20} />
              </button>
            </div>
            <div className="extensions-toolbar">
              <button
                className="extensions-secondary-button"
                onClick={() => void window.api.openExtensionsDirectory()}
              >
                Abrir carpeta
              </button>
              <button
                className="extensions-secondary-button"
                onClick={() => void loadExtensions()}
              >
                Recargar
              </button>
            </div>
            <div className="extensions-list">
              {extensions.length === 0 ? (
                <div className="extensions-empty">
                  <strong>No hay extensiones instaladas</strong>
                  <p>
                    Coloca las carpetas de extensiones en<br />
                    <code>%APPDATA%/hashi/extensions</code>
                  </p>
                </div>
              ) : (
                extensions.map((ext) => (
                  <div key={ext.id} className="extension-card">
                    <div className="extension-card-icon">
                      <ExtensionIcon size={20} />
                    </div>
                    <div className="extension-card-content">
                      <div className="extension-card-title-row">
                        <h3>{ext.name}</h3>
                        <span>v{ext.version}</span>
                      </div>
                      <p>{ext.description || 'Sin descripción'}</p>
                    </div>
                    <button
                      className={`extensions-toggle ${ext.enabled ? 'enabled' : ''}`}
                      onClick={async () => {
                        await window.api.setExtensionEnabled(ext.id, !ext.enabled)
                        await loadExtensions()
                      }}
                    >
                      {ext.enabled ? 'Activa' : 'Inactiva'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}



      {/* ── Downloads Modal (PS5 Composition) ── */}
      <DownloadsModal
        isOpen={showDownloadsModal}
        onClose={() => setShowDownloadsModal(false)}
        downloads={steamDownloads}
        forgottenDownloads={forgottenDownloads}
        onForgetDownload={(appId) => {
          const newSet = new Set(forgottenDownloads).add(appId)
          setForgottenDownloads(newSet)
          localStorage.setItem(FORGOTTEN_DOWNLOADS_KEY, JSON.stringify([...newSet]))
        }}
        games={games}
        steamLibrary={steamLibrary}
        language={language}
        onSelectGame={(gameId) => {
          setLibraryView(false)
          setDetailGameId(gameId)
          setShowDownloadsModal(false)
        }}
      />

      {/* ── Notification Container ── */}
      <NotificationContainer
        notifications={notifications}
        onDismiss={dismissNotification}
        language={language}
      />

      {/* ── Download Completion Notifications ── */}
      {downloadNotifications.length > 0 && (
        <div className="notification-container">
          {downloadNotifications.map((notif) => (
            <DownloadCompleteNotification
              key={notif.id}
              id={notif.id}
              name={notif.name}
              iconUrl={notif.iconUrl}
              onDismiss={dismissDownloadNotification}
              language={language}
            />
          ))}
        </div>
      )}

      {/* ── Modal Helper (Tutorial de Bienvenida) ── */}
      <ModalHelper
        isOpen={showHelperModal}
        onClose={() => setShowHelperModal(false)}
        language={language}
      />

    </div>
  )
}

export default App
