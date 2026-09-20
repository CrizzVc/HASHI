export interface SteamAchievement {
  apiname: string
  achieved: number
  unlocktime: number
}

export interface SteamPlayerAchievementsResponse {
  playerstats?: {
    steamID: string
    gameName: string
    achievements?: SteamAchievement[]
    success: boolean
  }
}

export interface SteamGameAchievement {
  apiName: string
  name: string
  description: string
  icon: string
  lockedIcon: string
  achieved: boolean
  unlockTime: number
  globalPercentage: number | null
  rarity: 'platinum' | 'gold' | 'silver' | 'bronze'
}

export interface SteamGameAchievementsSummary {
  total: number
  unlocked: number
  rarityCounts: Record<SteamGameAchievement['rarity'], number>
  achievements: SteamGameAchievement[]
}

interface SteamSchemaAchievement {
  name: string
  displayName?: string
  description?: string
  icon?: string
  icongray?: string
}

const rarityForPercentage = (percentage: number | null): SteamGameAchievement['rarity'] => {
  if (percentage !== null && percentage <= 1) return 'platinum'
  if (percentage !== null && percentage <= 5) return 'gold'
  if (percentage !== null && percentage <= 15) return 'silver'
  return 'bronze'
}

// Cache en memoria
interface AchievementsCacheEntry {
  summary: SteamGameAchievementsSummary | null
  timestamp: number
}

const achievementsCache = new Map<string, AchievementsCacheEntry>()
const inFlightAchievements = new Map<string, Promise<SteamGameAchievementsSummary | null>>()
const CACHE_TTL_MS = 10 * 60 * 1000

export const getCachedSteamGameAchievements = (
  steamId: string,
  appId: number
): SteamGameAchievementsSummary | null | undefined => {
  const cacheKey = `${steamId}_${appId}`
  const entry = achievementsCache.get(cacheKey)
  if (!entry) return undefined
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    achievementsCache.delete(cacheKey)
    return undefined
  }
  return entry.summary
}

export const fetchSteamGameAchievements = async (
  apiKey: string,
  steamId: string,
  appId: number,
  forceRefresh = false
): Promise<SteamGameAchievementsSummary | null> => {
  const cacheKey = `${steamId}_${appId}`

  if (!forceRefresh) {
    const cached = getCachedSteamGameAchievements(steamId, appId)
    if (cached !== undefined) return cached
  }

  const inFlight = inFlightAchievements.get(cacheKey)
  if (inFlight) return inFlight

  const fetchPromise = (async () => {
    try {
      const playerUrl = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appId}&key=${apiKey}&steamid=${steamId}`
      const schemaUrl = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?appid=${appId}&key=${apiKey}`
      const percentagesUrl = `https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${appId}`

      const [playerResponse, schemaResponse, percentagesResponse] = await Promise.all([
        fetch(playerUrl),
        fetch(schemaUrl),
        fetch(percentagesUrl).catch(() => null)
      ])

      if (!playerResponse.ok || !schemaResponse.ok) {
        achievementsCache.set(cacheKey, { summary: null, timestamp: Date.now() })
        return null
      }

      const playerData: SteamPlayerAchievementsResponse = await playerResponse.json()
      const schemaData = await schemaResponse.json()
      const percentagesData = percentagesResponse?.ok ? await percentagesResponse.json() : null
      const playerAchievements = playerData.playerstats?.achievements
      const schemaAchievements: SteamSchemaAchievement[] = schemaData?.game?.availableGameStats?.achievements ?? []

      if (!playerData.playerstats?.success || !playerAchievements || schemaAchievements.length === 0) {
        achievementsCache.set(cacheKey, { summary: null, timestamp: Date.now() })
        return null
      }

      const playerByApiName = new Map(playerAchievements.map((a) => [a.apiname, a]))
      const percentageByApiName = new Map<string, number>(
        (percentagesData?.achievementpercentages?.achievements ?? [])
          .map((a: { name: string; percent: number | string }) => [a.name, Number(a.percent)] as const)
          .filter(([, pct]: readonly [string, number]) => Number.isFinite(pct))
      )

      const rarityCounts: SteamGameAchievementsSummary['rarityCounts'] = { platinum: 0, gold: 0, silver: 0, bronze: 0 }
      const achievements = schemaAchievements.map((schema) => {
        const player = playerByApiName.get(schema.name)
        const globalPercentage = percentageByApiName.get(schema.name) ?? null
        const rarity = rarityForPercentage(globalPercentage)
        const achieved = player?.achieved === 1
        if (achieved) rarityCounts[rarity] += 1
        return {
          apiName: schema.name,
          name: schema.displayName || schema.name,
          description: schema.description || '',
          icon: schema.icon || '',
          lockedIcon: schema.icongray || schema.icon || '',
          achieved,
          unlockTime: player?.unlocktime ?? 0,
          globalPercentage,
          rarity
        }
      })

      const summary: SteamGameAchievementsSummary = {
        total: achievements.length,
        unlocked: achievements.filter((a) => a.achieved).length,
        rarityCounts,
        achievements
      }

      achievementsCache.set(cacheKey, { summary, timestamp: Date.now() })
      return summary
    } catch (error) {
      console.error(`Error fetching Steam achievements for app ${appId}:`, error)
      return null
    } finally {
      inFlightAchievements.delete(cacheKey)
    }
  })()

  inFlightAchievements.set(cacheKey, fetchPromise)
  return fetchPromise
}

export const fetchSteamTrophiesCount = async (apiKey: string, steamId: string, appId: number): Promise<number> => {
  try {
    const url = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appId}&key=${apiKey}&steamid=${steamId}`
    const response = await fetch(url)
    if (!response.ok) return 0

    const data: SteamPlayerAchievementsResponse = await response.json()
    if (data.playerstats?.success && data.playerstats.achievements) {
      return data.playerstats.achievements.filter((a) => a.achieved === 1).length
    }
    return 0
  } catch (error) {
    console.error(`Error fetching trophies for app ${appId}:`, error)
    return 0
  }
}
