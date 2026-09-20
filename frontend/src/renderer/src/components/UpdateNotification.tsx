import { useState, useEffect, useCallback, useRef } from 'react'
import appDefaultIcon from '../assets/images/icono.png'
import hashiLogo from '../assets/images/HASHI_LOGO_BLANCO.svg'
import { playNotification } from '../services/soundService'
import { translations, Language } from '../translations'

export interface UpdateNotificationData {
  id: string
  version: string
  link?: string
}

interface UpdateNotificationProps {
  id: string
  version: string
  link?: string
  onDismiss: (id: string) => void
  language?: Language
}

export default function UpdateNotification({
  id,
  version,
  link,
  onDismiss,
  language = 'es'
}: UpdateNotificationProps): React.JSX.Element {
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

  const handleClick = useCallback(() => {
    if (link && window.api?.openExternal) {
      window.api.openExternal(link)
    }
    handleDismiss()
  }, [link, handleDismiss])

  // Play notification sound on mount
  useEffect(() => {
    playNotification()
  }, [])

  // Auto-dismiss after 7 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss()
    }, 7000)

    return () => clearTimeout(timer)
  }, [handleDismiss])

  return (
    <div
      className={`notification-card notification-card-update ${isExiting ? 'exiting' : ''}`}
      onClick={handleClick}
      style={{ cursor: link ? 'pointer' : 'default' }}
      title={link ? t.updateAvailableDesc : undefined}
    >
      <div className="notification-avatar notification-avatar-update">
        <img
          src={appDefaultIcon}
          alt="HASHI"
          className="notification-avatar-img"
          draggable={false}
        />
      </div>
      <div className="notification-content">
        <div className="notification-steam-header notification-update-header">
          <img src={hashiLogo} alt="HASHI" className="notification-hashi-logo" draggable={false} />
          <span className="notification-version-tag">v{version}</span>
        </div>
        <div className="notification-divider" />
        <div className="notification-title">
          {t.updateAvailable}
        </div>
        <div className="notification-subtitle">
          {t.updateAvailableDesc} (v{version})
        </div>
      </div>
    </div>
  )
}
