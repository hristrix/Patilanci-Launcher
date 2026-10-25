import { version as launcherVersion } from '../../../package.json';
import { Box, ChevronRight, Home, Layers, Settings, Users } from 'lucide-react';
import BrandLogo from '../BrandLogo';
import PlayerHead from '../PlayerHead';

export default function Sidebar({
  api,
  page,
  onNavigate,
  account,
  username,
  session,
  offlineSkin,
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
  const navigation = [
    {
      id: 'home',
      icon: Home,
      label: 'Let’s play',
      subtitle: 'Your adventure starts here',
    },
    {
      id: 'modpack',
      icon: Box,
      label: 'Modpack',
      subtitle: 'Patilanci Adventures',
    },
    {
      id: 'players',
      icon: Users,
      label: 'Community',
      subtitle: 'Better with your people',
    },
    {
      id: 'mods',
      icon: Layers,
      label: 'Mods',
      subtitle: 'The pack and your additions',
    },
  ];

  return (
    <aside className="sidebar">
      <button
        className="brand-link"
        onClick={() => onNavigate('home')}
        aria-label="Patilanci home"
      >
        <BrandLogo />
        <span className="brand-caption">THE OFFICIAL LAUNCHER</span>
      </button>
      <div className="nav-caption">YOUR NEXT CHAPTER</div>
      <nav aria-label="Main navigation">
        {navigation.map(({ id, icon: Icon, label, subtitle }) => (
          <button
            key={id}
            data-page={id}
            className={`nav-item ${page === id ? 'is-active' : ''}`}
            onClick={() => onNavigate(id)}
            aria-current={page === id ? 'page' : undefined}
          >
            <Icon size={19} />
            <span>
              <strong>{label}</strong>
              <small>{subtitle}</small>
            </span>
            {page === id && <ChevronRight className="nav-arrow" size={15} />}
          </button>
        ))}
      </nav>
      <div className="community-note">
        <span className="pixel-cross" />
        <span className="overline">BUILT TOGETHER</span>
        <h3>
          Good people.
          <br />
          Great adventures.
        </h3>
        <p>One block at a time.</p>
        <div className="brand-stripe">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="sidebar-bottom">
        <button
          className={`settings-link ${page === 'settings' ? 'is-active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          <Settings size={17} />
          Launcher settings
          <ChevronRight size={14} />
        </button>
        <div className="sidebar-profile">
          <div className="profile-avatar">
            <PlayerHead account={skinAccount} api={api} />
          </div>
          <div>
            <strong>{playerName || 'Hey, adventurer'}</strong>
            <small>
              {offline
                ? 'Offline profile · Local PIN'
                : account
                  ? 'Microsoft connected'
                  : 'Your world is waiting'}
            </small>
          </div>
        </div>
        <div className="launcher-version">
          <span>PATILANCI SMP</span>
          <span>v{launcherVersion}</span>
        </div>
      </div>
    </aside>
  );
}
