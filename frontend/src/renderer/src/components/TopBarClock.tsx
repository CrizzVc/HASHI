import React, { useState, useEffect, memo } from 'react'

export const TopBarClock = memo(function TopBarClock(): React.JSX.Element {
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  )

  useEffect(() => {
    const tick = (): void => {
      setClock(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      )
    }
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  return <span className="header-clock">{clock}</span>
})

