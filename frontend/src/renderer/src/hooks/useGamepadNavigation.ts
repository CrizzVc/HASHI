import { useEffect, useRef } from 'react'

type NavKey =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Enter'
  | 'Escape'
  | 'MediaTrackPrevious'
  | 'MediaTrackNext'
  | 'BrowserBack'
  | 'BrowserForward'
  | 'ContextMenu'
  | 'GamepadTouchpad'
  | 'Start'

const DEADZONE = 0.4
const INITIAL_DELAY_MS = 380 // demora antes de empezar a repetir al mantener presionado
const REPEAT_INTERVAL_MS = 150 // velocidad de repetición (typematic) para navegación direccional

// Mapeo estándar del Gamepad API (layout tipo Xbox/PlayStation en "standard mapping")
// 12-15: D-pad arriba/abajo/izquierda/derecha · 0: A / Cross · 1: B / Circle
// 4: L1/LB · 5: R1/RB → cambiar biblioteca/Steam
// 6: L2/LT · 7: R2/RT → control de música (pista anterior/siguiente)
// 8: Select/Back · 16/17: touchpad (según mando)
const BUTTON_MAP: Record<number, NavKey> = {
  12: 'ArrowUp',
  13: 'ArrowDown',
  14: 'ArrowLeft',
  15: 'ArrowRight',
  0: 'Enter',
  1: 'Escape',
  4: 'BrowserBack',
  5: 'BrowserForward',
  6: 'MediaTrackPrevious',
  7: 'MediaTrackNext',
  8: 'ContextMenu',
  9: 'Start',
  16: 'GamepadTouchpad',
  17: 'GamepadTouchpad'
}

const SNAPBACK_GUARD_MS = 80 // Evita rebote de stick o micro-fluctuaciones de zona muerta

// Enter/Escape no deben "repetirse" solo por mantener el botón presionado
const REPEATABLE_KEYS: NavKey[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

function dispatchNavKey(key: NavKey): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

/**
 * Traduce el input de un mando conectado (D-pad, stick izquierdo y
 * botones A/B) a los mismos eventos `keydown` que ya escucha el manejador
 * de teclado en App.tsx (ArrowUp/Down/Left/Right, Enter, Escape).
 *
 * Al reutilizar el mismo canal de eventos, toda la navegación existente
 * (sidebar, biblioteca, wallpaper mode, detalle de juego, etc.) funciona
 * automáticamente con el mando, sin duplicar lógica.
 *
 * Uso en App.tsx:
 *   useGamepadNavigation(isControllerConnected)
 */
export function useGamepadNavigation(enabled: boolean = true): void {
  // Guarda, por cada tecla virtual, cuándo debe repetirse, si ya se disparó y cuándo fue la última vez
  const heldRef = useRef<Record<NavKey, { next: number; fired: boolean; lastFired: number }>>({
    ArrowUp: { next: 0, fired: false, lastFired: 0 },
    ArrowDown: { next: 0, fired: false, lastFired: 0 },
    ArrowLeft: { next: 0, fired: false, lastFired: 0 },
    ArrowRight: { next: 0, fired: false, lastFired: 0 },
    Enter: { next: 0, fired: false, lastFired: 0 },
    Escape: { next: 0, fired: false, lastFired: 0 },
    MediaTrackPrevious: { next: 0, fired: false, lastFired: 0 },
    MediaTrackNext: { next: 0, fired: false, lastFired: 0 },
    BrowserBack: { next: 0, fired: false, lastFired: 0 },
    BrowserForward: { next: 0, fired: false, lastFired: 0 },
    ContextMenu: { next: 0, fired: false, lastFired: 0 },
    GamepadTouchpad: { next: 0, fired: false, lastFired: 0 },
    Start: { next: 0, fired: false, lastFired: 0 }
  })

  useEffect(() => {
    if (!enabled) return

    let rafId: number

    const poll = (): void => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : []
      const now = performance.now()
      const pressed: Partial<Record<NavKey, boolean>> = {}

      for (const pad of pads) {
        if (!pad) continue

        // Botones (D-pad + A/B)
        for (const [idxStr, key] of Object.entries(BUTTON_MAP)) {
          const idx = Number(idxStr)
          if (pad.buttons[idx]?.pressed) pressed[key as NavKey] = true
        }

        // Stick izquierdo como alternativa al D-pad (con zona muerta)
        const x = pad.axes[0] ?? 0
        const y = pad.axes[1] ?? 0
        if (x < -DEADZONE) pressed.ArrowLeft = true
        if (x > DEADZONE) pressed.ArrowRight = true
        if (y < -DEADZONE) pressed.ArrowUp = true
        if (y > DEADZONE) pressed.ArrowDown = true
      }

      ; (Object.keys(heldRef.current) as NavKey[]).forEach((key) => {
        const isPressed = !!pressed[key]
        const state = heldRef.current[key]

        if (!isPressed) {
          state.fired = false
          state.next = 0
          return
        }

        if (!state.fired) {
          // Si soltó y volvió a pulsar demasiado rápido (rebote de stick), ignorar micro-pulsación
          if (now - state.lastFired < SNAPBACK_GUARD_MS) {
            return
          }
          // Primera pulsación: dispara de inmediato
          dispatchNavKey(key)
          state.fired = true
          state.lastFired = now
          state.next = REPEATABLE_KEYS.includes(key) ? now + INITIAL_DELAY_MS : Infinity
          return
        }

        if (REPEATABLE_KEYS.includes(key) && now >= state.next) {
          // Mantenido: repite mientras siga presionado (solo direccionales)
          dispatchNavKey(key)
          state.lastFired = now
          state.next = now + REPEAT_INTERVAL_MS
        }
      })

      rafId = requestAnimationFrame(poll)
    }

    rafId = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(rafId)
  }, [enabled])
}