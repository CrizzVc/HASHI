import React, { useState, useRef, useEffect } from 'react'
import { ChevronLeftIcon, ExtensionIcon, CloseIcon, UpdateIcon } from './Icons'

export interface LauncherExtension {
  id: string
  name: string
  description: string
  version: string
  type: 'external' | 'native' | 'embedded'
  entryUrl: string | null
  viewId: string | null
  backendEntry?: string | null
  sidebar: boolean
  enabled: boolean
}

interface ExtensionViewProps {
  extension: LauncherExtension
  onClose: () => void
}

const ExtensionView: React.FC<ExtensionViewProps> = ({ extension, onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [key, setKey] = useState(0)

  const handleReload = () => {
    setIsLoading(true)
    setKey((prev) => prev + 1)
  }

  useEffect(() => {
    void window.api.openExtensionSession(extension.id)
    return () => {
      void window.api.closeExtensionSession(extension.id)
    }
  }, [extension.id])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const entryUrl = extension.entryUrl || 'about:blank'

  return (
    <div className="extension-view-overlay" role="dialog" aria-label={extension.name}>
      <header className="extension-view-header">
        <div className="extension-view-left">
          <button
            className="extension-view-btn back-btn"
            onClick={onClose}
            title="Back to main menu (Esc)"
          >
            <ChevronLeftIcon size={18} />
            <span>Back</span>
          </button>
          <div className="extension-view-info">
            <div className="extension-view-badge">
              <ExtensionIcon size={16} />
              <span className="extension-view-name">{extension.name}</span>
              <span className="extension-view-ver">v{extension.version}</span>
            </div>
          </div>
        </div>

        <div className="extension-view-right">
          <button
            className="extension-view-btn"
            onClick={handleReload}
            title="Reload view"
          >
            <UpdateIcon size={16} />
            <span>Reload</span>
          </button>
          <button
            className="extension-view-btn close-btn"
            onClick={onClose}
            title="Close (Esc)"
          >
            <CloseIcon size={18} />
          </button>
        </div>
      </header>

      <div className="extension-view-frame-wrapper">
        {isLoading && (
          <div className="extension-view-loader">
            <div className="extension-spinner" />
            <p>Loading {extension.name}...</p>
          </div>
        )}
        <iframe
          ref={iframeRef}
          key={key}
          src={entryUrl}
          className="extension-view-iframe"
          title={extension.name}
          allow="fullscreen; autoplay; clipboard-read; clipboard-write"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  )
}

export default ExtensionView
