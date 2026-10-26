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
        <span className="overline">ОБЩНОСТТА</span>
        <button
          className="icon-button"
          title={
            refreshing
              ? 'Обновяване на списъка с играчи…'
              : 'Обнови списъка с играчи'
          }
          aria-label={
            refreshing
              ? 'Обновяване на списъка с играчи'
              : 'Обнови списъка с играчи'
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
          играчи в момента
          <small>
            {hasServerResponse
              ? `${server.max} места в света`
              : 'Изчакване на връзка със сървъра'}
          </small>
        </span>
      </div>
      <div className="player-divider" />
      <div className="section-heading">
        <h3>В света</h3>
        <span className="live-label">
          <span
            className={`status-dot ${hasServerResponse ? 'is-online' : ''}`}
          />
          В МОМЕНТА
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
                <small>В играта</small>
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
              ? 'Бъди първият в света.'
              : 'Засега тук е спокойно.'}
          </strong>
          <p>
            {hasServerResponse
              ? server.count
                ? 'Сървърът не предоставя имената на играчите.'
                : 'Следващото приключение може да започне с теб.'
              : 'Играчите ще се появят тук, когато има връзка със сървъра.'}
          </p>
        </div>
      )}
      <div className="player-panel-footer">
        <ShieldCheck size={13} />
        <span>Имена, предоставени от сървъра</span>
        {hasServerResponse && (
          <span className="server-ping">
            <Signal size={12} />
            {server.latency} мс
          </span>
        )}
      </div>
    </section>
  );
}
