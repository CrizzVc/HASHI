import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import storeRoutes from './routes/store.js';
import steamgridRoutes from './routes/steamgrid.js';
import steamRoutes from './routes/steam.js';
// Extensiones deshabilitadas: import animeav1Routes from './routes/animeav1.js';
import tmdbRoutes from './routes/tmdb.js';
import fanartRoutes from './routes/fanart.js';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());
app.use('/api/store', storeRoutes);
app.use('/api/steamgrid', steamgridRoutes);
app.use('/api/steam', steamRoutes);
// Extensiones deshabilitadas: app.use('/api/animeav1', animeav1Routes);
app.use('/api/tmdb', tmdbRoutes);
app.use('/api/fanart', fanartRoutes);

// Health check: permite al launcher comprobar que en este puerto corre
// realmente un backend HASHI antes de "reutilizar" el proceso.
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'GBL-backend', port: PORT, pid: process.pid, uptime: process.uptime() });
});

const server = app.listen(PORT, () => {
  console.log(`[GBL Backend] API running on http://localhost:${PORT}`);
});

// Un EADDRINUSE u otro error de listen no deben morir en silencio.
server.on('error', (err) => {
  console.error(`[GBL Backend] Error escuchando en el puerto ${PORT}: ${err.message}`);
  process.exit(1);
});
