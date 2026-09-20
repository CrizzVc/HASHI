import { useState, useRef, useEffect, useCallback } from 'react'
import { useSystemMedia } from '../hooks/useSystemMedia'
import { translations, Language, t as tInterp } from '../translations'
import {
  formatMediaTime,
  getAppIconName,
  sendMediaControl,
  getMediaControlTarget
} from '../services/systemMediaService'

interface Track {
  id: string
  title: string
  artist: string
  src: string
  fileName?: string
  color?: string
}

function formatLocalTime(sec: number): string {
  if (!sec || Number.isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function MusicNoteIcon({ size = 16 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}
function PauseIcon({ size = 16 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}
function SkipBackIcon({ size = 16 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="19 20 9 12 19 4 19 20" />
      <line x1="5" y1="19" x2="5" y2="5" />
    </svg>
  )
}
function SkipForwardIcon({ size = 16 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  )
}
function PlaySmallIcon({ size = 16 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v14c0 .86.94 1.39 1.66.9l10-7c.61-.43.61-1.37 0-1.8l-10-7A1.07 1.07 0 0 0 8 5.14z" />
    </svg>
  )
}
function MoreDotsIcon({ size = 16 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  )
}
function CastIcon({ size = 16 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="13" rx="3" />
      <path d="M9.5 21l2.5-3 2.5 3z" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Tiempo restante estilo iOS ("-3:20")
function formatRemaining(positionMs: number, durationMs: number): string {
  const remainingSec = Math.max(0, Math.round((durationMs - positionMs) / 1000))
  const m = Math.floor(remainingSec / 60)
  const s = remainingSec % 60
  return `-${m}:${s.toString().padStart(2, '0')}`
}

const FALLBACK_COLORS = ['#1DB954', '#e40d60', '#6a5acd', '#e67e22', '#2980b9', '#c0392b', '#16a085', '#8e44ad']

interface MusicPlayerProps {
  isVisible: boolean
  isIdle?: boolean
  isGameRunning?: boolean
  language?: Language
}

export default function MusicPlayer({ isVisible, isIdle = false, isGameRunning = false, language = 'en' }: MusicPlayerProps): React.JSX.Element {
  const t = translations[language] || translations.en
  const { nowPlaying } = useSystemMedia(isGameRunning)
  const systemActive = Boolean(nowPlaying)
  const systemTarget = getMediaControlTarget(nowPlaying)

  // Local fallback cuando no hay sesión del sistema — igual que WPS5 referencia: tracks precargados + import
  const [tracks, setTracks] = useState<Track[]>([])
  const [trackIndex, setTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [positionSec, setPositionSec] = useState(0)
  const [durationSec, setDurationSec] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [, setIsImporting] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const track = tracks[trackIndex] ?? null

  // Pausar audio local si el sistema toma el control (como WPS5)
  useEffect(() => {
    if (!systemActive || !audioRef.current) return
    audioRef.current.pause()
    setIsPlaying(false)
  }, [systemActive, nowPlaying?.id])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  // Cargar audio local cuando cambia track (solo si no hay sistema)
  useEffect(() => {
    if (systemActive || !track) return
    let cancelled = false
    const load = async (): Promise<void> => {
      const audio = audioRef.current
      if (!audio) return
      setPositionSec(0)
      setDurationSec(0)
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audio.src = track.src
      audio.load()
      if (isPlaying && !cancelled) {
        audio.play().catch(() => setIsPlaying(false))
      }
    }
    load()
    return () => { cancelled = true }
  }, [track?.src, trackIndex, systemActive]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (systemActive) return
    const audio = audioRef.current
    if (!audio || !track) return
    if (isPlaying) audio.play().catch(() => setIsPlaying(false))
    else audio.pause()
  }, [isPlaying, track, systemActive])

  const handleTimeUpdate = useCallback(() => {
    if (systemActive) return
    const audio = audioRef.current
    if (!audio) return
    setPositionSec(audio.currentTime)
  }, [systemActive])

  const handleLoadedMetadata = useCallback(() => {
    if (systemActive) return
    const audio = audioRef.current
    if (!audio) return
    setDurationSec(audio.duration || 0)
  }, [systemActive])

  const handleEnded = useCallback(() => {
    if (systemActive) return
    if (tracks.length === 0) return
    setTrackIndex((i) => (i + 1) % tracks.length)
  }, [tracks.length, systemActive])

  const togglePlay = useCallback(async () => {
    if (systemActive) {
      await sendMediaControl('play_pause', systemTarget)
      return
    }
    if (!track || !audioRef.current) return
    try {
      if (isPlaying) await audioRef.current.pause()
      else await audioRef.current.play()
    } catch { }
  }, [systemActive, systemTarget, track, isPlaying])

  const skipNext = useCallback(async () => {
    if (systemActive) {
      await sendMediaControl('next', systemTarget)
      return
    }
    if (tracks.length) setTrackIndex((i) => (i + 1) % tracks.length)
  }, [systemActive, systemTarget, tracks.length])

  const skipPrev = useCallback(async () => {
    if (systemActive) {
      await sendMediaControl('prev', systemTarget)
      return
    }
    const audio = audioRef.current
    if (audio && positionSec > 3) {
      audio.currentTime = 0
      return
    }
    if (tracks.length) setTrackIndex((i) => (i - 1 + tracks.length) % tracks.length)
  }, [systemActive, systemTarget, tracks.length, positionSec])

  // ── L1/R1 del mando (vía useGamepadNavigation) → pista anterior/siguiente ──
  useEffect(() => {
    const handleMediaKeys = (e: KeyboardEvent): void => {
      if (e.key === 'MediaTrackNext') {
        e.preventDefault()
        void skipNext()
      } else if (e.key === 'MediaTrackPrevious') {
        e.preventDefault()
        void skipPrev()
      }
    }
    window.addEventListener('keydown', handleMediaKeys)
    return () => window.removeEventListener('keydown', handleMediaKeys)
  }, [skipNext, skipPrev])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (systemActive) return
    const val = Number(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = val
      setPositionSec(val)
    }
  }, [systemActive])

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setIsImporting(true)
    const newTracks: Track[] = Array.from(files).map((file) => {
      const url = URL.createObjectURL(file)
      const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      return {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        artist: t.imported,
        src: url,
        fileName: file.name,
        color: FALLBACK_COLORS[tracks.length % FALLBACK_COLORS.length]
      }
    })
    setTracks((prev) => [...prev, ...newTracks])
    if (tracks.length === 0) setTrackIndex(0)
    setIsImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [tracks.length])

  // Display derivado — idéntico a la referencia WPS5
  const displayTitle = systemActive ? nowPlaying!.title : track?.title ?? null
  const displayArtist = systemActive ? nowPlaying!.artist : track?.artist ?? null
  const displayAlbum = systemActive ? nowPlaying!.albumTitle : undefined
  const displayArtwork = systemActive ? nowPlaying!.thumbnail : undefined
  const displayPositionMs = systemActive ? nowPlaying!.positionMs : positionSec * 1000
  const displayDurationMs = systemActive ? nowPlaying!.durationMs : durationSec * 1000
  const displayPlaying = systemActive ? nowPlaying!.playbackStatus === 'playing' : isPlaying
  const fallbackAccent = systemActive ? getAppIconName(nowPlaying!.appName).bg : (track?.color ?? '#1DB954')
  const headerLabel = systemActive ? tInterp(t.playingIn, { appName: nowPlaying!.appName }) : tracks.length > 0 ? t.localMusic : t.music
  const progress = displayDurationMs > 0 ? displayPositionMs / displayDurationMs : 0
  const canControl = systemActive || !!track

  // ── Degradado del fondo compacto a partir de la portada (tintado con colores extraídos) ──
  const [coverPalette, setCoverPalette] = useState<{ primary: string; secondary: string } | null>(null)
  useEffect(() => {
    if (!displayArtwork) {
      setCoverPalette(null)
      return
    }
    let cancelled = false
    const img = new Image()
    // No forzar crossOrigin: muchos thumbnails vienen de local-file:// o https sin CORS y tildarían el canvas.
    // Intentamos cargar normal; si tilda, el catch hará fallback al color de la app.
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
        let r = 0, g = 0, b = 0, count = 0
        let r2 = 0, g2 = 0, b2 = 0, count2 = 0
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4
            const alpha = data[i + 3]
            if (alpha < 10) continue
            if (y < h * 0.5) {
              r += data[i]; g += data[i + 1]; b += data[i + 2]; count++
            } else {
              r2 += data[i]; g2 += data[i + 1]; b2 += data[i + 2]; count2++
            }
          }
        }
        if (count === 0 || count2 === 0) return
        const avg = (v: number, c: number): number => Math.round(v / c)
        const toHex = (n: number): string => n.toString(16).padStart(2, '0')
        const primary = `#${toHex(avg(r, count))}${toHex(avg(g, count))}${toHex(avg(b, count))}`
        const secondary = `#${toHex(avg(r2, count2))}${toHex(avg(g2, count2))}${toHex(avg(b2, count2))}`
        if (!cancelled) setCoverPalette({ primary, secondary })
      } catch {
        // canvas tildado (cross-origin sin CORS) — fallback silencioso
        if (!cancelled) setCoverPalette(null)
      }
    }
    img.onerror = () => { if (!cancelled) setCoverPalette(null) }
    img.src = displayArtwork
    return () => { cancelled = true }
  }, [displayArtwork])

  const accentColor = coverPalette?.primary ?? fallbackAccent
  const compactBg = coverPalette
    ? `linear-gradient(90deg, ${coverPalette.primary} 0%, ${coverPalette.secondary} 5%, #1c1c1e 100%)`
    : undefined
  const compactBorder = coverPalette ? `${coverPalette.primary}22` : undefined

  const wrapperVisible = isVisible || isIdle

  // Sin nada que mostrar y sin sistema: mensaje vacío como referencia
  if (!systemActive && tracks.length === 0) {
    return (
      <div className={`music-player-wrapper ${wrapperVisible ? 'visible' : 'hidden'} ${isIdle ? 'idle' : ''}`} aria-hidden={!wrapperVisible}>
        <div className={`music-player ${isIdle ? 'idle' : ''} empty`} style={{ borderColor: isIdle ? accentColor : undefined } as React.CSSProperties}>
          <div className="music-player-cover" style={{ background: '#a9a9a9' } as React.CSSProperties}>
            <MusicNoteIcon size={isIdle ? 52 : 16} />
          </div>
          <div className="music-player-main">
            <div className="music-player-info">
              <span className="music-player-title muted">{t.noMusicPlaying}</span>
              <span className="music-player-artist">{isIdle ? t.noMusicPlaying : t.noMusicPlayingDesc}</span>
              {systemActive && <span className="music-player-source">{headerLabel}</span>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const hiddenAudio = (
    <audio
      ref={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleLoadedMetadata}
      onEnded={handleEnded}
      preload="metadata"
      style={{ display: 'none' }}
    />
  )

  const importInput = (
    <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.flac,.ogg,.m4a,.aac,.wav" multiple onChange={handleImport} style={{ display: 'none' }} />
  )

  // ── Vista compacta: pill con degradado de la portada (tonalidad de la carátula) ──
  if (!isIdle) {
    return (
      <div className={`music-player-wrapper ${wrapperVisible ? 'visible' : 'hidden'}`} aria-hidden={!wrapperVisible}>
        <div
          className={`music-player compact ${systemActive ? 'system' : 'local'}`}
          style={compactBg ? ({ background: compactBg, borderColor: compactBorder } as React.CSSProperties) : undefined}
        >
          {hiddenAudio}
          <div className="music-player-cover" style={{ background: displayArtwork ? `url(${displayArtwork}) center/cover` : accentColor } as React.CSSProperties}>
            {!displayArtwork && <MusicNoteIcon size={18} />}
          </div>

          <div className="music-player-info-row">
            <span className="music-player-title">{displayTitle || '—'}</span>
            <span className="music-player-artist">{displayArtist || '—'}</span>
          </div>

          <button className="music-btn more" onClick={togglePlay} disabled={!canControl}>
            <MoreDotsIcon size={16} />
          </button>

          {/* Controles reales, ocultos hasta hover para mantener el look minimal de la referencia */}
          <div className="music-player-hover-controls">
            <button className="music-btn" onClick={skipPrev} disabled={!canControl}>
              <SkipBackIcon size={13} />
            </button>
            <button
              className="music-btn play"
              onClick={togglePlay}
              disabled={!canControl}
              style={{ background: accentColor, borderColor: accentColor } as React.CSSProperties}
            >
              {displayPlaying ? <PauseIcon size={13} /> : <PlaySmallIcon size={13} />}
            </button>
            <button className="music-btn" onClick={skipNext} disabled={!canControl}>
              <SkipForwardIcon size={13} />
            </button>
            {!systemActive && (
              <button className="music-btn add" onClick={() => fileInputRef.current?.click()}>
                <span style={{ fontSize: '13px', lineHeight: 1 }}>+</span>
              </button>
            )}
          </div>
          {!systemActive && importInput}
        </div>
      </div>
    )
  }

  // ── Vista expandida (idle): tarjeta clara al estilo widget de música (imagen 2) ──
  return (
    <div className="music-player-wrapper idle" aria-hidden={!wrapperVisible}>
      <div className={`music-player idle ${systemActive ? 'system' : 'local'}`}>
        {hiddenAudio}
        <div className="music-player-cover" style={{ background: displayArtwork ? `url(${displayArtwork}) center/cover` : accentColor } as React.CSSProperties}>
          {!displayArtwork && <MusicNoteIcon size={56} />}
        </div>

        <div className="music-player-panel">
          <div className="music-player-info">
            <span className="music-player-title">{displayTitle || '—'}</span>
            <span className="music-player-artist">{displayArtist || '—'}{displayAlbum ? ` · ${displayAlbum}` : ''}</span>
          </div>

          <div className="music-player-progress">
            <span className="music-player-time">{formatMediaTime(displayPositionMs)}</span>
            <div className="music-player-progress-track">
              <div className="music-player-progress-fill" style={{ width: `${progress * 100}%`, background: accentColor } as React.CSSProperties} />
            </div>
            <span className="music-player-time">{displayDurationMs ? formatRemaining(displayPositionMs, displayDurationMs) : '--:--'}</span>
          </div>
          {!systemActive && (
            <input
              type="range"
              className="music-player-range"
              min={0}
              max={durationSec || 100}
              step={0.5}
              value={Math.min(positionSec, durationSec || 0)}
              onChange={handleSeek}
              disabled={!track || !durationSec}
              style={{ ['--progress' as string]: `${progress * 100}%` } as React.CSSProperties}
            />
          )}

          <div className="music-player-controls idle-controls">
            <button className="music-btn" onClick={skipPrev} disabled={!canControl}>
              <SkipBackIcon size={15} />
            </button>
            <button
              className="music-btn play"
              onClick={togglePlay}
              disabled={!canControl}
            >
              {displayPlaying ? <PauseIcon size={16} /> : <PlaySmallIcon size={16} />}
            </button>
            <button className="music-btn" onClick={skipNext} disabled={!canControl}>
              <SkipForwardIcon size={15} />
            </button>
            <button className="music-btn cast">
              <CastIcon size={15} />
            </button>
          </div>

          {!systemActive && (
            <div className="music-player-local-actions">
              <div className="music-player-volume">
                <span>{formatLocalTime(positionSec)} / {formatLocalTime(durationSec)}</span>
                <input type="range" className="music-player-volume-range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label={t.volume} />
              </div>
              <button className="music-btn add" onClick={() => fileInputRef.current?.click()}>
                <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span>
              </button>
              {importInput}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}