import { useCallback, useEffect, useState } from 'react';
import { ArrowDownToLine, Bell, X } from 'lucide-react';
import './UpdateNotices.css';

function UpdateNotice({ notice, busy, running, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notice.key), 7000);
    return () => clearTimeout(timer);
  }, [notice.key, onDismiss]);

  return (
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
        onClick={() => onDismiss(notice.key)}
      >
        <X size={17} />
      </button>
    </section>
  );
}

export default function UpdateNotices({
  launcherUpdate,
  updatedVersion,
  modpackUpdate,
  busy,
  running,
  onRestart,
  onUpdatePack,
}) {
  const [dismissed, setDismissed] = useState([]);
  const dismiss = useCallback((key) => {
    setDismissed((previous) => [...previous.slice(-99), key]);
  }, []);
  const notices = [];
  if (updatedVersion) {
    notices.push({
      key: `updated:${updatedVersion}`,
      kind: 'launcher',
      title: 'Launcher updated successfully',
      detail: `Version ${updatedVersion} is now running. Welcome back!`,
    });
  }
  if (['downloading', 'downloaded'].includes(launcherUpdate?.status)) {
    const ready = launcherUpdate.status === 'downloaded';
    notices.push({
      key: `launcher:${launcherUpdate.latestVersion}:${ready}`,
      kind: 'launcher',
      title: ready ? 'Launcher update ready' : 'Downloading launcher update',
      detail: `Version ${launcherUpdate.latestVersion}${ready ? ' is ready. Restart to apply it and reopen Patilanci.' : ` · ${launcherUpdate.percent || 0}%`}`,
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
          <UpdateNotice
            key={notice.key}
            notice={notice}
            busy={busy}
            running={running}
            onDismiss={dismiss}
          />
        ))}
    </div>
  );
}
