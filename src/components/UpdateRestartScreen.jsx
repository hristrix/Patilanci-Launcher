import { Check, LoaderCircle, RefreshCw } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function UpdateRestartScreen({ version }) {
  return (
    <main
      className="startup-splash update-restart-screen"
      aria-label="Launcher update restart"
      aria-busy="true"
    >
      <section className="splash-card">
        <div className="splash-brand">
          <BrandLogo />
          <span>PATILANCI LAUNCHER</span>
        </div>
        <div className="splash-heading">
          <span className="overline">YOUR UPDATE IS READY</span>
          <h1>Updating and restarting…</h1>
          <p>
            {version ? `Applying launcher ${version}. ` : ''}Patilanci will
            close briefly and reopen automatically.
          </p>
        </div>
        <div className="splash-checks">
          <div className="splash-check is-done">
            <span className="splash-step-icon">
              <Check size={18} />
            </span>
            <div>
              <strong>Update downloaded</strong>
              <small>The new launcher is ready to apply.</small>
            </div>
          </div>
          <div className="splash-check is-active" role="status">
            <span className="splash-step-icon">
              <LoaderCircle size={18} className="splash-spinner" />
            </span>
            <div>
              <strong>Preparing to restart</strong>
              <small>
                An update status window will stay visible while files are
                replaced.
              </small>
            </div>
          </div>
          <div className="splash-check">
            <span className="splash-step-icon">
              <RefreshCw size={18} />
            </span>
            <div>
              <strong>Reopening Patilanci</strong>
              <small>Your account and Minecraft files stay in place.</small>
            </div>
          </div>
        </div>
        <div
          className="splash-progress-track is-indeterminate"
          role="progressbar"
          aria-label="Preparing launcher update"
        >
          <span />
        </div>
        <p className="splash-footnote">
          Please wait for Patilanci to reopen. You do not need to start setup or
          launch another copy.
        </p>
      </section>
    </main>
  );
}
