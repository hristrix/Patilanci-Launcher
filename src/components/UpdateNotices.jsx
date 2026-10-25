import { useState } from 'react';
import { ArrowDownToLine, Bell, X } from 'lucide-react';
import './UpdateNotices.css';

export default function UpdateNotices({
  launcherUpdate,
  modpackUpdate,
  busy,
  running,
  onRestart,
  onUpdatePack,
}) {
  const [dismissed, setDismissed] = useState([]);
  const notices = [];
  if (['downloading', 'downloaded'].includes(launcherUpdate?.status)) {
    const ready = launcherUpdate.status === 'downloaded';
    notices.push({
      key: `launcher:${launcherUpdate.latestVersion}:${ready}`,
      kind: 'launcher',
      title: ready ? 'Launcher update ready' : 'Downloading launcher update',
      detail: `Version ${launcherUpdate.latestVersion}${ready ? ' applies in the background when you restart.' : ` · ${launcherUpdate.percent || 0}%`}`,
      action: ready ? 'Restart and update' : null,
      onClick: onRestart,
    });
  }
  if (modpackUpdate?.status === 'available')
    notices.push({
      key: `modpack:${modpackUpdate.fileId}`,
      kind: 'modpack',
      title: 'New modpack available',
      detail: modpackUpdate.releaseName,
      action: 'Update modpack',
      onClick: onUpdatePack,
    });
  return (
    <div
      className="update-notices"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {notices
        .filter((notice) => !dismissed.includes(notice.key))
        .map((notice) => (
          <section
            className="update-notice"
            key={notice.key}
            data-update-kind={notice.kind}
          >
            <span className="update-notice-icon" aria-hidden="true">
              <Bell size={19} />
            </span>
            <div className="update-notice-copy">
              <strong>{notice.title}</strong>
              <p>{notice.detail}</p>
              {notice.action && running && (
                <small>Close Minecraft to apply this update.</small>
              )}
            </div>
            {notice.action && (
              <button
                className="outline-button"
                disabled={busy || running}
                onClick={notice.onClick}
              >
                <ArrowDownToLine size={15} />
                {notice.action}
              </button>
            )}
            <button
              className="update-notice-dismiss"
              aria-label={`Dismiss ${notice.kind} update notification`}
              onClick={() =>
                setDismissed((previous) => [...previous.slice(-99), notice.key])
              }
            >
              <X size={17} />
            </button>
          </section>
        ))}
    </div>
  );
}
