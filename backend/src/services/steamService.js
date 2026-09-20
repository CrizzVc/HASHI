const STORE_API = 'https://store.steampowered.com/api/appdetails';
const REVIEWS_API = 'https://store.steampowered.com/appreviews';
const STEAMSPY_API = 'https://steamspy.com/api.php';

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = Number(process.env.CACHE_DURATION_MS || 3600000); // 1 hour default

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

const LANG_MAP = { es: 'es', en: 'en' };
const ACCEPT_LANG_MAP = { es: 'es-419,es;q=0.9,en;q=0.8', en: 'en-US,en;q=0.9,es;q=0.8' };

function getLangParams(lang) {
  const l = LANG_MAP[lang] || 'es';
  const acceptLang = ACCEPT_LANG_MAP[lang] || ACCEPT_LANG_MAP.es;
  return { l, acceptLang };
}

/**
 * Get Steam AppID from a game name via the Steam Store search endpoint.
 * @param {string} term - Game name
 * @param {{ lang?: string }} options
 * @returns {Promise<{appid: number, name: string} | null>}
 */
export async function resolveAppId(term, { lang } = {}) {
  const { l, acceptLang } = getLangParams(lang);
  const key = `resolve:${lang || 'es'}:${term}`;
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=${l}&cc=us`,
      { headers: { 'Accept-Language': acceptLang } }
    );
    if (!res.ok) {
      throw new Error(`Steam search error ${res.status}`);
    }
    const json = await res.json();
    const item = json.items && json.items[0];
    const result = item ? { appid: item.id, name: item.name } : null;
    setCache(key, result);
    return result;
  } catch (err) {
    console.error('[SteamService] Error resolviendo appid:', err.message);
    return null;
  }
}

/**
 * Get store details (including screenshots) for a Steam AppID.
 * @param {number|string} appid - Steam AppID
 * @param {{ lang?: string }} options
 * @returns {Promise<Array>} Array of screenshot objects
 */
export async function getScreenshots(appid, { lang } = {}) {
  const { l, acceptLang } = getLangParams(lang);
  const key = `shots:${lang || 'es'}:${appid}`;
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const res = await fetch(`${STORE_API}?appids=${appid}&l=${l}`, {
      headers: { 'Accept-Language': acceptLang }
    });
    if (!res.ok) {
      throw new Error(`Steam appdetails error ${res.status}`);
    }
    const json = await res.json();
    const data = json[appid];
    const screenshots =
      data && data.success && data.data && data.data.screenshots
        ? data.data.screenshots
        : [];
    setCache(key, screenshots);
    return screenshots;
  } catch (err) {
    console.error('[SteamService] Error obteniendo screenshots:', err.message);
    return [];
  }
}

/**
 * Get a review summary (score description + total count) for a Steam AppID.
 * @param {number|string} appid - Steam AppID
 * @param {{ dayRange?: number, reviewType?: string, lang?: string }} options
 * @returns {Promise<{summary: string, count: number} | null>}
 */
async function fetchReviewSummary(appid, { dayRange, reviewType = 'all', lang } = {}) {
  const { acceptLang } = getLangParams(lang);
  const params = new URLSearchParams({
    json: '1',
    language: 'all',
    review_type: reviewType,
    purchase_type: 'all',
    num_per_page: '0'
  });
  if (dayRange) params.set('day_range', String(dayRange));

  const res = await fetch(`${REVIEWS_API}/${appid}?${params.toString()}`, {
    headers: { 'Accept-Language': acceptLang }
  });
  if (!res.ok) {
    throw new Error(`Steam reviews error ${res.status}`);
  }
  const json = await res.json();
  const summary = json.query_summary;
  if (!summary) return null;

  return {
    summary: summary.review_score_desc || 'Sin reseñas',
    count: summary.total_reviews || 0
  };
}

/**
 * Get community tags for a Steam AppID via SteamSpy.
 * @param {number|string} appid - Steam AppID
 * @returns {Promise<string[]>}
 */
async function fetchTags(appid) {
  try {
    const res = await fetch(`${STEAMSPY_API}?request=appdetails&appid=${appid}`);
    if (!res.ok) {
      throw new Error(`SteamSpy error ${res.status}`);
    }
    const json = await res.json();
    if (json && json.tags && typeof json.tags === 'object' && !Array.isArray(json.tags)) {
      return Object.keys(json.tags).slice(0, 6);
    }
  } catch (err) {
    console.error('[SteamService] Error obteniendo tags de SteamSpy:', err.message);
  }
  return [];
}

/**
 * Pick a single content rating board from Steam's `ratings` object
 * (ESRB preferred since the store search runs with cc=us, falls back to
 * whatever board the region/game actually has — PEGI, USK, etc.).
 * @param {object|undefined} ratings - the `ratings` field from appdetails
 * @returns {{ board: string, rating: string|null, descriptors: string[] } | null}
 */
function pickRating(ratings) {
  if (!ratings || typeof ratings !== 'object') return null;

  console.log('[SteamService] ratings raw:', JSON.stringify(ratings));
  const preferredOrder = ['esrb', 'pegi', 'usk', 'dejus', 'oflc', 'cero', 'nzoflc'];
  const boardKey = preferredOrder.find((key) => ratings[key]) || Object.keys(ratings)[0];
  if (!boardKey) return null;

  const board = ratings[boardKey];
  if (!board) return null;

  console.log('[SteamService] boardKey:', boardKey, 'board:', JSON.stringify(board));
  return {
    board: boardKey.toUpperCase(),
    rating: board.rating || null,
    descriptors: board.descriptors
      ? board.descriptors.split(',').map((d) => d.trim()).filter(Boolean)
      : []
  };
}

/**
 * Get full store details for a Steam AppID: description, developer, publisher,
 * release date, recent/all review summaries and community tags.
 * @param {number|string} appid - Steam AppID
 * @param {{ lang?: string }} options
 * @returns {Promise<object|null>}
 */
export async function getAppDetails(appid, { lang } = {}) {
  const { l, acceptLang } = getLangParams(lang);
  const key = `details:${lang || 'es'}:${appid}`;
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const res = await fetch(`${STORE_API}?appids=${appid}&l=${l}`, {
      headers: { 'Accept-Language': acceptLang }
    });
    if (!res.ok) {
      throw new Error(`Steam appdetails error ${res.status}`);
    }
    const json = await res.json();
    const entry = json[appid];
    if (!entry || !entry.success || !entry.data) {
      return null;
    }
    const data = entry.data;

    const [reviewsRecent, reviewsAll, reviewsPositive, reviewsNegative, tags] = await Promise.all([
      fetchReviewSummary(appid, { dayRange: 30, lang }).catch((err) => {
        console.error('[SteamService] Error obteniendo reseñas recientes:', err.message);
        return null;
      }),
      fetchReviewSummary(appid, { lang }).catch((err) => {
        console.error('[SteamService] Error obteniendo reseñas totales:', err.message);
        return null;
      }),
      fetchReviewSummary(appid, { reviewType: 'positive', lang }).catch((err) => {
        console.error('[SteamService] Error obteniendo reseñas positivas:', err.message);
        return null;
      }),
      fetchReviewSummary(appid, { reviewType: 'negative', lang }).catch((err) => {
        console.error('[SteamService] Error obteniendo reseñas negativas:', err.message);
        return null;
      }),
      fetchTags(appid)
    ]);

    const result = {
      description: data.short_description || data.about_the_game || null,
      developer:
        Array.isArray(data.developers) && data.developers.length
          ? data.developers.join(', ')
          : null,
      publisher:
        Array.isArray(data.publishers) && data.publishers.length
          ? data.publishers.join(', ')
          : null,
      releaseDate: data.release_date?.date || null,
      reviewsRecent,
      reviewsAll,
      reviewsPositive,
      reviewsNegative,
      tags: tags.length
        ? tags
        : Array.isArray(data.genres)
          ? data.genres.map((g) => g.description)
          : [],
      metacritic:
        data.metacritic && typeof data.metacritic.score === 'number'
          ? { score: data.metacritic.score, url: data.metacritic.url || null }
          : null,
      rating: pickRating(data.ratings)
    };

    setCache(key, result);
    return result;
  } catch (err) {
    console.error('[SteamService] Error obteniendo detalles:', err.message);
    return null;
  }
}

export async function resolveSteamId(apiKey, steamIdentifier) {
  const trimmed = steamIdentifier.trim();
  if (!trimmed) return null;

  const vanityUrl = /^[0-9]+$/.test(trimmed)
    ? null
    : `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${encodeURIComponent(apiKey)}&vanityurl=${encodeURIComponent(trimmed)}`;

  if (vanityUrl) {
    const res = await fetch(vanityUrl);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.response?.steamid || null;
  }

  return trimmed;
}

export async function getSteamFriends({ key, steamId }) {
  try {
    const listRes = await fetch(
      `https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=${encodeURIComponent(key)}&steamid=${encodeURIComponent(steamId)}&relationship=friend`
    );
    if (!listRes.ok) {
      throw new Error(`Steam friends error ${listRes.status}`);
    }

    const listJson = await listRes.json();
    const friends = Array.isArray(listJson?.friendslist?.friends) ? listJson.friendslist.friends : [];
    if (!friends.length) {
      return [];
    }

    const limitedFriends = friends.slice(0, 100);
    const friendIds = limitedFriends.map((friend) => String(friend.steamid));
    const summariesRes = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${encodeURIComponent(key)}&steamids=${encodeURIComponent(friendIds.join(','))}`
    );
    if (!summariesRes.ok) {
      throw new Error(`Steam friend summaries error ${summariesRes.status}`);
    }

    const summariesJson = await summariesRes.json();
    const players = Array.isArray(summariesJson?.response?.players) ? summariesJson.response.players : [];
    const playersById = new Map(players.map((player) => [String(player.steamid), player]));

    const mappedFriends = limitedFriends
      .map((friend) => {
        const player = playersById.get(String(friend.steamid));
        const avatarUrl = player?.avatarfull || player?.avatar || null;
        return {
          steamid: String(friend.steamid),
          personaname: player?.personaname || 'Steam friend',
          avatar: player?.avatar || null,
          avatarfull: avatarUrl,
          profileurl: player?.profileurl || null,
          personastate: Number(player?.personastate || 0),
          gameid: player?.gameid || null,
          gameextrainfo: player?.gameextrainfo || null
        };
      })
      .filter((friend) => Boolean(friend.avatarfull));

    return mappedFriends;
  } catch (err) {
    console.error('[SteamService] Error obteniendo amigos:', err.message);
    return [];
  }
}

