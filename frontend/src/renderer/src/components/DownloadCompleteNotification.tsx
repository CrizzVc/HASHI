import { useState, useEffect, useCallback, useRef } from 'react'
import steamLogo from '../assets/tiendas/steamLogo.png'
import { playNotification } from '../services/soundService'
import { translations, Language } from '../translations'

interface DownloadCompleteNotificationProps {
  id: string
  name: string
  iconUrl: string | null
  onDismiss: (id: string) => void
  language?: Language
}

export default function DownloadCompleteNotification({ id, name, iconUrl, onDismiss, language = 'en' }: DownloadCompleteNotificationProps): React.JSX.Element {
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

  // Play notification sound only once when notification is mounted
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
    <div className={`notification-card ${isExiting ? 'exiting' : ''}`} onClick={handleDismiss}>
      <div className="notification-avatar">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={name}
            className="notification-avatar-img"
            draggable={false}
          />
        ) : (
          <div className="notification-avatar-placeholder">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="notification-content">
        <div className="notification-steam-header">
          <img src={steamLogo} alt="Steam" className="notification-steam-logo" draggable={false} />
        </div>
        <div className="notification-divider" />
        <div className="notification-title">
          {name} {t.installedSuccessfully}
        </div>
        <div className="notification-subtitle">{t.readyToPlay}</div>
      </div>
    </div>
  )
}

