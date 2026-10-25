import { useState } from 'react';
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

// Page composition lives here; desktop requests and subscriptions live in useLauncher.
export default function App({ api }) {
  const [page, setPage] = useState('home');
  const { state, actions } = useLauncher(api);
  const updateBusy = state.busy || state.game.running;

  if (state.bootVisible) {
    return (
      <>
        <WindowTitleBar
          api={api}
          pageLabel="Starting up"
          onOpenFolder={() => api?.folder().catch(() => {})}
        />
        <StartupSplash
          state={state.bootState}
          progress={state.progress}
          update={state.launcherUpdate}
          onRetry={actions.retryStartup}
          onContinue={actions.openAfterStartupFailure}
          onInstall={actions.installLauncherUpdate}
        />
      </>
    );
  }

  const accountPanel = (
    <AccountPanel
      api={api}
      mode={state.mode}
      sessionMode={state.sessionMode}
      game={state.game}
      launchPhase={state.launchPhase}
      username={state.username}
      account={state.account}
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
      />
      <div className={`app-shell ${page === 'home' ? 'is-home' : ''}`}>
        <Sidebar
          api={api}
          page={page}
          onNavigate={setPage}
          account={state.account}
          username={state.username}
          session={state.config.session}
        />
        <main className="main-shell">
          <div className="page-content">
            <PageHeading
              page={PAGES[page]}
              server={state.server}
              refreshing={state.serverRefreshing}
            />
            <LauncherAlerts
              error={state.error}
              onDismiss={() => actions.setError('')}
              launcherUpdate={state.launcherUpdate}
              disabled={updateBusy}
              onRetryUpdate={actions.checkLauncherUpdate}
            />
            <UpdateNotices
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
                onNavigate={setPage}
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
                config={state.config}
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
                onManageMods={() => setPage('mods')}
                onOpenCurseForge={() =>
                  actions.performAction(() => api.packPage())
                }
                progress={state.progress}
                logs={state.logs}
              />
            )}
            {page === 'settings' && (
              <Preferences
                api={api}
                draft={state.draft}
                onChange={actions.setDraft}
                busy={state.busy}
                onSave={actions.savePreferences}
                saved={state.progress.message === 'Settings saved'}
                launcherUpdate={state.launcherUpdate}
                onCheckUpdate={actions.checkLauncherUpdate}
                onInstallUpdate={actions.installLauncherUpdate}
                updateBusy={updateBusy}
              />
            )}
            {page === 'mods' && (
              <ModsPage
                api={api}
                busy={state.busy}
                onAction={actions.performAction}
                onInstall={() => setPage('modpack')}
              />
            )}
            <PageFooter
              onRefresh={actions.refreshServer}
              refreshing={state.serverRefreshing}
              onError={actions.setError}
            />
          </div>
        </main>
      </div>
    </>
  );
}
