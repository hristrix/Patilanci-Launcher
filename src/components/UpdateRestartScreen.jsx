import { Check, LoaderCircle, RefreshCw } from 'lucide-react';
import BrandLogo from './BrandLogo';
import Panorama from './Panorama';
import { useSeasonalTheme } from './SeasonalTheme';
import SeasonalLoadingSound from './SeasonalLoadingSound';

export default function UpdateRestartScreen({ version }) {
  const { theme } = useSeasonalTheme();
  return (
    <main
      className="startup-splash update-restart-screen"
      aria-label="Рестартиране за обновяване"
      aria-busy="true"
    >
      {theme !== 'original' && (
        <div className="splash-landscape" aria-hidden="true">
          <Panorama />
        </div>
      )}
      <section className="splash-card">
        <div className="splash-brand">
          <BrandLogo />
          <span>ПАТИЛАНЦИ</span>
        </div>
        <div className="splash-heading">
          <span className="overline">НОВАТА ВЕРСИЯ Е ГОТОВА</span>
          <h1>Обновяване и рестартиране…</h1>
          <p>
            {version ? `Инсталиране на версия ${version}. ` : ''}Приложението ще
            се затвори за кратко и ще се отвори отново автоматично.
          </p>
        </div>
        <div className="splash-checks">
          <div className="splash-check is-done">
            <span className="splash-step-icon">
              <Check size={18} />
            </span>
            <div>
              <strong>Новата версия е изтеглена</strong>
              <small>
                Новата версия на приложението е готова за инсталиране.
              </small>
            </div>
          </div>
          <div className="splash-check is-active" role="status">
            <span className="splash-step-icon">
              <LoaderCircle size={18} className="splash-spinner" />
            </span>
            <div>
              <strong>Подготовка за рестартиране</strong>
              <small>
                Докато файловете се подменят, ще виждаш напредъка в отделен
                прозорец.
              </small>
            </div>
          </div>
          <div className="splash-check">
            <span className="splash-step-icon">
              <RefreshCw size={18} />
            </span>
            <div>
              <strong>Повторно отваряне на Патиланци</strong>
              <small>Профилът ти и файловете на Minecraft се запазват.</small>
            </div>
          </div>
        </div>
        <div
          className="splash-progress-track is-indeterminate"
          role="progressbar"
          aria-label="Подготовка на обновяването"
        >
          <span />
        </div>
        <p className="splash-footnote">
          Изчакай приложението да се отвори отново. Не е необходимо да стартираш
          инсталацията или да го отваряш повторно.
        </p>
        {theme !== 'original' && (
          <div className="restart-sound-control">
            <SeasonalLoadingSound />
          </div>
        )}
      </section>
    </main>
  );
}
