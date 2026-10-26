import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Layers,
  RefreshCw,
  ShieldCheck,
  Tag,
  Box,
} from 'lucide-react';
import GrassBlock from './GrassBlock';
import Panorama from './Panorama';
import ModsPage from './ModsPage';
import { Compass, Hammer, Users, Folder } from 'lucide-react';
import { formatBytes, storageLabel } from '../lib/storage.mjs';

export default function ModpackPage({
  api,
  config,
  busy,
  updateState,
  availableUpdate,
  onRetry,
  onAction,
  onOpenCurseForge,
  progress,
  logs,
  storage,
  onRefreshStorage,
  onOpenFolder,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const tabs = [
    { id: 'overview', label: 'Общ преглед', Icon: Compass },
    { id: 'mods', label: 'Включени добавки', Icon: Layers },
    { id: 'activity', label: 'Активност на приложението', Icon: RefreshCw },
  ];
  function handleTabKey(event, index) {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft')
      next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(tabs[next].id);
    event.currentTarget.parentElement.children[next].focus();
  }
  const pack = config.installed;
  const checking = updateState.status === 'checking';
  const failed = updateState.status === 'failed';
  const verified =
    updateState.status === 'ready' && Boolean(pack) && !availableUpdate;
  const title = checking
    ? 'Подготвяме пакета с добавки…'
    : failed
      ? 'Нужно е обновление.'
      : availableUpdate
        ? 'Има нова версия.'
        : verified
          ? 'Актуален'
          : 'Автоматични обновления';

  return (
    <div className="pack-overview">
      <section className="panel pack-identity">
        <div className="pack-art" aria-hidden="true">
          <Panorama />
        </div>
        <div className="pack-introduction">
          <span className="overline">ОФИЦИАЛЕН ПАКЕТ</span>
          <h2>
            Patilanci <span>Adventures</span>
          </h2>
          <p>
            Повече места за изследване и повече възможности за строителство в
            общ свят с приятели.
          </p>
          <div className="pack-hero-specs">
            <span>
              <GrassBlock />
              <span>
                <small>Minecraft</small>
                <strong>{pack?.minecraft || '—'}</strong>
              </span>
            </span>
            <span>
              <Box size={26} />
              <strong>Fabric</strong>
            </span>
            <span>
              <Tag size={25} />
              <span>
                <small>Версия</small>
                <strong>{pack?.version || '—'}</strong>
              </span>
            </span>
          </div>
          <div className="pack-links">
            <button
              className="outline-button"
              onClick={() => setActiveTab('mods')}
            >
              <Layers size={17} />
              Включени добавки
              <ArrowRight size={16} />
            </button>
            <button className="text-button" onClick={onOpenCurseForge}>
              Отвори в CurseForge <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </section>
      <div
        className="pack-section-tabs"
        role="tablist"
        aria-label="Пакет с добавки"
      >
        {tabs.map(({ id, label, Icon }, index) => (
          <button
            key={id}
            id={`pack-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`pack-panel-${id}`}
            tabIndex={activeTab === id ? 0 : -1}
            className={activeTab === id ? 'is-active' : ''}
            onClick={() => setActiveTab(id)}
            onKeyDown={(event) => handleTabKey(event, index)}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </div>
      <div
        id="pack-panel-overview"
        className="pack-overview-panel"
        role="tabpanel"
        aria-labelledby="pack-tab-overview"
        tabIndex={0}
        hidden={activeTab !== 'overview'}
      >
        <section className="dashboard-panel pack-about">
          <h3>За пакета с добавки</h3>
          <p>
            Patilanci Adventures е внимателно подбран пакет с добавки, създаден
            за дълги и вълнуващи приключения с приятели. Съчетава изследване,
            строителство и нови механики, които правят света на Minecraft
            по-богат и жив.
          </p>
          <div>
            <Compass size={30} />
            <span>
              <strong>Изследване</strong>
              <p>Откривай нови биоми, структури и уникални измерения.</p>
            </span>
          </div>
          <div>
            <Hammer size={30} />
            <span>
              <strong>Строителство</strong>
              <p>Използвай нови блокове и декорации за по-красиви постройки.</p>
            </span>
          </div>
          <div>
            <Users size={30} />
            <span>
              <strong>Игра с приятели</strong>
              <p>Споделяй приключения и незабравими моменти.</p>
            </span>
          </div>
          <button className="text-button" onClick={onOpenCurseForge}>
            Виж в CurseForge <ArrowUpRight size={16} />
          </button>
        </section>
        <section
          className="panel pack-update"
          data-update-status={
            availableUpdate && !checking ? 'available' : updateState.status
          }
        >
          <h3 className="installation-heading no-bottom-border">
            Информация за инсталацията
          </h3>
          {(failed || availableUpdate || checking) && (
            <p className="pack-update-description">
              {failed
                ? 'Последната версия не може да бъде подготвена. Провери връзката си и опитай отново. Ако проблемът продължи, свържи се с екипа на Патиланци.'
                : availableUpdate
                  ? `${availableUpdate.releaseName} е налична. Затвори Minecraft, за да я инсталираш, или натисни „Играй“, за да се подготви преди следващата игра.`
                  : 'Докато приложението е отворено, проверяваме за нова версия на всеки 10 секунди. Последната версия се подготвя преди стартирането на Minecraft.'}
            </p>
          )}

          <dl className="pack-facts">
            <div>
              <dt>
                <span className="pack-update-icon">
                  {checking ? (
                    <RefreshCw size={22} />
                  ) : (
                    <ShieldCheck size={22} />
                  )}
                </span>
                Статус:
              </dt>
              <dd>
                <h3 aria-live="polite">{title}</h3>
                {verified && (
                  <span className="pack-verified">
                    <Check size={14} /> Проверено при това отваряне
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>
                <Tag size={22} />
                Версия:
              </dt>
              <dd>
                {pack?.releaseName ||
                  (pack
                    ? `Версия на пакета ${pack.version}`
                    : 'Все още не е инсталиран')}
              </dd>
            </div>
            <div>
              <dt>
                <Box size={24} />
                Добавки:
              </dt>
              <dd>Fabric</dd>
            </div>
            <div>
              <dt>
                <GrassBlock />
                Minecraft:
              </dt>
              <dd>{pack?.minecraft || '—'}</dd>
            </div>
          </dl>

          {pack && (
            <details className="pack-storage-details">
              <summary>{pack.mods} добавки · Заето място</summary>
              <div className="pack-storage" aria-live="polite">
                <div>
                  <strong>
                    Minecraft на диска <span>{storageLabel(storage)}</span>
                  </strong>
                  <p>
                    Файлове на играта, добавки, карти и запазени светове
                    {storage?.javaBytes > 0
                      ? ` · Автоматично изтеглена Java: ${formatBytes(storage.javaBytes)}`
                      : ''}
                  </p>
                </div>
                <button
                  className="outline-button"
                  aria-label="Провери заетото място от Minecraft"
                  title="Провери заетото място"
                  disabled={busy || !storage || !onRefreshStorage}
                  onClick={onRefreshStorage}
                >
                  <RefreshCw size={15} /> Провери мястото
                </button>
              </div>
            </details>
          )}

          {checking && (
            <div className="pack-update-progress" role="status">
              <p>{progress.message}</p>
              {progress.percent !== null && (
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-label="Обновяване на пакета"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.percent}
                >
                  <div style={{ width: `${progress.percent}%` }} />
                </div>
              )}
            </div>
          )}
          {(failed || availableUpdate) && !checking && (
            <button
              className="outline-button pack-retry"
              disabled={busy}
              onClick={onRetry}
            >
              <RefreshCw size={16} />{' '}
              {availableUpdate ? 'Обнови пакета' : 'Опитай обновяването отново'}
            </button>
          )}
          <button
            className="outline-button pack-folder"
            onClick={onOpenFolder}
            disabled={busy}
          >
            <Folder size={19} />
            Отвори папката <ArrowUpRight size={16} />
          </button>
        </section>
      </div>
      <div
        id="pack-panel-mods"
        className="pack-tab-panel"
        role="tabpanel"
        aria-labelledby="pack-tab-mods"
        tabIndex={0}
        hidden={activeTab !== 'mods'}
      >
        {activeTab === 'mods' && (
          <ModsPage
            api={api}
            busy={busy}
            onAction={onAction}
            onInstall={() => setActiveTab('overview')}
            collection="bundled"
            embedded
          />
        )}
      </div>
      <section
        id="pack-panel-activity"
        className="panel pack-activity pack-tab-panel"
        role="tabpanel"
        aria-labelledby="pack-tab-activity"
        tabIndex={0}
        hidden={activeTab !== 'activity'}
      >
        <h3 className="installation-heading">Действия на приложението</h3>
        <div
          className="console"
          role="log"
          aria-label="Действия на приложението"
        >
          {logs.length
            ? logs.map((message, index) => <div key={index}>{message}</div>)
            : 'Тук ще се показват действията при проверка за обновявания.'}
        </div>
      </section>
    </div>
  );
}
