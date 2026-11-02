import React, { useState, useMemo, useEffect, useRef } from 'react'
import '../assets/qam-friends.css'
import {
  Bell,
  Users,
  Settings,
  Zap,
  Music,
  HelpCircle,
  UserPlus,
  Star,
  User,
  MessageSquare,
  ArrowDownAZ,
  ArrowUpZA,
  ExternalLink,
  MessageCircle,
  Gamepad2,
  X,
  Copy,
  Check
} from 'lucide-react'

export interface SteamFriend {
  steamid: string
  personaname: string
  avatar?: string | null
  avatarfull?: string | null
  profileurl?: string | null
  personastate?: number
  gameid?: string | null
  gameextrainfo?: string | null
  lastlogoff?: number | null
}

interface FriendsDrawerProps {
  isOpen: boolean
  onClose: () => void
  friends: SteamFriend[]
  onOpenSettings?: () => void
  onOpenSpecs?: () => void
  onOpenHelp?: () => void
  notificationsCount?: number
  nowPlayingTitle?: string
  playEnter?: () => void
  playClose?: () => void
  playMove?: () => void
  language?: string
}

type TabType = 'favorites' | 'friends' | 'groups' | 'chats'
type SortMode = 'default' | 'az' | 'za' | 'recent'

function isFriendOnline(friend: SteamFriend): boolean {
  return Boolean(friend.gameextrainfo) || Number(friend.personastate) > 0
}

