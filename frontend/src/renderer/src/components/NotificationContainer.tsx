import { useEffect, useRef } from 'react'
import Notification from './Notification'
import { playNotification } from '../services/soundService'
import { Language } from '../translations'

export interface NotificationItem {
  id: string
  friendName: string
  gameName: string
  avatarUrl: string | null
  timestamp: number
}

interface NotificationContainerProps {
  notifications: NotificationItem[]
  onDismiss: (id: string) => void
  language?: Language
}

export default function NotificationContainer({ notifications, onDismiss, language = 'en' }: NotificationContainerProps): React.JSX.Element {
  const prevCountRef = useRef(notifications.length)

  useEffect(() => {
    if (notifications.length > prevCountRef.current) {
      playNotification()
    }
    prevCountRef.current = notifications.length
  }, [notifications.length])

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
          language={language}
        />
      ))}
    </div>
  )
}