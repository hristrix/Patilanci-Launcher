import { X } from 'lucide-react';
import HomeHero from './home/HomeHero';
import HomeDashboard from './home/HomeDashboard';
import Panorama from './Panorama';
import { SeasonalGreeting } from './SeasonalTheme';

export default function HomeOverview({
  config,
  server,
  accountPanel,
  onNavigate,
  storageText,
  sessionMode,
  accountOpen,
  onCloseAccount,
  updateState,
  lastChecked,
  updateAvailable,
  onOpenFolder,
  onUpdate,
  busy,
  refreshing,
}) {
  return (
    <div
      className={`home-overview ${sessionMode ? 'has-session' : 'needs-sign-in'}`}
    >
      {!sessionMode ? (
        <div className="sign-in-layout">
          <div className="sign-in-landscape">
            <Panorama />
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
          </div>
          <div className="sign-in-welcome">
            <SeasonalGreeting />
            <h2>Добре дошъл в Патиланци</h2>
            <p>Избери как да продължиш.</p>
          </div>
          {accountPanel}
        </div>
      ) : (
        <>
          <HomeHero
            installed={config.installed}
            onNavigate={onNavigate}
            server={server}
            updateState={updateState}
            updateAvailable={updateAvailable}
            refreshing={refreshing}
          />
          <HomeDashboard
            config={config}
            server={server}
            storageText={storageText}
            lastChecked={lastChecked}
            onNavigate={onNavigate}
            onOpenFolder={onOpenFolder}
            onUpdate={onUpdate}
            busy={busy}
          />
          <button
            className="home-changes-strip"
            onClick={() => onNavigate('modpack')}
          >
            <span className="overline">■ ПАКЕТ</span>
            <span>Обновления и информация за пакета с добавки</span>
            <span>Виж подробности ↗</span>
          </button>
          <div
            className={`account-drawer ${accountOpen ? 'is-open' : ''}`}
            inert={!accountOpen}
            role="region"
            aria-label="Профил на играча"
            onKeyDown={(event) => {
              if (event.key === 'Escape') onCloseAccount();
            }}
          >
            <button
              className="icon-button account-drawer-close"
              onClick={onCloseAccount}
              aria-label="Затвори профила"
            >
              <X size={20} />
            </button>
            {accountPanel}
          </div>
        </>
      )}
    </div>
  );
}
