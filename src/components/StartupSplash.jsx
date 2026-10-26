import { useRef } from 'react';
import {
  Check,
  Download,
  LoaderCircle,
  RefreshCw,
  TerminalSquare,
  TriangleAlert,
  UserRound,
  X,
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import Panorama from './Panorama';
import { localizeMessage } from '../../electron/messages.mjs';
import { version } from '../../package.json';

const titles = {
  launcher: 'Launcher',
  account: 'Акаунт',
  modpack: 'Patilanci Adventures',
};
const downloadSize = (bytes) =>
  `${new Intl.NumberFormat('bg-BG', { maximumFractionDigits: 1 }).format(bytes / 1_000_000)} МБ`;

export default function StartupSplash({
  state,
  progress = {},
  update,
  logs = [],
  afterUpdate = false,
  error,
  onRetry,
  onContinue,
  onInstall,
}) {
  const logDialog = useRef(null);
  const failed = state?.status === 'failed';
  const downloaded = state?.status === 'update-ready';
  const downloading = update?.status === 'downloading';
  const packProgress = state?.phase === 'modpack' ? progress : {};
  const rawPercent = downloading
    ? update.percent
    : state?.phase === 'modpack'
      ? packProgress.percent
      : null;
  const percent = Number.isFinite(rawPercent)
    ? Math.max(0, Math.min(100, rawPercent))
    : null;
  const transfer = downloading ? update : packProgress;
  const hasBytes = Number.isFinite(transfer?.transferred);
  const hasTotal = Number.isFinite(transfer?.total) && transfer.total > 0;
  const hasSpeed =
    Number.isFinite(transfer?.bytesPerSecond) && transfer.bytesPerSecond > 0;
  const hasFiles =
    Number.isInteger(transfer?.completedFiles) &&
    Number.isInteger(transfer?.totalFiles);
  const message = downloaded
    ? `Версия ${update?.latestVersion || state.launcher?.latestVersion} е готова`
    : failed
      ? localizeMessage(state.error)
      : downloading
        ? 'Изтегляне на последната версия на приложението…'
        : state?.phase === 'modpack'
          ? progress.message
          : localizeMessage(state?.steps?.[state?.phase]?.message) ||
            'Подготвяме следващото ти приключение…';
  const progressTitle = failed
    ? 'Подготовката е прекъсната'
    : downloaded
      ? 'Обновяването е готово'
      : downloading
        ? 'Изтегляне на приложението'
        : packProgress.stage === 'mods'
          ? 'Изтегляне на модове'
          : packProgress.stage === 'archive'
            ? 'Изтегляне на пакета'
            : message;
  return (
    <main className="startup-splash" aria-label="Подготовка на приложението">
      <div className="splash-landscape" aria-hidden="true">
        <Panorama />
      </div>
      <div className="splash-brand" aria-label="Патиланци Launcher">
        <BrandLogo decorative />
        <span className="splash-wordmark">
          <strong>ПАТИЛАНЦИ</strong>
          <span>LAUNCHER</span>
        </span>
      </div>
      <div className="splash-card">
        <div className="splash-heading">
          <h1>
            {failed
              ? 'Нека подготвим играта.'
              : downloaded
                ? 'Очаква те ново приключение.'
                : afterUpdate
                  ? 'Приложението е обновено.'
                  : 'Подготвяме приключението.'}
          </h1>
          <p>
            {afterUpdate
              ? 'Приложението се отвори отново. Подготвяме профила ти и света.'
              : 'Още малко и си в играта.'}
          </p>
        </div>
        <div className="splash-checks">
          {Object.entries(titles).map(([key, title]) => {
            const step = state?.steps?.[key] || {
              status: 'pending',
              message: 'Изчакване…',
            };
            const signedOut =
              key === 'account' && state?.account?.status === 'signed-out';
            const needsSignIn =
              key === 'account' &&
              state?.account?.status === 'sign-in-required';
            const neutral = signedOut || needsSignIn;
            const stepMessage = signedOut
              ? 'Без избран акаунт'
              : key === 'launcher' && state?.launcher?.status === 'current'
                ? 'Актуална версия.'
                : key === 'modpack' &&
                    step.status === 'active' &&
                    ['mods', 'archive'].includes(packProgress.stage)
                  ? 'Изтегляне на обновленията…'
                  : localizeMessage(step.message);
            return (
              <div
                key={key}
                className={`splash-check is-${neutral ? 'neutral' : step.status}`}
                data-step={key}
                role={step.status === 'error' ? 'alert' : undefined}
              >
                <span className="splash-step-icon">
                  {neutral ? (
                    <UserRound />
                  ) : step.status === 'done' ? (
                    <Check />
                  ) : ['error', 'warning'].includes(step.status) ? (
                    <TriangleAlert />
                  ) : step.status === 'active' ? (
                    <LoaderCircle className="splash-spinner" />
                  ) : key === 'account' ? (
                    <UserRound />
                  ) : (
                    <Download />
                  )}
                </span>
                <div>
                  <strong>{title}</strong>
                  <small
                    className={neutral ? 'splash-account-badge' : undefined}
                  >
                    {stepMessage}
                  </small>
                  {neutral && (
                    <p className="splash-account-hint">
                      Можеш да влезеш след стартиране.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="splash-download">
          <div className="splash-progress" role="status">
            <span>{progressTitle}</span>
            {typeof percent === 'number' && <b>{Math.round(percent)}%</b>}
          </div>
          <div
            className={`splash-progress-track ${percent === null && !failed && !downloaded ? 'is-indeterminate' : ''}`}
            role="progressbar"
            aria-label="Напредък на подготовката"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={typeof percent === 'number' ? percent : undefined}
          >
            <span
              style={
                typeof percent === 'number'
                  ? { width: `${Math.max(0, Math.min(100, percent))}%` }
                  : undefined
              }
            />
          </div>
          <div className="splash-transfer-details">
            <span>
              {hasFiles
                ? `${transfer.completedFiles} от ${transfer.totalFiles} файла`
                : failed
                  ? 'Опитай отново, за да продължиш.'
                  : downloaded
                    ? 'Рестартирай, за да приложиш обновяването.'
                    : 'Подготвяме всичко за играта.'}
            </span>
            {(hasBytes || hasSpeed) && (
              <span className="splash-transfer-rate">
                {hasBytes && (
                  <span>
                    {downloadSize(transfer.transferred)}
                    {hasTotal ? ` / ${downloadSize(transfer.total)}` : ''}
                  </span>
                )}
                {hasBytes && hasSpeed && <span aria-hidden="true">•</span>}
                {hasSpeed && (
                  <span>{downloadSize(transfer.bytesPerSecond)}/с</span>
                )}
              </span>
            )}
          </div>
        </div>
        {(failed || downloaded) && (
          <div className="splash-actions">
            {downloaded ? (
              <button className="play-button" onClick={onInstall}>
                <Download size={17} /> Рестартирай и обнови
              </button>
            ) : (
              <>
                <button className="play-button" onClick={onRetry}>
                  <RefreshCw size={17} /> Опитай отново
                </button>
                <button className="outline-button" onClick={onContinue}>
                  Отвори приложението
                </button>
              </>
            )}
          </div>
        )}
        {failed && (
          <p className="splash-footnote">
            Можеш да отвориш приложението, за да прегледаш настройките. За игра
            е необходима последната версия на пакета.
          </p>
        )}
        {downloaded && (
          <p className="splash-footnote">
            По време на обновяването ще виждаш напредъка в отделен прозорец.
            След това приложението ще се отвори автоматично.
          </p>
        )}
        {downloaded && (error || update?.error) && (
          <p className="splash-footnote" role="alert">
            {localizeMessage(error || update.error)}
          </p>
        )}
      </div>
      <footer className="splash-footer">
        <span>v{version}</span>
        <button type="button" onClick={() => logDialog.current.showModal()}>
          <TerminalSquare /> Виж лога
        </button>
      </footer>
      <dialog
        ref={logDialog}
        className="splash-log-dialog"
        aria-labelledby="splash-log-title"
      >
        <div className="splash-log-heading">
          <h2 id="splash-log-title">Действия при подготовката</h2>
          <button
            type="button"
            aria-label="Затвори лога"
            onClick={() => logDialog.current.close()}
          >
            <X size={22} />
          </button>
        </div>
        <div
          className="splash-log-output"
          role="log"
          aria-label="Действия при подготовката"
          tabIndex={0}
        >
          {logs.length
            ? logs.map((line, index) => <div key={index}>{line}</div>)
            : 'Все още няма съобщения.'}
        </div>
      </dialog>
    </main>
  );
}
