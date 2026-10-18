import { useEffect, useState } from 'react';
import { ChevronRight, Copy, Folder, Minus, Square, X } from 'lucide-react';

export default function WindowTitleBar({ api, pageLabel, onOpenFolder }) {
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
      setActionError('Window controls unavailable');
    }
  }

  return (
    <header
      className="window-titlebar"
      aria-label="Patilanci Launcher title bar"
    >
      <div className="window-brand">
        <img src="./brand/patilanci-icon.png" alt="" draggable="false" />
        <strong>
          PATILANCI <span>LAUNCHER</span>
        </strong>
        <span className="window-brand-divider" />
        <span className="window-page">
          <ChevronRight size={12} /> {pageLabel}
        </span>
      </div>
      <span className="window-titlebar-note" role="status">
        {actionError || 'YOUR PEOPLE. YOUR PLACE.'}
      </span>
      <div className="window-controls">
        <button
          className="window-control window-folder"
          aria-label="Open game folder"
          title="Open game folder"
          onClick={onOpenFolder}
        >
          <Folder size={15} />
        </button>
        <button
          className="window-control"
          aria-label="Minimize window"
          title="Minimize"
          disabled={!api}
          onClick={() => action('minimize')}
        >
          <Minus size={16} />
        </button>
        <button
          className="window-control"
          aria-label={maximized ? 'Restore window' : 'Maximize window'}
          title={maximized ? 'Restore' : 'Maximize'}
          disabled={!api}
          onClick={() => action('toggleMaximize')}
        >
          {maximized ? <Copy size={13} /> : <Square size={13} />}
        </button>
        <button
          className="window-control window-close"
          aria-label="Close launcher"
          title="Close"
          disabled={!api}
          onClick={() => action('close')}
        >
          <X size={17} />
        </button>
      </div>
    </header>
  );
}
