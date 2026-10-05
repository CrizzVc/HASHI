import { useState, useEffect, useCallback, useRef } from 'react'
import hashiLogo from '../assets/images/HASHI_LOGO_BLANCO.svg'
import { playNotification } from '../services/soundService'
import { translations, Language } from '../translations'

/** Códigos enviados por el main process cuando un lanzamiento falla. */
export type LaunchErrorCode =
  | 'wine_missing'
  | 'not_found'
  | 'no_launcher'
  | 'spawn_failed'
  | 'unknown'

export interface LaunchErrorNotificationData {
  id: string
  code: LaunchErrorCode
  detail: string | null
}

interface LaunchErrorNotificationProps {
  id: string
  code: LaunchErrorCode
  detail: string | null
  onDismiss: (id: string) => void
  language?: Language
}

function messageFor(code: LaunchErrorCode, t: (typeof translations)['en']): string {
  switch (code) {
    case 'wine_missing':
      return t.launchErrWine
    case 'not_found':
      return t.launchErrNotFound
    case 'no_launcher':
      return t.launchErrNoLauncher
    case 'spawn_failed':
      return t.launchErrSpawn
    default:
      return t.launchErrGeneric
  }
}

export default function LaunchErrorNotification({
  id,
  code,
  detail,
  onDismiss,
  language = 'en'
}: LaunchErrorNotificationProps): React.JSX.Element {
  const t = translations[language] || translations.en
  const [isExiting, setIsExiting] = useState(false)
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  const handleDismiss = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onDismissRef.current(id)
    }, 300)
  }, [id])

  useEffect(() => {
    playNotification()
  }, [])

  // Auto-dismiss (más largo que el resto: tiene información que leer)
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss()
    }, 10000)

    return () => clearTimeout(timer)
  }, [handleDismiss])

  return (
    <div
      className={`notification-card notification-card-update ${isExiting ? 'exiting' : ''}`}
      onClick={handleDismiss}
      title={detail ?? undefined}
    >
      <div className="notification-avatar notification-avatar-update">
        <div className="notification-avatar-placeholder">!</div>
      </div>
      <div className="notification-content">
        <div className="notification-update-header">
          <img src={hashiLogo} alt="HASHI" className="notification-hashi-logo" draggable={false} />
          <span className="notification-version-tag">ERROR</span>
        </div>
        <div className="notification-divider" />
        <div className="notification-title">{t.launchErrorTitle}</div>
        <div className="notification-subtitle">{messageFor(code, t)}</div>
        {detail ? <div className="notification-detail">{detail}</div> : null}
      </div>
    </div>
  )
}
