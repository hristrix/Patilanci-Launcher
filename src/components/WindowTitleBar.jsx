import { useEffect, useState } from 'react';
import { Copy, Folder, Minus, Square, Terminal, X } from 'lucide-react';

export default function WindowTitleBar({
  api,
  pageLabel,
  onOpenFolder,
  onOpenConsole,
  closeLabel = 'Затвори приложението',
  startup = false,
}) {
  const [maximized, setMaximized] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!api) return;
    let active = true;
    const unsubscribe = api.onWindowState((state) => {
      if (active) setMaximized(state.maximized);
    });
    api
      .windowState()
      .then((state) => {
        if (active) setMaximized(state.maximized);
      })
      .catch(() => {});
    return () => {
      active = false;
      unsubscribe();
    };
  }, [api]);

  async function action(command) {
    try {
      setActionError('');
      const state = await api.windowAction(command);
      setMaximized(state.maximized);
    } catch {
      setActionError('Управлението на прозореца не е достъпно');
    }
  }

  return (
    <header
      className={`window-titlebar${startup ? ' is-startup' : ''}`}
      aria-label="Заглавна лента на Патиланци"
    >
      <div className="window-brand">
        <img
          src={
            startup
              ? './brand/patilanci-monogram.svg'
              : './brand/patilanci-icon.png'
          }
          alt=""
          draggable="false"
        />
        <strong>
          ПАТИЛАНЦИ <span>{startup ? 'LAUNCHER' : 'ПРИЛОЖЕНИЕ'}</span>
        </strong>
        <span className="window-brand-divider" />
      </div>
      <div className="window-controls">
        {onOpenConsole && (
          <button
            className="window-control"
            aria-label="Отвори Логовеа на Minecraft"
            title="Логове на Minecraft"
            onClick={onOpenConsole}
          >
            <Terminal size={16} />
          </button>
        )}
        {onOpenFolder && (
          <button
            className="window-control window-folder"
            aria-label="Отвори папката на играта"
            title="Отвори папката на играта"
            onClick={onOpenFolder}
          >
            <Folder size={15} />
          </button>
        )}
        <button
          className="window-control"
          aria-label="Свий прозореца"
          title="Свий"
          disabled={!api}
          onClick={() => action('minimize')}
        >
          <Minus size={16} />
        </button>
        <button
          className="window-control"
          aria-label={
            maximized ? 'Възстанови размера на прозореца' : 'Увеличи прозореца'
          }
          title={maximized ? 'Възстанови размера' : 'Увеличи'}
          disabled={!api}
          onClick={() => action('toggleMaximize')}
        >
          {maximized ? <Copy size={13} /> : <Square size={13} />}
        </button>
        <button
          className="window-control window-close"
          aria-label={closeLabel}
          title="Затвори"
          disabled={!api}
          onClick={() => action('close')}
        >
          <X size={17} />
        </button>
      </div>
    </header>
  );
}
