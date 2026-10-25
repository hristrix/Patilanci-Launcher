import { ArrowDownToLine, ArrowRight, Check, Play, Square } from 'lucide-react';
import LaunchProgress from './LaunchProgress';

function launchButtonLabel(game, busy, launchPhase, installed) {
  if (game.stopping) return 'STOPPING…';
  if (game.running) return 'STOP MINECRAFT';
  if (busy && launchPhase === 'starting') return 'STARTING…';
  if (busy) return 'PREPARING…';
  return `LAUNCH ${installed?.minecraft || 'MINECRAFT'}`;
}

export default function LaunchControls({
  game,
  launchPhase,
  busy,
  installed,
  progress,
  mode,
  offlineRemembered,
  onPlay,
  onStop,
}) {
  const activePhase = game.running ? 'running' : launchPhase;
  return (
    <div className="launch-controls" data-launch-phase={activePhase}>
      <div className="play-area">
        <div className="install-state">
          <span
            className={`install-state-icon ${installed ? 'is-installed' : ''}`}
          >
            {installed ? <Check size={15} /> : <ArrowDownToLine size={15} />}
          </span>
          <div>
            <strong>
              {installed
                ? 'Patilanci installed'
                : 'We’ll install the latest pack'}
            </strong>
            <small>
              {installed
                ? `Minecraft ${installed.minecraft} · Updates automatic`
                : 'Checked and updated before every launch'}
            </small>
          </div>
        </div>
        <button
          className="play-button"
          disabled={
            busy ||
            game.stopping ||
            (!game.running && mode === 'offline' && !offlineRemembered)
          }
          onClick={game.running ? onStop : onPlay}
          aria-label={
            game.running
              ? game.stopping
                ? 'Stopping Minecraft'
                : 'Stop Minecraft'
              : 'Play Minecraft'
          }
        >
          {game.running ? (
            <Square size={19} fill="currentColor" />
          ) : (
            <Play size={19} fill="currentColor" />
          )}
          <span>{launchButtonLabel(game, busy, launchPhase, installed)}</span>
          <ArrowRight size={19} />
        </button>
      </div>
      <LaunchProgress
        game={game}
        launchPhase={launchPhase}
        busy={busy}
        progress={progress}
      />
    </div>
  );
}
