import React from 'react';
import {
  ArrowUpRight,
  Box,
  Cpu,
  Layers,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import WorldScene from './WorldScene';

export default function HomeOverview({
  config,
  server,
  accountPanel,
  onNavigate,
  storageText,
}) {
  const pack = config.installed;
  const players = server?.players || [];
  const occupancy =
    server?.online && server.max > 0
      ? Math.min(100, Math.max(0, (server.count / server.max) * 100))
      : 0;
  return (
    <div className="home-grid home-overview">
      <section className="home-world-banner" aria-label="Patilanci Adventures">
        <WorldScene />
        <div className="home-banner-shade" />
        <div className="home-banner-copy">
          <span className="home-banner-eyebrow">PATILANCI ADVENTURES</span>
          <h2>Minecraft {config.installed?.minecraft || '1.21.10'}</h2>
          <span className="home-modpack-pill">
            <Layers size={12} /> Custom modpack
          </span>
          <p className="home-pack-description">
            A world worth coming back to. Explore new places, build something
            extraordinary, and make your next adventure a shared one on
            Patilanci.
          </p>
          <button
            className="home-pack-link"
            onClick={() => onNavigate('modpack')}
          >
            Explore the modpack <ArrowUpRight size={13} />
          </button>
        </div>
      </section>
      {accountPanel}
      <div className="home-quick-status">
        <span className={`home-presence ${server?.online ? 'is-online' : ''}`}>
          <span className="status-dot" />
          {server === null
            ? 'Checking the server…'
            : server.online
              ? `${server.count} / ${server.max} players online`
              : 'Server currently unreachable'}
        </span>
        <button onClick={() => onNavigate('players')}>
          <Users size={14} /> Community <ArrowUpRight size={13} />
        </button>
      </div>
      <div className="home-dashboard" aria-label="Your server and setup">
        <section className="home-detail-card home-server-card">
          <div className="home-detail-heading">
            <Users size={17} />
            <h3>In the world</h3>
            <span
              className={`status-dot ${server?.online ? 'is-online' : ''}`}
            />
          </div>
          <div className="home-detail-value">
            {server?.online ? server.count : '—'}
            <span>
              {server?.online
                ? `/ ${server.max} players`
                : server === null
                  ? 'Checking the server'
                  : 'Server unreachable'}
            </span>
          </div>
          <div className="home-detail-body">
            <div className="home-server-capacity" aria-hidden="true">
              <span style={{ width: `${occupancy}%` }} />
            </div>
            {players.length > 0 ? (
              <div className="home-player-sample">
                {players.slice(0, 4).map((player) => (
                  <span key={player.id || player.name}>
                    <i>{player.name.slice(0, 1).toUpperCase()}</i>
                    {player.name}
                  </span>
                ))}
                {server.count > players.slice(0, 4).length && (
                  <small>More players in the world</small>
                )}
              </div>
            ) : (
              <p>
                {server?.online
                  ? server.count > 0
                    ? 'Players are online. Open Community for the server’s available player list.'
                    : 'The world is quiet. Be the first to join.'
                  : 'Server activity will appear here when the connection is available.'}
              </p>
            )}
          </div>
          <button
            className="home-detail-link"
            onClick={() => onNavigate('players')}
          >
            Visit Community <ArrowUpRight size={14} />
          </button>
        </section>
        <section className="home-detail-card">
          <div className="home-detail-heading">
            <Layers size={17} />
            <h3>Your modpack</h3>
            <ShieldCheck size={16} />
          </div>
          <div className="home-detail-value">
            {pack?.version || 'Ready to install'}
            <span>
              {pack ? 'Installed pack version' : 'Patilanci Adventures'}
            </span>
          </div>
          <div className="home-detail-body">
            <p className="home-release-name">
              {pack?.releaseName ||
                'The latest pack is prepared automatically before you play.'}
            </p>
            {pack && (
              <div className="home-pack-specs">
                <span>
                  Minecraft <b>{pack.minecraft}</b>
                </span>
                <span>
                  Pack mods <b>{pack.mods}</b>
                </span>
                <span>
                  Minecraft size <b>{storageText}</b>
                </span>
              </div>
            )}
          </div>
          <button
            className="home-detail-link"
            onClick={() => onNavigate('modpack')}
          >
            Pack details & updates <ArrowUpRight size={14} />
          </button>
        </section>
        <section className="home-detail-card">
          <div className="home-detail-heading">
            <Cpu size={17} />
            <h3>Make it yours</h3>
            <Settings size={16} />
          </div>
          <div className="home-detail-value">
            {config.memory} GB<span>Allocated to Minecraft</span>
          </div>
          <div className="home-detail-body">
            <p>
              Bring your own mods. Keep your keybinds, shaders, and worlds
              through pack updates.
            </p>
          </div>
          <div className="home-setup-actions">
            <button
              className="outline-button"
              onClick={() => onNavigate('mods')}
            >
              <Box size={14} /> My mods
            </button>
            <button
              className="outline-button"
              onClick={() => onNavigate('settings')}
            >
              <Settings size={14} /> Settings
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
