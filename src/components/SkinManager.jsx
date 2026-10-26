import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, ExternalLink, Upload, X } from 'lucide-react';
import SkinPreview from './SkinPreview';
import { skinCommand } from '../lib/skin-commands.mjs';
import './skin-manager.css';
import { localizeMessage } from '../../electron/messages.mjs';

export default function SkinManager({
  api,
  account,
  name,
  mode,
  busy,
  running,
  onAction,
  onApplied,
  onClose,
}) {
  const dialog = useRef(null);
  const [tab, setTab] = useState(mode === 'microsoft' ? 'account' : 'server');
  const [selection, setSelection] = useState(null);
  const [variant, setVariant] = useState('classic');
  const [source, setSource] = useState(
    mode === 'offline' ? 'ely.by' : 'mojang',
  );
  const [value, setValue] = useState(name || '');
  const [model, setModel] = useState('classic');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loadingSelection, setLoadingSelection] = useState(mode === 'offline');
  const locked = busy || running || loadingSelection;

  useEffect(() => {
    if (mode !== 'offline') return;
    let active = true;
    api
      .offlineSkinSelection()
      .then((saved) => {
        if (!active || !saved) return;
        setSource(saved.selection.source);
        setValue(saved.selection.value);
        setModel(saved.selection.model);
      })
      .catch(() => {
        if (active)
          setError(
            'Запазеният външен вид не може да бъде зареден. Избери нов или възстанови първоначалния.',
          );
      })
      .finally(() => {
        if (active) setLoadingSelection(false);
      });
    return () => {
      active = false;
    };
  }, [api, mode]);

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  let command = '';
  let commandError = '';
  try {
    command = skinCommand({ source, value, model });
  } catch (error) {
    commandError = error.message;
  }

  function act(callback) {
    setNotice('');
    setError('');
    return onAction(async () => {
      try {
        await callback();
      } catch (error) {
        setError(localizeMessage(error));
      }
    });
  }

  async function copy(command) {
    setError('');
    try {
      await navigator.clipboard.writeText(command);
      setNotice(
        'Командата е копирана. Влез в сървъра, постави я в разговора в Minecraft и натисни Enter.',
      );
    } catch {
      setError(
        'Копирането не успя. Избери командата по-долу и я копирай ръчно.',
      );
    }
  }

  return createPortal(
    <dialog
      className="skin-dialog"
      ref={dialog}
      aria-labelledby="skin-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="skin-dialog-heading">
        <div>
          <span className="overline">ТВОЯТ ГЕРОЙ</span>
          <h2 id="skin-title">Външен вид на героя</h2>
          <p>{name}</p>
        </div>
        <button
          className="icon-button"
          aria-label="Затвори избора на външен вид"
          disabled={busy}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      {mode === 'microsoft' && (
        <div
          className="skin-tabs"
          role="group"
          aria-label="Къде да се използва външният вид"
        >
          <button
            className="outline-button"
            aria-pressed={tab === 'account'}
            disabled={busy}
            onClick={() => {
              setTab('account');
              setNotice('');
              setError('');
            }}
          >
            Профил в Minecraft
          </button>
          <button
            className="outline-button"
            aria-pressed={tab === 'server'}
            disabled={busy}
            onClick={() => {
              setTab('server');
              setNotice('');
              setError('');
            }}
          >
            Външен вид в сървъра
          </button>
        </div>
      )}
      {tab === 'account' ? (
        <div className="skin-account-editor">
          <div className="skin-upload-preview">
            <SkinPreview
              account={account}
              api={api}
              previewTexture={
                selection
                  ? {
                      ...selection.texture,
                      model: variant === 'slim' ? 'slim' : 'default',
                    }
                  : null
              }
            />
          </div>
          <div className="skin-upload-controls">
            <h3>Външен вид в Minecraft Java</h3>
            <p>
              Качи изображение за своя Minecraft профил. Някои сървъри могат да
              зададат различен външен вид.
            </p>
            <p>
              Избери PNG изображение с размер 64 × 64 или 64 × 32 точки, до 1
              МБ. При размер 64 × 32 се използват стандартни ръце. Затвори
              Minecraft преди качването.
            </p>
            <button
              className="outline-button"
              disabled={locked}
              onClick={() =>
                act(async () => {
                  const next = await api.chooseSkin();
                  if (next) {
                    setSelection(next);
                    if (next.legacy) setVariant('classic');
                  }
                })
              }
            >
              <Upload size={16} />
              Избери изображение
            </button>
            <span className="skin-file-name">
              {selection?.name || 'Не е избрано ново изображение'}
            </span>
            <label htmlFor="account-skin-model">Форма на героя</label>
            <select
              id="account-skin-model"
              value={variant}
              disabled={busy || selection?.legacy}
              onChange={(event) => setVariant(event.target.value)}
            >
              <option value="classic">Стандартни ръце</option>
              <option value="slim">Тънки ръце</option>
            </select>
            <button
              className="play-button"
              disabled={locked || !selection}
              onClick={() =>
                act(async () => {
                  await api.applySkin({ id: selection.id, variant });
                  setSelection(null);
                  setNotice(
                    'Външният вид на Minecraft профила е обновен. Влез отново в играта, за да го видиш. Ако сървърът задава друг външен вид, първо използвай /skin reset.',
                  );
                  await onApplied();
                })
              }
            >
              Запази в Minecraft профила
            </button>
          </div>
        </div>
      ) : (
        <div className="skin-server-editor">
          <p>
            Избери външен вид за този сървър чрез SkinRestorer. Другите играчи
            ще го виждат, след като сървърът го приложи.
          </p>
          <p>
            Избери откъде да се вземе изображението, копирай командата и я
            изпълни в разговора в Minecraft след влизане в сървъра.{' '}
            {mode === 'offline'
              ? 'Избери „Запази за този профил“, за да се използва този външен вид и в приложението.'
              : 'Изображението в приложението може да се различава от външния вид в сървъра.'}
          </p>
          <label htmlFor="server-skin-source">
            Откъде да се вземе изображението
          </label>
          <select
            id="server-skin-source"
            disabled={busy || loadingSelection}
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setValue('');
              setNotice('');
            }}
          >
            <option value="ely.by">Потребителско име в Ely.by</option>
            <option value="mojang">Потребителско име в Minecraft</option>
            <option value="web">Връзка към PNG изображение</option>
          </select>
          {source === 'ely.by' && (
            <div className="skin-ely-help">
              <p>
                За свое изображение го качи в профила си в Ely.by и го избери
                там. После въведи потребителското име от Ely.by тук. То може да
                се различава от името ти в играта.
              </p>
              <button
                className="outline-button"
                disabled={busy}
                onClick={() => act(() => api.skinHelp('ely'))}
              >
                <ExternalLink size={14} />
                Отвори изображенията в Ely.by
              </button>
            </div>
          )}
          <label htmlFor="server-skin-value">
            {source === 'web'
              ? 'Публична защитена връзка към PNG изображението'
              : source === 'mojang'
                ? 'Име на играча, чийто външен вид да се използва'
                : 'Потребителско име в Ely.by'}
          </label>
          <input
            id="server-skin-value"
            disabled={busy || loadingSelection}
            value={value}
            autoComplete="off"
            spellCheck={false}
            maxLength={source === 'web' ? 256 : 16}
            onChange={(event) => {
              setValue(event.target.value);
              setNotice('');
            }}
            placeholder={
              source === 'web'
                ? 'https://example.com/skin.png'
                : 'Име на играча'
            }
          />
          {source === 'web' && (
            <>
              <label htmlFor="server-skin-model">Форма на героя</label>
              <select
                id="server-skin-model"
                disabled={busy || loadingSelection}
                value={model}
                onChange={(event) => {
                  setModel(event.target.value);
                  setNotice('');
                }}
              >
                <option value="classic">Стандартни ръце</option>
                <option value="slim">Тънки ръце</option>
              </select>
            </>
          )}
          <label htmlFor="server-skin-command">
            Команда за изпълнение в Minecraft
          </label>
          <textarea
            id="server-skin-command"
            readOnly
            rows={2}
            value={command}
            aria-describedby="server-skin-validation"
          />
          <small id="server-skin-validation">
            {commandError ||
              'Готово за копиране. Сървърът трябва да позволява тази команда и избрания източник.'}
          </small>
          <div className="skin-command-actions">
            {mode === 'offline' && (
              <button
                className="play-button"
                disabled={locked || !command}
                onClick={() =>
                  act(async () => {
                    await api.saveOfflineSkin({ source, value, model });
                    await onApplied();
                    setNotice(
                      'Външният вид е запазен за този местен профил и ще остане след рестартиране. Изпълни командата в Minecraft, за да го промениш и в сървъра.',
                    );
                  })
                }
              >
                Запази за този профил
              </button>
            )}
            <button
              className={mode === 'offline' ? 'outline-button' : 'play-button'}
              disabled={!command || busy || loadingSelection}
              onClick={() => copy(command)}
            >
              <Copy size={16} />
              Копирай командата
            </button>
            {mode === 'offline' && (
              <button
                className="outline-button"
                disabled={locked}
                onClick={() =>
                  act(async () => {
                    await api.resetOfflineSkin();
                    setSource('ely.by');
                    setValue(name);
                    setModel('classic');
                    await onApplied();
                    setNotice(
                      'Външният вид в приложението отново се търси по името на играча. Външният вид в сървъра не е променен.',
                    );
                  })
                }
              >
                Възстанови първоначалния вид
              </button>
            )}
            <button
              className="outline-button"
              onClick={() => copy('/skin reset')}
            >
              Копирай командата за възстановяване
            </button>
            <button
              className="outline-button"
              disabled={busy}
              onClick={() => act(() => api.skinHelp('commands'))}
            >
              <ExternalLink size={14} />
              Помощ за командите
            </button>
          </div>
          <p className="skin-server-note">
            Командите изискват сървърът да използва SkinRestorer на Lionarius и
            да ти разрешава промяната. Те променят външния вид само в този
            сървър, без да променят Minecraft профила ти.
          </p>
        </div>
      )}
      {notice && (
        <p className="skin-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="skin-error" role="alert">
          {error}
        </p>
      )}
    </dialog>,
    document.body,
  );
}
