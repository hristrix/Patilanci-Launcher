import { useState } from 'react';
import { Bell } from 'lucide-react';
import { PAGES } from './config';
import { storageLabel } from './lib/storage.mjs';
import useLauncher from './hooks/useLauncher';
import AccountPanel from './components/account/AccountPanel';
import Sidebar from './components/layout/Sidebar';
import PageHeading from './components/layout/PageHeading';
import PageFooter from './components/layout/PageFooter';
import LauncherAlerts from './components/layout/LauncherAlerts';
import HomeOverview from './components/HomeOverview';
import PlayerPanel from './components/PlayerPanel';
import Preferences from './components/Preferences';
import ModpackPage from './components/ModpackPage';
import ModsPage from './components/ModsPage';
import StartupSplash from './components/StartupSplash';
import UpdateNotices from './components/UpdateNotices';
import WindowTitleBar from './components/WindowTitleBar';
import UpdateRestartScreen from './components/UpdateRestartScreen';
import LaunchBar from './components/layout/LaunchBar';
import GameConsole from './components/GameConsole';
import NotificationsPanel from './components/NotificationsPanel';

// Page composition lives here; desktop requests and subscriptions live in useLauncher.
export default function App({ api }) {
  const [page, setPage] = useState('home');
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [modsCollection, setModsCollection] = useState('personal');
  const { state, actions } = useLauncher(api);
  const updateBusy = state.busy || state.game.running;
  function navigate(nextPage) {
    if (nextPage === 'mods') setModsCollection('personal');
    setPage(nextPage);
  }
  function openAccount() {
    setPage('home');
    setAccountOpen(true);
  }

  if (state.launcherUpdate?.status === 'installing') {
    return (
      <>
        <WindowTitleBar api={api} pageLabel="Обновяване на приложението" />
        <UpdateRestartScreen version={state.launcherUpdate.latestVersion} />
      </>
    );
  }

  if (state.bootVisible) {
    return (
      <>
        <WindowTitleBar api={api} pageLabel="Подготовка" startup />
        <StartupSplash
          state={state.bootState}
          progress={state.progress}
          logs={state.logs}
          update={state.launcherUpdate}
          afterUpdate={state.afterUpdate}
          error={state.error}
          onRetry={actions.retryStartup}
          onContinue={actions.openAfterStartupFailure}
          onInstall={actions.installLauncherUpdate}
        />
      </>
    );
  }

  const accountPanel = (
    <AccountPanel
      showLaunch={false}
      api={api}
      mode={state.mode}
      sessionMode={state.sessionMode}
      game={state.game}
      launchPhase={state.launchPhase}
      username={state.username}
      account={state.account}
      offlineSkin={state.config.offlineSkin}
      busy={state.busy}
      installed={state.config.installed}
      progress={state.progress}
      onStop={actions.stop}
      onModeChange={actions.setMode}
      onUsernameChange={actions.setUsername}
      onLogin={actions.login}
      onOfflineLogin={actions.loginOffline}
      onSignOut={actions.signOut}
      onPlay={actions.play}
      onAction={actions.performAction}
      onSkinApplied={actions.reloadConfiguration}
    />
  );

  return (
    <>
      <WindowTitleBar
        api={api}
        pageLabel={PAGES[page].label}
        onOpenFolder={() => actions.performAction(() => api.folder())}
        onOpenConsole={() => actions.performAction(() => api.openConsole())}
        notificationControl={
          <button
            className="window-control notification-button"
            aria-label="Известия"
            title="Известия"
            aria-controls="notifications-panel"
            aria-expanded={notificationsOpen}
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              if (!notificationsOpen) void actions.checkUpdates();
            }}
          >
            <Bell size={19} />
            {(state.error ||
              state.modpackUpdate?.status === 'available' ||
              ['downloading', 'downloaded'].includes(
                state.launcherUpdate?.status,
              )) && <i />}
          </button>
        }
      />
      <div
        className={`app-shell page-${page} ${page === 'home' ? 'is-home' : ''}`}
      >
        <Sidebar
          api={api}
          page={page}
          onNavigate={navigate}
          account={state.account}
          username={state.username}
          session={state.config.session}
          offlineSkin={state.config.offlineSkin}
          onAccount={openAccount}
          onConsole={() => setPage('console')}
        />
        <main className="main-shell">
          <div className="page-content">
            {notificationsOpen && (
              <div className="notification-area">
                <NotificationsPanel
                  state={state}
                  actions={actions}
                  onClose={() => setNotificationsOpen(false)}
                />
              </div>
            )}
            {page !== 'mods' && page !== 'console' && (
              <PageHeading
                page={PAGES[page]}
                server={state.server}
                refreshing={state.serverRefreshing}
                playerName={
                  state.sessionMode === 'offline'
                    ? state.username
                    : state.account?.name
                }
              />
            )}
            <LauncherAlerts
              error={state.error}
              onDismiss={() => actions.setError('')}
              launcherUpdate={state.launcherUpdate}
              disabled={updateBusy}
              onRetryUpdate={actions.checkLauncherUpdate}
            />
            <UpdateNotices
              updatedVersion={
                state.afterUpdate ? state.launcherUpdate?.version : null
              }
              launcherUpdate={state.launcherUpdate}
              modpackUpdate={state.modpackUpdate}
              busy={state.busy}
              running={state.game.running}
              onRestart={actions.installLauncherUpdate}
              onUpdatePack={actions.installPack}
            />
            {page === 'home' && (
              <HomeOverview
                config={state.config}
                server={state.server}
                storageText={storageLabel(state.storage)}
                accountPanel={accountPanel}
                onNavigate={navigate}
                sessionMode={state.sessionMode}
                accountOpen={accountOpen}
                onCloseAccount={() => setAccountOpen(false)}
                updateState={state.updateState}
                lastChecked={
                  state.modpackUpdate?.checkedAt || state.updateState.checkedAt
                }
                updateAvailable={state.modpackUpdate?.status === 'available'}
                onOpenFolder={() => actions.performAction(() => api.folder())}
                onUpdate={actions.installPack}
                busy={updateBusy}
                refreshing={state.serverRefreshing}
              />
            )}
            {page === 'players' && (
              <div className="community-grid">
                <PlayerPanel
                  server={state.server}
                  onRefresh={actions.refreshServer}
                  refreshing={state.serverRefreshing}
                  expanded
                />
                {accountPanel}
              </div>
            )}
            {page === 'modpack' && (
              <ModpackPage
                api={api}
                config={state.config}
                onOpenFolder={() => actions.performAction(() => api.folder())}
                storage={state.storage}
                onRefreshStorage={actions.refreshStorage}
                busy={updateBusy}
                updateState={state.updateState}
                availableUpdate={
                  state.modpackUpdate?.status === 'available'
                    ? state.modpackUpdate
                    : null
                }
                onRetry={actions.installPack}
                onAction={actions.performAction}
                onOpenCurseForge={() =>
                  actions.performAction(() => api.packPage())
                }
                progress={state.progress}
                logs={state.logs}
              />
            )}
            {page === 'settings' && (
              <Preferences
                accountPanel={accountPanel}
                api={api}
                draft={state.draft}
                onChange={actions.setDraft}
                busy={state.busy}
                onSave={actions.savePreferences}
                saved={state.progress.message === 'Настройките са запазени'}
                launcherUpdate={state.launcherUpdate}
                onCheckUpdate={actions.checkLauncherUpdate}
                onInstallUpdate={actions.installLauncherUpdate}
                updateBusy={updateBusy}
              />
            )}
            {page === 'mods' && (
              <ModsPage
                collection={modsCollection}
                onCollectionChange={setModsCollection}
                api={api}
                busy={updateBusy}
                onAction={actions.performAction}
                onInstall={() => setPage('modpack')}
              />
            )}
            {page === 'console' && <GameConsole embedded api={api} />}
            {page !== 'mods' && (
              <PageFooter
                onOpenAuthor={api ? () => api.authorWebsite() : undefined}
                onRefresh={actions.refreshServer}
                refreshing={state.serverRefreshing}
                onError={actions.setError}
              />
            )}
          </div>
        </main>
      </div>
      <LaunchBar
        state={state}
        actions={actions}
        onNavigate={navigate}
        onAccount={openAccount}
      />
    </>
  );
}
