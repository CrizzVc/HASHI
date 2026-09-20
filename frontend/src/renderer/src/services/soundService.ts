/**
 * Sound Service - Reproduce sonidos UI del launcher
 *  - move: navegación con flechas
 *  - enter: confirmación con Enter / click
 *  - enterGame: lanzar juego
 *  - closeUI: Escape / cerrar vista
 *  - achievement: logro desbloqueado
 *  - controllerConnected: mando conectado
 *  - controllerDisconnected: mando desconectado
 */

import moveUrl from '../assets/sounds/move.mp3'
import enterUrl from '../assets/sounds/enter.mp3'
import enterGameUrl from '../assets/sounds/enter_game.mp3'
import closeUrl from '../assets/sounds/close_UI.mp3'
import pagesUrl from '../assets/sounds/pages.mp3'
import homeUrl from '../assets/sounds/home.mp3'

const alertUrl = new URL('../assets/sounds/alerts.mp3', import.meta.url).href
const connectedUrl = new URL('../assets/sounds/Bconected.mp3', import.meta.url).href
const disconnectedUrl = new URL('../assets/sounds/Bdisconected.mp3', import.meta.url).href

type SoundName = 'move' | 'enter' | 'enterGame' | 'close' | 'achievement' | 'controllerConnected' | 'controllerDisconnected' | 'pages' | 'home'

const soundUrls: Record<SoundName, string> = {
  move: moveUrl,
  enter: enterUrl,
  enterGame: enterGameUrl,
  close: closeUrl,
  achievement: alertUrl,
  controllerConnected: connectedUrl,
  controllerDisconnected: disconnectedUrl,
  pages: pagesUrl,
  home: homeUrl
}

const audioCache = new Map<SoundName, HTMLAudioElement>()
let unlocked = false

function getAudio(name: SoundName): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  const cached = audioCache.get(name)
  if (cached) return cached
  const url = soundUrls[name]
  if (!url) return null
  try {
    const audio = new Audio(url)
    audio.preload = 'auto'
    audio.volume =
      name === 'move'
        ? 0.45
        : name === 'pages'
          ? 0.55
          : name === 'home'
            ? 0.65
            : name === 'enterGame'
              ? 0.65
              : name === 'achievement'
                ? 0.75
                : name === 'controllerConnected' || name === 'controllerDisconnected'
                  ? 0.8
                  : 0.55
    audioCache.set(name, audio)
    audio.load()
    return audio
  } catch {
    return null
  }
}

function unlockIfNeeded(): void {
  if (unlocked) return
  unlocked = true
  ;(Object.keys(soundUrls) as SoundName[]).forEach((k) => getAudio(k))
}

if (typeof window !== 'undefined') {
  const unlockEvents: (keyof WindowEventMap)[] = ['click', 'keydown', 'touchstart']
  const onFirstGesture = (): void => {
    unlockIfNeeded()
    unlockEvents.forEach((e) => window.removeEventListener(e, onFirstGesture))
  }
  unlockEvents.forEach((e) => window.addEventListener(e, onFirstGesture, { once: true, passive: true } as AddEventListenerOptions))
}

let lastMoveTime = 0
const MOVE_COOLDOWN_MS = 65

function play(name: SoundName): void {
  try {
    unlockIfNeeded()
    const audio = getAudio(name)
    if (!audio) return
    if (name === 'move') {
      const now = performance.now()
      if (now - lastMoveTime < MOVE_COOLDOWN_MS) {
        return
      }
      lastMoveTime = now
      const clone = audio.cloneNode() as HTMLAudioElement
      clone.volume = audio.volume
      clone.play().catch(() => {})
      return
    }
    audio.currentTime = 0
    audio.play().catch(() => {})
  } catch {}
}

export function playMove(): void {
  play('move')
}

export function playEnter(): void {
  play('enter')
}

export function playEnterGame(): void {
  play('enterGame')
}

export function playClose(): void {
  play('close')
}

export function playAchievementAlert(): void {
  play('achievement')
}

export function playNotification(): void {
  try {
    unlockIfNeeded()
    const audio = getAudio('achievement')
    if (!audio) return
    const clone = audio.cloneNode() as HTMLAudioElement
    clone.volume = audio.volume
    clone.play().catch(() => {})
  } catch {}
}

export function playControllerConnected(): void {
  play('controllerConnected')
}

export function playControllerDisconnected(): void {
  play('controllerDisconnected')
}

export function playPages(): void {
  play('pages')
}

export function playHome(): void {
  play('home')
}

export function preloadSounds(): void {
  unlockIfNeeded()
}
