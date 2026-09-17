import { Router } from 'express';

const router = Router();

/**
 * GET /api/fanart/logo?query=<title>
 *
 * 1. Busca el TMDB ID de la serie por título.
 * 2. Con ese ID consulta fanart.tv para obtener el logo en español o inglés.
 * 3. Devuelve { success, logo: <url> | null }
 */
router.get('/logo', async (req, res) => {
  const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
  if (!query) return res.status(400).json({ success: false, error: 'Falta el parámetro query.' });

  const tmdbKey = process.env.TMDB_API_KEY;
  const fanartKey = process.env.FANART_API_KEY || '6e3398f78dee2049af59890ee0d5e004';

  try {
    // ── 1. Buscar el ID de la serie en TMDB ───────────────────────────────
    let tmdbId = null;

    if (tmdbKey) {
      const searchUrl = new URL('https://api.themoviedb.org/3/search/tv');
      searchUrl.searchParams.set('api_key', tmdbKey);
      searchUrl.searchParams.set('query', query);
      searchUrl.searchParams.set('language', 'es-ES');

      const searchRes = await fetch(searchUrl);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        tmdbId = searchData.results?.[0]?.id ?? null;
      }
    }

    if (!tmdbId) {
      // Sin TMDB key o sin resultado — intenta buscar directamente en fanart por nombre
      return res.json({ success: true, logo: null });
    }

    // ── 2. Consultar fanart.tv con el TMDB ID ─────────────────────────────
    const fanartUrl = `https://webservice.fanart.tv/v3/tv/${tmdbId}?api_key=${fanartKey}`;
    const fanartRes = await fetch(fanartUrl);

    if (!fanartRes.ok) {
      return res.json({ success: true, logo: null });
    }

    const fanartData = await fanartRes.json();

    // hdtvlogo tiene mejor resolución; tvlogo es el fallback
    const logoSources = fanartData.hdtvlogo ?? fanartData.tvlogo ?? [];

    if (!Array.isArray(logoSources) || logoSources.length === 0) {
      return res.json({ success: true, logo: null });
    }

    // Preferir idioma español, luego inglés, luego el primero disponible
    const pick =
      logoSources.find((l) => l.lang === 'es') ??
      logoSources.find((l) => l.lang === 'en') ??
      logoSources[0];

    return res.json({ success: true, logo: pick?.url ?? null });
  } catch (error) {
    console.error('[Fanart] Error al obtener el logo:', error.message);
    return res.json({ success: true, logo: null }); // fallo silencioso → el frontend mostrará el título
  }
});

export default router;
