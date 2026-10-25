import { Check } from 'lucide-react';

const LAUNCH_STEPS = [
  { id: 'preparing', label: 'Preparing' },
  { id: 'starting', label: 'Starting' },
  { id: 'running', label: 'Running' },
];

function LaunchSteps({ activePhase }) {
  const currentStep = LAUNCH_STEPS.findIndex((step) => step.id === activePhase);
  if (currentStep === -1) return null;

  return (
    <ol className="launch-steps" aria-label="Minecraft launch progress">
      {LAUNCH_STEPS.map(({ id, label }, index) => {
        const completed = currentStep > index;
        return (
          <li
            key={id}
            className={completed ? 'is-complete' : ''}
            aria-current={activePhase === id ? 'step' : undefined}
          >
            <span aria-hidden="true">
              {completed ? <Check size={10} /> : index + 1}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

export default function LaunchProgress({ game, launchPhase, busy, progress }) {
  const activePhase = game.running ? 'running' : launchPhase;
  const launching = !game.running && launchPhase !== 'idle';
  const showProgress =
    !game.running &&
    busy &&
    (launching ||
      (Number.isFinite(progress.percent) && progress.percent < 100));
  const percent = Number.isFinite(progress.percent)
    ? Math.min(100, Math.max(0, progress.percent))
    : null;
  const ready = !busy && !launching && (game.running || percent === 100);

  return (
    <>
      <LaunchSteps activePhase={activePhase} />
      <div
        className={`progress-summary ${ready ? 'is-ready' : ''}`}
        role="status"
      >
        {ready ? (
          <Check size={13} />
        ) : (
          <span className={`status-dot ${busy ? 'is-working' : ''}`} />
        )}
        <span>
          {game.stopping
            ? 'Stopping Minecraft…'
            : game.running
              ? 'Minecraft is running.'
              : progress.message}
        </span>
        {showProgress && percent !== null && <b>{percent}%</b>}
      </div>
      {showProgress && (
        <div
          className={`progress-track ${percent === null ? 'is-indeterminate' : ''}`}
          role="progressbar"
          aria-label="Minecraft preparation"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent ?? undefined}
        >
          <div style={{ width: percent === null ? '35%' : `${percent}%` }} />
        </div>
      )}
    </>
  );
}
