import { useState } from 'react';
import { Save, Gamepad2, Monitor, RefreshCw, UserRound } from 'lucide-react';
import { DEFAULT_SETTINGS } from '../config';
import MemorySettings from './MemorySettings';
import JavaSettings from './JavaSettings';

export default function Preferences({
  api,
  draft,
  onChange,
  busy,
  onSave,
  saved,
  launcherUpdate,
  onCheckUpdate,
  onInstallUpdate,
  updateBusy,
  accountPanel,
}) {
  const [tab, setTab] = useState('game');
  return (
    <section className="panel preferences">
      <div
        className="preferences-tabs"
        role="tablist"
        aria-label="Раздели с настройки"
      >
        {[
          ['game', Gamepad2, 'Игра'],
          ['launcher', Monitor, 'Приложение'],
          ['account', UserRound, 'Профил'],
        ].map(([id, Icon, label]) => (
          <button
            key={id}
            id={`settings-${id}-tab`}
            role="tab"
            aria-selected={tab === id}
            aria-controls={`settings-${id}`}
            onClick={() => setTab(id)}
          >
            <Icon size={22} />
            {label}
          </button>
        ))}
      </div>
      <div
        id="settings-game"
        role="tabpanel"
        aria-labelledby="settings-game-tab"
        hidden={tab !== 'game'}
      >
        <div className="preferences-game-grid">
          <MemorySettings
            api={api}
            allocation={draft.memory}
            onChange={(memory) => onChange({ ...draft, memory })}
          />
          <JavaSettings
            api={api}
            paths={draft.javaPaths}
            disabled={busy}
            onChange={(javaPaths) => onChange({ ...draft, javaPaths })}
          />
          <div className="settings-group game-window-settings">
            <h3>Прозорец на играта</h3>
            <div className="game-window-dimensions">
              {[
                ['width', 'Широчина', 640, 7680],
                ['height', 'Височина', 480, 4320],
              ].map(([key, label, min, max]) => (
                <label key={key} htmlFor={`game-${key}`}>
                  {label}
                  <input
                    id={`game-${key}`}
                    type="number"
                    min={min}
                    max={max}
                    value={
                      (draft.gameWindow || DEFAULT_SETTINGS.gameWindow)[key]
                    }
                    disabled={busy || draft.gameWindow?.fullscreen}
                    onChange={(event) =>
                      onChange({
                        ...draft,
                        gameWindow: {
                          ...(draft.gameWindow || DEFAULT_SETTINGS.gameWindow),
                          [key]: event.target.value,
                        },
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                role="switch"
                checked={draft.gameWindow?.fullscreen || false}
                disabled={busy}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    gameWindow: {
                      ...(draft.gameWindow || DEFAULT_SETTINGS.gameWindow),
                      fullscreen: event.target.checked,
                    },
                  })
                }
              />
              <span>
                <strong>Цял екран</strong>
                <small>Стартира играта в режим на цял екран.</small>
              </span>
            </label>
          </div>
          <div className="settings-group startup-settings">
            <h3>Стартиране</h3>
            <label className="settings-toggle">
              <input
                type="checkbox"
                role="switch"
                checked={draft.hideOnLaunch || false}
                disabled={busy}
                onChange={(event) =>
                  onChange({ ...draft, hideOnLaunch: event.target.checked })
                }
              />
              <span>
                <strong>Скривай приложението след стартиране</strong>
                <small>Показва се отново, когато затвориш Minecraft.</small>
              </span>
            </label>
          </div>
        </div>
        <div className="preferences-actions">
          <span role="status">{saved ? 'Промените са запазени.' : ''}</span>
          <button
            className="outline-button"
            disabled={busy}
            onClick={() =>
              onChange({
                ...draft,
                memory: DEFAULT_SETTINGS.memory,
                javaPath: DEFAULT_SETTINGS.javaPath,
                javaPaths: {},
                gameWindow: { ...DEFAULT_SETTINGS.gameWindow },
                hideOnLaunch: false,
              })
            }
          >
            <RefreshCw size={18} />
            Възстанови настройките
          </button>
          <button className="play-button" disabled={busy} onClick={onSave}>
            <Save size={18} />
            Запази промените
          </button>
        </div>
      </div>
      <div
        id="settings-launcher"
        role="tabpanel"
        aria-labelledby="settings-launcher-tab"
        hidden={tab !== 'launcher'}
        className="launcher-update-preferences"
      >
        <div>
          <strong>Приложение {launcherUpdate?.version || ''}</strong>
          <p>
            {launcherUpdate?.status === 'downloaded'
              ? `Версия ${launcherUpdate.latestVersion} е готова за инсталиране.`
              : launcherUpdate?.status === 'current'
                ? 'Приложението е обновено до последната версия.'
                : launcherUpdate?.status === 'development'
                  ? 'Автоматичните обновявания са достъпни в инсталираното приложение.'
                  : 'При отваряне приложението проверява автоматично за обновявания.'}
          </p>
        </div>
        <button
          className="outline-button"
          disabled={updateBusy}
          onClick={
            launcherUpdate?.status === 'downloaded'
              ? onInstallUpdate
              : onCheckUpdate
          }
        >
          <RefreshCw size={15} />
          {launcherUpdate?.status === 'downloaded'
            ? 'Рестартирай и обнови'
            : 'Провери за нова версия'}
        </button>
      </div>
      <div
        id="settings-account"
        role="tabpanel"
        aria-labelledby="settings-account-tab"
        hidden={tab !== 'account'}
      >
        {accountPanel}
      </div>
    </section>
  );
}
