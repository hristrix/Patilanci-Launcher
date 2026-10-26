import { ArrowUpRight, Box, CheckCircle2 } from 'lucide-react';
import Panorama from '../Panorama';
import GrassBlock from '../GrassBlock';

export default function HomeHero({
  installed,
  onNavigate,
  server,
  updateState,
  updateAvailable,
  refreshing,
}) {
  return (
    <section className="village-hero" aria-label="Patilanci Adventures">
      <div className="village-hero-art">
        <Panorama controls />
        <div className="village-shade" />
        <span
          className={`hero-server-status server-status ${server?.online ? 'is-online' : ''}`}
          role="status"
        >
          <span className="status-dot" />
          {refreshing || server === null
            ? 'Проверка на връзката'
            : server?.online
              ? 'Сървърът е достъпен'
              : 'Няма връзка със сървъра'}
        </span>
        <div className="village-hero-copy">
          <span className="overline">ОФИЦИАЛЕН ПАКЕТ</span>
          <h2>Patilanci Adventures</h2>
          <p>Нашият свят. Твоите приключения.</p>
        </div>
      </div>
      <div className="hero-specs">
        <span>
          <GrassBlock />
          <span>
            <small>Minecraft</small>
            <strong>{installed?.minecraft || '—'}</strong>
          </span>
        </span>
        <span>
          <Box size={24} />
          <strong>Fabric</strong>
        </span>
        <span
          className={
            installed && updateState?.status === 'ready' && !updateAvailable
              ? 'text-green'
              : ''
          }
        >
          <CheckCircle2 size={22} />
          {updateAvailable
            ? 'Нова версия'
            : updateState?.status === 'checking'
              ? 'Проверка…'
              : installed
                ? updateState?.status === 'ready'
                  ? 'Актуален'
                  : 'Инсталиран'
                : 'Готов за инсталиране'}
        </span>
        <button onClick={() => onNavigate('modpack')}>
          Подробности <ArrowUpRight size={16} />
        </button>
      </div>
    </section>
  );
}
