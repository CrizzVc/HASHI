import React, { useState, useRef, useEffect } from 'react'
import { ChevronLeftIcon, ExtensionIcon, CloseIcon, GlobeIcon, UpdateIcon } from './Icons'

export interface LauncherExtension {
  id: string
  name: string
  description: string
  version: string
  type: 'external' | 'native' | 'embedded'
  entryUrl: string | null
  viewId: string | null
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

  const handleOpenExternal = () => {
    if (extension.entryUrl) {
      void window.api.openExternal(extension.entryUrl)
    }
  }

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
            title="Volver al menú principal (Esc)"
          >
            <ChevronLeftIcon size={18} />
            <span>Volver</span>
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
            title="Recargar vista"
          >
            <UpdateIcon size={16} />
            <span>Recargar</span>
          </button>
          {extension.entryUrl && (
            <button
              className="extension-view-btn"
              onClick={handleOpenExternal}
              title="Abrir en navegador externo"
            >
              <GlobeIcon size={16} />
              <span>Navegador</span>
            </button>
          )}
          <button
            className="extension-view-btn close-btn"
            onClick={onClose}
            title="Cerrar (Esc)"
          >
            <CloseIcon size={18} />
          </button>
        </div>
      </header>

      <div className="extension-view-frame-wrapper">
        {isLoading && (
          <div className="extension-view-loader">
            <div className="extension-spinner" />
            <p>Cargando {extension.name}...</p>
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
