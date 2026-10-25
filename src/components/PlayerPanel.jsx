import { RefreshCw, ShieldCheck, Signal, Swords, Users } from 'lucide-react';

export default function PlayerPanel({
  server,
  onRefresh,
  refreshing,
  expanded = false,
}) {
  const players = server?.players || [];
  const hasServerResponse = server?.online;

  return (
    <section className={`panel player-panel ${expanded ? 'is-expanded' : ''}`}>
      <div className="panel-title">
        <span className="overline">THE COMMUNITY</span>
        <button
          className="icon-button"
          title={refreshing ? 'Refreshing player list…' : 'Refresh player list'}
          aria-label={
            refreshing ? 'Refreshing player list' : 'Refresh player list'
          }
          aria-busy={refreshing}
          disabled={refreshing}
          onClick={onRefresh}
        >
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="player-count">
        <Users size={21} />
        <strong>{hasServerResponse ? server.count : '—'}</strong>
        <span>
          players online
          <small>
            {hasServerResponse
              ? `${server.max} places in the world`
              : 'Waiting for the server'}
          </small>
        </span>
      </div>
      <div className="player-divider" />
      <div className="section-heading">
        <h3>In the world</h3>
        <span className="live-label">
          <span
            className={`status-dot ${hasServerResponse ? 'is-online' : ''}`}
          />
          LIVE
        </span>
      </div>
      {players.length > 0 ? (
        <div className="player-list">
          {players.map((player, index) => (
            <div className="player" key={player.id || index}>
              <div
                className="player-avatar"
                style={{ '--avatar-hue': `${index * 47}deg` }}
              >
                <span>{player.name.slice(0, 2)}</span>
              </div>
              <div>
                <strong>{player.name}</strong>
                <small>In the adventure</small>
              </div>
              <span className="status-dot is-online" />
            </div>
          ))}
        </div>
      ) : (
        <div className="player-empty">
          <Swords size={29} />
          <strong>
            {hasServerResponse && !server.count
              ? 'Make the first move.'
              : 'A little quiet here.'}
          </strong>
          <p>
            {hasServerResponse
              ? server.count
                ? 'The server is not sharing player names.'
                : 'The next adventure could start with you.'
              : 'Players appear here when the server is reachable.'}
          </p>
        </div>
      )}
      <div className="player-panel-footer">
        <ShieldCheck size={13} />
        <span>Names shared by the server</span>
        {hasServerResponse && (
          <span className="server-ping">
            <Signal size={12} />
            {server.latency} ms
          </span>
        )}
      </div>
    </section>
  );
}
