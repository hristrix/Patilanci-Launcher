import {
  Check,
  Download,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import BrandLogo from './BrandLogo';

const titles = {
  launcher: 'Launcher updates',
  account: 'Your account',
  modpack: 'Patilanci modpack',
};
export default function StartupSplash({
  state,
  progress,
  update,
  onRetry,
  onContinue,
  onInstall,
}) {
  const failed = state?.status === 'failed';
  const downloaded = state?.status === 'update-ready';
  const downloading = update?.status === 'downloading';
  const percent = downloading
    ? update.percent
    : state?.phase === 'modpack'
      ? progress.percent
      : null;
  const message = downloaded
    ? `Launcher ${update?.latestVersion || state.launcher?.latestVersion} is ready`
    : failed
      ? state.error
      : downloading
        ? 'Downloading the latest launcher…'
        : state?.phase === 'modpack'
          ? progress.message
          : state?.steps?.[state?.phase]?.message ||
            'Starting your next adventure…';
  return (
    <main className="startup-splash" aria-label="Launcher startup">
      <div className="splash-card">
        <div className="splash-brand">
          <BrandLogo />
          <span>PATILANCI LAUNCHER</span>
        </div>
        <div className="splash-heading">
          <span className="overline">YOUR PEOPLE. YOUR PLACE.</span>
          <h1>
            {failed
              ? 'Let’s get you ready.'
              : downloaded
                ? 'A new adventure awaits.'
                : 'Preparing your adventure.'}
          </h1>
          <p>One launcher. Your account. The latest Patilanci world.</p>
        </div>
        <div className="splash-checks">
          {Object.entries(titles).map(([key, title]) => {
            const step = state?.steps?.[key] || {
              status: 'pending',
              message: 'Waiting…',
            };
            return (
              <div key={key} className={`splash-check is-${step.status}`}>
                <span className="splash-step-icon">
                  {step.status === 'done' ? (
                    <Check size={18} />
                  ) : ['error', 'warning'].includes(step.status) ? (
                    <TriangleAlert size={18} />
                  ) : step.status === 'active' ? (
                    <LoaderCircle size={18} className="splash-spinner" />
                  ) : key === 'account' ? (
                    <ShieldCheck size={18} />
                  ) : (
                    <Download size={18} />
                  )}
                </span>
                <div>
                  <strong>{title}</strong>
                  <small>{step.message}</small>
                </div>
              </div>
            );
          })}
        </div>
        <div className="splash-progress" role="status">
          <span>{message}</span>
          {typeof percent === 'number' && <b>{Math.round(percent)}%</b>}
        </div>
        <div
          className={`splash-progress-track ${percent === null && !failed && !downloaded ? 'is-indeterminate' : ''}`}
          role="progressbar"
          aria-label="Startup progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={typeof percent === 'number' ? percent : undefined}
        >
          <span
            style={
              typeof percent === 'number'
                ? { width: `${Math.max(0, Math.min(100, percent))}%` }
                : undefined
            }
          />
        </div>
        {(failed || downloaded) && (
          <div className="splash-actions">
            {downloaded ? (
              <button className="play-button" onClick={onInstall}>
                <Download size={17} /> Restart and update
              </button>
            ) : (
              <>
                <button className="play-button" onClick={onRetry}>
                  <RefreshCw size={17} /> Retry startup
                </button>
                <button className="outline-button" onClick={onContinue}>
                  Open launcher
                </button>
              </>
            )}
          </div>
        )}
        {failed && (
          <p className="splash-footnote">
            You can open the launcher to review settings. Play still requires
            the latest modpack.
          </p>
        )}
      </div>
    </main>
  );
}
