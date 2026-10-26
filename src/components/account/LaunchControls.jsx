import { ArrowDownToLine, ArrowRight, Check, Play, Square } from 'lucide-react';
import LaunchProgress from './LaunchProgress';

function launchButtonLabel(game, busy, launchPhase, signedIn) {
  if (game.stopping) return 'СПИРАНЕ…';
  if (game.running) return 'СПРИ ИГРАТА';
  if (busy && launchPhase === 'starting') return 'СТАРТИРАНЕ…';
  if (busy) return 'ПОДГОТОВКА…';
  return signedIn ? 'ИГРАЙ' : 'ВЛЕЗ';
}

export default function LaunchControls({
  game,
  launchPhase,
  busy,
  installed,
  progress,
  mode,
  offlineRemembered,
  signedIn = true,
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
                ? 'Патиланци е инсталиран'
                : 'Ще инсталираме последната версия на пакета'}
            </strong>
            <small>
              {installed
                ? `Minecraft ${installed.minecraft} · Автоматично обновяване`
                : 'Проверява се и се обновява преди всяко стартиране'}
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
                ? 'Спиране на Minecraft'
                : 'Спри Minecraft'
              : 'Играй Minecraft'
          }
        >
          {game.running ? (
            <Square size={19} fill="currentColor" />
          ) : (
            <Play size={19} fill="currentColor" />
          )}
          <span>{launchButtonLabel(game, busy, launchPhase, signedIn)}</span>
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
