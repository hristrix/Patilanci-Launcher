import { ChevronDown, Cpu, SlidersHorizontal } from 'lucide-react';
import GrassBlock from '../GrassBlock';
import LaunchControls from '../account/LaunchControls';

export default function LaunchBar({ state, actions, onNavigate, onAccount }) {
  const { config, game, sessionMode } = state;
  return (
    <footer className="launch-bar" aria-label="Управление на играта">
      <div class="launch-pack">
        <button
        className="launch-memory"
        onClick={() => onNavigate('settings')}
        aria-label="Настройки на паметта"
      >
        <Cpu size={27} />
        <span>
          <small>Оперативна памет</small>
          <strong>{config.memory} ГБ</strong>
        </span>
        <ChevronDown size={18} />
      </button>
      <button
        className="icon-button launch-settings"
        onClick={() => onNavigate('settings')}
        aria-label="Отвори настройките"
      >
        <SlidersHorizontal size={22} />
      </button>
      </div>
      <div className="launch-bar-action">
        <LaunchControls
          game={game}
          launchPhase={state.launchPhase}
          busy={state.busy}
          installed={config.installed}
          progress={state.progress}
          mode={state.mode}
          offlineRemembered={sessionMode === 'offline'}
          signedIn={Boolean(sessionMode)}
          onPlay={sessionMode ? actions.play : onAccount}
          onStop={actions.stop}
        />
        <small className="launch-minecraft-version">
          Minecraft {config.installed?.minecraft || '—'}
        </small>
      </div>
    </footer>
  );
}
