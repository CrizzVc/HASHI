import { useState, useEffect, useCallback, useRef } from 'react'
import { translations, Language } from '../translations'
import steamLogo from '../assets/tiendas/steamLogo.png'

export interface NotificationData {
  id: string
  friendName: string
  gameName: string
  avatarUrl: string | null
  timestamp: number
  language?: Language
}

interface NotificationProps {
  notification: NotificationData
  onDismiss: (id: string) => void
  language?: Language
}

export default function Notification({ notification, onDismiss, language = 'en' }: NotificationProps): React.JSX.Element {
  const t = translations[language] || translations.en
  const [isExiting, setIsExiting] = useState(false)
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  const handleDismiss = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onDismissRef.current(notification.id)
    }, 300)
  }, [notification.id])

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss()
    }, 5000)

    return () => clearTimeout(timer)
  }, [handleDismiss])

  return (
    <div className={`notification-card ${isExiting ? 'exiting' : ''}`}>
      <div className="notification-avatar">
        {notification.avatarUrl ? (
          <img
            src={notification.avatarUrl}
            alt={notification.friendName}
            className="notification-avatar-img"
            draggable={false}
          />
        ) : (
          <div className="notification-avatar-placeholder">
            {notification.friendName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="notification-content">
        <div className="notification-steam-header">
          <img src={steamLogo} alt="Steam" className="notification-steam-logo" draggable={false} />
        </div>
        <div className="notification-divider" />
        <div className="notification-title">
          {notification.friendName} {t.playingGame} {notification.gameName}
        </div>
        <div className="notification-subtitle">{t.playingGameDesc}</div>
      </div>
    </div>
  )
}