import { useEffect, useRef } from 'react';
import { ArrowDownToLine, X } from 'lucide-react';

export default function NotificationsPanel({ state, actions, onClose }) {
  const panel = useRef(null);
  const launcher = state.launcherUpdate;
  const pack = state.modpackUpdate;
  const ready = launcher?.status === 'downloaded';
  const downloading = launcher?.status === 'downloading';
  const packAvailable = pack?.status === 'available';
  const blocked = state.busy || state.game.running;

  useEffect(() => {
    function outside(event) {
      if (
        !panel.current?.contains(event.target) &&
        !event.target.closest('.notification-button')
      )
        onClose();
    }
    function escape(event) {
      if (event.key === 'Escape') {
        onClose();
        document.querySelector('.notification-button')?.focus();
      }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [onClose]);

  return (
    <section
      id="notifications-panel"
      ref={panel}
      className="notifications-panel"
      aria-labelledby="notifications-title"
    >
      <div className="notifications-heading">
        <h3 id="notifications-title">Известия</h3>
        <button
          className="icon-button"
          aria-label="Затвори известията"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <div className="notifications-list" aria-live="polite">
        {state.error && (
          <article className="notification-item" data-notification="error">
            <strong>Действието не завърши</strong>
            <p>{state.error}</p>
            <button
              className="outline-button"
              onClick={() => actions.setError('')}
            >
              Разбрах
            </button>
          </article>
        )}
        {(ready || downloading) && (
          <article className="notification-item" data-notification="launcher">
            <strong>
              {ready
                ? 'Нова версия на приложението'
                : 'Изтегляне на приложението'}
            </strong>
            <p>
              Версия {launcher.latestVersion}
              {ready
                ? ' е готова за инсталиране.'
                : ` · ${Math.round(launcher.percent || 0)}%`}
            </p>
            {ready && (
              <button
                className="outline-button"
                disabled={blocked}
                onClick={actions.installLauncherUpdate}
              >
                <ArrowDownToLine size={16} /> Рестартирай и обнови
              </button>
            )}
          </article>
        )}
        {packAvailable && (
          <article className="notification-item" data-notification="modpack">
            <strong>Нова версия на пакета</strong>
            <p>{pack.releaseName}</p>
            <button
              className="outline-button"
              disabled={blocked}
              onClick={actions.installPack}
            >
              <ArrowDownToLine size={16} /> Обнови пакета
            </button>
          </article>
        )}
        {(ready || packAvailable) && state.game.running && (
          <p>Затвори Minecraft, за да приложиш обновяванията.</p>
        )}
        {(ready || packAvailable) && state.busy && !state.game.running && (
          <p>Изчакай текущото действие да приключи.</p>
        )}
        {!state.error && !ready && !downloading && !packAvailable && (
          <p>Няма нови известия.</p>
        )}
      </div>
    </section>
  );
}
