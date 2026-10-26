import { version as launcherVersion } from '../../../package.json';
import {
  Box,
  ChevronDown,
  Home,
  Puzzle,
  Settings,
  Terminal,
  Users,
} from 'lucide-react';
import PlayerHead from '../PlayerHead';

export default function Sidebar({
  api,
  page,
  onNavigate,
  account,
  username,
  session,
  offlineSkin,
  onAccount,
  onConsole,
}) {
  const offline = session?.authenticated && session.mode === 'offline';
  const playerName = offline ? username : account?.name;
  const skinAccount = offline
    ? {
        id: `offline:${session.name.toLowerCase()}`,
        name: session.name,
        mode: 'offline',
        skinRevision: offlineSkin?.revision,
      }
    : account;
  return (
    <aside className="sidebar">
      <button
        className="brand-link"
        onClick={() => onNavigate('home')}
        aria-label="Начало на Патиланци"
      >
        <span className="brand-monogram">
          <img
            className="brand-logo"
            src="./brand/patilanci-monogram.svg"
            alt="Patilanci"
          />
        </span>
        <span className="brand-wordmark">
          <strong>ПАТИЛАНЦИ</strong>
          <small>ПРИЛОЖЕНИЕ</small>
        </span>
      </button>
      <div className="nav-caption">ИГРА</div>
      <nav aria-label="Основна навигация">
        {[
          { id: 'home', icon: Home, label: 'Начало' },
          { id: 'modpack', icon: Box, label: 'Пакет с добавки' },
          { id: 'mods', icon: Puzzle, label: 'Моите добавки' },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            data-page={id}
            className={`nav-item ${page === id ? 'is-active' : ''}`}
            onClick={() => onNavigate(id)}
            aria-current={page === id ? 'page' : undefined}
          >
            <Icon size={22} />
            <strong>{label}</strong>
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button
          data-page="players"
          className={`nav-item community-link ${page === 'players' ? 'is-active' : ''}`}
          onClick={() => onNavigate('players')}
          aria-current={page === 'players' ? 'page' : undefined}
        >
          <Users size={21} />
          <strong>Общност</strong>
        </button>
        <button
          data-page="settings"
          className={`nav-item settings-link ${page === 'settings' ? 'is-active' : ''}`}
          onClick={() => onNavigate('settings')}
          aria-current={page === 'settings' ? 'page' : undefined}
        >
          <Settings size={22} />
          <strong>Настройки</strong>
        </button>
        <button
          data-page="console"
          className={`nav-item ${page === 'console' ? 'is-active' : ''}`}
          onClick={onConsole}
          aria-current={page === 'console' ? 'page' : undefined}
        >
          <Terminal size={22} />
          <strong>Логове</strong>
        </button>
        <button
          className="sidebar-profile"
          onClick={onAccount}
          aria-label="Управление на профила"
          aria-expanded={undefined}
        >
          <div className="profile-avatar">
            <PlayerHead account={skinAccount} api={api} />
            <i className={`profile-online ${playerName ? 'is-online' : ''}`} />
          </div>
          <div>
            <strong>{playerName || 'Не си влязъл'}</strong>
            <small>
              {playerName ? (offline ? 'Местен профил' : 'Microsoft') : 'Вход'}
            </small>
          </div>
          <ChevronDown size={16} />
        </button>
        <div className="launcher-version">v{launcherVersion}</div>
      </div>
    </aside>
  );
}
