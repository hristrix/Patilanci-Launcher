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
          <button aria-label="Dismiss error" onClick={onDismiss}>
            <X size={17} />
          </button>
        </div>
      )}
      {launcherUpdate && launcherUpdate.status === 'error' && (
        <div className="launcher-update-notice" role="status">
          <span>
            Launcher updates could not be checked. Your modpack update check is
            separate.
          </span>
          <button
            className="outline-button"
            disabled={disabled}
            onClick={onRetryUpdate}
          >
            Retry update check
          </button>
        </div>
      )}
    </>
  );
}
