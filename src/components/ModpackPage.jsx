import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Layers,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import WorldScene from './WorldScene';

export default function ModpackPage({
  config,
  busy,
  updateState,
  onRetry,
  onManageMods,
  onOpenCurseForge,
  progress,
  logs,
}) {
  const pack = config.installed;
  const checking = updateState.status === 'checking';
  const failed = updateState.status === 'failed';
  const verified = updateState.status === 'ready' && Boolean(pack);
  const title = checking
    ? 'Getting your pack ready.'
    : failed
      ? 'Update needs attention.'
      : verified
        ? 'You’re up to date.'
        : 'Automatic updates enabled.';

  return (
    <div className="pack-overview">
      <section className="panel pack-identity">
        <div className="pack-art" aria-hidden="true">
          <WorldScene />
          <BrandLogo decorative />
        </div>
        <div className="pack-introduction">
          <span className="overline">THE OFFICIAL COMMUNITY MODPACK</span>
          <h2>
            Patilanci <span>Adventures</span>
          </h2>
          <p>
            More places to explore. More ways to build. One shared world with
            your people.
          </p>
          <div className="chips">
            <span>Fabric</span>
            {pack && <span>Minecraft {pack.minecraft}</span>}
            <span>Java 21</span>
          </div>
          <div className="pack-links">
            <button className="outline-button" onClick={onManageMods}>
              <Layers size={17} />
              Explore mods
              <ArrowRight size={16} />
            </button>
            <button className="text-button" onClick={onOpenCurseForge}>
              View on CurseForge <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <section
        className="panel pack-update"
        data-update-status={updateState.status}
      >
        <div className="pack-update-heading">
          <span className="pack-update-icon">
            {checking ? <RefreshCw size={22} /> : <ShieldCheck size={22} />}
          </span>
          <div>
            <span className="overline">UPDATES ARE AUTOMATIC</span>
            <h3 aria-live="polite">{title}</h3>
          </div>
          {verified && (
            <span className="pack-verified">
              <Check size={14} /> Verified this session
            </span>
          )}
        </div>
        <p className="pack-update-description">
          {failed
            ? 'The latest release could not be prepared. Check your connection and retry. If this continues, contact the Patilanci launcher administrator.'
            : 'Every time you open the launcher, we check CurseForge and download the latest pack when needed. Play checks again before starting Minecraft.'}
        </p>

        <dl className="pack-facts">
          <div>
            <dt>Installed release</dt>
            <dd>
              {pack?.releaseName ||
                (pack
                  ? `Manifest version ${pack.version}`
                  : 'Not installed yet')}
            </dd>
          </div>
          <div>
            <dt>Included mods</dt>
            <dd>
              {pack ? `${pack.mods} pack mods` : 'Available after installation'}
            </dd>
          </div>
        </dl>

        {checking && (
          <div className="pack-update-progress" role="status">
            <p>{progress.message}</p>
            {progress.percent !== null && (
              <div
                className="progress-track"
                role="progressbar"
                aria-label="Modpack update"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress.percent}
              >
                <div style={{ width: `${progress.percent}%` }} />
              </div>
            )}
          </div>
        )}
        {failed && (
          <button
            className="outline-button pack-retry"
            disabled={busy}
            onClick={onRetry}
          >
            <RefreshCw size={16} /> Retry update
          </button>
        )}
        <p className="pack-preservation">
          Your saves and personally added mods are kept during updates.
        </p>
      </section>

      <details className="panel pack-activity">
        <summary>
          Launcher activity <ChevronDown size={16} />
        </summary>
        <div className="console" role="log" aria-label="Launcher activity">
          {logs.length
            ? logs.map((message, index) => <div key={index}>{message}</div>)
            : 'Activity will appear here when the launcher checks for updates.'}
        </div>
      </details>
    </div>
  );
}
