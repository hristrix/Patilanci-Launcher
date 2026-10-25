import HomeHero from './home/HomeHero';
import HomeDashboard from './home/HomeDashboard';

export default function HomeOverview({
  config,
  server,
  accountPanel,
  onNavigate,
  storageText,
}) {
  return (
    <div className="home-grid home-overview">
      <HomeHero installed={config.installed} onNavigate={onNavigate}>
        {accountPanel}
      </HomeHero>
      <HomeDashboard
        config={config}
        server={server}
        storageText={storageText}
        onNavigate={onNavigate}
      />
    </div>
  );
}
