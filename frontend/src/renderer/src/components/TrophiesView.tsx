import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeftIcon } from './Icons'
import { Language } from '../translations'

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
    steamAppId?: string | null
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
    const cardRefs = useRef<Array<HTMLElement | null>>([])
    const isEs = language === 'es'

    const unlockedCount = achievements.filter((a) => a.achieved).length
    const totalCount = achievements.length
    const progress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0

    useEffect(() => {
        const el = cardRefs.current[selectedIndex]
        if (!el) return
        const container = el.closest('.trophies-row') as HTMLElement | null
        if (!container) return
        const cardLeft = el.offsetLeft - container.offsetLeft
        const start = container.scrollLeft
        const distance = cardLeft - start
        if (distance === 0) return
        const duration = 400
        let startTime: number | null = null
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp
            const progress = Math.min((timestamp - startTime) / duration, 1)
            const ease = 1 - Math.pow(1 - progress, 3)
            container.scrollLeft = start + distance * ease
            if (progress < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
    }, [selectedIndex])

    const handleOpenSteamAchievements = (): void => {
        if (!steamAppId) return
        void window.api.openExternal(`https://steamcommunity.com/stats/${steamAppId}/achievements`)
    }

    return (
        <div className="trophies-view" aria-label={`${isEs ? 'Trofeos de' : 'Trophies for'} ${gameName}`}>
            <div className="trophies-header">
                {heroUrl && <div className="trophies-header-bg" style={{ backgroundImage: `url(${heroUrl})` }} />}

                <button className="trophies-close-button" onClick={onClose}>
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
                        onClick={() => setTab('trofeos')}
                    >
                        {isEs ? 'Trofeos' : 'Trophies'}
                    </button>
                    <span className="trophies-tab-divider">|</span>
                    <button
                        type="button"
                        className={`trophies-tab ${tab === 'news' ? 'active' : ''}`}
                        onClick={() => setTab('news')}
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
                                <div key={i} className="trophy-card shimmer" style={{ height: '150px' }} />
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
                                        ref={(el) => { cardRefs.current[i] = el }}
                                        className={`trophy-card ${ach.achieved ? 'unlocked' : 'locked'} ${i === selectedIndex ? 'selected' : ''}`}
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
                ) : (
                    <div className="trophies-news-placeholder">
                        {isEs ? 'Próximamente noticias de este juego.' : 'Game news coming soon.'}
                    </div>
                )}
            </div>
        </div>
    )
}

export default TrophiesView