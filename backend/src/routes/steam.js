import { Router } from 'express';
import {
  resolveAppId,
  getScreenshots,
  getAppDetails,
  getSteamFriends,
  getSteamProfileBackground,
  getSteamLibrary,
  getSteamAchievements,
  getSteamNews,
  resolveSteamId
} from '../services/steamService.js';

const router = Router();

// Get latest news for a Steam AppID
router.get('/news/:appid', async (req, res) => {
  try {
    const { appid } = req.params;
    const count = Number(req.query.count) || 10;
    const lang = req.query.lang || 'es';
    if (!appid) {
      return res.status(400).json({ error: 'Se requiere el appid' });
    }
    const news = await getSteamNews(appid, { count, lang });
    res.json({ appid, news });
  } catch (error) {
    console.error('[Steam] Error obteniendo noticias:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Resolve a game name to a Steam AppID
router.get('/resolve', async (req, res) => {
  try {
    const { term, lang } = req.query;
    if (!term || typeof term !== 'string' || term.trim().length === 0) {
      return res.status(400).json({ error: 'Se requiere el parámetro "term"' });
    }
    const result = await resolveAppId(term.trim(), { lang });
    res.json(result);
  } catch (error) {
    console.error('[Steam] Error resolviendo appid:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get screenshots for a Steam AppID
router.get('/screenshots/:appid', async (req, res) => {
  try {
    const { appid } = req.params;
    const lang = req.query.lang || 'es';
    if (!appid) {
      return res.status(400).json({ error: 'Se requiere el appid' });
    }
    const screenshots = await getScreenshots(appid, { lang });
    res.json(screenshots);
  } catch (error) {
    console.error('[Steam] Error obteniendo screenshots:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get store details (description, developer, publisher, release date, reviews, tags)
router.get('/details/:appid', async (req, res) => {
  try {
    const { appid } = req.params;
    const lang = req.query.lang || 'es';
    if (!appid) {
      return res.status(400).json({ error: 'Se requiere el appid' });
    }
    const details = await getAppDetails(appid, { lang });
    if (!details) {
      return res.status(404).json({ error: 'No se encontraron detalles para este appid' });
    }
    res.json(details);
  } catch (error) {
    console.error('[Steam] Error obteniendo detalles:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/library', async (req, res) => {
  try {
    const { key, steamId } = req.query;
    if (!key || typeof key !== 'string' || !key.trim()) {
      return res.status(400).json({ error: 'Se requiere la API key de Steam' });
    }
    if (!steamId || typeof steamId !== 'string' || !steamId.trim()) {
      return res.status(400).json({ error: 'Se requiere el Steam ID o vanity URL' });
    }

    const resolvedSteamId = await resolveSteamId(key.trim(), steamId.trim());
    if (!resolvedSteamId) {
      return res.status(404).json({ error: 'No se pudo resolver la cuenta de Steam' });
    }

    const library = await getSteamLibrary({ key: key.trim(), steamId: resolvedSteamId });
    res.json(library);
  } catch (error) {
    console.error('[Steam] Error obteniendo biblioteca:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/friends', async (req, res) => {
  try {
    const { key, steamId } = req.query;
    if (!key || typeof key !== 'string' || !key.trim()) {
      return res.status(400).json({ error: 'Se requiere la API key de Steam' });
    }
    if (!steamId || typeof steamId !== 'string' || !steamId.trim()) {
      return res.status(400).json({ error: 'Se requiere el Steam ID o vanity URL' });
    }

    const resolvedSteamId = await resolveSteamId(key.trim(), steamId.trim());
    if (!resolvedSteamId) {
      return res.status(404).json({ error: 'No se pudo resolver la cuenta de Steam' });
    }

    const friends = await getSteamFriends({ key: key.trim(), steamId: resolvedSteamId });
    res.json(friends);
  } catch (error) {
    console.error('[Steam] Error obteniendo amigos:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/friends/:steamid/background', async (req, res) => {
  try {
    const { steamid } = req.params;
    if (!/^\d+$/.test(steamid)) return res.status(400).json({ error: 'Steam ID no válido' });
    const background = await getSteamProfileBackground(steamid);
    res.json({ background });
  } catch (error) {
    console.error('[Steam] Error obteniendo fondo de perfil:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/achievements', async (req, res) => {
  try {
    const { key, steamId, appid, lang } = req.query;
    if (!key || typeof key !== 'string' || !key.trim()) {
      return res.status(400).json({ error: 'Se requiere la API key de Steam' });
    }
    if (!appid || typeof appid !== 'string' || !appid.trim()) {
      return res.status(400).json({ error: 'Se requiere el appid del juego' });
    }

    console.log(`[Steam] Achievements request: appid=${appid}, steamId=${steamId || 'none'}, lang=${lang}`);

    let resolvedSteamId = null;
    if (steamId && typeof steamId === 'string' && steamId.trim()) {
      resolvedSteamId = await resolveSteamId(key.trim(), steamId.trim());
      console.log(`[Steam] Resolved steamId: ${steamId} -> ${resolvedSteamId}`);
    } else {
      console.log(`[Steam] No steamId provided, skipping player achievements`);
    }

    const achievements = await getSteamAchievements({
      key: key.trim(),
      steamId: resolvedSteamId,
      appid: appid.trim(),
      lang: typeof lang === 'string' ? lang : 'en'
    });

    console.log(`[Steam] Achievements result: ${achievements.length} total, ${achievements.filter(a => a.achieved).length} unlocked`);
    res.json({ appid: appid.trim(), achievements });
  } catch (error) {
    console.error('[Steam] Error obteniendo logros:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;