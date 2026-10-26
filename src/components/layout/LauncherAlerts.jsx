import { X } from 'lucide-react';

export default function LauncherAlerts({
  error,
  onDismiss,
  launcherUpdate,
  disabled,
  onRetryUpdate,
}) {
  return (
    <>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button aria-label="Скрий съобщението за грешка" onClick={onDismiss}>
            <X size={17} />
          </button>
        </div>
      )}
      {launcherUpdate && launcherUpdate.status === 'error' && (
        <div className="launcher-update-notice" role="status">
          <span>
            Не можем да проверим за нова версия на приложението. Пакетът с
            добавки се проверява отделно.
          </span>
          <button
            className="outline-button"
            disabled={disabled}
            onClick={onRetryUpdate}
          >
            Провери отново
          </button>
        </div>
      )}
    </>
  );
}
