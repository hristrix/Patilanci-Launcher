import {
  ArrowUpRight,
  Clock,
  Folder,
  RefreshCw,
  Tag,
  Users,
} from 'lucide-react';
import PlayerHead from '../PlayerHead';

export default function HomeDashboard({
  config,
  server,
  storageText,
  lastChecked,
  onNavigate,
  onOpenFolder,
  onUpdate,
  busy,
}) {
  const pack = config.installed;
  const players = server?.online ? server.players || [] : [];
  return (
    <div
      className="home-dashboard"
      aria-label="Информация за играта и общността"
    >
      <section className="dashboard-panel home-setup-card">
        <h3>Пакет с добавки</h3>
        <dl className="dashboard-facts">
          <div>
            <dt>
              <Tag size={18} />
              Инсталирана версия
            </dt>
            <dd>{pack?.releaseName || pack?.version || 'Не е инсталиран'}</dd>
          </div>
          <div>
            <dt>
              <Clock size={18} />
              Последна проверка
            </dt>
            <dd>
              {lastChecked
                ? new Date(lastChecked).toLocaleString('bg-BG', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Няма проверка'}
            </dd>
          </div>
          <div>
            <dt>
              <Folder size={18} />
              Папка на играта
            </dt>
            <dd>
              <span title={config.instancePath}>
                {config.instancePath || `Patilanci Adventures · ${storageText}`}
              </span>
              <button
                className="outline-button"
                onClick={onOpenFolder}
                disabled={busy}
              >
                <Folder size={17} />
                Отвори
              </button>
            </dd>
          </div>
        </dl>
        <button className="outline-button" onClick={onUpdate} disabled={busy}>
          <RefreshCw size={16} />
          Провери за обновления
        </button>
      </section>
      <section className="dashboard-panel home-server-card">
        <h3>Общност</h3>
        <div
          className={`community-preview ${server?.online ? 'is-online' : ''}`}
        >
          <div className="community-faces" aria-hidden="true">
            {(players.length ? players.slice(0, 3) : [{ name: 'P' }]).map(
              (player, i) => (
                <span
                  key={player.id || player.name}
                  className={`community-face face-${i}`}
                >
                  <PlayerHead />
                </span>
              ),
            )}
          </div>
          <div>
            <strong>
              <span className="status-dot" />{' '}
              {server?.online
                ? `${server.count} играчи в момента`
                : 'Няма връзка със сървъра'}
            </strong>
            <p>Част от нашата общност.</p>
          </div>
        </div>
        {players.length > 0 && (
          <p className="community-sample">
            {players
              .slice(0, 4)
              .map((player) => player.name)
              .join(' · ')}
          </p>
        )}
        <button
          className="outline-button"
          onClick={() => onNavigate('players')}
        >
          <Users size={22} />
          Отвори общността <ArrowUpRight size={15} />
        </button>
      </section>
    </div>
  );
}
