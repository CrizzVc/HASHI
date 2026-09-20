const BACKEND_URL = 'http://localhost:3000'

export interface SteamNewsItem {
    gid: string
    title: string
    url: string
    is_external_url: boolean
    author: string
    contents: string
    feedlabel: string
    date: number
    feedname: string
    feed_type: number
    appid: number
    image_url?: string
}

/**
 * Searches Steam's store for a game by name and returns its numeric appid via backend.
 */
export const searchSteamAppId = async (gameName: string): Promise<number | null> => {
    try {
        const response = await fetch(
            `${BACKEND_URL}/api/steam/resolve?term=${encodeURIComponent(gameName)}&lang=es`
        )
        if (!response.ok) return null
        const data = await response.json()
        if (data?.appid) {
            return Number(data.appid)
        }
        return null
    } catch (error) {
        console.error('[SteamNews] Error searching Steam App ID via backend:', error)
        return null
    }
}

/**
 * Fetches the latest news for a specific Steam app ID via backend proxy.
 */
export const fetchSteamNewsForApp = async (appid: number): Promise<SteamNewsItem[]> => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/steam/news/${appid}?count=10&lang=es`)
        if (!response.ok) return []
        const data = await response.json()
        return Array.isArray(data?.news) ? data.news : []
    } catch (error) {
        console.error('[SteamNews] Error fetching Steam news via backend:', error)
        return []
    }
}

/**
 * High-level helper: search for a game by name on Steam, then fetch its news via backend.
 */
export const fetchSteamNewsByName = async (gameName: string): Promise<SteamNewsItem[]> => {
    const appid = await searchSteamAppId(gameName)
    if (!appid) return []
    return fetchSteamNewsForApp(appid)
}

/**
 * Formats a Unix timestamp into a human-readable relative string.
 */
export const formatSteamDate = (timestamp: number): string => {
    const now = Date.now() / 1000
    const diff = now - timestamp
    if (diff < 3600) return `hace ${Math.max(1, Math.floor(diff / 60))} min`
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
    if (diff < 604800) return `hace ${Math.floor(diff / 86400)} días`
    const d = new Date(timestamp * 1000)
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}