export async function getSteamProfileBackground(steamId) {
  const cacheKey = `profile-background:${steamId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`https://steamcommunity.com/profiles/${encodeURIComponent(steamId)}/`, {
      headers: { 'User-Agent': 'GBL Steam Friends/1.0' }
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/class="profile_background_image"[^>]*style="[^"]*url\(\s*['"]?([^'"\)\s]+)['"]?\s*\)/i);
    const backgroundUrl = match?.[1] ? decodeHtmlEntities(match[1]) : null;
    if (backgroundUrl) setCache(cacheKey, backgroundUrl);
    return backgroundUrl;
  } catch (err) {
    console.error('[SteamService] Error obteniendo fondo de perfil:', err.message);
    return null;
  }
}

function decodeHtmlEntities(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
}

export async function getSteamAchievements({ key, steamId, appid, lang }) {
  const steamLang = lang === 'es' ? 'spanish' : 'english';
  const achievementsKey = `achievements:${key}:${steamId}:${appid}:${steamLang}`;
  const cached = getCached(achievementsKey);
  if (cached) return cached;

  try {
    const playerUrl = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v2/?key=${encodeURIComponent(key)}&steamid=${encodeURIComponent(steamId)}&appid=${encodeURIComponent(appid)}&l=${encodeURIComponent(steamLang)}`;
    const schemaUrl = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?appid=${encodeURIComponent(appid)}&key=${encodeURIComponent(key)}`;

    const [playerRes, schemaRes] = await Promise.all([
      fetch(playerUrl),
      fetch(schemaUrl).catch(() => null)
    ]);

    if (!playerRes.ok) {
      if (playerRes.status === 404) {
        setCache(achievementsKey, []);
        return [];
      }
      throw new Error(`Steam achievements error ${playerRes.status}`);
    }

    const playerJson = await playerRes.json();
    const achievements = Array.isArray(playerJson?.playerstats?.achievements)
      ? playerJson.playerstats.achievements
      : [];

    let schemaMap = {};
    if (schemaRes && schemaRes.ok) {
      try {
        const schemaJson = await schemaRes.json();
        const schemaAchievements = schemaJson?.game?.availableGameStats?.achievements || [];
        for (const sa of schemaAchievements) {
          schemaMap[sa.name] = {
            displayName: sa.displayName || sa.name || '',
            description: sa.description || '',
            icon: sa.icon || '',
            icongray: sa.icongray || ''
          };
        }
      } catch {}
    }

    const mapped = achievements
      .map((achievement) => {
        const apiname = String(achievement?.apiname || '');
        const schema = schemaMap[apiname] || {};
        return {
          apiname,
          achieved: Boolean(achievement?.achieved),
          unlocktime: Number(achievement?.unlocktime || 0),
          name: schema.displayName || apiname,
          displayName: schema.displayName || apiname,
          description: schema.description || null,
          icon: schema.icon || null,
          icongray: schema.icongray || null
        };
      })
      .filter((achievement) => achievement.apiname);

    setCache(achievementsKey, mapped);
    return mapped;
  } catch (err) {
    console.error('[SteamService] Error obteniendo logros:', err.message);
    return [];
  }
}

export async function getSteamLibrary({ key, steamId }) {
  const libraryKey = `library:${key}:${steamId}`;
  const cached = getCached(libraryKey);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${encodeURIComponent(key)}&steamid=${encodeURIComponent(steamId)}&include_appinfo=1&include_played_free_games=1`
    );
    if (!res.ok) {
      throw new Error(`Steam library error ${res.status}`);
    }

    const json = await res.json();
    const games = Array.isArray(json?.response?.games) ? json.response.games : [];
    const mappedGames = games.map((game) => ({
      appid: String(game.appid),
      name: game.name,
      playtime_forever: Number(game.playtime_forever || 0),
      img_icon_url: game.img_icon_url || '',
      img_logo_url: game.img_logo_url || '',
      img_capsule: game.img_capsule || '',
      has_community_visible_stats: !!game.has_community_visible_stats,
      installed: false
    }));

    setCache(libraryKey, mappedGames);
    return mappedGames;
  } catch (err) {
    console.error('[SteamService] Error obteniendo biblioteca:', err.message);
    return [];
  }
}