const STEAM_DECK_REPO_BASE_URL = 'https://steamdeckrepo.com'

export type SteamDeckRepoVideoType = 'boot' | 'suspend' | 'all'
export type SteamDeckRepoSort = 'newest' | 'oldest' | 'likes' | 'downloads' | 'title'

export interface SteamDeckRepoPost {
  id: string
  title: string
  thumbnail: string
  video: string
  url: string
  likes: number
  downloads: number
  type: string
  target: 'boot' | 'suspend'
  author: string
  previewImage: string
  previewVideo: string
  downloadUrl: string
  sourceUrl: string
}

export interface SteamDeckRepoSearchOptions {
  query?: string
  type?: SteamDeckRepoVideoType
  sort?: SteamDeckRepoSort
  page?: number
  limit?: number
}

export interface SteamDeckRepoSearchResult {
  items: SteamDeckRepoPost[]
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

let postsCache: SteamDeckRepoPost[] | null = null
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000
let fetchPromise: Promise<SteamDeckRepoPost[]> | null = null

function normalizePost(post: any): SteamDeckRepoPost {
  const isSuspend = post.type === 'suspend_video'
  return {
    id: String(post.id),
    title: post.title || 'Untitled',
    thumbnail: post.thumbnail || '',
    video: post.video || '',
    url: post.url || `${STEAM_DECK_REPO_BASE_URL}/post/${post.id}`,
    likes: Number(post.likes || 0),
    downloads: Number(post.downloads || 0),
    type: post.type || '',
    target: isSuspend ? 'suspend' : 'boot',
    author: post.user?.steam_name || post.user?.username || 'Unknown',
    previewImage: post.thumbnail || '',
    previewVideo: post.video || '',
    downloadUrl: `${STEAM_DECK_REPO_BASE_URL}/post/download/${post.id}`,
    sourceUrl: post.url || `${STEAM_DECK_REPO_BASE_URL}/post/${post.id}`
  }
}

export async function fetchSteamDeckRepoPosts(forceRefresh = false): Promise<SteamDeckRepoPost[]> {
  const now = Date.now()
  if (!forceRefresh && postsCache && now - lastFetchTime < CACHE_DURATION) return postsCache
  if (fetchPromise) return fetchPromise

  fetchPromise = (async () => {
    try {
      const result = await window.api.fetchSteamDeckRepoPosts()
      if (!result.success || !result.posts) {
        throw new Error(result.error || 'Failed to fetch posts')
      }
      const posts = Array.isArray(result.posts) ? result.posts : []
      postsCache = posts.map(normalizePost).filter(p => p.type === 'boot_video' || p.type === 'suspend_video')
      lastFetchTime = Date.now()
      return postsCache
    } finally {
      fetchPromise = null
    }
  })()
  return fetchPromise
}

export async function searchSteamDeckRepo(options: SteamDeckRepoSearchOptions = {}): Promise<SteamDeckRepoSearchResult> {
  const { query = '', type = 'all', sort = 'newest', page = 1, limit = 24 } = options
  const posts = await fetchSteamDeckRepoPosts()
  const normalizedQuery = query.trim().toLowerCase()
  let results = [...posts]

  if (type !== 'all') results = results.filter(p => p.target === type)
  if (normalizedQuery) {
    results = results.filter(p =>
      (p.title?.toLowerCase() || '').includes(normalizedQuery) ||
      (p.author?.toLowerCase() || '').includes(normalizedQuery)
    )
  }

  results.sort((a, b) => {
    switch (sort) {
      case 'likes': return b.likes - a.likes
      case 'downloads': return b.downloads - a.downloads
      case 'title': return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
      case 'oldest': return getPostDate(a).getTime() - getPostDate(b).getTime()
      case 'newest':
      default: return getPostDate(b).getTime() - getPostDate(a).getTime()
    }
  })

  const safePage = Math.max(1, page)
  const safeLimit = Math.max(1, limit)
  const total = results.length
  const totalPages = Math.ceil(total / safeLimit)
  const start = (safePage - 1) * safeLimit
  const items = results.slice(start, start + safeLimit)

  return { items, page: safePage, limit: safeLimit, total, totalPages, hasNextPage: safePage < totalPages, hasPreviousPage: safePage > 1 }
}

export function getSteamDeckRepoDownloadUrl(id: string): string {
  return `${STEAM_DECK_REPO_BASE_URL}/post/download/${id}`
}

export function clearSteamDeckRepoCache(): void {
  postsCache = null
  lastFetchTime = 0
}

function getPostDate(post: SteamDeckRepoPost): Date {
  const d = (post as any).updated_at || (post as any).created_at
  if (!d) return new Date(0)
  const parsed = new Date(d)
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed
}
