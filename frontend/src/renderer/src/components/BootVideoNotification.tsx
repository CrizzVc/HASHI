import { useState, useEffect, useCallback, useRef } from 'react'
import hashiLogo from '../assets/images/HASHI_LOGO_BLANCO.svg'
import { playNotification } from '../services/soundService'
import { translations, Language } from '../translations'

export interface BootVideoNotificationData {
  id: string
  title: string
  thumbnail?: string | null
  target?: 'boot' | 'suspend'
}

interface BootVideoNotificationProps {
  id: string
  title: string
  thumbnail?: string | null
  target?: 'boot' | 'suspend'
  onDismiss: (id: string) => void
  language?: Language
}

export default function BootVideoNotification({
  id,
  title,
  thumbnail,
  target = 'boot',
  onDismiss,
  language = 'es'
}: BootVideoNotificationProps): React.JSX.Element {
  const t = translations[language] || translations.es
  const [isExiting, setIsExiting] = useState(false)
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  const handleDismiss = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onDismissRef.current(id)
    }, 300)
  }, [id])

  // Play notification sound on mount
  useEffect(() => {
    playNotification()
  }, [])

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss()
    }, 5000)

    return () => clearTimeout(timer)
  }, [handleDismiss])

  return (
    <div
      className={`notification-card notification-card-bootvideo ${isExiting ? 'exiting' : ''}`}
      onClick={handleDismiss}
      style={{ cursor: 'pointer' }}
    >
      <div className="notification-avatar notification-avatar-bootvideo">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="notification-avatar-img"
            draggable={false}
          />
        ) : (
          <div className="notification-avatar-placeholder">
            ▶
          </div>
        )}
      </div>
      <div className="notification-content">
        <div className="notification-steam-header notification-bootvideo-header">
          <img src={hashiLogo} alt="HASHI" className="notification-hashi-logo" draggable={false} />
          <span className="notification-bootvideo-tag">
            {target === 'suspend' ? 'SUSPEND VIDEO' : (language === 'es' ? 'VIDEO DE ARRANQUE' : 'BOOT VIDEO')}
          </span>
        </div>
        <div className="notification-divider" />
        <div className="notification-title" title={title}>
          {title}
        </div>
        <div className="notification-subtitle">
          {t.bootVideoDownloadSuccessDesc}
        </div>
      </div>
    </div>
  )
}
