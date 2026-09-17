import { Router } from 'express';

const router = Router();

router.get('/backdrop', async (req, res) => {
  const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
  const apiKey = process.env.TMDB_API_KEY;
  if (!query) return res.status(400).json({ success: false, error: 'Falta la búsqueda.' });
  if (!apiKey) return res.json({ success: true, backdrop: null });
  try {
    const url = new URL('https://api.themoviedb.org/3/search/multi');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('query', query);
    url.searchParams.set('language', 'es-ES');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`TMDB respondió con ${response.status}`);
    const data = await response.json();
    const match = data.results?.find((item) => item.media_type === 'tv' && item.backdrop_path) || data.results?.find((item) => item.backdrop_path);
    res.json({ success: true, backdrop: match?.backdrop_path ? `https://image.tmdb.org/t/p/original${match.backdrop_path}` : null });
  } catch (error) {
    console.error('[TMDB] No se pudo buscar el fondo:', error.message);
    res.status(502).json({ success: false, backdrop: null });
  }
});

export default router;
