import React from 'react';
import VideoPlayer from './Player/VideoPlayer';
import { getBackendUrl } from '../utils/backendUrl';

export interface MediaItem {
  id: number;
  title: string;
  episode: string;
  posterImage?: string | null;
  episodeImage?: string | null;
  animeUrl?: string | null;
}

interface MediaDetailViewProps {
  item: MediaItem;
  onClose: () => void;
}

type FocusZone = 'actions' | 'episodes';

const ACTIONS = ['resume', 'episodes'] as const;
type ActionId = (typeof ACTIONS)[number];

const MediaDetailView: React.FC<MediaDetailViewProps> = ({ item, onClose }) => {
  const [backdrop, setBackdrop] = React.useState<string | null>(null);
  const [logo, setLogo] = React.useState<string | null | undefined>(undefined); // undefined = cargando, null = sin logo
  const [episodes] = React.useState<Array<{ episode: string; episodeUrl: string; image?: string | null }>>([]);
  const [showEpisodes, setShowEpisodes] = React.useState(false);
  const [focusZone, setFocusZone] = React.useState<FocusZone>('actions');
  const [focusedActionIndex, setFocusedActionIndex] = React.useState(0);
  const [focusedEpisodeIndex, setFocusedEpisodeIndex] = React.useState(0);
  const [playerEpisode, setPlayerEpisode] = React.useState<{ url: string; episode: string } | null>(null);
  const [pendingEpisode, setPendingEpisode] = React.useState<{ episode: string; episodeUrl: string } | null>(null);
  const [servers, setServers] = React.useState<Array<{ name: string; url: string }>>([]);
  const [focusedServerIndex, setFocusedServerIndex] = React.useState(0);
  const [isLoadingServers, setIsLoadingServers] = React.useState(false);
  const episodeRefs = React.useRef<Array<HTMLElement | null>>([]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    const controller = new AbortController();
    void fetch(`${getBackendUrl()}/api/tmdb/backdrop?query=${encodeURIComponent(item.title)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { backdrop?: string | null } | null) => setBackdrop(data?.backdrop || null))
      .catch(() => undefined);
    void fetch(`${getBackendUrl()}/api/fanart/logo?query=${encodeURIComponent(item.title)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { logo?: string | null } | null) => setLogo(data?.logo ?? null))
      .catch(() => setLogo(null));
    // Extensiones deshabilitadas: no se realizan peticiones a /api/animeav1
    return () => controller.abort();
  }, [item.animeUrl, item.title]);

  const backgroundImage = backdrop || item.episodeImage || item.posterImage || '';

  // ── Server selector ────────────────────────────────────────────────────────
  const openServerSelector = React.useCallback(async (episode?: { episode: string; episodeUrl: string }): Promise<void> => {
    if (!episode) return;
    setPendingEpisode(episode);
    setFocusedServerIndex(0);
    setServers([]);
    setIsLoadingServers(false);
  }, []);

  const startPlayer = React.useCallback((server?: { url: string }): void => {
    if (!server || !pendingEpisode) return;
    setPlayerEpisode({ url: server.url, episode: pendingEpisode.episode });
    setPendingEpisode(null);
  }, [pendingEpisode]);

  // ── Resume: open server selector for current episode ───────────────────────
  const handleResume = React.useCallback((): void => {
    const current = episodes.find((ep) => ep.episode === item.episode) ?? episodes[0];
    void openServerSelector(current);
  }, [episodes, item.episode, openServerSelector]);

  // ── Action button handler ──────────────────────────────────────────────────
  const handleAction = React.useCallback((action: ActionId): void => {
    if (action === 'resume') handleResume();
    if (action === 'episodes') {
      setShowEpisodes((prev) => {
        const next = !prev;
        if (next) setFocusZone('episodes');
        return next;
      });
    }
  }, [handleResume]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (playerEpisode) return;

      // Server modal navigation
      if (pendingEpisode) {
        if (event.key === 'ArrowDown') { event.preventDefault(); setFocusedServerIndex((i) => Math.min(i + 1, servers.length - 1)); }
        if (event.key === 'ArrowUp') { event.preventDefault(); setFocusedServerIndex((i) => Math.max(i - 1, 0)); }
        if (event.key === 'Enter') { event.preventDefault(); startPlayer(servers[focusedServerIndex]); }
        if (event.key === 'Escape') { event.preventDefault(); setPendingEpisode(null); }
        return;
      }

      // Episode row navigation
      if (focusZone === 'episodes') {
        if (event.key === 'ArrowRight') { event.preventDefault(); setFocusedEpisodeIndex((i) => Math.min(i + 1, episodes.length - 1)); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); setFocusedEpisodeIndex((i) => Math.max(i - 1, 0)); }
        if (event.key === 'ArrowUp') { event.preventDefault(); setFocusZone('actions'); }
        if (event.key === 'Enter') { event.preventDefault(); void openServerSelector(episodes[focusedEpisodeIndex]); }
        if (event.key === 'Escape') { event.preventDefault(); setShowEpisodes(false); setFocusZone('actions'); }
        return;
      }

      // Action buttons navigation
      if (event.key === 'ArrowDown') { event.preventDefault(); setFocusedActionIndex((i) => Math.min(i + 1, ACTIONS.length - 1)); }
      if (event.key === 'ArrowUp') { event.preventDefault(); setFocusedActionIndex((i) => Math.max(i - 1, 0)); }
      if (event.key === 'ArrowDown' && showEpisodes && focusedActionIndex === ACTIONS.length - 1) {
        event.preventDefault(); setFocusZone('episodes');
      }
      if (event.key === 'Enter') { event.preventDefault(); handleAction(ACTIONS[focusedActionIndex]); }
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    episodes, focusedEpisodeIndex, focusedActionIndex, focusZone, showEpisodes,
    playerEpisode, pendingEpisode, servers, focusedServerIndex,
    openServerSelector, startPlayer, handleAction, onClose,
  ]);

  // Scroll focused episode into view
  React.useEffect(() => {
    episodeRefs.current[focusedEpisodeIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [focusedEpisodeIndex]);

  // Active episode for description
  const activeEpisode = episodes.find((ep) => ep.episode === item.episode) ?? episodes[0];

  return (
    <main className="media-detail-view" aria-label={`Detalle de ${item.title}`}>

      {/* ── Server picker modal ───────────────────────────────────────── */}
      {pendingEpisode && (
        <div className="media-server-modal-backdrop" onClick={() => setPendingEpisode(null)}>
          <section className="media-server-modal" onClick={(e) => e.stopPropagation()} aria-label="Elegir reproductor">
            <p>EPISODIO {pendingEpisode.episode}</p>
            <h2>Elige un reproductor</h2>
            {isLoadingServers && <span>Buscando opciones…</span>}
            {!isLoadingServers && servers.length === 0 && <span>No hay servidores disponibles.</span>}
            <div className="media-server-options">
              {servers.map((server, index) => (
                <button
                  type="button"
                  key={`${server.name}-${server.url}`}
                  className={index === focusedServerIndex ? 'is-focused' : ''}
                  onClick={() => startPlayer(server)}
                >
                  <span>▶</span> {server.name}
                </button>
              ))}
            </div>
            <button type="button" className="media-server-cancel" onClick={() => setPendingEpisode(null)}>Cancelar</button>
          </section>
        </div>
      )}

      {/* ── Video player ──────────────────────────────────────────────── */}
      {playerEpisode && (
        <div className="media-detail-player">
          <button type="button" className="media-detail-player-back" onClick={() => setPlayerEpisode(null)}>
            ‹ Volver al detalle
          </button>
          <VideoPlayer
            src={playerEpisode.url}
            title={`${item.title} · Episodio ${playerEpisode.episode}`}
            isDirect={false}
            episodes={episodes}
            currentEpisodeIndex={episodes.findIndex((ep) => ep.episode === playerEpisode.episode)}
            onPlayEpisodeIndex={(index: number) => void openServerSelector(episodes[index])}
            onBack={() => setPlayerEpisode(null)}
          />
        </div>
      )}

      {/* ── Full-bleed background ─────────────────────────────────────── */}
      <div
        className="media-detail-background"
        style={backgroundImage ? { backgroundImage: `url("${backgroundImage}")` } : undefined}
      />

      {/* ── Back button ───────────────────────────────────────────────── */}
      <button type="button" className="media-detail-back" onClick={onClose}>‹ Volver</button>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div className="media-detail-content">

        {/* Logo o título adaptativo */}
        {logo === undefined ? (
          /* Cargando — reserva el espacio para evitar saltos de layout */
          <div className="media-detail-title-placeholder" aria-hidden="true" />
        ) : logo ? (
          <img
            src={logo}
            alt={item.title}
            className="media-detail-logo"
          />
        ) : (
          <h1
            className="media-detail-title"
            data-length={
              item.title.length > 40 ? 'xl' :
              item.title.length > 25 ? 'lg' :
              item.title.length > 15 ? 'md' : 'sm'
            }
          >
            {item.title}
          </h1>
        )}

        {/* Metadata row */}
        <div className="media-detail-meta">
          <span className="media-detail-meta-year">2025</span>
          <span className="media-detail-meta-dot">·</span>
          <span>Anime</span>
          {episodes.length > 0 && (
            <>
              <span className="media-detail-meta-dot">·</span>
              <span>{episodes.length} episodios</span>
            </>
          )}
          <span className="media-detail-meta-badge">HD</span>
        </div>

        {/* Episode description */}
        {activeEpisode && (
          <p className="media-detail-ep-desc">
            <strong>Episodio {activeEpisode.episode}</strong>
          </p>
        )}

        {/* Action buttons */}
        <nav className="media-detail-actions" aria-label="Acciones">
          <button
            type="button"
            className={`media-detail-action media-detail-action--primary${focusZone === 'actions' && focusedActionIndex === 0 ? ' is-focused' : ''}`}
            onClick={handleResume}
          >
            <span className="media-detail-action-icon">▶</span>
            <span>Reanudar T1: E {item.episode}</span>
            <span className="media-detail-action-progress-bar" aria-hidden="true">
              <i />
            </span>
          </button>

          <button
            type="button"
            className={`media-detail-action${focusZone === 'actions' && focusedActionIndex === 1 ? ' is-focused' : ''}`}
            onClick={() => handleAction('episodes')}
          >
            <span className="media-detail-action-icon">☰</span>
            <span>Episodios y más</span>
          </button>
        </nav>
      </div>

      {/* ── Episodes drawer ────────────────────────────────────────────── */}
      <section className={`media-detail-episodes${showEpisodes ? ' is-open' : ''}`} aria-label="Episodios">
        <div className="media-detail-episodes-header">
          <h2>Episodios</h2>
          <button
            type="button"
            className="media-detail-episodes-close"
            onClick={() => { setShowEpisodes(false); setFocusZone('actions'); }}
            aria-label="Cerrar episodios"
          >
            ✕
          </button>
        </div>
        <div className="media-detail-episodes-row">
          {episodes.length === 0 && <p>Cargando episodios…</p>}
          {episodes.map((episode, index) => (
            <article
              className={`${episode.episode === item.episode ? 'is-current' : ''} ${focusZone === 'episodes' && index === focusedEpisodeIndex ? 'is-focused' : ''}`}
              key={episode.episode}
              ref={(el) => { episodeRefs.current[index] = el; }}
              onClick={() => void openServerSelector(episode)}
            >
              <div
                className="media-detail-episode-thumb"
                style={(episode.image || item.episodeImage || item.posterImage)
                  ? { backgroundImage: `url("${episode.image || item.episodeImage || item.posterImage}")` }
                  : undefined}
              >
                <span className="media-detail-episode-num">EP {episode.episode}</span>
                {episode.episode === item.episode && (
                  <span className="media-detail-episode-badge">▶ Reproduciendo</span>
                )}
                <div className="media-detail-episode-play-icon" aria-hidden="true">▶</div>
              </div>
              <div className="media-detail-episode-info">
                <span className="media-detail-episode-label">Episodio {episode.episode}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

    </main>
  );
};

export default MediaDetailView;
