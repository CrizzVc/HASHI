import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeftIcon } from './Icons'
import { Language } from '../translations'
import {
    SteamNewsItem,
    fetchSteamNewsForApp,
    fetchSteamNewsByName,
    formatSteamDate
} from '../services/steamNewsService'
import { playMove, playPages, playEnter, playClose } from '../services/soundService'

export interface TrophyAchievement {
    apiname: string
    achieved: number
    unlocktime: number
    name?: string
    displayName?: string
    description?: string | null
    icon?: string | null
    icongray?: string | null
}

interface TrophiesViewProps {
    gameName: string
    coverUrl?: string | null
    logoUrl?: string | null
    heroUrl?: string | null
    steamAppId?: string | number | null
    achievements: TrophyAchievement[]
    loading?: boolean
    selectedIndex?: number
    language?: Language
    onClose: () => void
}


const TrophiesView: React.FC<TrophiesViewProps> = ({
    gameName,
    coverUrl,
    logoUrl,
    heroUrl,
    steamAppId,
    achievements,
    loading = false,
    selectedIndex = 0,
    language = 'es',
    onClose
}) => {
    const [tab, setTab] = useState<'trofeos' | 'news'>('trofeos')
    const [selectedTrophyIndex, setSelectedTrophyIndex] = useState(selectedIndex)
    const [news, setNews] = useState<SteamNewsItem[]>([])
    const [loadingNews, setLoadingNews] = useState(false)
    const [newsFetched, setNewsFetched] = useState(false)
    const [selectedNewsIndex, setSelectedNewsIndex] = useState(0)

    const trophyCardRefs = useRef<Array<HTMLElement | null>>([])
    const newsCardRefs = useRef<Array<HTMLElement | null>>([])
    const isEs = language === 'es'

    const unlockedCount = achievements.filter((a) => a.achieved).length
    const totalCount = achievements.length
    const progress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0

    // Fetch news on mount or when game changes
    useEffect(() => {
        let cancelled = false
        const loadNews = async (): Promise<void> => {
            setLoadingNews(true)
            try {
                let items: SteamNewsItem[] = []
                const numId = steamAppId ? Number(steamAppId) : null
                if (numId && !isNaN(numId) && numId > 0) {
                    items = await fetchSteamNewsForApp(numId)
                }
                if (items.length === 0 && gameName) {
                    items = await fetchSteamNewsByName(gameName)
                }
                if (!cancelled) {
                    setNews(items)
                    setNewsFetched(true)
                }
            } catch (err) {
                console.error('[TrophiesView] Error loading Steam news:', err)
                if (!cancelled) setNewsFetched(true)
            } finally {
                if (!cancelled) setLoadingNews(false)
            }
        }

        void loadNews()
        return () => {
            cancelled = true
        }
    }, [gameName, steamAppId])

    // Scroll trophy cards
    useEffect(() => {
        if (tab !== 'trofeos') return
        const el = trophyCardRefs.current[selectedTrophyIndex]
        if (!el) return
        const container = el.closest('.trophies-row') as HTMLElement | null
        if (!container) return
        const cardLeft = el.offsetLeft - container.offsetLeft
        const start = container.scrollLeft
        const distance = cardLeft - start
        if (distance === 0) return
        const duration = 350
        let startTime: number | null = null
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp
            const p = Math.min((timestamp - startTime) / duration, 1)
            const ease = 1 - Math.pow(1 - p, 3)
            container.scrollLeft = start + distance * ease
            if (p < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
    }, [selectedTrophyIndex, tab])

    // Scroll news cards
    useEffect(() => {
        if (tab !== 'news') return
        const el = newsCardRefs.current[selectedNewsIndex]
        if (!el) return
        const container = el.closest('.trophies-row') as HTMLElement | null
        if (!container) return
        const cardLeft = el.offsetLeft - container.offsetLeft
        const start = container.scrollLeft
        const distance = cardLeft - start
        if (distance === 0) return
        const duration = 350
        let startTime: number | null = null
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp
            const p = Math.min((timestamp - startTime) / duration, 1)
            const ease = 1 - Math.pow(1 - p, 3)
            container.scrollLeft = start + distance * ease
            if (p < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
    }, [selectedNewsIndex, tab])

    // Controller & Keyboard navigation (L1/R1, Arrows, Enter, Esc)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent): void => {
            // L1 (BrowserBack, PageUp, q) -> Tab Trofeos
            if (e.key === 'BrowserBack' || e.key === 'PageUp' || e.key === 'q' || e.key === 'Q') {
                e.preventDefault()
                if (tab !== 'trofeos') {
                    playPages()
                    setTab('trofeos')
                }
                return
            }

            // R1 (BrowserForward, PageDown, e) -> Tab Noticias
            if (e.key === 'BrowserForward' || e.key === 'PageDown' || e.key === 'e' || e.key === 'E') {
                e.preventDefault()
                if (tab !== 'news') {
                    playPages()
                    setTab('news')
                }
                return
            }

            // Left / Right Navigation
            if (tab === 'trofeos') {
                if (e.key === 'ArrowRight' && achievements.length > 0) {
                    e.preventDefault()
                    setSelectedTrophyIndex((prev) => {
                        const next = Math.min(prev + 1, achievements.length - 1)
                        if (next !== prev) playMove()
                        return next
                    })
                } else if (e.key === 'ArrowLeft' && achievements.length > 0) {
                    e.preventDefault()
                    setSelectedTrophyIndex((prev) => {
                        const next = Math.max(prev - 1, 0)
                        if (next !== prev) playMove()
                        return next
                    })
                } else if (e.key === 'Enter') {
                    if (steamAppId) {
                        e.preventDefault()
                        playEnter()
                        void window.api.openExternal(`https://steamcommunity.com/stats/${steamAppId}/achievements`)
                    }
                }
            } else if (tab === 'news') {
                if (e.key === 'ArrowRight' && news.length > 0) {
                    e.preventDefault()
                    setSelectedNewsIndex((prev) => {
                        const next = Math.min(prev + 1, news.length - 1)
                        if (next !== prev) playMove()
                        return next
                    })
                } else if (e.key === 'ArrowLeft' && news.length > 0) {
                    e.preventDefault()
                    setSelectedNewsIndex((prev) => {
                        const next = Math.max(prev - 1, 0)
                        if (next !== prev) playMove()
                        return next
                    })
                } else if (e.key === 'Enter') {
                    const currentNews = news[selectedNewsIndex]
                    if (currentNews?.url) {
                        e.preventDefault()
                        playEnter()
                        void window.api.openExternal(currentNews.url)
                    }
                }
            }

            if (e.key === 'Escape') {
                e.preventDefault()
                playClose()
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [tab, achievements.length, news, selectedNewsIndex, steamAppId, onClose])

    const handleOpenSteamAchievements = (): void => {
        if (!steamAppId) return
        playEnter()
        void window.api.openExternal(`https://steamcommunity.com/stats/${steamAppId}/achievements`)
    }

    const handleOpenNewsItem = (url: string, index: number): void => {
        setSelectedNewsIndex(index)
        playEnter()
        void window.api.openExternal(url)
    }

    return (
        <div className="trophies-view" aria-label={`${isEs ? 'Trofeos y noticias de' : 'Trophies and news for'} ${gameName}`}>
            <div className="trophies-header">
                {heroUrl && <div className="trophies-header-bg" style={{ backgroundImage: `url(${heroUrl})` }} />}

                <button className="trophies-close-button" onClick={() => { playClose(); onClose() }}>
                    <ChevronLeftIcon size={18} /> {isEs ? 'Volver' : 'Back'}
                </button>

                <div className="trophies-header-content">
                    <div className="trophies-cover">
                        {coverUrl ? (
                            <img src={coverUrl} alt={gameName} draggable={false} />
                        ) : (
                            <div className="trophies-cover-placeholder">{gameName.charAt(0).toUpperCase()}</div>
                        )}
                    </div>

                    <div className="trophies-info-col">
                        <div className="trophies-logo-box">
                            {logoUrl ? (
                                <img src={logoUrl} alt={gameName} draggable={false} />
                            ) : (
                                <h1 className="trophies-title-fallback">{gameName}</h1>
                            )}
                        </div>

                        <div className="trophies-progress-bar-track">
                            <div className="trophies-progress-bar-fill" style={{ width: `${progress}%` }} />
                        </div>

                        <div className="trophies-meta-row">
                            <span className="trophies-count-pill">
                                {totalCount > 0
                                    ? `${unlockedCount}/${totalCount} ${isEs ? 'Logros' : 'Achievements'}`
                                    : isEs ? 'Sin logros' : 'No achievements'}
                            </span>
                            {steamAppId && (
                                <button className="trophies-steam-btn" onClick={handleOpenSteamAchievements}>
                                    {isEs ? 'Ver en Steam' : 'View on Steam'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="trophies-tabs-row">
                <div className="trophies-tabs">
                    <button
                        type="button"
                        className={`trophies-tab ${tab === 'trofeos' ? 'active' : ''}`}
                        onClick={() => {
                            if (tab !== 'trofeos') {
                                playPages()
                                setTab('trofeos')
                            }
                        }}
                    >
                        {isEs ? 'Trofeos' : 'Trophies'}
                    </button>
                    <span className="trophies-tab-divider">|</span>
                    <button
                        type="button"
                        className={`trophies-tab ${tab === 'news' ? 'active' : ''}`}
                        onClick={() => {
                            if (tab !== 'news') {
                                playPages()
                                setTab('news')
                            }
                        }}
                    >
                        {isEs ? 'Noticias' : 'News'}
                    </button>
                </div>
            </div>

            <div className="trophies-content">
                {tab === 'trofeos' ? (
                    loading ? (
                        <div className="trophies-row">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="trophy-card shimmer" />
                            ))}
                        </div>
                    ) : achievements.length === 0 ? (
                        <div className="trophies-empty">
                            {isEs ? 'Este juego no tiene logros disponibles.' : 'This game has no achievements available.'}
                        </div>
                    ) : (
                        <div className="trophies-row">
                            {achievements.map((ach, i) => {
                                const iconUrl = ach.achieved ? ach.icon || '' : ach.icongray || ach.icon || ''
                                return (
                                    <div
                                        key={ach.apiname}
                                        ref={(el) => { trophyCardRefs.current[i] = el }}
                                        className={`trophy-card ${ach.achieved ? 'unlocked' : 'locked'} ${i === selectedTrophyIndex ? 'selected' : ''}`}
                                        onClick={() => {
                                            setSelectedTrophyIndex(i)
                                            playMove()
                                        }}
                                    >
                                        <div className="trophy-card-icon">
                                            {iconUrl ? (
                                                <img
                                                    src={iconUrl}
                                                    alt=""
                                                    draggable={false}
                                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                                                />
                                            ) : (
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                                                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                                                    <path d="M4 22h16" />
                                                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
                                                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
                                                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="trophy-card-name">{ach.displayName || ach.name || ach.apiname}</span>
                                        {ach.description && <span className="trophy-card-desc">{ach.description}</span>}
                                        {ach.achieved && ach.unlocktime > 0 && (
                                            <span className="trophy-card-date">
                                                {new Date(ach.unlocktime * 1000).toLocaleDateString(language, {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )
                ) : loadingNews && !newsFetched ? (
                    <div className="trophies-row">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="news-card shimmer" />
                        ))}
                    </div>
                ) : news.length === 0 ? (
                    <div className="trophies-empty">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginBottom: '12px' }}>
                            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                            <path d="M18 14h-8" />
                            <path d="M15 18h-5" />
                            <path d="M10 6h8v4h-8V6Z" />
                        </svg>
                        <div>{isEs ? 'No hay noticias recientes para este juego.' : 'No recent news available for this game.'}</div>
                    </div>
                ) : (
                    <div className="trophies-row">
                        {news.map((item, i) => (
                            <div
                                key={item.gid || i}
                                ref={(el) => { newsCardRefs.current[i] = el }}
                                className={`news-card ${i === selectedNewsIndex ? 'selected' : ''}`}
                                onClick={() => handleOpenNewsItem(item.url, i)}
                            >
                                {item.image_url ? (
                                    <img
                                        src={item.image_url}
                                        alt=""
                                        className="news-card-bg-img"
                                        loading="lazy"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).style.display = 'none'
                                        }}
                                    />
                                ) : (
                                    <div className="news-card-placeholder">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                                            <path d="M18 14h-8" />
                                            <path d="M15 18h-5" />
                                            <path d="M10 6h8v4h-8V6Z" />
                                        </svg>
                                    </div>
                                )}
                                <div className="news-card-overlay" />

                                <div className="news-card-content">
                                    <div className="news-card-top-row">
                                        <span className="news-card-date">{formatSteamDate(item.date)}</span>
                                    </div>

                                    <h3 className="news-card-title" title={item.title}>
                                        {item.title}
                                    </h3>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default TrophiesView