function formatLastLogoff(lastlogoff?: number | null, lang: string = 'es'): string {
  if (!lastlogoff) {
    return lang === 'es' ? 'Desconectado' : 'Offline'
  }
  const now = Math.floor(Date.now() / 1000)
  const diffSec = Math.max(0, now - lastlogoff)
  const diffMin = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffMonths = Math.floor(diffDays / 30)

  if (lang === 'es') {
    if (diffMonths >= 1) {
      return `Última conexión: hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`
    }
    if (diffDays >= 7) {
      const weeks = Math.floor(diffDays / 7)
      return `Última conexión: hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
    }
    if (diffDays >= 1) {
      const remHours = diffHours % 24
      if (remHours > 0) {
        return `Última conexión: hace ${diffDays} día${diffDays > 1 ? 's' : ''} y ${remHours} ho...`
      }
      return `Última conexión: hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
    }
    if (diffHours >= 1) {
      return `Última conexión: hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
    }
    if (diffMin >= 1) {
      return `Última conexión: hace ${diffMin} min`
    }
    return 'Última conexión: hace un momento'
  } else {
    if (diffMonths >= 1) {
      return `Last online: ${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`
    }
    if (diffDays >= 7) {
      const weeks = Math.floor(diffDays / 7)
      return `Last online: ${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
    }
    if (diffDays >= 1) {
      const remHours = diffHours % 24
      if (remHours > 0) {
        return `Last online: ${diffDays}d ${remHours}h ago`
      }
      return `Last online: ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
    }
    if (diffHours >= 1) {
      return `Last online: ${diffHours}h ago`
    }
    if (diffMin >= 1) {
      return `Last online: ${diffMin}m ago`
    }
    return 'Last online: just now'
  }
}

export const FriendsDrawer: React.FC<FriendsDrawerProps> = ({
  isOpen,
  onClose,
  friends,
  onOpenSettings,
  onOpenSpecs,
  onOpenHelp,
  notificationsCount = 0,
  nowPlayingTitle,
  playEnter,
  playClose,
  playMove,
  language = 'es'
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('friends')
  const [sortMode, setSortMode] = useState<SortMode>('default')
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gbl-steam-favorite-friends')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [selectedFriendForAction, setSelectedFriendForAction] = useState<SteamFriend | null>(null)
  const [actionFocusIndex, setActionFocusIndex] = useState<number>(0)
  const [copiedId, setCopiedId] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({})

  const listContainerRef = useRef<HTMLDivElement>(null)

  // Guardar favoritos
  const toggleFavorite = (steamid: string): void => {
    setFavoriteIds((prev) => {
      const next = prev.includes(steamid) ? prev.filter((id) => id !== steamid) : [...prev, steamid]
      try {
        localStorage.setItem('gbl-steam-favorite-friends', JSON.stringify(next))
      } catch (err) {
        console.error('Error guardando favoritos de Steam:', err)
      }
      return next
    })
  }

  // Filtrado y ordenamiento de amigos
  const { onlineFriends, offlineFriends, favoriteFriends } = useMemo(() => {
    let sorted = [...friends]

    if (sortMode === 'az') {
      sorted.sort((a, b) => a.personaname.localeCompare(b.personaname))
    } else if (sortMode === 'za') {
      sorted.sort((a, b) => b.personaname.localeCompare(a.personaname))
    } else if (sortMode === 'recent') {
      sorted.sort((a, b) => Number(b.lastlogoff || 0) - Number(a.lastlogoff || 0))
    } else {
      // default: alfabético dentro de cada grupo
      sorted.sort((a, b) => a.personaname.localeCompare(b.personaname))
    }

    const online = sorted.filter(isFriendOnline)
    const offline = sorted.filter((f) => !isFriendOnline(f))
    const favs = sorted.filter((f) => favoriteIds.includes(f.steamid))

    return {
      onlineFriends: online,
      offlineFriends: offline,
      favoriteFriends: favs
    }
  }, [friends, sortMode, favoriteIds])

  // Lista aplanada actual para navegación con teclado / mando
  const currentNavList = useMemo(() => {
    if (activeTab === 'favorites') return favoriteFriends
    if (activeTab === 'friends') return [...onlineFriends, ...offlineFriends]
    return []
  }, [activeTab, favoriteFriends, onlineFriends, offlineFriends])

  // Tabs orden
  const tabs: TabType[] = ['favorites', 'friends', 'groups', 'chats']

  const handlePrevTab = (): void => {
    playMove?.()
    setActiveTab((prev) => {
      const idx = tabs.indexOf(prev)
      const nextIdx = idx <= 0 ? tabs.length - 1 : idx - 1
      return tabs[nextIdx]
    })
    setFocusedIndex(-1)
  }

  const handleNextTab = (): void => {
    playMove?.()
    setActiveTab((prev) => {
      const idx = tabs.indexOf(prev)
      const nextIdx = idx >= tabs.length - 1 ? 0 : idx + 1
      return tabs[nextIdx]
    })
    setFocusedIndex(-1)
  }

  // Acciones sobre amigos
  const handleOpenAddFriend = async (): Promise<void> => {
    playEnter?.()
    const url = 'steam://openurl/https://steamcommunity.com/actions/AddFriend'
    const res = await window.api.openExternal(url)
    if (!res.success) {
      await window.api.openExternal('https://steamcommunity.com/search/users/')
    }
  }

  const handleOpenSteamChat = async (): Promise<void> => {
    playEnter?.()
    const res = await window.api.openExternal('steam://openurl/https://steamcommunity.com/chat')
    if (!res.success) {
      await window.api.openExternal('https://steamcommunity.com/chat')
    }
  }

  const handleOpenFriendProfile = async (friend: SteamFriend): Promise<void> => {
    playEnter?.()
    const profileUrl = friend.profileurl || `https://steamcommunity.com/profiles/${friend.steamid}`
    const result = await window.api.openExternal(`steam://url/SteamIDPage/${friend.steamid}`)
    if (!result.success) {
      const steamUrlResult = await window.api.openExternal(`steam://openurl/${profileUrl}`)
      if (!steamUrlResult.success) await window.api.openExternal(profileUrl)
    }
  }

  const handleSendFriendMessage = async (friend: SteamFriend): Promise<void> => {
    playEnter?.()
    const result = await window.api.openExternal(`steam://friends/message/${friend.steamid}`)
    if (!result.success) {
      await window.api.openExternal(`https://steamcommunity.com/chat`)
    }
  }

  const handleJoinFriendGame = async (friend: SteamFriend): Promise<void> => {
    if (!friend.gameid) return
    playEnter?.()
    await window.api.openExternal(`steam://rungameid/${friend.gameid}`)
  }

  const handleCopySteamId = async (steamid: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(steamid)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    } catch (err) {
      console.error('Error al copiar SteamID:', err)
    }
  }

  const toggleSort = (): void => {
    playMove?.()
    setSortMode((prev) => {
      if (prev === 'default') return 'az'
      if (prev === 'az') return 'za'
      if (prev === 'za') return 'recent'
      return 'default'
    })
  }

  const availableActions = useMemo(() => {
    if (!selectedFriendForAction) return []
    const actions: {
      id: string
      label: string
      icon: React.ReactNode
      onClick: () => void
      highlight?: boolean
    }[] = []

    if (selectedFriendForAction.gameid) {
      actions.push({
        id: 'join',
        label: language === 'es' ? 'Unirse a la partida' : 'Join game',
        icon: <Gamepad2 size={16} />,
        onClick: () => handleJoinFriendGame(selectedFriendForAction),
        highlight: true
      })
    }

    actions.push({
      id: 'message',
      label: language === 'es' ? 'Enviar mensaje' : 'Send message',
      icon: <MessageCircle size={16} />,
      onClick: () => handleSendFriendMessage(selectedFriendForAction)
    })

    actions.push({
      id: 'profile',
      label: language === 'es' ? 'Ver perfil de Steam' : 'View Steam profile',
      icon: <ExternalLink size={16} />,
      onClick: () => handleOpenFriendProfile(selectedFriendForAction)
    })

    const isFav = favoriteIds.includes(selectedFriendForAction.steamid)
    actions.push({
      id: 'favorite',
      label: isFav
        ? language === 'es'
          ? 'Quitar de favoritos'
          : 'Remove from favorites'
        : language === 'es'
          ? 'Añadir a favoritos'
          : 'Add to favorites',
      icon: (
        <Star
          size={16}
          fill={isFav ? '#ffd700' : 'none'}
          color={isFav ? '#ffd700' : 'currentColor'}
        />
      ),
      onClick: () => toggleFavorite(selectedFriendForAction.steamid)
    })

    actions.push({
      id: 'copyId',
      label: copiedId
        ? language === 'es'
          ? '¡SteamID copiado!'
          : 'SteamID copied!'
        : 'Copiar SteamID',
      icon: copiedId ? <Check size={16} color="#4cd964" /> : <Copy size={16} />,
      onClick: () => handleCopySteamId(selectedFriendForAction.steamid)
    })

    return actions
  }, [selectedFriendForAction, language, favoriteIds, copiedId])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1)
      setSelectedFriendForAction(null)
      setActionFocusIndex(0)
      return
    }

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (selectedFriendForAction) {
          playClose?.()
          setSelectedFriendForAction(null)
          setActionFocusIndex(0)
        } else {
          playClose?.()
          onClose()
        }
        return
      }

      // Si el modal de acciones está abierto, navegar por sus opciones
      if (selectedFriendForAction) {
        if (availableActions.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            playMove?.()
            setActionFocusIndex((prev) => (prev < availableActions.length - 1 ? prev + 1 : 0))
            return
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            playMove?.()
            setActionFocusIndex((prev) => (prev > 0 ? prev - 1 : availableActions.length - 1))
            return
          }
          if (e.key === 'Enter') {
            e.preventDefault()
            playEnter?.()
            availableActions[actionFocusIndex]?.onClick()
            return
          }
        }
        return
      }

      // L1 / R1 o Flechas Izquierda / Derecha para cambiar pestañas
      if (e.key === 'BrowserBack' || e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevTab()
        return
      }
      if (e.key === 'BrowserForward' || e.key === 'ArrowRight') {
        e.preventDefault()
        handleNextTab()
        return
      }

      // Navegación en la lista
      if (currentNavList.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          playMove?.()
          setFocusedIndex((prev) => {
            const next = prev < currentNavList.length - 1 ? prev + 1 : 0
            const el = document.getElementById(`friend-item-${currentNavList[next]?.steamid}`)
            el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            return next
          })
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          playMove?.()
          setFocusedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : currentNavList.length - 1
            const el = document.getElementById(`friend-item-${currentNavList[next]?.steamid}`)
            el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            return next
          })
          return
        }
        if (e.key === 'Enter') {
          if (focusedIndex >= 0 && currentNavList[focusedIndex]) {
            e.preventDefault()
            playEnter?.()
            setSelectedFriendForAction(currentNavList[focusedIndex])
            setActionFocusIndex(0)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedFriendForAction, actionFocusIndex, availableActions, currentNavList, focusedIndex, onClose, playClose, playEnter, playMove])

  if (!isOpen) return null

  return (
    <div className="qam-friends-layer" role="presentation">
      {/* Backdrop */}
      <div className="qam-friends-backdrop" onClick={onClose} />

      {/* Drawer Container */}
      <aside className="qam-friends-drawer" aria-label="Menú de acceso rápido">
        {/* ── Left Rail (Quick Access Bar) ── */}
        <div className="qam-rail">
          {/* Notifications */}
          <button
            className="qam-rail-item"
            title={language === 'es' ? 'Notificaciones' : 'Notifications'}
            onClick={() => {
              playEnter?.()
            }}
          >
            <Bell size={22} />
            {notificationsCount > 0 && <span className="qam-rail-badge">{notificationsCount}</span>}
          </button>

          {/* Friends (Active) */}
          <button
            className="qam-rail-item active"
            title={language === 'es' ? 'Amigos' : 'Friends'}
            onClick={() => playEnter?.()}
          >
            <Users size={22} />
          </button>

          {/* Settings */}
          <button
            className="qam-rail-item"
            title={language === 'es' ? 'Ajustes' : 'Settings'}
            onClick={() => {
              playEnter?.()
              onClose()
              onOpenSettings?.()
            }}
          >
            <Settings size={22} />
          </button>

          {/* Performance / Specs */}
          <button
            className="qam-rail-item"
            title={language === 'es' ? 'Rendimiento y Sistema' : 'Performance & System'}
            onClick={() => {
              playEnter?.()
              onClose()
              onOpenSpecs?.()
            }}
          >
            <Zap size={22} />
          </button>

          {/* Music */}
          <button
            className="qam-rail-item"
            title={nowPlayingTitle || (language === 'es' ? 'Música' : 'Music')}
            onClick={() => playEnter?.()}
          >
            <Music size={22} />
          </button>

          {/* Help */}
          <button
            className="qam-rail-item"
            title={language === 'es' ? 'Ayuda' : 'Help'}
            onClick={() => {
              playEnter?.()
              onClose()
              onOpenHelp?.()
            }}
          >
            <HelpCircle size={22} />
          </button>
        </div>

        {/* ── Right Content Panel (Friends) ── */}
        <div className="qam-content">
          {/* Header */}
          <div className="qam-header">
            <h1 className="qam-title">{language === 'es' ? 'Amigos' : 'Friends'}</h1>
            <button
              className="qam-icon-btn"
              title={language === 'es' ? 'Añadir amigo' : 'Add friend'}
              onClick={handleOpenAddFriend}
            >
              <UserPlus size={20} />
            </button>
          </div>

          {/* Controller Tabs / Subnav */}
          <div className="qam-subnav">
            <button className="qam-bumper-btn" onClick={handlePrevTab} title="L1 (Anterior)">
              L1
            </button>

            <div className="qam-subnav-tabs">
              <button
                className={`qam-tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
                onClick={() => {
                  playMove?.()
                  setActiveTab('favorites')
                  setFocusedIndex(-1)
                }}
                title={language === 'es' ? 'Favoritos' : 'Favorites'}
              >
                <Star size={18} />
              </button>
              <button
                className={`qam-tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
                onClick={() => {
                  playMove?.()
                  setActiveTab('friends')
                  setFocusedIndex(-1)
                }}
                title={language === 'es' ? 'Todos los amigos' : 'All friends'}
              >
                <User size={18} />
              </button>
              <button
                className={`qam-tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
                onClick={() => {
                  playMove?.()
                  setActiveTab('groups')
                  setFocusedIndex(-1)
                }}
                title={language === 'es' ? 'Grupos' : 'Groups'}
              >
                <Users size={18} />
              </button>
              <button
                className={`qam-tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
                onClick={() => {
                  playMove?.()
                  setActiveTab('chats')
                  setFocusedIndex(-1)
                }}
                title={language === 'es' ? 'Chats' : 'Chats'}
              >
                <MessageSquare size={18} />
              </button>
            </div>

            <button className="qam-bumper-btn" onClick={handleNextTab} title="R1 (Siguiente)">
              R1
            </button>
          </div>

          <div className="qam-divider" />

          {/* List Area */}
          <div className="qam-scroll-area" ref={listContainerRef}>
            {activeTab === 'friends' && (
              <>
                {/* ── Section: Amigos en línea ── */}
                <div className="qam-section">
                  <div className="qam-section-header">
                    <span className="qam-section-title">
                      {language === 'es' ? 'Amigos en línea' : 'Online friends'}{' '}
                      <span className="qam-count">({onlineFriends.length})</span>
                    </span>
                  </div>

                  {onlineFriends.length === 0 ? (
                    <div className="qam-empty-sub">
                      {language === 'es' ? 'Ningún amigo conectado' : 'No friends online'}
                    </div>
                  ) : (
                    <div className="qam-list">
                      {onlineFriends.map((friend) => {
                        const globalIdx = currentNavList.findIndex((f) => f.steamid === friend.steamid)
                        const isFocused = focusedIndex === globalIdx
                        const isAvatarBroken = avatarErrors[friend.steamid]
                        const isPlaying = Boolean(friend.gameextrainfo)

                        return (
                          <div
                            key={friend.steamid}
                            id={`friend-item-${friend.steamid}`}
                            className={`qam-friend-item online ${isFocused ? 'focused' : ''}`}
                            onClick={() => {
                              playEnter?.()
                              setSelectedFriendForAction(friend)
                              setActionFocusIndex(0)
                            }}
                          >
                            <div className="qam-avatar-wrap">
                              {friend.avatarfull && !isAvatarBroken ? (
                                <img
                                  src={friend.avatarfull}
                                  alt={friend.personaname}
                                  className="qam-avatar-img"
                                  onError={() =>
                                    setAvatarErrors((prev) => ({ ...prev, [friend.steamid]: true }))
                                  }
                                  draggable={false}
                                />
                              ) : (
                                <div className="qam-avatar-placeholder">?</div>
                              )}
                              <span className={`qam-status-bar ${isPlaying ? 'playing' : 'online'}`} />
                            </div>

                            <div className="qam-friend-details">
                              <span className="qam-friend-name">{friend.personaname}</span>
                              <span className={`qam-friend-status ${isPlaying ? 'playing' : 'online'}`}>
                                {friend.gameextrainfo || (language === 'es' ? 'Conectado' : 'Online')}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="qam-divider" />

                {/* ── Section: Desconectados ── */}
                <div className="qam-section">
                  <div className="qam-section-header with-action">
                    <span className="qam-section-title">
                      {language === 'es' ? 'Desconectados' : 'Offline'}{' '}
                      <span className="qam-count">({offlineFriends.length})</span>
                    </span>
                    <button
                      className="qam-sort-btn"
                      onClick={toggleSort}
                      title={
                        sortMode === 'az'
                          ? 'A-Z'
                          : sortMode === 'za'
                            ? 'Z-A'
                            : sortMode === 'recent'
                              ? 'Más reciente'
                              : 'Orden predeterminado'
                      }
                    >
                      {sortMode === 'za' ? <ArrowUpZA size={16} /> : <ArrowDownAZ size={16} />}
                    </button>
                  </div>

                  {offlineFriends.length === 0 ? (
                    <div className="qam-empty-sub">
                      {language === 'es' ? 'No hay amigos desconectados' : 'No offline friends'}
                    </div>
                  ) : (
                    <div className="qam-list">
                      {offlineFriends.map((friend) => {
                        const globalIdx = currentNavList.findIndex((f) => f.steamid === friend.steamid)
                        const isFocused = focusedIndex === globalIdx
                        const isAvatarBroken = avatarErrors[friend.steamid]

                        return (
                          <div
                            key={friend.steamid}
                            id={`friend-item-${friend.steamid}`}
                            className={`qam-friend-item offline ${isFocused ? 'focused' : ''}`}
                            onClick={() => {
                              playEnter?.()
                              setSelectedFriendForAction(friend)
                              setActionFocusIndex(0)
                            }}
                          >
                            <div className="qam-avatar-wrap">
                              {friend.avatarfull && !isAvatarBroken ? (
                                <img
                                  src={friend.avatarfull}
                                  alt={friend.personaname}
                                  className="qam-avatar-img"
                                  onError={() =>
                                    setAvatarErrors((prev) => ({ ...prev, [friend.steamid]: true }))
                                  }
                                  draggable={false}
                                />
                              ) : (
                                <div className="qam-avatar-placeholder">?</div>
                              )}
                              <span className="qam-status-bar offline" />
                            </div>

                            <div className="qam-friend-details">
                              <span className="qam-friend-name">{friend.personaname}</span>
                              <span className="qam-friend-status offline">
                                {formatLastLogoff(friend.lastlogoff, language)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Tab: Favoritos ── */}
            {activeTab === 'favorites' && (
              <div className="qam-section">
                <div className="qam-section-header">
                  <span className="qam-section-title">
                    {language === 'es' ? 'Amigos favoritos' : 'Favorite friends'}{' '}
                    <span className="qam-count">({favoriteFriends.length})</span>
                  </span>
                </div>

                {favoriteFriends.length === 0 ? (
                  <div className="qam-empty-tab">
                    <Star size={32} className="qam-empty-icon" />
                    <p>
                      {language === 'es'
                        ? 'No tienes amigos en favoritos. Haz clic en un amigo y selecciona "Añadir a favoritos" para tenerlo siempre a mano.'
                        : 'No favorite friends yet. Click a friend to mark them as favorite.'}
                    </p>
                  </div>
                ) : (
                  <div className="qam-list">
                    {favoriteFriends.map((friend) => {
                      const globalIdx = currentNavList.findIndex((f) => f.steamid === friend.steamid)
                      const isFocused = focusedIndex === globalIdx
                      const isOnline = isFriendOnline(friend)
                      const isPlaying = Boolean(friend.gameextrainfo)
                      const isAvatarBroken = avatarErrors[friend.steamid]

                      return (
                        <div
                          key={friend.steamid}
                          id={`friend-item-${friend.steamid}`}
                          className={`qam-friend-item ${isOnline ? 'online' : 'offline'} ${isFocused ? 'focused' : ''}`}
                          onClick={() => {
                            playEnter?.()
                            setSelectedFriendForAction(friend)
                            setActionFocusIndex(0)
                          }}
                        >
                          <div className="qam-avatar-wrap">
                            {friend.avatarfull && !isAvatarBroken ? (
                              <img
                                src={friend.avatarfull}
                                alt={friend.personaname}
                                className="qam-avatar-img"
                                draggable={false}
                              />
                            ) : (
                              <div className="qam-avatar-placeholder">?</div>
                            )}
                            <span
                              className={`qam-status-bar ${
                                isOnline ? (isPlaying ? 'playing' : 'online') : 'offline'
                              }`}
                            />
                          </div>
                          <div className="qam-friend-details">
                            <span className="qam-friend-name">{friend.personaname}</span>
                            <span
                              className={`qam-friend-status ${
                                isOnline ? (isPlaying ? 'playing' : 'online') : 'offline'
                              }`}
                            >
                              {isOnline
                                ? friend.gameextrainfo || (language === 'es' ? 'Conectado' : 'Online')
                                : formatLastLogoff(friend.lastlogoff, language)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Grupos ── */}
            {activeTab === 'groups' && (
              <div className="qam-empty-tab">
                <Users size={36} className="qam-empty-icon" />
                <h3>{language === 'es' ? 'Grupos de Steam' : 'Steam Groups'}</h3>
                <p>
                  {language === 'es'
                    ? 'Únete a salas de juego y chats grupales directamente en Steam.'
                    : 'Join game rooms and group chats directly in Steam.'}
                </p>
                <button className="qam-action-btn primary" onClick={handleOpenSteamChat}>
                  <ExternalLink size={16} />
                  {language === 'es' ? 'Abrir grupos en Steam' : 'Open Steam Groups'}
                </button>
              </div>
            )}

            {/* ── Tab: Chats ── */}
            {activeTab === 'chats' && (
              <div className="qam-empty-tab">
                <MessageSquare size={36} className="qam-empty-icon" />
                <h3>{language === 'es' ? 'Chat de Steam' : 'Steam Chat'}</h3>
                <p>
                  {language === 'es'
                    ? 'Comunícate con tus amigos y envía mensajes instantáneos en Steam.'
                    : 'Chat with your friends and send direct messages in Steam.'}
                </p>
                <button className="qam-action-btn primary" onClick={handleOpenSteamChat}>
                  <MessageCircle size={16} />
                  {language === 'es' ? 'Abrir chat de Steam' : 'Open Steam Chat'}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Friend Action Flyout / Modal ── */}
      {selectedFriendForAction && (
        <div className="qam-action-dialog-overlay" onClick={() => setSelectedFriendForAction(null)}>
          <div className="qam-action-dialog" onClick={(e) => e.stopPropagation()}>
            <button className="qam-dialog-close" onClick={() => setSelectedFriendForAction(null)}>
              <X size={18} />
            </button>

            <div className="qam-dialog-header">
              <div className="qam-dialog-avatar-wrap">
                {selectedFriendForAction.avatarfull ? (
                  <img
                    src={selectedFriendForAction.avatarfull}
                    alt={selectedFriendForAction.personaname}
                    className="qam-dialog-avatar"
                  />
                ) : (
                  <div className="qam-dialog-avatar-placeholder">?</div>
                )}
                <span
                  className={`qam-status-bar ${
                    isFriendOnline(selectedFriendForAction)
                      ? selectedFriendForAction.gameextrainfo
                        ? 'playing'
                        : 'online'
                      : 'offline'
                  }`}
                />
              </div>

              <div className="qam-dialog-info">
                <h3>{selectedFriendForAction.personaname}</h3>
                <p
                  className={`qam-dialog-status ${
                    isFriendOnline(selectedFriendForAction)
                      ? selectedFriendForAction.gameextrainfo
                        ? 'playing'
                        : 'online'
                      : 'offline'
                  }`}
                >
                  {isFriendOnline(selectedFriendForAction)
                    ? selectedFriendForAction.gameextrainfo || (language === 'es' ? 'Conectado' : 'Online')
                    : formatLastLogoff(selectedFriendForAction.lastlogoff, language)}
                </p>
              </div>
            </div>

            <div className="qam-dialog-actions">
              {availableActions.map((action, idx) => (
                <button
                  key={action.id}
                  className={`qam-dialog-btn ${action.highlight ? 'highlight' : ''} ${actionFocusIndex === idx ? 'focused' : ''}`}
                  onClick={action.onClick}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FriendsDrawer
