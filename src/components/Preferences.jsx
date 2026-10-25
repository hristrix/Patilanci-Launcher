import { Check, RefreshCw, Settings } from 'lucide-react';
import MemorySettings from './MemorySettings';
import JavaSettings from './JavaSettings';

export default function Preferences({
  api,
  draft,
  onChange,
  busy,
  onSave,
  saved,
  launcherUpdate,
  onCheckUpdate,
  onInstallUpdate,
  updateBusy,
}) {
  return (
    <section className="panel preferences">
      <div className="section-heading">
        <div>
          <span className="overline">MAKE IT YOURS</span>
          <h3>Launcher preferences</h3>
        </div>
        <Settings size={22} />
      </div>
      <MemorySettings
        api={api}
        allocation={draft.memory}
        onChange={(memory) => onChange({ ...draft, memory })}
      />
      <JavaSettings
        api={api}
        paths={draft.javaPaths}
        disabled={busy}
        onChange={(javaPaths) => onChange({ ...draft, javaPaths })}
      />
      <div className="preferences-actions">
        <button className="play-button" disabled={busy} onClick={onSave}>
          <Check size={18} />
          SAVE PREFERENCES
        </button>
        <span role="status">{saved ? 'Preferences saved.' : ''}</span>
      </div>
      <div className="launcher-update-preferences">
        <div>
          <strong>Launcher {launcherUpdate?.version || ''}</strong>
          <p>
            {launcherUpdate?.status === 'downloaded'
              ? `Version ${launcherUpdate.latestVersion} is ready to install.`
              : launcherUpdate?.status === 'current'
                ? 'Your launcher is up to date.'
                : launcherUpdate?.status === 'development'
                  ? 'Automatic updates are enabled in installed release builds.'
                  : 'Launcher updates are checked automatically at startup.'}
          </p>
        </div>
        <button
          className="outline-button"
          disabled={updateBusy}
          onClick={
            launcherUpdate?.status === 'downloaded'
              ? onInstallUpdate
              : onCheckUpdate
          }
        >
          <RefreshCw size={15} />
          {launcherUpdate?.status === 'downloaded'
            ? 'Restart and update'
            : 'Check launcher updates'}
        </button>
      </div>
    </section>
  );
}
