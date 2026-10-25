import {
  ArrowUpRight,
  Box,
  Layers,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';

function ServerActivityCard({ server, onNavigate }) {
  const players = server?.online ? server.players || [] : [];
  const occupancy =
    server?.online && server.max > 0
      ? Math.min(100, Math.max(0, (server.count / server.max) * 100))
      : 0;

  return (
    <section className="home-detail-card home-server-card">
      <div className="home-detail-heading">
        <Users size={17} />
        <h3>In the world</h3>
      </div>
      <div className="home-detail-value">
        {server?.online ? server.count : '—'}
        <span>
          {server?.online ? `/ ${server.max} players` : 'Players online'}
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
              : 'Your people, your builds, your next shared adventure. Player activity appears here once connected.'}
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
  );
}

function SetupCard({ config, storageText, onNavigate }) {
  const pack = config.installed;
  return (
    <section className="home-detail-card home-setup-card">
      <div className="home-detail-heading">
        <Layers size={17} />
        <h3>Ready for adventure</h3>
        <ShieldCheck size={16} />
      </div>
      <div className="home-detail-value">
        {pack?.version || 'Ready to install'}
        <span>
          {pack ? 'Pack version' : 'Patilanci Adventures'}
          {' · '}
          {config.memory} GB RAM
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
      <div className="home-setup-actions">
        <button
          className="outline-button"
          onClick={() => onNavigate('modpack')}
        >
          <Layers size={14} /> Pack details
        </button>
        <button className="outline-button" onClick={() => onNavigate('mods')}>
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
  );
}

export default function HomeDashboard({
  config,
  server,
  storageText,
  onNavigate,
}) {
  return (
    <>
      <div className="home-quick-status">
        <span className="home-dashboard-caption">YOUR WORLD, AT A GLANCE</span>
        <button onClick={() => onNavigate('players')}>
          <Users size={14} /> Community <ArrowUpRight size={13} />
        </button>
      </div>
      <div className="home-dashboard" aria-label="Your server and setup">
        <ServerActivityCard server={server} onNavigate={onNavigate} />
        <SetupCard
          config={config}
          storageText={storageText}
          onNavigate={onNavigate}
        />
      </div>
    </>
  );
}
