import { useEffect, useState } from 'react';
import {
  Box,
  Check,
  CirclePlus,
  File,
  Info,
  Layers,
  LockKeyhole,
  MoreHorizontal,
  Package,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import PageHeading from './layout/PageHeading';
import { PAGES } from '../config';
import { localizeMessage } from '../../electron/messages.mjs';

function ModIcon({ mod }) {
  const [failed, setFailed] = useState(null);
  return mod.iconDataUrl && failed !== mod.iconDataUrl ? (
    <img
      src={mod.iconDataUrl}
      alt=""
      onError={() => setFailed(mod.iconDataUrl)}
    />
  ) : (
    <Package size={29} />
  );
}

export default function ModsPage({
  api,
  busy,
  onAction,
  onInstall,
  collection = 'personal',
  onCollectionChange,
  embedded = false,
}) {
  const [inventory, setInventory] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [menu, setMenu] = useState(null);
  const [menuUp, setMenuUp] = useState(false);
  const bundled = collection === 'bundled';

  useEffect(() => {
    let active = true;
    if (!api) {
      setLoadError(
        'Отвори приложението на компютъра, за да управляваш добавките.',
      );
      return;
    }
    api
      .mods()
      .then((result) => {
        if (active) setInventory(result);
      })
      .catch((error) => {
        if (active) setLoadError(localizeMessage(error));
      });
    return () => {
      active = false;
    };
  }, [api]);

  useEffect(() => {
    setFilter('all');
    setSearch('');
    setMenu(null);
  }, [collection]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!menu) return;
    const close = (event) => {
      if (
        event.type === 'keydown'
          ? event.key === 'Escape'
          : !event.target.closest('.mod-actions')
      )
        setMenu(null);
    };
    document.addEventListener('click', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', close);
    };
  }, [menu]);

  function refresh() {
    return onAction(async () => {
      setInventory(await api.mods());
      setLoadError('');
    });
  }
  function addMods() {
    return onAction(async () => {
      const result = await api.addMods();
      setInventory(result);
      if (result.added > 0) {
        onCollectionChange?.('personal');
        setFilter('all');
        setSearch('');
        setNotice(`Добавени добавки: ${result.added}.`);
      }
    });
  }
  function removeMod(mod) {
    setMenu(null);
    return onAction(async () => {
      setInventory(await api.removeMod(mod.fileName));
      setNotice(
        `Добавката ${mod.name} е премахната. Оригиналният изтеглен файл е запазен.`,
      );
    });
  }
  function toggleMod(mod) {
    return onAction(async () => {
      setInventory(
        await api.setModEnabled({
          fileName: mod.fileName,
          enabled: mod.enabled === false,
        }),
      );
    });
  }

  const canModify = Boolean(
    inventory?.installed && inventory.canModify && !busy,
  );
  const mods = inventory?.[collection] || [];
  const query = search.toLocaleLowerCase().trim();
  const filtered = mods.filter(
    (mod) =>
      (filter === 'all' ||
        (filter === 'active'
          ? mod.present && mod.enabled !== false
          : mod.present && mod.enabled === false)) &&
      [mod.name, mod.id, mod.fileName, mod.description].some((value) =>
        value?.toLocaleLowerCase().includes(query),
      ),
  );
  const page = bundled
    ? {
        ...PAGES.mods,
        title: 'Включени добавки',
        description:
          'Добавките от основния пакет се управляват от приложението.',
      }
    : PAGES.mods;
  const headingAction = (
    <div className="mods-heading">
      <button className="play-button" onClick={addMods} disabled={!canModify}>
        <CirclePlus size={22} />
        Добави файл
      </button>
    </div>
  );

  return (
    <div className="mods-page">
      {embedded ? (
        <h3 className="installation-heading">Включени добавки</h3>
      ) : (
        <PageHeading page={page} actions={headingAction} />
      )}
      <section
        className="panel mods-panel"
        aria-label={bundled ? 'Добавки в пакета' : 'Моите добавки'}
      >
        {loadError && (
          <div className="mods-message" role="alert">
            {loadError}
            <button
              className="outline-button"
              onClick={refresh}
              disabled={busy}
            >
              Опитай отново
            </button>
          </div>
        )}
        {notice && (
          <div className="mods-notice" role="status">
            <Check size={16} />
            <span>{notice}</span>
            <button
              className="icon-button"
              onClick={() => setNotice('')}
              aria-label="Скрий съобщението за добавките"
            >
              <X size={15} />
            </button>
          </div>
        )}
        {inventory && !inventory.installed ? (
          <div className="mods-empty">
            <Box size={38} />
            <h3>Първо инсталирай Patilanci.</h3>
            <p>
              {bundled
                ? 'След инсталацията тук ще се показват добавките от пакета.'
                : 'След инсталацията добави свои Fabric добавки тук.'}
            </p>
            <button className="outline-button" onClick={onInstall}>
              Към пакета с добавки
            </button>
          </div>
        ) : (
          <>
            <div className="mods-toolbar">
              <label className="mods-search">
                <Search size={22} aria-hidden="true" />
                <input
                  aria-label="Търси добавки"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setMenu(null);
                  }}
                  placeholder="Търси добавка…"
                />
              </label>
              <div
                className="mods-tabs mods-filters"
                role="group"
                aria-label="Показване на добавките"
              >
                {[
                  ['all', 'Всички'],
                  ['active', 'Включени'],
                  ['disabled', 'Изключени'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={filter === id}
                    onClick={() => {
                      setFilter(id);
                      setMenu(null);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mod-list">
              <table
                className="mods-table"
                aria-label={
                  bundled
                    ? 'Списък с добавките в пакета'
                    : 'Списък с твоите добавки'
                }
              >
                <colgroup>
                  <col className="mod-column-name" />
                  <col className="mod-column-source" />
                  <col className="mod-column-status" />
                  <col className="mod-column-actions" />
                </colgroup>
                <thead>
                  <tr className="mod-table-heading">
                    <th scope="col">Добавка</th>
                    <th scope="col">Източник</th>
                    <th scope="col">Статус</th>
                    <th scope="col">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((mod) => {
                    const enabled = mod.present && mod.enabled !== false;
                    return (
                      <tr
                        className="mod-row"
                        key={mod.fileName}
                        data-origin={collection}
                      >
                        <td>
                          <div className="mod-identity">
                            <div
                              className={`mod-icon ${bundled ? 'is-protected' : ''}`}
                            >
                              <ModIcon mod={mod} />
                            </div>
                            <div className="mod-info">
                              <h3>{mod.name}</h3>
                              <p>{mod.description || mod.fileName}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="mod-source">
                            <File size={19} />
                            {bundled ? 'Основен пакет' : 'Файл от компютъра'}
                          </span>
                        </td>
                        <td>
                          <div className="mod-status">
                            <button
                              type="button"
                              role="switch"
                              aria-label={`Включи ${mod.name}`}
                              aria-checked={enabled}
                              className={`mod-toggle ${enabled ? 'is-enabled' : ''}`}
                              disabled={bundled || !canModify || !mod.present}
                              title={
                                bundled
                                  ? 'Добавката се управлява от приложението'
                                  : !mod.present
                                    ? 'Файлът липсва'
                                    : enabled
                                      ? 'Изключи добавката'
                                      : 'Включи добавката'
                              }
                              onClick={() => toggleMod(mod)}
                            >
                              <span />
                            </button>
                            <span>
                              {!mod.present
                                ? 'Липсва файл'
                                : enabled
                                  ? 'Включена'
                                  : 'Изключена'}
                            </span>
                            {bundled && (
                              <LockKeyhole
                                size={14}
                                aria-label="Необходима добавка"
                              />
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="mod-actions">
                            <button
                              className="icon-button mod-menu-button"
                              aria-label={`Действия за ${mod.name}`}
                              aria-expanded={menu === mod.fileName}
                              aria-controls={`mod-menu-${encodeURIComponent(mod.fileName)}`}
                              onClick={(event) => {
                                const bottom =
                                  document
                                    .querySelector('.main-shell')
                                    ?.getBoundingClientRect().bottom ||
                                  innerHeight;
                                setMenuUp(
                                  event.currentTarget.getBoundingClientRect()
                                    .bottom +
                                    230 >
                                    bottom,
                                );
                                setMenu(
                                  menu === mod.fileName ? null : mod.fileName,
                                );
                              }}
                            >
                              <MoreHorizontal size={23} />
                            </button>
                            {menu === mod.fileName && (
                              <div
                                className={`mod-action-menu ${menuUp ? 'opens-up' : ''}`}
                                id={`mod-menu-${encodeURIComponent(mod.fileName)}`}
                              >
                                <strong>{mod.name}</strong>
                                <span className="mod-version">
                                  Версия: {mod.version}
                                </span>
                                <span className="mod-file">{mod.fileName}</span>
                                {bundled ? (
                                  <span className="mod-lock">
                                    <LockKeyhole size={14} />
                                    Необходима добавка
                                  </span>
                                ) : (
                                  <button
                                    className="remove-mod-button"
                                    disabled={!canModify}
                                    onClick={() => removeMod(mod)}
                                    aria-label={`Премахни ${mod.name}`}
                                  >
                                    <Trash2 size={16} />
                                    Премахни добавката
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!inventory ? (
                <div className="mods-empty" role="status">
                  Зареждане на добавките…
                </div>
              ) : (
                filtered.length === 0 && (
                  <div className="mods-empty">
                    <Package size={34} />
                    <h3>
                      {query
                        ? 'Няма намерени добавки.'
                        : filter !== 'all'
                          ? 'Няма добавки с този статус.'
                          : bundled
                            ? 'Няма намерени добавки в пакета.'
                            : 'Все още няма добавени добавки.'}
                    </h3>
                    <p>
                      {query
                        ? 'Опитай друго име или име на файл.'
                        : filter !== 'all'
                          ? 'Избери друг филтър, за да видиш останалите добавки.'
                          : bundled
                            ? 'Обнови списъка или провери инсталацията от общия преглед.'
                            : 'Добави Fabric .jar файлове за версията на Minecraft в пакета с добавки.'}
                    </p>
                  </div>
                )
              )}
            </div>
            <div className="mods-footer">
              <details className="mods-inventory-tools">
                <summary
                  aria-label="Информация и действия за добавките"
                  title="Информация и действия за добавките"
                >
                  <Info size={21} />
                </summary>
                <div className="mods-secondary-actions">
                  {!embedded && (
                    <button
                      className="text-button mods-collection-link"
                      onClick={() =>
                        onCollectionChange?.(bundled ? 'personal' : 'bundled')
                      }
                    >
                      <Layers size={15} />
                      {bundled ? 'Моите добавки' : 'Включени добавки'}
                    </button>
                  )}
                  <button
                    className="text-button"
                    title="Обнови списъка с добавки"
                    aria-label="Обнови списъка с добавки"
                    onClick={refresh}
                    disabled={busy}
                  >
                    <RefreshCw size={15} />
                    Обнови списъка
                  </button>
                  <small>
                    {inventory?.minecraft
                      ? `Fabric · Minecraft ${inventory.minecraft}`
                      : 'Fabric'}{' '}
                    · Добави и необходимите зависимости.
                  </small>
                </div>
              </details>
              <span>
                Добавките от основния пакет се управляват от приложението.
              </span>
              <span className="mods-count">
                {mods.length}{' '}
                {bundled ? 'добавки в пакета' : 'добавени добавки'}
              </span>
            </div>
            {inventory?.installed && !inventory.canModify && (
              <p className="mods-edit-warning" role="status">
                Затвори Minecraft или изчакай текущата операция, след което
                обнови списъка.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
