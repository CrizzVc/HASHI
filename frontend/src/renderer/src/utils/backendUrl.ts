const BACKEND_PORT_STORAGE_KEY = 'gbl-backend-port'

export function getBackendUrl(): string {
  try {
    const port = localStorage.getItem(BACKEND_PORT_STORAGE_KEY) || '3000'
    return `http://localhost:${port}`
  } catch { return 'http://localhost:3000' }
}
