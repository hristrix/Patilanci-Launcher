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
          <small>Затвори Minecraft, за да се приложи обновяването.</small>
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
        aria-label={
          notice.kind === 'launcher'
            ? 'Скрий известието за приложението'
            : 'Скрий известието за пакета'
        }
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
      title: 'Приложението е обновено успешно',
      detail: `Версия ${updatedVersion} вече е готова за използване. Добре дошъл отново!`,
    });
  }
  if (['downloading', 'downloaded'].includes(launcherUpdate?.status)) {
    const ready = launcherUpdate.status === 'downloaded';
    notices.push({
      key: `launcher:${launcherUpdate.latestVersion}:${ready}`,
      kind: 'launcher',
      title: ready
        ? 'Новата версия на приложението е готова'
        : 'Изтегляне на новата версия на приложението',
      detail: `Версия ${launcherUpdate.latestVersion}${ready ? ' е готова. Рестартирай приложението, за да я използваш.' : ` · ${launcherUpdate.percent || 0}%`}`,
      action: ready ? 'Рестартирай и обнови' : null,
      onClick: onRestart,
    });
  }
  if (modpackUpdate?.status === 'available')
    notices.push({
      key: `modpack:${modpackUpdate.fileId}`,
      kind: 'modpack',
      title: 'Има нова версия на пакета',
      detail: modpackUpdate.releaseName,
      action: 'Обнови пакета',
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
